import { resolve } from 'path';
import { PNG } from 'pngjs';
import { expect, test, vi } from 'vitest';
import { comparePngAsync, InvalidInputError, PathValidationError, ResourceLimitError } from '../src';
import type { ValidatedPath } from '../src/types/validated-path';
import { validatePath } from '../src/validatePath';

function createPngBuffer(width: number, height: number): Buffer {
    const png = new PNG({ width, height, fill: true });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 255;
        png.data[i + 3] = 255;
    }
    return PNG.sync.write(png);
}

async function expectThrownAs(fn: () => Promise<void>, errorClass: typeof Error, message?: string): Promise<void> {
    try {
        await fn();
        throw new Error('Expected function to throw');
    } catch (error) {
        expect(error).toBeInstanceOf(errorClass);
        if (message) {
            expect((error as Error).message).toContain(message);
        }
    }
}

function acceptValidatedPath(path: ValidatedPath): void {
    void path;
}

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
        name: 'file2 has invalid data type',
        actual: resolve('./test-data/expected/youtube-play-button.png'),
        expected: new PNG() as unknown as string,
    },
];

for (const testData of testDataArrayInvalidSingle) {
    test(`[async] should throw error if ${testData.name}`, async () => {
        await expectThrownAs(
            () => comparePngAsync(testData.actual, testData.expected, { throwErrorOnInvalidInputData: true }),
            InvalidInputError,
        );
    });

    test(`[async] should throw error if ${testData.name}, default props`, async () => {
        await expectThrownAs(() => comparePngAsync(testData.actual, testData.expected), InvalidInputError);
    });

    test(`[async] should NOT throw error if ${testData.name}, throwErrorOnInvalidInputData is disabled`, async () => {
        await expect(comparePngAsync(testData.actual, testData.expected, { throwErrorOnInvalidInputData: false })).resolves.toBeDefined();
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
    test(`[async] should throw InvalidInputError if ${testData.name}`, async () => {
        await expectThrownAs(
            () =>
                comparePngAsync(testData.actual, testData.expected, {
                    throwErrorOnInvalidInputData: testData.throwErrorOnInvalidInputData,
                }),
            InvalidInputError,
        );
    });
}

const validPng = resolve('./test-data/actual/youtube-play-button.png');

const testDataArrayOptionValidation: {
    id: number;
    name: string;
    opts: Parameters<typeof comparePngAsync>[2];
    throws: true | false;
    errorPattern?: string;
    errorClass?: typeof Error;
}[] = [
    {
        id: 1,
        name: 'diffFilePath with null byte (VUL-01)',
        opts: { diffFilePath: 'diff\0.png' },
        throws: true,
        errorPattern: 'null bytes',
        errorClass: PathValidationError,
    },
    {
        id: 2,
        name: 'diffFilePath non-string value',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { diffFilePath: 42 as any },
        throws: true,
        errorPattern: 'diffFilePath must be a string',
        errorClass: TypeError,
    },
    {
        id: 3,
        name: 'maxDimension too small for 920x512 test image (VUL-04)',
        opts: { maxDimension: 100 },
        throws: true,
        errorPattern: 'exceed the maximum allowed size',
        errorClass: ResourceLimitError,
    },
    {
        id: 4,
        name: 'maxDimension NaN is rejected',
        opts: { maxDimension: NaN },
        throws: true,
        errorPattern: 'maxDimension must be a positive integer or Infinity',
        errorClass: TypeError,
    },
    {
        id: 5,
        name: 'maxDimension negative integer is rejected',
        opts: { maxDimension: -1 },
        throws: true,
        errorPattern: 'maxDimension must be a positive integer or Infinity',
        errorClass: TypeError,
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
    {
        id: 9,
        name: 'diffFilePath traverses above diffOutputBaseDir (VUL-01)',
        opts: {
            diffFilePath: resolve('./test-data/actual/../../../etc/passwd'),
            diffOutputBaseDir: resolve('./test-data/actual'),
        },
        throws: true,
        errorPattern: 'Path traversal detected',
        errorClass: PathValidationError,
    },
    {
        id: 10,
        name: 'diffFilePath inside diffOutputBaseDir is accepted',
        opts: {
            diffFilePath: resolve('./test-data/actual/diff.png'),
            diffOutputBaseDir: resolve('./test-data/actual'),
        },
        throws: false,
    },
    {
        id: 11,
        name: 'diffFilePath cannot be an existing directory',
        opts: {
            diffFilePath: resolve('./test-data/actual'),
            diffOutputBaseDir: resolve('./test-data'),
        },
        throws: true,
        errorPattern: 'output path must not be an existing directory',
        errorClass: PathValidationError,
    },
    {
        id: 12,
        name: 'diffOutputBaseDir non-string value',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { diffOutputBaseDir: 42 as any },
        throws: true,
        errorPattern: 'diffOutputBaseDir must be a string',
        errorClass: TypeError,
    },
    {
        id: 13,
        name: 'inputBaseDir non-string value',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { inputBaseDir: 42 as any },
        throws: true,
        errorPattern: 'inputBaseDir must be a string',
        errorClass: TypeError,
    },
    {
        id: 14,
        name: 'inputBaseDir rejects png1 path outside allowed directory (VUL-02)',
        opts: { inputBaseDir: resolve('./test-data/expected') },
        throws: true,
        errorPattern: 'Path traversal detected',
        errorClass: PathValidationError,
    },
    {
        id: 15,
        name: 'inputBaseDir rejects png1 path outside allowed directory even when invalid inputs are tolerated',
        opts: { inputBaseDir: resolve('./test-data/expected'), throwErrorOnInvalidInputData: false },
        throws: true,
        errorPattern: 'Path traversal detected',
        errorClass: PathValidationError,
    },
    {
        id: 16,
        name: 'inputBaseDir accepts png paths inside allowed directory',
        opts: { inputBaseDir: resolve('./test-data/actual') },
        throws: false,
    },
    {
        id: 17,
        name: 'excludedAreas float coordinate is rejected',
        opts: { excludedAreas: [{ x1: 1.5, y1: 0, x2: 10, y2: 10 }] },
        throws: true,
        errorPattern: 'excludedAreas[0]: coordinates must be finite integers',
        errorClass: InvalidInputError,
    },
    {
        id: 18,
        name: 'excludedAreas NaN coordinate is rejected',
        opts: { excludedAreas: [{ x1: Number.NaN, y1: 0, x2: 10, y2: 10 }] },
        throws: true,
        errorPattern: 'excludedAreas[0]: coordinates must be finite integers',
        errorClass: InvalidInputError,
    },
    {
        id: 19,
        name: 'excludedAreas Infinity coordinate is rejected',
        opts: { excludedAreas: [{ x1: Number.POSITIVE_INFINITY, y1: 0, x2: 10, y2: 10 }] },
        throws: true,
        errorPattern: 'excludedAreas[0]: coordinates must be finite integers',
        errorClass: InvalidInputError,
    },
    {
        id: 20,
        name: 'excludedAreas reversed x coordinate is rejected',
        opts: { excludedAreas: [{ x1: 10, y1: 0, x2: 5, y2: 10 }] },
        throws: true,
        errorPattern: 'excludedAreas[0]: x1 must be <= x2',
        errorClass: InvalidInputError,
    },
    {
        id: 21,
        name: 'excludedAreas reversed y coordinate is rejected',
        opts: { excludedAreas: [{ x1: 0, y1: 10, x2: 10, y2: 5 }] },
        throws: true,
        errorPattern: 'excludedAreas[0]: y1 must be <= y2',
        errorClass: InvalidInputError,
    },
    {
        id: 22,
        name: 'excludedAreas valid rectangle is accepted',
        opts: { excludedAreas: [{ x1: 0, y1: 0, x2: 10, y2: 10 }] },
        throws: false,
    },
    {
        id: 23,
        name: 'excludedAreas must be an array when provided',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { excludedAreas: 'nope' as any },
        throws: true,
        errorPattern: 'opts.excludedAreas must be an array when provided',
        errorClass: InvalidInputError,
    },
    {
        id: 24,
        name: 'excludedAreas null is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { excludedAreas: null as any },
        throws: true,
        errorPattern: 'opts.excludedAreas must be an array when provided',
        errorClass: InvalidInputError,
    },
    {
        id: 25,
        name: 'excludedAreas null entry is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { excludedAreas: [null] as any },
        throws: true,
        errorPattern: 'excludedAreas[0]: area must be an object with x1, y1, x2, y2 coordinates',
        errorClass: InvalidInputError,
    },
    {
        id: 26,
        name: 'excludedAreas bigint coordinate is rejected',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        opts: { excludedAreas: [{ x1: BigInt(0), y1: 0, x2: 10, y2: 10 }] as any },
        throws: true,
        errorPattern: 'excludedAreas[0]: coordinates must be finite integers',
        errorClass: InvalidInputError,
    },
    {
        id: 27,
        name: 'maxPixels NaN is rejected',
        opts: { maxPixels: NaN },
        throws: true,
        errorPattern: 'maxPixels must be a positive integer or Infinity',
        errorClass: TypeError,
    },
];

for (const testData of testDataArrayOptionValidation) {
    if (testData.throws) {
        test(`[async] should throw for option validation: ${testData.name}`, async () => {
            await expectThrownAs(
                () => comparePngAsync(validPng, validPng, testData.opts),
                testData.errorClass ?? Error,
                testData.errorPattern,
            );
        });
    } else {
        test(`[async] should not throw for option validation: ${testData.name}`, async () => {
            await expect(comparePngAsync(validPng, validPng, testData.opts)).resolves.toBeDefined();
        });
    }
}

const testDataArrayMaxPixels = [
    {
        id: 1,
        name: 'rejects image with dimension within maxDimension but pixel count exceeding maxPixels',
        actual: createPngBuffer(200, 200),
        expected: createPngBuffer(200, 200),
        opts: { maxDimension: 1000, maxPixels: 100 },
        errorPattern: 'Image pixel count (40000) exceeds the maximum allowed 100 pixels',
    },
    {
        id: 2,
        name: 'rejects normalized canvas that exceeds maxPixels even when individual images do not',
        actual: createPngBuffer(100, 1),
        expected: createPngBuffer(1, 100),
        opts: { maxDimension: 1000, maxPixels: 100 },
        errorPattern: 'Normalized canvas pixel count (10000) exceeds the maximum allowed 100 pixels',
    },
];

for (const testData of testDataArrayMaxPixels) {
    test(`[async] ${testData.name}`, async () => {
        await expectThrownAs(
            () => comparePngAsync(testData.actual, testData.expected, testData.opts),
            ResourceLimitError,
            testData.errorPattern,
        );
    });
}

test('[async] accepts image at exactly maxPixels', async () => {
    const png = createPngBuffer(100, 100);

    await expect(comparePngAsync(png, png, { maxPixels: 10000 })).resolves.toBeDefined();
});

test('[async] validatePath result is accepted by validated-path-only internals without a cast', () => {
    const validatedPath = validatePath(validPng);

    acceptValidatedPath(validatedPath);
    // @ts-expect-error raw strings are not assignable to ValidatedPath.
    acceptValidatedPath(validPng);
});

test('[async] throws InvalidInputError for a valid-but-zero-dimension PNG buffer', async () => {
    const readSpy = vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => new PNG({ width: 0, height: 0 }));

    try {
        await expectThrownAs(
            () => comparePngAsync(Buffer.alloc(24), createPngBuffer(1, 1)),
            InvalidInputError,
            'Invalid PNG input: image has zero dimensions',
        );
    } finally {
        readSpy.mockRestore();
    }
});

test('[async] with throwErrorOnInvalidInputData=false, zero-dimension PNG is treated as invalid', async () => {
    const validPngBuffer = createPngBuffer(1, 1);
    const originalRead = PNG.sync.read;
    let readCount = 0;
    const readSpy = vi.spyOn(PNG.sync, 'read').mockImplementation((buffer, options) => {
        readCount += 1;
        if (readCount === 1 || readCount === 3 || readCount === 4) {
            return new PNG({ width: 0, height: 0 });
        }
        return originalRead.call(PNG.sync, buffer, options);
    });

    try {
        await expect(comparePngAsync(Buffer.alloc(24), validPngBuffer, { throwErrorOnInvalidInputData: false })).resolves.toBeDefined();
        await expectThrownAs(
            () => comparePngAsync(Buffer.alloc(24), Buffer.alloc(24), { throwErrorOnInvalidInputData: false }),
            InvalidInputError,
            'Unknown PNG files input type',
        );
    } finally {
        readSpy.mockRestore();
    }
});
