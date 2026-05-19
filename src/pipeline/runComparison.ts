import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { toPixelmatchOptions } from '../adapters/toPixelmatchOptions';
import { ComparisonError } from '../errors';
import type { ComparisonResult, NormalizedImages, ResolvedOptions } from './types';

// SECU-10: the normalized-canvas `maxPixels` guard is now enforced inside
// `normalizeImages`, *before* `extendImage` allocates oversized RGBA buffers.
// By the time we reach this function, `images.width * images.height` is already
// known to be within `opts.maxPixels`.
export function runComparison(images: NormalizedImages, opts: ResolvedOptions): ComparisonResult {
    const diff = opts.shouldCreateDiffFile ? new PNG({ width: images.width, height: images.height }) : undefined;
    // RELI-10: `pixelmatch` is an external kernel; wrap any throw it raises in a
    // typed `ComparisonError` so consumers can match on `instanceof ComparisonError`
    // / `code === 'ERR_COMPARISON'` instead of parsing the underlying message.
    let mismatchedPixels: number;
    try {
        mismatchedPixels = pixelmatch(
            images.first.data,
            images.second.data,
            diff?.data,
            images.width,
            images.height,
            toPixelmatchOptions(opts.pixelmatchOptions),
        );
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new ComparisonError(`Pixel comparison failed: ${detail}`, { cause: error });
    }

    return {
        mismatchedPixels,
        diff,
    };
}
