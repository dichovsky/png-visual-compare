import { PathValidationError } from '../errors';

/**
 * The refusal for a special file inside a boundary (SECU-14), shared by
 * the post-open {@link assertRegularFile} and by writers whose non-blocking open of a
 * FIFO with no reader fails with `ENXIO` before there is a handle to check.
 *
 * @param subject - Human-readable description of what was being opened, used in the error message.
 */
export function notRegularFileError(subject: string): PathValidationError {
    return new PathValidationError(`Path validation failed for ${subject}: not a regular file (FIFO, socket, or device)`);
}

/**
 * Asserts that an opened handle refers to a regular file (SECU-14).
 *
 * Callers open with `O_NONBLOCK` when a boundary is set, so a FIFO planted inside it
 * opens at once instead of blocking the call until a peer appears. This check then
 * refuses it, and a device with it. Run it only after containment has been
 * proven, so the file kind of a path outside the boundary is never reported.
 *
 * @param opened  - `fstat` of the open handle.
 * @param subject - Human-readable description of what was being opened, used in the error message.
 * @throws {PathValidationError} If the handle is not a regular file.
 */
export function assertRegularFile(opened: { isFile(): boolean }, subject: string): void {
    if (!opened.isFile()) {
        throw notRegularFileError(subject);
    }
}

/**
 * Asserts that an opened file has no other name than the one being written (SECU-13).
 *
 * A hard link is the same inode under a second name, so the identity check that
 * proves a handle sits inside a boundary passes for a link to a file elsewhere on
 * the same filesystem. Writing through it would overwrite that file. The link
 * count is read from the opened handle, so it describes the inode about to be
 * written; a file this call just created, or one only ever written here, has one.
 *
 * @param opened  - `fstat` of the open handle, taken with `{ bigint: true }`.
 * @param subject - Human-readable description of what was being opened, used in the error message.
 * @throws {PathValidationError} If the file has more than one link.
 */
export function assertSingleLink(opened: { readonly nlink: bigint }, subject: string): void {
    if (opened.nlink > 1n) {
        throw new PathValidationError(
            `Path validation failed for ${subject}: the file has ${opened.nlink} hard links, ` +
                'so writing it would change the file under every other name too (hard-link defence)',
        );
    }
}
