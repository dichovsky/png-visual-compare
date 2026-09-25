import { mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Spread the original modules into plain objects so vi.spyOn can redefine their
// properties. ESM module namespaces are non-configurable by default.
vi.mock('node:fs', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs')>()) }));
vi.mock('node:fs/promises', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs/promises')>()) }));

import * as nodeFs from 'node:fs';
import * as nodeFsPromises from 'node:fs/promises';
import { PathValidationError, ResourceLimitError } from '../src';
import { readValidatedFile, readValidatedFileSync } from '../src/readValidatedFile';

type FileHandle = nodeFsPromises.FileHandle;

/** Wraps the next fs/promises `open` so the test can act on the real handle it returns. */
function onNextAsyncOpen(inspect: (handle: FileHandle) => void): void {
    const realOpen = nodeFsPromises.open;
    vi.spyOn(nodeFsPromises, 'open').mockImplementationOnce(async (...args: Parameters<typeof nodeFsPromises.open>) => {
        const handle = await realOpen(...args);
        inspect(handle);
        return handle;
    });
}

describe('readValidatedFile under injected races', () => {
    const rootDir = path.resolve('./test-results/read-validated-file-races');
    const baseDir = path.join(rootDir, 'base');
    const inside = path.join(baseDir, 'inside.png');
    const secret = path.join(rootDir, 'secret.png');
    const link = path.join(baseDir, 'image.png');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
        writeFileSync(inside, 'inside bytes');
        writeFileSync(secret, 'outside secret');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(rootDir, { recursive: true, force: true });
    });

    // The link points outside when the file is opened and is retargeted inside before
    // validation runs, so validation approves the inside file while the handle holds
    // the secret. Only the identity check between the two can notice (SECU-05).
    function retargetLinkInside(): void {
        unlinkSync(link);
        symlinkSync(inside, link);
    }

    test('refuses a handle that is not the file validation approved (SECU-05)', () => {
        symlinkSync(secret, link);
        const realOpenSync = nodeFs.openSync;
        vi.spyOn(nodeFs, 'openSync').mockImplementationOnce((...args: Parameters<typeof nodeFs.openSync>) => {
            const fd = realOpenSync(...args);
            retargetLinkInside();
            return fd;
        });

        expect(() => readValidatedFileSync(link, baseDir)).toThrow(/changed between validation and access/);
    });

    test('refuses a handle that is not the file validation approved asynchronously (SECU-05)', async () => {
        symlinkSync(secret, link);
        onNextAsyncOpen(() => retargetLinkInside());

        await expect(readValidatedFile(link, baseDir)).rejects.toThrow(/changed between validation and access/);
    });

    test('never opens a path outside the boundary', async () => {
        const openSync = vi.spyOn(nodeFs, 'openSync');
        const open = vi.spyOn(nodeFsPromises, 'open');

        expect(() => readValidatedFileSync(secret, baseDir)).toThrow(PathValidationError);
        await expect(readValidatedFile(secret, baseDir)).rejects.toThrow(PathValidationError);
        expect(openSync).not.toHaveBeenCalled();
        expect(open).not.toHaveBeenCalled();
    });

    test('checks the byte cap before reading a single byte (SECU-04)', () => {
        const readSync = vi.spyOn(nodeFs, 'readSync');
        const readFileSync = vi.spyOn(nodeFs, 'readFileSync');

        expect(() => readValidatedFileSync(inside, baseDir, 1)).toThrow(ResourceLimitError);
        expect(readSync).not.toHaveBeenCalled();
        expect(readFileSync).not.toHaveBeenCalled();
    });

    test('checks the byte cap before reading a single byte asynchronously (SECU-04)', async () => {
        let handle: FileHandle | undefined;
        onNextAsyncOpen((opened) => {
            handle = opened;
            vi.spyOn(opened, 'read');
            vi.spyOn(opened, 'readFile');
        });

        await expect(readValidatedFile(inside, baseDir, 1)).rejects.toThrow(ResourceLimitError);
        expect(handle?.read).not.toHaveBeenCalled();
        expect(handle?.readFile).not.toHaveBeenCalled();
    });

    describe('when the stat size understates the file (growth mid-read, FIFO, device)', () => {
        // The cap must hold for the bytes actually read: a stat size of 0 is what a FIFO
        // or character device reports, and what a file that grows after the fstat looks like.
        const understated = { size: 0n } as unknown as nodeFs.BigIntStats;
        const large = Buffer.alloc(200 * 1024, 7);

        beforeEach(() => {
            writeFileSync(inside, large);
        });

        test('throws once the bytes read exceed the cap', () => {
            vi.spyOn(nodeFs, 'fstatSync').mockImplementationOnce(() => understated);
            expect(() => readValidatedFileSync(inside, undefined, large.length - 1)).toThrow(ResourceLimitError);
        });

        test('throws once the bytes read exceed the cap asynchronously', async () => {
            onNextAsyncOpen((opened) => vi.spyOn(opened, 'stat').mockResolvedValueOnce(understated));
            await expect(readValidatedFile(inside, undefined, large.length - 1)).rejects.toThrow(ResourceLimitError);
        });

        test('reads the whole file when it stays within the cap', () => {
            vi.spyOn(nodeFs, 'fstatSync').mockImplementationOnce(() => understated);
            expect(readValidatedFileSync(inside, undefined, large.length)).toEqual(large);
        });

        test('reads the whole file asynchronously when it stays within the cap', async () => {
            onNextAsyncOpen((opened) => vi.spyOn(opened, 'stat').mockResolvedValueOnce(understated));
            await expect(readValidatedFile(inside, undefined, large.length)).resolves.toEqual(large);
        });
    });
});
