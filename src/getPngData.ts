import { readFileSync } from 'node:fs';
import { PNG, type PNGWithMetadata } from 'pngjs';
import type { PngData } from './types/png.data';

export function getPngData(pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean): PngData {
    const invalidPng: PngData = { isValid: false, png: new PNG({ width: 0, height: 0 }) as PNGWithMetadata };

    const tryParsePng = (buffer: Buffer, source: string): PngData => {
        try {
            return { isValid: true, png: PNG.sync.read(buffer) };
        } catch (e) {
            if (throwErrorOnInvalidInputData) {
                const message = e instanceof Error ? e.message : 'Unknown error';
                throw new Error(`${source} could not be read: ${message}`);
            }
            return invalidPng;
        }
    };

    if (typeof pngSource === 'string') {
        let png: Buffer<ArrayBufferLike>;
        try {
            png = readFileSync(pngSource);
        } catch (error) {
            if (throwErrorOnInvalidInputData) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`PNG file ${pngSource} could not be read: ${message}`);
            }
            return invalidPng;
        }
        return tryParsePng(png, `PNG file ${pngSource}`);
    }

    if (Buffer.isBuffer(pngSource)) {
        return tryParsePng(pngSource, 'PNG buffer');
    }

    if (throwErrorOnInvalidInputData) {
        throw new Error('Unknown PNG file input type');
    }

    return invalidPng;
}
