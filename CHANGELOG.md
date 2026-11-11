# Changelog

This file records all notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING: Node.js 26.0.0 or later is required** — Updated `engines.node` to `>=26.0.0`, `.nvmrc` to `26`, `Dockerfile` to `node:26-slim`, and the `engines-floor` CI job to `26.0.0`.
- **Upgraded vendored `pixelmatch` to 8.0.0** — Synced `src/vendor/pixelmatch.ts` to `pixelmatch` 8.0.0 (OKLab HyAB perceptual color distance and block pre-pass) and added support for `pixelmatchOptions.windowSize` and `pixelmatchOptions.ignoreMask`.
- **Converted documentation to ASD-STE100** — Rewrote all repository Markdown documentation in Simplified Technical English (ASD-STE100).

### Security

- **Resolved transitive dependency vulnerabilities** — Updated dependencies and added `overrides` for `deepmerge`, `glob`, and `minimatch` in `package.json` so `npm audit` reports 0 vulnerabilities.

## [7.2.1] - 2026-09-27

### Security

- **Rejected corrupt non-interlaced PNG image data before decoding** — `pngjs` 7.0.0 misses `zlib` errors on truncated or invalid non-interlaced `IDAT` streams and returns an uninitialized `Buffer`. This library now inflates image data with `node:zlib` before decoding and requires the exact byte count declared by the `IHDR` header. Any mismatch (including a bad Adler-32 checksum) throws `InvalidInputError`.
- **Bounded interlaced PNG decompression by the declared image dimensions** — `pngjs` 7.0.0 inflates interlaced (Adam7) image data without an output limit. This library now inflates interlaced data with `node:zlib`, stops one byte past the expected Adam7 scanline size, and throws `InvalidInputError` on any size mismatch.

### Fixed

- **Fixed `npm run -s release:check:pre` for unpublished versions** — Added `--loglevel=error` to all `npm` commands in the release scripts so `-s` (`npm_config_loglevel=silent`) does not hide `E404` output on `stderr`.

### Changed

- **Docs** — Clarified in `README.md` that a path inside `inputBaseDir` that escapes through a symlink is opened first and then rejected with `PathValidationError` before `maxFileBytes` is checked or any byte is read.
- **Docs** — Updated `.github/copilot-instructions.md` to state that `src/adapters/toPixelmatchOptions.ts` copies validated `PixelmatchOptions` keys instead of passing the object directly.
- **CI** — Added `.github/workflows/lint-workflows.yml` to run `actionlint` 1.7.12 and `shellcheck` on `.github/workflows`.

## [7.2.0] - 2026-09-27

### Security

- **Rejected hard-linked diff targets under `diffOutputBaseDir`** — When `diffOutputBaseDir` is set, diff writers reject any target file with `nlink > 1` (`PathValidationError`) before truncation or write (SECU-13).
- **Rejected FIFOs and device files inside a base directory without blocking** — When `inputBaseDir` or `diffOutputBaseDir` is set, file opens use `O_NONBLOCK` and reject non-regular files with `PathValidationError` (SECU-14).

### Fixed

- **Fixed Jest 30.5+ `jest.retryTimes` snapshot tracking** — Updated `src/jest.ts` to record snapshot keys, baselines, and counts with `currentTestIdentity()` so retries compare against the same baseline (RELI-12).
- **Accepted `toMatchPngSnapshot(undefined, options)`** — Updated argument parsing in Jest, Vitest, and Playwright to treat `(undefined, options)` the same as `(options)` (API-06).

### Changed

- **Aligned Playwright `toMatchPngSnapshot` TypeScript overloads with Jest and Vitest** — Declared `(options?)` and `(name?, options?)` overloads so passing options in both arguments fails type-checking (API-06).
- **Checked Playwright baseline limits from the PNG header only** — Updated `writeBaseline` in `src/playwright.ts` to check `maxDimension` and `maxPixels` from the PNG signature and `IHDR` header without decoding the image (PERF-08).
- **CI** — Split `publish.yml` into `verify`, `publish`, and `post-release` jobs so only `publish` requests the OIDC token and publishes the verified tarball with `--ignore-scripts` (CI-06).
- **CI** — Added the `engines-floor` job in `test.yml` and `scripts/install-smoke.mjs` to test the packed tarball on the minimum `engines.node` version (CI-07).

## [7.1.0] - 2026-09-26

### Deprecated

- **Deprecated `LoadedPng` type export** — Marked `LoadedPng` as deprecated for removal in 8.0.0 because no public API returns or accepts it (TYPE-06).

### Changed

- **Cleaned up public type declarations** — Removed internal port type references from `comparePng` declarations and listed public type exports explicitly in `src/index.ts`.

## [7.0.1] - 2026-09-26

### Fixed

- **Vendored `pixelmatch` so Jest can load the package without Babel** — Ported `pixelmatch` 7.2.0 to `src/vendor/pixelmatch.ts` under its ISC license so Jest and Vitest VM pools can load the CommonJS build directly (RELI-11).
- **Validated PNGs before writing baselines** — Rejected undecodable PNGs and images above `maxDimension` or `maxPixels` before recording or updating baselines in Jest, Vitest, and Playwright.
- **Reported obsolete sibling Jest snapshots** — Updated the Jest matcher so `jest --ci` reports unused sibling snapshots.
- **Protected baselines in expected-failure tests** — Skipped baseline writes and counter updates inside Jest 30+ `test.failing` and Vitest 5 `test.fails` assertions.
- **Preserved Vitest mismatch reporting when updates are disabled** — Kept standard mismatch diffs in `none` and `new` snapshot update modes.
- **Supported `@jest/globals` `expect`** — Added type support for `expect` imported from `@jest/globals` when `injectGlobals: false` is set.

### Security

- **Rejected PNGs with duplicate `IHDR` chunks** — Scanned PNG inputs for multiple `IHDR` chunks before decoding so a second header cannot bypass image limits.
- **Stopped unlinking refused diff paths** — Changed diff writers to close the file handle without unlinking on failure so a swapped path is never deleted (follow-up to SECU-09).

### Changed

- **CI** — Added retry backoff to the post-release `version-live` check.
- **CI** — Included `CODEMAP.md` in the Docker build context and restricted Vitest discovery to `__tests__/`.

### Dependencies

- **Added optional peer `expect` with `*` range** — Allowed pnpm 9+ to resolve `expect` for the `png-visual-compare/jest` type augmentation.
- **Moved `pixelmatch` to `devDependencies`** — Kept `pngjs` as the only production dependency.

## [7.0.0] - 2026-09-26

### Added

- **Added Playwright matcher (`png-visual-compare/playwright`)** — Exported extended `expect` with synchronous `toMatchPngSnapshot()` and `pngMatchers`. Stored baselines as PNG files at `testInfo.snapshotPath()` and attached expected, actual, and diff PNGs to the Playwright report on failure.
- **Added `maxFileBytes` option** (default `135_266_304`, exported as `DEFAULT_MAX_FILE_BYTES`) — Limited the byte size of PNG files read from paths before decoding (SECU-04).

### Changed

- **BREAKING: Required Node.js 22.12.0 or later** — Updated `engines.node` from `>=20` to `>=22.12.0`.
- **BREAKING: Updated `vitest` peer range to `>=5.0.0 <6`** — Updated the Vitest matcher type augmentation for Vitest 5 `Matchers<R, T>`.
- **BREAKING: Enforced optional peer ranges at install time** — Updated peer ranges for `vitest` and `@playwright/test`.
- **CI** — Configured test jobs to read the Node.js version from `.nvmrc`, marked the `macos` job `continue-on-error` (TEST-08), and pinned GitHub Actions by commit SHA (CI-05).
- **Docs** — Added the v7.0.0 migration guide and updated `SECURITY.md`, `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md`.

### Security

- **Pinned path reads to one inode** — Opened input files before `realpath` validation and verified `dev` and `ino` when `inputBaseDir` is set (SECU-05).
- **Blocked symlink traversal in diff parent directories** — Created parent directories one segment at a time, rejected symlinks, and deferred truncation until after inode verification when `diffOutputBaseDir` is set (SECU-09).
- **Rejected filesystems without inode numbers** — Threw `PathValidationError` when `ino === 0` under a containment boundary.
- **Added Security Model documentation** — Documented resource limits and path containment in `README.md` (SECU-06).

### Dependencies

- Kept runtime dependencies on `pixelmatch ~7.2.0` and `pngjs ~7.0.0`, and updated development dependencies.

## [6.3.0] - 2026-07-29

### Added

- **Added `.not.toMatchPngSnapshot()` support** — Enabled negated snapshot assertions in Vitest and Jest to verify that a received PNG differs from the stored baseline without writing snapshots.

### Changed

- **Migrated build and type-checking to TypeScript 7** — Used `@typescript/native` (TypeScript 7) for `build` and `typecheck` while keeping TypeScript 6 for the codemap script and `typescript-eslint`.
- Updated development dependencies and GitHub Actions digests.

## [6.2.0] - 2026-06-19

### Added

- **Added `pixelmatchOptions.checkerboard`** — Forwarded the `checkerboard` boolean option to `pixelmatch`.
- **Added `ComparisonError` (`ERR_COMPARISON`)** — Wrapped errors from `pixelmatch` in `ComparisonError` with the original error on `cause` (RELI-10).

### Changed

- **Rejected negative coordinates in `validateArea`** — Threw `InvalidInputError` for negative `excludedAreas` coordinates (RELI-06).

### Fixed

- **Updated `persistDiff` check** — Checked `mismatchedPixels === 0` instead of `<= 0` (RELI-07).
- **Clamped coordinates in `excluded-areas-builder`** — Clamped drawn coordinates to `naturalW - 1` and `naturalH - 1`.
- **Applied `excludedAreas` after canvas extension** — Painted excluded areas on the final normalized canvas so excluded regions outside the smaller image always match.
- **Inlined Vitest type augmentation** — Moved `declare module 'vitest'` into `src/vitest.mts`.

### Security

- **Checked `maxPixels` before `extendImage`** — Moved the normalized-canvas `maxPixels` check into `normalizeImages` before buffer allocation (SECU-10).
- **Checked `baseDir` containment before target shape** — Prevented `validatePath` from leaking symlink or directory status outside `baseDir` (SECU-11).
- **Enforced `0o600` mode on diff files** — Added `fchmodSync(fd, 0o600)` and `handle.chmod(0o600)` after opening diff files (SECU-12).
- **Prevented partial sync diff writes** — Used `writeFileSync` on the file descriptor to flush the full buffer.

## [6.1.1] - 2026-05-16

### Security

- **Blocked symlink redirects on diff writes** — Opened diff files with `O_NOFOLLOW` and threw `PathValidationError` if `diffFilePath` is a symlink (SECU-03).

## [6.0.0] - 2026-04-25

### Added

- Exported `DEFAULT_EXCLUDED_AREA_COLOR` and `DEFAULT_EXTENDED_AREA_COLOR`.
- Added `comparePngAsync` for asynchronous file comparisons.
- Added `excludedAreaColor` and `extendedAreaColor` options to `ComparePngOptions`.
- Added `docker-compose.yml`, `CONTRIBUTING.md`, Dependabot config, Prettier scripts, `docs/ARCHITECTURE.md`, and `CODEMAP.md`.

### Changed

- Split TypeScript configs into `tsconfig.json` and `tsconfig.prod.json`.
- **BREAKING:** Restricted supported operating systems to macOS and Linux (`"os": ["darwin", "linux"]`).
- Enforced `maxPixels` and exported `DEFAULT_MAX_PIXELS`.
- Resolved `diffFilePath` with `path.resolve`.
- Enforced 100% unit test coverage thresholds across all metrics.

### Fixed

- Fixed off-by-one boundary in `fillImageSizeDifference`.
- Removed `existsSync` before `readFileSync` in `getPngData`.
- Rejected `bigint` and other non-number values in `validateArea` and color validation.

### Removed

- Removed `ts-node` and `@tsconfig/recommended`.
- **BREAKING:** Removed the public `PngData` export and replaced it with `LoadedPng`.

## [4.1.0] - 2025-06-27

### Added

- Rewrote the codebase in TypeScript strict mode with JSDoc comments.
- Added `throwErrorOnInvalidInputData` (default `true`).
- Exported `PixelmatchOptions`.

## [4.0.0] - 2025-05-05

### Changed

- Upgraded to `pixelmatch` 7.x.

## [3.0.0] - 2024-11-10

### Added

- Added `excludedAreas` to mask rectangular regions before comparison.
- Wrote the diff PNG only when `mismatchedPixels > 0`.

## [2.0.0] - 2024-08-14

### Changed

- Accepted `Buffer` inputs in addition to file paths.

## [1.0.0] - 2024-03-01

### Added

- Released initial pixel-level PNG comparison with `pixelmatch` and `pngjs`.
