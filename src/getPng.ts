import { existsSync, readFileSync } from 'fs';
import { PNG, PNGWithMetadata } from 'pngjs';
import { PngData } from './types/png.data';

export function getPng(pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean): PngData {
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
