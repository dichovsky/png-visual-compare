import { describe, expect, test } from 'vitest';
import { DEFAULT_EXCLUDED_AREA_COLOR, DEFAULT_EXTENDED_AREA_COLOR, DEFAULT_MAX_DIMENSION, DEFAULT_MAX_PIXELS } from '../../src/defaults';
import { InvalidInputError, PathValidationError, ResourceLimitError } from '../../src/errors';
import type { ResolvedOptions } from '../../src/pipeline/types';
import { handleFileReadError, handlePathValidationError, handlePngDecodeError } from '../../src/ports/validateImageSourceLoad';

function createOptions(overrides?: Partial<ResolvedOptions>): ResolvedOptions {
    return {
        excludedAreas: [],
        throwErrorOnInvalidInputData: true,
        extendedAreaColor: DEFAULT_EXTENDED_AREA_COLOR,
        excludedAreaColor: DEFAULT_EXCLUDED_AREA_COLOR,
        shouldCreateDiffFile: false,
        maxDimension: DEFAULT_MAX_DIMENSION,
        maxPixels: DEFAULT_MAX_PIXELS,
        ...overrides,
    };
}

describe('validateImageSourceLoad helpers', () => {
    test('handlePathValidationError maps ENOTDIR to InvalidInputError when throwing is enabled', () => {
        const error = Object.assign(new Error('not a dir'), { code: 'ENOTDIR' });

        expect(() => handlePathValidationError(error, createOptions())).toThrow(InvalidInputError);
    });

    test('handlePathValidationError returns invalid path when throwing is disabled', () => {
        const error = new PathValidationError('bad path');

        expect(handlePathValidationError(error, createOptions({ throwErrorOnInvalidInputData: false }))).toEqual({
            kind: 'invalid',
            reason: 'path',
        });
    });

    test('handleFileReadError throws InvalidInputError when throwing is enabled', () => {
        expect(() => handleFileReadError(new Error('boom'), createOptions())).toThrow(InvalidInputError);
    });

    test('handleFileReadError returns invalid path when throwing is disabled', () => {
        expect(handleFileReadError(new Error('boom'), createOptions({ throwErrorOnInvalidInputData: false }))).toEqual({
            kind: 'invalid',
            reason: 'path',
        });
    });

    test('handlePngDecodeError rethrows ResourceLimitError', () => {
        const error = new ResourceLimitError('limit');

        expect(() => handlePngDecodeError(error, createOptions())).toThrow(error);
    });

    test('handlePngDecodeError rethrows zero-dimension InvalidInputError', () => {
        const error = new InvalidInputError('Invalid PNG input: image has zero dimensions');

        expect(() => handlePngDecodeError(error, createOptions())).toThrow(error);
    });

    test('handlePngDecodeError maps generic decode failures to InvalidInputError when throwing is enabled', () => {
        expect(() => handlePngDecodeError(new Error('bad png'), createOptions())).toThrow(InvalidInputError);
    });

    test('handlePngDecodeError returns invalid decode when throwing is disabled', () => {
        expect(handlePngDecodeError(new Error('bad png'), createOptions({ throwErrorOnInvalidInputData: false }))).toEqual({
            kind: 'invalid',
            reason: 'decode',
        });
    });
});
