import tseslint from 'typescript-eslint';

export default tseslint.config(
    tseslint.configs.recommended,
    {
        ignores: ['out/', 'coverage/', 'test-results/', 'dist/'],
    },
);