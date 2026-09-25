import { Buffer } from 'node:buffer';
import { closeSync, constants as fsConstants, fstatSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ResourceLimitError } from './errors';
import { assertSameFile } from './internal/assertSameFile';
import { assertLexicalContainment, assertPathSyntax, validatePathWithReal } from './validatePath';

/** Read size once the stat size hint is used up (a growing file, a FIFO, a device). */
const READ_CHUNK_BYTES = 64 * 1024;

function hasByteCap(maxFileBytes: number | undefined): maxFileBytes is number {
    return maxFileBytes !== undefined && maxFileBytes !== Infinity;
}

function assertWithinByteCap(size: bigint, maxFileBytes: number | undefined): void {
    if (!hasByteCap(maxFileBytes)) {
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
 * Reads the handle to EOF, enforcing `maxFileBytes` on the bytes actually read.
 *
 * The fstat size checked beforehand is only a hint: a file can grow between the stat
 * and the read, and a FIFO or device reports 0. The first read asks for one byte more
 * than the hint, so a file that matches its stat size costs one read plus the EOF
 * probe and comes back without a copy.
 */
function readCappedSync(fd: number, sizeHint: bigint, maxFileBytes: number): Buffer {
    const chunks: Buffer[] = [];
    let total = 0;
    let chunkSize = Number(sizeHint) + 1;
    for (;;) {
        const chunk = Buffer.allocUnsafe(chunkSize);
        const bytesRead = readSync(fd, chunk, 0, chunkSize, null);
        if (bytesRead === 0) {
            return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total);
        }
        total += bytesRead;
        assertWithinByteCap(BigInt(total), maxFileBytes);
        chunks.push(chunk.subarray(0, bytesRead));
        chunkSize = READ_CHUNK_BYTES;
    }
}

/** Asynchronous twin of {@link readCappedSync}. */
async function readCapped(handle: FileHandle, sizeHint: bigint, maxFileBytes: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let total = 0;
    let chunkSize = Number(sizeHint) + 1;
    for (;;) {
        const chunk = Buffer.allocUnsafe(chunkSize);
        const { bytesRead } = await handle.read(chunk, 0, chunkSize, null);
        if (bytesRead === 0) {
            return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, total);
        }
        total += bytesRead;
        assertWithinByteCap(BigInt(total), maxFileBytes);
        chunks.push(chunk.subarray(0, bytesRead));
        chunkSize = READ_CHUNK_BYTES;
    }
}

/**
 * Reads a file through a handle that is pinned before validation runs, so the
 * bytes returned provably come from the inode that path validation approved.
 *
 * The sequence is deliberate:
 *
 * 1. Filesystem-free checks: path syntax, and — when a boundary was requested —
 *    lexical containment. A path outside `inputBaseDir` must fail as containment
 *    before the open can tell whether it exists, or block on a FIFO; otherwise the
 *    open's own ENOENT would be an existence oracle for files outside the boundary.
 * 2. `open` the lexically resolved path — the one validation approves, and the one
 *    6.3.0 read. The raw string could name a different file when `..` follows a
 *    symlinked directory, because the kernel resolves `..` after the link. The open
 *    pins one inode for the rest of the call — every later step describes *that*
 *    file, not whatever the path happens to point at now.
 * 3. `fstat` on the handle, for the size and identity used below.
 * 4. `validatePathWithReal` for the symlink-resolved containment check.
 * 5. When a boundary was requested, compare the handle's identity against the
 *    canonical path containment was proven against (SECU-05). Skipped without
 *    `inputBaseDir`, because `validatePath` consults no filesystem in that case
 *    and there is no boundary a swap could cross — running it anyway would buy
 *    nothing while exposing every default caller to a false positive from a
 *    benign atomic-rename baseline update.
 * 6. Only now, the `maxFileBytes` cap against the stat size — still before a single
 *    byte is read, which is the point of SECU-04, but deliberately *after*
 *    containment. The cap's error names an exact byte count and escapes even in
 *    permissive mode, so running it first would tell a caller the size of a file
 *    outside `inputBaseDir`.
 * 7. Read from the handle, never from the path string again, holding the cap
 *    against the bytes actually read — the stat size is only a hint.
 *
 * @param filePath     - Path to read.
 * @param inputBaseDir - Optional containment boundary; enables the containment and identity checks.
 * @param maxFileBytes - Optional byte cap; `Infinity` or `undefined` disables it.
 * @returns The file contents.
 * @throws {ResourceLimitError} If the file exceeds `maxFileBytes`.
 * @throws {PathValidationError} If validation fails, or the path changed mid-flight.
 */
export function readValidatedFileSync(filePath: string, inputBaseDir?: string, maxFileBytes?: number): Buffer {
    // Filesystem-free checks run before the open: a malformed path fails as a
    // PathValidationError rather than as the runtime's own TypeError, and a path
    // outside the boundary fails as containment whatever is (or is not) there.
    assertPathSyntax(filePath);
    if (inputBaseDir !== undefined) {
        assertLexicalContainment(filePath, inputBaseDir);
    }

    const fd = openSync(resolve(filePath), fsConstants.O_RDONLY);
    try {
        const opened = fstatSync(fd, { bigint: true });

        const { real } = validatePathWithReal(filePath, inputBaseDir, 'input');
        if (inputBaseDir !== undefined && real !== undefined) {
            assertSameFile(opened, statSync(real, { bigint: true }), 'input image');
        }

        assertWithinByteCap(opened.size, maxFileBytes);

        return hasByteCap(maxFileBytes) ? readCappedSync(fd, opened.size, maxFileBytes) : readFileSync(fd);
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
    if (inputBaseDir !== undefined) {
        assertLexicalContainment(filePath, inputBaseDir);
    }

    const handle = await open(resolve(filePath), fsConstants.O_RDONLY);
    try {
        const opened = await handle.stat({ bigint: true });

        const { real } = validatePathWithReal(filePath, inputBaseDir, 'input');
        if (inputBaseDir !== undefined && real !== undefined) {
            assertSameFile(opened, await stat(real, { bigint: true }), 'input image');
        }

        assertWithinByteCap(opened.size, maxFileBytes);

        return hasByteCap(maxFileBytes) ? await readCapped(handle, opened.size, maxFileBytes) : await handle.readFile();
    } finally {
        await handle.close();
    }
}
