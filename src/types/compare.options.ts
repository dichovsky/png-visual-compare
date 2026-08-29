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
    /**
     * Whether to blend semi-transparent pixels against a checkerboard pattern (`true`) or plain
     * white (`false`) when comparing. Affects how partially transparent pixels are matched.
     * @default true
     */
    checkerboard?: boolean;
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
     * **Symlink-atomic write contract (SECU-03, SECU-09):**
     * The diff is written through an `O_NOFOLLOW` open. If the final path component
     * is a symlink at write-time, the write is refused with a {@link PathValidationError}
     * and the symlink's target is never touched. This closes the TOCTOU window where
     * a hostile process could plant a symlink between path validation and the write.
     * Regular files at the target path continue to be overwritten as before — only
     * the symlink-redirect attack is closed.
     *
     * When `diffOutputBaseDir` is set, parent components are covered too: each is
     * created singly with symlinks refused, the parent chain is then resolved and the
     * file is opened *inside* that canonical directory, so no symlink is traversed at
     * open time at all. Truncation is deferred until the opened handle has been proven
     * to sit inside the boundary, so an escaped target is never emptied.
     *
     * **File mode contract (SECU-12):**
     * After the file is opened the writer issues an explicit `fchmod` to mode
     * `0o600` (owner read/write only), so the final mode is `0o600` regardless
     * of (a) the process umask and (b) any pre-existing mode at the target
     * when the diff overwrites an older file. POSIX would otherwise mask the
     * requested create-mode with `~umask` (so umask can only make permissions
     * *more* restrictive), and `O_TRUNC` would otherwise leave a pre-existing
     * `0o644` file at its existing wider mode. Callers who need a different
     * file mode can inject a custom `DiffWriterPort` via `comparePngWithPorts`.
     *
     * **Residual scope:** Node exposes no `openat`, so a path swap cannot be
     * *prevented* portably — it is detected and refused. Redirecting the write now
     * requires renaming a real directory in the resolved chain rather than planting a
     * symlink. Without `diffOutputBaseDir` there is no boundary to enforce and none of
     * the parent-component checks run.
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
     * @default 16_777_216 (16 megapixels, ~64 MB decompressed at 4 bytes/pixel)
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
     * Maximum size, in bytes, of a PNG file read from a path. Ignored for `Buffer`
     * inputs, whose memory the caller has already paid for.
     *
     * `maxDimension` and `maxPixels` read the declared IHDR header, so they bound
     * the *decoded* image but say nothing about how many compressed bytes must be
     * read to reach that header. This limit closes that gap. Like the other two,
     * it throws regardless of `throwErrorOnInvalidInputData`.
     *
     * Set to `Infinity` to disable the limit entirely.
     *
     * @default 67_108_864 (64 MiB — the decoded RGBA size of an image at `maxPixels`)
     * @example
     * ```ts
     * // Untrusted uploads: cap reads well below the decoded-image limit
     * comparePng(uploaded1, uploaded2, { maxFileBytes: 8 * 1024 * 1024 });
     * ```
     */
    maxFileBytes?: number;
    /**
     * When provided, `diffFilePath` must resolve to a path inside this directory
     * (validated after symlink resolution). Any attempt to write outside it throws
     * a `PathValidationError`. Use in server-side contexts where `diffFilePath`
     * is caller-controlled to prevent arbitrary file writes via path traversal
     * (VUL-01: `../../etc/passwd`).
     *
     * **Note:** The option-time containment check is point-in-time, so the write path
     * re-proves it. The **target-path** race (a symlink planted at `diffFilePath`
     * itself) is closed via `O_NOFOLLOW` — see {@link ComparePngOptions.diffFilePath}
     * and SECU-03. The **parent-directory** race is closed by SECU-09: parents are
     * created one component at a time with symlinks refused, and the file is opened
     * inside the resolved parent directory so no symlink is traversed.
     *
     * Node exposes no `openat`, so the underlying race is detected rather than made
     * impossible; the guarantee is that no bytes are written outside the boundary. For
     * critical security contexts, use OS-level chroot/jails or filesystem ACLs for
     * defense-in-depth.
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
     * **Note:** The read path does not trust the path a second time (SECU-05). The
     * file is opened first, pinning one inode, and the handle's device/inode pair is
     * then compared against the canonical path containment approved. A path swapped
     * between validation and read is refused with a `PathValidationError`, so bytes
     * are never returned from an inode that failed the check.
     *
     * Node exposes no `openat`, so the race is detected rather than prevented, and the
     * check needs a filesystem that reports file identity — on a mount that reports
     * none, the read is refused rather than passed silently. For critical security
     * contexts, use OS-level chroot/jails or filesystem ACLs for defense-in-depth.
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
