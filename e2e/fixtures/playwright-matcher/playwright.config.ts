import { defineConfig } from '@playwright/test';

// Driven by e2e/playwright-matcher.test.ts, which sets PVC_E2E_DIR to a fresh directory per run.
const workDir = process.env.PVC_E2E_DIR ?? '';

export default defineConfig({
    testDir: __dirname,
    testMatch: 'matcher.fixture.ts',
    outputDir: `${workDir}/results`,
    snapshotPathTemplate: `${workDir}/snapshots/{arg}{ext}`,
    projects: [{ name: 'matcher' }],
});
