import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { InvalidInputError, PathValidationError } from '../src';
import { getPngData } from '../src/getPngData';

function expectErrorType(fn: () => void, errorClass: typeof Error, message?: string): void {
    try {
        fn();
        throw new Error('Expected function to throw');
    } catch (error) {
        expect(error).toBeInstanceOf(errorClass);
        if (message) {
            expect((error as Error).message).toContain(message);
        }
    }
}

describe('getPngData', () => {
    const validPngPath = path.resolve('./test-data/actual/youtube-play-button.png');
    const invalidPngPath = path.resolve(__dirname, '../test-assets/invalid.png');
    const validPngBuffer = readFileSync(validPngPath);
    const invalidPngBuffer = Buffer.from('invalid data');

    it('should return a valid LoadedPng for a valid PNG file path', () => {
        const result = getPngData(validPngPath, true);
        expect(result.kind).toBe('valid');
        if (result.kind === 'valid') {
            expect(result.png).toBeDefined();
        }
    });

    it('should throw an error for an invalid PNG file path when throwErrorOnInvalidInputData is true', () => {
        expectErrorType(() => getPngData(invalidPngPath, true), InvalidInputError, 'Invalid PNG input: the source could not be loaded');
    });

    it('should return an invalid LoadedPng for an invalid PNG file path when throwErrorOnInvalidInputData is false', () => {
        const result = getPngData(invalidPngPath, false);
        expect(result).toEqual({ kind: 'invalid', reason: 'path' });
    });

    it('should return a valid LoadedPng for a valid PNG buffer', () => {
        const result = getPngData(validPngBuffer, true);
        expect(result.kind).toBe('valid');
        if (result.kind === 'valid') {
            expect(result.png).toBeDefined();
        }
    });

    it('should return an invalid LoadedPng for an invalid PNG buffer when throwErrorOnInvalidInputData is false', () => {
        const result = getPngData(invalidPngBuffer, false);
        expect(result).toEqual({ kind: 'invalid', reason: 'decode' });
    });

    it('should throw an error for an invalid PNG buffer when throwErrorOnInvalidInputData is true', () => {
        expectErrorType(() => getPngData(invalidPngBuffer, true), InvalidInputError, 'Invalid PNG input: the data could not be parsed');
    });

    it('should throw an error for a path containing a null byte when throwErrorOnInvalidInputData is true', () => {
        expectErrorType(() => getPngData('/tmp/evil\0.png', true), PathValidationError, 'null bytes');
    });

    it('should return an invalid LoadedPng for a path containing a null byte when throwErrorOnInvalidInputData is false', () => {
        const result = getPngData('/tmp/evil\0.png', false);
        expect(result).toEqual({ kind: 'invalid', reason: 'path' });
    });

    it('should throw an error for an unknown input type when throwErrorOnInvalidInputData is true', () => {
        expectErrorType(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            () => getPngData(123 as any, true),
            InvalidInputError,
            'Unknown PNG file input type',
        );
    });

    it('should return an invalid LoadedPng for an unknown input type when throwErrorOnInvalidInputData is false', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = getPngData(123 as any, false);
        expect(result).toEqual({ kind: 'invalid', reason: 'type' });
    });
});
