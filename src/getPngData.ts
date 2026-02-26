import { existsSync, readFileSync } from 'fs';
import { Buffer } from 'node:buffer';
import { PNG, type PNGWithMetadata } from 'pngjs';
import type { PngData } from './types/png.data';

/**
 * Reads a PNG from either a file path or a raw `Buffer` and returns it as a {@link PngData}.
 *
 * - **File path**: the file must exist and be a valid PNG; if it does not exist and
 *   `throwErrorOnInvalidInputData` is `false`, an invalid placeholder is returned.
 * - **Buffer**: decoded synchronously; always treated as valid.
 * - **Any other type**: treated as invalid. Throws when `throwErrorOnInvalidInputData` is `true`.
 *
 * @param pngSource - Absolute file path or raw PNG `Buffer`.
 * @param throwErrorOnInvalidInputData - When `true`, missing files or unsupported input types
 *   cause an `Error` to be thrown instead of returning an invalid placeholder.
 * @returns A `PngData` object with `isValid` set to `false` for missing/unsupported inputs when
 *   errors are suppressed.
 */
export function getPngData(pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean): PngData {
    const invalidPng: PngData = { isValid: false, png: new PNG({ width: 0, height: 0 }) as PNGWithMetadata };

    if (typeof pngSource === 'string') {
        if (!existsSync(pngSource)) {
            if (throwErrorOnInvalidInputData) {
                throw new Error(`PNG file ${pngSource} not found`);
            }
            return invalidPng;
        }
        return { isValid: true, png: PNG.sync.read(readFileSync(pngSource)) };
    }

    if (Buffer.isBuffer(pngSource)) {
        return { isValid: true, png: PNG.sync.read(pngSource) };
    }

    if (throwErrorOnInvalidInputData) {
        throw new Error('Unknown PNG file input type');
    }

    return invalidPng;
}
