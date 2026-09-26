import { closeSync, constants as fsConstants, fchmodSync, fstatSync, ftruncateSync, openSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { PathValidationError } from '../errors';
import { assertRegularFile, assertSingleLink, notRegularFileError } from '../internal/assertPlainFile';
import { assertSameFile } from '../internal/assertSameFile';
import { secureMkdirSync } from '../internal/secureMkdir';
import { realDiffDirectory } from '../internal/realDiffDirectory';
import type { DiffWriterPort } from './types';

// O_TRUNC is deliberately absent: truncation happens only after the opened handle
// has been proven to live inside `diffOutputBaseDir` (SECU-09). Truncating on open
// would destroy the contents of an escaped target before anything could detect it.
const OPEN_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_NOFOLLOW;

// SECU-14: with a boundary, the open must not block. A write-open of a FIFO waits for
// a reader; with O_NONBLOCK it fails with ENXIO when there is none, and a FIFO that has
// one is refused by the regular-file check after the open. It changes nothing for a
// regular file. Without a boundary the blocking open is kept.
const BOUNDED_OPEN_FLAGS = OPEN_FLAGS | fsConstants.O_NONBLOCK;

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

function asOpenRefusal(error: unknown, baseDir: string | undefined): unknown {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ELOOP') {
        return new PathValidationError('Diff write refused: target path is a symlink (TOCTOU defence)');
    }
    if (code === 'ENXIO' && baseDir !== undefined) {
        return notRegularFileError('diff file');
    }
    return error;
}

export const fsDiffWriter: DiffWriterPort = {
    write(path, data, baseDir) {
        const directory = dirname(path);
        secureMkdirSync(directory, baseDir);

        // Resolve the parent chain *before* opening and write inside the canonical
        // directory, so the path actually traversed at open time contains no symlink
        // at all. Opening the caller's path instead would leave a window between the
        // component walk above and the open, in which a planted symlink could still be
        // followed — detected afterwards, but only after `O_CREAT` had made a file
        // outside the boundary. Defeating this now requires renaming a real directory
        // in the canonical chain, not merely planting a link.
        const target = baseDir === undefined ? path : resolve(realDiffDirectory(directory, baseDir), basename(path));

        let fd: number;
        try {
            fd = openSync(target, baseDir === undefined ? OPEN_FLAGS : BOUNDED_OPEN_FLAGS, DIFF_FILE_MODE);
        } catch (error) {
            throw asOpenRefusal(error, baseDir);
        }

        try {
            if (baseDir !== undefined) {
                const realDirectory = realDiffDirectory(directory, baseDir);
                const opened = fstatSync(fd, { bigint: true });
                assertSameFile(opened, statSync(resolve(realDirectory, basename(path)), { bigint: true }), 'diff file');
                assertRegularFile(opened, 'diff file');
                assertSingleLink(opened, 'diff file');
            }
            ftruncateSync(fd, 0);
            fchmodSync(fd, DIFF_FILE_MODE);
            writeFileSync(fd, data);
        } finally {
            // Close the pinned handle, but never unlink by pathname on failure. The
            // target or an ancestor may have been replaced since opening or checking
            // its identity; even a fresh stat cannot make a later unlink atomic.
            // A refused write may therefore leave an empty or partial file behind.
            closeSync(fd);
        }
    },
};
