import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const PLAYWRIGHT_CLI = path.resolve(__dirname, '../node_modules/@playwright/test/cli.js');
const FIXTURE_CONFIG = path.resolve(__dirname, 'fixtures/playwright-matcher/playwright.config.ts');
const IMAGE_A = path.resolve(__dirname, '../test-data/actual/pnggrad16rgb.png');
const IMAGE_B = path.resolve(__dirname, '../test-data/actual/ILTQq.png');

type UpdateSnapshotsMode = 'all' | 'changed' | 'missing' | 'none';
type FixtureRun = { status: string; attempts: number; attachments: string[]; error: string };
type FixtureFlags = { isNot?: boolean; hints?: string; retries?: number; pollFirst?: string };

function runFixture(workDir: string, received: string, mode: UpdateSnapshotsMode, flags: FixtureFlags = {}): FixtureRun {
    const args = [
        PLAYWRIGHT_CLI,
        'test',
        '-c',
        FIXTURE_CONFIG,
        `--update-snapshots=${mode}`,
        `--retries=${flags.retries ?? 0}`,
        '--reporter=json',
    ];
    const run = spawnSync(process.execPath, args, {
        encoding: 'utf8',
        env: {
            ...process.env,
            PVC_E2E_DIR: workDir,
            PVC_RECEIVED: received,
            PVC_NOT: String(flags.isNot === true),
            PVC_HINTS: flags.hints ?? 'shot',
            ...(flags.pollFirst === undefined ? {} : { PVC_POLL_FIRST: flags.pollFirst }),
        },
    });
    const report = JSON.parse(run.stdout);
    const results = report.suites[0].specs[0].tests[0].results;
    const result = results[0];

    return {
        status: result.status,
        attempts: results.length,
        // Playwright adds its own `error-context` attachment to failed tests; keep only the matcher's PNGs.
        attachments: result.attachments
            .map((attachment: { name: string }) => attachment.name)
            .filter((name: string) => name.endsWith('.png')),
        error: result.error?.message ?? '',
    };
}

function seedBaseline(workDir: string, image: string): string {
    const baselinePath = path.join(workDir, 'snapshots', 'shot.png');
    mkdirSync(path.dirname(baselinePath), { recursive: true });
    copyFileSync(image, baselinePath);
    return baselinePath;
}

test.describe('toMatchPngSnapshot in a real Playwright run', () => {
    test('writes a missing baseline and fails in missing mode', () => {
        const workDir = test.info().outputPath();

        const run = runFixture(workDir, IMAGE_A, 'missing');

        expect(run.status).toBe('failed');
        expect(run.error).toContain('was missing and has been written');
        expect(run.attachments).toEqual(['shot-expected.png', 'shot-actual.png']);
        expect(readFileSync(path.join(workDir, 'snapshots', 'shot.png'))).toEqual(readFileSync(IMAGE_A));
    });

    test('names an unnamed baseline from the sanitised test title', () => {
        const workDir = test.info().outputPath();

        runFixture(workDir, IMAGE_A, 'missing', { hints: '' });

        expect(readdirSync(path.join(workDir, 'snapshots'))).toEqual(['compares-the-received-PNG-against-the-shot-baseline-png-1.png']);
    });

    test('writes every missing baseline in one run and does not retry', () => {
        const workDir = test.info().outputPath();

        const run = runFixture(workDir, IMAGE_A, 'missing', { hints: 'first,second', retries: 1 });

        expect(run.status).toBe('failed');
        expect(run.attempts).toBe(1);
        expect(readdirSync(path.join(workDir, 'snapshots')).sort()).toEqual(['first.png', 'second.png']);
    });

    test('fails without writing a missing baseline in none mode', () => {
        const workDir = test.info().outputPath();

        const run = runFixture(workDir, IMAGE_A, 'none');

        expect(run.status).toBe('failed');
        expect(run.error).toContain('Run with --update-snapshots to create it');
        expect(existsSync(path.join(workDir, 'snapshots', 'shot.png'))).toBe(false);
    });

    test('passes against a matching baseline', () => {
        const workDir = test.info().outputPath();
        seedBaseline(workDir, IMAGE_A);

        expect(runFixture(workDir, IMAGE_A, 'missing').status).toBe('passed');
    });

    test('fails with expected/actual/diff attachments on a mismatch', () => {
        const workDir = test.info().outputPath();
        seedBaseline(workDir, IMAGE_A);

        const run = runFixture(workDir, IMAGE_B, 'missing');

        expect(run.status).toBe('failed');
        expect(run.error).toMatch(/does not match the baseline "shot\.png" \(\d+ mismatched pixels\)/);
        expect(run.attachments).toEqual(['shot-expected.png', 'shot-actual.png', 'shot-diff.png']);
    });

    test('lets expect.poll pass once a later attempt matches the same baseline', () => {
        const workDir = test.info().outputPath();
        seedBaseline(workDir, IMAGE_A);

        const run = runFixture(workDir, IMAGE_A, 'missing', { pollFirst: IMAGE_B });

        expect(run.status).toBe('passed');
        expect(readdirSync(path.join(workDir, 'snapshots'))).toEqual(['shot.png']);
    });

    for (const mode of ['changed', 'all'] as const) {
        test(`overwrites a mismatching baseline and passes in ${mode} mode`, () => {
            const workDir = test.info().outputPath();
            const baselinePath = seedBaseline(workDir, IMAGE_A);

            expect(runFixture(workDir, IMAGE_B, mode).status).toBe('passed');
            expect(readFileSync(baselinePath)).toEqual(readFileSync(IMAGE_B));
        });
    }

    test('passes .not when the received PNG differs from the baseline', () => {
        const workDir = test.info().outputPath();
        seedBaseline(workDir, IMAGE_A);

        expect(runFixture(workDir, IMAGE_B, 'missing', { isNot: true }).status).toBe('passed');
    });

    test('fails .not when the baseline is missing, without writing it', () => {
        const workDir = test.info().outputPath();

        const run = runFixture(workDir, IMAGE_A, 'all', { isNot: true });

        expect(run.status).toBe('failed');
        expect(run.error).toContain('.not.toMatchPngSnapshot() requires an existing snapshot');
        expect(existsSync(path.join(workDir, 'snapshots', 'shot.png'))).toBe(false);
    });
});
