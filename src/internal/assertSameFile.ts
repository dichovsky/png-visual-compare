import { PathValidationError } from '../errors';

/** The subset of `BigIntStats` needed to identify a file on disk. */
export type FileIdentity = {
    readonly dev: bigint;
    readonly ino: bigint;
};

/**
 * Asserts that an opened file handle refers to the same on-disk file that path
 * validation approved.
 *
 * Node exposes no `openat`, so a hostile process can swap a path component
 * between the moment `validatePath` walks the path and the moment the kernel
 * walks it again for `open`. That race cannot be *prevented* portably. It can be
 * *detected*: the handle is pinned to one inode at open time, so comparing that
 * inode against the inode reachable through the validated real path proves the
 * two walks landed on the same file.
 *
 * A device/inode pair of zero means the filesystem reports no file identity
 * (some network mounts). Two zeroes compare equal, which would let the check
 * silently pass and the containment boundary quietly stop being enforced, so an
 * absent identity is refused rather than assumed benign.
 *
 * @param opened   - `fstat` of the open handle, taken with `{ bigint: true }`.
 * @param expected - `stat` of the validated real path, taken with `{ bigint: true }`.
 * @param subject  - Human-readable description of what was being opened, used in the error message.
 * @throws {PathValidationError} If either identity is absent, or the two differ.
 */
export function assertSameFile(opened: FileIdentity, expected: FileIdentity, subject: string): void {
    if (opened.ino === 0n || expected.ino === 0n) {
        throw new PathValidationError(
            `Path containment cannot be verified for ${subject}: the filesystem reports no file identity. ` +
                'Unset the base directory option to proceed without containment enforcement.',
        );
    }

    if (opened.dev !== expected.dev || opened.ino !== expected.ino) {
        throw new PathValidationError(
            `Path validation failed for ${subject}: the path changed between validation and access (TOCTOU defence)`,
        );
    }
}
