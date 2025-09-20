import { existsSync, readFileSync } from 'fs';
import { Buffer } from 'node:buffer';
import { PNG, type PNGWithMetadata } from 'pngjs';
import type { PngData } from './types/png.data';

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
