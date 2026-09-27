/**
 * Consumer install smoke test for png-visual-compare.
 *
 * Usage: node ./scripts/install-smoke.mjs <tarball path | name@version>
 *
 * Installs the spec into a fresh temporary project with `--engine-strict`, then,
 * from inside that project, loads the root entry through both require() and a
 * static ESM import and checks that comparePng and comparePngAsync report the
 * known mismatch count for two PNGs from test-data/. Exits non-zero on failure.
 *
 * Runs in the `engines-floor` job of `.github/workflows/test.yml` (the packed
 * tarball on Node 22.12.0, the `engines.node` floor) and in the install-smoke
 * check of `scripts/postrelease-check.mjs` (the version just published).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = 'png-visual-compare';
const testData = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-data');
const ACTUAL = path.join(testData, 'actual', 'ILTQq.png');
const EXPECTED = path.join(testData, 'expected', 'youtube-play-button.png');
// Same pair and count as __tests__/comparePng.test.ts and __tests__/comparePngAsync.test.ts.
const EXPECTED_MISMATCH = 434926;

const spec = process.argv[2];
if (!spec) {
    process.stderr.write('usage: node ./scripts/install-smoke.mjs <tarball path | name@version>\n');
    process.exit(2);
}
// npm resolves a relative tarball path against the temp project, not the caller's cwd.
const installSpec = existsSync(spec) ? path.resolve(spec) : spec;

// Evaluated as ESM with the temp project as cwd, so the bare specifier resolves from
// that project's node_modules and never from this repository.
const smokeSource = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { comparePng, comparePngAsync } from '${PACKAGE_NAME}';

const required = createRequire(process.cwd() + '/')('${PACKAGE_NAME}');
const actual = ${JSON.stringify(ACTUAL)};
const expected = ${JSON.stringify(EXPECTED)};
assert.equal(required.comparePng(actual, expected), ${EXPECTED_MISMATCH}, 'comparePng via require()');
assert.equal(comparePng(actual, expected), ${EXPECTED_MISMATCH}, 'comparePng via import');
assert.equal(await comparePngAsync(actual, expected), ${EXPECTED_MISMATCH}, 'comparePngAsync via import');
console.log('install smoke ok on Node ' + process.version + ': require() and import load ${PACKAGE_NAME}, comparePng and comparePngAsync report ${EXPECTED_MISMATCH}');
`;

const dir = mkdtempSync(path.join(tmpdir(), 'pvc-smoke-'));
let status = 1;
try {
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pvc-smoke', version: '0.0.0', private: true }));
    // --loglevel=error: the failure message below quotes npm's stderr, which an inherited
    // npm_config_loglevel=silent (`npm run -s release:check:post`) would otherwise blank.
    const install = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--engine-strict', '--loglevel=error', installSpec], {
        cwd: dir,
        encoding: 'utf8',
    });
    if (install.status === 0) {
        status = spawnSync(process.execPath, ['--input-type=module', '-e', smokeSource], { cwd: dir, stdio: 'inherit' }).status ?? 1;
    } else {
        process.stderr.write(`npm install ${installSpec} failed (exit ${install.status}):\n${install.stderr}`);
    }
} finally {
    rmSync(dir, { recursive: true, force: true });
}
process.exit(status);
