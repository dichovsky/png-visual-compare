# Copilot Instructions

## Commands

```sh
npm run build          # compile TypeScript to ./out with tsconfig.prod.json (runs clean first)
npm run clean          # delete ./out, ./coverage, ./test-results
npm run lint           # run ESLint with typescript-eslint
npm run typecheck      # type-check the repository with tsconfig.json (src, tests, e2e, configs)
npm run test           # run full suite: npm run test:unit && npm run test:e2e
npm run test:unit      # clean -> codemap:check -> lint -> format:check -> license check -> typecheck -> vitest --coverage
npm run test:e2e       # run Playwright e2e tests for Excluded Areas Builder and png-visual-compare/playwright
npm run test:fast      # run vitest --reporter=verbose and skip the pretest:unit gate
npm run test:license   # check that all production dependency licenses are on the approved list
npm run test:docker    # clean -> docker build -> docker run (runs the full test suite in Docker)
npm run codemap        # generate CODEMAP.md with scripts/generate-codemap.mjs
npm run codemap:check  # fail if CODEMAP.md is out of date (runs in pretest:unit)
npm run format         # format files with Prettier
npm run format:check   # check formatting with Prettier
npm run release:check:pre   # pre-publish check: unpublished version, matching CHANGELOG/CODEMAP/lockfile, and ./out tarball only
npm run release:check:post  # post-publish check: live version, latest dist-tag, provenance attestation, and install smoke
npm run tool:excluded-areas-builder  # open tools/excluded-areas-builder.html (macOS and Linux only)
```

Run one test file (skips pretest steps):

```sh
npx vitest run __tests__/comparePng.test.ts
```

Run tests that match a name pattern:

```sh
npx vitest run --reporter=verbose -t "compare PNG with text"
```

Run tests in watch mode during development:

```sh
npx vitest --reporter=verbose
```

> `npm run test:unit` runs `pretest:unit` (clean, `codemap:check`, lint, `format:check`, license check, and typecheck) before Vitest runs.
> Run `npx vitest run` or `npm run test:fast` during development to skip those preflight checks.
> `npm run test:unit` sets `VITEST_FULL_COVERAGE=true` to enforce 100% repo-wide coverage. A focused `npx vitest run --coverage` command reports coverage only for the executed files.

---

## Project Overview

This library compares PNG images and exports two public runtime functions:

```ts
import { comparePng, comparePngAsync } from 'png-visual-compare';
```

Both functions use the same internal pipeline and export surface in `src/index.ts`.

Two side-effect subpaths register the `toMatchPngSnapshot()` matcher:

```ts
import 'png-visual-compare/vitest'; // in Vitest `setupFiles`
import 'png-visual-compare/jest'; // in Jest `setupFilesAfterEnv`
```

A third subpath, `png-visual-compare/playwright`, has no side effects. It exports an extended `expect` with synchronous `toMatchPngSnapshot()` and `pngMatchers` for `baseExpect.extend(pngMatchers)`. It stores baselines as PNG files at `testInfo.snapshotPath()` (see `docs/adr/0001-playwright-baselines-as-png-files.md`):

```ts
import { expect } from 'png-visual-compare/playwright';
```

**Production dependencies (1 total):**

- `pngjs ~7.0.0` — synchronous PNG read and write

The repository vendors `pixelmatch` 8.0.0 in `src/vendor/pixelmatch.ts` (ISC, RELI-11) so the CommonJS build has no ESM-only dependency. The npm `pixelmatch` package remains in `devDependencies` as the reference oracle for `__tests__/vendor/pixelmatch.test.ts`.

**Optional peer dependencies** (needed only for matcher subpaths): `vitest >=5.0.0 <6`, `jest >=29 <31`, `expect` (any version, for the `./jest` type augmentation), and `@playwright/test >=1.60.0 <2`.

---

## Repository Layout

> `CODEMAP.md` is the generated symbol index (`npm run codemap`; `npm run codemap:check` verifies freshness). Read `CODEMAP.md` for the full symbol list.

```
src/
  index.ts                        # exports comparePng, comparePngAsync, errors, constants, and public types
  comparePng.ts                   # synchronous orchestrator
  comparePngWithPorts.ts          # internal synchronous orchestrator with injectable ports (test seam; not exported)
  comparePngAsync.ts              # asynchronous orchestrator
  vitest.mts                      # side-effect entry: registers toMatchPngSnapshot on Vitest expect (ESM)
  jest.ts                         # side-effect entry: registers toMatchPngSnapshot on Jest expect (CJS)
  playwright.ts                   # side-effect-free entry: exports extended expect and pngMatchers
  defaults.ts                     # default option values and limits
  errors.ts                       # named error classes and ERR_* codes
  getPngData.ts                   # reads file path or Buffer into LoadedPng; checks IHDR limits for Playwright baselines
  readValidatedFile.ts            # opens a file before validation; enforces maxFileBytes
  extendImage.ts                  # pads a PNG canvas to a larger size
  fillImageSizeDifference.ts      # paints the padded region green (0,255,0)
  addColoredAreasToImage.ts       # paints rectangular areas with a solid color
  drawPixelOnBuff.ts              # writes one RGBA pixel into a raw buffer
  validateArea.ts                 # validates Area objects
  validateColor.ts                # validates Color objects
  validatePath.ts                 # assertPathSyntax, validatePathWithReal, validatePath: containment and symlink checks
  validatePixelmatchOptions.ts    # validates PixelmatchOptions
  adapters/                       # boundary adapters (toPixelmatchOptions)
  internal/                       # assertSameFile, assertPlainFile, secureMkdir, realDiffDirectory
  matchers/                       # shared snapshot matcher core for vitest.mts, jest.ts, and playwright.ts
  pipeline/                       # resolveOptions, loadSources, normalizeImages, runComparison, persistDiff
  ports/                          # synchronous and asynchronous filesystem adapters and test seams
  vendor/                         # pixelmatch 8.0.0 TypeScript port (RELI-11); tested for parity with upstream
  types/
    index.ts                      # re-exports all types
    area.ts                       # Area (x1,y1,x2,y2 rectangle)
    color.ts                      # Color (r,g,b)
    compare.input.ts              # ComparePngInput (string | Buffer; internal, not exported from src/index.ts)
    compare.options.ts            # ComparePngOptions, PixelmatchOptions
    png.data.ts                   # LoadedPng discriminated union
    validated-path.ts             # ValidatedPath branded type (internal, not re-exported from types/index.ts)

__tests__/                        # one file per source module; matches src/ layout
  adapters/  codemap/  internal/  pipeline/  ports/  vendor/
  __snapshots__/                  # committed Vitest snapshot files

e2e/
  excluded-areas-builder.test.ts  # Playwright tests for tools/excluded-areas-builder.html
  playwright-matcher.test.ts      # runs a nested Playwright process to test png-visual-compare/playwright
  fixtures/playwright-matcher/    # nested playwright.config.ts and matcher.fixture.ts for that test

scripts/
  generate-codemap.mjs            # CODEMAP.md generator (--check mode for CI)
  check-licenses.mjs              # production dependency license check
  prerelease-check.mjs            # pre-publish verification gate
  postrelease-check.mjs           # post-publish registry check
  install-smoke.mjs               # installs a tarball or package spec in a temp project and runs smoke tests

test-data/
  actual/                         # "actual" PNG fixtures (budweiser640x862.png is used in the size-diff test)
  expected/                       # "expected" fixtures (water1500x600.png is used in the size-diff test)

tools/
  excluded-areas-builder.html     # browser tool with CSP sha256-pinned inline script

out/                              # compiled output (gitignored, published to npm)
```

---

## Architecture and Data Flow

### Shared Pipeline

```
comparePng / comparePngAsync
  -> resolveOptions
  -> loadSources / loadSourcesAsync
  -> normalizeImages
  -> runComparison
  -> persistDiff
```

### `getPngData(pngSource, throwErrorOnInvalidInputData)`

- Valid PNG `string` path -> `{ kind: 'valid', png: <decoded> }`
- Missing or unreadable `string` path:
    - `throwError=true` -> throws a path or input error
    - `throwError=false` -> `{ kind: 'invalid', reason: 'path' }`
- `string` path to a file larger than `maxFileBytes` -> throws `ResourceLimitError` **before the function reads any bytes**, even when `throwError=false`
- Valid PNG `Buffer` -> `{ kind: 'valid', png: <decoded> }` (`maxFileBytes` does not apply to buffers)
- Invalid source or undecodable bytes:
    - `throwError=true` -> throws an input or decode error
    - `throwError=false` -> `{ kind: 'invalid', reason: 'type' | 'decode' }`

This module also exports `assertPngHeaderLimits(buffer, maxDimension, maxPixels)` for internal use. It runs the same `ResourceLimitError` checks on the IHDR header without decoding the image. It throws `InvalidInputError` for a missing, truncated, duplicate, or zero-dimension header. The Playwright adapter calls this function before it writes a baseline.

### Pixel Address Formula

All pixel operations use this address formula:

```ts
position = (image.width * y + x) * 4; // byte offset of red channel
// buff[position+0] = R, [+1] = G, [+2] = B, [+3] = A (always 255)
```

---

## Types

All types live in `src/types/`, with one file per type, and `src/types/index.ts` re-exports them.

| Type                | Public export | Purpose                                                           |
| ------------------- | ------------- | ----------------------------------------------------------------- |
| `Area`              | yes           | Rectangle `{ x1, y1, x2, y2 }` (inclusive pixels from top-left)   |
| `ComparePngInput`   | no            | `string \| Buffer` input for `comparePng` and `comparePngAsync`   |
| `ComparePngOptions` | yes           | Options object for `comparePng` and `comparePngAsync`             |
| `PixelmatchOptions` | yes           | Mapped by `toPixelmatchOptions` to the vendored pixelmatch format |
| `Color`             | yes           | Public `{ r, g, b }` color used for pixel painting                |
| `LoadedPng`         | yes           | Discriminated union for decoded images (deprecated)               |

`src/index.ts` exports `Color` and `LoadedPng` in the public type surface.

`resolveOptions` validates `PixelmatchOptions`. Then `src/adapters/toPixelmatchOptions.ts` copies each known key into the options object for `src/vendor/pixelmatch.ts`. Unknown keys never reach `pixelmatch` (TYPE-03).

---

## Test Conventions

### Data-Driven Pattern

The table-driven `comparePng.*` and `comparePngAsync.*` suites use this pattern:

```ts
const testDataArray = [ { id, name, actual, expected, ... }, ... ];

for (const testData of testDataArray) {
    test(`${testData.name}`, () => { ... });
}
```

Do not write a standalone `test(...)` when the same check applies to multiple inputs. Add a new entry to `testDataArray` instead.

### Imports in Tests

Import from `../src` in tests. Do not import from `../out`:

```ts
import { comparePng } from '../src'; // correct
import { getPngData } from '../src/getPngData'; // correct for internal unit tests
```

### Snapshot Tests

`comparePng.diffs.test.ts` and `comparePng.pixelmatch-options.test.ts` import `../src/vitest.mjs` and call `toMatchPngSnapshot()` on the diff PNG `Buffer`. Git tracks snapshots in `__tests__/__snapshots__/`. Update snapshots with this command:

```sh
npx vitest run -u
```

### Coverage Thresholds

Vitest enforces these minimum coverage thresholds:

| Metric     | Minimum |
| ---------- | ------- |
| Lines      | 100%    |
| Functions  | 100%    |
| Statements | 100%    |
| Branches   | 100%    |

Vitest excludes `src/types/**/*` from coverage because type-only files have no runtime code.
Coverage is 100% across all runtime source files.

---

## Key Conventions

- **Use extensionless relative imports in `src/`**: Source files use imports such as `import { foo } from './foo'`. The only exception is `src/vitest.mts`, which uses `.js` specifiers (for example, `./matchers/pngSnapshot.js`).
- **Keep one type per file** in `src/types/` and re-export from `src/types/index.ts`.
- **Match test file names to source names**: `src/comparePng.ts` maps to `__tests__/comparePng.test.ts`.
- **Do not use shared test helper modules**: Keep each test file self-contained. Store shared PNG fixtures in `test-data/actual/` and `test-data/expected/`.
- **Use approved licenses for production dependencies**: `ISC`, `MIT`, `MIT OR X11`, `BSD`, `Apache-2.0`, and `Unlicense`. `npm run test:license` enforces this rule during `npm test`.
- **`throwErrorOnInvalidInputData` defaults to `true`**: Set it to `false` only when you want to treat a missing or invalid input as a zero-size PNG. The library always throws an error when **both** inputs are invalid.
- **Do not write a diff file when `mismatchedPixels === 0`**: `getPersistableDiff` in `src/pipeline/persistDiff.ts` skips diff creation when images match.
- **Paint excluded areas on both images** before comparison so they always match. The default color is blue `{ r: 0, g: 0, b: 255 }` (`excludedAreaColor`). `addColoredAreasToImage` clamps coordinates to image bounds.
- **Paint the size-difference region on the extended canvas**: The default color is green `{ r: 0, g: 255, b: 0 }` (`extendedAreaColor`). The padded region counts as a difference where it overlaps the other image.
- **Keep TypeScript configs split**: `tsconfig.json` is the no-emit development config, and `tsconfig.prod.json` is the package build config.

---

## CI and CD

### `test.yml` — runs on every push (except `release/*` branches) and every pull request

| Job           | OS            | Node                                              | Gates merges             |
| ------------- | ------------- | ------------------------------------------------- | ------------------------ |
| ubuntu        | ubuntu-latest | from `.nvmrc` (Node `26`)                         | yes                      |
| macos         | macos-latest  | from `.nvmrc` (Node `26`)                         | no — `continue-on-error` |
| engines-floor | ubuntu-latest | `.nvmrc` to build, then `26.0.0` (`engines.node`) | yes                      |

The `ubuntu` and `macos` jobs run `npm run test`. Ubuntu installs Playwright Chromium with `--with-deps`. macOS omits `--with-deps` because that flag installs Linux packages.

The `engines-floor` job builds and packs the tarball with the `.nvmrc` Node version, switches to Node 26.0.0, and runs `node ./scripts/install-smoke.mjs <tarball>`. That script installs the tarball into a temporary project with `--engine-strict`, loads the root entry with `require()` and ESM `import`, and verifies `comparePng` and `comparePngAsync`. `release:check:post` runs the same script against the published version. Keep `node-version` in `engines-floor` synchronized with `engines.node`.

macOS is a supported platform (`"os": ["darwin", "linux"]`). Its CI job uses `continue-on-error` because Vitest hits a macOS-only worker crash (`Error: Worker exited unexpectedly`) in about 1 of 5 coverage runs (tracked as TEST-08). Windows is not supported.

### `publish.yml` — runs when a GitHub release is published (skips prereleases)

Three jobs run in sequence:

```
verify         (contents: read)
  npm ci
  npx playwright install --with-deps chromium
  npm audit --audit-level=high
  npm test                   <- full unit and e2e suite
  npm run build              <- clean and compile with tsconfig.prod.json
  npm run release:check:pre  <- checks RELEASE_TAG from the GitHub release tag
  npm pack                   <- uploads the tarball artifact and outputs its sha256

publish        (contents: read, id-token: write) — no checkout, no npm ci, no build
  make sure npm >= 11.5.1    <- required for npm Trusted Publishing
  download the tarball and check its sha256
  npm publish ./<tarball> --provenance --access public --ignore-scripts

post-release   (contents: read) — checkout, no npm ci
  npm run release:check:post
```

The tarball contains only `./out` (`"files"` in `package.json`). Only the `publish` job has `id-token: write` permission so `devDependencies` in `verify` cannot request an OIDC publish token. Publishing with `--ignore-scripts` runs no lifecycle scripts.

`release:check:post` retries registry checks because the npm CDN can serve cached metadata for several minutes after publish.

Publishing uses **npm Trusted Publishing (OIDC)** without an `NPM_TOKEN` secret. Configure the trusted publisher on npmjs.com for organization `dichovsky`, repository `png-visual-compare`, and workflow `publish.yml`.

All workflows pin GitHub Actions (`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, and `actions/download-artifact`) to full commit SHAs with a `# vX.Y.Z` version comment.

### `lint-workflows.yml` — same triggers as `test.yml`

The `workflow-lint` job downloads the `actionlint` release specified in `ACTIONLINT_VERSION`, verifies its `SHA-256` checksum against `ACTIONLINT_SHA256`, and runs `actionlint` on `.github/workflows`. Update `ACTIONLINT_VERSION` and `ACTIONLINT_SHA256` together.

---

## Package Distribution

npm publishes only the `./out` directory (`"files": ["./out"]` in `package.json`).

The package defines these entry points:

- `"main": "./out/index.js"` — CommonJS entry point
- `"types": "./out/index.d.ts"` — TypeScript declarations
- `"exports"` — four subpaths:
    - `.` -> `./out/index.js` (types `./out/index.d.ts`)
    - `./vitest` -> `./out/vitest.mjs` (ESM, types `./out/vitest.d.mts`)
    - `./jest` -> `./out/jest.js` (types `./out/jest.d.ts`)
    - `./playwright` -> `./out/playwright.js` (types `./out/playwright.d.ts`)
- `"sideEffects": ["./out/vitest.mjs", "./out/jest.js"]` — marks only the two side-effect matcher entries because importing them calls `expect.extend(...)`.

The build outputs CommonJS except `src/vitest.mts` -> `out/vitest.mjs`, which compiles to ESM for Vitest.

`"engines": { "node": ">=26.0.0" }`, `"os": ["darwin", "linux"]`.
