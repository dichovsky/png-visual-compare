# Copilot Instructions

## Commands

```sh
npm run build          # compile TypeScript → ./out via tsconfig.prod.json (runs clean first via prebuild)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # ESLint with @typescript-eslint
npm run typecheck      # typecheck the full repo via tsconfig.json (src, tests, e2e, configs)
npm run test           # npm run test && npm run test:e2e
npm run test:e2e       # Playwright e2e tests for the Excluded Areas Builder
npm run test:unit      # unit-test gate: clean → lint → format:check → license check → typecheck → vitest --coverage
npm run test:license   # check all production dependency licenses are in the approved list
npm run test:docker    # clean → docker build → docker run (runs the full test suite in Docker)
npm run codemap        # regenerate CODEMAP.md via scripts/generate-codemap.mjs
npm run format         # format files with Prettier
npm run format:check   # validate formatting with Prettier
```

Run a single test file (skips pretest):

```sh
npx vitest run __tests__/comparePng.test.ts
```

Run tests matching a name pattern:

```sh
npx vitest run --reporter=verbose -t "compare PNG with text"
```

Run tests and watch for changes during development:

```sh
npx vitest --reporter=verbose
```

> `npm run test` triggers `pretest:unit` (clean → lint → format:check → license check → typecheck) before vitest runs.
> To iterate quickly during development, use `npx vitest run` directly to skip those steps.

---

## Project Overview

This is a small PNG comparison library with two public runtime entrypoints:

```ts
import { comparePng, comparePngAsync } from 'png-visual-compare';
```

Both public APIs share the same internal pipeline and export surface from `src/index.ts`.

**Production dependencies (2 total):**

- `pixelmatch ~7.1.0` — pixel-level image comparison engine
- `pngjs ~7.0.0` — synchronous PNG read/write

---

## Repository Layout

```
src/
  index.ts                        # exports comparePng, comparePngAsync, errors, constants, and public types
  comparePng.ts                   # sync orchestrator
  comparePngAsync.ts              # async orchestrator
  pipeline/                       # option resolution, loading, normalization, comparison, diff persistence
  ports/                          # sync/async filesystem adapters and test seams
  adapters/                       # public-to-external library boundaries
  getPngData.ts                   # reads file path or Buffer → LoadedPng
  extendImage.ts                  # pads a PNG canvas to a larger size
  fillImageSizeDifference.ts      # colours the padded region green (0,255,0)
  addColoredAreasToImage.ts       # paints rectangular areas with a solid colour
  drawPixelOnBuff.ts              # writes a single RGBA pixel into a raw buffer
  types/
    index.ts                      # re-exports all types
    area.ts                       # Area (x1,y1,x2,y2 rectangle)
    color.ts                      # Color (r,g,b — internal only)
    compare.options.ts            # ComparePngOptions, PixelmatchOptions (public)
    png.data.ts                   # LoadedPng discriminated union

__tests__/
  index.test.ts                   # verifies comparePng is exported from the package
  comparePng.test.ts              # happy-path: files, buffers, excludedAreas, diff creation
  comparePng.diffs.test.ts        # diff PNG output + snapshot assertions
  comparePng.diff-size.test.ts    # different-sized images; verifies diff canvas = max(w,h)
  comparePng.exceptions.test.ts   # all invalid-input combinations
  comparePng.pixelmatch-options.test.ts  # threshold, diffColor pass-through
  getPngData.test.ts              # unit tests for getPngData
  extendImage.test.ts             # unit tests for extendImage
  drawPixelOnBuff.test.ts         # unit tests for drawPixelOnBuff
  __snapshots__/                  # vitest snapshot files (committed)

test-data/
  actual/                         # "actual" PNG fixtures
    pnggrad16rgb.png
    youtube-play-button.png
    ILTQq.png
    ILTQq copy.png                # slightly different from expected version
    budweiser640x862.png          # used in diff-size test (640×862)
  expected/                       # "expected" PNG fixtures (mirrors actual/)
    pnggrad16rgb.png
    youtube-play-button.png
    ILTQq.png
    ILTQq copy.png
    water1500x600.png             # used in diff-size test (1500×600)

out/                              # compiled output (gitignored, npm-published)
```

---

## Architecture & Data Flow

### Shared pipeline

```
comparePng / comparePngAsync
  -> resolveOptions
  -> loadSources / loadSourcesAsync
  -> normalizeImages
  -> runComparison
  -> persistDiff
```

### `getPngData(pngSource, throwErrorOnInvalidInputData)`

- `string` path to a valid PNG → `{ kind: 'valid', png: <decoded> }`
- missing/unreadable string path:
    - `throwError=true` → throws a path/input error
    - `throwError=false` → `{ kind: 'invalid', reason: 'path' }`
- valid PNG `Buffer` → `{ kind: 'valid', png: <decoded> }`
- invalid source or undecodable bytes:
    - `throwError=true` → throws an input/decode error
    - `throwError=false` → `{ kind: 'invalid', reason: 'type' | 'decode' }`

### Pixel address formula

All pixel operations use the same address formula:

```ts
position = (image.width * y + x) * 4; // byte offset of red channel
// buff[position+0] = R, [+1] = G, [+2] = B, [+3] = A (always 255)
```

---

## Types

All types live in `src/types/`, one file per type, collected in `src/types/index.ts`.

| Type                | Exported publicly | Purpose                                                              |
| ------------------- | ----------------- | -------------------------------------------------------------------- |
| `Area`              | yes               | Rectangle `{ x1, y1, x2, y2 }` (inclusive, pixels from top-left)     |
| `ComparePngOptions` | yes               | Options bag for `comparePng`                                         |
| `PixelmatchOptions` | yes               | Forwarded verbatim to pixelmatch                                     |
| `Color`             | yes               | Public `{ r, g, b }` used for pixel painting                         |
| `LoadedPng`         | yes               | Discriminated decoded-image result union used by loaders and helpers |

`Color` and `LoadedPng` are part of the public type surface via `src/index.ts`.

---

## Test Conventions

### Data-driven pattern (used in all `comparePng.*` tests)

```ts
const testDataArray = [ { id, name, actual, expected, ... }, ... ];

for (const testData of testDataArray) {
    test(`${testData.name}`, () => { ... });
}
```

Never write a standalone `test(...)` when the same assertion applies to multiple inputs — add a new entry to `testDataArray` instead.

### Imports in tests

Tests import from the **source** (`../src`), not from the compiled output (`../out`):

```ts
import { comparePng } from '../src'; // correct
import { getPngData } from '../src/getPngData'; // correct for internal unit tests
```

### Snapshot tests

`comparePng.diffs.test.ts` and `comparePng.pixelmatch-options.test.ts` use `toMatchSnapshot()` on the raw diff PNG `Buffer`. Snapshots are committed in `__tests__/__snapshots__/`. Update them with:

```sh
npx vitest run --update-snapshots
```

### Coverage thresholds (enforced by vitest)

| Metric     | Minimum |
| ---------- | ------- |
| Lines      | 100%    |
| Functions  | 100%    |
| Statements | 100%    |
| Branches   | 100%    |

`src/types/**/*` is excluded from coverage (type-only files have no runtime behaviour).
Current coverage is 100% across all source files.

---

## Key Conventions

- **Extensionless relative imports within `src/`** — even with `"module": "nodenext"` / `"moduleResolution": "node16"`, source files use imports like `import { foo } from './foo'` (resolved correctly for the CommonJS build output).
- **One type per file** in `src/types/`. Collected by `src/types/index.ts`.
- **Test files mirror source names** — `src/comparePng.ts` → `__tests__/comparePng.test.ts`.
- **No shared test helper modules** — each test file is self-contained; common PNG fixtures live in `test-data/actual/` and `test-data/expected/`.
- **All production dependencies must use an approved license**: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, `Unlicense`. Enforced by `npm run test:license` (runs as part of `npm run test`).
- **`throwErrorOnInvalidInputData` defaults to `true`**. Set to `false` only when intentionally comparing against a missing/invalid file (treated as a zero-size PNG). An error is **always** thrown when **both** inputs are invalid, regardless of this flag.
- **Diff file is never written when `pixelmatchResult === 0`**, even if `diffFilePath` is provided — avoids creating empty/misleading diff artifacts.
- **Excluded areas are painted on both images** before comparison — they will always match. Default is blue `{ r: 0, g: 0, b: 255 }`, override via `excludedAreaColor`. Coordinates are clamped to image bounds inside `addColoredAreasToImage`.
- **Size difference region is painted on the extended canvas**. Default is green `{ r: 0, g: 255, b: 0 }`, override via `extendedAreaColor`. The padded area intentionally always counts as a difference.
- **TypeScript config split**: `tsconfig.json` is the dev-wide no-emit config; `tsconfig.prod.json` is the emitted package-build config.

---

## CI / CD

### `test.yml` — runs on every push (except `release/*` branches)

| Job    | OS            | Node |
| ------ | ------------- | ---- |
| ubuntu | ubuntu-latest | 24.x |
| macos  | macos-latest  | 20.x |

Each job installs Playwright Chromium and runs `npm run test`.

### `publish.yml` — runs on GitHub release `published`

```
npm ci
npm audit --audit-level=high
npm run build   ← clean + fresh tsc using tsconfig.prod.json
npm publish     ← publishes only ./out (per "files" in package.json)
```

Publishing requires the `NPM_TOKEN` secret to be set on the GitHub repository.

---

## Package Distribution

Only the `./out` directory is published to npm (controlled by `"files": ["./out"]` in `package.json`).

The package exposes:

- `"main": "./out/index.js"` — CommonJS entry point (legacy resolution)
- `"types": "./out/index.d.ts"` — TypeScript type definitions
- `"exports": { ".": { "types": "./out/index.d.ts", "default": "./out/index.js" } }` — modern subpath exports
- `"sideEffects": false` — allows bundlers to tree-shake the package

Compiled output is CommonJS (`module: nodenext` with no `"type": "module"` in package.json).
