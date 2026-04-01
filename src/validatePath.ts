import { resolve } from 'node:path';

/**
 * Validates and resolves a file path string.
 *
 * Rejects empty/whitespace-only paths and paths containing null bytes.
 * Null bytes are injection vectors in C-based filesystem APIs that can bypass
 * suffix checks. After validation, resolves the path to an absolute path using
 * `path.resolve`.
 *
 * **Note:** This function is a minimal library-level guard. It does not enforce
 * containment to a base directory — callers in security-sensitive contexts
 * (e.g., server applications accepting user-supplied paths) are responsible for
 * restricting resolved paths to a permitted output directory.
 *
 * @param filePath - The file path string to validate.
 * @returns The resolved absolute path.
 * @throws {Error} If the path is empty/whitespace-only or contains a null byte.
 */
export function validatePath(filePath: string): string {
    if (filePath.trim().length === 0) {
        throw new Error('Invalid file path: path must not be empty or whitespace only');
    }
    if (filePath.includes('\0')) {
        throw new Error('Invalid file path: path must not contain null bytes');
    }
    return resolve(filePath);
}
