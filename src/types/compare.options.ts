import type { Area } from './area';

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
     * Options forwarded directly to [pixelmatch](https://github.com/mapbox/pixelmatch).
     * @default undefined
     */
    pixelmatchOptions?: PixelmatchOptions;
};
