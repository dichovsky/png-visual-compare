import { describe, expect, test } from 'vitest';
import {
    DEFAULT_EXCLUDED_AREA_COLOR,
    DEFAULT_EXTENDED_AREA_COLOR,
    DEFAULT_MAX_DIMENSION,
    DEFAULT_MAX_FILE_BYTES,
    DEFAULT_MAX_PIXELS,
} from '../../src/comparePng';
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
            maxFileBytes: DEFAULT_MAX_FILE_BYTES,
        });
    });

    test('default byte cap admits any PNG that passes the default pixel limit, 16-bit RGBA included', () => {
        // 16-bit RGBA is the widest PNG pixel format: 8 raw bytes per pixel. A cap sized for
        // 8-bit RGBA (4 bytes) rejected valid 16-bit files at half the pixel limit.
        expect(DEFAULT_MAX_FILE_BYTES).toBeGreaterThanOrEqual(DEFAULT_MAX_PIXELS * 8);
    });

    test('rejects non-boolean throwErrorOnInvalidInputData values', () => {
        expect(() => resolveOptions({ throwErrorOnInvalidInputData: 'false' as never })).toThrow(
            'opts.throwErrorOnInvalidInputData must be a boolean when provided',
        );
    });
});
