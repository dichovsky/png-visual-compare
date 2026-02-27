# Copilot Instructions

## Commands

```sh
npm run build          # compile TypeScript → ./out (runs clean first via prebuild)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # ESLint with @typescript-eslint
npm run test           # full suite: clean → lint → license check → build → vitest --coverage
npm run test:license   # check all production dependency licenses are in the approved list
npm run test:docker    # clean → docker build → docker run (runs the full test suite in Docker)
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

> `npm run test` triggers `pretest` (clean → lint → license check → build) before vitest runs.
> To iterate quickly during development, use `npx vitest run` directly to skip those steps.

---

## Project Overview

This is a **single-function npm library**. The entire public API surface is one named export:

```ts
import { comparePng } from 'png-visual-compare';
```

Everything in the codebase resolves to `comparePng` in `src/comparePng.ts`, re-exported through `src/index.ts`.

**Production dependencies (2 total):**
- `pixelmatch ~7.1.0` — pixel-level image comparison engine
- `pngjs ~7.0.0` — synchronous PNG read/write

---

## Repository Layout

```
src/
  index.ts                        # public barrel: exports comparePng + all types
  comparePng.ts                   # main function (the entire public API)
  getPngData.ts                   # reads file path or Buffer → PngData
  extendImage.ts                  # pads a PNG canvas to a larger size
  fillImageSizeDifference.ts      # colours the padded region green (0,255,0)
  addColoredAreasToImage.ts       # paints rectangular areas with a solid colour
  drawPixelOnBuff.ts              # writes a single RGBA pixel into a raw buffer
  types/
    index.ts                      # re-exports all types
    area.ts                       # Area (x1,y1,x2,y2 rectangle)
    color.ts                      # Color (r,g,b — internal only)
    compare.options.ts            # ComparePngOptions, PixelmatchOptions (public)
    png.data.ts                   # PngData (internal wrapper)

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

### `comparePng(png1, png2, opts?)` — step by step

```
1. Parse options
   ├── excludedAreas                → [] by default
   ├── throwErrorOnInvalidInputData → true by default
   └── shouldCreateDiffFile        → (opts.diffFilePath !== undefined)

2. getPngData(png1, throwErrorOnInvalidInputData)  →  PngData { isValid, png }
   getPngData(png2, throwErrorOnInvalidInputData)  →  PngData { isValid, png }
   │
   ├── If BOTH are invalid → throw 'Unknown PNG files input type' (always, regardless of flag)
   └── If ONE is invalid and flag=false → treat as zero-size PNG (0×0)

3. If excludedAreas.length > 0
   └── addColoredAreasToImage(png1, excludedAreas, blue(0,0,255))
       addColoredAreasToImage(png2, excludedAreas, blue(0,0,255))
       → identical blue pixels on both images → those regions always match

4. If images differ in size
   ├── maxWidth  = Math.max(w1, w2)
   ├── maxHeight = Math.max(h1, h2)
   ├── extendImage(pngData.png, maxWidth, maxHeight)
   │   └── PNG.bitblt copies original into top-left of new canvas; rest is transparent
   └── fillImageSizeDifference(extendedPng, originalWidth, originalHeight, green(0,255,0))
       └── paints pixels where y > originalHeight OR x > originalWidth → always a diff

5. pixelmatch(data1, data2, diffBuffer?, maxWidth, maxHeight, pixelmatchOptions?)
   └── returns mismatchedPixelCount

6. If mismatchedPixelCount > 0 AND diffFilePath is set
   ├── mkdirSync(dir, { recursive: true })   — creates parent dirs automatically
   └── writeFileSync(diffFilePath, PNG.sync.write(diff))

7. return mismatchedPixelCount   (0 = identical)
```

### `getPngData(pngSource, throwErrorOnInvalidInputData)`

| Input type | File exists? | `throwError=true` | `throwError=false` |
|---|---|---|---|
| `string` (path) | yes | `{ isValid: true, png: <decoded> }` | `{ isValid: true, png: <decoded> }` |
| `string` (path) | no | throws `"PNG file … not found"` | `{ isValid: false, png: 0×0 PNG }` |
| `Buffer` | n/a | `{ isValid: true, png: <decoded> }` | `{ isValid: true, png: <decoded> }` |
| any other type | n/a | throws `"Unknown PNG file input type"` | `{ isValid: false, png: 0×0 PNG }` |

> An invalid-placeholder PNG is `new PNG({ width: 0, height: 0 })` cast to `PNGWithMetadata`.

### Pixel address formula

All pixel operations use the same address formula:
```ts
position = (image.width * y + x) * 4;  // byte offset of red channel
// buff[position+0] = R, [+1] = G, [+2] = B, [+3] = A (always 255)
```

---

## Types

All types live in `src/types/`, one file per type, collected in `src/types/index.ts`.

| Type | Exported publicly | Purpose |
|---|---|---|
| `Area` | yes | Rectangle `{ x1, y1, x2, y2 }` (inclusive, pixels from top-left) |
| `ComparePngOptions` | yes | Options bag for `comparePng` |
| `PixelmatchOptions` | yes | Forwarded verbatim to pixelmatch |
| `Color` | yes | Public `{ r, g, b }` used for pixel painting |
| `PngData` | yes | Public `{ isValid: boolean, png: PNGWithMetadata }` used by helpers |

`Color` and `PngData` are currently part of the public type surface via \`src/index.ts\`. Treat them as stable exports when updating types or documentation.

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
import { comparePng } from '../src';           // correct
import { getPngData } from '../src/getPngData'; // correct for internal unit tests
```

### Snapshot tests

`comparePng.diffs.test.ts` and `comparePng.pixelmatch-options.test.ts` use `toMatchSnapshot()` on the raw diff PNG `Buffer`. Snapshots are committed in `__tests__/__snapshots__/`. Update them with:
```sh
npx vitest run --update-snapshots
```

### Coverage thresholds (enforced by vitest)

| Metric | Minimum |
|---|---|
| Lines | 90% |
| Functions | 90% |
| Statements | 90% |
| Branches | 75% |

`src/types/**/*` is excluded from coverage (type-only files have no runtime behaviour).
Current coverage is 100% across all source files.

---

## Key Conventions

- **Extensionless relative imports within `src/`** — even with `"module": "nodenext"` / `"moduleResolution": "node16"`, source files use imports like `import { foo } from './foo'` (resolved correctly for the CommonJS build output).
- **One type per file** in `src/types/`. Collected by `src/types/index.ts`.
- **Test files mirror source names** — `src/comparePng.ts` → `__tests__/comparePng.test.ts`.
- **No shared test helper modules** — each test file is self-contained; common PNG fixtures live in `test-data/actual/` and `test-data/expected/`.
- **All production dependencies must use an approved license**: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, `Unlicense`. Enforced by `npm run test:license` (runs as part of `pretest`).
- **`throwErrorOnInvalidInputData` defaults to `true`**. Set to `false` only when intentionally comparing against a missing/invalid file (treated as a zero-size PNG). An error is **always** thrown when **both** inputs are invalid, regardless of this flag.
- **Diff file is never written when `pixelmatchResult === 0`**, even if `diffFilePath` is provided — avoids creating empty/misleading diff artifacts.
- **Excluded areas are painted blue on both images** before comparison — they will always match. Coordinates are clamped to image bounds inside `addColoredAreasToImage`.
- **Size difference region is painted green** on the extended canvas. This makes the padded area always count as a difference, which is intentional.

---

## CI / CD

### `test.yml` — runs on every push (except `release/*` branches)

| Job | OS | Node |
|---|---|---|
| ubuntu | ubuntu-latest | 24.x |
| windows | windows-latest | 22.x |

Each job: `npm ci` → `npm test` (which runs the full `pretest` + vitest pipeline).

### `publish.yml` — runs on GitHub release `created`

```
npm ci
npm test        ← full test suite including lint, license check, build
npm run build   ← clean + fresh tsc after tests; ensures ./out is built from a clean state
npm publish     ← publishes only ./out (per "files" in package.json)
```

The double build is intentional: `npm test` compiles to `./out` as part of `pretest`, but also writes `./coverage` and `./test-results`. The subsequent `npm run build` triggers `prebuild → clean → tsc`, which deletes those directories and produces a fresh `./out` from a known-clean state before the package is published.

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
