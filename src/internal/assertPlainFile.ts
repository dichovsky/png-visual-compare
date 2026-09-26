import { PathValidationError } from '../errors';

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
