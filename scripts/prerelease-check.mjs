/**
 * Pre-release verification gate for png-visual-compare.
 *
 * Asserts the repository is in a publishable state BEFORE `npm publish` runs:
 *   1. the version in package.json is not already published on npm,
 *   2. CHANGELOG.md has a section for the version (not just [Unreleased]),
 *   3. CODEMAP.md is stamped with the same version,
 *   4. package-lock.json agrees on the version,
 *   5. the package tarball would ship only `./out`,
 *   6. (CI only) the release tag matches the version.
 *
 * Exits non-zero on the first set of failures so a release can never ship with
 * drifted metadata. Run locally with `npm run release:check:pre` (build first so
 * the pack-contents check sees `./out`). Wired as the gate before `npm publish`
 * in `.github/workflows/publish.yml`, which sets `RELEASE_TAG` from the GitHub
 * Release tag to enable check 6.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readJson(relativePath) {
    return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

const pkg = readJson('package.json');
const { name, version } = pkg;

/** @type {{ ok: boolean, name: string, detail: string }[]} */
const results = [];

function record(ok, checkName, detail) {
    results.push({ ok, name: checkName, detail });
}

function npm(args) {
    return spawnSync('npm', args, { encoding: 'utf8' });
}

// 1. Version must not already be published on npm.
function checkVersionNotPublished() {
    const view = npm(['view', `${name}@${version}`, 'version']);
    const stdout = (view.stdout ?? '').trim();
    const stderr = view.stderr ?? '';
    if (view.status === 0 && stdout.length > 0) {
        record(false, 'version-not-published', `${name}@${version} is already published on npm; bump the version before releasing.`);
        return;
    }
    if (/E404|404 Not Found|No match found/.test(stderr)) {
        record(true, 'version-not-published', `${name}@${version} is not yet on npm.`);
        return;
    }
    record(
        false,
        'version-not-published',
        `Could not verify npm publish status (npm view exited ${view.status}): ${stderr.trim() || 'unknown error'}`,
    );
}

// 2. CHANGELOG has a section for this version.
function checkChangelogSection() {
    const changelog = readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
    const heading = `## [${version}]`;
    if (changelog.includes(heading)) {
        record(true, 'changelog-section', `Found "${heading}" in CHANGELOG.md.`);
    } else {
        record(
            false,
            'changelog-section',
            `CHANGELOG.md has no "${heading}" section; cut the [Unreleased] entries into a ${version} heading.`,
        );
    }
}

// 3. CODEMAP version stamp matches package.json.
function checkCodemapVersion() {
    const codemap = readFileSync(path.join(repoRoot, 'CODEMAP.md'), 'utf8');
    const match = codemap.match(/"version":\s*"([^"]+)"/);
    const stamped = match?.[1];
    if (stamped === version) {
        record(true, 'codemap-version', `CODEMAP.md is stamped ${version}.`);
    } else {
        record(false, 'codemap-version', `CODEMAP.md version is ${stamped ?? '(missing)'}, expected ${version}; run \`npm run codemap\`.`);
    }
}

// 4. Lockfile version matches package.json.
function checkLockfileVersion() {
    const lock = readJson('package-lock.json');
    const rootVersion = lock.version;
    const selfEntryVersion = lock.packages?.['']?.version;
    if (rootVersion === version && (selfEntryVersion === undefined || selfEntryVersion === version)) {
        record(true, 'lockfile-version', `package-lock.json is at ${version}.`);
    } else {
        record(
            false,
            'lockfile-version',
            `package-lock.json version is ${rootVersion}/${selfEntryVersion}, expected ${version}; run \`npm install\`.`,
        );
    }
}

// 5. npm pack ships only ./out plus the files npm always includes.
// package.json, README*, and LICENSE/LICENCE* are bundled by npm regardless of
// the "files" field, so they are allowed at the tarball root; everything else
// must live under out/.
const ALWAYS_INCLUDED = /^(package\.json|readme(\.[^/]+)?|licen[sc]e(\.[^/]+)?)$/i;

function checkPackContents() {
    const pack = npm(['pack', '--dry-run', '--json']);
    if (pack.status !== 0) {
        record(false, 'pack-contents', `\`npm pack --dry-run\` failed (exit ${pack.status}): ${(pack.stderr ?? '').trim()}`);
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(pack.stdout);
    } catch {
        record(false, 'pack-contents', 'Could not parse `npm pack --dry-run --json` output.');
        return;
    }
    const files = (Array.isArray(parsed) ? parsed[0]?.files : undefined) ?? [];
    if (files.length === 0) {
        record(false, 'pack-contents', 'Package tarball would be empty; run `npm run build` before releasing.');
        return;
    }
    const stray = files.map((file) => file.path).filter((filePath) => !filePath.startsWith('out/') && !ALWAYS_INCLUDED.test(filePath));
    if (stray.length > 0) {
        record(false, 'pack-contents', `Tarball would include unexpected files: ${stray.join(', ')}`);
    } else {
        record(true, 'pack-contents', `Tarball ships ${files.length} files (out/ + npm metadata only).`);
    }
}

// 6. In CI, the release tag must match the version.
function checkReleaseTag() {
    const tag = process.env.RELEASE_TAG;
    if (!tag) {
        record(true, 'release-tag', 'RELEASE_TAG not set (local run); skipping tag/version match.');
        return;
    }
    const expected = `release/v${version}`;
    if (tag === expected) {
        record(true, 'release-tag', `Release tag ${tag} matches version.`);
    } else {
        record(false, 'release-tag', `Release tag is "${tag}", expected "${expected}".`);
    }
}

checkVersionNotPublished();
checkChangelogSection();
checkCodemapVersion();
checkLockfileVersion();
checkPackContents();
checkReleaseTag();

for (const result of results) {
    const symbol = result.ok ? '✓' : '✗';
    const stream = result.ok ? process.stdout : process.stderr;
    stream.write(`${symbol} ${result.name}: ${result.detail}\n`);
}

const failures = results.filter((result) => !result.ok);
if (failures.length > 0) {
    process.stderr.write(`\nPre-release check FAILED: ${failures.length} of ${results.length} checks did not pass.\n`);
    process.exit(1);
}

process.stdout.write(`\nPre-release check passed: all ${results.length} checks OK for ${name}@${version}.\n`);
