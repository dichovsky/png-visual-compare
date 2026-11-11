import { inflateSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { InvalidInputError, PathValidationError, ResourceLimitError } from './errors';
import { readValidatedFileSync } from './readValidatedFile';
import type { LoadedPng } from './pipeline/types';

/** PNG file signature (first 8 bytes of every valid PNG). */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Minimum bytes required to read width/height from the IHDR chunk:
 * 8 (signature) + 4 (chunk length) + 4 (chunk type) + 4 (width) + 4 (height).
 */
const IHDR_PEEK_LENGTH = 24;

const IHDR_CHUNK_TYPE = 0x49484452; // "IHDR"
const IHDR_DATA_LENGTH = 13;
/** Signature + a complete IHDR chunk: length, type, 13 data bytes and CRC. */
const IHDR_END = 33;

/**
 * Reads the declared width and height from a PNG's IHDR chunk without fully
 * decoding the image. Returns `null` if the buffer is too short or does not
 * start with the PNG signature.
 */
function peekPngDimensions(data: Buffer): { width: number; height: number } | null {
    if (data.length < IHDR_PEEK_LENGTH) return null;
    if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

/**
 * Throws if the IHDR-declared dimensions exceed `maxDimension`.
 * This check happens *before* `PNG.sync.read()` to prevent the decoder from
 * allocating a huge output buffer for crafted PNGs with enormous header values.
 * Always throws regardless of `throwErrorOnInvalidInputData`.
 */
function assertImageLimits(buffer: Buffer, maxDimension: number | undefined, maxPixels: number | undefined): void {
    const dims = peekPngDimensions(buffer);
    if (dims !== null) {
        if (maxDimension !== undefined && (dims.width > maxDimension || dims.height > maxDimension)) {
            throw new ResourceLimitError(
                `Image dimensions (${dims.width}x${dims.height}) exceed the maximum allowed size of ${maxDimension}px. ` +
                    `Set opts.maxDimension to increase the limit.`,
            );
        }

        const pixelCount = dims.width * dims.height;
        if (maxPixels !== undefined && pixelCount > maxPixels) {
            throw new ResourceLimitError(
                `Image pixel count (${pixelCount}) exceeds the maximum allowed ${maxPixels} pixels. ` +
                    'Set opts.maxPixels to increase the limit.',
            );
        }
    }
}

/**
 * pngjs accepts repeated IHDR chunks and decodes using the last dimensions.
 * Reject them before decoding so a later header cannot bypass the size guard.
 * Leave other malformed framing and CRC checks to the decoder; advancing by
 * chunk length also avoids mistaking IHDR bytes inside chunk data for a header.
 */
function assertSinglePngHeader(buffer: Buffer): void {
    if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return;

    let hasHeader = false;
    for (let offset = PNG_SIGNATURE.length; offset + 8 <= buffer.length; offset += buffer.readUInt32BE(offset) + 12) {
        if (buffer.readUInt32BE(offset + 4) === IHDR_CHUNK_TYPE) {
            if (hasHeader) throw new Error('Duplicate PNG IHDR chunk');
            hasHeader = true;
        }
    }
}

const IDAT_CHUNK_TYPE = 0x49444154; // "IDAT"
/** Samples per pixel by IHDR colour type, as pngjs maps them; pngjs rejects any other type. */
const CHANNELS_BY_COLOR_TYPE: Partial<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const PNG_BIT_DEPTHS = new Set([1, 2, 4, 8, 16]);

/** Adam7 passes as [x0, y0, dx, dy]: a pass holds the pixels at (x0 + i * dx, y0 + j * dy). */
const ADAM7_PASSES = [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2],
] as const;

/**
 * The inflated IDAT size pngjs requires: scanlines of a filter byte plus packed samples, for the
 * whole image or, when interlaced, for each Adam7 pass that has pixels (an empty pass has none).
 */
function declaredImageDataLength(width: number, height: number, bitsPerPixel: number, interlaced: boolean): number {
    const scanlines = (w: number, h: number) => h * (Math.ceil((w * bitsPerPixel) / 8) + 1);
    if (!interlaced) return scanlines(width, height);

    let length = 0;
    for (const [x0, y0, dx, dy] of ADAM7_PASSES) {
        const passWidth = Math.ceil((width - x0) / dx);
        const passHeight = Math.ceil((height - y0) / dy);
        if (passWidth > 0 && passHeight > 0) length += scanlines(passWidth, passHeight);
    }
    return length;
}

/**
 * pngjs 7's sync inflate ignores zlib errors and misreads zlib's progress counters, so when a
 * non-interlaced IDAT stream is corrupt or short it returns its whole `Buffer.allocUnsafe`
 * output buffer, and recycled heap memory decodes as pixels. For interlaced data it calls
 * `zlib.inflateSync` with no output limit, so a tiny image can inflate gigabytes. Inflate the
 * stream here first, capped at the byte count the header declares plus one, and require exactly
 * that count. Other interlace methods are left to pngjs, which rejects them before inflating.
 *
 * Only a well-formed header may size the inflate: the signature, a 13-byte IHDR as the first
 * chunk, and a legal bit depth. That is the header `assertImageLimits` checked, and it caps a
 * pixel at 64 bits. pngjs rejects any other header before inflating, so leave those to it.
 */
function assertCompleteImageData(buffer: Buffer): void {
    if (
        buffer.length < IHDR_END ||
        !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
        buffer.readUInt32BE(8) !== IHDR_DATA_LENGTH ||
        buffer.readUInt32BE(12) !== IHDR_CHUNK_TYPE ||
        !PNG_BIT_DEPTHS.has(buffer[24])
    ) {
        return;
    }

    const channels = CHANNELS_BY_COLOR_TYPE[buffer[25]];
    const interlace = buffer[28];
    if (channels === undefined || (interlace !== 0 && interlace !== 1)) return;

    const bitsPerPixel = channels * buffer[24];
    const expectedLength = declaredImageDataLength(buffer.readUInt32BE(16), buffer.readUInt32BE(20), bitsPerPixel, interlace === 1);
    const imageData: Buffer[] = [];
    for (let offset = PNG_SIGNATURE.length; offset + 8 <= buffer.length; offset += buffer.readUInt32BE(offset) + 12) {
        if (buffer.readUInt32BE(offset + 4) === IDAT_CHUNK_TYPE) {
            imageData.push(buffer.subarray(offset + 8, offset + 8 + buffer.readUInt32BE(offset)));
        }
    }

    if (inflateSync(Buffer.concat(imageData), { maxOutputLength: expectedLength + 1 }).length !== expectedLength) {
        throw new Error('PNG image data does not match the declared size');
    }
}

/**
 * Enforces `maxDimension` / `maxPixels` from the PNG signature and IHDR header alone,
 * without decoding the image, for bytes that are stored rather than compared (a
 * Playwright baseline). Internal: not exported from the package entry.
 *
 * Throws `ResourceLimitError` exactly as {@link getPngData} does, and `InvalidInputError`
 * when the buffer does not start with one complete IHDR chunk or declares a zero dimension.
 * Image data and CRCs are not checked.
 */
export function assertPngHeaderLimits(buffer: Buffer, maxDimension: number, maxPixels: number): void {
    const dims = buffer.length < IHDR_END ? null : peekPngDimensions(buffer);
    if (dims === null || buffer.readUInt32BE(8) !== IHDR_DATA_LENGTH || buffer.readUInt32BE(12) !== IHDR_CHUNK_TYPE) {
        throw new InvalidInputError('Invalid PNG input: the data could not be parsed');
    }

    // Limits first, as in getPngData, so an oversized first header is a ResourceLimitError.
    assertImageLimits(buffer, maxDimension, maxPixels);

    try {
        assertSinglePngHeader(buffer);
    } catch {
        throw new InvalidInputError('Invalid PNG input: the data could not be parsed');
    }

    if (dims.width === 0 || dims.height === 0) {
        throw new InvalidInputError('Invalid PNG input: image has zero dimensions');
    }
}

function finalizeDecodedPng(decoded: LoadedPng, throwErrorOnInvalidInputData: boolean): LoadedPng {
    if (decoded.kind === 'valid' && (decoded.png.width === 0 || decoded.png.height === 0)) {
        if (throwErrorOnInvalidInputData) {
            throw new InvalidInputError('Invalid PNG input: image has zero dimensions');
        }
        return { kind: 'invalid', reason: 'decode' };
    }

    return decoded;
}

export function getPngData(
    pngSource: string | Buffer,
    throwErrorOnInvalidInputData: boolean,
    maxDimension?: number,
    maxPixels?: number,
    inputBaseDir?: string,
    maxFileBytes?: number,
): LoadedPng {
    if (typeof pngSource === 'string') {
        let fileBuffer: Buffer<ArrayBufferLike>;
        try {
            fileBuffer = readValidatedFileSync(pngSource, inputBaseDir, maxFileBytes);
        } catch (error) {
            // Resource limits are a security signal, not an invalid-input signal: they
            // must surface even in permissive mode, matching maxDimension/maxPixels.
            if (error instanceof ResourceLimitError) {
                throw error;
            }
            if (error instanceof PathValidationError && (inputBaseDir !== undefined || throwErrorOnInvalidInputData)) {
                throw error;
            }
            if (throwErrorOnInvalidInputData) {
                // Use one generic message for both read-failure and parse-failure on file
                // paths so callers cannot distinguish "file not found" from "file exists
                // but is not a valid PNG" (prevents filesystem enumeration — VUL-05).
                throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
            }
            return { kind: 'invalid', reason: 'path' };
        }

        // Guard before decode: prevents DoS via crafted IHDR with huge declared dimensions.
        assertImageLimits(fileBuffer, maxDimension, maxPixels);

        try {
            assertSinglePngHeader(fileBuffer);
            assertCompleteImageData(fileBuffer);
            return finalizeDecodedPng({ kind: 'valid', png: PNG.sync.read(fileBuffer) }, throwErrorOnInvalidInputData);
        } catch (error) {
            if (throwErrorOnInvalidInputData) {
                if (error instanceof InvalidInputError) {
                    throw error;
                }
                // Same message as the read-error above — callers must not be able to tell
                // whether the file was unreadable or just not a valid PNG (VUL-05).
                throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
            }
            return { kind: 'invalid', reason: 'decode' };
        }
    }

    if (Buffer.isBuffer(pngSource)) {
        // Guard before decode: prevents DoS via crafted IHDR with huge declared dimensions.
        assertImageLimits(pngSource, maxDimension, maxPixels);

        try {
            assertSinglePngHeader(pngSource);
            assertCompleteImageData(pngSource);
            return finalizeDecodedPng({ kind: 'valid', png: PNG.sync.read(pngSource) }, throwErrorOnInvalidInputData);
        } catch (error) {
            if (throwErrorOnInvalidInputData) {
                if (error instanceof InvalidInputError) {
                    throw error;
                }
                throw new InvalidInputError('Invalid PNG input: the data could not be parsed');
            }
            return { kind: 'invalid', reason: 'decode' };
        }
    }

    if (throwErrorOnInvalidInputData) {
        throw new InvalidInputError('Unknown PNG file input type');
    }

    return { kind: 'invalid', reason: 'type' };
}
