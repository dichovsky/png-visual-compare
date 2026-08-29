import { lstatSync, mkdirSync } from 'node:fs';
import { mkdir, lstat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { PathValidationError } from '../errors';

/**
 * Returns each directory that must exist between `baseDir` and `dir`, outermost
 * first, or `null` when `dir` is not inside `baseDir`.
 */
function componentsFrom(baseDir: string, dir: string): string[] | null {
    const rel = relative(baseDir, dir);
    if (rel === '') {
        return [];
    }
    if (rel === '..' || rel.startsWith('..' + sep) || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) {
        return null;
    }
    let current = baseDir;
    return rel.split(sep).map((segment) => {
        current = resolve(current, segment);
        return current;
    });
}

function refuseSymlink(component: string): void {
    throw new PathValidationError(
        `Diff write refused: "${component}" is a symlink. Parent directories of the diff file must not be symlinks ` +
            'when diffOutputBaseDir is set (TOCTOU defence).',
    );
}

/**
 * Creates `dir`, refusing to traverse a symlinked parent component.
 *
 * `mkdirSync(dir, { recursive: true })` follows symlinks in every intermediate
 * component, and `O_NOFOLLOW` on the subsequent `open` only guards the *final*
 * component. Together those let a symlinked parent redirect the whole write
 * outside `diffOutputBaseDir` (SECU-09). Walking one component at a time and
 * refusing symlinks removes that traversal rather than detecting it afterwards,
 * which matters here because `O_CREAT` would otherwise have already created a
 * file outside the boundary before anything noticed.
 *
 * Without `baseDir` there is no boundary to protect — callers may write
 * anywhere by design — so the original recursive behaviour is kept.
 *
 * @throws {PathValidationError} If a component between `baseDir` and `dir` is a symlink,
 *   or if `dir` lies outside `baseDir`.
 */
export function secureMkdirSync(dir: string, baseDir?: string): void {
    if (baseDir === undefined) {
        mkdirSync(dir, { recursive: true });
        return;
    }

    const components = componentsFrom(resolve(baseDir), resolve(dir));
    if (components === null) {
        throw new PathValidationError(`Diff write refused: "${resolve(dir)}" is outside the allowed directory "${resolve(baseDir)}"`);
    }

    for (const component of components) {
        try {
            if (lstatSync(component).isSymbolicLink()) {
                refuseSymlink(component);
            }
        } catch (error) {
            if (error instanceof PathValidationError) {
                throw error;
            }
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT' && code !== 'ENOTDIR') {
                throw error;
            }
            mkdirSync(component);
        }
    }
}

/** Asynchronous twin of {@link secureMkdirSync}; identical contract. */
export async function secureMkdir(dir: string, baseDir?: string): Promise<void> {
    if (baseDir === undefined) {
        await mkdir(dir, { recursive: true });
        return;
    }

    const components = componentsFrom(resolve(baseDir), resolve(dir));
    if (components === null) {
        throw new PathValidationError(`Diff write refused: "${resolve(dir)}" is outside the allowed directory "${resolve(baseDir)}"`);
    }

    for (const component of components) {
        try {
            if ((await lstat(component)).isSymbolicLink()) {
                refuseSymlink(component);
            }
        } catch (error) {
            if (error instanceof PathValidationError) {
                throw error;
            }
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT' && code !== 'ENOTDIR') {
                throw error;
            }
            await mkdir(component);
        }
    }
}
