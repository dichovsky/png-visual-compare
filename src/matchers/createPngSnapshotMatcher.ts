import type { ComparePngOptions } from '../types';
import { normalizePngSnapshotMatcherArgs, type PngSnapshotMatcherArgs } from './pngSnapshot';

type SnapshotMatcherResult = {
    pass: boolean;
    message: () => string;
    actual?: unknown;
    expected?: unknown;
};

type SnapshotMatcherDelegate = (
    matcherContext: unknown,
    received: Buffer,
    args: PngSnapshotMatcherArgs,
) => SnapshotMatcherResult | Promise<SnapshotMatcherResult>;

type SnapshotMatcherContext = {
    isNot?: boolean;
};

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function describeValue(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (value instanceof Uint8Array) {
        return value.constructor.name;
    }

    return typeof value;
}

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

function toBuffer(value: Uint8Array): Buffer {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export function createPngSnapshotMatcher(delegate: SnapshotMatcherDelegate) {
    return function toMatchPngSnapshot(
        this: SnapshotMatcherContext,
        received: unknown,
        hintOrOptions?: string | ComparePngOptions,
        options?: ComparePngOptions,
    ) {
        if (this.isNot === true) {
            return {
                pass: false,
                message: () => '.not.toMatchPngSnapshot() is not supported.',
            };
        }

        if (!(received instanceof Uint8Array) || !hasPngSignature(received)) {
            return {
                pass: false,
                actual: received,
                expected: 'PNG Buffer or Uint8Array',
                message: () => `toMatchPngSnapshot() expects a PNG Buffer or Uint8Array, but received ${describeValue(received)}.`,
            };
        }

        const normalizedArgs = normalizePngSnapshotMatcherArgs(hintOrOptions, options);

        if ('errorMessage' in normalizedArgs) {
            return {
                pass: false,
                actual: hintOrOptions,
                expected: 'snapshot hint string or ComparePngOptions object',
                message: () => normalizedArgs.errorMessage,
            };
        }

        return delegate(this, toBuffer(received), normalizedArgs.args);
    };
}
