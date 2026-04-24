import { readFile } from 'node:fs/promises';
import { InvalidInputError, PathValidationError, ResourceLimitError } from '../errors';
import { getPngData } from '../getPngData';
import { validatePath } from '../validatePath';
import type { AsyncImageSourcePort } from './asyncTypes';

export const fsAsyncImageSource: AsyncImageSourcePort = {
    async load(source, opts) {
        if (typeof source === 'string') {
            let validatedPath;
            try {
                validatedPath = validatePath(source, opts.inputBaseDir, 'input');
            } catch (error) {
                if (error instanceof PathValidationError && opts.inputBaseDir !== undefined) {
                    throw error;
                }
                if (opts.throwErrorOnInvalidInputData) {
                    const code = (error as NodeJS.ErrnoException).code;
                    if (code === 'ENOENT' || code === 'EACCES' || code === 'ENOTDIR') {
                        throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
                    }
                    throw error;
                }
                return { kind: 'invalid', reason: 'path' };
            }

            let buffer;
            try {
                buffer = await readFile(validatedPath);
            } catch (error) {
                if (error instanceof ResourceLimitError) {
                    throw error;
                }
                if (opts.throwErrorOnInvalidInputData) {
                    throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
                }
                return { kind: 'invalid', reason: 'path' };
            }

            if (opts.throwErrorOnInvalidInputData) {
                try {
                    return getPngData(buffer, true, opts.maxDimension, opts.maxPixels);
                } catch (error) {
                    if (error instanceof ResourceLimitError) {
                        throw error;
                    }
                    if (error instanceof InvalidInputError && error.message === 'Invalid PNG input: image has zero dimensions') {
                        throw error;
                    }
                    throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
                }
            }

            return getPngData(buffer, false, opts.maxDimension, opts.maxPixels);
        }

        return getPngData(source, opts.throwErrorOnInvalidInputData, opts.maxDimension, opts.maxPixels);
    },
};
