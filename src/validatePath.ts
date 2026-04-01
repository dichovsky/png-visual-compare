import { resolve } from 'node:path';

/**
 * Validates and resolves a file path string.
 *
 * Rejects paths containing null bytes, which are injection vectors in C-based
 * filesystem APIs and can bypass suffix checks. After validation, resolves the
 * path to an absolute path using `path.resolve`.
 *
 * @param filePath - The file path string to validate.
 * @returns The resolved absolute path.
 * @throws {Error} If the path contains a null byte.
 */
export function validatePath(filePath: string): string {
    if (filePath.includes('\0')) {
        throw new Error('Invalid file path: path must not contain null bytes');
    }
    return resolve(filePath);
}
