import { Comparator } from '../src/comparator';
import { existsSync } from 'fs';
import { parse, resolve } from 'path';

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
        const diffPath: string = resolve(
            `test-results/diffs/${parse(testData.actual).base}_${parse(testData.expected).base}/diff_${
                testData.id
            }.png`,
        );
        const result: boolean = Comparator.comparePngFiles(testData.actual, testData.expected, [], diffPath);
        expect(result).toBe(false);
        expect(existsSync(diffPath)).toBe(true);
    });
}
