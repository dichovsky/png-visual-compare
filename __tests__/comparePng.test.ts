import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import { Area, comparePng } from '../src';

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
