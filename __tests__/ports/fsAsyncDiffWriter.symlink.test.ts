import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PathValidationError } from '../../src';
import { fsAsyncDiffWriter } from '../../src/ports/fsAsyncDiffWriter';
import type { ValidatedPath } from '../../src/types/validated-path';

function asValidatedPath(p: string): ValidatedPath {
    return p as unknown as ValidatedPath;
}

describe('fsAsyncDiffWriter symlink refusal (SECU-03)', () => {
    const rootDir = path.resolve('./test-results/fs-async-diff-writer-symlink');
    const target = path.join(rootDir, 'diff.png');
    const sentinel = path.join(rootDir, 'sentinel.txt');
    const sentinelDir = path.join(rootDir, 'sentinel-dir');
    const payload = Buffer.from('PNG-PAYLOAD-BYTES');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(rootDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('writes a new file when the target does not exist', async () => {
        await fsAsyncDiffWriter.write(asValidatedPath(target), payload);
        expect(readFileSync(target)).toEqual(payload);
    });

    test('overwrites an existing regular file (overwrite contract preserved)', async () => {
        writeFileSync(target, 'stale-bytes');
        await fsAsyncDiffWriter.write(asValidatedPath(target), payload);
        expect(readFileSync(target)).toEqual(payload);
    });

    test('refuses to write when the target is a symlink to a non-existent file', async () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        const dangling = path.join(rootDir, 'dangling.txt');
        symlinkSync(dangling, target);

        await expect(fsAsyncDiffWriter.write(asValidatedPath(target), payload)).rejects.toBeInstanceOf(PathValidationError);
        expect(existsSync(dangling)).toBe(false);
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
    });

    test('refuses to write when the target is a symlink to an existing file; sentinel is preserved byte-for-byte', async () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        writeFileSync(sentinel, 'sentinel-bytes');
        symlinkSync(sentinel, target);

        await expect(fsAsyncDiffWriter.write(asValidatedPath(target), payload)).rejects.toBeInstanceOf(PathValidationError);
        expect(readFileSync(sentinel).toString()).toBe('sentinel-bytes');
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
    });

    test('refuses to write when the target is a symlink to a directory', async () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        mkdirSync(sentinelDir);
        symlinkSync(sentinelDir, target);

        await expect(fsAsyncDiffWriter.write(asValidatedPath(target), payload)).rejects.toBeInstanceOf(PathValidationError);
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
    });

    test('propagates non-symlink open errors raw (e.g. EISDIR when target is a real directory)', async () => {
        const dirTarget = path.join(rootDir, 'is-a-directory');
        mkdirSync(dirTarget);

        await expect(fsAsyncDiffWriter.write(asValidatedPath(dirTarget), payload)).rejects.toMatchObject({ code: 'EISDIR' });
        await expect(fsAsyncDiffWriter.write(asValidatedPath(dirTarget), payload)).rejects.not.toBeInstanceOf(PathValidationError);
    });

    test('wraps the symlink refusal in PathValidationError with a recognisable message', async () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        const forbidden = path.join(rootDir, 'forbidden.txt');
        symlinkSync(forbidden, target);

        await expect(fsAsyncDiffWriter.write(asValidatedPath(target), payload)).rejects.toThrow(/symlink/);
        expect(existsSync(forbidden)).toBe(false);
    });
});
