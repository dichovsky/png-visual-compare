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
                return handlePathValidationError(error, opts);
            }

            let buffer;
            try {
                buffer = await readFile(validatedPath);
            } catch (error) {
                return handleFileReadError(error, opts);
            }

            if (opts.throwErrorOnInvalidInputData) {
                try {
                    return getPngData(buffer, true, opts.maxDimension, opts.maxPixels);
                } catch (error) {
                    return handlePngDecodeError(error, opts);
                }
            }

            return getPngData(buffer, false, opts.maxDimension, opts.maxPixels);
        }

        return getPngData(source, opts.throwErrorOnInvalidInputData, opts.maxDimension, opts.maxPixels);
    },
};
