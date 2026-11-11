# AGENTS.md

This file gives instructions to Codex (Codex.ai/code) for work in this repository.

## Commands

```sh
npm run build          # compile TypeScript to ./out with tsconfig.prod.json (runs clean first)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # run ESLint with @typescript-eslint
npm run typecheck      # type-check the repository with tsconfig.json (src, tests, e2e, configs)
npm run test:unit      # clean -> codemap:check -> lint -> format:check -> license check -> typecheck -> vitest coverage
npm run test:e2e       # run Playwright e2e tests for Excluded Areas Builder and png-visual-compare/playwright
npm run test           # run unit coverage gate and Playwright e2e tests
npm run test:license   # check that all production dependency licenses are on the approved list
npm run codemap        # generate CODEMAP.md with scripts/generate-codemap.mjs
npm run codemap:check  # fail if CODEMAP.md is out of date (runs in pretest:unit)
npm run format         # format files with Prettier
npm run format:check   # check formatting with Prettier
```

Run one test file (skips pretest steps):

```sh
npx vitest run __tests__/comparePng.test.ts
```

Run tests that match a name pattern:

```sh
npx vitest run --reporter=verbose -t "compare PNG with text"
```

Run Vitest in watch mode during development:

```sh
npx vitest --reporter=verbose
```

Update snapshots:

```sh
npx vitest run -u
```

> Run `npx vitest run` directly to skip the `pretest:unit` gate during fast iteration.
> Run `npm run test:unit` to enable the repo-wide 100% coverage gate. A direct `npx vitest run ... --coverage` command reports coverage only for the files in that run.

## Architecture

This repository exports two public runtime functions:

- `comparePng(...)` — synchronous orchestration
- `comparePngAsync(...)` — asynchronous filesystem orchestration

Both functions use the same pipeline:

1. `resolveOptions`
2. `loadSources` / `loadSourcesAsync`
3. `normalizeImages`
4. `runComparison`
5. `persistDiff`

Keep `comparePng.ts` for orchestration only. Read `docs/ARCHITECTURE.md` for full architecture details.

### Source Layout

```
src/
  index.ts                    # exports comparePng, comparePngAsync, errors, constants, and public types
  comparePng.ts               # synchronous orchestrator
  comparePngWithPorts.ts      # internal synchronous orchestrator with injectable ports (test seam; not exported)
  comparePngAsync.ts          # asynchronous orchestrator
  vitest.mts                  # ./vitest subpath: registers toMatchPngSnapshot on Vitest expect (ESM)
  jest.ts                     # ./jest subpath: registers toMatchPngSnapshot on Jest expect (CJS)
  playwright.ts               # ./playwright subpath (no side effects): exports extended expect and pngMatchers
  matchers/                   # shared snapshot matcher core for all framework subpaths
  pipeline/                   # option resolution, source loading, normalization, comparison, diff persistence
  ports/                      # synchronous and asynchronous filesystem adapters and test seams
  adapters/                   # boundary adapters between public types and internal dependencies
  internal/                   # assertSameFile, assertPlainFile, secureMkdir, realDiffDirectory
  vendor/                     # pixelmatch 8.0.0 TypeScript port (RELI-11); tested for parity with upstream
  getPngData.ts               # decodes image sources into LoadedPng; checks IHDR limits for Playwright baselines
  readValidatedFile.ts        # opens a file before validation so bytes come from the checked inode
  validate*.ts                # path, area, color, and pixelmatch option validation
  types/                      # one type per file; collected in types/index.ts
```

### Pixel Address Formula

```ts
position = (image.width * y + x) * 4; // R=[pos], G=[pos+1], B=[pos+2], A=[pos+3]
```

## Key Conventions

- Import from `../src` in tests. Do not import from `../out`.
- Use the `testDataArray` loop in `comparePng.*` and `comparePngAsync.*` test files. Add new cases as array entries, not standalone `test()` calls.
- Import `../src/vitest.mjs` and call `toMatchPngSnapshot()` on diff PNG buffers in `comparePng.diffs.test.ts` and `comparePng.pixelmatch-options.test.ts`. Commit snapshots in `__tests__/__snapshots__/`.
- Put one type per file in `src/types/`. Use extensionless relative imports in `src/` (except `src/vitest.mts`, which uses `.js` specifiers).
- Do not create shared test helper modules. Keep each test file self-contained.
- Maintain 100% coverage for lines, functions, statements, and branches (`src/types/**/*` is excluded).
- Use only approved licenses for production dependencies: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, `Unlicense`. `npm run test:license` checks this rule.
- Publish only `./out` to npm (`"files": ["./out"]`).
- Use `tsconfig.json` for repo-wide type-checking and `tsconfig.prod.json` for package builds.

## Mistake Logging

Log one short event per mistake (20 to 40 tokens):

```text
Ctx:
Err:
Cause:
Fix:
Rule:
```

Write project mistakes in `.claude/memory/` (git ignores session files; see `.claude/memory/README.md`). Write general rules in global memory.
