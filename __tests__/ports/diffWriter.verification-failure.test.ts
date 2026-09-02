import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

    test('refuses the write and removes the file it created', () => {
        const target = path.join(baseDir, 'diff.png');
        stubMismatchedIdentity();
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(existsSync(target)).toBe(false);
    });

    test('refuses the write asynchronously and removes the file it created', async () => {
        const target = path.join(baseDir, 'diff.png');
        stubMismatchedIdentity();
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(existsSync(target)).toBe(false);
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
        // O_CREAT alone cannot distinguish "created empty" from "already existed empty".
        // A zero-length placeholder or lock file this write did not create must survive
        // a refusal, so creation has to be established by O_EXCL rather than inferred
        // from the byte length.
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

    test('removes a file it created when verification fails', () => {
        const target = path.join(baseDir, 'created.png');
        stubMismatchedIdentity();
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(existsSync(target)).toBe(false);
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
