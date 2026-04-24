import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: ['**/node_modules/**', 'e2e/**'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/types/**/*', 'src/index.ts', 'src/pipeline/types.ts', 'src/ports/types.ts', 'src/ports/asyncTypes.ts'],
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 75,
                statements: 90,
            },
        },
    },
});
