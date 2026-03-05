# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `DEFAULT_EXCLUDED_AREA_COLOR` and `DEFAULT_EXTENDED_AREA_COLOR` exported constants so callers
  can inspect or reference the built-in fill colours.
- `excludedAreaColor` and `extendedAreaColor` options in `ComparePngOptions` to override the
  default fill colours when they clash with image content.
- `docker-compose.yml` for running tests with a single `docker compose up` command.
- `CONTRIBUTING.md` with development setup and PR guidelines.
- Dependabot configuration for automated weekly npm and GitHub Actions updates.
- `format` / `format:check` npm scripts; `prettier` added as a dev dependency.
- `lint:fix` npm script for ESLint auto-fix.

### Changed

- `diffFilePath` is now resolved to an absolute path via `path.resolve` before use, preventing
  accidental relative-path writes.
- Test timeout lowered from 90 s to 5 s in `vitest.config.mjs`.
- GitHub Actions workflows now run with least-privilege `permissions: contents: read`.
- Docker image switched from `node:22` to `node:22-slim`; container now runs as non-root `node`
  user; Dockerfile renamed from `dockerfile` to `Dockerfile`.

### Fixed

- Off-by-one boundary in `fillImageSizeDifference` — pixels at exactly `x === origWidth` or
  `y === origHeight` are now correctly painted.
- Eliminated TOCTOU race condition in `getPngData` by replacing the `existsSync` + `readFileSync`
  two-step with a single `try/catch` around `readFileSync`.

### Removed

- Unused `ts-node` and `@tsconfig/recommended` dev dependencies.

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
