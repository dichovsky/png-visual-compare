import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PathValidationError } from '../src';
import { comparePngWithPorts } from '../src/comparePng';
import { fsDiffWriter } from '../src/ports/fsDiffWriter';
import { fsImageSource } from '../src/ports/fsImageSource';
import type { ComparisonPorts } from '../src/ports/types';

function pngBuffer(rgba: [number, number, number, number]): Buffer {
    const png = new PNG({ width: 2, height: 2, fill: true });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = rgba[0];
        png.data[i + 1] = rgba[1];
        png.data[i + 2] = rgba[2];
        png.data[i + 3] = rgba[3];
    }
    return PNG.sync.write(png);
}

describe('comparePng TOCTOU defence on diff write (SECU-03)', () => {
    const rootDir = path.resolve('./test-results/compare-png-symlink-toctou');
    const diffFilePath = path.join(rootDir, 'diff.png');
    const sentinel = path.join(rootDir, 'sentinel.txt');
    const png1 = pngBuffer([255, 0, 0, 255]);
    const png2 = pngBuffer([0, 255, 0, 255]);

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(rootDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('refuses to write through a symlink planted between validation and write; sentinel is preserved', () => {
        if (process.platform === 'win32') return; // TODO: add Windows symlink coverage.

        writeFileSync(sentinel, 'sentinel-bytes');

        const planSymlinkBeforeWrite: ComparisonPorts = {
            imageSource: fsImageSource,
            diffWriter: {
                write(targetPath, data) {
                    // Race emulation: validatePath has already cleared this path
                    // (no symlink existed). A hostile process now plants one
                    // before the writer opens the file. The writer must refuse.
                    symlinkSync(sentinel, targetPath);
                    fsDiffWriter.write(targetPath, data);
                },
            },
        };

        expect(() => comparePngWithPorts(png1, png2, { diffFilePath }, planSymlinkBeforeWrite)).toThrow(PathValidationError);

        expect(readFileSync(sentinel).toString()).toBe('sentinel-bytes');
        expect(lstatSync(diffFilePath).isSymbolicLink()).toBe(true);
        expect(existsSync(path.join(rootDir, 'should-not-exist.png'))).toBe(false);
    });
});
