import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

test('the pre-release check rejects a tarball that only contains npm metadata', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'pvc-prerelease-'));
    try {
        const manifest = { name: 'fixture', version: '1.0.0' };
        writeFileSync(path.join(directory, 'package.json'), JSON.stringify(manifest));
        writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify(manifest));
        writeFileSync(path.join(directory, 'CHANGELOG.md'), '## [1.0.0]\n');
        writeFileSync(path.join(directory, 'CODEMAP.md'), JSON.stringify(manifest));
        writeFileSync(
            path.join(directory, 'npm'),
            `#!/usr/bin/env node
if (process.argv[2] === 'view') {
    console.error('E404 No match found');
    process.exit(1);
}
if (process.argv[2] !== 'pack') process.exit(2);
console.log(JSON.stringify({fixture: {files: [{path: 'package.json'}, {path: 'README.md'}, {path: 'LICENSE'}]}}));
`,
            { mode: 0o755 },
        );
        const check = spawnSync(process.execPath, [path.join(import.meta.dirname, '..', 'scripts', 'prerelease-check.mts')], {
            cwd: directory,
            encoding: 'utf8',
            env: { ...process.env, PATH: [directory, process.env.PATH].join(path.delimiter), RELEASE_TAG: 'release/v1.0.0' },
        });
        expect(check.status).toBe(1);
        expect(check.stderr).toContain('Package tarball has no build output');
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
