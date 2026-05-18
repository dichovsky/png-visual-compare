import { afterEach, describe, expect, test, vi } from 'vitest';

// `pixelmatch` is a third-party module — mock its default export so we can
// drive `runComparison`'s catch path deterministically. This declaration is
// intentionally placed before any module-under-test import so it matches the
// hoisted-mock pattern used in `__tests__/getPngData.non-error.test.ts` and
// `__tests__/validatePath.branches.test.ts`.
vi.mock('pixelmatch', () => ({
    __esModule: true,
    default: vi.fn(),
}));

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { ComparisonError } from '../../src';
import { loadSources } from '../../src/pipeline/loadSources';
import { normalizeImages } from '../../src/pipeline/normalizeImages';
import { resolveOptions } from '../../src/pipeline/resolveOptions';
import { runComparison } from '../../src/pipeline/runComparison';

const mockedPixelmatch = vi.mocked(pixelmatch);

function buildNormalizedImages(): ReturnType<typeof normalizeImages> {
    const png = new PNG({ width: 1, height: 1, fill: true });
    png.data.set(Buffer.from([255, 0, 0, 255]));
    const opts = resolveOptions(undefined);
    const sources = loadSources(PNG.sync.write(png), PNG.sync.write(png), opts);
    return normalizeImages(sources, opts);
}

describe('runComparison error wrapping (RELI-10)', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    test('wraps a thrown Error from pixelmatch in a ComparisonError and preserves the cause', () => {
        const underlying = new Error('Image sizes do not match.');
        mockedPixelmatch.mockImplementationOnce(() => {
            throw underlying;
        });

        const images = buildNormalizedImages();
        const opts = resolveOptions(undefined);

        let thrown: unknown;
        try {
            runComparison(images, opts);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ComparisonError);
        expect(thrown).toBeInstanceOf(Error);
        const comparisonError = thrown as ComparisonError;
        expect(comparisonError.code).toBe('ERR_COMPARISON');
        expect(comparisonError.message).toBe('Pixel comparison failed: Image sizes do not match.');
        expect(comparisonError.cause).toBe(underlying);
    });

    test('wraps a non-Error throw value from pixelmatch and stringifies it for the message', () => {
        mockedPixelmatch.mockImplementationOnce(() => {
            throw 'raw-string-failure';
        });

        const images = buildNormalizedImages();
        const opts = resolveOptions(undefined);

        let thrown: unknown;
        try {
            runComparison(images, opts);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ComparisonError);
        const comparisonError = thrown as ComparisonError;
        expect(comparisonError.message).toBe('Pixel comparison failed: raw-string-failure');
        expect(comparisonError.cause).toBe('raw-string-failure');
    });

    test('does not wrap when pixelmatch returns normally', () => {
        mockedPixelmatch.mockReturnValueOnce(0);

        const images = buildNormalizedImages();
        const opts = resolveOptions(undefined);

        const result = runComparison(images, opts);

        expect(result.mismatchedPixels).toBe(0);
        expect(result.diff).toBeUndefined();
        expect(mockedPixelmatch).toHaveBeenCalledTimes(1);
    });
});
