# TypeScript 7 Migration Plan

## Goal

Use the TypeScript 7 native compiler for repository type-checking and package
builds while preserving the TypeScript 6 compiler API required by the codemap
generator, its tests, and `typescript-eslint`.

## Constraints

- TypeScript 7.0 does not expose the stable, legacy-compatible JavaScript
  compiler API required by the repository tooling.
- `scripts/generate-codemap.mjs` and `__tests__/codemap/helpers.test.mts` import
  `typescript` and use its compiler API.
- `typescript-eslint` 8.65 supports TypeScript versions below 6.1.
- The public package does not expose TypeScript as a runtime dependency, so the
  split toolchain affects development only.

## Dependency Layout

| Dependency name      | Package                          | Purpose                                                           |
| -------------------- | -------------------------------- | ----------------------------------------------------------------- |
| `@typescript/native` | `typescript@~7.0.2`              | Provides the native compiler used by `build` and `typecheck`      |
| `typescript`         | `@typescript/typescript6@~6.0.2` | Provides the TypeScript 6 compiler API used by repository tooling |

The compatibility package transitively installs TypeScript 6, which also exposes
a `tsc` binary. Clean installs from the lockfile link `.bin/tsc` to the native
compiler, but an incremental dependency replacement temporarily retained the
TypeScript 6 link. The `build` and `typecheck` scripts invoke
`node_modules/@typescript/native/bin/tsc` explicitly so compiler selection does
not depend on install history.

## Migration Steps

1. Replace the direct TypeScript 6 development dependency with the official
   TypeScript 6 compatibility-package alias.
2. Add TypeScript 7 under the `@typescript/native` alias.
3. Regenerate `package-lock.json`.
4. Confirm that the native compiler reports TypeScript 7 and `typescript`
   imports resolve to the TypeScript 6 API.
5. Run type-checking and a production build.
6. Run codemap validation and linting to exercise compiler-API consumers.
7. Run the complete unit and end-to-end test suite.

## Acceptance Criteria

- `node node_modules/@typescript/native/bin/tsc --version` reports 7.0.x.
- `import 'typescript'` resolves to 6.0.x and exposes `createProgram`.
- Type-checking and production declaration emit succeed.
- Codemap validation and ESLint succeed.
- Unit coverage and end-to-end tests pass.
- Generated runtime package files remain limited to `out`.

## Implementation Result

Completed on 2026-07-23:

- Native compiler: TypeScript 7.0.2.
- Compiler API: TypeScript 6.0.3 through the compatibility package.
- Type-checking and production build: passed.
- Codemap, ESLint, Prettier, and license checks: passed.
- Unit tests: 406 passed with 100% statement, branch, function, and line coverage.
- End-to-end tests: 47 passed.
- Package dry run: passed with generated runtime files under `out`.

## Implementation Deviations

The intended side-by-side architecture did not change, but installation exposed
two npm-specific details that required adjustments:

1. A plain `npm install` initially retained the existing locked
   `typescript@6.0.3` package instead of replacing it with the compatibility
   alias. Installing the alias explicitly corrected `package-lock.json`; a
   subsequent `npm ci` verified that the corrected lockfile is reproducible.
2. Both the native compiler package and the TypeScript 6 package transitively
   used by the compatibility layer publish a binary named `tsc`. During the
   incremental alias replacement, npm temporarily retained a top-level
   `.bin/tsc` link to TypeScript 6. Clean npm 10 and npm 11 installs from the
   corrected lockfile link it to TypeScript 7. The `build` and `typecheck`
   scripts still invoke the native compiler by its package path so compiler
   selection does not depend on install history.

The compatibility package is version 6.0.2 and currently delegates its compiler
API implementation to TypeScript 6.0.3. No source-code or `tsconfig` changes were
required.

## Follow-up

Reassess the split toolchain after TypeScript 7.1 provides a stable compiler API
and `typescript-eslint` declares support for it. At that point, test replacing
both aliases with a single TypeScript 7 dependency, then remove this compatibility
layout if codemap generation, linting, and the full test suite pass.

## Rollback

Remove `@typescript/native`, restore `typescript` to `~6.0.3`, regenerate the
lockfile, and rerun the acceptance checks.
