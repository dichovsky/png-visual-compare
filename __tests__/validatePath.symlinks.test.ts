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
