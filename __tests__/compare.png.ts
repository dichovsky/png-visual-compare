import { resolve } from 'path';
import { Area, Comparator } from '../src/comparator';

const testDataArray: {
    id: number;
    name: string;
    actual: string;
    expected: string;
    excludedAreas: Area[];
}[] = [
    {
        id: 1,
        name: 'compare PNG files with text',
        actual: 'test-data/actual/pnggrad16rgb.png',
        expected: 'test-data/expected/pnggrad16rgb.png',
        excludedAreas: [],
    },
    {
        id: 2,
        name: 'compare PNG files with image',
        actual: 'test-data/actual/youtube-play-button.png',
        expected: 'test-data/expected/youtube-play-button.png',
        excludedAreas: [],
    },
    {
        id: 3,
        name: 'compare PNG files with image',
        actual: 'test-data/actual/ILTQq.png',
        expected: 'test-data/expected/ILTQq.png',
        excludedAreas: [],
    },
    {
        id: 4,
        name: 'compare different PNG files with excluded area',
        actual: resolve('test-data/actual/ILTQq copy.png'),
        expected: resolve('test-data/expected/ILTQq copy.png'),
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
    test(`${testData.name}`, async () => {
        const diffPath = `test-results/diffs/diff_${testData.id}.png`;
        const result: boolean = Comparator.comparePngFiles(
            testData.actual,
            testData.expected,
            testData.excludedAreas,
            diffPath,
        );
        expect(result).toBe(true);
    });
}
