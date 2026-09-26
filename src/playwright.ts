/**
 * Playwright adapter: `toMatchPngSnapshot` compares a received PNG Buffer against a
 * baseline PNG file stored at `testInfo.snapshotPath(name)` (see docs/adr/0001).
 * Has no side effects: use the exported `expect`, or `baseExpect.extend(pngMatchers)`.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect as baseExpect, test, type TestInfo } from '@playwright/test';
import { comparePng } from './comparePng';
import { createPngSnapshotMatcher } from './matchers/createPngSnapshotMatcher';
import { NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE, validatePngSnapshot, type PngSnapshotMatcherArgs } from './matchers/pngSnapshot';
import type { ComparePngOptions } from './types';

const PNG_EXTENSION = /\.png$/i;
const PNG_CONTENT_TYPE = 'image/png';
const UNNAMED_COUNTER_KEY = 'unnamed';
const MAX_GENERATED_NAME_LENGTH = 100;
const MANAGED_DIFF_OPTIONS = ['diffFilePath', 'diffOutputBaseDir'] as const;

type MatcherResult = {
    pass: boolean;
    message: () => string;
    /** Playwright's own (undocumented) result fields, honoured since 1.60. */
    softError?: Error;
    shouldNotRetryTest?: boolean;
};
type SnapshotNames = { baselineName: string; artifactBase: string };

const noMessage = (): string => '';
const PASSED: MatcherResult = { pass: true, message: noMessage };

const snapshotCounters = new WeakMap<TestInfo, Map<string, number>>();

function nextSnapshotIndex(testInfo: TestInfo, key: string): number {
    const counters = snapshotCounters.get(testInfo) ?? new Map<string, number>();
    const index = (counters.get(key) ?? 0) + 1;
    snapshotCounters.set(testInfo, counters.set(key, index));
    return index;
}

// Same character class and shortening as Playwright's own snapshot naming.
function sanitizeForFilePath(value: string): string {
    return value.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, '-');
}

function trimLongString(value: string): string {
    if (value.length <= MAX_GENERATED_NAME_LENGTH) {
        return value;
    }

    const middle = `-${createHash('sha1').update(value).digest('hex').substring(0, 5)}-`;
    const start = Math.floor((MAX_GENERATED_NAME_LENGTH - middle.length) / 2);
    const end = MAX_GENERATED_NAME_LENGTH - middle.length - start;
    return value.substring(0, start) + middle + value.slice(-end);
}

// Mirrors Playwright: a named assertion always uses the same baseline, and a repeated
// name numbers only its artifacts (`-1`, `-2`, …), so `expect.poll` retries compare
// against one baseline. Unnamed assertions are numbered from the test title; the `png`
// marker keeps them apart from an unnamed `toHaveScreenshot()`, which counts separately.
function resolveSnapshotNames(testInfo: TestInfo, hint: string | undefined): SnapshotNames {
    if (hint === undefined || hint === '') {
        const index = nextSnapshotIndex(testInfo, UNNAMED_COUNTER_KEY);
        const title = trimLongString([...testInfo.titlePath.slice(1), 'png', index].join(' '));
        return { baselineName: `${title}.png`, artifactBase: sanitizeForFilePath(title) };
    }

    const baselineName = PNG_EXTENSION.test(hint) ? hint : `${hint}.png`;
    const base = sanitizeForFilePath(baselineName.replace(PNG_EXTENSION, ''));
    const index = nextSnapshotIndex(testInfo, `named:${base}`);
    return { baselineName, artifactBase: index === 1 ? base : `${base}-${index - 1}` };
}

function assertNoManagedDiffOptions(options: ComparePngOptions | undefined): void {
    for (const option of MANAGED_DIFF_OPTIONS) {
        if (options?.[option] !== undefined) {
            throw new Error(`toMatchPngSnapshot() for Playwright manages the diff location; remove the "${option}" option.`);
        }
    }
}

function attach(testInfo: TestInfo, name: string, path: string): void {
    testInfo.attachments.push({ name, contentType: PNG_CONTENT_TYPE, path });
}

function attachActual(testInfo: TestInfo, artifactBase: string, received: Buffer): void {
    const actualPath = testInfo.outputPath(`${artifactBase}-actual.png`);
    writeFileSync(actualPath, received);
    attach(testInfo, `${artifactBase}-actual.png`, actualPath);
}

function writeBaseline(baselinePath: string, received: Buffer, options: ComparePngOptions | undefined): void {
    validatePngSnapshot(received, options);
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, received);
}

function pixelLabel(count: number): string {
    return `${count} mismatched pixel${count === 1 ? '' : 's'}`;
}

function matchMissingBaseline(
    testInfo: TestInfo,
    received: Buffer,
    names: SnapshotNames,
    baselinePath: string,
    options: ComparePngOptions | undefined,
): MatcherResult {
    const mode = testInfo.config.updateSnapshots;

    if (mode === 'none') {
        attachActual(testInfo, names.artifactBase, received);
        const message = `Baseline "${names.baselineName}" is missing at ${baselinePath}. Run with --update-snapshots to create it.`;
        return { pass: false, message: () => message };
    }

    writeBaseline(baselinePath, received, options);

    if (mode !== 'missing') {
        return PASSED;
    }

    attach(testInfo, `${names.artifactBase}-expected.png`, baselinePath);
    attachActual(testInfo, names.artifactBase, received);

    // As Playwright's built-ins do: fail the test softly, so every missing baseline in
    // it is written in one run, and never retry it against a baseline just written.
    const message = `Baseline "${names.baselineName}" was missing and has been written to ${baselinePath}. Re-run the test to compare against it.`;
    return { pass: true, message: noMessage, softError: new Error(message), shouldNotRetryTest: true };
}

function matchAgainstBaseline(testInfo: TestInfo, isNot: boolean, received: Buffer, args: PngSnapshotMatcherArgs): MatcherResult {
    assertNoManagedDiffOptions(args.options);

    if (testInfo.project.ignoreSnapshots) {
        return { pass: !isNot, message: noMessage };
    }

    const names = resolveSnapshotNames(testInfo, args.hint);
    const baselinePath = testInfo.snapshotPath(names.baselineName);
    let baseline: Buffer;

    try {
        baseline = readFileSync(baselinePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
        }

        if (isNot) {
            throw new Error(NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE);
        }

        return matchMissingBaseline(testInfo, received, names, baselinePath, args.options);
    }

    // `.not` never writes: it returns the raw comparison and Playwright inverts `pass`.
    if (isNot) {
        const mismatchedPixels = comparePng(received, baseline, args.options);
        return {
            pass: mismatchedPixels === 0,
            message: () => `Received PNG matches the baseline "${names.baselineName}", but was expected to differ.`,
        };
    }

    const mode = testInfo.config.updateSnapshots;

    if (mode === 'all') {
        if (!received.equals(baseline)) {
            writeBaseline(baselinePath, received, args.options);
        }

        return PASSED;
    }

    const diffPath = testInfo.outputPath(`${names.artifactBase}-diff.png`);
    const mismatchedPixels = comparePng(received, baseline, { ...args.options, diffFilePath: diffPath });

    if (mismatchedPixels === 0) {
        return PASSED;
    }

    if (mode === 'changed') {
        writeBaseline(baselinePath, received, args.options);
        return PASSED;
    }

    attach(testInfo, `${names.artifactBase}-expected.png`, baselinePath);
    attachActual(testInfo, names.artifactBase, received);
    attach(testInfo, `${names.artifactBase}-diff.png`, diffPath);

    return {
        pass: false,
        message: () => `Received PNG does not match the baseline "${names.baselineName}" (${pixelLabel(mismatchedPixels)}).`,
    };
}

export const pngMatchers = {
    toMatchPngSnapshot: createPngSnapshotMatcher((matcherContext, received, args) =>
        matchAgainstBaseline(test.info(), (matcherContext as { isNot?: boolean }).isNot === true, received, args),
    ),
};

export const expect = baseExpect.extend(pngMatchers);
