import type { Area } from './area';
import type { Color } from './color';

export type PixelmatchOptions = {
    /**
     * Matching threshold, ranges from `0` to `1`. Smaller values make the comparison more sensitive.
     * @default 0.1
     */
    threshold?: number;
    /**
     * Whether to skip anti-aliasing detection. When `true`, anti-aliased pixels are treated as mismatches.
     * @default false
     */
    includeAA?: boolean;
    /**
     * Blending factor of unchanged pixels in the output diff image. Ranges from `0` (transparent) to `1` (opaque).
     * @default 0.1
     */
    alpha?: number;
    /**
     * RGB colour of anti-aliased pixels in the diff image as `[r, g, b]`.
     * @default [255, 255, 0]
     */
    aaColor?: [number, number, number];
    /**
     * RGB colour of differing pixels in the diff image as `[r, g, b]`.
     * @default [255, 0, 0]
     */
    diffColor?: [number, number, number];
    /**
     * Alternative RGB colour for dark differing pixels (useful for dark-mode screenshots). When set, differing
     * pixels are coloured with `diffColor` or `diffColorAlt` based on brightness of the original pixel.
     * @default undefined
     */
    diffColorAlt?: [number, number, number];
    /**
     * When `true`, the output diff shows only the changed pixels on a transparent background.
     * @default false
     */
    diffMask?: boolean;
};

export type ComparePngOptions = {
    /**
     * Rectangular areas to exclude from the comparison. Both images have these regions painted a solid colour
     * before diffing, so they always match regardless of content.
     * @default []
     */
    excludedAreas?: Area[];
    /**
     * Absolute file path where the diff PNG is saved when mismatched pixels are found.
     * The directory is created automatically if it does not exist.
     * The file is **not** created when `pixelmatchResult === 0`.
     * @default undefined (no diff file written)
     */
    diffFilePath?: string;
    /**
     * When `true`, an error is thrown if either input is not a valid PNG file path or `Buffer`.
     * Set to `false` to treat invalid inputs as zero-size PNGs instead of throwing.
     * Note: an error is **always** thrown if *both* inputs are invalid, regardless of this flag.
     * @default true
     */
    throwErrorOnInvalidInputData?: boolean;
    /**
     * Colour used to paint size-extended padding regions (areas added when images differ in size).
     * Override when the default green `{ r: 0, g: 255, b: 0 }` clashes with your image content.
     * @default { r: 0, g: 255, b: 0 }
     */
    extendedAreaColor?: Color;
    /**
     * Colour used to paint excluded areas before comparison (making them always match).
     * Override when the default blue `{ r: 0, g: 0, b: 255 }` clashes with your image content.
     * @default { r: 0, g: 0, b: 255 }
     */
    excludedAreaColor?: Color;
    /**
     * Maximum allowed width or height in pixels for either input image.
     * An error is thrown if either dimension exceeds this limit, protecting against
     * denial-of-service via crafted PNG headers with enormous declared dimensions.
     * **This check always throws regardless of the `throwErrorOnInvalidInputData`
     * setting**, because an oversized image is a security/resource-exhaustion signal
     * rather than a routine "invalid input" condition.
     * Set to `Infinity` to disable the limit entirely.
     * @default 16384
     */
    maxDimension?: number;
    /**
     * When provided, `diffFilePath` must resolve to a path inside this directory.
     * Any attempt to write outside it (e.g. via `../../etc/cron.d/`) throws an error.
     * Use this in server-side contexts where `diffFilePath` may be caller-controlled
     * to prevent path-traversal arbitrary file writes (VUL-01).
     * @default undefined (no containment enforced)
     */
    diffOutputBaseDir?: string;
    /**
     * When provided, string input paths (`png1` / `png2`) must resolve to a path
     * inside this directory. Any attempt to read outside it throws an error.
     * Use this in server-side contexts where image paths may be caller-controlled
     * to prevent path-traversal arbitrary file reads (VUL-02).
     * @default undefined (no containment enforced)
     */
    inputBaseDir?: string;
    /**
     * Options forwarded directly to [pixelmatch](https://github.com/mapbox/pixelmatch).
     * @default undefined
     */
    pixelmatchOptions?: PixelmatchOptions;
};
