import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/generate-codemap.mjs');
const CHILD_ENV = { ...process.env, CODEMAP_SILENT: '1' };

const BASE_CONFIG = JSON.stringify(
    {
        sourceDirs: ['src'],
        entrypoints: ['src/index.ts'],
        exclude: [],
        maxSignatureLength: 200,
        outputSizeWarnBytes: 153600,
    },
    null,
    2,
);

function scaffoldFixture(repoRoot: string, sourceContent: string): void {
    mkdirSync(path.join(repoRoot, 'src'), { recursive: true });
    writeFileSync(path.join(repoRoot, 'src/index.ts'), sourceContent);
    writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({ name: 'cli-fixture', version: '0.0.0' }, null, 2));
    writeFileSync(path.join(repoRoot, 'codemap.config.json'), BASE_CONFIG);
}

describe('generate-codemap.mjs CLI', () => {
    const scratchDirs: string[] = [];

    afterEach(() => {
        for (const dir of scratchDirs.splice(0)) {
            try {
                rmSync(dir, { recursive: true, force: true });
            } catch {
                /* ignore */
            }
        }
    });

    function track(): string {
        const repoRoot = mkdtempSync(path.join(tmpdir(), 'codemap-cli-'));
        scratchDirs.push(repoRoot);
        return repoRoot;
    }

    test('writes CODEMAP.md and exits 0 when invoked without --check', () => {
        const repoRoot = track();
        scaffoldFixture(repoRoot, 'export function publicFn(): number { return 42; }\n');

        const result = spawnSync(process.execPath, [SCRIPT_PATH], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        expect(result.status).toBe(0);
        expect(existsSync(path.join(repoRoot, 'CODEMAP.md'))).toBe(true);
        expect(result.stdout).toContain('Wrote CODEMAP.md');
    });

    test('exits 0 with `up to date` message when CODEMAP.md matches', () => {
        const repoRoot = track();
        scaffoldFixture(repoRoot, 'export const x = 1;\n');

        spawnSync(process.execPath, [SCRIPT_PATH], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });

        const result = spawnSync(process.execPath, [SCRIPT_PATH, '--check'], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('up to date');
    });

    test('exits 1 with a unified diff when CODEMAP.md is stale', () => {
        const repoRoot = track();
        scaffoldFixture(repoRoot, 'export const x = 1;\n');

        spawnSync(process.execPath, [SCRIPT_PATH], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        writeFileSync(path.join(repoRoot, 'src/index.ts'), 'export const x = 2;\n');

        const result = spawnSync(process.execPath, [SCRIPT_PATH, '--check'], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('--- CODEMAP.md');
        expect(result.stderr).toContain('stale');
    });

    test('exits 1 when CODEMAP.md is missing', () => {
        const repoRoot = track();
        scaffoldFixture(repoRoot, 'export const x = 1;\n');

        const result = spawnSync(process.execPath, [SCRIPT_PATH, '--check'], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('not found');
    });

    test('the freshly generated CODEMAP.md is byte-identical when generated twice', () => {
        const repoRoot = track();
        scaffoldFixture(repoRoot, 'export function foo(): void {}\n');

        spawnSync(process.execPath, [SCRIPT_PATH], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        const first = readFileSync(path.join(repoRoot, 'CODEMAP.md'), 'utf8');
        spawnSync(process.execPath, [SCRIPT_PATH], { cwd: repoRoot, encoding: 'utf8', env: CHILD_ENV });
        const second = readFileSync(path.join(repoRoot, 'CODEMAP.md'), 'utf8');
        expect(first).toBe(second);
    });
});
