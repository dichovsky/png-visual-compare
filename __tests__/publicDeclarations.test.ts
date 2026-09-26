import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { describe, expect, test } from 'vitest';

// The public declarations must not import internal modules whose types reach `pngjs`: a
// consumer type-checking with `skipLibCheck: false` and no `@types/pngjs` would get TS7016
// from a module it never imports (TYPE-06). Emitting one file's declarations in isolation is
// enough to see which modules its `.d.ts` would import.
const INTERNAL_MODULE = /^\.\/(?:comparePngWithPorts|ports\/|pipeline\/)/;

const publicSources = [
    { file: 'src/comparePng.ts', expected: ['node:buffer', './types', './defaults'] },
    { file: 'src/comparePngAsync.ts', expected: ['node:buffer', './types'] },
];

describe('public declarations stay clear of internal modules', () => {
    for (const { file, expected } of publicSources) {
        test(file, () => {
            const { outputText, diagnostics } = ts.transpileDeclaration(readFileSync(file, 'utf8'), {
                fileName: file,
                compilerOptions: { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true },
            });
            const imported = [...outputText.matchAll(/from '([^']+)'/g)].map((match) => match[1]);

            expect(diagnostics).toEqual([]);
            expect(imported.filter((specifier) => INTERNAL_MODULE.test(specifier))).toEqual([]);
            expect(imported).toEqual(expected);
        });
    }
});
