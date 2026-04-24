import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PathValidationError } from '../src';
import { validatePath } from '../src/validatePath';

function expectPathValidationError(fn: () => void, message?: string): void {
    try {
        fn();
        throw new Error('Expected function to throw');
    } catch (error) {
        expect(error).toBeInstanceOf(PathValidationError);
        if (message) {
            expect((error as Error).message).toContain(message);
        }
    }
}

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
        expectPathValidationError(() => validatePath('/tmp/evil\0.png'), 'null bytes');
    });

    it('should throw when null byte appears mid-path', () => {
        expectPathValidationError(() => validatePath('relative\0/path.png'));
    });

    it('should accept paths with dot-dot segments (resolution is caller responsibility)', () => {
        const result = validatePath('../some/file.png');
        expect(path.isAbsolute(result)).toBe(true);
    });

    it('should throw for an empty string', () => {
        expectPathValidationError(() => validatePath(''), 'empty or whitespace only');
    });

    it('should throw for a whitespace-only string', () => {
        expectPathValidationError(() => validatePath('   '), 'empty or whitespace only');
    });
});

describe('validatePath — baseDir containment (VUL-01, VUL-02)', () => {
    const baseDir = path.resolve('./test-results/validate-path-base');

    beforeEach(() => {
        rmSync(baseDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(baseDir, { recursive: true, force: true });
    });

    it('should accept a path that resolves inside baseDir', () => {
        const filePath = path.join(baseDir, 'diff.png');
        expect(validatePath(filePath, baseDir, 'output')).toBe(filePath);
    });

    it('should reject a path equal to an existing baseDir directory in output mode', () => {
        expectPathValidationError(() => validatePath(baseDir, baseDir, 'output'), 'output path must not be an existing directory');
    });

    it('should throw when path traverses above baseDir via dot-dot', () => {
        const traversal = path.join(baseDir, '..', 'etc', 'passwd');
        expectPathValidationError(() => validatePath(traversal, baseDir, 'output'), 'Path traversal detected');
    });

    it('should throw when an absolute path outside baseDir is given', () => {
        const outside = path.resolve('other-dir', 'file.png');
        expectPathValidationError(() => validatePath(outside, baseDir, 'output'), 'Path traversal detected');
    });

    it('should reject a path that shares baseDir as a prefix but is a sibling (prefix collision)', () => {
        // e.g. baseDir = /foo/bar, path = /foo/bar-evil/file.png
        // Without the sep check, startsWith would incorrectly allow this.
        const sibling = baseDir + '-evil' + path.sep + 'file.png';
        expectPathValidationError(() => validatePath(sibling, baseDir, 'output'), 'Path traversal detected');
    });

    it('should not throw when baseDir is undefined (no containment enforced)', () => {
        const anyPath = path.resolve('anywhere', 'file.png');
        expect(() => validatePath(anyPath, undefined)).not.toThrow();
    });

    it('should accept a path whose segment starts with ".." but is inside baseDir (e.g. "..a/file.png")', () => {
        // path.relative returns '..a/file.png' which starts with '..' as a string
        // but is NOT a traversal segment — the fix ensures we check '..' + sep, not just '..'
        const filePath = path.join(baseDir, '..a', 'file.png');
        expect(validatePath(filePath, baseDir, 'output')).toBe(filePath);
    });
});
