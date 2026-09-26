import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const requireFromProject = createRequire(resolve('package.json'));
const VITEST_CLI = join(dirname(requireFromProject.resolve('vitest/package.json')), 'vitest.mjs');
const VITEST_MATCHER = resolve('src/vitest.mts');

type UpdateMode = 'all' | 'new' | 'none';
type VitestReport = {
    snapshot: { added: number; matched: number; unmatched: number; updated: number };
    testResults: { assertionResults: { status: string; failureMessages: string[] }[] }[];
};

let workDir: string;
let snapshotPath: string;

function solidPng(red: number, blue: number): Buffer {
    const png = new PNG({ width: 1, height: 1 });
    png.data.set([red, 0, blue, 255]);
    return PNG.sync.write(png);
}

const RED = solidPng(255, 0);
const BLUE = solidPng(0, 255);
const TRUNCATED = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function seedSnapshot(image: Buffer): void {
    mkdirSync(join(workDir, '__snapshots__'), { recursive: true });
    writeFileSync(
        snapshotPath,
        `// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html

exports[\`renders 1\`] = \`
${JSON.stringify(image, null, 2)}
\`;\n`,
    );
}

function runVitest(body: string, update: UpdateMode, image: Buffer): { exitCode: number | null; output: string; report: VitestReport } {
    const configPath = join(workDir, 'vitest.config.mjs');
    const reportPath = join(workDir, 'report.json');
    writeFileSync(
        configPath,
        `export default ${JSON.stringify({
            root: workDir,
            cacheDir: join(workDir, '.vite-cache'),
            test: {
                include: ['matcher.fixture.test.ts'],
                update,
                maxWorkers: 1,
                coverage: { enabled: false },
            },
        })};\n`,
    );
    writeFileSync(
        join(workDir, 'matcher.fixture.test.ts'),
        `import { expect, test } from 'vitest';
import ${JSON.stringify(VITEST_MATCHER)};
const received = Buffer.from(${JSON.stringify([...image])});
${body}\n`,
    );
    const result = spawnSync(process.execPath, [VITEST_CLI, 'run', '--config', configPath, '--reporter=json', '--outputFile', reportPath], {
        cwd: workDir,
        encoding: 'utf8',
        timeout: 20000,
    });

    if (result.error) {
        throw result.error;
    }

    const output = result.stdout + result.stderr;
    if (!existsSync(reportPath)) {
        throw new Error(`Vitest wrote no report (exit ${result.status}):\n${output}`);
    }

    return { exitCode: result.status, output, report: JSON.parse(readFileSync(reportPath, 'utf8')) as VitestReport };
}

beforeEach(() => {
    workDir = realpathSync(mkdtempSync(join(tmpdir(), 'pvc-vitest-')));
    snapshotPath = join(workDir, '__snapshots__', 'matcher.fixture.test.ts.snap');
    symlinkSync(resolve('node_modules'), join(workDir, 'node_modules'), 'dir');
});

afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
});

describe('toMatchPngSnapshot in a real Vitest run', () => {
    test.each(['none', 'new'] as const)('reports ordinary snapshot mismatches when %s mode cannot update an existing baseline', (mode) => {
        seedSnapshot(RED);
        const original = readFileSync(snapshotPath, 'utf8');

        const result = runVitest(
            "test('renders', () => expect(received).toMatchPngSnapshot({ throwErrorOnInvalidInputData: false }));",
            mode,
            TRUNCATED,
        );

        expect(result.exitCode, result.output).toBe(1);
        expect(result.report.snapshot).toMatchObject({ added: 0, unmatched: 1, updated: 0 });
        expect(result.report.testResults[0].assertionResults[0].failureMessages.join('\n')).toContain('Snapshot `renders 1` mismatched');
        expect(readFileSync(snapshotPath, 'utf8')).toBe(original);
    });

    test.each(['none', 'new', 'all'] as const)('preserves baselines and counters inside test.fails in %s mode', (mode) => {
        seedSnapshot(RED);
        const original = readFileSync(snapshotPath, 'utf8');

        const result = runVitest("test.fails('renders', () => expect(received).toMatchPngSnapshot());", mode, BLUE);

        expect(result.exitCode, result.output).toBe(0);
        expect(result.report.testResults[0].assertionResults[0].status).toBe('passed');
        expect(result.report.snapshot).toMatchObject({ added: 0, matched: 0, unmatched: 0, updated: 0 });
        expect(readFileSync(snapshotPath, 'utf8')).toBe(original);
    });

    test.each(['new', 'all'] as const)('never records a missing test.fails baseline in %s mode', (mode) => {
        const result = runVitest("test.fails('renders', () => expect(received).toMatchPngSnapshot());", mode, BLUE);

        expect(result.exitCode, result.output).toBe(0);
        expect(result.report.snapshot).toMatchObject({ added: 0, matched: 0, unmatched: 0, updated: 0 });
        expect(existsSync(snapshotPath)).toBe(false);
    });

    test('lets Vitest reject an unexpectedly matching test.fails assertion', () => {
        seedSnapshot(RED);
        const original = readFileSync(snapshotPath, 'utf8');

        const result = runVitest("test.fails('renders', () => expect(received).toMatchPngSnapshot());", 'all', RED);

        expect(result.exitCode, result.output).toBe(1);
        expect(result.report.testResults[0].assertionResults[0].failureMessages.join('\n')).toContain('Expect test to fail');
        expect(result.report.snapshot).toMatchObject({ added: 0, matched: 0, unmatched: 0, updated: 0 });
        expect(readFileSync(snapshotPath, 'utf8')).toBe(original);
    });
});
