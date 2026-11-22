import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

// A declaration that imports internal PNG types can force consumers to install @types/pngjs (TYPE-06).
const INTERNAL_MODULE = /^\.\/(?:comparePngWithPorts|ports\/|pipeline\/)/;
const IMPORT_SPECIFIER = /(?:from |import\()['"]([^'"]+)['"]/g;

const publicDeclarations = [
    { file: 'comparePng.d.ts', expected: ['./types', './defaults'] },
    { file: 'comparePngAsync.d.ts', expected: ['./types'] },
];

describe('public declarations stay clear of internal modules', () => {
    let outputDir: string;

    beforeAll(() => {
        outputDir = mkdtempSync(join(tmpdir(), 'pvc-declarations-'));
        execFileSync(resolve('node_modules/.bin/tsc'), ['--project', 'tsconfig.prod.json', '--emitDeclarationOnly', '--outDir', outputDir]);
    });

    afterAll(() => {
        rmSync(outputDir, { recursive: true, force: true });
    });

    for (const { file, expected } of publicDeclarations) {
        test(file, () => {
            const declaration = readFileSync(join(outputDir, file), 'utf8');
            const imported = [...declaration.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);

            expect(imported.filter((specifier) => INTERNAL_MODULE.test(specifier))).toEqual([]);
            expect(imported).toEqual(expected);
        });
    }
});
