/**
 * @sideEffect Registers a `toMatchPngSnapshot` matcher on Vitest's `expect`.
 */
import { chai, expect } from 'vitest';
import type { MatcherState } from 'vitest';
import { createPngSnapshotMatcher } from './matchers/createPngSnapshotMatcher.js';
import {
    buildSnapshotTestName,
    compareAgainstSerializedPngSnapshot,
    NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE,
    validatePngSnapshot,
    type PngSnapshotMatcherArgs,
} from './matchers/pngSnapshot.js';
import type { ComparePngOptions } from './types/index.js';

declare module 'vitest' {
    // `Matchers<R, T>` covers `expect().*`, `expect.*` and `expect.extend` at once (Vitest 5).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, T> {
        toMatchPngSnapshot(opts?: ComparePngOptions): R;
        toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): R;
    }
}

const VITEST_PNG_SNAPSHOT_MATCHER_KEY = Symbol.for('png-visual-compare/vitest/toMatchPngSnapshot');

type VitestTestLike = {
    id: string;
    fails?: boolean;
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
    readonly snapshotUpdateState: 'all' | 'new' | 'none';
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

    // `.not` asserts the received PNG differs from the stored snapshot. The
    // probe above already claimed the key so it is not reported obsolete;
    // `processDomainSnapshot` is deliberately skipped because it owns pass/fail,
    // file writes and counter updates, none of which apply to a negated
    // assertion. The framework inverts `pass` for us.
    if (context.isNot === true) {
        if (expectedSnapshot.data === undefined) {
            throw new Error(NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE);
        }

        const negatedComparison = compareAgainstSerializedPngSnapshot(received, expectedSnapshot.data, args.options);

        return {
            pass: negatedComparison.pass,
            actual: negatedComparison.actualSerialized.trim(),
            expected: negatedComparison.expectedSerialized.trim(),
            message: () => `Snapshot \`${expectedSnapshot.key}\` matched but was expected to differ`,
        };
    }

    const comparison =
        expectedSnapshot.data === undefined
            ? undefined
            : compareAgainstSerializedPngSnapshot(received, expectedSnapshot.data, args.options);

    // Expected failures use the raw comparison. Reconciliation would update
    // baselines or snapshot counters before Vitest inverts the test result.
    if (test.fails === true) {
        return {
            pass: comparison?.pass === true,
            message: () => `Snapshot \`${expectedSnapshot.key}\` mismatched`,
        };
    }

    const mode = context.snapshotState.snapshotUpdateState;
    if (comparison?.pass !== true && (mode === 'all' || (mode === 'new' && expectedSnapshot.data === undefined))) {
        validatePngSnapshot(received, args.options);
    }

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
