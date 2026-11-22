/** Check the packed declarations from a strict ESM consumer with no @types/pngjs (TYPE-06). */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tsc = path.join(repoRoot, 'node_modules/.bin/tsc');
const lock: { packages: Record<string, { version: string }> } = JSON.parse(readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'));
// Install the same peer and Node declarations used by the repository build.
const peers = ['@types/node', '@playwright/test', 'expect', 'vitest'].map(
    (name) => `${name}@${lock.packages[`node_modules/${name}`].version}`,
);

// Playwright needs DOM types. The consumer also imports Node's Buffer.
const baseOptions = { strict: true, skipLibCheck: false, noEmit: true, target: 'es2022', lib: ['es2023', 'dom'], types: ['node'] };
const resolutions = {
    node16: { module: 'node16', moduleResolution: 'node16' },
    bundler: { module: 'esnext', moduleResolution: 'bundler' },
};

const CONSUMER_SOURCE = `import { Buffer } from 'node:buffer';
import { expect as jestExpect } from 'expect';
import { expect as vitestExpect } from 'vitest';
import {
    comparePng,
    comparePngAsync,
    ComparisonError,
    DEFAULT_EXCLUDED_AREA_COLOR,
    DEFAULT_EXTENDED_AREA_COLOR,
    DEFAULT_MAX_DIMENSION,
    DEFAULT_MAX_FILE_BYTES,
    DEFAULT_MAX_PIXELS,
    InvalidInputError,
    PathValidationError,
    ResourceLimitError,
    type Area,
    type Color,
    type ComparePngOptions,
    type PixelmatchOptions,
} from 'png-visual-compare';
// @ts-expect-error LoadedPng was removed in 8.0.0 (TYPE-06).
import type { LoadedPng } from 'png-visual-compare';
import { registerJestPngSnapshotMatcher } from 'png-visual-compare/jest';
import 'png-visual-compare/vitest';
import { expect as playwrightExpect, pngMatchers } from 'png-visual-compare/playwright';

const area: Area = { x1: 0, y1: 0, x2: 1, y2: 1 };
const color: Color = DEFAULT_EXCLUDED_AREA_COLOR;
const pixelmatchOptions: PixelmatchOptions = { threshold: 0.1, windowSize: 8, ignoreMask: new Uint8Array(4) };
const options: ComparePngOptions = {
    excludedAreas: [area],
    excludedAreaColor: color,
    extendedAreaColor: DEFAULT_EXTENDED_AREA_COLOR,
    maxDimension: DEFAULT_MAX_DIMENSION,
    maxFileBytes: DEFAULT_MAX_FILE_BYTES,
    maxPixels: DEFAULT_MAX_PIXELS,
    pixelmatchOptions,
};

const png = Buffer.alloc(0);
const mismatched: number = comparePng(png, 'b.png', options);
const pending: Promise<number> = comparePngAsync('a.png', png);

function isLibraryError(error: unknown): boolean {
    return (
        error instanceof ComparisonError ||
        error instanceof InvalidInputError ||
        error instanceof PathValidationError ||
        error instanceof ResourceLimitError
    );
}

registerJestPngSnapshotMatcher(jestExpect);
jestExpect(png).toMatchPngSnapshot('named', options);
vitestExpect(png).toMatchPngSnapshot(options);
playwrightExpect(png).toMatchPngSnapshot('named.png', options);

export { isLibraryError, mismatched, pending, pngMatchers };
`;

const consumerDir = mkdtempSync(path.join(tmpdir(), 'png-visual-compare-consumer-'));

try {
    const filename = execFileSync('npm', ['pack', '--loglevel=error', '--pack-destination', consumerDir], {
        cwd: repoRoot,
        encoding: 'utf8',
    }).trim();
    writeFileSync(path.join(consumerDir, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(consumerDir, filename), ...peers], {
        cwd: consumerDir,
        stdio: 'inherit',
    });

    if (existsSync(path.join(consumerDir, 'node_modules/@types/pngjs'))) {
        throw new Error('The consumer installed @types/pngjs, which can hide a broken public declaration.');
    }
    writeFileSync(path.join(consumerDir, 'consumer.ts'), CONSUMER_SOURCE);

    for (const [name, resolution] of Object.entries(resolutions)) {
        const compilerOptions = { ...baseOptions, ...resolution };
        writeFileSync(path.join(consumerDir, 'tsconfig.json'), JSON.stringify({ compilerOptions, files: ['consumer.ts'] }));
        console.log(`Checking packed declarations with moduleResolution ${name}`);
        const result = spawnSync(tsc, ['--pretty', 'false', '--project', 'tsconfig.json'], { cwd: consumerDir, stdio: 'inherit' });
        if (result.error) throw result.error;
        if (result.status !== 0) process.exitCode = 1;
    }
} finally {
    rmSync(consumerDir, { recursive: true, force: true });
}
