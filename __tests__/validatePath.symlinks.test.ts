import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
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

describe('validatePath symlink containment', () => {
    const rootDir = path.resolve('./test-results/validate-path-symlinks');
    const baseDir = path.join(rootDir, 'base');
    const outsideDir = path.join(rootDir, 'outside');
    const insideFile = path.join(baseDir, 'inside.png');
    const outsideFile = path.join(outsideDir, 'outside.png');
    const insideLink = path.join(baseDir, 'inside-link.png');
    const outsideLink = path.join(baseDir, 'outside-link.png');
    const outputEscapeLink = path.join(baseDir, 'output-link');
    const outputFileSymlink = path.join(baseDir, 'diff.png');
    const loopLink = path.join(baseDir, 'loop-link');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
        mkdirSync(outsideDir, { recursive: true });
        writeFileSync(insideFile, 'inside');
        writeFileSync(outsideFile, 'outside');
        symlinkSync(insideFile, insideLink);
        symlinkSync(outsideFile, outsideLink);
        symlinkSync(outsideDir, outputEscapeLink);
        symlinkSync(outsideFile, outputFileSymlink);
        symlinkSync(loopLink, loopLink);
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('rejects a symlink inside baseDir that points to a file outside baseDir', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        expectPathValidationError(() => validatePath(outsideLink, baseDir, 'input'), 'Path traversal detected');
    });

    test('accepts a symlink inside baseDir that points to a file inside baseDir', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        expect(validatePath(insideLink, baseDir, 'input')).toBe(insideLink);
    });

    test('rejects lexical traversal outside baseDir', () => {
        expectPathValidationError(
            () => validatePath(path.join(baseDir, '..', 'outside', 'outside.png'), baseDir, 'input'),
            'Path traversal detected',
        );
    });

    test('accepts a normal path inside baseDir', () => {
        expect(validatePath(insideFile, baseDir, 'input')).toBe(insideFile);
    });

    test('rejects an output path whose parent symlink escapes baseDir', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        expectPathValidationError(
            () => validatePath(path.join(outputEscapeLink, 'diff.png'), baseDir, 'output'),
            'Path traversal detected',
        );
    });

    test('rejects an output path when the final file already exists as a symlink', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        expectPathValidationError(() => validatePath(outputFileSymlink, baseDir, 'output'), 'output path must not be an existing symlink');
    });

    test('accepts an output path inside baseDir when parent directories do not exist yet', () => {
        const nestedDiffPath = path.join(baseDir, 'missing-parent', 'nested', 'diff.png');

        expect(validatePath(nestedDiffPath, baseDir, 'output')).toBe(nestedDiffPath);
    });

    test('rejects circular symlinks with a dedicated message', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        expectPathValidationError(() => validatePath(loopLink, baseDir, 'input'), 'Path validation failed: symlink loop detected');
    });

    test('rejects a missing base directory with a dedicated message', () => {
        expectPathValidationError(
            () => validatePath(path.join(rootDir, 'missing-base', 'inside.png'), path.join(rootDir, 'missing-base'), 'input'),
            'Path validation failed: base directory does not exist or is not accessible',
        );
    });
});

describe('validatePath — SECU-11 out-of-bounds shape checks never leak filesystem state', () => {
    // When `baseDir` is set, every path *outside* `baseDir` must surface as
    // "Path traversal detected: …" — never as "must not be an existing symlink"
    // or "must not be an existing directory". The early-existence checks
    // formerly leaked a three-way oracle (exists-symlink / exists-directory /
    // anything-else) for arbitrary absolute paths.
    const rootDir = path.resolve('./test-results/validate-path-secu-11');
    const baseDir = path.join(rootDir, 'base');
    const outsideDir = path.join(rootDir, 'outside');
    const outsideRegularFile = path.join(outsideDir, 'target.txt');
    const outsideSymlink = path.join(outsideDir, 'target-link');
    const outsideExistingDir = path.join(outsideDir, 'a-real-directory');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
        mkdirSync(outsideDir, { recursive: true });
        mkdirSync(outsideExistingDir, { recursive: true });
        writeFileSync(outsideRegularFile, 'sentinel');
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('an out-of-bounds existing symlink reports traversal — never "must not be an existing symlink"', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        symlinkSync(outsideRegularFile, outsideSymlink);

        try {
            validatePath(outsideSymlink, baseDir, 'output');
            throw new Error('Expected validatePath to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(PathValidationError);
            const message = (error as Error).message;
            expect(message).toContain('Path traversal detected');
            // Must not leak the shape-check phrases that would distinguish
            // "exists-symlink" / "exists-directory" / "anything-else" outcomes.
            expect(message).not.toContain('must not be an existing symlink');
            expect(message).not.toContain('must not be an existing directory');
        }
    });

    test('an out-of-bounds existing directory reports traversal — never "must not be an existing directory"', () => {
        try {
            validatePath(outsideExistingDir, baseDir, 'output');
            throw new Error('Expected validatePath to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(PathValidationError);
            const message = (error as Error).message;
            expect(message).toContain('Path traversal detected');
            expect(message).not.toContain('must not be an existing directory');
            expect(message).not.toContain('must not be an existing symlink');
        }
    });

    test('an out-of-bounds regular file reports traversal (regression guard for non-shape paths)', () => {
        try {
            validatePath(outsideRegularFile, baseDir, 'output');
            throw new Error('Expected validatePath to throw');
        } catch (error) {
            expect(error).toBeInstanceOf(PathValidationError);
            expect((error as Error).message).toContain('Path traversal detected');
        }
    });

    test('an in-bounds existing symlink still surfaces the shape error (legacy contract preserved inside the boundary)', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        const insideSymlink = path.join(baseDir, 'inside-link');
        symlinkSync(outsideRegularFile, insideSymlink);

        expectPathValidationError(() => validatePath(insideSymlink, baseDir, 'output'), 'output path must not be an existing symlink');
    });

    test('an in-bounds existing directory still surfaces the shape error (legacy contract preserved inside the boundary)', () => {
        const insideDir = path.join(baseDir, 'inside-dir');
        mkdirSync(insideDir);

        expectPathValidationError(() => validatePath(insideDir, baseDir, 'output'), 'output path must not be an existing directory');
    });

    test('without baseDir, the legacy shape-check-first behaviour is preserved (no oracle exists either way)', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        symlinkSync(outsideRegularFile, outsideSymlink);

        expectPathValidationError(() => validatePath(outsideSymlink, undefined, 'output'), 'output path must not be an existing symlink');
        expectPathValidationError(
            () => validatePath(outsideExistingDir, undefined, 'output'),
            'output path must not be an existing directory',
        );
    });
});
