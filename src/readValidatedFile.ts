import type { Buffer } from 'node:buffer';
import { closeSync, constants as fsConstants, fstatSync, openSync, readFileSync, statSync } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { ResourceLimitError } from './errors';
import { assertSameFile } from './internal/assertSameFile';
import { assertPathSyntax, validatePathWithReal } from './validatePath';

function assertWithinByteCap(size: bigint, maxFileBytes: number | undefined): void {
    if (maxFileBytes === undefined || maxFileBytes === Infinity) {
        return;
    }
    if (size > BigInt(maxFileBytes)) {
        throw new ResourceLimitError(
            `File size (${size} bytes) exceeds the maximum allowed ${maxFileBytes} bytes. ` +
                'Set opts.maxFileBytes to increase the limit.',
        );
    }
}

/**
 * Reads a file through a handle that is pinned before validation runs, so the
 * bytes returned provably come from the inode that path validation approved.
 *
 * The sequence is deliberate:
 *
 * 1. `open` first. This pins one inode for the rest of the call — every later
 *    step describes *that* file, not whatever the path happens to point at now.
 * 2. `fstat` on the handle, for the size and identity used below.
 * 3. `validatePathWithReal` for the containment check.
 * 4. When a boundary was requested, compare the handle's identity against the
 *    canonical path containment was proven against (SECU-05). Skipped without
 *    `inputBaseDir`, because `validatePath` consults no filesystem in that case
 *    and there is no boundary a swap could cross — running it anyway would buy
 *    nothing while exposing every default caller to a false positive from a
 *    benign atomic-rename baseline update.
 * 5. Only now, the `maxFileBytes` cap — still before a single byte is read, which
 *    is the point of SECU-04, but deliberately *after* containment. The cap's
 *    error names an exact byte count and escapes even in permissive mode, so
 *    running it first would tell a caller the size and existence of a file
 *    outside `inputBaseDir`. Containment must fail first for such a path.
 * 6. Read from the handle, never from the path string again.
 *
 * @param filePath     - Path to read.
 * @param inputBaseDir - Optional containment boundary; enables the identity check.
 * @param maxFileBytes - Optional byte cap; `Infinity` or `undefined` disables it.
 * @returns The file contents.
 * @throws {ResourceLimitError} If the file exceeds `maxFileBytes`.
 * @throws {PathValidationError} If validation fails, or the path changed mid-flight.
 */
export function readValidatedFileSync(filePath: string, inputBaseDir?: string, maxFileBytes?: number): Buffer {
    // Cheap, filesystem-free checks run before the open so a malformed path still
    // fails as a PathValidationError rather than as the runtime's own TypeError.
    assertPathSyntax(filePath);

    const fd = openSync(filePath, fsConstants.O_RDONLY);
    try {
        const opened = fstatSync(fd, { bigint: true });

        const { real } = validatePathWithReal(filePath, inputBaseDir, 'input');
        if (inputBaseDir !== undefined && real !== undefined) {
            assertSameFile(opened, statSync(real, { bigint: true }), 'input image');
        }

        assertWithinByteCap(opened.size, maxFileBytes);

        return readFileSync(fd);
    } finally {
        closeSync(fd);
    }
}

/**
 * Asynchronous twin of {@link readValidatedFileSync}; identical contract and ordering.
 *
 * The open, stat, and read are all promise-based. `validatePathWithReal` is still
 * synchronous internally (`realpathSync.native`), so this is not a fully non-blocking
 * path — closing that gap needs an async twin of the path validator, which every sync
 * caller would also have to keep working. Tracked with the wider async-symmetry work.
 */
export async function readValidatedFile(filePath: string, inputBaseDir?: string, maxFileBytes?: number): Promise<Buffer> {
    assertPathSyntax(filePath);

    const handle = await open(filePath, fsConstants.O_RDONLY);
    try {
        const opened = await handle.stat({ bigint: true });

        const { real } = validatePathWithReal(filePath, inputBaseDir, 'input');
        if (inputBaseDir !== undefined && real !== undefined) {
            assertSameFile(opened, await stat(real, { bigint: true }), 'input image');
        }

        assertWithinByteCap(opened.size, maxFileBytes);

        return await handle.readFile();
    } finally {
        await handle.close();
    }
}
