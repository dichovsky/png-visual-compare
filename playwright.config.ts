import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 800 },
            },
        },
    ],
});
