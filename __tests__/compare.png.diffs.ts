import { existsSync } from 'fs';
import { parse, resolve } from 'path';
import { Compare } from '../src/comparator';

const testDataArray = [
    {
        id: 1,
        name: 'compare different PNG files with image',
        actual: resolve('test-data/actual/ILTQq.png'),
        expected: resolve('test-data/expected/youtube-play-button.png'),
    },
    {
        id: 2,
        name: 'compare different PNG files with image',
        actual: resolve('test-data/actual/ILTQq copy.png'),
        expected: resolve('test-data/expected/ILTQq copy.png'),
    },
];

for (const testData of testDataArray) {
    test(`${testData.name}`, async () => {
        const diffFilePath: string = resolve(
            `test-results/diffs/compare.png.diffs/${testData.id}/${parse(testData.actual).base}_${parse(testData.expected).base}/diff_${
                testData.id
            }.png`,
        );
        const result: boolean = Compare.png({ img1: testData.actual, img2: testData.expected });

        expect(result).toBe(false);
        expect(existsSync(diffFilePath)).toBe(false);

        Compare.png({ img1: testData.actual, img2: testData.expected, diffFilePath });

        expect(existsSync(diffFilePath)).toBe(true);
    });
}
