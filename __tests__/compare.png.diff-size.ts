import { readFileSync } from 'fs';
import { parse, resolve } from 'path';
import { PNG } from 'pngjs';
import comparePng from '../src';

test(`compare different PNG files with image, diff size`, async () => {
  const actual: string = resolve('./test-data/actual/budweiser640x862.png');
  const expected: string = resolve('./test-data/expected/water1500x600.png');

  const diffFilePath: string = resolve(
    `test-results/diffs/compare.png.diffs.size/${parse(actual).base}_${parse(expected).base}/diff_threshold.png`,
  );

  comparePng(actual, expected, { diffFilePath });

  const { width, height } = PNG.sync.read(readFileSync(diffFilePath));

  expect(width).toEqual(1500);
  expect(height).toEqual(862);
});
