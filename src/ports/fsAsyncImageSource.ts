import { getPngData } from '../getPngData';
import { PathValidationError, ResourceLimitError } from '../errors';
import { readValidatedFile } from '../readValidatedFile';
import type { AsyncImageSourcePort } from './asyncTypes';
import { handleFileReadError, handlePathValidationError, handlePngDecodeError } from './validateImageSourceLoad';

export const fsAsyncImageSource: AsyncImageSourcePort = {
    async load(source, opts) {
        if (typeof source === 'string') {
            let buffer;
            try {
                buffer = await readValidatedFile(source, opts.inputBaseDir, opts.maxFileBytes);
            } catch (error) {
                // Resource limits are a security signal and must surface even in
                // permissive mode, matching maxDimension/maxPixels.
                if (error instanceof ResourceLimitError) {
                    throw error;
                }
                if (error instanceof PathValidationError) {
                    return handlePathValidationError(error, opts);
                }
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
