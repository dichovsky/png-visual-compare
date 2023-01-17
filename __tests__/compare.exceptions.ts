import { resolve } from 'path';
import { PNG } from 'pngjs';
import comparePng from '../src';

const testDataArrayInvalidSingle: { id: number; name: string; actual: string; expected: string }[] = [
  {
    id: 1,
    name: 'file1 not found',
    actual: resolve('test-data/actual/non-existing.png'),
    expected: resolve('test-data/expected/youtube-play-button.png'),
  },
  {
    id: 2,
    name: 'file2 not found',
    actual: resolve('test-data/actual/ILTQq.png'),
    expected: resolve('test-data/expected/non-existing.png'),
  },
  {
    id: 3,
    name: 'file1 has invalid data type',
    actual: new PNG() as unknown as string,
    expected: resolve('test-data/expected/youtube-play-button.png'),
  },
  {
    id: 4,
    name: 'file2 has invalid data typ',
    actual: resolve('test-data/expected/youtube-play-button.png'),
    expected: new PNG() as unknown as string,
  },
];

for (const testData of testDataArrayInvalidSingle) {
  test(`should throw error if ${testData.name}`, async () => {
    expect(() => comparePng(testData.actual, testData.expected, { throwErrorOnInvalidInputData: true })).toThrow(Error);
  });

  test(`should throw error if ${testData.name}, default props`, async () => {
    expect(() => comparePng(testData.actual, testData.expected)).toThrow(Error);
  });

  test(`should NOT throw error if ${testData.name}, throwErrorOnInvalidInputData is disabled`, async () => {
    expect(() => comparePng(testData.actual, testData.expected, { throwErrorOnInvalidInputData: false })).not.toThrow(
      Error,
    );
  });
}

const testDataArrayInvalidBoth: {
  id: number;
  name: string;
  actual: string;
  expected: string;
  throwErrorOnInvalidInputData: boolean;
}[] = [
  {
    id: 1,
    name: 'both files not found, throwErrorOnInvalidInputData set to false',
    actual: resolve('test-data/actual/non-existing.png'),
    expected: resolve('test-data/actual/non-existing.png'),
    throwErrorOnInvalidInputData: false,
  },
  {
    id: 2,
    name: 'both files not found, throwErrorOnInvalidInputData set to true',
    actual: resolve('test-data/actual/ILTQq.png'),
    expected: resolve('test-data/expected/non-existing.png'),
    throwErrorOnInvalidInputData: true,
  },
  {
    id: 3,
    name: 'both files are invalid, throwErrorOnInvalidInputData set to false',
    actual: new PNG() as unknown as string,
    expected: new PNG() as unknown as string,
    throwErrorOnInvalidInputData: false,
  },
  {
    id: 4,
    name: 'both files are invalid, throwErrorOnInvalidInputData set to true',
    actual: new PNG() as unknown as string,
    expected: new PNG() as unknown as string,
    throwErrorOnInvalidInputData: true,
  },
];

for (const testData of testDataArrayInvalidBoth) {
  test(`should NOT throw error if ${testData.name}`, async () => {
    expect(() =>
      comparePng(testData.actual, testData.expected, {
        throwErrorOnInvalidInputData: testData.throwErrorOnInvalidInputData,
      }),
    ).toThrow(Error);
  });
}
