import { expect, it, vi } from 'vitest';

// Spread the original module into a plain object so vi.spyOn can redefine its properties.
// ESM module namespaces are non-configurable by default, which prevents spying.
vi.mock('node:fs', async (importOriginal) => {
    const mod = await importOriginal<typeof import('node:fs')>();
    return { ...mod };
});

import * as nodeFs from 'node:fs';
import { PNG } from 'pngjs';
import { getPngData } from '../src/getPngData';

it('should throw with fallback error detail when the caught value is not an Error instance', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => {
        throw 'non-error string';
    });
    expect(() => getPngData('/any/path.png', true)).toThrow('Invalid PNG input: the source could not be loaded');
});

it('should throw with fallback error detail when PNG parsing throws a non-Error value', () => {
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw 'non-error string';
    });
    expect(() => getPngData(Buffer.from('not-a-real-png'), true)).toThrow('Invalid PNG input: the data could not be parsed');
});

// Cover the string-path parse-failure branch (file exists but is not a valid PNG).
// readFileSync is left real; only PNG.sync.read is mocked to simulate a corrupt file.
it('should throw the unified message when a string-path file exists but PNG parse fails (throwError=true)', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => Buffer.from('fake png bytes'));
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('Invalid PNG signature');
    });
    expect(() => getPngData('/any/valid-path.png', true)).toThrow('Invalid PNG input: the source could not be loaded');
});

it('should return invalidPng when a string-path file exists but PNG parse fails (throwError=false)', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => Buffer.from('fake png bytes'));
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('Invalid PNG signature');
    });
    const result = getPngData('/any/valid-path.png', false);
    expect(result.isValid).toBe(false);
    expect(result.png.width).toBe(0);
    expect(result.png.height).toBe(0);
});

// Cover peekPngDimensions return-null branches (lines 21-22 of getPngData.ts).
// assertDimensions is only invoked when maxDimension is passed; inside it,
// peekPngDimensions returns null for the two cases below, so no dimension
// error is thrown and execution falls through to PNG.sync.read.

it('should not throw a dimension error when the buffer is shorter than 24 bytes (peekPngDimensions line 21)', () => {
    // 10-byte buffer — too short to contain a full IHDR, so peekPngDimensions returns null.
    const shortBuffer = Buffer.alloc(10);
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('not a png');
    });
    expect(() => getPngData(shortBuffer, true, 100)).toThrow('Invalid PNG input: the data could not be parsed');
});

it('should not throw a dimension error when the buffer has an invalid PNG signature (peekPngDimensions line 22)', () => {
    // 24-byte buffer of zeros — long enough for an IHDR peek but the signature is wrong.
    const wrongSigBuffer = Buffer.alloc(24, 0);
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('not a png');
    });
    expect(() => getPngData(wrongSigBuffer, true, 100)).toThrow('Invalid PNG input: the data could not be parsed');
});
