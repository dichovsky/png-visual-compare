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
        // Construct a guaranteed-absolute path using path.resolve so the test
        // does not depend on a hard-coded filesystem root.
        const abs = path.resolve('some', 'output', 'diff.png');
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

    it('should throw for an empty string', () => {
        expect(() => validatePath('')).toThrow('empty or whitespace only');
    });

    it('should throw for a whitespace-only string', () => {
        expect(() => validatePath('   ')).toThrow('empty or whitespace only');
    });
});

describe('validatePath — baseDir containment (VUL-01, VUL-02)', () => {
    const baseDir = path.resolve('test-output');

    it('should accept a path that resolves inside baseDir', () => {
        const filePath = path.join(baseDir, 'diff.png');
        expect(validatePath(filePath, baseDir)).toBe(filePath);
    });

    it('should accept a path equal to baseDir itself', () => {
        expect(validatePath(baseDir, baseDir)).toBe(baseDir);
    });

    it('should throw when path traverses above baseDir via dot-dot', () => {
        const traversal = path.join(baseDir, '..', 'etc', 'passwd');
        expect(() => validatePath(traversal, baseDir)).toThrow('Path traversal detected');
    });

    it('should throw when an absolute path outside baseDir is given', () => {
        const outside = path.resolve('other-dir', 'file.png');
        expect(() => validatePath(outside, baseDir)).toThrow('Path traversal detected');
    });

    it('should reject a path that shares baseDir as a prefix but is a sibling (prefix collision)', () => {
        // e.g. baseDir = /foo/bar, path = /foo/bar-evil/file.png
        // Without the sep check, startsWith would incorrectly allow this.
        const sibling = baseDir + '-evil' + path.sep + 'file.png';
        expect(() => validatePath(sibling, baseDir)).toThrow('Path traversal detected');
    });

    it('should not throw when baseDir is undefined (no containment enforced)', () => {
        const anyPath = path.resolve('anywhere', 'file.png');
        expect(() => validatePath(anyPath, undefined)).not.toThrow();
    });
});
