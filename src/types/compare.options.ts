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
     *
     * **Symlink-atomic write contract (SECU-03):**
     * The diff is written through an `O_NOFOLLOW` open. If the final path component
     * is a symlink at write-time, the write is refused with a {@link PathValidationError}
     * and the symlink's target is never touched. This closes the TOCTOU window where
     * a hostile process could plant a symlink between path validation and the write.
     * Regular files at the target path continue to be overwritten as before — only
     * the symlink-redirect attack is closed.
     *
     * **Residual scope:** the parent-directory race (a symlink planted in a parent
     * component between validation and `mkdirSync(..., { recursive: true })`) is not
     * yet closed; tracked as `SECU-09` in `BACKLOG.md`.
     *
     * @default undefined (no diff file written)
     * @throws {PathValidationError} if a symlink exists at the target path at write-time.
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
     *
     * @default 16384
     * @example
     * ```ts
     * // Stricter limit for web contexts
     * comparePng('img1.png', 'img2.png', { maxDimension: 4096 })
     *
     * // Disable limit (not recommended for user-controlled inputs)
     * comparePng('img1.png', 'img2.png', { maxDimension: Infinity })
     * ```
     */
    maxDimension?: number;
    /**
     * Maximum total pixel count (width × height) for a single decoded input image
     * and for the normalized comparison canvas.
     * Complements `maxDimension` by catching large-but-axis-valid images
     * (e.g., 1 × 16,777,216 pixels) that would still exhaust memory.
     * Set to `Infinity` to disable the limit entirely.
     *
     * @default 16_777_216 (256 megapixels, ~1 GB decompressed at 4 bytes/pixel)
     * @example
     * ```ts
     * // For web/mobile use cases with strict memory budgets
     * const opts = { maxPixels: 50_000_000 }; // 50 megapixels
     * comparePng(userImage1, userImage2, opts);
     *
     * // For server-side batch processing with more headroom
     * const opts = { maxPixels: 100_000_000 }; // 100 megapixels
     * comparePng(serverImage1, serverImage2, opts);
     * ```
     */
    maxPixels?: number;
    /**
     * When provided, `diffFilePath` must resolve to a path inside this directory
     * (validated after symlink resolution). Any attempt to write outside it throws
     * a `PathValidationError`. Use in server-side contexts where `diffFilePath`
     * is caller-controlled to prevent arbitrary file writes via path traversal
     * (VUL-01: `../../etc/passwd`).
     *
     * **Note:** This containment check is point-in-time. The **target-path** race
     * (a symlink planted at `diffFilePath` itself between validation and write) is
     * closed at write-time via `O_NOFOLLOW` — see {@link ComparePngOptions.diffFilePath}
     * and SECU-03. The **parent-directory** race (a symlink planted in a parent
     * component between validation and `mkdir`) remains open and is tracked as
     * SECU-09. For critical security contexts, use OS-level chroot/jails or
     * filesystem ACLs for defense-in-depth.
     *
     * @default undefined (no containment enforced)
     * @example
     * ```ts
     * // User uploads a diff path; restrict writes to /uploads
     * const userPath = req.body.diffPath; // Could be '../../etc/bad'
     * comparePng(img1, img2, {
     *   diffFilePath: userPath,
     *   diffOutputBaseDir: '/uploads'
     * });
     * ```
     */
    diffOutputBaseDir?: string;
    /**
     * When provided, string input paths (`png1` / `png2`) must resolve to a path
     * inside this directory (validated after symlink resolution). Any attempt to read
     * outside it throws a `PathValidationError`. Use in server-side contexts where
     * image paths are caller-controlled to prevent arbitrary file reads via path
     * traversal (VUL-02: reading `/etc/passwd` as a PNG).
     *
     * **Note:** This check is point-in-time; a race condition could allow a symlink
     * to be created after validation. For critical security contexts, use OS-level
     * chroot/jails or filesystem ACLs for defense-in-depth.
     *
     * @default undefined (no containment enforced)
     * @example
     * ```ts
     * // User provides image paths; restrict reads to /images
     * const img1 = req.body.image1; // Could be '../../etc/bad'
     * comparePng(img1, '/images/baseline.png', {
     *   inputBaseDir: '/images'
     * });
     * ```
     */
    inputBaseDir?: string;
    /**
     * Options translated internally via an adapter to [pixelmatch](https://github.com/mapbox/pixelmatch).
     * The public option names remain stable even if the underlying pixelmatch library changes.
     * @default undefined
     */
    pixelmatchOptions?: PixelmatchOptions;
};
