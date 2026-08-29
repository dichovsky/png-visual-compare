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

/**
 * Default maximum size, in bytes, of a PNG file read from disk.
 *
 * Derived rather than arbitrary: at 4 bytes per RGBA pixel this is exactly the
 * decoded size of an image at `DEFAULT_MAX_PIXELS`, so no file that could pass
 * the pixel limit can meaningfully fail this one. It bounds the *compressed*
 * bytes, which `maxDimension` and `maxPixels` cannot — those read the declared
 * IHDR header, which says nothing about how many bytes reaching that header
 * costs.
 */
export const DEFAULT_MAX_FILE_BYTES = DEFAULT_MAX_PIXELS * 4;
