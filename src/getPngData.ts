import { readFileSync } from 'node:fs';
import { PNG, type PNGWithMetadata } from 'pngjs';
import type { PngData } from './types/png.data';
import { validatePath } from './validatePath';

export function getPngData(pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean): PngData {
    const invalidPng: PngData = { isValid: false, png: new PNG({ width: 0, height: 0 }) as PNGWithMetadata };

    const tryParsePng = (buffer: Buffer): PngData => {
        try {
            return { isValid: true, png: PNG.sync.read(buffer) };
        } catch {
            if (throwErrorOnInvalidInputData) {
                throw new Error('Invalid PNG input: the data could not be parsed');
            }
            return invalidPng;
        }
    };

    if (typeof pngSource === 'string') {
        let resolvedPath: string;
        try {
            resolvedPath = validatePath(pngSource);
        } catch (error) {
            if (throwErrorOnInvalidInputData) {
                throw error;
            }
            return invalidPng;
        }

        let png: Buffer<ArrayBufferLike>;
        try {
            png = readFileSync(resolvedPath);
        } catch {
            if (throwErrorOnInvalidInputData) {
                throw new Error('Invalid PNG input: the file could not be read');
            }
            return invalidPng;
        }
        return tryParsePng(png);
    }

    if (Buffer.isBuffer(pngSource)) {
        return tryParsePng(pngSource);
    }

    if (throwErrorOnInvalidInputData) {
        throw new Error('Unknown PNG file input type');
    }

    return invalidPng;
}
