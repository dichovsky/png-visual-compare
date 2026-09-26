import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Spread the original modules into plain objects so vi.spyOn can redefine their
// properties. ESM module namespaces are non-configurable by default.
vi.mock('node:fs', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs')>()) }));
vi.mock('node:fs/promises', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs/promises')>()) }));

import * as nodeFs from 'node:fs';
import * as nodeFsPromises from 'node:fs/promises';
import { PathValidationError } from '../../src';
import { fsAsyncDiffWriter } from '../../src/ports/fsAsyncDiffWriter';
import { fsDiffWriter } from '../../src/ports/fsDiffWriter';
import type { ValidatedPath } from '../../src/types/validated-path';

const asValidated = (value: string) => value as ValidatedPath;

/**
 * A real race cannot be staged deterministically, so the swap is injected: the
 * verification stat reports a different inode than the handle that was opened,
 * which is exactly what a mid-flight path swap looks like to the writer.
 */
function stubMismatchedIdentity(): void {
    const mismatched = { dev: 99n, ino: 12345n };
    // The sync writer stats through node:fs, the async one through node:fs/promises.
    vi.spyOn(nodeFs, 'statSync').mockImplementationOnce(() => mismatched as unknown as nodeFs.Stats);
    vi.spyOn(nodeFsPromises, 'stat').mockImplementationOnce(
        async () => mismatched as unknown as Awaited<ReturnType<typeof nodeFsPromises.stat>>,
    );
}

describe('diff writers on failed handle verification', () => {
    const rootDir = path.resolve('./test-results/diff-writer-verification');
    const baseDir = path.join(rootDir, 'allowed');
    const data = Buffer.from('diff bytes');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('refuses the write and preserves a replacement file', () => {
        const target = path.join(baseDir, 'diff.png');
        const moved = path.join(baseDir, 'moved.png');
        const realOpenSync = nodeFs.openSync;
        vi.spyOn(nodeFs, 'openSync').mockImplementationOnce((...args: Parameters<typeof nodeFs.openSync>) => {
            const fd = realOpenSync(...args);
            renameSync(target, moved);
            writeFileSync(target, 'replacement payload');
            return fd;
        });

        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(readFileSync(target, 'utf8')).toBe('replacement payload');
        expect(readFileSync(moved)).toHaveLength(0);
    });

    test('refuses the write asynchronously and preserves a replacement file', async () => {
        const target = path.join(baseDir, 'diff.png');
        const moved = path.join(baseDir, 'moved.png');
        const realOpen = nodeFsPromises.open;
        vi.spyOn(nodeFsPromises, 'open').mockImplementationOnce(async (...args: Parameters<typeof nodeFsPromises.open>) => {
            const handle = await realOpen(...args);
            renameSync(target, moved);
            writeFileSync(target, 'replacement payload');
            return handle;
        });

        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(readFileSync(target, 'utf8')).toBe('replacement payload');
        expect(readFileSync(moved)).toHaveLength(0);
    });

    test('preserves an outside file when the parent is redirected after open', () => {
        const subDir = path.join(baseDir, 'nested');
        const outsideDir = path.join(rootDir, 'outside');
        const target = path.join(subDir, 'diff.png');
        const outside = path.join(outsideDir, 'diff.png');
        mkdirSync(subDir);
        mkdirSync(outsideDir);
        writeFileSync(outside, 'outside payload');
        const realOpenSync = nodeFs.openSync;
        vi.spyOn(nodeFs, 'openSync').mockImplementationOnce((...args: Parameters<typeof nodeFs.openSync>) => {
            const fd = realOpenSync(...args);
            renameSync(subDir, `${subDir}-moved`);
            symlinkSync(outsideDir, subDir);
            return fd;
        });

        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(readFileSync(outside, 'utf8')).toBe('outside payload');
        expect(readFileSync(path.join(`${subDir}-moved`, 'diff.png'))).toHaveLength(0);
    });

    test('preserves an outside file asynchronously when the parent is redirected after open', async () => {
        const subDir = path.join(baseDir, 'nested');
        const outsideDir = path.join(rootDir, 'outside');
        const target = path.join(subDir, 'diff.png');
        const outside = path.join(outsideDir, 'diff.png');
        mkdirSync(subDir);
        mkdirSync(outsideDir);
        writeFileSync(outside, 'outside payload');
        const realOpen = nodeFsPromises.open;
        vi.spyOn(nodeFsPromises, 'open').mockImplementationOnce(async (...args: Parameters<typeof nodeFsPromises.open>) => {
            const handle = await realOpen(...args);
            renameSync(subDir, `${subDir}-moved`);
            symlinkSync(outsideDir, subDir);
            return handle;
        });

        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(readFileSync(outside, 'utf8')).toBe('outside payload');
        expect(readFileSync(path.join(`${subDir}-moved`, 'diff.png'))).toHaveLength(0);
    });

    test('preserves a replacement file after verification succeeds and writing fails', () => {
        const target = path.join(baseDir, 'diff.png');
        const failure = new Error('write failed');
        const realWriteFileSync = nodeFs.writeFileSync;
        const close = vi.spyOn(nodeFs, 'closeSync');
        vi.spyOn(nodeFs, 'writeFileSync').mockImplementationOnce(() => {
            renameSync(target, path.join(baseDir, 'moved.png'));
            realWriteFileSync(target, 'replacement payload');
            throw failure;
        });

        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(failure);
        expect(readFileSync(target, 'utf8')).toBe('replacement payload');
        expect(close).toHaveBeenCalledOnce();
    });

    test('preserves a replacement file asynchronously after verification succeeds and writing fails', async () => {
        const target = path.join(baseDir, 'diff.png');
        const failure = new Error('write failed');
        const realOpen = nodeFsPromises.open;
        let handle: Awaited<ReturnType<typeof realOpen>>;
        vi.spyOn(nodeFsPromises, 'open').mockImplementationOnce(async (...args: Parameters<typeof nodeFsPromises.open>) => {
            handle = await realOpen(...args);
            vi.spyOn(handle, 'writeFile').mockImplementationOnce(async () => {
                renameSync(target, path.join(baseDir, 'moved.png'));
                writeFileSync(target, 'replacement payload');
                throw failure;
            });
            return handle;
        });

        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(failure);
        expect(readFileSync(target, 'utf8')).toBe('replacement payload');
        await expect(handle!.stat()).rejects.toMatchObject({ code: 'EBADF' });
    });

    test('leaves a pre-existing non-empty file intact', () => {
        const target = path.join(baseDir, 'diff.png');
        writeFileSync(target, 'previous diff payload');
        stubMismatchedIdentity();
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(readFileSync(target, 'utf8')).toBe('previous diff payload');
    });

    test('leaves a pre-existing non-empty file intact asynchronously', async () => {
        const target = path.join(baseDir, 'diff.png');
        writeFileSync(target, 'previous diff payload');
        stubMismatchedIdentity();
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(readFileSync(target, 'utf8')).toBe('previous diff payload');
    });

    test('leaves a pre-existing empty file intact', () => {
        // A zero-length placeholder or lock file must survive a refusal too.
        const target = path.join(baseDir, 'diff.png');
        writeFileSync(target, '');
        stubMismatchedIdentity();
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(existsSync(target)).toBe(true);
    });

    test('leaves a pre-existing empty file intact asynchronously', async () => {
        const target = path.join(baseDir, 'diff.png');
        writeFileSync(target, '');
        stubMismatchedIdentity();
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(existsSync(target)).toBe(true);
    });

    test('leaves an empty file when its identity cannot be verified', () => {
        const target = path.join(baseDir, 'created.png');
        stubMismatchedIdentity();
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(readFileSync(target)).toHaveLength(0);
    });

    test('leaves an empty file asynchronously when its identity cannot be verified', async () => {
        const target = path.join(baseDir, 'created.png');
        stubMismatchedIdentity();
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(readFileSync(target)).toHaveLength(0);
    });

    test('refuses when the directory resolves outside the boundary', () => {
        const target = path.join(baseDir, 'diff.png');
        // The component walk sees a clean path; re-resolving it before the open is what
        // catches a parent that became a symlink after the walk, and it does so before
        // anything is created. Injected, because a real race cannot be staged
        // deterministically.
        const realNative = nodeFs.realpathSync.native;
        let calls = 0;
        vi.spyOn(nodeFs.realpathSync, 'native').mockImplementation(((target_: string) => {
            calls += 1;
            return calls === 2 ? path.join(rootDir, 'elsewhere') : realNative(target_);
        }) as typeof nodeFs.realpathSync.native);

        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(/outside the allowed directory/);
        expect(existsSync(target)).toBe(false);
    });

    test('propagates an open failure that is not a pre-existing target', () => {
        // With O_EXCL a symlink at the target reports EEXIST, so this branch covers the
        // genuinely unexpected open failures — a permission denial, for instance.
        const target = path.join(baseDir, 'diff.png');
        vi.spyOn(nodeFs, 'openSync').mockImplementationOnce(() => {
            throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
        });
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(/EACCES/);
    });

    test('propagates an open failure that is not a pre-existing target asynchronously', async () => {
        const target = path.join(baseDir, 'diff.png');
        vi.spyOn(nodeFsPromises, 'open').mockImplementationOnce(() => {
            throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
        });
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(/EACCES/);
    });

    test('rethrows a non-ENOENT error raised while inspecting a parent component', () => {
        const target = path.join(baseDir, 'nested', 'diff.png');
        vi.spyOn(nodeFs, 'lstatSync').mockImplementationOnce(() => {
            throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
        });
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(/EACCES/);
    });

    test('rethrows a non-ENOENT error raised while inspecting a parent component asynchronously', async () => {
        const target = path.join(baseDir, 'nested', 'diff.png');
        vi.spyOn(nodeFsPromises, 'lstat').mockImplementationOnce(() => {
            throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
        });
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(/EACCES/);
    });
});
