import { lstatSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, parse, relative, resolve, sep } from 'node:path';
import { PathValidationError } from './errors';
import type { ValidatedPath } from './types/validated-path';

export type ValidatePathMode = 'input' | 'output';

function isContained(baseDir: string, targetPath: string): boolean {
    const rel = relative(baseDir, targetPath);
    return rel === '' || (!(rel === '..' || rel.startsWith('..' + sep)) && !isAbsolute(rel));
}

function realpathNative(targetPath: string, missingBaseDirMessage?: string): string {
    try {
        return realpathSync.native(targetPath);
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ELOOP') {
            throw new PathValidationError('Path validation failed: symlink loop detected');
        }
        if (missingBaseDirMessage !== undefined) {
            throw new PathValidationError(missingBaseDirMessage);
        }
        throw error;
    }
}

function realpathExistingPath(targetPath: string): string {
    let currentPath = targetPath;
    const { root } = parse(targetPath);

    while (true) {
        try {
            return realpathNative(currentPath);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT' && code !== 'ENOTDIR') {
                throw error;
            }
            if (currentPath === root) {
                throw error;
            }
            currentPath = parse(currentPath).dir;
        }
    }
}

/**
 * Validates and resolves a file path string.
 *
 * Rejects empty/whitespace-only paths and paths containing null bytes.
 * Null bytes are injection vectors in C-based filesystem APIs that can bypass
 * suffix checks. After validation, resolves the path to an absolute path using
 * `path.resolve`.
 *
 * When `baseDir` is provided the resolved path must be located inside that
 * directory after resolving symlinks. For input paths the target itself is
 * resolved; for output paths the parent directory is resolved and the original
 * filename is re-attached after containment is checked.
 *
 * @param filePath - The file path string to validate.
 * @param baseDir  - Optional directory the resolved path must reside within.
 * @param mode     - Whether the path is used for reading or writing.
 * @returns The resolved absolute path.
 * @throws {Error} If the path is empty/whitespace-only, contains a null byte,
 *   or (when `baseDir` is given) resolves outside that directory.
 */
export function validatePath(filePath: string, baseDir?: string, mode: ValidatePathMode = 'output'): ValidatedPath {
    if (filePath.trim().length === 0) {
        throw new PathValidationError('Invalid file path: path must not be empty or whitespace only');
    }
    if (filePath.includes('\0')) {
        throw new PathValidationError('Invalid file path: path must not contain null bytes');
    }

    const resolved = resolve(filePath);
    if (mode === 'output') {
        try {
            const fileStats = lstatSync(resolved);
            if (fileStats.isSymbolicLink()) {
                throw new PathValidationError('Invalid file path: output path must not be an existing symlink');
            }
            if (statSync(resolved).isDirectory()) {
                throw new PathValidationError('Invalid file path: output path must not be an existing directory');
            }
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (!(error instanceof PathValidationError) && code !== 'ENOENT' && code !== 'ENOTDIR') {
                throw error;
            }
            if (error instanceof PathValidationError) {
                throw error;
            }
        }
    }
    if (baseDir !== undefined) {
        const normalizedBaseDir = resolve(baseDir);
        if (!isContained(normalizedBaseDir, resolved)) {
            throw new PathValidationError(`Path traversal detected: "${resolved}" is outside the allowed directory "${normalizedBaseDir}"`);
        }

        const realBaseDir = realpathNative(normalizedBaseDir, 'Path validation failed: base directory does not exist or is not accessible');
        const realTargetPath =
            mode === 'input'
                ? realpathNative(resolved)
                : resolve(realpathExistingPath(parse(resolved).dir), relative(parse(resolved).dir, resolved));

        if (!isContained(realBaseDir, realTargetPath)) {
            throw new PathValidationError(`Path traversal detected: "${resolved}" is outside the allowed directory "${realBaseDir}"`);
        }
    }

    return resolved as ValidatedPath;
}
