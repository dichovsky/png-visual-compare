import { constants as fsConstants, statSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { PathValidationError } from '../errors';
import { assertSameFile } from '../internal/assertSameFile';
import { realDiffDirectory } from '../internal/realDiffDirectory';
import { secureMkdir } from '../internal/secureMkdir';
import type { AsyncDiffWriterPort } from './asyncTypes';

// O_TRUNC is deliberately absent: truncation happens only after the opened handle
// has been proven to live inside `diffOutputBaseDir` (SECU-09). Truncating on open
// would destroy the contents of an escaped target before anything could detect it.
//
// The create attempt carries O_EXCL so that success proves *this* call created the
// file. Without it, O_CREAT succeeds identically for a file that already existed
// empty, and the cleanup path below could not tell the two apart — it would delete
// a pre-existing zero-length file (a placeholder or lock) that it never created.
const CREATE_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW;
const OPEN_EXISTING_FLAGS = fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW;

// SECU-12: lock diff files to owner-only access (no group, no world).
// Passing `0o600` as the third arg to `open` covers the creation case
// — though POSIX still masks it with `~umask`, so umask can only make
// permissions *more* restrictive, never wider than `0o600`.
// Calling `handle.chmod` on the open handle afterwards covers the
// **overwrite** case: when the target already exists, truncation resets
// the bytes but does not change the inode's mode, so a pre-existing
// `0o644` file would otherwise remain group/world-readable. chmod forces
// the final mode in both cases.
const DIFF_FILE_MODE = 0o600;

function asSymlinkRefusal(error: unknown): unknown {
    if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
        return new PathValidationError('Diff write refused: target path is a symlink (TOCTOU defence)');
    }
    return error;
}

export const fsAsyncDiffWriter: AsyncDiffWriterPort = {
    async write(path, data, baseDir) {
        const directory = dirname(path);
        await secureMkdir(directory, baseDir);

        // Resolve the parent chain *before* opening and write inside the canonical
        // directory, so the path actually traversed at open time contains no symlink
        // at all. Opening the caller's path instead would leave a window between the
        // component walk above and the open, in which a planted symlink could still be
        // followed — detected afterwards, but only after `O_CREAT` had made a file
        // outside the boundary. Defeating this now requires renaming a real directory
        // in the canonical chain, not merely planting a link.
        const target = baseDir === undefined ? path : resolve(realDiffDirectory(directory, baseDir), basename(path));

        let handle;
        let created = true;
        try {
            handle = await open(target, CREATE_FLAGS, DIFF_FILE_MODE);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'EEXIST') {
                throw asSymlinkRefusal(error);
            }
            // The target already exists, so this call is an overwrite, not a create.
            // A symlink at the target reaches here as EEXIST (O_EXCL reports the link
            // itself); reopening without O_CREAT surfaces it as ELOOP via O_NOFOLLOW.
            created = false;
            try {
                handle = await open(target, OPEN_EXISTING_FLAGS, DIFF_FILE_MODE);
            } catch (reopenError) {
                throw asSymlinkRefusal(reopenError);
            }
        }

        try {
            if (baseDir !== undefined) {
                // Ties the handle to the canonical target, catching a swap between the
                // open and here.
                assertSameFile(await handle.stat({ bigint: true }), statSync(target, { bigint: true }), 'diff file');
            }
            await handle.truncate(0);
            await handle.chmod(DIFF_FILE_MODE);
            await handle.writeFile(data);
        } catch (error) {
            await handle.close();
            // Remove only a file this call created, which O_EXCL establishes rather
            // than infers. Leaving an empty file behind on an escaped path is litter;
            // deleting a file this write did not create would be worse than the litter
            // it cleans up.
            if (created) {
                try {
                    await unlink(target);
                } catch {
                    /* best effort: the path may already be gone */
                }
            }
            throw error;
        }
        await handle.close();
    },
};
