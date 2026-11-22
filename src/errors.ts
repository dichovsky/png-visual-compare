/**
 * Thrown when a PNG input (file path or Buffer) is invalid, malformed, or cannot be decoded.
 * Also thrown when an `excludedAreas`, color, or `pixelmatchOptions` value is invalid.
 *
 * You can recover from a failure of one input with `throwErrorOnInvalidInputData: false`.
 * With this option value, the library uses a zero-size PNG for each invalid input.
 * Invalid options always throw. Two invalid inputs always throw.
 *
 * @example
 * ```ts
 * try {
 *   comparePng('invalid.png', 'image.png', { throwErrorOnInvalidInputData: true });
 * } catch (error) {
 *   if (error instanceof InvalidInputError) {
 *     console.log('Provided PNG was not valid:', error.message);
 *   }
 * }
 * ```
 */
export class InvalidInputError extends Error {
    readonly code = 'ERR_INVALID_PNG_INPUT' as const;

    constructor(message: string) {
        super(message);
        this.name = 'InvalidInputError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a file path fails validation checks, including:
 * - Path traversal attempts (when `inputBaseDir` or `diffOutputBaseDir` is set)
 * - Symlink loops or invalid symlink usage
 * - Empty, whitespace-only, or null-byte-containing paths
 * - A FIFO or device inside a base directory, on reads and diff writes, refused instead of
 *   blocking the call
 * - A diff file under `diffOutputBaseDir` that has more than one hard link, refused before
 *   it is truncated or written
 *
 * The library always re-throws this error for security-boundary failures, such as traversal
 * checks, symlink issues, and constrained-base-directory validation. When no base-directory
 * security boundary is set, callers can still downgrade simpler local path-shape validation
 * failures.
 *
 * @example
 * ```ts
 * try {
 *   comparePng(
 *     '../../etc/passwd',
 *     'image.png',
 *     { inputBaseDir: '/safe/dir' }
 *   );
 * } catch (error) {
 *   if (error instanceof PathValidationError) {
 *     console.log('Path attempted to escape the allowed directory');
 *   }
 * }
 * ```
 */
export class PathValidationError extends Error {
    readonly code = 'ERR_PATH_VALIDATION' as const;

    constructor(message: string) {
        super(message);
        this.name = 'PathValidationError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a PNG would exceed the resource limits that `maxDimension`, `maxPixels`, or
 * `maxFileBytes` set. This error is **NOT** recoverable. It always throws, also when
 * `throwErrorOnInvalidInputData` is `false`, because resource exhaustion is a security
 * concern, not a routine input validation issue.
 *
 * Common triggers:
 * - A crafted PNG header declaring huge dimensions (e.g., 999,999 × 999,999)
 * - A large-but-axis-valid PNG (e.g., 16,384 × 16,384) that would exhaust memory
 * - A PNG file read from a path that is larger than `maxFileBytes` (checked before any bytes are read)
 *
 * @example
 * ```ts
 * try {
 *   // Defaults reject > 16384 px per axis, > 16,777,216 pixels, or files > 129 MiB
 *   comparePng('huge.png', 'image.png');
 * } catch (error) {
 *   if (error instanceof ResourceLimitError) {
 *     console.log('PNG is too large:', error.message);
 *     // Increase maxDimension, maxPixels, or maxFileBytes if legitimate PNGs are being rejected
 *   }
 * }
 * ```
 */
export class ResourceLimitError extends Error {
    readonly code = 'ERR_RESOURCE_LIMIT' as const;

    constructor(message: string) {
        super(message);
        this.name = 'ResourceLimitError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when `pixelmatch` fails, for example when the normalized image buffers have different lengths.
 *
 * The standard ES2022 `cause` property keeps the original failure. Callers can examine it
 * without parsing error messages. Like {@link ResourceLimitError}, this error is **NOT**
 * recoverable with `throwErrorOnInvalidInputData: false`. A comparison-kernel failure shows an
 * integrity bug in the pipeline, not an input problem that the user can recover from.
 *
 * @example
 * ```ts
 * try {
 *   comparePng('a.png', 'b.png');
 * } catch (error) {
 *   if (error instanceof ComparisonError) {
 *     console.log('Comparison failed:', error.message);
 *     console.log('Underlying cause:', error.cause);
 *   }
 * }
 * ```
 */
export class ComparisonError extends Error {
    readonly code = 'ERR_COMPARISON' as const;

    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = 'ComparisonError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
