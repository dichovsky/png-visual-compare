import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { toPixelmatchOptions } from '../adapters/toPixelmatchOptions';
import type { ComparisonResult, NormalizedImages, ResolvedOptions } from './types';

// SECU-10: the normalized-canvas `maxPixels` guard is now enforced inside
// `normalizeImages`, *before* `extendImage` allocates oversized RGBA buffers.
// By the time we reach this function, `images.width * images.height` is already
// known to be within `opts.maxPixels`.
export function runComparison(images: NormalizedImages, opts: ResolvedOptions): ComparisonResult {
    const diff = opts.shouldCreateDiffFile ? new PNG({ width: images.width, height: images.height }) : undefined;
    const mismatchedPixels = pixelmatch(
        images.first.data,
        images.second.data,
        diff?.data,
        images.width,
        images.height,
        toPixelmatchOptions(opts.pixelmatchOptions),
    );

    return {
        mismatchedPixels,
        diff,
    };
}
