import { mkdirSync, mkdtempSync, rmSync, writeFileSync, renameSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

process.env.CODEMAP_SILENT = '1';

function requireDefined<T>(value: T | undefined, label: string): T {
    if (value === undefined) throw new Error(`expected ${label} to be defined`);
    return value;
}

const generator = await import('../../scripts/generate-codemap.mjs');

interface FixtureFile {
    relPath: string;
    contents: string;
}

const BASE_CONFIG = {
    sourceDirs: ['src'],
    entrypoints: ['src/index.ts'],
    exclude: ['**/*.test.ts', 'fixtures-internal/**'],
    maxSignatureLength: 200,
    outputSizeWarnBytes: 153600,
};

const BASE_PACKAGE = { name: 'fixture-pkg', version: '0.0.0' };

function writeFixture(repoRoot: string, files: FixtureFile[]): void {
    for (const file of files) {
        const absPath = path.join(repoRoot, file.relPath);
        mkdirSync(path.dirname(absPath), { recursive: true });
        writeFileSync(absPath, file.contents);
    }
}

function setupFixture(files: FixtureFile[], configOverrides: Partial<typeof BASE_CONFIG> = {}): string {
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'codemap-fixture-'));
    writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify(BASE_PACKAGE, null, 2));
    writeFileSync(path.join(repoRoot, 'codemap.config.json'), JSON.stringify({ ...BASE_CONFIG, ...configOverrides }, null, 2));
    writeFixture(repoRoot, files);
    return repoRoot;
}

describe('generate()', () => {
    let scratchDirs: string[] = [];

    beforeEach(() => {
        scratchDirs = [];
    });

    afterEach(() => {
        for (const dir of scratchDirs) {
            try {
                rmSync(dir, { recursive: true, force: true });
            } catch {
                /* ignore */
            }
        }
    });

    function track(repoRoot: string): string {
        scratchDirs.push(repoRoot);
        return repoRoot;
    }

    test('produces byte-identical output across consecutive runs', () => {
        const repoRoot = track(setupFixture([{ relPath: 'src/index.ts', contents: 'export function foo(): number { return 1; }\n' }]));
        const first = generator.generate({ repoRoot }).markdown;
        const second = generator.generate({ repoRoot }).markdown;
        expect(first).toBe(second);
    });

    test('excludes paths matching the exclude globs', () => {
        const repoRoot = track(
            setupFixture([
                { relPath: 'src/index.ts', contents: 'export function publicFn(): void {}\n' },
                { relPath: 'src/foo.test.ts', contents: 'export const SHOULD_NOT_APPEAR = 1;\n' },
            ]),
        );
        const { codemap } = generator.generate({ repoRoot });
        const paths = codemap.files.map((f: { path: string }) => f.path);
        expect(paths).toContain('src/index.ts');
        expect(paths).not.toContain('src/foo.test.ts');
    });

    test('resolves a transitive chain of re-exports', () => {
        const repoRoot = track(
            setupFixture([
                {
                    relPath: 'src/index.ts',
                    contents: "export { Mid } from './mid';\nexport * from './leaf';\n",
                },
                { relPath: 'src/mid.ts', contents: "export { Leaf as Mid } from './leaf';\n" },
                {
                    relPath: 'src/leaf.ts',
                    contents: 'export type Leaf = { value: number };\nexport function helper(): number { return 1; }\n',
                },
            ]),
        );
        const { codemap } = generator.generate({ repoRoot });
        const names = codemap.publicApi.map((p: { name: string }) => p.name).sort();
        expect(names).toContain('Mid');
        expect(names).toContain('Leaf');
        expect(names).toContain('helper');
        const mid = requireDefined(
            codemap.publicApi.find((p: { name: string }) => p.name === 'Mid'),
            'publicApi entry Mid',
        );
        expect(mid.file).toBe('src/leaf.ts');
    });

    test('marks typeOnly=true for `export type *` chains', () => {
        const repoRoot = track(
            setupFixture([
                { relPath: 'src/index.ts', contents: "export type * from './types';\n" },
                {
                    relPath: 'src/types.ts',
                    contents: 'export type Foo = number;\nexport function notATypeButReExportedAsType(): void {}\n',
                },
            ]),
        );
        const { codemap } = generator.generate({ repoRoot });
        const foo = requireDefined(
            codemap.publicApi.find((p: { name: string }) => p.name === 'Foo'),
            'publicApi entry Foo',
        );
        expect(foo.typeOnly).toBe(true);
        const fn = requireDefined(
            codemap.publicApi.find((p: { name: string }) => p.name === 'notATypeButReExportedAsType'),
            'publicApi entry notATypeButReExportedAsType',
        );
        expect(fn.typeOnly).toBe(true);
    });

    test('preserves JSDoc on resolved publicApi entries', () => {
        const repoRoot = track(
            setupFixture([
                { relPath: 'src/index.ts', contents: "export { docced } from './impl';\n" },
                {
                    relPath: 'src/impl.ts',
                    contents: ['/**', ' * The docced function.', ' * @returns nothing', ' */', 'export function docced(): void {}'].join(
                        '\n',
                    ),
                },
            ]),
        );
        const { codemap } = generator.generate({ repoRoot });
        const docced = requireDefined(
            codemap.publicApi.find((p: { name: string }) => p.name === 'docced'),
            'publicApi entry docced',
        );
        expect(docced.jsdoc).toBe('The docced function.');
    });

    test('captures `@sideEffect` metadata as a synthetic publicApi entry', () => {
        const repoRoot = track(
            setupFixture(
                [
                    {
                        relPath: 'src/index.ts',
                        contents: ['/**', ' * @sideEffect Registers a global X.', ' */', 'export {};'].join('\n'),
                    },
                ],
                { entrypoints: ['src/index.ts'] },
            ),
        );
        const { codemap } = generator.generate({ repoRoot });
        const sideEffect = requireDefined(
            codemap.publicApi.find((p: { name: string }) => p.name === '<sideEffect>'),
            'publicApi sideEffect entry',
        );
        expect(sideEffect.signature).toBe('Registers a global X.');
    });

    test('adding a new exported symbol updates both sourceHash and publicApi', () => {
        const repoRoot = track(setupFixture([{ relPath: 'src/index.ts', contents: 'export function existing(): void {}\n' }]));
        const before = generator.generate({ repoRoot }).codemap;
        const beforeNames = before.publicApi.map((p: { name: string }) => p.name);
        expect(beforeNames).toEqual(['existing']);

        writeFileSync(
            path.join(repoRoot, 'src/index.ts'),
            'export function existing(): void {}\nexport function freshlyAdded(): number { return 1; }\n',
        );
        const after = generator.generate({ repoRoot }).codemap;
        const afterNames = after.publicApi.map((p: { name: string }) => p.name).sort();
        expect(afterNames).toEqual(['existing', 'freshlyAdded']);
        expect(after.sourceHash).not.toBe(before.sourceHash);
    });

    test('changes sourceHash but not publicApi when adding a private const', () => {
        const initial: FixtureFile[] = [{ relPath: 'src/index.ts', contents: 'export function publicFn(): void {}\n' }];
        const repoRoot = track(setupFixture(initial));
        const baselinePublicApi = generator.generate({ repoRoot }).codemap.publicApi;
        const baselineHash = generator.generate({ repoRoot }).codemap.sourceHash;

        writeFileSync(path.join(repoRoot, 'src/internal.ts'), 'const SECRET = 1;\n');
        const after = generator.generate({ repoRoot }).codemap;
        expect(after.sourceHash).not.toBe(baselineHash);
        expect(after.publicApi).toEqual(baselinePublicApi);
    });

    test('updates files[].path and sourceHash when a file is renamed', () => {
        const repoRoot = track(
            setupFixture([
                { relPath: 'src/index.ts', contents: 'export function f(): void {}\n' },
                { relPath: 'src/foo.ts', contents: 'export const x = 1;\n' },
            ]),
        );
        const before = generator.generate({ repoRoot }).codemap;
        const beforePaths = before.files.map((f: { path: string }) => f.path);
        expect(beforePaths).toContain('src/foo.ts');

        renameSync(path.join(repoRoot, 'src/foo.ts'), path.join(repoRoot, 'src/bar.ts'));
        const after = generator.generate({ repoRoot }).codemap;
        const afterPaths = after.files.map((f: { path: string }) => f.path);
        expect(afterPaths).not.toContain('src/foo.ts');
        expect(afterPaths).toContain('src/bar.ts');
        expect(after.sourceHash).not.toBe(before.sourceHash);
    });

    test('resolves the correct declarator for multi-declarator `const a=1, b=2; export { b }`', () => {
        const repoRoot = track(
            setupFixture([
                {
                    relPath: 'src/index.ts',
                    contents: "export { second } from './impl';\n",
                },
                {
                    relPath: 'src/impl.ts',
                    contents: 'export const first = 11,\n    second = 22;\n',
                },
            ]),
        );
        const { codemap } = generator.generate({ repoRoot });
        const second = requireDefined(
            codemap.publicApi.find((p: { name: string }) => p.name === 'second'),
            'publicApi entry second',
        );
        expect(second.signature).toContain('second = 22');
        expect(second.signature).not.toContain('first = 11');
        expect(second.line).toBe(2);
    });

    test('preserves literal const RHS but elides arrow-function bodies', () => {
        const repoRoot = track(
            setupFixture([
                {
                    relPath: 'src/index.ts',
                    contents: [
                        'export const KEEP = { r: 1, g: 2, b: 3 };',
                        'export const FN = (a: number, b: number) => { return a + b; };',
                    ].join('\n'),
                },
            ]),
        );
        const { codemap } = generator.generate({ repoRoot });
        const keep = codemap.publicApi.find((p: { name: string }) => p.name === 'KEEP');
        const fn = codemap.publicApi.find((p: { name: string }) => p.name === 'FN');
        if (!keep || !fn) throw new Error('expected KEEP and FN in publicApi');
        expect(keep.signature).toContain('{ r: 1');
        expect(fn.signature).toMatch(/\(a: number, b: number\) =>/);
        expect(fn.signature).not.toContain('return a + b');
    });
});

describe('check()', () => {
    let scratchDirs: string[] = [];

    afterEach(() => {
        for (const dir of scratchDirs) {
            try {
                rmSync(dir, { recursive: true, force: true });
            } catch {
                /* ignore */
            }
        }
        scratchDirs = [];
    });

    function track(repoRoot: string): string {
        scratchDirs.push(repoRoot);
        return repoRoot;
    }

    test('returns ok:true when CODEMAP.md matches the generated output', () => {
        const repoRoot = track(setupFixture([{ relPath: 'src/index.ts', contents: 'export const x = 1;\n' }]));
        const { markdown } = generator.generate({ repoRoot });
        writeFileSync(path.join(repoRoot, 'CODEMAP.md'), markdown);
        const result = generator.check({ repoRoot });
        expect(result.ok).toBe(true);
    });

    test('returns ok:false with diff when CODEMAP.md is stale', () => {
        const repoRoot = track(setupFixture([{ relPath: 'src/index.ts', contents: 'export const x = 1;\n' }]));
        writeFileSync(path.join(repoRoot, 'CODEMAP.md'), 'stale\n');
        const result = generator.check({ repoRoot });
        if (result.ok) throw new Error('expected check to report stale');
        expect(result.diff).toContain('CODEMAP.md');
    });

    test('returns ok:false when CODEMAP.md is missing entirely', () => {
        const repoRoot = track(setupFixture([{ relPath: 'src/index.ts', contents: 'export const x = 1;\n' }]));
        const result = generator.check({ repoRoot });
        if (result.ok) throw new Error('expected check to report missing file');
        expect(result.diff).toContain('not found');
    });
});

describe('formatMarkdown', () => {
    test('emits a 4-space-indented JSON block inside a fenced code block', () => {
        const codemap = {
            schema: 'codemap.v2' as const,
            repo: { name: 'x', version: '1.0.0' },
            sourceHash: 'abc',
            entrypoints: ['src/index.ts'],
            publicApi: [],
            files: [],
        };
        const md = generator.formatMarkdown(codemap);
        expect(md).toContain('# CODEMAP');
        expect(md).toContain('```json\n');
        expect(md).toContain('    "schema": "codemap.v2"');
        expect(md.trim().endsWith('```')).toBe(true);
    });
});

describe('size budget warning', () => {
    test('the production CODEMAP.md stays under the configured budget', () => {
        const repoCodemap = readFileSync(path.join(process.cwd(), 'CODEMAP.md'), 'utf8');
        const config = JSON.parse(readFileSync(path.join(process.cwd(), 'codemap.config.json'), 'utf8'));
        expect(Buffer.byteLength(repoCodemap, 'utf8')).toBeLessThanOrEqual(config.outputSizeWarnBytes);
    });
});
