import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DEFAULT_MAX_DIMENSION, ResourceLimitError } from '../src';
import { expect as extendedExpect, pngMatchers } from '../src/playwright';

type UpdateSnapshotsMode = 'all' | 'changed' | 'missing' | 'none';
type Attachment = { name: string; contentType: string; path?: string };
type MatcherResult = { pass: boolean; message: () => string; softError?: Error; shouldNotRetryTest?: boolean };
type FakeTestInfo = {
    titlePath: string[];
    config: { updateSnapshots: UpdateSnapshotsMode };
    project: { ignoreSnapshots: boolean };
    attachments: Attachment[];
    snapshotPath: (name: string) => string;
    outputPath: (name: string) => string;
};

const playwrightMock = vi.hoisted(() => ({
    testInfo: undefined as unknown,
    extend: (matchers: Record<string, unknown>) => ({ extendedWith: matchers }),
}));

vi.mock('@playwright/test', () => ({
    test: { info: () => playwrightMock.testInfo },
    expect: { extend: playwrightMock.extend },
}));

let workDir: string;

function createSolidPng(r: number, g: number, b: number): Buffer {
    const png = new PNG({ width: 1, height: 1 });
    png.data[0] = r;
    png.data[1] = g;
    png.data[2] = b;
    png.data[3] = 255;
    return PNG.sync.write(png);
}

const RED = createSolidPng(255, 0, 0);
const BLUE = createSolidPng(0, 0, 255);
// Same pixels as RED, different bytes.
const RED_REENCODED = PNG.sync.write(PNG.sync.read(RED), { deflateLevel: 0 });

function useTestInfo(updateSnapshots: UpdateSnapshotsMode = 'missing', ignoreSnapshots = false): FakeTestInfo {
    const testInfo: FakeTestInfo = {
        titlePath: ['visual.spec.ts', 'header', 'renders'],
        config: { updateSnapshots },
        project: { ignoreSnapshots },
        attachments: [],
        snapshotPath: (name) => join(workDir, 'snapshots', name),
        outputPath: (name) => {
            mkdirSync(join(workDir, 'output'), { recursive: true });
            return join(workDir, 'output', name);
        },
    };
    playwrightMock.testInfo = testInfo;
    return testInfo;
}

function seedBaseline(name: string, png: Buffer): string {
    const path = join(workDir, 'snapshots', name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, png);
    return path;
}

function match(received: unknown, ...args: unknown[]): MatcherResult {
    return (pngMatchers.toMatchPngSnapshot as (...a: unknown[]) => MatcherResult).call({ isNot: false }, received, ...args);
}

function matchNot(received: unknown, ...args: unknown[]): MatcherResult {
    return (pngMatchers.toMatchPngSnapshot as (...a: unknown[]) => MatcherResult).call({ isNot: true }, received, ...args);
}

beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'pvc-playwright-'));
});

afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
    playwrightMock.testInfo = undefined;
});

describe('playwright entrypoint exports', () => {
    test('exports an expect extended with pngMatchers', () => {
        expect(extendedExpect).toEqual({ extendedWith: pngMatchers });
        expect(pngMatchers).toHaveProperty('toMatchPngSnapshot');
    });
});

describe('baseline naming', () => {
    test('appends .png to a hint without an extension', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(match(RED, 'header').pass).toBe(true);
    });

    test('keeps a hint that already ends in .png', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(match(RED, 'header.png').pass).toBe(true);
    });

    test('strips an upper-case .PNG extension from attachment names', () => {
        const testInfo = useTestInfo();
        seedBaseline('header.PNG', RED);

        match(BLUE, 'header.PNG');

        expect(testInfo.attachments.map((attachment) => attachment.name)).toEqual([
            'header-expected.png',
            'header-actual.png',
            'header-diff.png',
        ]);
    });

    test('compares a repeated hint against the same baseline and numbers only its artifacts', () => {
        const testInfo = useTestInfo();
        const baselinePath = seedBaseline('header.png', RED);

        expect([match(BLUE, 'header').pass, match(BLUE, 'header').pass]).toEqual([false, false]);
        expect(testInfo.attachments.map((attachment) => [attachment.name, attachment.path])).toEqual([
            ['header-expected.png', baselinePath],
            ['header-actual.png', join(workDir, 'output', 'header-actual.png')],
            ['header-diff.png', join(workDir, 'output', 'header-diff.png')],
            ['header-1-expected.png', baselinePath],
            ['header-1-actual.png', join(workDir, 'output', 'header-1-actual.png')],
            ['header-1-diff.png', join(workDir, 'output', 'header-1-diff.png')],
        ]);
    });

    test('lets a retried (polled) assertion pass once it matches the one baseline', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(match(BLUE, 'header').pass).toBe(false);
        expect(match(RED, 'header').pass).toBe(true);
    });

    test('keeps artifact names unique when the path template shares a file name', () => {
        const testInfo = useTestInfo();
        testInfo.snapshotPath = (name) => join(workDir, 'snapshots', name.replace('.png', ''), 'baseline.png');
        seedBaseline(join('first', 'baseline.png'), RED);
        seedBaseline(join('second', 'baseline.png'), RED);

        match(BLUE, 'first');
        match(BLUE, 'second');

        expect(testInfo.attachments.map((attachment) => attachment.name)).toEqual([
            'first-expected.png',
            'first-actual.png',
            'first-diff.png',
            'second-expected.png',
            'second-actual.png',
            'second-diff.png',
        ]);
    });

    test('sanitises a hint into its artifact names', () => {
        const testInfo = useTestInfo();
        seedBaseline(join('pages', 'home.png'), RED);

        match(BLUE, 'pages/home');

        expect(testInfo.attachments.map((attachment) => attachment.name)).toEqual([
            'pages-home-expected.png',
            'pages-home-actual.png',
            'pages-home-diff.png',
        ]);
    });

    test('numbers the artifacts of distinct hints that sanitise to the same name', () => {
        const testInfo = useTestInfo();
        seedBaseline(join('pages', 'home.png'), RED);
        seedBaseline('pages-home.png', RED);

        match(BLUE, 'pages/home');
        match(BLUE, 'pages-home');

        expect(testInfo.attachments.map((attachment) => attachment.name)).toEqual([
            'pages-home-expected.png',
            'pages-home-actual.png',
            'pages-home-diff.png',
            'pages-home-1-expected.png',
            'pages-home-1-actual.png',
            'pages-home-1-diff.png',
        ]);
    });

    test('shortens a long generated name with a hash, as Playwright does', () => {
        const testInfo = useTestInfo('changed');
        testInfo.titlePath = ['visual.spec.ts', 'x'.repeat(300)];

        match(RED);

        const [baselineName] = readdirSync(join(workDir, 'snapshots'));
        expect(baselineName).toMatch(/^x{46}-[0-9a-f]{5}-x{41} png 1\.png$/);
    });

    test('generates <title>-png-<n>.png names for unnamed assertions', () => {
        useTestInfo();
        seedBaseline('header renders png 1.png', RED);
        seedBaseline('header renders png 2.png', BLUE);

        expect(match(RED).pass).toBe(true);
        expect(match(BLUE, { excludedAreas: [] }).pass).toBe(true);
    });

    test('sanitises the test title into artifact names for unnamed assertions', () => {
        const testInfo = useTestInfo('none');
        testInfo.titlePath = ['visual.spec.ts', 'GET /api/users'];

        expect(match(RED).pass).toBe(false);
        expect(testInfo.attachments.map((attachment) => attachment.name)).toEqual(['GET-api-users-png-1-actual.png']);
    });

    test('treats an empty hint as unnamed', () => {
        useTestInfo('none');
        seedBaseline('header renders png 1.png', RED);

        expect(match(RED, '').pass).toBe(true);
    });

    test('restarts numbering for each test', () => {
        useTestInfo();
        seedBaseline('header.png', RED);
        expect(match(RED, 'header').pass).toBe(true);

        useTestInfo();
        expect(match(RED, 'header').pass).toBe(true);
    });
});

describe('comparison against an existing baseline', () => {
    test('passes without attachments when the received image matches', () => {
        const testInfo = useTestInfo();
        seedBaseline('header.png', RED);

        const result = match(RED, 'header');

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(testInfo.attachments).toEqual([]);
        expect(existsSync(join(workDir, 'output', 'header-diff.png'))).toBe(false);
    });

    test.each(['missing', 'none'] as const)('fails with expected/actual/diff attachments in %s mode', (mode) => {
        const testInfo = useTestInfo(mode);
        const baselinePath = seedBaseline('header.png', RED);

        const result = match(BLUE, 'header');

        expect(result.pass).toBe(false);
        expect(result.message()).toContain('does not match the baseline "header.png" (1 mismatched pixel)');
        expect(testInfo.attachments).toEqual([
            { name: 'header-expected.png', contentType: 'image/png', path: baselinePath },
            { name: 'header-actual.png', contentType: 'image/png', path: join(workDir, 'output', 'header-actual.png') },
            { name: 'header-diff.png', contentType: 'image/png', path: join(workDir, 'output', 'header-diff.png') },
        ]);
        expect(readFileSync(join(workDir, 'output', 'header-actual.png'))).toEqual(BLUE);
        expect(existsSync(join(workDir, 'output', 'header-diff.png'))).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(RED);
    });

    test('pluralises the mismatched pixel count', () => {
        useTestInfo();
        const white = new PNG({ width: 2, height: 1 });
        white.data.fill(255);
        seedBaseline('wide.png', PNG.sync.write(white));
        const black = new PNG({ width: 2, height: 1 });
        black.data.fill(0);
        black.data[3] = 255;
        black.data[7] = 255;

        expect(match(PNG.sync.write(black), 'wide').message()).toContain('(2 mismatched pixels)');
    });

    test('passes ComparePngOptions through to the comparison', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(match(BLUE, 'header', { excludedAreas: [{ x1: 0, y1: 0, x2: 0, y2: 0 }] }).pass).toBe(true);
    });

    test('overwrites a mismatching baseline and passes in changed mode', () => {
        useTestInfo('changed');
        const baselinePath = seedBaseline('header.png', RED);

        expect(match(BLUE, 'header').pass).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(BLUE);
    });

    test('keeps a matching baseline in changed mode', () => {
        useTestInfo('changed');
        const baselinePath = seedBaseline('header.png', RED);

        expect(match(RED, 'header').pass).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(RED);
    });

    test.each([
        ['a pixel-identical re-encode', RED_REENCODED, undefined],
        ['an image that matches only under the options', BLUE, { excludedAreas: [{ x1: 0, y1: 0, x2: 0, y2: 0 }] }],
    ])('keeps the baseline for %s in changed mode', (_, received, options) => {
        useTestInfo('changed');
        const baselinePath = seedBaseline('header.png', RED);

        expect(match(received, 'header', options).pass).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(RED);
    });

    test('overwrites a baseline whose bytes differ and passes in all mode', () => {
        useTestInfo('all');
        const baselinePath = seedBaseline('header.png', RED);

        expect(match(BLUE, 'header').pass).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(BLUE);
    });

    test('passes a byte-identical baseline in all mode', () => {
        useTestInfo('all');
        const baselinePath = seedBaseline('header.png', RED);

        expect(match(RED, 'header').pass).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(RED);
    });

    test('overwrites a pixel-identical baseline whose bytes differ in all mode', () => {
        useTestInfo('all');
        const baselinePath = seedBaseline('header.png', RED);

        expect(match(RED_REENCODED, 'header').pass).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(RED_REENCODED);
    });
});

describe('missing baseline', () => {
    test('writes the baseline and fails softly without retry in missing mode', () => {
        const testInfo = useTestInfo('missing');

        const result = match(RED, 'header');

        const baselinePath = join(workDir, 'snapshots', 'header.png');
        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(result.softError?.message).toBe(
            `Baseline "header.png" was missing and has been written to ${baselinePath}. Re-run the test to compare against it.`,
        );
        expect(result.shouldNotRetryTest).toBe(true);
        expect(readFileSync(baselinePath)).toEqual(RED);
        expect(testInfo.attachments).toEqual([
            { name: 'header-expected.png', contentType: 'image/png', path: baselinePath },
            { name: 'header-actual.png', contentType: 'image/png', path: join(workDir, 'output', 'header-actual.png') },
        ]);
    });

    test.each(['all', 'changed'] as const)('writes the baseline and passes in %s mode', (mode) => {
        useTestInfo(mode);

        const result = match(RED, 'header');

        expect(result.pass).toBe(true);
        expect(result.softError).toBeUndefined();
        expect(result.shouldNotRetryTest).toBeUndefined();
        expect(readFileSync(join(workDir, 'snapshots', 'header.png'))).toEqual(RED);
    });

    test('rethrows a baseline read error other than a missing file', () => {
        useTestInfo('none');
        mkdirSync(join(workDir, 'snapshots', 'header.png'), { recursive: true });

        expect(() => match(RED, 'header')).toThrow(/EISDIR/);
        expect(() => matchNot(RED, 'header')).toThrow(/EISDIR/);
    });

    test('fails without writing in none mode', () => {
        const testInfo = useTestInfo('none');

        const result = match(RED, 'header');

        const baselinePath = join(workDir, 'snapshots', 'header.png');
        expect(result.pass).toBe(false);
        expect(result.message()).toBe(`Baseline "header.png" is missing at ${baselinePath}. Run with --update-snapshots to create it.`);
        expect(existsSync(baselinePath)).toBe(false);
        expect(testInfo.attachments).toEqual([
            { name: 'header-actual.png', contentType: 'image/png', path: join(workDir, 'output', 'header-actual.png') },
        ]);
    });
});

describe('image limits', () => {
    const OVER_DEFAULT_MAX_DIMENSION = PNG.sync.write(new PNG({ width: DEFAULT_MAX_DIMENSION + 1, height: 1 }));
    const TWO_PIXELS = PNG.sync.write(new PNG({ width: 2, height: 1 }));

    test.each(['missing', 'all', 'changed'] as const)('refuses to write a missing baseline over the default limits in %s mode', (mode) => {
        useTestInfo(mode);

        expect(() => match(OVER_DEFAULT_MAX_DIMENSION, 'header')).toThrow(ResourceLimitError);
        expect(existsSync(join(workDir, 'snapshots', 'header.png'))).toBe(false);
    });

    test.each(['all', 'changed'] as const)('refuses to overwrite a baseline with an image over maxPixels in %s mode', (mode) => {
        useTestInfo(mode);
        const baselinePath = seedBaseline('header.png', RED);

        expect(() => match(TWO_PIXELS, 'header', { maxPixels: 1 })).toThrow(ResourceLimitError);
        expect(readFileSync(baselinePath)).toEqual(RED);
    });
});

describe('baseline validation', () => {
    const TRUNCATED_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    test.each(['missing', 'all', 'changed'] as const)('does not create a malformed baseline in %s mode', (mode) => {
        useTestInfo(mode);

        expect(() => match(TRUNCATED_PNG, 'header', { throwErrorOnInvalidInputData: false })).toThrow('data could not be parsed');
        expect(existsSync(join(workDir, 'snapshots', 'header.png'))).toBe(false);
    });

    test.each(['all', 'changed'] as const)('preserves an existing baseline when an update is malformed in %s mode', (mode) => {
        useTestInfo(mode);
        const baselinePath = seedBaseline('header.png', RED);

        expect(() => match(TRUNCATED_PNG, 'header', { throwErrorOnInvalidInputData: false })).toThrow('data could not be parsed');
        expect(readFileSync(baselinePath)).toEqual(RED);
    });
});

describe('negated assertions', () => {
    test('throws when the baseline is missing', () => {
        useTestInfo('all');

        expect(() => matchNot(RED, 'header')).toThrow('.not.toMatchPngSnapshot() requires an existing snapshot to compare against.');
        expect(existsSync(join(workDir, 'snapshots', 'header.png'))).toBe(false);
    });

    test('returns pass=false when the received image differs, so .not passes', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(matchNot(BLUE, 'header').pass).toBe(false);
    });

    test('passes ComparePngOptions through to the comparison', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(matchNot(BLUE, 'header', { excludedAreas: [{ x1: 0, y1: 0, x2: 0, y2: 0 }] }).pass).toBe(true);
    });

    test('returns pass=true with a message when the image matches, so .not fails', () => {
        const testInfo = useTestInfo();
        seedBaseline('header.png', RED);

        const result = matchNot(RED, 'header');

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('Received PNG matches the baseline "header.png", but was expected to differ.');
        expect(testInfo.attachments).toEqual([]);
    });

    test('never updates the baseline, even in all mode', () => {
        useTestInfo('all');
        const baselinePath = seedBaseline('header.png', RED);

        matchNot(BLUE, 'header');

        expect(readFileSync(baselinePath)).toEqual(RED);
    });
});

describe('ignoreSnapshots', () => {
    test('passes a positive assertion without touching the filesystem', () => {
        useTestInfo('missing', true);

        expect(match(RED, 'header').pass).toBe(true);
        expect(existsSync(join(workDir, 'snapshots'))).toBe(false);
    });

    test('returns pass=false for a negated assertion so it also passes', () => {
        useTestInfo('missing', true);

        expect(matchNot(RED, 'header').pass).toBe(false);
    });
});

describe('diff output options', () => {
    test.each(['diffFilePath', 'diffOutputBaseDir'] as const)('rejects %s', (option) => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(() => match(BLUE, 'header', { [option]: join(workDir, 'x.png') })).toThrow(
            `toMatchPngSnapshot() for Playwright manages the diff location; remove the "${option}" option.`,
        );
    });

    test('rejects them under .not too', () => {
        useTestInfo();
        seedBaseline('header.png', RED);

        expect(() => matchNot(BLUE, { diffFilePath: join(workDir, 'x.png') })).toThrow('manages the diff location');
    });
});

describe('input guards', () => {
    test('fails for a non-PNG received value', () => {
        useTestInfo();

        expect(match('not a png', 'header').pass).toBe(false);
    });
});
