import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { toPixelmatchOptions } from '../adapters/toPixelmatchOptions';
import { ResourceLimitError } from '../errors';
import type { ComparisonResult, NormalizedImages, ResolvedOptions } from './types';

export function runComparison(images: NormalizedImages, opts: ResolvedOptions): ComparisonResult {
    const pixelCount = images.width * images.height;
    if (pixelCount > opts.maxPixels) {
        throw new ResourceLimitError(
            `Normalized canvas pixel count (${pixelCount}) exceeds the maximum allowed ${opts.maxPixels} pixels. ` +
                'Set opts.maxPixels to increase the limit.',
        );
    }

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
