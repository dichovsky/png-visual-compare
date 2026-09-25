/**
 * Playwright adapter: `toMatchPngSnapshot` compares a received PNG Buffer against a
 * baseline PNG file stored at `testInfo.snapshotPath(name)` (see docs/adr/0001).
 * Has no side effects: use the exported `expect`, or `baseExpect.extend(pngMatchers)`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { expect as baseExpect, test, type TestInfo } from '@playwright/test';
import { comparePng } from './comparePng';
import { createPngSnapshotMatcher } from './matchers/createPngSnapshotMatcher';
import { NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE, type PngSnapshotMatcherArgs } from './matchers/pngSnapshot';
import type { ComparePngOptions } from './types';

const PNG_EXTENSION = /\.png$/i;
const PNG_CONTENT_TYPE = 'image/png';
const UNNAMED_KEY = '';
const MANAGED_DIFF_OPTIONS = ['diffFilePath', 'diffOutputBaseDir'] as const;

type MatcherResult = { pass: boolean; message: () => string };

const noMessage = (): string => '';
const PASSED: MatcherResult = { pass: true, message: noMessage };

const snapshotCounters = new WeakMap<TestInfo, Map<string, number>>();

function nextSnapshotIndex(testInfo: TestInfo, key: string): number {
    const counters = snapshotCounters.get(testInfo) ?? new Map<string, number>();
    const index = (counters.get(key) ?? 0) + 1;
    snapshotCounters.set(testInfo, counters.set(key, index));
    return index;
}

// Mirrors Playwright's own naming: a repeated name gets `-1`, `-2`, … and unnamed
// assertions are numbered from the test title. The `png` marker keeps unnamed names
// apart from those of an unnamed `toHaveScreenshot()`, which counts separately.
function resolveBaselineName(testInfo: TestInfo, hint: string | undefined): string {
    if (hint === undefined || hint === '') {
        const index = nextSnapshotIndex(testInfo, UNNAMED_KEY);
        return `${[...testInfo.titlePath.slice(1), 'png', index].join(' ')}.png`;
    }

    const name = PNG_EXTENSION.test(hint) ? hint : `${hint}.png`;
    const index = nextSnapshotIndex(testInfo, name);
    return index === 1 ? name : `${name.slice(0, -4)}-${index - 1}${name.slice(-4)}`;
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

function writeBaseline(baselinePath: string, received: Buffer): void {
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, received);
}

function pixelLabel(count: number): string {
    return `${count} mismatched pixel${count === 1 ? '' : 's'}`;
}

function matchMissingBaseline(
    testInfo: TestInfo,
    received: Buffer,
    name: string,
    baselinePath: string,
    artifactBase: string,
): MatcherResult {
    const mode = testInfo.config.updateSnapshots;

    if (mode !== 'none') {
        writeBaseline(baselinePath, received);

        if (mode === 'all' || mode === 'changed') {
            return PASSED;
        }

        attach(testInfo, `${artifactBase}-expected.png`, baselinePath);
    }

    const actualPath = testInfo.outputPath(`${artifactBase}-actual.png`);
    writeFileSync(actualPath, received);
    attach(testInfo, `${artifactBase}-actual.png`, actualPath);

    // ponytail: a hard failure, not Playwright's soft error, so only the first missing
    // baseline per test is written in `missing` mode; `-u` writes them all in one run.
    const message =
        mode === 'none'
            ? `Baseline "${name}" is missing at ${baselinePath}. Run with --update-snapshots to create it.`
            : `Baseline "${name}" was missing and has been written to ${baselinePath}. Re-run the test to compare against it.`;
    return { pass: false, message: () => message };
}

function matchAgainstBaseline(testInfo: TestInfo, isNot: boolean, received: Buffer, args: PngSnapshotMatcherArgs): MatcherResult {
    assertNoManagedDiffOptions(args.options);

    if (testInfo.project.ignoreSnapshots) {
        return { pass: !isNot, message: noMessage };
    }

    const name = resolveBaselineName(testInfo, args.hint);
    const baselinePath = testInfo.snapshotPath(name);
    const artifactBase = basename(baselinePath).replace(PNG_EXTENSION, '');
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

        return matchMissingBaseline(testInfo, received, name, baselinePath, artifactBase);
    }

    // `.not` never writes: it returns the raw comparison and Playwright inverts `pass`.
    if (isNot) {
        const mismatchedPixels = comparePng(received, baseline, args.options);
        return {
            pass: mismatchedPixels === 0,
            message: () => `Received PNG matches the baseline "${name}", but was expected to differ.`,
        };
    }

    const mode = testInfo.config.updateSnapshots;

    if (mode === 'all') {
        if (!received.equals(baseline)) {
            writeBaseline(baselinePath, received);
        }

        return PASSED;
    }

    const diffPath = testInfo.outputPath(`${artifactBase}-diff.png`);
    const mismatchedPixels = comparePng(received, baseline, { ...args.options, diffFilePath: diffPath });

    if (mismatchedPixels === 0) {
        return PASSED;
    }

    if (mode === 'changed') {
        writeBaseline(baselinePath, received);
        return PASSED;
    }

    const actualPath = testInfo.outputPath(`${artifactBase}-actual.png`);
    writeFileSync(actualPath, received);
    attach(testInfo, `${artifactBase}-expected.png`, baselinePath);
    attach(testInfo, `${artifactBase}-actual.png`, actualPath);
    attach(testInfo, `${artifactBase}-diff.png`, diffPath);

    return {
        pass: false,
        message: () => `Received PNG does not match the baseline "${name}" (${pixelLabel(mismatchedPixels)}).`,
    };
}

export const pngMatchers = {
    toMatchPngSnapshot: createPngSnapshotMatcher((matcherContext, received, args) =>
        matchAgainstBaseline(test.info(), (matcherContext as { isNot?: boolean }).isNot === true, received, args),
    ),
};

export const expect = baseExpect.extend(pngMatchers);
