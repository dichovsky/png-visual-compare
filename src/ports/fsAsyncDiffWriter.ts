import { constants as fsConstants } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { parse } from 'node:path';
import { PathValidationError } from '../errors';
import type { AsyncDiffWriterPort } from './asyncTypes';

const SYMLINK_REFUSING_WRITE_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW;

// SECU-12: lock diff files to owner-only access (no group, no world).
// Passing `0o600` as the third arg to `open` covers the creation case
// — though POSIX still masks it with `~umask`, so umask can only make
// permissions *more* restrictive, never wider than `0o600`.
// Calling `handle.chmod` on the open handle afterwards covers the
// **overwrite** case: when the target already exists, `O_TRUNC` truncates
// the bytes but does not change the inode's mode, so a pre-existing
// `0o644` file would otherwise remain group/world-readable. chmod forces
// the final mode in both cases.
const DIFF_FILE_MODE = 0o600;

export const fsAsyncDiffWriter: AsyncDiffWriterPort = {
    async write(path, data) {
        await mkdir(parse(path).dir, { recursive: true });
        try {
            const handle = await open(path, SYMLINK_REFUSING_WRITE_FLAGS, DIFF_FILE_MODE);
            try {
                await handle.chmod(DIFF_FILE_MODE);
                await handle.writeFile(data);
            } finally {
                await handle.close();
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
                throw new PathValidationError('Diff write refused: target path is a symlink (TOCTOU defence)');
            }
            throw error;
        }
    },
};
