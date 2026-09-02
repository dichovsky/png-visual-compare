import { PNG } from 'pngjs';
import { InvalidInputError, PathValidationError, ResourceLimitError } from './errors';
import { readValidatedFileSync } from './readValidatedFile';
import type { LoadedPng } from './types/png.data';

/** PNG file signature (first 8 bytes of every valid PNG). */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Minimum bytes required to read width/height from the IHDR chunk:
 * 8 (signature) + 4 (chunk length) + 4 (chunk type) + 4 (width) + 4 (height).
 */
const IHDR_PEEK_LENGTH = 24;

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
