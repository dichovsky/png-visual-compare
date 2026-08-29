import {
    closeSync,
    constants as fsConstants,
    fchmodSync,
    fstatSync,
    ftruncateSync,
    openSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { PathValidationError } from '../errors';
import { assertSameFile } from '../internal/assertSameFile';
import { secureMkdirSync } from '../internal/secureMkdir';
import { realDiffDirectory } from '../internal/realDiffDirectory';
import type { DiffWriterPort } from './types';

// O_TRUNC is deliberately absent: truncation happens only after the opened handle
// has been proven to live inside `diffOutputBaseDir` (SECU-09). Truncating on open
// would destroy the contents of an escaped target before anything could detect it.
const SYMLINK_REFUSING_WRITE_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_NOFOLLOW;

// SECU-12: lock diff files to owner-only access (no group, no world).
// Passing `0o600` as the third arg to `openSync` covers the creation case
// — though POSIX still masks it with `~umask`, so umask can only make
// permissions *more* restrictive, never wider than `0o600`.
// Calling `fchmodSync` on the open fd afterwards covers the **overwrite**
// case: when the target already exists, truncation resets the bytes but
// does not change the inode's mode, so a pre-existing `0o644` file would
// otherwise remain group/world-readable. fchmod forces the final mode in
// both cases.
const DIFF_FILE_MODE = 0o600;

export const fsDiffWriter: DiffWriterPort = {
    write(path, data, baseDir) {
        const directory = dirname(path);
        secureMkdirSync(directory, baseDir);

        let fd: number;
        try {
            fd = openSync(path, SYMLINK_REFUSING_WRITE_FLAGS, DIFF_FILE_MODE);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
                throw new PathValidationError('Diff write refused: target path is a symlink (TOCTOU defence)');
            }
            throw error;
        }

        try {
            if (baseDir !== undefined) {
                const realDirectory = realDiffDirectory(directory, baseDir);
                assertSameFile(
                    fstatSync(fd, { bigint: true }),
                    statSync(resolve(realDirectory, basename(path)), { bigint: true }),
                    'diff file',
                );
            }
            ftruncateSync(fd, 0);
            fchmodSync(fd, DIFF_FILE_MODE);
            writeFileSync(fd, data);
        } catch (error) {
            let createdEmpty = false;
            try {
                createdEmpty = fstatSync(fd, { bigint: true }).size === 0n;
            } catch {
                /* the handle may already be unusable; treat it as not ours to remove */
            }
            closeSync(fd);
            // Unlink only a zero-length file. `O_CREAT` may have just created the
            // target, and leaving an empty file behind on an escaped path is litter —
            // but a file that already holds bytes is one this write did not create,
            // and destroying it would be worse than the litter it cleans up.
            if (createdEmpty) {
                try {
                    unlinkSync(path);
                } catch {
                    /* best effort: the path may already be gone */
                }
            }
            throw error;
        }
        closeSync(fd);
    },
};
