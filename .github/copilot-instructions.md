# Copilot Instructions

## Commands

```sh
npm run build          # compile TypeScript → ./out (runs clean first)
npm run lint           # ESLint with @typescript-eslint
npm run test           # full suite: clean → lint → license check → build → vitest --coverage
```

Run a single test file:
```sh
npx vitest run __tests__/comparePng.test.ts
```

Run tests matching a name pattern:
```sh
npx vitest run --reporter=verbose -t "compare PNG with text"
```

## Architecture

This is a single-function library. Everything resolves to one public export: `comparePng` in `src/comparePng.ts`, re-exported through `src/index.ts`.

**Data flow inside `comparePng`:**
1. `getPngData` reads each input (file path or `Buffer`) into a `PngData` (`{ isValid, png: PNGWithMetadata }`)
2. If images differ in size, `extendImage` pads the smaller one and `fillImageSizeDifference` colors the padded region green `(0, 255, 0)`
3. `addColoredAreasToImage` fills any `excludedAreas` with blue `(0, 0, 255)` on both images (so those pixels always match)
4. `pixelmatch` compares the pixel buffers and writes into a `diff` PNG
5. The diff file is only written to disk if `diffFilePath` is set **and** `pixelmatchResult > 0`

**Key directories:**
- `src/types/` — one type per file (`Area`, `Color`, `ComparePngOptions`, `PngData`, `PixelmatchOptions`), collected in `src/types/index.ts`
- `__tests__/` — test files mirror source names (e.g. `comparePng.ts` → `comparePng.test.ts`)
- `test-data/actual/` and `test-data/expected/` — PNG fixtures used by tests
- `./out/` — compiled output; only this directory is published to npm (`"files": ["./out"]`)

## Key Conventions

- `npm run test` triggers `pretest` which runs clean, lint, license check, and build — run `npx vitest run` directly to skip those steps during development.
- All new production dependencies must have licenses in: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, `Unlicense` (enforced by `test:license`).
- Tests use a data-driven pattern: define a `testDataArray`, then loop with `for...of` calling `test(...)` for each case.
- `throwErrorOnInvalidInputData` defaults to `true`; passing `false` allows comparing against a missing/invalid file (treated as a zero-size PNG).
- TypeScript is compiled with `"module": "nodenext"` and `"moduleResolution": "node16"` — use `.js` extensions in relative imports within `src/`.
