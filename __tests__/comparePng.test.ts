import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { Area, Color, DEFAULT_EXCLUDED_AREA_COLOR, DEFAULT_EXTENDED_AREA_COLOR, comparePng } from '../src';
import { comparePngWithPorts } from '../src/comparePng';
import type { DiffWriterPort } from '../src/ports/types';

const testDataArray: {
    id: number;
    name: string;
    actual: string;
    expected: string;
    excludedAreas: Area[];
}[] = [
    {
        id: 1,
        name: 'compare PNG with text',
        actual: resolve('./test-data/actual/pnggrad16rgb.png'),
        expected: resolve('./test-data/expected/pnggrad16rgb.png'),
        excludedAreas: [],
    },
    {
        id: 2,
        name: 'compare PNG with image',
        actual: resolve('./test-data/actual/youtube-play-button.png'),
        expected: resolve('./test-data/expected/youtube-play-button.png'),
        excludedAreas: [],
    },
    {
        id: 3,
        name: 'compare PNG with image',
        actual: resolve('./test-data/actual/ILTQq.png'),
        expected: resolve('./test-data/expected/ILTQq.png'),
        excludedAreas: [],
    },
    {
        id: 4,
        name: 'compare different files with excluded area',
        actual: resolve('./test-data/actual/ILTQq copy.png'),
        expected: resolve('./test-data/expected/ILTQq copy.png'),
        excludedAreas: [
            {
                x1: 5,
                y1: 410,
                x2: 50,
                y2: 460,
            },
        ],
    },
];

for (const testData of testDataArray) {
    test(`${testData.name}, file`, async () => {
        const result: number = comparePng(testData.actual, testData.expected, {
            excludedAreas: testData.excludedAreas,
            pixelmatchOptions: { threshold: 0.5 },
        });

        expect(result).toBe(0);
    });

    test(`${testData.name}, PNG`, async () => {
        const result: number = comparePng(readFileSync(testData.actual), readFileSync(testData.expected), {
            excludedAreas: testData.excludedAreas,
        });

        expect(result).toBe(0);
    });
}

const testDataArrayNoDiffWrite: {
    id: number;
    name: string;
    actual: Buffer;
    expected: Buffer;
    diffFilePath: string;
}[] = [
    {
        id: 1,
        name: 'compare-only mode does not write a diff file',
        actual: (() => {
            const png = new PNG({ width: 2, height: 2, fill: true });
            png.data.fill(255);
            return PNG.sync.write(png);
        })(),
        expected: (() => {
            const png = new PNG({ width: 2, height: 2, fill: true });
            png.data.fill(255);
            return PNG.sync.write(png);
        })(),
        diffFilePath: resolve('./test-results/compare-only-no-diff/diff.png'),
    },
];

for (const testData of testDataArrayNoDiffWrite) {
    test(testData.name, () => {
        if (existsSync(testData.diffFilePath)) {
            unlinkSync(testData.diffFilePath);
        }

        const result = comparePng(testData.actual, testData.expected, { diffFilePath: testData.diffFilePath });

        expect(result).toBe(0);
        expect(existsSync(testData.diffFilePath)).toBe(false);
    });
}

test('should NOT create diff file when images are identical', () => {
    const actual = resolve('./test-data/actual/pnggrad16rgb.png');
    const expected = resolve('./test-data/expected/pnggrad16rgb.png');
    const diffFilePath = resolve('./test-results/no-diff-when-match/diff.png');

    if (existsSync(diffFilePath)) {
        unlinkSync(diffFilePath);
    }

    const result = comparePng(actual, expected, { diffFilePath });
    expect(result).toBe(0);
    expect(existsSync(diffFilePath)).toBe(false);
});

test('should compare different PNG files without creating diff file (mismatch)', () => {
    const actual = resolve('./test-data/actual/ILTQq.png');
    const expected = resolve('./test-data/expected/youtube-play-button.png');

    const result: number = comparePng(actual, expected);
    expect(result).toBe(434926);
});

test('should create diff file directory recursively if it does not exist', () => {
    const actual = resolve('./test-data/actual/ILTQq.png');
    const expected = resolve('./test-data/expected/youtube-play-button.png');
    const diffFilePath = resolve('./test-results/new-diff-folder/subfolder/diff.png');
    const diffFolder = resolve('./test-results/new-diff-folder/subfolder');

    if (existsSync(diffFolder)) {
        rmSync(diffFolder, { recursive: true, force: true });
    }

    const result = comparePng(actual, expected, { diffFilePath });
    expect(result).toBe(434926);
    expect(existsSync(diffFilePath)).toBe(true);
});

test('should create diff file when directory already exists', () => {
    const actual = resolve('./test-data/actual/ILTQq.png');
    const expected = resolve('./test-data/expected/youtube-play-button.png');
    const diffFilePath = resolve('./test-results/existing-diff-folder/diff.png');
    const diffFolder = resolve('./test-results/existing-diff-folder');

    // Ensure directory exists
    if (!existsSync(diffFolder)) {
        mkdirSync(diffFolder, { recursive: true });
    }
    // Clean up file if exists
    if (existsSync(diffFilePath)) {
        unlinkSync(diffFilePath);
    }

    const result = comparePng(actual, expected, { diffFilePath });
    expect(result).toBe(434926);
    expect(existsSync(diffFilePath)).toBe(true);
});

test('should create diff file when diffFilePath is a relative path', () => {
    const actual = resolve('./test-data/actual/ILTQq.png');
    const expected = resolve('./test-data/expected/youtube-play-button.png');
    const relativeDiffFilePath = './test-results/relative-diff-folder/diff.png';
    const absoluteDiffFilePath = resolve(relativeDiffFilePath);

    if (existsSync(absoluteDiffFilePath)) {
        unlinkSync(absoluteDiffFilePath);
    }

    const result = comparePng(actual, expected, { diffFilePath: relativeDiffFilePath });
    expect(result).toBe(434926);
    expect(existsSync(absoluteDiffFilePath)).toBe(true);
});

test('DEFAULT_EXCLUDED_AREA_COLOR should be solid blue', () => {
    const expected: Color = { r: 0, g: 0, b: 255 };
    expect(DEFAULT_EXCLUDED_AREA_COLOR).toEqual(expected);
});

test('DEFAULT_EXTENDED_AREA_COLOR should be solid green', () => {
    const expected: Color = { r: 0, g: 255, b: 0 };
    expect(DEFAULT_EXTENDED_AREA_COLOR).toEqual(expected);
});

test('should accept custom excludedAreaColor and still zero-out the excluded region', () => {
    const actual = resolve('./test-data/actual/ILTQq copy.png');
    const expected = resolve('./test-data/expected/ILTQq copy.png');
    const excludedAreas: Area[] = [{ x1: 5, y1: 410, x2: 50, y2: 460 }];

    const resultDefault = comparePng(actual, expected, { excludedAreas });
    const resultCustomColor = comparePng(actual, expected, {
        excludedAreas,
        excludedAreaColor: { r: 255, g: 0, b: 0 },
    });

    expect(resultDefault).toBe(0);
    expect(resultCustomColor).toBe(0);
});

test('should accept custom extendedAreaColor for size-differing images', () => {
    const actual = resolve('./test-data/actual/budweiser640x862.png');
    const expected = resolve('./test-data/expected/water1500x600.png');

    const resultDefault = comparePng(actual, expected);
    const resultCustomColor = comparePng(actual, expected, {
        extendedAreaColor: { r: 128, g: 0, b: 128 },
    });

    expect(resultDefault).toBeGreaterThan(0);
    expect(resultCustomColor).toBeGreaterThan(0);
    expect(resultDefault).not.toBe(resultCustomColor);
});

describe('comparePng internal port injection', () => {
    test('calls the injected diff writer on mismatch', () => {
        const first = new PNG({ width: 1, height: 1, fill: true });
        const second = new PNG({ width: 1, height: 1, fill: true });
        first.data.set(Buffer.from([255, 0, 0, 255]));
        second.data.set(Buffer.from([0, 0, 255, 255]));
        const writes: Buffer[] = [];
        const diffWriter: DiffWriterPort = {
            write(_path, data) {
                writes.push(data);
            },
        };

        const result = comparePngWithPorts(
            PNG.sync.write(first),
            PNG.sync.write(second),
            { diffFilePath: resolve('./test-results/internal-port/diff.png') },
            { imageSource: { load: (source) => ({ kind: 'valid', png: PNG.sync.read(source as Buffer) }) }, diffWriter },
        );

        expect(result).toBeGreaterThan(0);
        expect(writes).toHaveLength(1);
    });

    test('does not call the injected diff writer when there is no mismatch', () => {
        const png = new PNG({ width: 1, height: 1, fill: true });
        png.data.set(Buffer.from([255, 0, 0, 255]));
        const writes: Buffer[] = [];
        const diffWriter: DiffWriterPort = {
            write(_path, data) {
                writes.push(data);
            },
        };

        const result = comparePngWithPorts(
            PNG.sync.write(png),
            PNG.sync.write(png),
            { diffFilePath: resolve('./test-results/internal-port/no-diff.png') },
            { imageSource: { load: (source) => ({ kind: 'valid', png: PNG.sync.read(source as Buffer) }) }, diffWriter },
        );

        expect(result).toBe(0);
        expect(writes).toHaveLength(0);
    });
});
