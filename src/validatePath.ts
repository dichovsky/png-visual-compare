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
 * Validates and resolves a file path string with optional directory containment checks.
 *
 * **Basic validation (always applied):**
 * - Rejects empty, whitespace-only, or null-byte-containing paths
 * - Rejects existing symlinks in output mode (to prevent using a symlink as a target)
 * - Rejects existing directories in output mode
 *
 * **Symlink handling notes:**
 * - Output mode: blocks writing to an **existing** symlink (TOCTOU race: a symlink could be
 *   created by another process between this check and the actual write)
 * - Input mode: follows symlinks and verifies the final target is inside `baseDir`
 * - Symlink loops are always detected and rejected regardless of mode
 *
 * **Containment checks (when `baseDir` is provided):**
 * - Resolves both the target and `baseDir` through symlinks to their canonical paths
 * - Verifies the target resides inside `baseDir` after symlink resolution
 * - For output paths: resolves the parent directory then re-attaches the filename
 *   (allows writing new files in a writable directory even if the file doesn't exist yet)
 *
 * @param filePath - The file path string to validate
 * @param baseDir  - Optional directory; when set, the resolved path must reside within it
 * @param mode     - 'input' (enforce symlink containment) or 'output' (reject existing symlinks)
 * @returns The resolved absolute path as a `ValidatedPath` opaque type
 * @throws {PathValidationError} If path is invalid, contains a traversal attempt,
 *   or violates mode-specific checks (existing symlink in output mode, etc.)
 * @throws {Error} Re-throws underlying filesystem errors that are not normalized into
 *   `PathValidationError` (for example inaccessible targets during direct resolution).
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
