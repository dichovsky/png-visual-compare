import { describe, expect, test } from 'vitest';
import ts from 'typescript';

const generator = await import('../../scripts/generate-codemap.mjs');

function parseSource(code: string): ts.SourceFile {
    return ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, /* setParentNodes */ true);
}

function findFirstStatement<T extends ts.Statement>(sourceFile: ts.SourceFile, predicate: (s: ts.Statement) => s is T): T {
    const found = sourceFile.statements.find(predicate);
    if (!found) throw new Error('statement not found in fixture');
    return found;
}

describe('globToRegExp', () => {
    const cases: { glob: string; matches: string[]; nonMatches: string[] }[] = [
        {
            glob: '**/*.test.ts',
            matches: ['foo.test.ts', 'a/b/c.test.ts', '__tests__/codemap/helpers.test.ts'],
            nonMatches: ['foo.ts', 'foo.test.js'],
        },
        {
            glob: 'out/**',
            matches: ['out/index.js', 'out/nested/dir/file.ts'],
            nonMatches: ['src/out.ts', 'out'],
        },
        {
            glob: 'src/types/*.ts',
            matches: ['src/types/area.ts'],
            nonMatches: ['src/types/sub/area.ts', 'src/area.ts'],
        },
    ];

    for (const { glob, matches, nonMatches } of cases) {
        test(`pattern ${glob}`, () => {
            const regex = generator.globToRegExp(glob);
            for (const match of matches) {
                expect(regex.test(match), `${glob} should match ${match}`).toBe(true);
            }
            for (const nonMatch of nonMatches) {
                expect(regex.test(nonMatch), `${glob} should not match ${nonMatch}`).toBe(false);
            }
        });
    }
});

describe('normalizeSignature', () => {
    test('collapses newlines and indentation to single spaces', () => {
        const input = 'function\n   foo(  a:\n  number\n): number';
        expect(generator.normalizeSignature(input)).toBe('function foo( a: number ): number');
    });

    test('preserves whitespace inside string literals', () => {
        const input = 'const greeting = "hello   world\\n!"';
        expect(generator.normalizeSignature(input)).toBe('const greeting = "hello   world\\n!"');
    });

    test('drops both line and block comments', () => {
        const input = 'function foo() /* inline */ : number\n// trailing\n;';
        expect(generator.normalizeSignature(input)).toBe('function foo() : number ;');
    });

    test('preserves template literal contents', () => {
        const input = 'const x = `a   b\n  c`';
        expect(generator.normalizeSignature(input)).toBe('const x = `a   b\n  c`');
    });
});

describe('extractJSDoc', () => {
    test('returns undefined when no JSDoc is present', () => {
        const sf = parseSource('function foo() {}');
        const node = findFirstStatement(sf, ts.isFunctionDeclaration);
        expect(generator.extractJSDoc(node)).toBeUndefined();
    });

    test('extracts the leading paragraph and drops @param / @returns', () => {
        const sf = parseSource(
            [
                '/**',
                ' * Compares two PNGs.',
                ' * @param a left image',
                ' * @returns mismatched pixel count',
                ' */',
                'function compare(a: number): number { return a; }',
            ].join('\n'),
        );
        const node = findFirstStatement(sf, ts.isFunctionDeclaration);
        expect(generator.extractJSDoc(node)).toBe('Compares two PNGs.');
    });

    test('preserves @deprecated, @since, and first @example only', () => {
        const sf = parseSource(
            [
                '/**',
                ' * Old API.',
                ' * @deprecated use newApi instead',
                ' * @since 6.0.0',
                ' * @example oldApi(1)',
                ' * @example oldApi(2)',
                ' */',
                'function oldApi(): void {}',
            ].join('\n'),
        );
        const node = findFirstStatement(sf, ts.isFunctionDeclaration);
        const doc = generator.extractJSDoc(node);
        expect(doc).toContain('Old API.');
        expect(doc).toContain('@deprecated use newApi instead');
        expect(doc).toContain('@since 6.0.0');
        expect(doc).toContain('@example oldApi(1)');
        expect(doc).not.toContain('@example oldApi(2)');
    });

    test('keeps only the first paragraph of the description', () => {
        const sf = parseSource(
            ['/**', ' * First paragraph.', ' *', ' * Second paragraph that should be discarded.', ' */', 'function foo(): void {}'].join(
                '\n',
            ),
        );
        const node = findFirstStatement(sf, ts.isFunctionDeclaration);
        expect(generator.extractJSDoc(node)).toBe('First paragraph.');
    });
});

describe('extractSignature', () => {
    test('slices a function signature up to the body opening brace', () => {
        const sf = parseSource('function add(a: number, b: number): number { return a + b; }');
        const node = findFirstStatement(sf, ts.isFunctionDeclaration);
        expect(generator.extractSignature(sf, node, 200)).toBe('function add(a: number, b: number): number');
    });

    test('keeps full text for type aliases when short', () => {
        const sf = parseSource('type Foo = { a: number; b: string };');
        const node = findFirstStatement(sf, ts.isTypeAliasDeclaration);
        expect(generator.extractSignature(sf, node, 200)).toBe('type Foo = { a: number; b: string };');
    });

    test('truncates type aliases longer than maxSignatureLength with an ellipsis', () => {
        const longRhs = 'string'.repeat(80);
        const sf = parseSource(`type Long = ${longRhs};`);
        const node = findFirstStatement(sf, ts.isTypeAliasDeclaration);
        const sig = generator.extractSignature(sf, node, 50);
        expect(sig.length).toBe(51);
        expect(sig.endsWith('…')).toBe(true);
    });

    test('stops a class signature at the opening brace of its body', () => {
        const sf = parseSource('class Foo<T> extends Bar implements Baz { x = 1; }');
        const node = findFirstStatement(sf, ts.isClassDeclaration);
        expect(generator.extractSignature(sf, node, 200)).toBe('class Foo<T> extends Bar implements Baz');
    });
});

describe('extractClassMembers', () => {
    test('returns members in source line order with normalized kinds', () => {
        const sf = parseSource(
            [
                'class C {',
                '    public x = 1;',
                '    constructor(private y: number) {}',
                '    method(): void {}',
                '    get prop(): number { return this.x; }',
                '    set prop(v: number) {}',
                '}',
            ].join('\n'),
        );
        const cls = findFirstStatement(sf, ts.isClassDeclaration);
        const members = generator.extractClassMembers(sf, cls);
        expect(members.map((m: { name: string; kind: string }) => `${m.kind}:${m.name}`)).toEqual([
            'property:x',
            'constructor:constructor',
            'method:method',
            'getter:prop',
            'setter:prop',
        ]);
        for (let i = 1; i < members.length; i += 1) {
            expect(members[i].line).toBeGreaterThanOrEqual(members[i - 1].line);
        }
    });
});

describe('computeSourceHash', () => {
    test('is stable for identical inputs and changes when content changes', () => {
        const a = new Map([
            ['src/a.ts', 'export const x = 1;'],
            ['src/b.ts', 'export const y = 2;'],
        ]);
        const config = '{"sourceDirs":["src"]}';
        const first = generator.computeSourceHash(a, config);
        const second = generator.computeSourceHash(a, config);
        expect(first).toBe(second);

        const mutated = new Map(a);
        mutated.set('src/a.ts', 'export const x = 2;');
        expect(generator.computeSourceHash(mutated, config)).not.toBe(first);
    });

    test('depends on the config bytes', () => {
        const files = new Map([['src/a.ts', 'export const x = 1;']]);
        const baseHash = generator.computeSourceHash(files, '{}');
        const otherHash = generator.computeSourceHash(files, '{"extra":true}');
        expect(baseHash).not.toBe(otherHash);
    });

    test('changes when a file is renamed without content change', () => {
        const before = new Map([['src/old.ts', 'export const x = 1;']]);
        const after = new Map([['src/new.ts', 'export const x = 1;']]);
        expect(generator.computeSourceHash(before, '{}')).not.toBe(generator.computeSourceHash(after, '{}'));
    });

    test('is order-independent (input Map iteration order does not affect hash)', () => {
        const a = new Map([
            ['src/a.ts', 'a'],
            ['src/b.ts', 'b'],
        ]);
        const b = new Map([
            ['src/b.ts', 'b'],
            ['src/a.ts', 'a'],
        ]);
        expect(generator.computeSourceHash(a, '{}')).toBe(generator.computeSourceHash(b, '{}'));
    });
});

describe('unifiedDiff', () => {
    test('returns headers plus first changed lines up to the cap', () => {
        const before = 'line1\nline2\nline3';
        const after = 'line1\nlineTWO\nline3';
        const diff = generator.unifiedDiff(before, after, 40);
        expect(diff).toContain('- line2');
        expect(diff).toContain('+ lineTWO');
        expect(diff.split('\n').length).toBeLessThanOrEqual(40);
    });
});
