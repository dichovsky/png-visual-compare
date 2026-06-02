import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';
import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import { comparePng, InvalidInputError } from '../src';

function createPngBuffer(width: number, height: number, rgba: [number, number, number, number]): Buffer {
    const png = new PNG({ width, height, fill: true });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = rgba[0];
        png.data[i + 1] = rgba[1];
        png.data[i + 2] = rgba[2];
        png.data[i + 3] = rgba[3];
    }
    return PNG.sync.write(png);
}

test('does not write diff file when pixelmatch returns 0', () => {
    const diffDir = resolve('./test-results/logic-no-diff');
    const diffFilePath = resolve(diffDir, 'diff.png');
    rmSync(diffDir, { recursive: true, force: true });

    const result = comparePng(createPngBuffer(2, 2, [255, 255, 255, 255]), createPngBuffer(2, 2, [255, 255, 255, 255]), {
        diffFilePath,
    });

    expect(result).toBe(0);
    expect(existsSync(diffFilePath)).toBe(false);
});

test('throws when both inputs are invalid', () => {
    expect(() =>
        comparePng(Buffer.from('not-a-png'), Buffer.from('still-not-a-png'), {
            throwErrorOnInvalidInputData: true,
        }),
    ).toThrow(InvalidInputError);
});

test('size-difference band is reported as a mismatch when not excluded (control)', () => {
    // 4x4 vs 4x2: the bottom two rows exist only in the first image and become
    // extended (green) padding in the second, so they differ.
    const result = comparePng(createPngBuffer(4, 4, [255, 0, 0, 255]), createPngBuffer(4, 2, [255, 0, 0, 255]), {});

    expect(result).toBe(8);
});

test('excludedAreas overlapping the size-extension region always match (contract)', () => {
    // Excluding the exact bottom band that only exists in the larger image must
    // make it match — excluded areas "always match regardless of content", even
    // when they overlap regions added by size extension.
    const result = comparePng(createPngBuffer(4, 4, [255, 0, 0, 255]), createPngBuffer(4, 2, [255, 0, 0, 255]), {
        excludedAreas: [{ x1: 0, y1: 2, x2: 3, y2: 3 }],
    });

    expect(result).toBe(0);
});

test('excludedAreas validation runs before image mutation', () => {
    const diffDir = resolve('./test-results/logic-invalid-area');
    const diffFilePath = resolve(diffDir, 'diff.png');
    rmSync(diffDir, { recursive: true, force: true });

    expect(() =>
        comparePng(createPngBuffer(2, 2, [255, 255, 255, 255]), createPngBuffer(2, 2, [0, 0, 0, 255]), {
            diffFilePath,
            excludedAreas: [{ x1: Number.NaN, y1: 0, x2: 1, y2: 1 }],
        }),
    ).toThrow('excludedAreas[0]: coordinates must be finite integers');
    expect(existsSync(diffFilePath)).toBe(false);
});
