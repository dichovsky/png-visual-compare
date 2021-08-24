import { Comparator } from '../src/comparator';
import { existsSync } from 'fs';

const testDataArray = [
    {
        id: 1,
        name: 'compare different PNG files with image',
        actual: 'test-data/actual/page_1.png',
        expected: 'test-data/expected/page_2.png',
    },
    {
        id: 2,
        name: 'compare different PNG files with image',
        actual: 'test-data/actual/page_1.png',
        expected: 'test-data/expected/page_3.png',
    },
];

for (const testData of testDataArray) {
    test(`${testData.name}`, async () => {
        const diffPath = `test-results/diffs/diff_${testData.id}.png`;
        const result: boolean = Comparator.comparePngFiles(testData.actual, testData.expected, [], diffPath);
        expect(result).toBe(false);
        expect(existsSync(diffPath)).toBe(true);
    });
}
