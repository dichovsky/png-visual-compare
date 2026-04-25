import { InvalidInputError, PathValidationError, ResourceLimitError } from '../errors';
import type { LoadedPng } from '../types/png.data';
import type { ResolvedOptions } from '../pipeline/types';

/**
 * Validates and handles errors from path validation during image source loading.
 * Returns an invalid LoadedPng if path validation fails and throwError is false.
 *
 * @throws {InvalidInputError} If path validation fails with ENOENT, EACCES, or ENOTDIR and throwError is true.
 * @throws {PathValidationError} If inputBaseDir is set and path traversal is detected.
 */
export function handlePathValidationError(error: unknown, opts: ResolvedOptions): LoadedPng | undefined {
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

/**
 * Validates and handles errors from file read operations during image source loading.
 * Returns an invalid LoadedPng if read fails and throwError is false.
 *
 * @throws {InvalidInputError} If file read fails and throwError is true.
 */
export function handleFileReadError(error: unknown, opts: ResolvedOptions): LoadedPng | undefined {
    if (opts.throwErrorOnInvalidInputData) {
        throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
    }

    return { kind: 'invalid', reason: 'path' };
}

/**
 * Validates and handles errors from PNG decode operations during image source loading.
 * Returns an invalid LoadedPng if decode fails and throwError is false.
 *
 * @throws {InvalidInputError} If PNG decode fails and throwError is true (unless zero dimensions).
 * @throws {ResourceLimitError} Re-throws resource limit errors from PNG decoding.
 */
export function handlePngDecodeError(error: unknown, opts: ResolvedOptions): LoadedPng | undefined {
    if (error instanceof ResourceLimitError) {
        throw error;
    }

    if (error instanceof InvalidInputError && error.message === 'Invalid PNG input: image has zero dimensions') {
        throw error;
    }

    if (opts.throwErrorOnInvalidInputData) {
        throw new InvalidInputError('Invalid PNG input: the source could not be loaded');
    }

    return { kind: 'invalid', reason: 'decode' };
}
