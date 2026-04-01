import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePath } from '../src/validatePath';

describe('validatePath', () => {
    it('should resolve a relative path to an absolute path', () => {
        const result = validatePath('./some/file.png');
        expect(path.isAbsolute(result)).toBe(true);
        expect(result).toBe(path.resolve('./some/file.png'));
    });

    it('should return an absolute path unchanged (after resolve)', () => {
        const abs = '/tmp/output/diff.png';
        expect(validatePath(abs)).toBe(abs);
    });

    it('should throw an Error when the path contains a null byte', () => {
        expect(() => validatePath('/tmp/evil\0.png')).toThrow(Error);
        expect(() => validatePath('/tmp/evil\0.png')).toThrow('null bytes');
    });

    it('should throw when null byte appears mid-path', () => {
        expect(() => validatePath('relative\0/path.png')).toThrow(Error);
    });

    it('should accept paths with dot-dot segments (resolution is caller responsibility)', () => {
        const result = validatePath('../some/file.png');
        expect(path.isAbsolute(result)).toBe(true);
    });

    it('should accept an empty string and return the resolved CWD', () => {
        const result = validatePath('');
        expect(path.isAbsolute(result)).toBe(true);
    });
});
