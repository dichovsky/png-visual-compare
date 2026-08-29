import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { PathValidationError } from '../errors';

/**
 * Resolves the diff file's parent directory through symlinks and re-proves it sits
 * inside `baseDir`, returning the canonical directory.
 *
 * This runs *after* the diff file has been opened. Containment was already checked
 * by `validatePath` at option-resolution time, but the path is walked again by
 * `mkdir` and `open`, so it has to be re-proven against the state that actually
 * produced the open handle. The returned canonical directory is what the handle's
 * identity is then compared against — comparing against the lexical path instead
 * would walk the same possibly-compromised route a second time and agree with
 * itself (SECU-09).
 *
 * @throws {PathValidationError} If the real directory is not inside `baseDir`.
 */
export function realDiffDirectory(directory: string, baseDir: string): string {
    const realBaseDir = realpathSync.native(resolve(baseDir));
    const realDirectory = realpathSync.native(resolve(directory));
    const rel = relative(realBaseDir, realDirectory);

    if (rel !== '' && (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel))) {
        throw new PathValidationError(`Diff write refused: "${realDirectory}" is outside the allowed directory "${realBaseDir}"`);
    }

    return realDirectory;
}
