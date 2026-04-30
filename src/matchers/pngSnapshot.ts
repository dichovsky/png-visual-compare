import { Buffer } from 'node:buffer';
import { comparePng } from '../comparePng';
import type { ComparePngOptions } from '../types';

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type PngSnapshotMatcherArgs = {
    hint?: string;
    options?: ComparePngOptions;
};

type NormalizedMatcherArgsResult =
    | {
          args: PngSnapshotMatcherArgs;
      }
    | {
          errorMessage: string;
      };

type SerializedPngSnapshot = {
    data: number[];
    type: 'Buffer';
};

export type ComparedPngSnapshot = {
    pass: boolean;
    mismatchedPixels: number;
    actualSerialized: string;
    expectedSerialized: string;
};

function hasPngSignature(value: Uint8Array): boolean {
    if (value.byteLength < PNG_SIGNATURE.length) {
        return false;
    }

    for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
        if (value[index] !== PNG_SIGNATURE[index]) {
            return false;
        }
    }

    return true;
}

function isComparePngOptions(value: unknown): value is ComparePngOptions {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSerializedPngSnapshot(value: unknown): value is SerializedPngSnapshot {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    const { data, type } = value as Partial<SerializedPngSnapshot>;

    return type === 'Buffer' && Array.isArray(data) && data.every((item) => Number.isInteger(item) && item >= 0 && item <= 255);
}

export function normalizePngSnapshotMatcherArgs(
    hintOrOptions?: string | ComparePngOptions,
    options?: ComparePngOptions,
): NormalizedMatcherArgsResult {
    if (typeof hintOrOptions === 'string') {
        if (options !== undefined && !isComparePngOptions(options)) {
            return {
                errorMessage: 'The second argument to toMatchPngSnapshot() must be a ComparePngOptions object when provided.',
            };
        }

        return {
            args: {
                hint: hintOrOptions,
                options,
            },
        };
    }

    if (hintOrOptions !== undefined && !isComparePngOptions(hintOrOptions)) {
        return {
            errorMessage: 'toMatchPngSnapshot() expects either a snapshot hint string or a ComparePngOptions object as the first argument.',
        };
    }

    if (options !== undefined) {
        return {
            errorMessage: 'toMatchPngSnapshot() accepts ComparePngOptions as the first argument unless a snapshot hint string is provided.',
        };
    }

    return {
        args: {
            options: hintOrOptions,
        },
    };
}

export function buildSnapshotTestName(testName: string | undefined, hint: string | undefined, separator: string): string {
    return [testName, hint].filter((part): part is string => part !== undefined && part !== '').join(separator);
}

export function serializePngSnapshot(received: Buffer): string {
    return JSON.stringify(received, null, 2);
}

export function parseSerializedPngSnapshot(serializedSnapshot: string): Buffer {
    let parsedSnapshot: unknown;

    try {
        parsedSnapshot = JSON.parse(serializedSnapshot.trim().replaceAll(/,(\s*[\]}])/g, '$1'));
    } catch {
        throw new Error('Stored PNG snapshot is not a valid serialized Buffer.');
    }

    if (!isSerializedPngSnapshot(parsedSnapshot)) {
        throw new Error('Stored PNG snapshot must be a serialized Buffer.');
    }

    const snapshotBuffer = Buffer.from(parsedSnapshot.data);

    if (!hasPngSignature(snapshotBuffer)) {
        throw new Error('Stored PNG snapshot is not a valid PNG Buffer.');
    }

    return snapshotBuffer;
}

export function compareAgainstSerializedPngSnapshot(
    received: Buffer,
    serializedExpectedSnapshot: string,
    options?: ComparePngOptions,
): ComparedPngSnapshot {
    const expectedSnapshot = parseSerializedPngSnapshot(serializedExpectedSnapshot);
    const mismatchedPixels = comparePng(received, expectedSnapshot, options);

    return {
        pass: mismatchedPixels === 0,
        mismatchedPixels,
        actualSerialized: serializePngSnapshot(received),
        expectedSerialized: serializePngSnapshot(expectedSnapshot),
    };
}
