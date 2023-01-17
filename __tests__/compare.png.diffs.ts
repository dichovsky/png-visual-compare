import { existsSync, readFileSync } from 'fs';
import { parse, resolve } from 'path';
import comparePng from '../src';

const testDataArrayValidInput: { id: number; actual: string; expected: string; result: number }[] = [
  {
    id: 1,
    actual: resolve('./test-data/actual/ILTQq.png'),
    expected: resolve('./test-data/expected/youtube-play-button.png'),
    result: 375329,
  },
  {
    id: 2,
    actual: resolve('./test-data/actual/ILTQq copy.png'),
    expected: resolve('./test-data/expected/ILTQq copy.png'),
    result: 479,
  },
  {
    id: 3,
    actual: resolve('./test-data/actual/youtube-play-button.png'),
    expected: resolve('./test-data/expected/pnggrad16rgb.png'),
    result: 506219,
  },
];

for (const testData of testDataArrayValidInput) {
  test(`compare different PNG files with image ${testData.id}`, async () => {
    const diffFilePath: string = resolve(
      `test-results/diffs/compare.png.diffs/${testData.id}/${parse(testData.actual).base}_${
        parse(testData.expected).base
      }/diff_${testData.id}.png`,
    );

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
    result: 470129,
  },
  {
    id: 2,
    actual: resolve('./test-data/expected/youtube-play-button.png'),
    expected: resolve('./test-data/actual/non-existing-file.png'),
    result: 470129,
  },
];

for (const testData of testDataArrayInvalidInput) {
  test(`compare different PNG files with image ${testData.id}, invalid input`, async () => {
    const diffFilePath: string = resolve(
      `test-results/diffs/compare.png.diffs.invalid.input/${testData.id}/${parse(testData.actual).base}_${
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
