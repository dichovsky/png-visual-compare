/**
 * @sideEffect Registers a `toMatchPngSnapshot` matcher on Jest's global `expect` when present, and augments the global `jest.Matchers` interface.
 */
import { existsSync } from 'node:fs';
import type { ComparePngOptions } from './types';
import { createPngSnapshotMatcher } from './matchers/createPngSnapshotMatcher';
import { buildSnapshotTestName, compareAgainstSerializedPngSnapshot, serializePngSnapshot } from './matchers/pngSnapshot';

const JEST_PNG_SNAPSHOT_MATCHER_KEY = Symbol.for('png-visual-compare/jest/toMatchPngSnapshot');

type ExpectLike = {
    extend: (matchers: Record<string, unknown>) => void;
};

type SnapshotStateLike = {
    added?: number;
    expand?: boolean;
    matched?: number;
    unmatched?: number;
    updated?: number;
    markSnapshotsAsCheckedForTest?: (testName: string) => void;
    [key: string]: unknown;
};

type JestMatcherContext = {
    currentConcurrentTestName?: () => string | undefined;
    currentTestName?: string;
    error?: Error;
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

function getSnapshotPath(snapshotState: SnapshotStateLike): string | undefined {
    const snapshotPath = snapshotState._snapshotPath;
    return typeof snapshotPath === 'string' ? snapshotPath : undefined;
}

function setSnapshotDirty(snapshotState: SnapshotStateLike): void {
    snapshotState._dirty = true;
}

function incrementSnapshotCounter(snapshotState: SnapshotStateLike, field: 'added' | 'matched' | 'unmatched' | 'updated'): void {
    const currentValue = snapshotState[field];
    snapshotState[field] = typeof currentValue === 'number' ? currentValue + 1 : 1;
}

function resolveSnapshotKey(snapshotState: SnapshotStateLike, testName: string): { count: number; key: string } {
    const counters = getSnapshotCounters(snapshotState);
    const count = (counters.get(testName) ?? 0) + 1;
    counters.set(testName, count);
    return {
        count,
        key: `${testName} ${count}`,
    };
}

function createJestMismatchMessage(testName: string, mismatchedPixels: number): string {
    const mismatchLabel = `${mismatchedPixels} mismatched pixel${mismatchedPixels === 1 ? '' : 's'}`;
    return testName === ''
        ? `Received PNG snapshot does not match the stored snapshot (${mismatchLabel}).`
        : `Received PNG snapshot does not match the stored snapshot for "${testName}" (${mismatchLabel}).`;
}

function createJestMissingSnapshotMessage(testName: string): string {
    return testName === ''
        ? 'New PNG snapshot was not written. Run Jest with -u to create it.'
        : `New PNG snapshot was not written for "${testName}". Run Jest with -u to create it.`;
}

function persistJestSnapshot(snapshotState: SnapshotStateLike, key: string, serializedSnapshot: string): void {
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
    const { key } = resolveSnapshotKey(snapshotState, testName);
    getUncheckedKeys(snapshotState).delete(key);
    snapshotState.markSnapshotsAsCheckedForTest?.(testName);
    const snapshotData = getSnapshotData(snapshotState);
    const storedSnapshot = snapshotData[key];
    const updateSnapshot = getUpdateSnapshotMode(snapshotState);
    const snapshotPath = getSnapshotPath(snapshotState);
    const snapshotIsPersisted = storedSnapshot !== undefined || (snapshotPath !== undefined && existsSync(snapshotPath));

    if (storedSnapshot !== undefined) {
        const comparison = compareAgainstSerializedPngSnapshot(received, storedSnapshot, args.options);

        if (comparison.pass) {
            incrementSnapshotCounter(snapshotState, 'matched');
            return {
                pass: true,
                message: () => '',
            };
        }

        if (updateSnapshot === 'all') {
            persistJestSnapshot(snapshotState, key, comparison.actualSerialized);
            incrementSnapshotCounter(snapshotState, 'updated');
            return {
                pass: true,
                message: () => '',
            };
        }

        incrementSnapshotCounter(snapshotState, 'unmatched');
        return {
            pass: false,
            actual: comparison.actualSerialized,
            expected: comparison.expectedSerialized,
            message: () => createJestMismatchMessage(testName, comparison.mismatchedPixels),
        };
    }

    if ((updateSnapshot === 'new' || updateSnapshot === 'all') && !snapshotIsPersisted) {
        persistJestSnapshot(snapshotState, key, serializePngSnapshot(received));
        incrementSnapshotCounter(snapshotState, 'added');
        return {
            pass: true,
            message: () => '',
        };
    }

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

export {};
