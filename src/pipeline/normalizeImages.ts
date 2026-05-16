import { PNG, type PNGWithMetadata } from 'pngjs';
import { addColoredAreasToImage } from '../addColoredAreasToImage';
import { ResourceLimitError } from '../errors';
import { extendImage } from '../extendImage';
import { fillImageSizeDifference } from '../fillImageSizeDifference';
import type { LoadedPng } from '../types/png.data';
import type { LoadedSources, NormalizedImages, ResolvedOptions } from './types';

function clonePng(image: PNGWithMetadata): PNGWithMetadata {
    const cloned = new PNG({ width: image.width, height: image.height, fill: true });
    PNG.bitblt(image, cloned, 0, 0, image.width, image.height, 0, 0);
    return cloned as PNGWithMetadata;
}

function toComparablePng(source: LoadedPng): PNGWithMetadata {
    switch (source.kind) {
        case 'valid':
            return clonePng(source.png);
        case 'invalid':
            return new PNG({ width: 0, height: 0 }) as PNGWithMetadata;
    }
}

export function normalizeImages(sources: LoadedSources, opts: ResolvedOptions): NormalizedImages {
    let first = toComparablePng(sources.first);
    let second = toComparablePng(sources.second);

    if (opts.excludedAreas.length > 0) {
        addColoredAreasToImage(first, opts.excludedAreas, opts.excludedAreaColor);
        addColoredAreasToImage(second, opts.excludedAreas, opts.excludedAreaColor);
    }

    const { width: width1, height: height1 } = first;
    const { width: width2, height: height2 } = second;
    const width = Math.max(width1, width2);
    const height = Math.max(height1, height2);

    // SECU-10: enforce the normalized-canvas pixel cap *before* extendImage allocates
    // its target buffers. Allowing `extendImage` to run first would let a crafted
    // (16384×1024, 1024×16384) input pair allocate ~2 GiB of zero-filled RGBA buffers
    // before the runtime guard could throw.
    const pixelCount = width * height;
    if (pixelCount > opts.maxPixels) {
        throw new ResourceLimitError(
            `Normalized canvas pixel count (${pixelCount}) exceeds the maximum allowed ${opts.maxPixels} pixels. ` +
                'Set opts.maxPixels to increase the limit.',
        );
    }

    if (width1 !== width2 || height1 !== height2) {
        first = extendImage(first, width, height);
        second = extendImage(second, width, height);

        fillImageSizeDifference(first, width1, height1, opts.extendedAreaColor);
        fillImageSizeDifference(second, width2, height2, opts.extendedAreaColor);
    }

    return { first, second, width, height };
}
