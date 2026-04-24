import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { comparePng, InvalidInputError } from '../src';
import { validateColor } from '../src/validateColor';

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

describe('validateColor', () => {
    it('should not throw for a valid color', () => {
        expect(() => validateColor({ r: 0, g: 128, b: 255 }, 'color')).not.toThrow();
    });

    it('should not throw for all-zero color', () => {
        expect(() => validateColor({ r: 0, g: 0, b: 0 }, 'color')).not.toThrow();
    });

    it('should not throw for max-value color', () => {
        expect(() => validateColor({ r: 255, g: 255, b: 255 }, 'color')).not.toThrow();
    });

    it('should throw InvalidInputError for NaN channel', () => {
        expectInvalidInputError(() => validateColor({ r: NaN, g: 0, b: 0 }, 'extendedAreaColor'), 'extendedAreaColor.r');
    });

    it('should throw InvalidInputError for negative channel', () => {
        expectInvalidInputError(() => validateColor({ r: 0, g: -1, b: 0 }, 'myColor'), 'myColor.g');
    });

    it('should throw InvalidInputError for channel > 255', () => {
        expectInvalidInputError(() => validateColor({ r: 0, g: 0, b: 256 }, 'color'), 'color.b');
    });

    it('should throw InvalidInputError for a float channel', () => {
        expectInvalidInputError(() => validateColor({ r: 1.5, g: 0, b: 0 }, 'color'));
    });

    it('should throw InvalidInputError for Infinity', () => {
        expectInvalidInputError(() => validateColor({ r: Infinity, g: 0, b: 0 }, 'color'));
    });

    it('error message includes the channel name and value', () => {
        expectInvalidInputError(
            () => validateColor({ r: 300, g: 0, b: 0 }, 'testColor'),
            'testColor.r must be an integer in [0, 255], got 300',
        );
    });

    it('should throw InvalidInputError for a missing channel (e.g. b omitted)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expectInvalidInputError(() => validateColor({ r: 0, g: 0 } as any, 'color'), 'color.b');
    });
});

// Integration: comparePng should surface color validation errors
describe('comparePng color validation integration', () => {
    const validPng = resolve('./test-data/actual/youtube-play-button.png');

    it('should throw InvalidInputError when extendedAreaColor has a NaN channel', () => {
        expectInvalidInputError(() => comparePng(validPng, validPng, { extendedAreaColor: { r: NaN, g: 0, b: 0 } }));
    });

    it('should throw InvalidInputError when excludedAreaColor has a channel > 255', () => {
        expectInvalidInputError(() =>
            comparePng(validPng, validPng, {
                excludedAreaColor: { r: 0, g: 0, b: 256 },
                excludedAreas: [{ x1: 0, y1: 0, x2: 10, y2: 10 }],
            }),
        );
    });
});
