import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const requireFromProject = createRequire(resolve('package.json'));
const JEST_CLI = requireFromProject.resolve('jest/bin/jest');
const TYPESCRIPT = requireFromProject.resolve('typescript');
const JEST_MATCHER = resolve('src/jest.ts');

type JestReport = {
    snapshot: { added: number; unchecked: number; unmatched: number; updated: number };
    testResults: { assertionResults: { status: string }[] }[];
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

function seedSnapshots(snapshots: Record<string, Buffer>): void {
    mkdirSync(join(workDir, '__snapshots__'), { recursive: true });
    const assignments = Object.entries(snapshots).map(
        ([key, image]) => `exports[${JSON.stringify(key)}] = ${JSON.stringify(`\n${JSON.stringify(image, null, 2)}\n`)};`,
    );
    writeFileSync(snapshotPath, `// Jest Snapshot v1, https://jestjs.io/docs/snapshot-testing\n${assignments.join('\n')}\n`);
}

function runJest(body: string, update: boolean): { exitCode: number | null; output: string; report: JestReport } {
    const transformer = join(workDir, 'typescript-transformer.cjs');
    writeFileSync(
        transformer,
        `const ts = require(${JSON.stringify(TYPESCRIPT)});
module.exports = { process(source, filename) {
    return { code: ts.transpileModule(source, { fileName: filename,
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText };
} };`,
    );
    writeFileSync(
        join(workDir, 'matcher.fixture.cjs'),
        `require(${JSON.stringify(JEST_MATCHER)});
const received = Buffer.from(${JSON.stringify([...BLUE])});
${body}\n`,
    );
    const reportPath = join(workDir, 'report.json');
    rmSync(reportPath, { force: true });
    const result = spawnSync(
        process.execPath,
        [
            JEST_CLI,
            '--runInBand',
            '--config',
            JSON.stringify({
                rootDir: workDir,
                cacheDirectory: join(workDir, '.jest-cache'),
                testMatch: ['**/matcher.fixture.cjs'],
                transform: { '\\.ts$': transformer },
                modulePaths: [resolve('node_modules')],
            }),
            update ? '--updateSnapshot' : '--ci',
            '--json',
            '--outputFile',
            reportPath,
        ],
        { cwd: workDir, encoding: 'utf8', timeout: 20000 },
    );

    if (result.error) {
        throw result.error;
    }

    if (!existsSync(reportPath)) {
        throw new Error(`Jest wrote no report (exit ${result.status}):\n${result.stdout}${result.stderr}`);
    }

    return {
        exitCode: result.status,
        output: result.stdout + result.stderr,
        report: JSON.parse(readFileSync(reportPath, 'utf8')) as JestReport,
    };
}

beforeEach(() => {
    // Jest requires consistent physical paths on macOS, where /tmp is a symlink.
    workDir = realpathSync(mkdtempSync(join(tmpdir(), 'pvc-jest-')));
    snapshotPath = join(workDir, '__snapshots__', 'matcher.fixture.cjs.snap');
});

afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
});

describe('toMatchPngSnapshot in a real Jest run', () => {
    test('reports obsolete sibling snapshots in CI and removes them on update', () => {
        seedSnapshots({ 'renders 1': BLUE, 'renders 2': BLUE });
        const body = "test('renders', () => expect(received).toMatchPngSnapshot());";

        const checked = runJest(body, false);
        expect(checked.exitCode, checked.output).toBe(1);
        expect(checked.report.snapshot.unchecked).toBe(1);
        expect(checked.report.testResults[0].assertionResults[0].status).toBe('passed');

        const updated = runJest(body, true);
        expect(updated.exitCode, updated.output).toBe(0);
        const snapshots = createRequire(join(workDir, 'matcher.fixture.cjs'))(snapshotPath) as Record<string, string>;
        expect(Object.keys(snapshots)).toEqual(['renders 1']);
    });

    test.each([false, true])('preserves a baseline for test.failing (update: %s)', (update) => {
        seedSnapshots({ 'renders 1': RED });
        const original = readFileSync(snapshotPath, 'utf8');

        const result = runJest("test.failing('renders', () => expect(received).toMatchPngSnapshot());", update);

        expect(result.exitCode, result.output).toBe(0);
        expect(result.report.testResults[0].assertionResults[0].status).toBe('passed');
        expect(result.report.snapshot).toMatchObject({ added: 0, unmatched: 0, updated: 0 });
        expect(readFileSync(snapshotPath, 'utf8')).toBe(original);
    });

    test('does not record missing baselines for test.failing with updates enabled', () => {
        const result = runJest("test.failing('renders', () => expect(received).toMatchPngSnapshot());", true);

        expect(result.exitCode, result.output).toBe(0);
        expect(result.report.snapshot).toMatchObject({ added: 0, unmatched: 0, updated: 0 });
        expect(existsSync(snapshotPath)).toBe(false);
    });

    test.each([false, true])('rejects truncated PNGs instead of writing baselines (existing: %s)', (existing) => {
        if (existing) {
            seedSnapshots({ 'renders 1': RED });
        }
        const original = existing ? readFileSync(snapshotPath, 'utf8') : undefined;
        const result = runJest(
            `test('renders', () => expect(Buffer.from([137,80,78,71,13,10,26,10]))
                .toMatchPngSnapshot({ throwErrorOnInvalidInputData: false }));`,
            true,
        );

        expect(result.exitCode, result.output).toBe(1);
        expect(result.output).toContain('data could not be parsed');
        expect(result.report.snapshot).toMatchObject({ added: 0, updated: 0 });
        expect(existsSync(snapshotPath) ? readFileSync(snapshotPath, 'utf8') : undefined).toBe(original);
    });
});
