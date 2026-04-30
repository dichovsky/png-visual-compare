import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: ['**/node_modules/**', 'e2e/**'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts', 'src/**/*.mts'],
            exclude: [
                'src/types/**/*',
                'src/index.ts',
                'src/pipeline/types.ts',
                'src/ports/types.ts',
                'src/ports/asyncTypes.ts',
                'src/vitest.types.ts',
            ],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100,
            },
        },
    },
});
