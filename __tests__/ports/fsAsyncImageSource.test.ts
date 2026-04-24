import { mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { describe, expect, test, vi } from 'vitest';
import { InvalidInputError, PathValidationError } from '../../src';
import { resolveOptions } from '../../src/pipeline/resolveOptions';
import { fsAsyncImageSource } from '../../src/ports/fsAsyncImageSource';

function createPngBuffer(width: number, height: number): Buffer {
    const png = new PNG({ width, height, fill: true });
    png.data.fill(255);
    return PNG.sync.write(png);
}

describe('fsAsyncImageSource', () => {
    const rootDir = path.resolve('./test-results/fs-async-image-source');
    const validPath = path.join(rootDir, 'valid.png');
    const invalidPath = path.join(rootDir, 'invalid.png');
    const directoryPath = path.join(rootDir, 'directory');

    test('loads a valid buffer source directly', async () => {
        const result = await fsAsyncImageSource.load(createPngBuffer(1, 1), resolveOptions({}));

        expect(result.kind).toBe('valid');
    });

    test('returns an invalid path result when validation fails and throwing is disabled', async () => {
        const result = await fsAsyncImageSource.load('/tmp/evil\0.png', resolveOptions({ throwErrorOnInvalidInputData: false }));

        expect(result).toEqual({ kind: 'invalid', reason: 'path' });
    });

    test('rethrows path validation errors when throwing is enabled', async () => {
        await expect(fsAsyncImageSource.load('/tmp/evil\0.png', resolveOptions({}))).rejects.toBeInstanceOf(PathValidationError);
    });

    test('maps invalid decoded files to InvalidInputError when throwing is enabled', async () => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(rootDir, { recursive: true });
        writeFileSync(invalidPath, 'not-a-png');

        await expect(fsAsyncImageSource.load(invalidPath, resolveOptions({}))).rejects.toThrow(InvalidInputError);
    });

    test('preserves zero-dimension InvalidInputError for string-path sources', async () => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(rootDir, { recursive: true });
        writeFileSync(validPath, createPngBuffer(1, 1));
        const readSpy = vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => new PNG({ width: 0, height: 0 }));

        try {
            await expect(fsAsyncImageSource.load(validPath, resolveOptions({}))).rejects.toThrow(
                'Invalid PNG input: image has zero dimensions',
            );
        } finally {
            readSpy.mockRestore();
        }
    });

    test('returns invalid decode results when throwing is disabled', async () => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(rootDir, { recursive: true });
        writeFileSync(invalidPath, 'not-a-png');

        const result = await fsAsyncImageSource.load(invalidPath, resolveOptions({ throwErrorOnInvalidInputData: false }));

        expect(result).toEqual({ kind: 'invalid', reason: 'decode' });
    });

    test('maps unexpected readFile errors to InvalidInputError when throwing is enabled', async () => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(directoryPath, { recursive: true });

        await expect(fsAsyncImageSource.load(directoryPath, resolveOptions({}))).rejects.toThrow(InvalidInputError);
    });

    test('maps unexpected readFile errors to invalid path results when throwing is disabled', async () => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(directoryPath, { recursive: true });

        const result = await fsAsyncImageSource.load(directoryPath, resolveOptions({ throwErrorOnInvalidInputData: false }));

        expect(result).toEqual({ kind: 'invalid', reason: 'path' });
    });

    test('maps unreadable source paths to invalid path results when throwing is disabled', async () => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(rootDir, { recursive: true });
        writeFileSync(validPath, createPngBuffer(1, 1));

        const result = await fsAsyncImageSource.load(
            path.join(validPath, 'child.png'),
            resolveOptions({ throwErrorOnInvalidInputData: false }),
        );

        expect(result).toEqual({ kind: 'invalid', reason: 'path' });
    });
});
