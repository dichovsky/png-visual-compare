import { resolve } from 'path';
import { Comparator } from '../src/comparator';

const testDataArray = [
    {
        id: 1,
        name: 'should throw error if file1 not found',
        actual: resolve('test-data/actual/non-existing.png'),
        expected: resolve('test-data/expected/youtube-play-button.png'),
    },
    {
        id: 2,
        name: 'should throw error if file2 not found',
        actual: resolve('test-data/actual/ILTQq.png'),
        expected: resolve('test-data/expected/non-existing.png'),
    },
];

for (const testData of testDataArray) {
    test(`${testData.name}`, async () => {
        expect(() => {
            Comparator.comparePngFiles(testData.actual, testData.expected, []);
        }).toThrow(Error);
    });
}
