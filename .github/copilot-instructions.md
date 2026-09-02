# Copilot Instructions

## Commands

```sh
npm run build          # compile TypeScript → ./out via tsconfig.prod.json (runs clean first via prebuild)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # ESLint with typescript-eslint
npm run typecheck      # typecheck the full repo via tsconfig.json (src, tests, e2e, configs)
npm run test           # full suite: npm run test:unit && npm run test:e2e
npm run test:unit      # unit-test gate: clean → codemap:check → lint → format:check → license check → typecheck → vitest --coverage
npm run test:e2e       # Playwright e2e tests for the Excluded Areas Builder
npm run test:fast      # vitest run --reporter=verbose, skipping the pretest:unit gate
npm run test:license   # check all production dependency licenses are in the approved list
npm run test:docker    # clean → docker build → docker run (runs the full test suite in Docker)
npm run codemap        # regenerate CODEMAP.md via scripts/generate-codemap.mjs
npm run codemap:check  # fail if CODEMAP.md is stale (runs inside pretest:unit)
npm run format         # format files with Prettier
npm run format:check   # validate formatting with Prettier
npm run release:check:pre   # pre-publish gate: version unpublished, CHANGELOG/CODEMAP/lockfile agree, tarball ships only ./out
npm run release:check:post  # post-publish check: version live, `latest` dist-tag, provenance attestation, fresh install imports
npm run tool:excluded-areas-builder  # open tools/excluded-areas-builder.html (macOS/Linux only)
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

> `npm run test:unit` triggers `pretest:unit` (clean → codemap:check → lint → format:check → license check → typecheck) before vitest runs.
> To iterate quickly during development, use `npx vitest run` (or `npm run test:fast`) directly to skip those steps.
> `npm run test:unit` sets `VITEST_FULL_COVERAGE=true`, enabling the repo-wide 100% coverage gate; a focused `npx vitest run --coverage` only reports on the files that run.

---

## Project Overview

This is a small PNG comparison library with two public runtime APIs:

```ts
import { comparePng, comparePngAsync } from 'png-visual-compare';
```

Both share the same internal pipeline and export surface from `src/index.ts`.

Two additional side-effect-only subpaths register a `toMatchPngSnapshot()` matcher:

```ts
import 'png-visual-compare/vitest'; // in Vitest `setupFiles`
import 'png-visual-compare/jest'; // in Jest `setupFilesAfterEnv`
```

**Production dependencies (2 total):**

- `pixelmatch ~7.2.0` — pixel-level image comparison engine
- `pngjs ~7.0.0` — synchronous PNG read/write

**Optional peer dependencies** (only needed for the matcher subpaths): `vitest >=4.1.0 <5`, `jest >=29 <31`.

---

## Repository Layout

> `CODEMAP.md` is the authoritative, generated symbol index (`npm run codemap`, freshness enforced by `npm run codemap:check`). Consult it instead of a hand-maintained file list.

```
src/
  index.ts                        # exports comparePng, comparePngAsync, errors, constants, and public types
  comparePng.ts                   # sync orchestrator
  comparePngAsync.ts              # async orchestrator
  vitest.mts                      # side-effect entry: registers toMatchPngSnapshot on Vitest's expect (ESM)
  jest.ts                         # side-effect entry: registers toMatchPngSnapshot on Jest's expect (CJS)
  defaults.ts                     # default option values and limits
  errors.ts                       # named error classes and ERR_* codes
  getPngData.ts                   # reads file path or Buffer → LoadedPng
  readValidatedFile.ts            # opens a file before validating it; enforces maxFileBytes
  extendImage.ts                  # pads a PNG canvas to a larger size
  fillImageSizeDifference.ts      # colours the padded region green (0,255,0)
  addColoredAreasToImage.ts       # paints rectangular areas with a solid colour
  drawPixelOnBuff.ts              # writes a single RGBA pixel into a raw buffer
  validateArea.ts                 # Area validation
  validateColor.ts                # Color validation
  validatePath.ts                 # assertPathSyntax / validatePathWithReal / validatePath: containment, symlink checks
  validatePixelmatchOptions.ts    # PixelmatchOptions validation
  adapters/                       # public-to-external library boundaries (toPixelmatchOptions)
  internal/                       # assertSameFile, secureMkdir, realDiffDirectory (filesystem-safety primitives)
  matchers/                       # framework-agnostic snapshot matcher core shared by vitest.mts/jest.ts
  pipeline/                       # resolveOptions, loadSources, normalizeImages, runComparison, persistDiff
  ports/                          # sync/async filesystem adapters and test seams
  types/
    index.ts                      # re-exports all types
    area.ts                       # Area (x1,y1,x2,y2 rectangle)
    color.ts                      # Color (r,g,b)
    compare.options.ts            # ComparePngOptions, PixelmatchOptions
    png.data.ts                   # LoadedPng discriminated union
    validated-path.ts             # ValidatedPath branded type (internal — not re-exported from types/index.ts)

__tests__/                        # one file per source module; mirrors src/ layout
  adapters/  codemap/  pipeline/  ports/
  __snapshots__/                  # vitest snapshot files (committed)

e2e/
  excluded-areas-builder.test.ts  # Playwright coverage for tools/excluded-areas-builder.html

scripts/
  generate-codemap.mjs            # CODEMAP.md generator (`--check` mode for CI)
  check-licenses.mjs              # production dependency license allowlist
  prerelease-check.mjs            # pre-publish gate
  postrelease-check.mjs           # post-publish registry verification

test-data/
  actual/                         # "actual" PNG fixtures (budweiser640x862.png used in diff-size test)
  expected/                       # "expected" fixtures, mirrors actual/ (water1500x600.png for diff-size)

tools/
  excluded-areas-builder.html     # zero-build browser tool; inline script is CSP sha256-pinned

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
- string path to a file larger than `maxFileBytes` → throws `ResourceLimitError` **before any bytes are read**, regardless of `throwError`
- valid PNG `Buffer` → `{ kind: 'valid', png: <decoded> }` (`maxFileBytes` does not apply to buffers)
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

### `test.yml` — runs on every push (except `release/*` branches) and on every pull request

| Job    | OS            | Node                      | Gates merges             |
| ------ | ------------- | ------------------------- | ------------------------ |
| ubuntu | ubuntu-latest | from `.nvmrc` (Node `24`) | yes                      |
| macos  | macos-latest  | from `.nvmrc` (Node `24`) | no — `continue-on-error` |

Both jobs run `npm run test`. Ubuntu installs Playwright Chromium with `--with-deps`; macOS omits
that flag, which installs Linux system packages and does not apply there.

macOS is a **supported** platform (`"os": ["darwin","linux"]`) and is exercised again, but its job
is `continue-on-error` for now: the suite hits a macOS-only Vitest fork crash
(`Error: Worker exited unexpectedly`) in roughly 1 run in 5 under coverage, which drops a file's
results and fails the 100% threshold for reasons unrelated to the code under test. Tracked as
TEST-08; it reproduces on `main`. Windows is **not** supported — dropped as a breaking change in
6.0.0.

### `publish.yml` — runs on GitHub release `published` (skipped for prereleases)

```
ensure npm >= 11.5.1   ← Trusted Publishing floor; upgrades within 11.x only if below it
npm ci
npx playwright install --with-deps chromium
npm audit --audit-level=high
npm run build            ← clean + fresh tsc using tsconfig.prod.json
npm run release:check:pre  ← RELEASE_TAG from the GitHub release tag
npm publish --provenance   ← publishes only ./out (per "files" in package.json)
npm run release:check:post
```

Publishing uses **npm Trusted Publishing (OIDC)** — no `NPM_TOKEN` secret. The job requests
`id-token: write` and the trusted publisher must be configured on npmjs.com (Package → Settings →
Trusted Publishing) for org `dichovsky`, repo `png-visual-compare`, workflow `publish.yml`, no
environment.

Both workflows pin `actions/checkout` and `actions/setup-node` by commit SHA with a `# vX.Y.Z`
comment, and take their Node version from `.nvmrc`.

---

## Package Distribution

Only the `./out` directory is published to npm (controlled by `"files": ["./out"]` in `package.json`).

The package exposes:

- `"main": "./out/index.js"` — CommonJS entry point (legacy resolution)
- `"types": "./out/index.d.ts"` — TypeScript type definitions
- `"exports"` — three subpaths:
    - `.` → `./out/index.js` (types `./out/index.d.ts`)
    - `./vitest` → `./out/vitest.mjs` (ESM, types `./out/vitest.d.mts`)
    - `./jest` → `./out/jest.js` (types `./out/jest.d.ts`)
- `"sideEffects": ["./out/vitest.mjs", "./out/jest.js"]` — the main entry stays tree-shakeable; the
  two matcher entries are excluded because importing them intentionally calls `expect.extend(...)`

Compiled output is CommonJS (`module: nodenext` with no `"type": "module"` in package.json), except
`src/vitest.mts` → `out/vitest.mjs`, which is ESM because Vitest is ESM-only.

`"engines": { "node": ">=20" }`, `"os": ["darwin", "linux"]`.
