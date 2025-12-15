import { readFileSync } from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { getPngData } from '../out/getPngData';

describe('getPngData', () => {
    const validPngPath = path.resolve('./test-data/actual/youtube-play-button.png');
    const invalidPngPath = path.resolve(__dirname, '../test-assets/invalid.png');
    const validPngBuffer = readFileSync(validPngPath);
    const invalidPngBuffer = 'invalid data';

    it('should return valid PngData for a valid PNG file path', () => {
        const result = getPngData(validPngPath, true);
        expect(result.isValid).toBe(true);
        expect(result.png).toBeDefined();
    });

    it('should throw an error for an invalid PNG file path when throwErrorOnInvalidInputData is true', () => {
        expect(() => getPngData(invalidPngPath, true)).toThrow(`PNG file ${invalidPngPath} not found`);
    });

    it('should return invalid PngData for an invalid PNG file path when throwErrorOnInvalidInputData is false', () => {
        const result = getPngData(invalidPngPath, false);
        expect(result.isValid).toBe(false);
        expect(result.png).toBeInstanceOf(PNG);
        expect(result.png.width).toBe(0);
        expect(result.png.height).toBe(0);
    });

    it('should return valid PngData for a valid PNG buffer', () => {
        const result = getPngData(validPngBuffer, true);
        expect(result.isValid).toBe(true);
        expect(result.png).toBeDefined();
    });

    it('should return invalid PngData for an invalid PNG buffer when throwErrorOnInvalidInputData is false', () => {
        const result = getPngData(invalidPngBuffer, false);
        expect(result.isValid).toBe(false);
        expect(result.png).toBeInstanceOf(PNG);
        expect(result.png.width).toBe(0);
        expect(result.png.height).toBe(0);
    });

    it('should throw an error for an unknown input type when throwErrorOnInvalidInputData is true', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => getPngData(123 as any, true)).toThrow('Unknown PNG file input type');
    });

    it('should return invalid PngData for an unknown input type when throwErrorOnInvalidInputData is false', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = getPngData(123 as any, false);
        expect(result.isValid).toBe(false);
        expect(result.png).toBeInstanceOf(PNG);
        expect(result.png.width).toBe(0);
        expect(result.png.height).toBe(0);
    });
});
