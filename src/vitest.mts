/**
 * @sideEffect Registers a `toMatchPngSnapshot` matcher on Vitest's `expect`.
 */
import { chai, expect } from 'vitest';
import type { MatcherState } from 'vitest';
import { createPngSnapshotMatcher } from './matchers/createPngSnapshotMatcher.js';
import { buildSnapshotTestName, compareAgainstSerializedPngSnapshot, type PngSnapshotMatcherArgs } from './matchers/pngSnapshot.js';
import type { ComparePngOptions } from './types/index.js';

declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Assertion<T = any> {
        toMatchPngSnapshot(opts?: ComparePngOptions): T;
        toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): T;
    }

    interface AsymmetricMatchersContaining {
        toMatchPngSnapshot(opts?: ComparePngOptions): void;
        toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): void;
    }
}

const VITEST_PNG_SNAPSHOT_MATCHER_KEY = Symbol.for('png-visual-compare/vitest/toMatchPngSnapshot');

type VitestTestLike = {
    id: string;
};

type VitestExpectedSnapshot = {
    count: number;
    data?: string;
    key: string;
    markAsChecked: () => void;
};

type VitestSnapshotReturn = {
    actual: string;
    expected?: string;
    key: string;
    pass: boolean;
};

type VitestSnapshotState = {
    probeExpectedSnapshot: (options: {
        inlineSnapshot?: string;
        isInline: boolean;
        testId: string;
        testName: string;
    }) => VitestExpectedSnapshot;
    processDomainSnapshot: (options: {
        assertionName: string;
        error?: Error;
        expectedSnapshot: VitestExpectedSnapshot;
        isInline: boolean;
        matchResult?: {
            expected?: string;
            pass: boolean;
            resolved?: string;
        };
        received: string;
        testId: string;
    }) => VitestSnapshotReturn;
};

type MatcherStateWithSnapshot = MatcherState & {
    error?: Error;
    snapshotState?: VitestSnapshotState | null;
};

function getVitestTest(matcherContext: MatcherState): VitestTestLike {
    const test = chai.util.flag(matcherContext.assertion, 'vitest-test') as VitestTestLike | undefined;

    if (test === undefined) {
        throw new Error('Vitest test context must be initialized before calling toMatchPngSnapshot().');
    }

    return test;
}

function getAssertionName(matcherContext: MatcherState): string {
    const assertionName = chai.util.flag(matcherContext.assertion, '_name');

    if (typeof assertionName !== 'string' || assertionName.length === 0) {
        throw new Error('Vitest assertion name must be initialized before calling toMatchPngSnapshot().');
    }

    return assertionName;
}

const toMatchPngSnapshot = createPngSnapshotMatcher((matcherContext: unknown, received: Buffer, args: PngSnapshotMatcherArgs) => {
    const context = matcherContext as MatcherStateWithSnapshot;

    if (context.snapshotState == null) {
        throw new Error('Snapshot state must be initialized before calling toMatchPngSnapshot().');
    }

    const test = getVitestTest(context);
    const expectedSnapshot = context.snapshotState.probeExpectedSnapshot({
        testId: test.id,
        testName: buildSnapshotTestName(context.currentTestName, args.hint, ' > '),
        isInline: false,
    });

    expectedSnapshot.markAsChecked();

    const comparison =
        expectedSnapshot.data === undefined
            ? undefined
            : compareAgainstSerializedPngSnapshot(received, expectedSnapshot.data, args.options);
    const result = context.snapshotState.processDomainSnapshot({
        assertionName: getAssertionName(context),
        error: context.error,
        expectedSnapshot,
        isInline: false,
        matchResult:
            comparison === undefined
                ? undefined
                : {
                      pass: comparison.pass,
                      resolved: comparison.actualSerialized,
                      expected: comparison.expectedSerialized,
                  },
        received: comparison?.actualSerialized ?? JSON.stringify(received, null, 2),
        testId: test.id,
    });

    return {
        pass: result.pass,
        actual: result.actual.trim(),
        expected: result.expected?.trim(),
        message: () => `Snapshot \`${result.key}\` mismatched`,
    };
});

if ((globalThis as Record<PropertyKey, unknown>)[VITEST_PNG_SNAPSHOT_MATCHER_KEY] !== true) {
    expect.extend({ toMatchPngSnapshot });
    (globalThis as Record<PropertyKey, unknown>)[VITEST_PNG_SNAPSHOT_MATCHER_KEY] = true;
}

export {};
