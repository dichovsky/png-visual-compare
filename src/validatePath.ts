import { resolve, sep } from 'node:path';

/**
 * Validates and resolves a file path string.
 *
 * Rejects empty/whitespace-only paths and paths containing null bytes.
 * Null bytes are injection vectors in C-based filesystem APIs that can bypass
 * suffix checks. After validation, resolves the path to an absolute path using
 * `path.resolve`.
 *
 * When `baseDir` is provided the resolved path must be located inside that
 * directory (or equal to it). This enforces containment and closes path-traversal
 * vulnerabilities in security-sensitive contexts (VUL-01, VUL-02).
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
        if (resolved !== normalizedBase && !resolved.startsWith(normalizedBase + sep)) {
            throw new Error(`Path traversal detected: "${resolved}" is outside the allowed directory "${normalizedBase}"`);
        }
    }
    return resolved;
}
