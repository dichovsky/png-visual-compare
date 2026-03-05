# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build          # compile TypeScript → ./out (runs clean first via prebuild)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # ESLint with @typescript-eslint
npm run test           # full suite: clean → lint → license check → build → vitest --coverage
npm run test:license   # check all production dependency licenses are in the approved list
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

> Use `npx vitest run` directly to skip clean/lint/build when iterating quickly.

## Architecture

This is a single-function npm library. The entire public API is one named export: `comparePng` from `src/comparePng.ts`, re-exported through `src/index.ts`.

**Production dependencies:** `pixelmatch` (pixel comparison engine) and `pngjs` (synchronous PNG read/write).

### Source layout

```
src/
  index.ts                    # public barrel: exports comparePng + all types
  comparePng.ts               # main function (the entire public API)
  getPngData.ts               # reads file path or Buffer → PngData
  extendImage.ts              # pads a PNG canvas to a larger size
  fillImageSizeDifference.ts  # colours the padded region green (0,255,0)
  addColoredAreasToImage.ts   # paints rectangular areas with a solid colour
  drawPixelOnBuff.ts          # writes a single RGBA pixel into a raw buffer
  types/                      # one type per file; collected in types/index.ts
```

### `comparePng` data flow

1. Parse options (`excludedAreas`, `throwErrorOnInvalidInputData`, `diffFilePath`)
2. `getPngData()` on each input — if both are invalid, always throws; if one is invalid with `throwError=false`, treats it as a 0×0 PNG
3. If `excludedAreas` is set: paint those regions **blue** on both images (they always match)
4. If images differ in size: extend both to `max(w1,w2) × max(h1,h2)`, paint padded area **green** (always counts as diff)
5. Run `pixelmatch()` → returns mismatch count
6. If `mismatchCount > 0` and `diffFilePath` is set: write diff PNG (parent dirs created automatically)
7. Return mismatch count (0 = identical)

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
- **Coverage thresholds**: 90% lines/functions/statements, 75% branches (currently 100%); `src/types/**/*` is excluded
- **All production dependencies must use an approved license**: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, `Unlicense` — enforced by `npm run test:license` (part of `pretest`)
- **Only `./out` is published** to npm (controlled by `"files": ["./out"]`)
- The CI publish workflow runs `npm test` then `npm run build` again — the double build is intentional to produce a clean `./out` after coverage/test-results are deleted
