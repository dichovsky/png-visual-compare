/**
 * Thrown when a PNG input (file path or Buffer) is invalid, malformed, or cannot be decoded.
 * This error is recoverable via `throwErrorOnInvalidInputData: false`, which treats invalid
 * inputs as zero-size PNGs instead.
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
 *
 * This error is always re-thrown for security-boundary failures such as traversal checks,
 * symlink issues, and constrained-base-directory validation. Simpler local path-shape
 * validation failures may still be downgraded by callers when no base-directory security
 * boundary is being enforced.
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
 * Thrown when a PNG would exceed resource limits set via `maxDimension` or `maxPixels`.
 * This error is **NOT** recoverable and always throws regardless of
 * `throwErrorOnInvalidInputData`, because resource exhaustion is a security concern
 * rather than a routine input validation issue.
 *
 * Common triggers:
 * - A crafted PNG header declaring huge dimensions (e.g., 999,999 × 999,999)
 * - A large-but-axis-valid PNG (e.g., 20,000 × 20,000) that would exhaust memory
 *
 * @example
 * ```ts
 * try {
 *   // Reject PNGs larger than 16384 × 16384
 *   comparePng('huge.png', 'image.png');
 * } catch (error) {
 *   if (error instanceof ResourceLimitError) {
 *     console.log('PNG is too large:', error.message);
 *     // Increase maxDimension or maxPixels if legitimate PNGs are being rejected
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
 * Thrown when the underlying `pixelmatch` call fails — for example, when the two
 * normalized image buffers have mismatched lengths, or when `pixelmatch` itself
 * throws for any reason the public API does not control directly.
 *
 * The original failure is preserved on the standard ES2022 `cause` property so
 * callers can inspect it without parsing error messages. Like {@link ResourceLimitError},
 * this error is **NOT** recoverable via `throwErrorOnInvalidInputData: false`:
 * a comparison-kernel failure signals an integrity bug in the pipeline, not a
 * user-recoverable input problem.
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
