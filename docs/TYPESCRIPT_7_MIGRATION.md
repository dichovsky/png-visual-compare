# TypeScript 7 Migration Plan

## Goal

Use the TypeScript 7 native compiler for repository type-checking and package builds. Keep the TypeScript 6 compiler API for the codemap generator, codemap tests, and `typescript-eslint`.

## Constraints

- TypeScript 7.0 does not provide the legacy JavaScript compiler API that repository scripts require.
- `scripts/generate-codemap.mjs` and `__tests__/codemap/helpers.test.mts` import `typescript` and call its compiler API.
- `typescript-eslint` requires the TypeScript 6 compiler API.
- The published package does not include TypeScript as a runtime dependency. This split toolchain affects development only.

## Dependency Layout

| Dependency name      | Package                          | Purpose                                                     |
| -------------------- | -------------------------------- | ----------------------------------------------------------- |
| `@typescript/native` | `typescript@~7.0.2`              | Provides the native compiler for `build` and `typecheck`    |
| `typescript`         | `@typescript/typescript6@~6.0.2` | Provides the TypeScript 6 compiler API for repository tools |

The compatibility package installs TypeScript 6, which also includes a `tsc` binary. The `build` and `typecheck` scripts run `node_modules/@typescript/native/bin/tsc` directly so they always use the TypeScript 7 native compiler.

## Migration Steps

1. Replace the direct TypeScript 6 dependency with the `@typescript/typescript6` alias.
2. Add TypeScript 7 under the `@typescript/native` alias.
3. Update `package-lock.json`.
4. Verify that the native compiler reports TypeScript 7 and `typescript` imports resolve to TypeScript 6.
5. Run type-checking and a production build.
6. Run codemap validation and ESLint to test compiler API consumers.
7. Run the full unit and end-to-end test suite.

## Acceptance Criteria

- `node node_modules/@typescript/native/bin/tsc --version` reports `7.0.x`.
- `import 'typescript'` resolves to `6.0.x` and exports `createProgram`.
- Type-checking and production declaration emit pass.
- Codemap validation and ESLint pass.
- Unit coverage and end-to-end tests pass.
- Generated runtime package files stay inside `out`.

## Implementation Result

Completed on 2026-07-23:

- Native compiler: TypeScript 7.0.2.
- Compiler API: TypeScript 6.0.3 through the compatibility package.
- Type-checking and production build: passed.
- Codemap, ESLint, Prettier, and license checks: passed.
- Unit tests: passed with 100% statement, branch, function, and line coverage.
- End-to-end tests: passed.
- Package dry run: passed with generated runtime files in `out`.

## Implementation Notes

The installation required two npm adjustments:

1. A plain `npm install` kept the existing `typescript@6.0.3` lockfile entry instead of replacing it with the alias. Installing the alias explicitly updated `package-lock.json`. A clean `npm ci` verified that the lockfile is reproducible.
2. Both the native compiler package and TypeScript 6 provide a `tsc` binary. The `build` and `typecheck` scripts call `node_modules/@typescript/native/bin/tsc` by path so the binary link order does not affect builds.

No source code or `tsconfig` changes were needed.

## Follow-up

Review this split toolchain when TypeScript 7.1 provides a stable compiler API and `typescript-eslint` supports it. Then test a single `typescript` dependency and remove the compatibility alias if all checks pass.

## Rollback

Remove `@typescript/native`, set `typescript` back to `~6.0.3`, update `package-lock.json`, and run the test suite.
