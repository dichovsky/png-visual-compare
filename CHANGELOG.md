# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Jest can load the package without extra configuration** — the CommonJS build
  `require()`d `pixelmatch` 7, which ships only as an ES module. Node.js loads that through
  `require(esm)`, but Jest's own module loader (Jest 29 and 30) and Vitest's `vmThreads` /
  `vmForks` pools on Node.js 22 cannot, so importing `png-visual-compare` or
  `png-visual-compare/jest` failed in a stock Jest project — true since the Jest matcher
  shipped in 6.2.0. `pixelmatch` 7.2.0 (ISC) is now vendored as a TypeScript port, checked
  byte for byte against upstream, so the Babel workaround documented for 7.0.0 is no longer
  needed. Closes RELI-11.

### Dependencies

- `pixelmatch` is no longer a runtime dependency; `pngjs` is the only one. `pixelmatch`
  stays a devDependency as the parity oracle for the vendored copy.

## [7.0.0] - 2026-09-26

Breaking changes — the Node.js floor, the Vitest peer range, and install-time peer
checks — are marked **BREAKING** under **Changed** below. See the README's migration
guide for upgrade steps.

### Added

- **Playwright matcher** — `png-visual-compare/playwright` exports an `expect` extended
  with a synchronous `toMatchPngSnapshot()`, plus `pngMatchers` for your own
  `expect.extend` / `mergeExpects`. Baselines are PNG files at `testInfo.snapshotPath()`
  (see `docs/adr/0001-playwright-baselines-as-png-files.md`), `--update-snapshots` and
  `ignoreSnapshots` behave as for Playwright's `toMatchSnapshot()`, and failures attach
  expected/actual/diff images for the HTML report's image diff viewer. A received image
  over `maxDimension` / `maxPixels` throws `ResourceLimitError` instead of being written as
  a baseline no later run could compare against. `@playwright/test` `>=1.60.0 <2` is an
  optional peer dependency.

- **`maxFileBytes` option** (default `135_266_304`, exported as `DEFAULT_MAX_FILE_BYTES`) —
  caps the size of a PNG read from a path, checked from the file's size before any
  bytes are read and again against the bytes actually read, so a file that grows
  mid-read, a FIFO, or a device cannot slip past it. `maxDimension` and `maxPixels` inspect the declared IHDR header and
  so bound the _decoded_ image; nothing previously bounded the _compressed_ bytes, so a
  multi-gigabyte file was fully resident before either limit was consulted. Throws
  `ResourceLimitError` regardless of `throwErrorOnInvalidInputData`, matching the other
  two limits. Ignored for `Buffer` inputs, whose memory the caller already holds.
  Closes SECU-04.

    The cap is checked _after_ the containment check, not before: its error names an
    exact byte count and escapes even in permissive mode, so checking it first would
    disclose the existence and size of a file outside `inputBaseDir`.

    The default is the raw size of a 16-bit RGBA image — the widest PNG pixel format,
    8 bytes per pixel — at `maxPixels`, plus 1 MiB for filter bytes, compression framing,
    and metadata chunks. No PNG that passes `maxPixels` reaches it, whatever its bit
    depth. Lower it if you compare untrusted uploads and want a tighter memory bound.

### Changed

- **BREAKING: Node.js 22.12.0 or later is required** — `engines.node` is now `>=22.12.0`
  (was `>=20`). Node.js 20 reached end-of-life in April 2026. The floor is 22.12.0 rather
  than 22.0.0 because the CommonJS build `require()`s `pixelmatch` 7, which is ESM-only,
  and `require()` of an ES module is enabled by default only from Node.js 22.12.0. The
  old `>=20` range was already inaccurate: 6.3.0 fails at load with `ERR_REQUIRE_ESM` on
  Node.js 20.17 and 22.8, for example. The new range lets npm report the mismatch at
  install time instead.
- **BREAKING: Vitest peer range is now `>=5.0.0 <6`** (was `>=4.1.0 <5`). Vitest 5 changed the
  `Assertion`/`Matchers` interfaces to two type parameters (`<R, T>`), so the
  `toMatchPngSnapshot` module augmentation in `png-visual-compare/vitest` now targets
  `Matchers<R, T>` and no longer type-checks against Vitest 4. Stay on the previous
  release if you are still on Vitest 4.
- **BREAKING: optional peers are checked at install** — npm checks an optional peer
  whenever it is installed, whether or not you import the matching subpath. A project
  with `vitest` 4 or with `@playwright/test` older than 1.60 now gets `ERESOLVE` from
  `npm install png-visual-compare@7` even if it only calls `comparePng`; with a caret
  range such as `^1.55.0`, npm upgrades Playwright instead. Upgrade the peer first.
- **CI** — both test jobs now take their Node version from `.nvmrc` (`24`) instead of
  hardcoded versions (`24.x` on Ubuntu, `20.x` on macOS).
- **CI** — the macOS job in `test.yml` is now marked `continue-on-error`: it still runs
  and reports, but does not gate merges while a pre-existing macOS-only Vitest fork
  crash (roughly 1 run in 5 under coverage, tracked as TEST-08) remains unfixed. macOS
  stays a supported platform (`"os": ["darwin", "linux"]`); Windows remains
  unsupported and untested by design, dropped as a breaking change in 6.0.0.
- **CI** — `actions/checkout` and `actions/setup-node` are now SHA-pinned in
  `publish.yml` as well as `test.yml`, both annotated with the matching release tag
  (`v7.0.1` / `v7.0.0`). Closes CI-05.
- **Docs** — `.github/copilot-instructions.md` was resynced with the code: the CI
  matrix, the OIDC Trusted Publishing flow (no `NPM_TOKEN`), the `pixelmatch ~7.2.0`
  floor, the `./vitest` and `./jest` subpath exports, the `sideEffects` array, and the
  `npm run` script list. `CLAUDE.md` and `AGENTS.md` now list `codemap:check` in the
  `pretest:unit` chain.
- **Docs** — the README gains a v7.0.0 migration guide, a verified Jest configuration
  (Jest's own module loader cannot `require()` the ESM-only `pixelmatch` without it,
  which was already true in 6.x — tracked as RELI-11), and guidance on image limits for
  full-page Playwright screenshots. `SECURITY.md` now lists 7.x as supported.

### Security

- **Path reads are pinned to one inode** — `comparePng` and `comparePngAsync` now run a
  filesystem-free containment check, open the input file, and only then validate it,
  proving the opened handle is the file containment approved. A path outside
  `inputBaseDir` is refused before it is opened, so whether it exists is never disclosed. Previously `validatePath` walked the path and `readFile` walked
  it again from scratch, so anything swapped in between was what actually got read.
  Only engages when `inputBaseDir` is set. Closes SECU-05.
- **Diff writes no longer traverse a symlinked parent** — the recursive `mkdir` in both
  diff writers followed symlinks in every intermediate component, and `O_NOFOLLOW`
  guards only the final one, so a symlinked parent could redirect the write outside
  `diffOutputBaseDir`. Parent directories are now created one component at a time with
  symlinks refused, and the file is then opened inside the _resolved_ parent
  directory rather than the caller's path, so no symlink is traversed at open time
  at all, and both writers re-resolve the parent chain after the open to prove the
  handle sits inside it. Truncation is deferred — the open no longer uses `O_TRUNC`, and `ftruncate`
  runs only once the opened handle has been proven contained — and a failed check
  removes only a file this write created — established by
  `O_EXCL` on the create attempt, since plain `O_CREAT` succeeds identically for a
  file that already existed empty. Only engages when `diffOutputBaseDir` is set.
  Closes SECU-09.
- **Absent file identity is refused, not ignored** — on a filesystem that reports no
  inode (some network mounts) containment cannot be verified, so the operation throws
  `PathValidationError` instead of silently passing a check that compares two zeroes.
- **README gained a Security Model section** documenting what each limit does and does
  not cover, including that the race defences _detect_ a swap rather than prevent it,
  since Node exposes no `openat`. Closes SECU-06.
- **Known limits, documented** — a hard link inside a boundary, and a FIFO planted
  inside one, are not defended against; see README → Security Model → What is not
  covered (tracked as SECU-13 and SECU-14).

### Dependencies

- Runtime dependencies are unchanged: `pixelmatch` `~7.2.0`, `pngjs` `~7.0.0`.
- Bumped devDependencies: `@playwright/test` `~1.63.0`, `@types/node` `~26.6.1`,
  `@vitest/coverage-v8` `~5.0.1`, `eslint` `~10.10.0`, `prettier` `~3.9.8`,
  `typescript-eslint` `~8.70.0`, `vitest` `~5.0.1`.

## [6.3.0] - 2026-07-29

### Added

- **`.not.toMatchPngSnapshot()`** — negated snapshot assertions are now
  supported in both the Vitest and Jest matchers, and assert that the received
  PNG **differs** from the stored snapshot. Previously any `.not` usage threw
  `.not.toMatchPngSnapshot() is not supported.`
    - Passes when the received PNG differs beyond the configured threshold;
      fails when it matches.
    - **Never writes or updates a snapshot**, even under `-u` — you cannot
      record what an image must _not_ be.
    - **Throws when no snapshot is stored**, rather than passing vacuously on a
      missing baseline.
    - Invalid input (non-PNG value, malformed matcher arguments) now throws
      under `.not` instead of reporting `pass: false`, which the test framework
      would have inverted into a silently passing assertion.

### Changed

- **TypeScript 7** — `build` and `typecheck` now run the native TypeScript 7
  compiler via the `@typescript/native` alias. TypeScript 6 is retained under
  the `typescript` alias because the codemap generator, its tests, and
  `typescript-eslint` still require the legacy compiler API. This is a
  development-only change: the published `out/` artifact is semantically
  identical, differing from a TypeScript 6 build only in `.d.ts` quote style and
  one union member ordering. See `docs/TYPESCRIPT_7_MIGRATION.md`.
- Refreshed development dependencies (`@playwright/test`, `@types/node`,
  `@vitest/coverage-v8`, `eslint`, `prettier`, `typescript-eslint`, `vitest`)
  and pinned GitHub Actions digests.

## [6.2.0] - 2026-06-19

### Added

- **checkerboard** — `pixelmatchOptions.checkerboard` is now forwarded to
  pixelmatch (7.2.0+), letting callers control whether semi-transparent pixels
  are blended against a checkerboard pattern (`true`, the default) or plain
  white (`false`). Validated as a boolean by `validatePixelmatchOptions`.
- **RELI-10** — New public `ComparisonError` (`code: 'ERR_COMPARISON'`) thrown
  when the underlying `pixelmatch` call fails. The original failure is preserved
  on the standard ES2022 `cause` property so callers can match by class or by
  `code` instead of parsing free-form messages. Like `ResourceLimitError`, this
  error is **not** downgraded by `throwErrorOnInvalidInputData: false` — a
  comparison-kernel failure signals an integrity bug, not a recoverable input
  problem. Applies to both `comparePng` and `comparePngAsync` since they share
  `runComparison`.

### Changed

- **RELI-06** — `validateArea` now rejects negative `excludedAreas`
  coordinates with `InvalidInputError` (`coordinates must be non-negative`)
  instead of letting `addColoredAreasToImage` silently clamp them to `0`. A
  negative coordinate is almost always a caller typo, so it now fails fast at
  the validation boundary. Potentially breaking for callers that relied on the
  previous clamping behaviour.

### Fixed

- **RELI-07** — the `persistDiff` guard now reads `mismatchedPixels === 0`
  rather than `<= 0`. Behaviourally identical (pixelmatch never returns a
  negative count) but states the actual "no mismatches ⇒ no diff file"
  contract.
- **excluded-areas-builder** — the drawing tool now clamps coordinates to the
  last valid pixel index (`naturalW - 1` / `naturalH - 1`), so emitted areas
  are valid inclusive pixel indices instead of one-past-the-edge values.
- `excludedAreas` are now painted on the final normalized canvas, _after_ size
  extension, so an excluded band that falls outside the smaller image is no
  longer clamped away and reported as a mismatch. Same-size inputs are
  unaffected.
- The `./vitest` subpath export no longer ships an empty CommonJS
  `vitest.types.js`; the `declare module 'vitest'` augmentation is inlined into
  `vitest.mts`, and the published types entry points to the co-located `.d.mts`.

### Security

- **SECU-10** — Moved the normalized-canvas `maxPixels` guard into
  `normalizeImages`, _before_ `extendImage` runs. The check previously lived in
  `runComparison`, which fires only after two extended canvases are already
  allocated, so a `(16384x1024, 1024x16384)` input pair — each within
  `DEFAULT_MAX_PIXELS` — could force ~2 GiB of zero-filled RGBA allocation
  before the guard could throw.
- **SECU-11** — `validatePath` now performs the `baseDir` containment check
  _before_ the symlink/directory shape checks, closing an oracle that leaked
  exists-symlink / exists-directory / other status for arbitrary absolute paths
  when a security boundary was configured. Every out-of-bounds path now yields a
  uniform `Path traversal detected: ...` error.
- **SECU-12** — Both diff writers now issue an explicit `fchmodSync(fd, 0o600)`
  / `await handle.chmod(0o600)` after open. `open(path, flags, 0o600)` only sets
  the mode on newly created files (and is narrowed by umask), so overwriting a
  pre-existing `0o644` diff left it group/world-readable; the post-open chmod
  forces `0o600` in both the create and overwrite cases.
- Hardened the sync diff writer against partial writes by replacing `writeSync`
  (which can write fewer bytes than requested) with `writeFileSync`, which loops
  until the full buffer is flushed. The async path already guaranteed
  full-buffer writes via `FileHandle.writeFile`.

## [6.1.1] - 2026-05-16

### Security

- **SECU-03** — Closed the TOCTOU symlink-redirect window on diff writes. The
  diff PNG is now written through an `O_NOFOLLOW` open, so a symlink planted at
  `diffFilePath` between `validatePath` and the write is refused with a
  `PathValidationError` instead of being followed. Regular-file overwrite
  semantics are preserved; only the symlink-redirect attack is closed.
- TSDoc on `diffFilePath` documents the new symlink-refusal contract and
  `@throws PathValidationError`. TSDoc on `diffOutputBaseDir` clarifies that the
  target-path race is now closed at write-time, while the residual
  parent-directory race is tracked as `SECU-09`.

## [6.0.0] - 2026-04-25

### Added

- `DEFAULT_EXCLUDED_AREA_COLOR` and `DEFAULT_EXTENDED_AREA_COLOR` exported constants so callers
  can inspect or reference the built-in fill colours.
- `comparePngAsync` for Promise-based comparisons using async filesystem I/O.
- `excludedAreaColor` and `extendedAreaColor` options in `ComparePngOptions` to override the
  default fill colours when they clash with image content.
- `docker-compose.yml` for running tests with a single `docker compose up` command.
- `CONTRIBUTING.md` with development setup and PR guidelines.
- Dependabot configuration for automated weekly npm and GitHub Actions updates.
- `format` / `format:check` npm scripts; `prettier` added as a dev dependency.
- `lint:fix` npm script for ESLint auto-fix.
- `docs/ARCHITECTURE.md` and generated `CODEMAP.md` to document the refactored pipeline and symbol surface.

### Changed

- TypeScript configuration is now split between repo-wide development typechecking (`tsconfig.json`)
  and emitted package builds (`tsconfig.prod.json`).
- BREAKING: package support is now limited to macOS and Linux; `npm install` is blocked on Windows
  via the package `os` field, and CI now validates Ubuntu and macOS instead of Windows.
- `ComparePngOptions` now documents and enforces `maxPixels`, and `DEFAULT_MAX_PIXELS` is exported.
- `diffFilePath` is now resolved to an absolute path via `path.resolve` before use, preventing
  accidental relative-path writes.
- Test timeout lowered from 90 s to 30 s in `vitest.config.mjs`.
- GitHub Actions workflows now run with least-privilege `permissions: contents: read`.
- Docker image switched from `node:22` to `node:22-slim`; container now runs as non-root `node`
  user; Dockerfile renamed from `dockerfile` to `Dockerfile`.
- Unit-test coverage thresholds are now enforced at 100% for lines, functions, branches, and statements.

### Fixed

- Off-by-one boundary in `fillImageSizeDifference` — pixels at exactly `x === origWidth` or
  `y === origHeight` are now correctly painted.
- Eliminated TOCTOU race condition in `getPngData` by replacing the `existsSync` + `readFileSync`
  two-step with a single `try/catch` around `readFileSync`.
- `validateArea` and color-tuple validation now reject non-number values such as `bigint`.

### Removed

- Unused `ts-node` and `@tsconfig/recommended` dev dependencies.
- BREAKING: removed the public `PngData` export in favor of the discriminated internal `LoadedPng` result union.

## [4.1.0] - 2025-06-27

### Added

- Full TypeScript strict-mode rewrite with complete JSDoc coverage on all public APIs.
- `throwErrorOnInvalidInputData` option (default `true`) replaces the old silent-failure behaviour.
- `PixelmatchOptions` type exported for typed forwarding of pixelmatch configuration.

## [4.0.0] - 2025-05-05

### Changed

- Migrated to pixelmatch 7.x (breaking: `threshold` default changed from `0.1` to pixelmatch's
  updated default).

## [3.0.0] - 2024-11-10

### Added

- `excludedAreas` option to mask rectangular regions before comparison.
- Diff PNG is written only when `mismatchedPixels > 0`.

## [2.0.0] - 2024-08-14

### Changed

- API changed to accept `Buffer` inputs in addition to file paths.

## [1.0.0] - 2024-03-01

### Added

- Initial release: pixel-level PNG comparison via pixelmatch and pngjs.
