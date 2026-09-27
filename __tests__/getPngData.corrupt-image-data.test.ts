import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
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

/** An 8x8, 8-bit PNG whose single IDAT chunk holds `imageData` under a valid CRC. */
function createPng(imageData: Buffer, colorType = 6, interlace = 0): Buffer {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(WIDTH, 0);
    header.writeUInt32BE(HEIGHT, 4);
    header[8] = 8;
    header[9] = colorType;
    header[12] = interlace;
    return Buffer.concat([
        PNG_SIGNATURE,
        createChunk('IHDR', header),
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
    { name: 'an interlaced truncated zlib stream', data: createPng(Buffer.from([0x78, 0x9c]), 6, 1) },
    { name: 'an unsupported colour type', data: createPng(stream, 5) },
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
        expect(getPngData(createPng(deflateSync(Buffer.alloc(INTERLACED_IMAGE_SIZE)), 6, 1), true)).toMatchObject({
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
