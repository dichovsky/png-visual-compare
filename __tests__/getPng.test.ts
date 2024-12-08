import { readFileSync } from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { getPng } from '../src/getPng';

describe('getPng', () => {
    const validPngPath = path.resolve('./test-data/actual/youtube-play-button.png');
    const invalidPngPath = path.resolve(__dirname, '../test-assets/invalid.png');
    const validPngBuffer = readFileSync(validPngPath);
    const invalidPngBuffer = 'invalid data';

    it('should return valid PngData for a valid PNG file path', () => {
        const result = getPng(validPngPath, true);
        expect(result.isValid).toBe(true);
        expect(result.png).toBeDefined();
    });

    it('should throw an error for an invalid PNG file path when throwErrorOnInvalidInputData is true', () => {
        expect(() => getPng(invalidPngPath, true)).toThrow(`PNG file ${invalidPngPath} not found`);
    });

    it('should return invalid PngData for an invalid PNG file path when throwErrorOnInvalidInputData is false', () => {
        const result = getPng(invalidPngPath, false);
        expect(result.isValid).toBe(false);
        expect(result.png).toBeInstanceOf(PNG);
        expect(result.png.width).toBe(0);
        expect(result.png.height).toBe(0);
    });

    it('should return valid PngData for a valid PNG buffer', () => {
        const result = getPng(validPngBuffer, true);
        expect(result.isValid).toBe(true);
        expect(result.png).toBeDefined();
    });

    it('should return invalid PngData for an invalid PNG buffer when throwErrorOnInvalidInputData is false', () => {
        const result = getPng(invalidPngBuffer, false);
        expect(result.isValid).toBe(false);
        expect(result.png).toBeInstanceOf(PNG);
        expect(result.png.width).toBe(0);
        expect(result.png.height).toBe(0);
    });

    it('should throw an error for an unknown input type when throwErrorOnInvalidInputData is true', () => {
        expect(() => getPng(123 as any, true)).toThrow('Unknown PNG file input type');
    });

    it('should return invalid PngData for an unknown input type when throwErrorOnInvalidInputData is false', () => {
        const result = getPng(123 as any, false);
        expect(result.isValid).toBe(false);
        expect(result.png).toBeInstanceOf(PNG);
        expect(result.png.width).toBe(0);
        expect(result.png.height).toBe(0);
    });
});
