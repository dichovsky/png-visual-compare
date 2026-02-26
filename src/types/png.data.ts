import type { PNGWithMetadata } from 'pngjs';

/** Internal wrapper around a decoded PNG, carrying a validity flag alongside the image data. */
export type PngData = { isValid: boolean; png: PNGWithMetadata };
