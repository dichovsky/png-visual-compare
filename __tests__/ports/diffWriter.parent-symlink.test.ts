import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PathValidationError } from '../../src';
import { fsAsyncDiffWriter } from '../../src/ports/fsAsyncDiffWriter';
import { fsDiffWriter } from '../../src/ports/fsDiffWriter';
import type { ValidatedPath } from '../../src/types/validated-path';

const asValidated = (value: string) => value as ValidatedPath;

describe('diff writers refuse symlinked parent components (SECU-09)', () => {
    const rootDir = path.resolve('./test-results/diff-writer-parent-symlink');
    const baseDir = path.join(rootDir, 'allowed');
    const outsideDir = path.join(rootDir, 'outside');
    const data = Buffer.from('diff bytes');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
        mkdirSync(outsideDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('writes normally into a nested directory inside the boundary', () => {
        const target = path.join(baseDir, 'nested', 'deeper', 'diff.png');
        fsDiffWriter.write(asValidated(target), data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('writes normally with no boundary configured', () => {
        const target = path.join(baseDir, 'plain', 'diff.png');
        fsDiffWriter.write(asValidated(target), data);
        expect(readFileSync(target)).toEqual(data);
    });

    test('overwrites an existing diff file', () => {
        const target = path.join(baseDir, 'diff.png');
        writeFileSync(target, 'a much longer previous diff payload');
        fsDiffWriter.write(asValidated(target), data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('overwrites an existing empty diff file', () => {
        const target = path.join(baseDir, 'empty.png');
        writeFileSync(target, '');
        fsDiffWriter.write(asValidated(target), data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('overwrites an existing empty diff file asynchronously', async () => {
        const target = path.join(baseDir, 'empty-async.png');
        writeFileSync(target, '');
        await fsAsyncDiffWriter.write(asValidated(target), data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('refuses a symlinked parent and leaves the outside target untouched', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.
        const sentinel = path.join(outsideDir, 'diff.png');
        writeFileSync(sentinel, 'pre-existing content');
        symlinkSync(outsideDir, path.join(baseDir, 'escape'));

        const target = path.join(baseDir, 'escape', 'diff.png');
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
        expect(readFileSync(sentinel, 'utf8')).toBe('pre-existing content');
    });

    test('refuses a symlinked parent asynchronously and leaves the outside target untouched', async () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.
        const sentinel = path.join(outsideDir, 'diff.png');
        writeFileSync(sentinel, 'pre-existing content');
        symlinkSync(outsideDir, path.join(baseDir, 'escape'));

        const target = path.join(baseDir, 'escape', 'diff.png');
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
        expect(readFileSync(sentinel, 'utf8')).toBe('pre-existing content');
    });

    test('refuses a symlinked parent deeper in the chain', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.
        mkdirSync(path.join(baseDir, 'a'), { recursive: true });
        symlinkSync(outsideDir, path.join(baseDir, 'a', 'b'));

        const target = path.join(baseDir, 'a', 'b', 'c', 'diff.png');
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(/is a symlink/);
        expect(existsSync(path.join(outsideDir, 'c'))).toBe(false);
    });

    test('refuses a target directory outside the boundary', () => {
        const target = path.join(outsideDir, 'diff.png');
        expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(/outside the allowed directory/);
    });

    test('refuses a target directory outside the boundary asynchronously', async () => {
        const target = path.join(outsideDir, 'diff.png');
        await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(/outside the allowed directory/);
    });

    test('writes asynchronously into a nested directory inside the boundary', async () => {
        const target = path.join(baseDir, 'nested', 'diff.png');
        await fsAsyncDiffWriter.write(asValidated(target), data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('writes asynchronously with no boundary configured', async () => {
        const target = path.join(baseDir, 'plain-async', 'diff.png');
        await fsAsyncDiffWriter.write(asValidated(target), data);
        expect(readFileSync(target)).toEqual(data);
    });
});
