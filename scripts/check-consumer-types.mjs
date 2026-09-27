/**
 * Consumer type-check of the packed tarball (TYPE-06).
 *
 * Packs the package (run `npm run build` first; `npm run test:consumer-types` does), installs
 * the tarball into a fresh consumer outside the repository together with only the peers whose
 * types the entry points reference, and runs `tsc` with `strict` and `skipLibCheck: false` over
 * a file that imports every public value and type of the root and of the `./jest`, `./vitest`
 * and `./playwright` subpaths, once per module resolution in `RESOLUTIONS`.
 *
 * `@types/pngjs` is deliberately not installed: the public declarations must not reach `pngjs`
 * types, or a consumer who never imports `pngjs` gets TS7016 from our `.d.ts` files. Every
 * diagnostic fails the check, third-party ones included, so none can hide ours.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const tsc = path.join(repoRoot, 'node_modules/@typescript/native/bin/tsc');

// Pinned to the devDependency ranges, so the consumer sees the versions this repo tests against.
const PEERS = ['@types/node', '@playwright/test', 'expect', 'vitest'];

// Playwright's declarations use DOM types, so a consumer type-checking them needs `dom`.
// TypeScript 6+ defaults `types` to `[]`, so Node's globals must be listed.
const BASE_OPTIONS = { strict: true, skipLibCheck: false, noEmit: true, target: 'es2022', lib: ['es2023', 'dom'], types: ['node'] };

const RESOLUTIONS = {
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
import { registerJestPngSnapshotMatcher } from 'png-visual-compare/jest';
import 'png-visual-compare/vitest';
import { expect as playwrightExpect, pngMatchers } from 'png-visual-compare/playwright';

const area: Area = { x1: 0, y1: 0, x2: 1, y2: 1 };
const color: Color = DEFAULT_EXCLUDED_AREA_COLOR;
const pixelmatchOptions: PixelmatchOptions = { threshold: 0.1 };
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

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
    if (result.error) {
        throw result.error;
    }
    return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
}

function mustRun(command, args, cwd) {
    const result = run(command, args, cwd);
    if (!result.ok) {
        throw new Error(`\`${command} ${args.join(' ')}\` failed:\n${result.output}`);
    }
    return result.output;
}

function packTarball(destination) {
    const parsed = JSON.parse(mustRun('npm', ['pack', '--json', '--pack-destination', destination], repoRoot));
    // npm <= 11 prints an array of pack results; npm 12 prints an object keyed by package name.
    const entry = Array.isArray(parsed) ? parsed[0] : parsed[pkg.name];
    return path.join(destination, entry.filename);
}

function createConsumer(consumerDir, tarball) {
    writeFileSync(path.join(consumerDir, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
    const peers = PEERS.map((name) => `${name}@${pkg.devDependencies[name]}`);
    mustRun('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball, ...peers], consumerDir);

    if (existsSync(path.join(consumerDir, 'node_modules/@types/pngjs'))) {
        throw new Error('The consumer resolved @types/pngjs, so it cannot detect declarations that reach pngjs types.');
    }

    writeFileSync(path.join(consumerDir, 'consumer.ts'), CONSUMER_SOURCE);
}

function typecheck(consumerDir, name, resolution) {
    const config = `tsconfig.${name}.json`;
    const compilerOptions = { ...BASE_OPTIONS, ...resolution };
    writeFileSync(path.join(consumerDir, config), JSON.stringify({ compilerOptions, files: ['consumer.ts'] }));
    const result = run(process.execPath, [tsc, '--pretty', 'false', '--project', config], consumerDir);
    process.stdout.write(`${result.ok ? '✓' : '✗'} moduleResolution ${name}\n${result.output ? `${result.output}\n` : ''}`);
    return result.ok;
}

const workDir = mkdtempSync(path.join(tmpdir(), 'png-visual-compare-consumer-'));

try {
    createConsumer(workDir, packTarball(workDir));
    const failed = Object.entries(RESOLUTIONS).filter(([name, resolution]) => !typecheck(workDir, name, resolution));

    if (failed.length > 0) {
        process.stderr.write(`\nConsumer type-check FAILED under: ${failed.map(([name]) => name).join(', ')}.\n`);
        process.exitCode = 1;
    } else {
        process.stdout.write('\nConsumer type-check passed.\n');
    }
} finally {
    rmSync(workDir, { recursive: true, force: true });
}
