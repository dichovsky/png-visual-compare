import { readFileSync } from 'node:fs';
import { PNG, type PNGWithMetadata } from 'pngjs';
import type { PngData } from './types/png.data';
import { validatePath } from './validatePath';

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
function assertDimensions(buffer: Buffer, maxDimension: number): void {
    const dims = peekPngDimensions(buffer);
    if (dims !== null && (dims.width > maxDimension || dims.height > maxDimension)) {
        throw new Error(
            `Image dimensions (${dims.width}x${dims.height}) exceed the maximum allowed size of ${maxDimension}px. ` +
                `Set opts.maxDimension to increase the limit.`,
        );
    }
}

export function getPngData(pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean, maxDimension?: number): PngData {
    const invalidPng: PngData = { isValid: false, png: new PNG({ width: 0, height: 0 }) as PNGWithMetadata };

    if (typeof pngSource === 'string') {
        let resolvedPath: string;
        try {
            resolvedPath = validatePath(pngSource);
        } catch (error) {
            if (throwErrorOnInvalidInputData) throw error;
            return invalidPng;
        }

        let fileBuffer: Buffer<ArrayBufferLike>;
        try {
            fileBuffer = readFileSync(resolvedPath);
        } catch {
            if (throwErrorOnInvalidInputData) {
                // Use one generic message for both read-failure and parse-failure on file
                // paths so callers cannot distinguish "file not found" from "file exists
                // but is not a valid PNG" (prevents filesystem enumeration — VUL-05).
                throw new Error('Invalid PNG input: the source could not be loaded');
            }
            return invalidPng;
        }

        // Guard before decode: prevents DoS via crafted IHDR with huge declared dimensions.
        if (maxDimension !== undefined) assertDimensions(fileBuffer, maxDimension);

        try {
            return { isValid: true, png: PNG.sync.read(fileBuffer) };
        } catch {
            if (throwErrorOnInvalidInputData) {
                // Same message as the read-error above — callers must not be able to tell
                // whether the file was unreadable or just not a valid PNG (VUL-05).
                throw new Error('Invalid PNG input: the source could not be loaded');
            }
            return invalidPng;
        }
    }

    if (Buffer.isBuffer(pngSource)) {
        // Guard before decode: prevents DoS via crafted IHDR with huge declared dimensions.
        if (maxDimension !== undefined) assertDimensions(pngSource, maxDimension);

        try {
            return { isValid: true, png: PNG.sync.read(pngSource) };
        } catch {
            if (throwErrorOnInvalidInputData) {
                throw new Error('Invalid PNG input: the data could not be parsed');
            }
            return invalidPng;
        }
    }

    if (throwErrorOnInvalidInputData) {
        throw new Error('Unknown PNG file input type');
    }

    return invalidPng;
}
