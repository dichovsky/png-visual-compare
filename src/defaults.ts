import type { Color } from './types';

/** Default colour applied to size-extended padding regions (green). */
export const DEFAULT_EXTENDED_AREA_COLOR: Color = { r: 0, g: 255, b: 0 };

/** Default colour applied to excluded areas before comparison (blue). */
export const DEFAULT_EXCLUDED_AREA_COLOR: Color = { r: 0, g: 0, b: 255 };

/**
 * Default maximum image dimension (width or height) in pixels.
 * Images exceeding this in either axis will throw an error to prevent
 * denial-of-service via crafted PNG headers with enormous declared sizes.
 */
export const DEFAULT_MAX_DIMENSION = 16384;

/** Default maximum decoded pixel count for a single image or normalized canvas. */
export const DEFAULT_MAX_PIXELS = 16_777_216;
