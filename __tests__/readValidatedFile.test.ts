import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PathValidationError, ResourceLimitError } from '../src';
import { readValidatedFile, readValidatedFileSync } from '../src/readValidatedFile';

describe('readValidatedFile', () => {
    const rootDir = path.resolve('./test-results/read-validated-file');
    const baseDir = path.join(rootDir, 'base');
    const filePath = path.join(baseDir, 'image.png');
    const contents = Buffer.from('some file contents');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
        writeFileSync(filePath, contents);
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('reads a contained file', () => {
        expect(readValidatedFileSync(filePath, baseDir)).toEqual(contents);
    });

    test('reads a file with no base directory and no byte cap', () => {
        expect(readValidatedFileSync(filePath)).toEqual(contents);
    });

    test('reads asynchronously with the same contract', async () => {
        await expect(readValidatedFile(filePath, baseDir)).resolves.toEqual(contents);
    });

    test('rejects a malformed path before touching the filesystem', () => {
        expect(() => readValidatedFileSync('/tmp/evil\0.png')).toThrow(PathValidationError);
        expect(() => readValidatedFileSync('   ')).toThrow(/empty or whitespace only/);
    });

    test('rejects a malformed path asynchronously too', async () => {
        await expect(readValidatedFile('/tmp/evil\0.png')).rejects.toThrow(PathValidationError);
    });

    test('throws ResourceLimitError when the file exceeds maxFileBytes', () => {
        expect(() => readValidatedFileSync(filePath, baseDir, contents.length - 1)).toThrow(ResourceLimitError);
        expect(() => readValidatedFileSync(filePath, baseDir, contents.length - 1)).toThrow(/exceeds the maximum allowed/);
    });

    test('throws ResourceLimitError asynchronously when the file exceeds maxFileBytes', async () => {
        await expect(readValidatedFile(filePath, baseDir, contents.length - 1)).rejects.toThrow(ResourceLimitError);
    });

    test('accepts a file exactly at the byte cap', () => {
        expect(readValidatedFileSync(filePath, baseDir, contents.length)).toEqual(contents);
    });

    test('treats Infinity as no byte cap', () => {
        expect(readValidatedFileSync(filePath, baseDir, Infinity)).toEqual(contents);
    });

    test('enforces the byte cap even with no base directory', () => {
        expect(() => readValidatedFileSync(filePath, undefined, 1)).toThrow(ResourceLimitError);
    });

    test('follows a symlink whose target stays inside the base directory', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.
        const linkPath = path.join(baseDir, 'link.png');
        symlinkSync(filePath, linkPath);
        expect(readValidatedFileSync(linkPath, baseDir)).toEqual(contents);
    });

    test('refuses a symlink whose target escapes the base directory', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.
        const outside = path.join(rootDir, 'outside.png');
        writeFileSync(outside, 'secret');
        const linkPath = path.join(baseDir, 'escape.png');
        symlinkSync(outside, linkPath);
        expect(() => readValidatedFileSync(linkPath, baseDir)).toThrow(PathValidationError);
    });

    test('reports containment failure, not file size, for an oversized file outside the boundary', () => {
        // The byte cap throws ResourceLimitError naming an exact size, and that error
        // escapes even in permissive mode. Were it checked before containment, a caller
        // would learn the existence and size of a file outside inputBaseDir.
        const outside = path.join(rootDir, 'outside-large.png');
        writeFileSync(outside, Buffer.alloc(2048));

        expect(() => readValidatedFileSync(outside, baseDir, 1)).toThrow(PathValidationError);
        expect(() => readValidatedFileSync(outside, baseDir, 1)).not.toThrow(ResourceLimitError);
    });

    test('reports containment failure asynchronously too', async () => {
        const outside = path.join(rootDir, 'outside-large.png');
        writeFileSync(outside, Buffer.alloc(2048));

        await expect(readValidatedFile(outside, baseDir, 1)).rejects.toThrow(PathValidationError);
    });

    test('still enforces the byte cap for a file inside the boundary', () => {
        expect(() => readValidatedFileSync(filePath, baseDir, 1)).toThrow(ResourceLimitError);
    });

    test('propagates a missing file as a filesystem error', () => {
        expect(() => readValidatedFileSync(path.join(baseDir, 'missing.png'), baseDir)).toThrow(
            expect.objectContaining({ code: 'ENOENT' }),
        );
    });
});
