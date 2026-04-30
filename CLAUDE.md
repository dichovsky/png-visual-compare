# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build          # compile TypeScript → ./out via tsconfig.prod.json (runs clean first via prebuild)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # ESLint with @typescript-eslint
npm run typecheck      # typecheck the full repo via tsconfig.json (src, tests, e2e, configs)
npm run test:unit      # unit-test gate: clean → lint → format:check → license check → typecheck → repo-wide vitest coverage
npm run test:e2e       # Playwright e2e tests for the Excluded Areas Builder
npm run test           # full test suite: repo-wide unit coverage gate plus Playwright e2e tests
npm run test:license   # check all production dependency licenses are in the approved list
npm run codemap        # regenerate CODEMAP.md via scripts/generate-codemap.mjs
npm run format         # format files with Prettier
npm run format:check   # validate formatting with Prettier
```

Run a single test file (skips pretest steps):

```sh
npx vitest run __tests__/comparePng.test.ts
```

Run tests matching a name pattern:

```sh
npx vitest run --reporter=verbose -t "compare PNG with text"
```

Watch mode during development:

```sh
npx vitest --reporter=verbose
```

Update snapshots:

```sh
npx vitest run --update-snapshots
```

> Use `npx vitest run` directly to skip clean/lint/format:check/build when iterating quickly.
> `npm run test:unit` enables the repo-wide 100% coverage gate; direct `npx vitest run ... --coverage` commands only report coverage for the files exercised by that focused run.

## Architecture

This repository now has two public runtime APIs:

- `comparePng(...)` — sync orchestration
- `comparePngAsync(...)` — async filesystem-backed orchestration

Both APIs share the same pipeline:

1. `resolveOptions`
2. `loadSources` / `loadSourcesAsync`
3. `normalizeImages`
4. `runComparison`
5. `persistDiff`

`comparePng.ts` should remain orchestration-only. Detailed architecture lives in `docs/ARCHITECTURE.md`.

### Source layout

```
src/
  index.ts                    # exports comparePng, comparePngAsync, errors, constants, and public types
  comparePng.ts               # sync orchestrator
  comparePngAsync.ts          # async orchestrator
  pipeline/                   # option resolution, loading, normalization, comparison, diff persistence
  ports/                      # sync/async filesystem adapters and test seams
  adapters/                   # public-to-external library boundaries
  getPngData.ts               # decodes image sources into LoadedPng
  validate*.ts                # path, area, color, and pixelmatch option validation
  types/                      # one type per file; collected in types/index.ts
```

### Pixel address formula (used throughout)

```ts
position = (image.width * y + x) * 4; // R=[pos], G=[pos+1], B=[pos+2], A=[pos+3]
```

## Key Conventions

- **Tests import from `../src`**, not `../out` (compiled output)
- **Data-driven test pattern**: all `comparePng.*` tests use a `testDataArray` loop — add new cases as array entries, not standalone `test()` calls
- **Snapshot tests** in `comparePng.diffs.test.ts` and `comparePng.pixelmatch-options.test.ts` use `toMatchSnapshot()` on raw diff PNG buffers; snapshots are committed in `__tests__/__snapshots__/`
- **One type per file** in `src/types/`; imports within `src/` use extensionless relative paths
- **No test helper modules** — each test file is self-contained
- **Coverage thresholds**: 100% lines/functions/statements/branches; `src/types/**/*` is excluded
- **All production dependencies must use an approved license**: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, `Unlicense` — enforced by `npm run test:license` (part of `npm test`)
- **Only `./out` is published** to npm (controlled by `"files": ["./out"]`)
- **TypeScript config split**: use `tsconfig.json` for dev-wide no-emit typechecking and `tsconfig.prod.json` for emitted package builds

## Mistake Logging

Log one compact event per mistake (20-40 tokens, no filler):

```text
Ctx:
Err:
Cause:
Fix:
Rule:
```

Store project-specific mistakes in `.claude/memory/` (session files are gitignored — see `.claude/memory/README.md`); generalizable rules in global memory.
