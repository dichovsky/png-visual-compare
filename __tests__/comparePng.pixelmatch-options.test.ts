import { existsSync, readFileSync } from 'fs';
import { parse, resolve } from 'path';
import { expect, test } from 'vitest';
import comparePng from '../out';

test(`compare different PNG files, threshold is specified`, async () => {
    const actual: string = resolve('./test-data/actual/ILTQq copy.png');
    const expected: string = resolve('./test-data/expected/ILTQq copy.png');

    const diffFilePath: string = resolve(
        `./test-results/diffs/compare.png.diffs.threshold/${parse(actual).base}_${
            parse(expected).base
        }/diff_threshold.png`,
    );

    expect(existsSync(diffFilePath)).toBe(false);

    const result: number = comparePng(actual, expected, { diffFilePath, pixelmatchOptions: { threshold: 0.97 } });

    expect(result).toBe(0);
    expect(existsSync(diffFilePath)).toBe(false);
});

test(`compare different PNG files, diff color is specified`, async () => {
    const actual: string = resolve('./test-data/actual/ILTQq copy.png');
    const expected: string = resolve('./test-data/expected/ILTQq copy.png');

    const diffFilePath: string = resolve(
        `./test-results/diffs/compare.png.diffs.color/${parse(actual).base}_${parse(expected).base}/diff_threshold.png`,
    );
    comparePng(actual, expected, { diffFilePath, pixelmatchOptions: { diffColor: [100, 100, 100] } });

    expect(readFileSync(diffFilePath)).toMatchSnapshot();
});
