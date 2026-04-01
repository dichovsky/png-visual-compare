import { resolve } from 'path';
import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import { comparePng } from '../src';

const testDataArrayInvalidSingle: { id: number; name: string; actual: string; expected: string }[] = [
    {
        id: 1,
        name: 'file1 not found',
        actual: resolve('./test-data/actual/non-existing.png'),
        expected: resolve('./test-data/expected/youtube-play-button.png'),
    },
    {
        id: 2,
        name: 'file2 not found',
        actual: resolve('./test-data/actual/ILTQq.png'),
        expected: resolve('./test-data/expected/non-existing.png'),
    },
    {
        id: 3,
        name: 'file1 has invalid data type',
        actual: new PNG() as unknown as string,
        expected: resolve('./test-data/expected/youtube-play-button.png'),
    },
    {
        id: 4,
        name: 'file2 has invalid data typ',
        actual: resolve('./test-data/expected/youtube-play-button.png'),
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
        expect(() => comparePng(testData.actual, testData.expected, { throwErrorOnInvalidInputData: false })).not.toThrow(Error);
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
        actual: resolve('./test-data/actual/non-existing.png'),
        expected: resolve('./test-data/actual/non-existing.png'),
        throwErrorOnInvalidInputData: false,
    },
    {
        id: 2,
        name: 'both files not found, throwErrorOnInvalidInputData set to true',
        actual: resolve('./test-data/actual/ILTQq.png'),
        expected: resolve('./test-data/expected/non-existing.png'),
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

// ── Option validation tests (data-driven, consistent with repo conventions) ───
const validPng = resolve('./test-data/actual/youtube-play-button.png');

const testDataArrayOptionValidation: {
    id: number;
    name: string;
    opts: Parameters<typeof comparePng>[2];
    throws: true | false;
    errorPattern?: string | RegExp;
}[] = [
    {
        id: 1,
        name: 'diffFilePath with null byte (VUL-01)',
        opts: { diffFilePath: 'diff\0.png' },
        throws: true,
        errorPattern: 'null bytes',
    },
    {
        id: 2,
        name: 'diffFilePath non-string value',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { diffFilePath: 42 as any },
        throws: true,
        errorPattern: 'diffFilePath must be a string',
    },
    {
        id: 3,
        name: 'maxDimension too small for 920x512 test image (VUL-04)',
        opts: { maxDimension: 100 },
        throws: true,
        errorPattern: 'exceed the maximum allowed size',
    },
    {
        id: 4,
        name: 'maxDimension NaN is rejected',
        opts: { maxDimension: NaN },
        throws: true,
        errorPattern: 'maxDimension must be a positive integer or Infinity',
    },
    {
        id: 5,
        name: 'maxDimension negative integer is rejected',
        opts: { maxDimension: -1 },
        throws: true,
        errorPattern: 'maxDimension must be a positive integer or Infinity',
    },
    {
        id: 6,
        name: 'maxDimension set high enough for test images (1024)',
        opts: { maxDimension: 1024 },
        throws: false,
    },
    {
        id: 7,
        name: 'maxDimension Infinity disables the limit',
        opts: { maxDimension: Infinity },
        throws: false,
    },
    {
        id: 8,
        name: 'default options accept normal test images',
        opts: {},
        throws: false,
    },
];

for (const testData of testDataArrayOptionValidation) {
    if (testData.throws) {
        test(`should throw for option validation: ${testData.name}`, () => {
            expect(() => comparePng(validPng, validPng, testData.opts)).toThrow(testData.errorPattern ?? Error);
        });
    } else {
        test(`should not throw for option validation: ${testData.name}`, () => {
            expect(() => comparePng(validPng, validPng, testData.opts)).not.toThrow();
        });
    }
}
