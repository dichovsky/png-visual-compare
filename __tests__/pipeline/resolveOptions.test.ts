import { describe, expect, test } from 'vitest';
import { DEFAULT_EXCLUDED_AREA_COLOR, DEFAULT_EXTENDED_AREA_COLOR, DEFAULT_MAX_DIMENSION, DEFAULT_MAX_PIXELS } from '../../src/comparePng';
import { resolveOptions } from '../../src/pipeline/resolveOptions';

describe('resolveOptions', () => {
    test('applies defaults when no options are provided', () => {
        const result = resolveOptions(undefined);

        expect(result).toMatchObject({
            excludedAreas: [],
            throwErrorOnInvalidInputData: true,
            extendedAreaColor: DEFAULT_EXTENDED_AREA_COLOR,
            excludedAreaColor: DEFAULT_EXCLUDED_AREA_COLOR,
            shouldCreateDiffFile: false,
            diffFilePath: undefined,
            maxDimension: DEFAULT_MAX_DIMENSION,
            maxPixels: DEFAULT_MAX_PIXELS,
        });
    });

    test('rejects non-boolean throwErrorOnInvalidInputData values', () => {
        expect(() => resolveOptions({ throwErrorOnInvalidInputData: 'false' as never })).toThrow(
            'opts.throwErrorOnInvalidInputData must be a boolean when provided',
        );
    });
});
