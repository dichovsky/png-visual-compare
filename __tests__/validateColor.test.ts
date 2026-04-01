import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { comparePng } from '../src';
import { validateColor } from '../src/validateColor';

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

    it('should throw RangeError for NaN channel', () => {
        expect(() => validateColor({ r: NaN, g: 0, b: 0 }, 'extendedAreaColor')).toThrow(RangeError);
        expect(() => validateColor({ r: NaN, g: 0, b: 0 }, 'extendedAreaColor')).toThrow('extendedAreaColor.r');
    });

    it('should throw RangeError for negative channel', () => {
        expect(() => validateColor({ r: 0, g: -1, b: 0 }, 'myColor')).toThrow(RangeError);
        expect(() => validateColor({ r: 0, g: -1, b: 0 }, 'myColor')).toThrow('myColor.g');
    });

    it('should throw RangeError for channel > 255', () => {
        expect(() => validateColor({ r: 0, g: 0, b: 256 }, 'color')).toThrow(RangeError);
        expect(() => validateColor({ r: 0, g: 0, b: 256 }, 'color')).toThrow('color.b');
    });

    it('should throw RangeError for a float channel', () => {
        expect(() => validateColor({ r: 1.5, g: 0, b: 0 }, 'color')).toThrow(RangeError);
    });

    it('should throw RangeError for Infinity', () => {
        expect(() => validateColor({ r: Infinity, g: 0, b: 0 }, 'color')).toThrow(RangeError);
    });

    it('error message includes the channel name and value', () => {
        expect(() => validateColor({ r: 300, g: 0, b: 0 }, 'testColor')).toThrow('testColor.r must be an integer in [0, 255], got 300');
    });

    it('should throw RangeError for a missing channel (e.g. b omitted)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => validateColor({ r: 0, g: 0 } as any, 'color')).toThrow(RangeError);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => validateColor({ r: 0, g: 0 } as any, 'color')).toThrow('color.b');
    });
});

// Integration: comparePng should surface color validation errors
describe('comparePng color validation integration', () => {
    const validPng = resolve('./test-data/actual/youtube-play-button.png');

    it('should throw RangeError when extendedAreaColor has a NaN channel', () => {
        expect(() => comparePng(validPng, validPng, { extendedAreaColor: { r: NaN, g: 0, b: 0 } })).toThrow(RangeError);
    });

    it('should throw RangeError when excludedAreaColor has a channel > 255', () => {
        expect(() =>
            comparePng(validPng, validPng, {
                excludedAreaColor: { r: 0, g: 0, b: 256 },
                excludedAreas: [{ x1: 0, y1: 0, x2: 10, y2: 10 }],
            }),
        ).toThrow(RangeError);
    });
});
