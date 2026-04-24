import { isAbsolute, relative, resolve } from 'node:path';

/**
 * Validates and resolves a file path string.
 *
 * Rejects empty/whitespace-only paths and paths containing null bytes.
 * Null bytes are injection vectors in C-based filesystem APIs that can bypass
 * suffix checks. After validation, resolves the path to an absolute path using
 * `path.resolve`.
 *
 * When `baseDir` is provided the resolved path must be located inside that
 * directory (or equal to it). Containment is checked via `path.relative` rather
 * than a string prefix test, which correctly handles case-insensitive filesystems
 * and sibling-directory names that share a common prefix (e.g. `/safe/dir` vs
 * `/safe/dir-evil`).
 *
 * Note: this check operates on the lexical path only. Symlinks are not resolved
 * here; callers that require symlink-safe containment should `fs.realpathSync`
 * both paths before calling this function.
 *
 * @param filePath - The file path string to validate.
 * @param baseDir  - Optional directory the resolved path must reside within.
 * @returns The resolved absolute path.
 * @throws {Error} If the path is empty/whitespace-only, contains a null byte,
 *   or (when `baseDir` is given) resolves outside that directory.
 */
export function validatePath(filePath: string, baseDir?: string): string {
    if (filePath.trim().length === 0) {
        throw new Error('Invalid file path: path must not be empty or whitespace only');
    }
    if (filePath.includes('\0')) {
        throw new Error('Invalid file path: path must not contain null bytes');
    }
    const resolved = resolve(filePath);
    if (baseDir !== undefined) {
        const normalizedBase = resolve(baseDir);
        // path.relative returns a path starting with '..' when `resolved` is above
        // or beside `normalizedBase`. Either condition means escape.
        const rel = relative(normalizedBase, resolved);
        if (rel.startsWith('..') || isAbsolute(rel)) {
            throw new Error(`Path traversal detected: "${resolved}" is outside the allowed directory "${normalizedBase}"`);
        }
    }
    return resolved;
}
