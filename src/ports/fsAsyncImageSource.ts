import { readFile } from 'node:fs/promises';
import { getPngData } from '../getPngData';
import { validatePath } from '../validatePath';
import type { AsyncImageSourcePort } from './asyncTypes';
import { handleFileReadError, handlePathValidationError, handlePngDecodeError } from './validateImageSourceLoad';

export const fsAsyncImageSource: AsyncImageSourcePort = {
    async load(source, opts) {
        if (typeof source === 'string') {
            let validatedPath;
            try {
                validatedPath = validatePath(source, opts.inputBaseDir, 'input');
            } catch (error) {
                const result = handlePathValidationError(error, opts);
                if (result) return result;
                throw error;
            }

            let buffer;
            try {
                buffer = await readFile(validatedPath);
            } catch (error) {
                const result = handleFileReadError(error, opts);
                if (result) return result;
                throw error;
            }

            if (opts.throwErrorOnInvalidInputData) {
                try {
                    return getPngData(buffer, true, opts.maxDimension, opts.maxPixels);
                } catch (error) {
                    const result = handlePngDecodeError(error, opts);
                    if (result) return result;
                    throw error;
                }
            }

            return getPngData(buffer, false, opts.maxDimension, opts.maxPixels);
        }

        return getPngData(source, opts.throwErrorOnInvalidInputData, opts.maxDimension, opts.maxPixels);
    },
};
