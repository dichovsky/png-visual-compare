import { existsSync, readFileSync, unlinkSync } from 'fs';
import { parse, resolve } from 'path';
import { expect, test } from 'vitest';
import { comparePng } from '../src';

const testDataArrayValidInput: { id: number; actual: string; expected: string; result: number }[] = [
    {
        id: 1,
        actual: resolve('./test-data/actual/ILTQq.png'),
        expected: resolve('./test-data/expected/youtube-play-button.png'),
        result: 434915,
    },
    {
        id: 2,
        actual: resolve('./test-data/actual/ILTQq copy.png'),
        expected: resolve('./test-data/expected/ILTQq copy.png'),
        result: 480,
    },
    {
        id: 3,
        actual: resolve('./test-data/actual/youtube-play-button.png'),
        expected: resolve('./test-data/expected/pnggrad16rgb.png'),
        result: 506712,
    },
];

for (const testData of testDataArrayValidInput) {
    test(`compare different PNG files with image ${testData.id}`, async () => {
        const diffFilePath: string = resolve(
            `./test-results/diffs/compare.png.diffs/${testData.id}/${parse(testData.actual).base}_${
                parse(testData.expected).base
            }/diff_${testData.id}.png`,
        );

        if (existsSync(diffFilePath)) {
            unlinkSync(diffFilePath);
        }

        expect(existsSync(diffFilePath)).toBe(false);

        const result: number = comparePng(testData.actual, testData.expected, {
            diffFilePath,
        });

        expect(result).toBe(testData.result);
        expect(readFileSync(diffFilePath)).toMatchSnapshot();
    });
}

const testDataArrayInvalidInput: { id: number; actual: string; expected: string; result: number }[] = [
    {
        id: 1,
        actual: resolve('./test-data/actual/non-existing-file.png'),
        expected: resolve('./test-data/expected/youtube-play-button.png'),
        result: 470130,
    },
    {
        id: 2,
        actual: resolve('./test-data/expected/youtube-play-button.png'),
        expected: resolve('./test-data/actual/non-existing-file.png'),
        result: 470130,
    },
];

for (const testData of testDataArrayInvalidInput) {
    test(`compare different PNG files with image ${testData.id}, invalid input`, async () => {
        const diffFilePath: string = resolve(
            `./test-results/diffs/compare.png.diffs.invalid.input/${testData.id}/${parse(testData.actual).base}_${
                parse(testData.expected).base
            }/diff_${testData.id}.png`,
        );

        const result: number = comparePng(testData.actual, testData.expected, {
            diffFilePath,
            throwErrorOnInvalidInputData: false,
        });

        expect(result).toBe(testData.result);
        expect(readFileSync(diffFilePath)).toMatchSnapshot();
    });
}
