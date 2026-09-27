/**
 * @sideEffect Registers a `toMatchPngSnapshot` matcher on Jest's global `expect` when present, and augments both global `jest.Matchers` and the `expect` module's `Matchers` interface.
 */
// The production build excludes fixtures that load expect's declarations.
// Import its types so the augmentation resolves (otherwise TS2664); no runtime import is emitted.
import type {} from 'expect';
import type { ComparePngOptions } from './types';
import { createPngSnapshotMatcher } from './matchers/createPngSnapshotMatcher';
import {
    buildSnapshotTestName,
    compareAgainstSerializedPngSnapshot,
    NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE,
    serializePngSnapshot,
    validatePngSnapshot,
} from './matchers/pngSnapshot';

const JEST_PNG_SNAPSHOT_MATCHER_KEY = Symbol.for('png-visual-compare/jest/toMatchPngSnapshot');

type ExpectLike = {
    extend: (matchers: { toMatchPngSnapshot: typeof toMatchPngSnapshot }) => void;
};

type SnapshotCount = 'added' | 'matched' | 'unmatched' | 'updated';

type SnapshotStateLike = {
    added?: number;
    expand?: boolean;
    matched?: number;
    unmatched?: number;
    updated?: number;
    [key: string]: unknown;
};

// Jest 30.5 records what each test attempt changed so `clear(testIdentity)` can undo it
// before a `jest.retryTimes` retry. It only undoes changes made through these methods,
// which were added together in 30.5.0; older versions reset every counter on retry.
type AttemptTrackingSnapshotState = SnapshotStateLike & {
    _addSnapshot: (key: string, serialized: string, options: { isInline: false; testIdentity: unknown }) => void;
    _bumpCounter: (testName: string, testIdentity: unknown) => number;
    _incrementSnapshotCount: (status: SnapshotCount, testIdentity: unknown) => void;
    _markKeyChecked: (key: string, testIdentity: unknown) => void;
};

type JestMatcherContext = {
    currentConcurrentTestName?: () => string | undefined;
    currentTestIdentity?: () => unknown;
    currentTestName?: string;
    error?: Error;
    isNot?: boolean;
    snapshotState?: SnapshotStateLike | null;
    testFailing?: boolean;
};

function addOuterLineBreaks(value: string): string {
    return `\n${value}\n`;
}

function getSnapshotData(snapshotState: SnapshotStateLike): Record<string, string> {
    const snapshotData = snapshotState._snapshotData;

    if (typeof snapshotData !== 'object' || snapshotData === null || Array.isArray(snapshotData)) {
        throw new Error('Snapshot state does not expose snapshot data.');
    }

    return snapshotData as Record<string, string>;
}

function getSnapshotCounters(snapshotState: SnapshotStateLike): Map<string, number> {
    const counters = snapshotState._counters;

    if (!(counters instanceof Map)) {
        throw new Error('Snapshot state does not expose snapshot counters.');
    }

    return counters as Map<string, number>;
}

function getUncheckedKeys(snapshotState: SnapshotStateLike): Set<string> {
    const uncheckedKeys = snapshotState._uncheckedKeys;

    if (!(uncheckedKeys instanceof Set)) {
        throw new Error('Snapshot state does not expose unchecked snapshot keys.');
    }

    return uncheckedKeys as Set<string>;
}

function getUpdateSnapshotMode(snapshotState: SnapshotStateLike): 'all' | 'new' | 'none' {
    const updateSnapshot = snapshotState._updateSnapshot;

    if (updateSnapshot !== 'all' && updateSnapshot !== 'new' && updateSnapshot !== 'none') {
        throw new Error('Snapshot state does not expose updateSnapshot mode.');
    }

    return updateSnapshot;
}

function setSnapshotDirty(snapshotState: SnapshotStateLike): void {
    snapshotState._dirty = true;
}

function tracksAttempts(snapshotState: SnapshotStateLike): snapshotState is AttemptTrackingSnapshotState {
    return typeof snapshotState._bumpCounter === 'function';
}

function incrementSnapshotCounter(
    snapshotState: SnapshotStateLike,
    field: SnapshotCount,
    testFailing: boolean | undefined,
    testIdentity: unknown,
): void {
    // Expected failures compare without contributing to Jest's snapshot failure totals.
    if (testFailing === true) {
        return;
    }

    if (tracksAttempts(snapshotState)) {
        snapshotState._incrementSnapshotCount(field, testIdentity);
        return;
    }

    const currentValue = snapshotState[field];
    snapshotState[field] = typeof currentValue === 'number' ? currentValue + 1 : 1;
}

// Numbers the key and marks it checked, so it is not reported obsolete.
function resolveSnapshotKey(snapshotState: SnapshotStateLike, testName: string, testIdentity: unknown): string {
    if (tracksAttempts(snapshotState)) {
        const key = `${testName} ${snapshotState._bumpCounter(testName, testIdentity)}`;
        snapshotState._markKeyChecked(key, testIdentity);
        return key;
    }

    const counters = getSnapshotCounters(snapshotState);
    const count = (counters.get(testName) ?? 0) + 1;
    counters.set(testName, count);
    const key = `${testName} ${count}`;
    getUncheckedKeys(snapshotState).delete(key);
    return key;
}

function createJestMismatchMessage(testName: string, mismatchedPixels: number): string {
    const mismatchLabel = `${mismatchedPixels} mismatched pixel${mismatchedPixels === 1 ? '' : 's'}`;
    return testName === ''
        ? `Received PNG snapshot does not match the stored snapshot (${mismatchLabel}).`
        : `Received PNG snapshot does not match the stored snapshot for "${testName}" (${mismatchLabel}).`;
}

function createJestNegatedMatchMessage(testName: string): string {
    return testName === ''
        ? 'Received PNG snapshot matches the stored snapshot, but was expected to differ.'
        : `Received PNG snapshot matches the stored snapshot for "${testName}", but was expected to differ.`;
}

function createJestMissingSnapshotMessage(testName: string): string {
    return testName === ''
        ? 'New PNG snapshot was not written. Run Jest with -u to create it.'
        : `New PNG snapshot was not written for "${testName}". Run Jest with -u to create it.`;
}

function persistJestSnapshot(snapshotState: SnapshotStateLike, key: string, serializedSnapshot: string, testIdentity: unknown): void {
    if (tracksAttempts(snapshotState)) {
        snapshotState._addSnapshot(key, addOuterLineBreaks(serializedSnapshot), { isInline: false, testIdentity });
        return;
    }

    getSnapshotData(snapshotState)[key] = addOuterLineBreaks(serializedSnapshot);
    setSnapshotDirty(snapshotState);
}

const toMatchPngSnapshot = createPngSnapshotMatcher((matcherContext, received, args) => {
    const context = matcherContext as JestMatcherContext;

    if (context.snapshotState == null) {
        throw new Error('Snapshot state must be initialized before calling toMatchPngSnapshot().');
    }

    const testName = buildSnapshotTestName(context.currentConcurrentTestName?.() ?? context.currentTestName, args.hint, ': ');
    const snapshotState = context.snapshotState;
    const testIdentity = context.currentTestIdentity?.();
    const key = resolveSnapshotKey(snapshotState, testName, testIdentity);
    const snapshotData = getSnapshotData(snapshotState);
    const storedSnapshot = snapshotData[key];
    const updateSnapshot = getUpdateSnapshotMode(snapshotState);

    // `.not` asserts the received PNG differs from the stored snapshot. It never
    // writes or updates a snapshot, and it returns the raw comparison result:
    // the framework inverts `pass` for the negated assertion.
    if (context.isNot === true) {
        if (storedSnapshot === undefined) {
            throw new Error(NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE);
        }

        const comparison = compareAgainstSerializedPngSnapshot(received, storedSnapshot, args.options);

        if (!comparison.pass) {
            return {
                pass: false,
                message: () => '',
            };
        }

        incrementSnapshotCounter(snapshotState, 'unmatched', context.testFailing, testIdentity);
        return {
            pass: true,
            actual: comparison.actualSerialized,
            expected: comparison.expectedSerialized,
            message: () => createJestNegatedMatchMessage(testName),
        };
    }

    if (storedSnapshot !== undefined) {
        const comparison = compareAgainstSerializedPngSnapshot(received, storedSnapshot, args.options);

        if (comparison.pass) {
            incrementSnapshotCounter(snapshotState, 'matched', context.testFailing, testIdentity);
            return {
                pass: true,
                message: () => '',
            };
        }

        if (updateSnapshot === 'all' && context.testFailing !== true) {
            validatePngSnapshot(received, args.options);
            persistJestSnapshot(snapshotState, key, comparison.actualSerialized, testIdentity);
            incrementSnapshotCounter(snapshotState, 'updated', context.testFailing, testIdentity);
            return {
                pass: true,
                message: () => '',
            };
        }

        incrementSnapshotCounter(snapshotState, 'unmatched', context.testFailing, testIdentity);
        return {
            pass: false,
            actual: comparison.actualSerialized,
            expected: comparison.expectedSerialized,
            message: () => createJestMismatchMessage(testName, comparison.mismatchedPixels),
        };
    }

    if ((updateSnapshot === 'new' || updateSnapshot === 'all') && context.testFailing !== true) {
        validatePngSnapshot(received, args.options);
        persistJestSnapshot(snapshotState, key, serializePngSnapshot(received), testIdentity);
        incrementSnapshotCounter(snapshotState, 'added', context.testFailing, testIdentity);
        return {
            pass: true,
            message: () => '',
        };
    }

    incrementSnapshotCounter(snapshotState, 'unmatched', context.testFailing, testIdentity);
    return {
        pass: false,
        actual: serializePngSnapshot(received),
        expected: undefined,
        message: () => createJestMissingSnapshotMessage(testName),
    };
});

function getGlobalExpect(): ExpectLike | undefined {
    return (globalThis as typeof globalThis & { expect?: ExpectLike }).expect;
}

export function registerJestPngSnapshotMatcher(expect: ExpectLike): void {
    if ((globalThis as Record<PropertyKey, unknown>)[JEST_PNG_SNAPSHOT_MATCHER_KEY] !== true) {
        expect.extend({ toMatchPngSnapshot });
        (globalThis as Record<PropertyKey, unknown>)[JEST_PNG_SNAPSHOT_MATCHER_KEY] = true;
    }
}

const jestExpect = getGlobalExpect();

if (jestExpect !== undefined) {
    registerJestPngSnapshotMatcher(jestExpect);
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
        interface Matchers<R, T = {}> {
            toMatchPngSnapshot(opts?: ComparePngOptions): R;
            toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): R;
        }
    }
}

declare module 'expect' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R extends void | Promise<void>, T = unknown> {
        toMatchPngSnapshot(opts?: ComparePngOptions): R;
        toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): R;
    }
}

export {};
