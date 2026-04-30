import { defineConfig } from 'vitest/config';

const isFullCoverageRun = process.env.VITEST_FULL_COVERAGE === 'true';

export default defineConfig({
    test: {
        exclude: ['**/node_modules/**', 'e2e/**'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            exclude: [
                'src/types/**/*',
                'src/index.ts',
                'src/pipeline/types.ts',
                'src/ports/types.ts',
                'src/ports/asyncTypes.ts',
                'src/vitest.types.ts',
            ],
            ...(isFullCoverageRun
                ? {
                      all: true,
                      include: ['src/**/*.ts', 'src/**/*.mts'],
                      thresholds: {
                          lines: 100,
                          functions: 100,
                          branches: 100,
                          statements: 100,
                      },
                  }
                : {}),
        },
    },
});
