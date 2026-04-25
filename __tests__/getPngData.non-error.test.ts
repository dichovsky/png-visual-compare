import { expect, it, vi } from 'vitest';

// Spread the original module into a plain object so vi.spyOn can redefine its properties.
// ESM module namespaces are non-configurable by default, which prevents spying.
vi.mock('node:fs', async (importOriginal) => {
    const mod = await importOriginal<typeof import('node:fs')>();
    return { ...mod };
});

import * as nodeFs from 'node:fs';
import { PNG } from 'pngjs';
import { InvalidInputError } from '../src';
import { getPngData } from '../src/getPngData';

function expectInvalidInputError(fn: () => void, message?: string): void {
    try {
        fn();
        throw new Error('Expected function to throw');
    } catch (error) {
        expect(error).toBeInstanceOf(InvalidInputError);
        if (message) {
            expect((error as Error).message).toContain(message);
        }
    }
}

it('should throw with fallback error detail when the caught value is not an Error instance', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => {
        throw 'non-error string';
    });
    expectInvalidInputError(() => getPngData('/any/path.png', true), 'Invalid PNG input: the source could not be loaded');
});

it('should throw with fallback error detail when PNG parsing throws a non-Error value', () => {
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw 'non-error string';
    });
    expectInvalidInputError(() => getPngData(Buffer.from('not-a-real-png'), true), 'Invalid PNG input: the data could not be parsed');
});

it('should throw the unified message when a string-path file exists but PNG parse fails (throwError=true)', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => Buffer.from('fake png bytes'));
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('Invalid PNG signature');
    });
    expectInvalidInputError(() => getPngData('/any/valid-path.png', true), 'Invalid PNG input: the source could not be loaded');
});

it('should return invalidPng when a string-path file exists but PNG parse fails (throwError=false)', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => Buffer.from('fake png bytes'));
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('Invalid PNG signature');
    });
    const result = getPngData('/any/valid-path.png', false);
    expect(result).toEqual({ kind: 'invalid', reason: 'decode' });
});

it('should not throw a dimension error when the buffer is shorter than 24 bytes (peekPngDimensions line 21)', () => {
    const shortBuffer = Buffer.alloc(10);
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('not a png');
    });
    expectInvalidInputError(() => getPngData(shortBuffer, true, 100), 'Invalid PNG input: the data could not be parsed');
});

it('should not throw a dimension error when the buffer has an invalid PNG signature (peekPngDimensions line 22)', () => {
    const wrongSigBuffer = Buffer.alloc(24, 0);
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw new Error('not a png');
    });
    expectInvalidInputError(() => getPngData(wrongSigBuffer, true, 100), 'Invalid PNG input: the data could not be parsed');
});
