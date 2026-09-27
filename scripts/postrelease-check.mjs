/**
 * Post-release verification for png-visual-compare.
 *
 * Runs AFTER `npm publish` (last step of `.github/workflows/publish.yml`, and
 * runnable locally via `npm run release:check:post`). Confirms the version the
 * repository claims is actually live, correct, and consumable on npm:
 *   1. the version resolves on the registry,
 *   2. the `latest` dist-tag points at it,
 *   3. it carries a provenance attestation (Trusted Publishing / --provenance),
 *   4. a freshly-installed copy loads via require() and import and compares PNGs
 *      correctly (scripts/install-smoke.mjs).
 *
 * Each registry check retries to absorb CDN propagation lag right after publish.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const { name, version } = pkg;

const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 10_000;
const DEFAULT_DELAYS_MS = Array(MAX_ATTEMPTS - 1).fill(RETRY_DELAY_MS);
// version-live runs first, straight after publish, while the registry CDN can
// still serve a stale packument for minutes ("may take a few minutes to become
// available"; the 7.0.0 publish took ~90s). Doubling backoff, ~5 min in total.
const VERSION_LIVE_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 80_000, 160_000];

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
 * @param {number[]} [delaysMs] wait before each retry; attempts = delaysMs.length + 1
 * @returns {Promise<boolean>}
 */
async function withRetry(label, attempt, delaysMs = DEFAULT_DELAYS_MS) {
    const attempts = delaysMs.length + 1;
    for (let i = 1; i <= attempts; i += 1) {
        if (attempt()) return true;
        if (i < attempts) {
            process.stdout.write(`  …${label}: attempt ${i}/${attempts} not ready, retrying in ${delaysMs[i - 1] / 1000}s\n`);
            await delay(delaysMs[i - 1]);
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
    const ok = await withRetry(
        'version-live',
        () => {
            const view = npm(['view', `${name}@${version}`, 'version']);
            const out = (view.stdout ?? '').trim();
            detail = out || (view.stderr ?? '').trim();
            return view.status === 0 && out === version;
        },
        VERSION_LIVE_DELAYS_MS,
    );
    const attempts = VERSION_LIVE_DELAYS_MS.length + 1;
    record(
        ok,
        'version-live',
        ok ? `${name}@${version} is live on npm.` : `${name}@${version} did not resolve after ${attempts} attempts (last: ${detail}).`,
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

// 4. Install + smoke test against the published artifact (scripts/install-smoke.mjs,
// shared with the engines-floor CI job). The whole run is retried, since the install
// can hit the same propagation lag as the checks above.
async function checkInstallSmoke() {
    let detail = '';
    const ok = await withRetry('install-smoke', () => {
        const smoke = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'install-smoke.mjs'), `${name}@${version}`], {
            encoding: 'utf8',
        });
        detail = (smoke.stderr ?? '').trim();
        return smoke.status === 0;
    });
    record(
        ok,
        'install-smoke',
        ok
            ? `Installed ${name}@${version} loads via require() and import; comparePng/comparePngAsync return the expected mismatch count.`
            : `Install smoke for ${name}@${version} failed after ${MAX_ATTEMPTS} attempts: ${detail}`,
    );
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
