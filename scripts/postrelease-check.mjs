/**
 * Post-release verification for png-visual-compare.
 *
 * Runs AFTER `npm publish` (last step of `.github/workflows/publish.yml`, and
 * runnable locally via `npm run release:check:post`). Confirms the version the
 * repository claims is actually live, correct, and consumable on npm:
 *   1. the version resolves on the registry,
 *   2. the `latest` dist-tag points at it,
 *   3. it carries a provenance attestation (Trusted Publishing / --provenance),
 *   4. a freshly-installed copy imports and exposes the public API.
 *
 * Each registry check retries to absorb CDN propagation lag right after publish.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const { name, version } = pkg;

const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 10_000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function npm(args, options = {}) {
    return spawnSync('npm', args, { encoding: 'utf8', ...options });
}

/**
 * Retry `attempt` (a sync predicate returning boolean) until it returns true or
 * attempts run out, sleeping between tries to absorb registry propagation lag.
 *
 * @param {string} label
 * @param {() => boolean} attempt
 * @returns {Promise<boolean>}
 */
async function withRetry(label, attempt) {
    for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
        if (attempt()) return true;
        if (i < MAX_ATTEMPTS) {
            process.stdout.write(`  …${label}: attempt ${i}/${MAX_ATTEMPTS} not ready, retrying in ${RETRY_DELAY_MS / 1000}s\n`);
            await delay(RETRY_DELAY_MS);
        }
    }
    return false;
}

/** @type {{ ok: boolean, name: string, detail: string }[]} */
const results = [];
const record = (ok, checkName, detail) => results.push({ ok, name: checkName, detail });

// 1. Version resolves on the registry.
async function checkVersionLive() {
    let detail = '';
    const ok = await withRetry('version-live', () => {
        const view = npm(['view', `${name}@${version}`, 'version']);
        const out = (view.stdout ?? '').trim();
        detail = out || (view.stderr ?? '').trim();
        return view.status === 0 && out === version;
    });
    record(
        ok,
        'version-live',
        ok ? `${name}@${version} is live on npm.` : `${name}@${version} did not resolve after ${MAX_ATTEMPTS} attempts (last: ${detail}).`,
    );
}

// 2. `latest` dist-tag points at this version.
async function checkLatestDistTag() {
    let detail = '';
    const ok = await withRetry('dist-tag-latest', () => {
        const view = npm(['view', name, 'dist-tags.latest']);
        detail = (view.stdout ?? '').trim();
        return view.status === 0 && detail === version;
    });
    record(
        ok,
        'dist-tag-latest',
        ok ? `dist-tag "latest" → ${version}.` : `dist-tag "latest" is "${detail}", expected ${version} (after retries).`,
    );
}

// 3. Provenance attestation present.
async function checkProvenance() {
    let detail = '';
    const ok = await withRetry('provenance', () => {
        const view = npm(['view', `${name}@${version}`, '--json']);
        if (view.status !== 0) {
            detail = (view.stderr ?? '').trim();
            return false;
        }
        try {
            const parsed = JSON.parse(view.stdout);
            const meta = Array.isArray(parsed) ? parsed[0] : parsed;
            const attestations = meta?.dist?.attestations;
            if (attestations && (attestations.url || attestations.provenance)) {
                detail = attestations.provenance?.predicateType ?? attestations.url;
                return true;
            }
            detail = 'no dist.attestations field';
            return false;
        } catch {
            detail = 'could not parse npm view --json';
            return false;
        }
    });
    record(ok, 'provenance', ok ? `Provenance attestation present (${detail}).` : `No provenance attestation after retries (${detail}).`);
}

// 4. Install + import smoke test against the published artifact.
async function checkInstallSmoke() {
    const dir = mkdtempSync(path.join(tmpdir(), 'pvc-smoke-'));
    try {
        writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pvc-smoke', version: '0.0.0', private: true }));
        const installed = await withRetry('install', () => {
            const install = npm(['install', '--no-audit', '--no-fund', `${name}@${version}`], { cwd: dir });
            return install.status === 0;
        });
        if (!installed) {
            record(false, 'install-smoke', `Could not install ${name}@${version} into a temp project after ${MAX_ATTEMPTS} attempts.`);
            return;
        }
        const smokeSource = [
            `import(${JSON.stringify(name)}).then((mod) => {`,
            `  const compare = mod.comparePng ?? mod.default?.comparePng;`,
            `  const compareAsync = mod.comparePngAsync ?? mod.default?.comparePngAsync;`,
            `  if (typeof compare !== 'function' || typeof compareAsync !== 'function') {`,
            `    console.error('public API missing: comparePng/comparePngAsync');`,
            `    process.exit(2);`,
            `  }`,
            `  console.log('import ok');`,
            `}).catch((error) => { console.error(error); process.exit(3); });`,
        ].join('\n');
        const smoke = spawnSync(process.execPath, ['--input-type=module', '-e', smokeSource], { cwd: dir, encoding: 'utf8' });
        if (smoke.status === 0) {
            record(true, 'install-smoke', `Installed ${name}@${version} imports and exposes comparePng/comparePngAsync.`);
        } else {
            record(false, 'install-smoke', `Imported package failed smoke test (exit ${smoke.status}): ${(smoke.stderr ?? '').trim()}`);
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

await checkVersionLive();
await checkLatestDistTag();
await checkProvenance();
await checkInstallSmoke();

for (const result of results) {
    const symbol = result.ok ? '✓' : '✗';
    const stream = result.ok ? process.stdout : process.stderr;
    stream.write(`${symbol} ${result.name}: ${result.detail}\n`);
}

const failures = results.filter((result) => !result.ok);
if (failures.length > 0) {
    process.stderr.write(`\nPost-release check FAILED: ${failures.length} of ${results.length} checks did not pass.\n`);
    process.exit(1);
}

process.stdout.write(`\nPost-release check passed: all ${results.length} checks OK for ${name}@${version}.\n`);
