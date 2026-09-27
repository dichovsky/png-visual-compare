import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';
import { PNG } from 'pngjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { comparePng, comparePngAsync, InvalidInputError, ResourceLimitError } from '../src';
import { assertPngHeaderLimits, getPngData } from '../src/getPngData';

function createPng(width: number): Buffer {
    const png = new PNG({ width, height: 1 });
    png.data.fill(255);
    return PNG.sync.write(png);
}

function createChunk(type: string, data: Buffer): Buffer {
    const chunk = Buffer.alloc(data.length + 12);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4);
    data.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
    return chunk;
}

const small = createPng(1);
const large = createPng(20);
const signature = small.subarray(0, 8);
const duplicateHeaders = [
    {
        name: 'larger header before IDAT',
        data: Buffer.concat([small.subarray(0, 33), large.subarray(8)]),
    },
    {
        name: 'larger header after IDAT',
        data: Buffer.concat([small.subarray(0, 33), large.subarray(33, -12), large.subarray(8, 33), large.subarray(-12)]),
    },
    {
        name: 'duplicate with identical dimensions',
        data: Buffer.concat([small.subarray(0, 33), small.subarray(8)]),
    },
];

afterEach(() => vi.restoreAllMocks());

describe('duplicate PNG headers', () => {
    let directory: string;

    beforeAll(() => {
        directory = mkdtempSync(join(tmpdir(), 'png-duplicate-header-'));
        for (const { name, data } of duplicateHeaders) {
            writeFileSync(join(directory, `${name}.png`), data);
        }
    });

    afterAll(() => rmSync(directory, { recursive: true, force: true }));

    for (const { name, data } of duplicateHeaders) {
        for (const sourceType of ['buffer', 'path'] as const) {
            for (const compare of [comparePng, comparePngAsync]) {
                it(`${compare.name} rejects ${name} from a ${sourceType} before decoding`, async () => {
                    const source = sourceType === 'buffer' ? data : join(directory, `${name}.png`);
                    const read = vi.spyOn(PNG.sync, 'read');

                    await expect(async () => compare(source, small, { maxDimension: 1, maxPixels: 1 })).rejects.toThrow(InvalidInputError);

                    expect(read.mock.calls.some(([buffer]) => buffer.equals(data))).toBe(false);
                });

                it(`${compare.name} treats ${name} from a ${sourceType} as invalid in permissive mode`, async () => {
                    const source = sourceType === 'buffer' ? data : join(directory, `${name}.png`);
                    const read = vi.spyOn(PNG.sync, 'read');

                    expect(
                        await compare(source, small, {
                            throwErrorOnInvalidInputData: false,
                            maxDimension: 1,
                            maxPixels: 1,
                        }),
                    ).toBe(1);

                    expect(read.mock.calls.some(([buffer]) => buffer.equals(data))).toBe(false);
                });
            }
        }
    }

    it('rejects duplicate headers even when resource limits are disabled', () => {
        expect(() => getPngData(duplicateHeaders[0].data, true, Infinity, Infinity)).toThrow(InvalidInputError);
    });

    it.each([
        { maxDimension: 1, maxPixels: Infinity },
        { maxDimension: Infinity, maxPixels: 1 },
    ])('preserves unconditional resource errors for an oversized first header: %j', ({ maxDimension, maxPixels }) => {
        const oversizedFirst = Buffer.concat([large.subarray(0, 33), small.subarray(8)]);
        const read = vi.spyOn(PNG.sync, 'read');

        expect(() => getPngData(oversizedFirst, false, maxDimension, maxPixels)).toThrow(ResourceLimitError);
        expect(read).not.toHaveBeenCalled();
    });
});

describe('PNG header chunk framing', () => {
    it('accepts IHDR text inside a normal ancillary chunk', () => {
        const png = Buffer.concat([small.subarray(0, 33), createChunk('tEXt', Buffer.from('Comment\0IHDR')), small.subarray(33)]);

        expect(comparePng(png, small, { maxDimension: 1, maxPixels: 1 })).toBe(0);
    });

    it.each([
        { name: 'signature only', data: signature },
        { name: 'partial chunk header', data: Buffer.concat([signature, Buffer.alloc(7)]) },
        { name: 'missing IHDR', data: Buffer.concat([signature, createChunk('tEXt', Buffer.alloc(0))]) },
        { name: 'missing chunk data and CRC', data: Buffer.concat([signature, Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR')]) },
        { name: 'huge truncated chunk', data: Buffer.concat([signature, Buffer.from([255, 255, 255, 255]), Buffer.from('IHDR')]) },
    ])('keeps $name as an ordinary decode failure', ({ data }) => {
        expect(getPngData(data, false, 1, 1)).toEqual({ kind: 'invalid', reason: 'decode' });
        expect(() => getPngData(data, true, 1, 1)).toThrow('Invalid PNG input: the data could not be parsed');
    });
});

describe('assertPngHeaderLimits', () => {
    const zeroWidthHeader = Buffer.from(small.subarray(16, 29));
    zeroWidthHeader.writeUInt32BE(0, 0);
    const zeroWidth = Buffer.concat([signature, createChunk('IHDR', zeroWidthHeader), small.subarray(33)]);

    it.each([
        { name: 'an empty buffer', data: Buffer.alloc(0) },
        { name: 'non-PNG bytes', data: Buffer.from('not a png, but long enough to hold a header') },
        { name: 'signature only', data: signature },
        { name: 'partial chunk header', data: Buffer.concat([signature, Buffer.alloc(7)]) },
        { name: 'dimensions cut short', data: small.subarray(0, 20) },
        { name: 'IHDR cut short', data: small.subarray(0, 32) },
        { name: 'first chunk not IHDR', data: Buffer.concat([signature, createChunk('tEXt', Buffer.alloc(13)), small.subarray(8)]) },
        {
            name: 'IHDR of the wrong length',
            data: Buffer.concat([signature, createChunk('IHDR', Buffer.alloc(14, 1)), small.subarray(33)]),
        },
        ...duplicateHeaders,
    ])('rejects $name as InvalidInputError, never RangeError', ({ data }) => {
        const check = () => assertPngHeaderLimits(data, Infinity, Infinity);

        expect(check).toThrow(InvalidInputError);
        expect(check).toThrow('Invalid PNG input: the data could not be parsed');
    });

    it('rejects a zero dimension as getPngData does', () => {
        const check = () => assertPngHeaderLimits(zeroWidth, Infinity, Infinity);

        expect(check).toThrow(InvalidInputError);
        expect(check).toThrow('Invalid PNG input: image has zero dimensions');
    });

    it.each([
        { name: 'maxDimension', maxDimension: 19, maxPixels: Infinity },
        { name: 'maxPixels', maxDimension: Infinity, maxPixels: 19 },
    ])('throws the same ResourceLimitError as a full decode over $name', ({ maxDimension, maxPixels }) => {
        let decodeError: unknown;
        try {
            getPngData(large, true, maxDimension, maxPixels);
        } catch (error) {
            decodeError = error;
        }

        const check = () => assertPngHeaderLimits(large, maxDimension, maxPixels);

        expect(decodeError).toBeInstanceOf(ResourceLimitError);
        expect(check).toThrow(ResourceLimitError);
        expect(check).toThrow((decodeError as ResourceLimitError).message);
    });

    it('accepts a PNG within the limits without decoding it', () => {
        const read = vi.spyOn(PNG.sync, 'read');

        expect(() => assertPngHeaderLimits(large, 20, 20)).not.toThrow();
        expect(read).not.toHaveBeenCalled();
    });
});
