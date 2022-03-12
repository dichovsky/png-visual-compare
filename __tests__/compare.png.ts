import { readFileSync } from 'fs';
import { resolve } from 'path';
import comparePng, { Area } from '../src';

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
    actual: resolve('test-data/actual/pnggrad16rgb.png'),
    expected: resolve('test-data/expected/pnggrad16rgb.png'),
    excludedAreas: [],
  },
  {
    id: 2,
    name: 'compare PNG with image',
    actual: resolve('test-data/actual/youtube-play-button.png'),
    expected: resolve('test-data/expected/youtube-play-button.png'),
    excludedAreas: [],
  },
  {
    id: 3,
    name: 'compare PNG with image',
    actual: resolve('test-data/actual/ILTQq.png'),
    expected: resolve('test-data/expected/ILTQq.png'),
    excludedAreas: [],
  },
  {
    id: 4,
    name: 'compare different files with excluded area',
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
  test(`${testData.name}, file`, async () => {
    const result: boolean =
      comparePng(testData.actual, testData.expected, {
        excludedAreas: testData.excludedAreas,
        excludedAreaColor: { r: 42, g: 42, b: 42 },
        matchingThreshold: 0.5,
      }) === 0;

    expect(result).toBe(true);
  });

  test(`${testData.name}, PNG`, async () => {
    const result: boolean =
      comparePng(readFileSync(testData.actual), readFileSync(testData.expected), {
        excludedAreas: testData.excludedAreas,
      }) === 0;

    expect(result).toBe(true);
  });
}
