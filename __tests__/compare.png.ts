import { Comparator } from '../src/comparator';

const testDataArray = [
    {
        id: 1,
        name: 'compare PNG files with text',
        actual: 'test-data/actual/page_1.png',
        expected: 'test-data/expected/page_1.png',
    },
    {
        id: 2,
        name: 'compare PNG files with image',
        actual: 'test-data/actual/page_2.png',
        expected: 'test-data/expected/page_2.png',
    },
    {
        id: 3,
        name: 'compare PNG files with image',
        actual: 'test-data/actual/page_3.png',
        expected: 'test-data/expected/page_3.png',
    },
];

for (const testData of testDataArray) {
    test(`${testData.name}`, async () => {
        const diffPath = `test-results/diffs/diff_${testData.id}.png`;
        const result: boolean = Comparator.comparePngFiles(testData.actual, testData.expected, [], diffPath);
        expect(result).toBe(true);
    });
}
