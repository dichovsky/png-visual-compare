import { closeSync, constants as fsConstants, fchmodSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { parse } from 'node:path';
import { PathValidationError } from '../errors';
import type { DiffWriterPort } from './types';

const SYMLINK_REFUSING_WRITE_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW;

// SECU-12: lock diff files to owner-only access (no group, no world).
// Passing `0o600` as the third arg to `openSync` covers the creation case
// — though POSIX still masks it with `~umask`, so umask can only make
// permissions *more* restrictive, never wider than `0o600`.
// Calling `fchmodSync` on the open fd afterwards covers the **overwrite**
// case: when the target already exists, `O_TRUNC` truncates the bytes but
// does not change the inode's mode, so a pre-existing `0o644` file would
// otherwise remain group/world-readable. fchmod forces the final mode in
// both cases.
const DIFF_FILE_MODE = 0o600;

export const fsDiffWriter: DiffWriterPort = {
    write(path, data) {
        mkdirSync(parse(path).dir, { recursive: true });
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
            fchmodSync(fd, DIFF_FILE_MODE);
            writeFileSync(fd, data);
        } finally {
            closeSync(fd);
        }
    },
};
