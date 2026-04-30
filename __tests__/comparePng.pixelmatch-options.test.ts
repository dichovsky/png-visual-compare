import { existsSync, readFileSync } from 'fs';
import { parse, resolve } from 'path';
import { expect, test } from 'vitest';
import '../src/vitest.mjs';
import { comparePng, InvalidInputError } from '../src';

function expectInvalidInputError(fn: () => void, message?: string): void {
    try {
        fn();
        throw new Error('Expected function to throw');
    } catch (error) {
        expect(error).toBeInstanceOf(InvalidInputError);
        if (message) {
            expect((error as Error).message).toContain(message);
        }
    }
}

test(`compare different PNG files, threshold is specified`, async () => {
    const actual: string = resolve('./test-data/actual/ILTQq copy.png');
    const expected: string = resolve('./test-data/expected/ILTQq copy.png');

    const diffFilePath: string = resolve(
        `./test-results/diffs/compare.png.diffs.threshold/${parse(actual).base}_${parse(expected).base}/diff_threshold.png`,
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

    expect(readFileSync(diffFilePath)).toMatchPngSnapshot();
});

const testDataArrayPixelmatchValidation: {
    id: number;
    name: string;
    pixelmatchOptions: NonNullable<Parameters<typeof comparePng>[2]>['pixelmatchOptions'];
    throws: boolean;
    message?: string;
}[] = [
    {
        id: 1,
        name: 'threshold below range',
        pixelmatchOptions: { threshold: -0.1 },
        throws: true,
        message: 'pixelmatchOptions.threshold must be a number in [0, 1]',
    },
    {
        id: 2,
        name: 'threshold above range',
        pixelmatchOptions: { threshold: 1.1 },
        throws: true,
        message: 'pixelmatchOptions.threshold must be a number in [0, 1]',
    },
    {
        id: 3,
        name: 'threshold inside range',
        pixelmatchOptions: { threshold: 0.5 },
        throws: false,
    },
    {
        id: 4,
        name: 'alpha above range',
        pixelmatchOptions: { alpha: 1.5 },
        throws: true,
        message: 'pixelmatchOptions.alpha must be a number in [0, 1]',
    },
    {
        id: 5,
        name: 'aaColor wrong length',
        pixelmatchOptions: { aaColor: [255, 0] as unknown as [number, number, number] },
        throws: true,
        message: 'pixelmatchOptions.aaColor must be a tuple of 3 integers in [0, 255]',
    },
    {
        id: 6,
        name: 'aaColor channel above range',
        pixelmatchOptions: { aaColor: [255, 0, 300] },
        throws: true,
        message: 'pixelmatchOptions.aaColor channel values must be integers in [0, 255]',
    },
    {
        id: 7,
        name: 'aaColor valid tuple',
        pixelmatchOptions: { aaColor: [255, 0, 0] },
        throws: false,
    },
    {
        id: 8,
        name: 'diffColor channel below range',
        pixelmatchOptions: { diffColor: [0, 0, -1] },
        throws: true,
        message: 'pixelmatchOptions.diffColor channel values must be integers in [0, 255]',
    },
    {
        id: 9,
        name: 'threshold NaN is rejected',
        pixelmatchOptions: { threshold: Number.NaN },
        throws: true,
        message: 'pixelmatchOptions.threshold must be a number in [0, 1]',
    },
    {
        id: 10,
        name: 'pixelmatchOptions null is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelmatchOptions: null as any,
        throws: true,
        message: 'pixelmatchOptions must be an object when provided',
    },
    {
        id: 11,
        name: 'pixelmatchOptions array is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelmatchOptions: [] as any,
        throws: true,
        message: 'pixelmatchOptions must be an object when provided',
    },
    {
        id: 12,
        name: 'diffColor bigint channel is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelmatchOptions: { diffColor: [0, 0, BigInt(1)] as any },
        throws: true,
        message: 'pixelmatchOptions.diffColor channel values must be integers in [0, 255]',
    },
    {
        id: 13,
        name: 'includeAA non-boolean is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelmatchOptions: { includeAA: 'yes' as any },
        throws: true,
        message: 'pixelmatchOptions.includeAA must be a boolean',
    },
    {
        id: 14,
        name: 'diffColorAlt valid tuple',
        pixelmatchOptions: { diffColorAlt: [12, 34, 56] },
        throws: false,
    },
];

for (const testData of testDataArrayPixelmatchValidation) {
    test(`pixelmatchOptions validation: ${testData.name}`, () => {
        const actual = resolve('./test-data/actual/ILTQq copy.png');
        const expected = resolve('./test-data/expected/ILTQq copy.png');

        if (testData.throws) {
            expectInvalidInputError(
                () => comparePng(actual, expected, { pixelmatchOptions: testData.pixelmatchOptions }),
                testData.message,
            );
            return;
        }

        expect(() => comparePng(actual, expected, { pixelmatchOptions: testData.pixelmatchOptions })).not.toThrow();
    });
}
