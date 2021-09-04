import { Comparator } from '../src/comparator';

const testDataArray = [
    {
        id: 1,
        name: 'should throw error if file1 not found',
        actual: 'test-data/actual/non-existing.png',
        expected: 'test-data/expected/youtube-play-button.png',
    },
    {
        id: 2,
        name: 'should throw error if file2 not found',
        actual: 'test-data/actual/ILTQq.png',
        expected: 'test-data/expected/non-existing.png',
    },
];

for (const testData of testDataArray) {
    test(`${testData.name}`, async () => {
        const diffPath = `test-results/diffs/diff_${testData.id}.png`;
        expect(() => {
            Comparator.comparePngFiles(testData.actual, testData.expected, [], diffPath);
        }).toThrow(Error);
    });
}
