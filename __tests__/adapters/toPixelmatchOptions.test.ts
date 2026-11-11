import { describe, expect, test } from 'vitest';
import { toPixelmatchOptions } from '../../src/adapters/toPixelmatchOptions';

describe('toPixelmatchOptions', () => {
    test('maps all supported fields to the raw pixelmatch shape', () => {
        const ignoreMask = new Uint8Array([0, 1, 0, 1]);
        expect(
            toPixelmatchOptions({
                threshold: 0.2,
                includeAA: true,
                alpha: 0.4,
                aaColor: [1, 2, 3],
                diffColor: [4, 5, 6],
                diffColorAlt: [7, 8, 9],
                diffMask: true,
                checkerboard: false,
                windowSize: 16,
                ignoreMask,
            }),
        ).toEqual({
            threshold: 0.2,
            includeAA: true,
            alpha: 0.4,
            aaColor: [1, 2, 3],
            diffColor: [4, 5, 6],
            diffColorAlt: [7, 8, 9],
            diffMask: true,
            checkerboard: false,
            windowSize: 16,
            ignoreMask,
        });
    });

    test('returns undefined when no options are provided', () => {
        expect(toPixelmatchOptions(undefined)).toBeUndefined();
    });

    test('returns only explicitly provided fields', () => {
        expect(toPixelmatchOptions({ threshold: 0.5 })).toEqual({ threshold: 0.5 });
    });
});
