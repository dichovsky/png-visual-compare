import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib, { crc32, deflateSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { comparePng, comparePngAsync, InvalidInputError } from '../src';
import { getPngData } from '../src/getPngData';
import { validatePngSnapshot } from '../src/matchers/pngSnapshot';

const WIDTH = 8;
const HEIGHT = 8;
/** A filter byte plus four RGBA bytes per pixel. */
const ROW_SIZE = WIDTH * 4 + 1;
/** The inflated IDAT size an 8x8 RGBA, 8-bit, non-interlaced header declares. */
const IMAGE_SIZE = ROW_SIZE * HEIGHT;
/** Adam7 passes of an 8x8 RGBA image: 1x1, 1x1, 2x1, 2x2, 4x2, 4x4 and 8x4 pixels, plus filter bytes. */
const INTERLACED_IMAGE_SIZE = 5 + 5 + 9 + 2 * 9 + 2 * 17 + 4 * 17 + 4 * 33;
const CANARY = 0xa5;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createChunk(type: string, data: Buffer): Buffer {
    const chunk = Buffer.alloc(data.length + 12);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
    return chunk;
}

interface Header {
    width?: number;
    height?: number;
    depth?: number;
    colorType?: number;
    interlace?: number;
    palette?: Buffer;
}

/** A PNG, 8x8 RGBA 8-bit unless `header` says otherwise, whose single IDAT chunk holds `imageData` under a valid CRC. */
function createPng(
    imageData: Buffer,
    { width = WIDTH, height = HEIGHT, depth = 8, colorType = 6, interlace = 0, palette }: Header = {},
): Buffer {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = depth;
    header[9] = colorType;
    header[12] = interlace;
    return Buffer.concat([
        PNG_SIGNATURE,
        createChunk('IHDR', header),
        ...(palette ? [createChunk('PLTE', palette)] : []),
        createChunk('IDAT', imageData),
        createChunk('IEND', Buffer.alloc(0)),
    ]);
}

/** 8x8 RGBA scanlines: a None filter byte, then pixel bytes that all equal `value`. */
function createScanlines(size: number, value: number): Buffer<ArrayBuffer> {
    const buffer = Buffer.alloc(size, value);
    for (let offset = 0; offset < size; offset += ROW_SIZE) {
        buffer[offset] = 0;
    }
    return buffer;
}

/** Stands in for recycled heap memory: scanlines pngjs would decode as 0xA5 pixels. */
const allocCanary = (size: number) => createScanlines(size, CANARY);

const rawImage = createScanlines(IMAGE_SIZE, 0x10);
const stream = deflateSync(rawImage);
const badChecksum = Buffer.from(stream);
badChecksum[badChecksum.length - 1] ^= 0xff;
const headerOnly = createPng(Buffer.from([0x78, 0x9c]));

const corruptImages = [
    { name: 'a truncated zlib stream', data: createPng(stream.subarray(0, stream.length >> 1)) },
    { name: 'a zlib header with no data', data: headerOnly },
    { name: 'an invalid deflate block', data: createPng(Buffer.from([0x78, 0x9c, 0xff, 0xff, 0xff, 0xff])) },
    { name: 'a complete stream with half the rows', data: createPng(deflateSync(rawImage.subarray(0, IMAGE_SIZE / 2))) },
    { name: 'a complete stream with an extra byte', data: createPng(deflateSync(Buffer.concat([rawImage, Buffer.alloc(1)]))) },
    { name: 'a failed Adler-32 check', data: createPng(badChecksum) },
    { name: 'an interlaced truncated zlib stream', data: createPng(Buffer.from([0x78, 0x9c]), { interlace: 1 }) },
    { name: 'an unsupported colour type', data: createPng(stream, { colorType: 5 }) },
    {
        name: 'an interlaced complete stream with half the data',
        data: createPng(deflateSync(Buffer.alloc(INTERLACED_IMAGE_SIZE >> 1)), { interlace: 1 }),
    },
    {
        name: 'an interlaced complete stream with an extra byte',
        data: createPng(deflateSync(Buffer.alloc(INTERLACED_IMAGE_SIZE + 1)), { interlace: 1 }),
    },
    { name: 'an unsupported interlace method', data: createPng(stream, { interlace: 2 }) },
];

const valid = createPng(stream);
const canaryPixels = new PNG({ width: WIDTH, height: HEIGHT });
canaryPixels.data.fill(CANARY);
const canaryReference = PNG.sync.write(canaryPixels);

afterEach(() => vi.restoreAllMocks());

describe('PNG image data that does not inflate to the declared size', () => {
    let directory: string;

    beforeAll(() => {
        directory = mkdtempSync(join(tmpdir(), 'png-corrupt-image-data-'));
        corruptImages.forEach(({ data }, index) => writeFileSync(join(directory, `${index}.png`), data));
    });

    afterAll(() => rmSync(directory, { recursive: true, force: true }));

    it('decodes the valid fixtures the corrupt ones are built from', () => {
        expect(getPngData(valid, true)).toMatchObject({ kind: 'valid', png: { width: WIDTH, height: HEIGHT } });
        expect(getPngData(createPng(deflateSync(Buffer.alloc(INTERLACED_IMAGE_SIZE)), { interlace: 1 }), true)).toMatchObject({
            kind: 'valid',
            png: { width: WIDTH, height: HEIGHT },
        });
    });

    corruptImages.forEach(({ name, data }, index) => {
        it(`rejects ${name} from a buffer`, () => {
            expect(() => getPngData(data, true)).toThrow(new InvalidInputError('Invalid PNG input: the data could not be parsed'));
            expect(getPngData(data, false)).toEqual({ kind: 'invalid', reason: 'decode' });
        });

        for (const compare of [comparePng, comparePngAsync]) {
            it(`${compare.name} rejects ${name} from a path, or treats it as invalid in permissive mode`, async () => {
                const source = join(directory, `${index}.png`);

                await expect(async () => compare(source, valid)).rejects.toThrow(
                    new InvalidInputError('Invalid PNG input: the source could not be loaded'),
                );
                expect(await compare(source, valid, { throwErrorOnInvalidInputData: false })).toBe(WIDTH * HEIGHT);
            });
        }
    });

    it('refuses to store a corrupt image as a snapshot baseline', () => {
        expect(() => validatePngSnapshot(headerOnly, undefined)).toThrow(InvalidInputError);
    });
});

describe('uninitialised zlib output buffers', () => {
    // pngjs 7 returns its whole zlib output buffer, allocated with Buffer.allocUnsafe, when the
    // stream is short. Filling those allocations with a canary makes the recycled memory visible.
    // The first four streams end before the declared size, the case where pngjs returns that buffer.
    it.each(corruptImages.slice(0, 4))('never decodes the canary from $name', ({ data }) => {
        vi.spyOn(Buffer, 'allocUnsafe').mockImplementation(allocCanary);

        expect(() => comparePng(data, canaryReference)).toThrow(InvalidInputError);
    });

    it('keeps the canary out of the mismatch count and the diff file in permissive mode', () => {
        const directory = mkdtempSync(join(tmpdir(), 'png-corrupt-image-data-diff-'));
        const diffFilePath = join(directory, 'diff.png');
        try {
            vi.spyOn(Buffer, 'allocUnsafe').mockImplementation(allocCanary);
            const mismatches = comparePng(headerOnly, canaryReference, { throwErrorOnInvalidInputData: false, diffFilePath });
            vi.restoreAllMocks();

            // Every pixel differs from an absent image, so the diff is solid diffColor, with no
            // grey-blended copy of the canary.
            expect(mismatches).toBe(WIDTH * HEIGHT);
            const diff = PNG.sync.read(readFileSync(diffFilePath)).data;
            expect(diff.toString('hex')).toBe('ff0000ff'.repeat(WIDTH * HEIGHT));
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });
});

/** Adam7 passes as [x0, y0, dx, dy]: a pass holds the pixels at (x0 + i * dx, y0 + j * dy). */
const ADAM7_PASSES = [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2],
];
const CHANNELS_BY_COLOR_TYPE: Record<number, number> = { 0: 1, 2: 3, 3: 1, 6: 4 };
/** 256 RGB entries, so any 8-bit sample is a valid palette index. */
const PALETTE = Buffer.from(Array.from({ length: 256 * 3 }, (_, index) => (index * 7) & 0xff));

function coordinates(start: number, end: number, step: number): number[] {
    const values: number[] = [];
    for (let value = start; value < end; value += step) values.push(value);
    return values;
}

/** Adam7 scanlines, each a None filter byte and big-endian, MSB-first packed samples; a pass with no columns has none. */
function encodeAdam7(width: number, height: number, depth: number, channels: number): Buffer {
    const scanlines: Buffer[] = [];
    for (const [x0, y0, dx, dy] of ADAM7_PASSES) {
        const columns = coordinates(x0, width, dx);
        if (columns.length === 0) continue;
        for (const y of coordinates(y0, height, dy)) {
            const samples = columns.flatMap((x) =>
                coordinates(0, channels, 1).map((c) => (x * 7919 + y * 104729 + c * 31337) % 2 ** depth),
            );
            const scanline = Buffer.alloc(1 + Math.ceil((samples.length * depth) / 8));
            samples.forEach((sample, index) => {
                if (depth === 16) scanline.writeUInt16BE(sample, 1 + index * 2);
                else scanline[1 + ((index * depth) >> 3)] |= sample << (8 - depth - ((index * depth) & 7));
            });
            scanlines.push(scanline);
        }
    }
    return deflateSync(Buffer.concat(scanlines));
}

const formats = [
    { format: 'RGBA 8-bit', colorType: 6, depth: 8 },
    { format: 'RGB 8-bit', colorType: 2, depth: 8 },
    { format: 'grey 8-bit', colorType: 0, depth: 8 },
    { format: 'grey 1-bit', colorType: 0, depth: 1 },
    { format: 'RGBA 16-bit', colorType: 6, depth: 16 },
    { format: 'palette 8-bit', colorType: 3, depth: 8 },
];
// 1x1 and 2x2 leave most passes empty; 3x5, 7x9 and 13x11 leave partial 8x8 blocks.
const sizes = [
    [1, 1],
    [2, 2],
    [3, 5],
    [7, 9],
    [8, 8],
    [13, 11],
];
const interlacedImages = formats.flatMap((format) => sizes.map(([width, height]) => ({ ...format, width, height })));

describe('interlaced (Adam7) image data', () => {
    it.each(interlacedImages)('decodes a $width x $height $format image as pngjs does', ({ width, height, depth, colorType }) => {
        const palette = colorType === 3 ? PALETTE : undefined;
        const imageData = encodeAdam7(width, height, depth, CHANNELS_BY_COLOR_TYPE[colorType]);
        const data = createPng(imageData, { width, height, depth, colorType, interlace: 1, palette });

        expect(getPngData(data, true)).toMatchObject({ kind: 'valid', png: { width, height, data: PNG.sync.read(data).data } });
    });

    it('stops inflating data that inflates past the declared size, before pngjs inflates it with no limit', () => {
        // A 1x1 RGBA image declares 5 bytes, a filter byte and one pixel; this stream inflates to 16 MiB.
        const bomb = createPng(deflateSync(Buffer.alloc(16 * 1024 * 1024)), { width: 1, height: 1, interlace: 1 });
        // pngjs calls inflateSync on the CommonJS export and the library imports it by name, so sync
        // the spy into the ES module export to record both.
        const inflate = vi.spyOn(zlib, 'inflateSync');
        syncBuiltinESMExports();
        try {
            expect(() => getPngData(bomb, true)).toThrow(new InvalidInputError('Invalid PNG input: the data could not be parsed'));
            expect(getPngData(bomb, false)).toEqual({ kind: 'invalid', reason: 'decode' });

            // One inflate per decode, each stopped one byte past the declared size.
            expect(inflate.mock.calls.map(([, options]) => options?.maxOutputLength)).toEqual([6, 6]);
            expect(inflate.mock.results.map(({ value }) => (value as NodeJS.ErrnoException).code)).toEqual([
                'ERR_BUFFER_TOO_LARGE',
                'ERR_BUFFER_TOO_LARGE',
            ]);
        } finally {
            vi.restoreAllMocks();
            syncBuiltinESMExports();
        }
    });
});

describe('headers pngjs rejects before inflating', () => {
    // 2048x2048 RGBA is within the default limits, so only the header check can keep this
    // 16 MiB stream from being inflated. pngjs rejects each of these headers without inflating.
    const bombData = deflateSync(Buffer.alloc(16 * 1024 * 1024));
    const bomb = createPng(bombData, { width: 2048, height: 2048 });
    // A tEXt chunk carrying IHDR-shaped data, so the fixed IHDR offsets read a plausible header.
    const firstChunkNotIhdr = Buffer.concat([PNG_SIGNATURE, createChunk('tEXt', bomb.subarray(16, 29)), bomb.subarray(8)]);
    const ihdrLengthNot13 = Buffer.from(bomb);
    ihdrLengthNot13.writeUInt32BE(14, 8);

    const headers = [
        { name: 'no PNG signature', data: Buffer.concat([Buffer.alloc(8), bomb.subarray(8)]) },
        { name: 'a first chunk that is not IHDR', data: firstChunkNotIhdr },
        { name: 'an IHDR that is not 13 bytes', data: ihdrLengthNot13 },
        { name: 'an invalid bit depth', data: createPng(bombData, { width: 2048, height: 2048, depth: 255 }) },
        { name: 'a truncated header', data: bomb.subarray(0, 30) },
    ];

    it.each(headers)('rejects $name without inflating the image data', ({ data }) => {
        const inflate = vi.spyOn(zlib, 'inflateSync');
        syncBuiltinESMExports();
        try {
            expect(() => getPngData(data, true)).toThrow(new InvalidInputError('Invalid PNG input: the data could not be parsed'));
            expect(getPngData(data, false)).toEqual({ kind: 'invalid', reason: 'decode' });
            expect(inflate).not.toHaveBeenCalled();
        } finally {
            vi.restoreAllMocks();
            syncBuiltinESMExports();
        }
    });
});
