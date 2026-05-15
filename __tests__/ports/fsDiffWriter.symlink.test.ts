import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PathValidationError } from '../../src';
import { fsDiffWriter } from '../../src/ports/fsDiffWriter';
import type { ValidatedPath } from '../../src/types/validated-path';

function asValidatedPath(p: string): ValidatedPath {
    return p as unknown as ValidatedPath;
}

describe('fsDiffWriter symlink refusal (SECU-03)', () => {
    const rootDir = path.resolve('./test-results/fs-diff-writer-symlink');
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

    test('writes a new file when the target does not exist', () => {
        fsDiffWriter.write(asValidatedPath(target), payload);
        expect(readFileSync(target)).toEqual(payload);
    });

    test('overwrites an existing regular file (overwrite contract preserved)', () => {
        writeFileSync(target, 'stale-bytes');
        fsDiffWriter.write(asValidatedPath(target), payload);
        expect(readFileSync(target)).toEqual(payload);
    });

    test('refuses to write when the target is a symlink to a non-existent file', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        const dangling = path.join(rootDir, 'dangling.txt');
        symlinkSync(dangling, target);

        expect(() => fsDiffWriter.write(asValidatedPath(target), payload)).toThrow(PathValidationError);
        expect(existsSync(dangling)).toBe(false);
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
    });

    test('refuses to write when the target is a symlink to an existing file; sentinel is preserved byte-for-byte', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        writeFileSync(sentinel, 'sentinel-bytes');
        symlinkSync(sentinel, target);

        expect(() => fsDiffWriter.write(asValidatedPath(target), payload)).toThrow(PathValidationError);
        expect(readFileSync(sentinel).toString()).toBe('sentinel-bytes');
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
    });

    test('refuses to write when the target is a symlink to a directory', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        mkdirSync(sentinelDir);
        symlinkSync(sentinelDir, target);

        expect(() => fsDiffWriter.write(asValidatedPath(target), payload)).toThrow(PathValidationError);
        expect(lstatSync(target).isSymbolicLink()).toBe(true);
    });

    test('propagates non-symlink open errors raw (e.g. EISDIR when target is a real directory)', () => {
        const dirTarget = path.join(rootDir, 'is-a-directory');
        mkdirSync(dirTarget);

        try {
            fsDiffWriter.write(asValidatedPath(dirTarget), payload);
            throw new Error('Expected fsDiffWriter.write to throw');
        } catch (error) {
            expect(error).not.toBeInstanceOf(PathValidationError);
            expect((error as NodeJS.ErrnoException).code).toBe('EISDIR');
        }
    });

    test('wraps the symlink refusal in PathValidationError with a recognisable message', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        const forbidden = path.join(rootDir, 'forbidden.txt');
        symlinkSync(forbidden, target);

        try {
            fsDiffWriter.write(asValidatedPath(target), payload);
            throw new Error('Expected fsDiffWriter.write to throw PathValidationError');
        } catch (error) {
            expect(error).toBeInstanceOf(PathValidationError);
            expect((error as Error).message).toContain('symlink');
        }

        expect(existsSync(forbidden)).toBe(false);
    });
});
