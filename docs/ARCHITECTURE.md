# Architecture

This document describes the internal architecture of `png-visual-compare`.

## System Overview

The package compares PNG images and provides these interfaces:

- **Public synchronous API:** `comparePng(png1, png2, opts?)`
- **Public asynchronous API:** `comparePngAsync(png1, png2, opts?)`
- **Test-framework matchers:** `toMatchPngSnapshot()` in `png-visual-compare/vitest`, `png-visual-compare/jest`, and `png-visual-compare/playwright`
- **Internal synchronous test seam:** `comparePngWithPorts(...)` in `src/comparePngWithPorts.ts` (not exported in public declarations)

The package accepts absolute file paths or raw PNG `Buffer` inputs. It normalizes both images to a common canvas, runs `pixelmatch`, and writes a diff PNG when requested.

## High-Level Flow

```text
comparePng / comparePngAsync
  -> resolveOptions
  -> loadSources / loadSourcesAsync
  -> normalizeImages
  -> runComparison
  -> persistDiff / async diff writer
```

## Public Surface

### Runtime Exports

- `comparePng`
- `comparePngAsync`
- `ComparisonError`
- `InvalidInputError`
- `PathValidationError`
- `ResourceLimitError`
- `DEFAULT_EXCLUDED_AREA_COLOR`
- `DEFAULT_EXTENDED_AREA_COLOR`
- `DEFAULT_MAX_DIMENSION`
- `DEFAULT_MAX_FILE_BYTES`
- `DEFAULT_MAX_PIXELS`

### Public Types

- `Area`
- `Color`
- `ComparePngOptions`
- `PixelmatchOptions`
- `LoadedPng` — deprecated alias of the internal type in `src/pipeline/types.ts`; scheduled for removal in 8.0.0 (TYPE-06)

### Subpath Exports

Each subpath provides a `toMatchPngSnapshot()` matcher for one test framework. All three subpaths validate the received PNG and matcher arguments with `src/matchers/createPngSnapshotMatcher.ts` and compare images with `comparePng`.

- `png-visual-compare/vitest` (`src/vitest.mts`): side-effect import. Registers the matcher on Vitest `expect` and augments `Matchers<R, T>` (Vitest 5). Stores baselines as serialized `Buffer` strings in `.snap` files. Optional peer: `vitest >=5.0.0 <6`.
- `png-visual-compare/jest` (`src/jest.ts`): side-effect import. Registers the matcher on Jest global `expect` when available, exports `registerJestPngSnapshotMatcher`, and augments Jest matcher types. Stores baselines as serialized `Buffer` strings in `.snap` files. Optional peers: `jest >=29 <31` and `expect`.
- `png-visual-compare/playwright` (`src/playwright.ts`): no side effects. Exports `expect` (Playwright `expect` extended with synchronous `toMatchPngSnapshot()`) and `pngMatchers`. Stores baselines as PNG files at `testInfo.snapshotPath(name)`. Optional peer: `@playwright/test >=1.60.0 <2`.

## Module Layout

| Area                  | Files                                                                                                                                  | Responsibility                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Public entrypoints    | `src/index.ts`, `src/comparePng.ts`, `src/comparePngAsync.ts`                                                                          | Package exports and synchronous or asynchronous orchestration              |
| Pipeline              | `src/pipeline/*`                                                                                                                       | Option resolution, source loading, normalization, comparison, diff writing |
| Validation            | `src/validatePath.ts`, `src/validateArea.ts`, `src/validateColor.ts`, `src/validatePixelmatchOptions.ts`                               | Input validation for security and correctness                              |
| Image helpers         | `src/getPngData.ts`, `src/extendImage.ts`, `src/fillImageSizeDifference.ts`, `src/addColoredAreasToImage.ts`, `src/drawPixelOnBuff.ts` | PNG decoding and pixel buffer updates                                      |
| Guarded file read     | `src/readValidatedFile.ts`                                                                                                             | Opens a file before validation so bytes come from the approved inode       |
| Internal helpers      | `src/internal/*`                                                                                                                       | `assertSameFile`, `assertPlainFile`, `secureMkdir`, `realDiffDirectory`    |
| Ports                 | `src/ports/*`                                                                                                                          | Synchronous and asynchronous filesystem adapters and test seams            |
| Vendored kernel       | `src/vendor/pixelmatch.ts`                                                                                                             | `pixelmatch` 8.0.0 TypeScript port (ISC) with no ESM-only dependency       |
| Types/defaults/errors | `src/types/*`, `src/defaults.ts`, `src/errors.ts`                                                                                      | Shared contracts, default values, and error classes                        |
| Adapter boundary      | `src/adapters/toPixelmatchOptions.ts`                                                                                                  | Translates public `PixelmatchOptions` to `pixelmatch` options              |
| Matchers              | `src/vitest.mts`, `src/jest.ts`, `src/playwright.ts`, `src/matchers/*`                                                                 | `toMatchPngSnapshot` adapters for `./vitest`, `./jest`, and `./playwright` |

## Synchronous Architecture

`comparePng` runs five steps in order:

1. `resolveOptions(opts)` validates all public options and sets default values.
2. `loadSources(png1, png2, options)` loads both inputs through the synchronous image source port.
3. `normalizeImages(sources, options)` clones, extends, and masks the images on a common canvas.
4. `runComparison(images, options)` runs `pixelmatch` on the normalized images.
5. `persistDiff(result, options)` writes the diff PNG when mismatches exist and `diffFilePath` is set.

## Asynchronous Architecture

`comparePngAsync` uses the same option resolution, normalization, and comparison steps as `comparePng`. It replaces only the I/O ports:

- `fsAsyncImageSource.load(...)`
- `fsAsyncDiffWriter.write(...)`

`loadSourcesAsync` starts both reads concurrently with `Promise.all(...)` and returns the `LoadedSources` object.

## Pipeline Stages

### 1. `resolveOptions`

`src/pipeline/resolveOptions.ts`

This stage performs these tasks:

- Sets default values for colors and resource limits.
- Validates `excludedAreas`.
- Validates `pixelmatchOptions`.
- Validates `diffFilePath`.
- Validates `inputBaseDir` and `diffOutputBaseDir`.
- Computes `shouldCreateDiffFile`, the validated `diffFilePath`, and the numeric limits (`maxDimension`, `maxPixels`, `maxFileBytes`).

### 2. `loadSources`

`src/pipeline/loadSources.ts`

Loads both inputs through the `ImageSourcePort` (default: `fsImageSource`).

In asynchronous mode, `loadSourcesAsync` in `src/comparePngAsync.ts` loads both inputs concurrently through `fsAsyncImageSource` and runs the same validation check.

If both inputs are invalid, the function throws `InvalidInputError` and lists the failure reason for each input.

### 3. `normalizeImages`

`src/pipeline/normalizeImages.ts`

This stage performs these tasks:

- Converts `LoadedPng` objects into `PNGWithMetadata` objects.
- Clones valid decoded PNGs before it modifies pixels.
- Converts one invalid input (when `throwErrorOnInvalidInputData` is `false`) into a `0×0` canvas.
- Checks `maxPixels` on the normalized canvas (SECU-10) **before** `extendImage` allocates buffers.
- Extends both images to `max(width) × max(height)`.
- Paints padded regions with `extendedAreaColor`.
- Paints `excludedAreas` on both images **last** so excluded coordinates always match.

Normalization always returns new image buffers and never modifies decoded source buffers in place.

### 4. `runComparison`

`src/pipeline/runComparison.ts`

This stage performs these tasks:

- Allocates a diff `PNG` only when `shouldCreateDiffFile` is `true`.
- Maps public `pixelmatchOptions` with `toPixelmatchOptions(...)`.
- Calls `pixelmatch(...)`.
- Wraps any error from `pixelmatch` in a `ComparisonError` (RELI-10) with the original error on `cause`.

### 5. `persistDiff`

`src/pipeline/persistDiff.ts`

Writes the diff PNG only when all of these conditions hold:

- `mismatchedPixels > 0`
- `diffFilePath` is defined
- `shouldCreateDiffFile` is `true`
- The diff `PNG` buffer exists

## Input Loading Model

`src/getPngData.ts`

`getPngData(...)` returns this discriminated union:

```ts
type LoadedPng = { kind: 'valid'; png: PNGWithMetadata } | { kind: 'invalid'; reason: 'path' | 'decode' | 'type' };
```

Key rules:

- String paths use `readValidatedFileSync` or `readValidatedFile`, never a direct `readFile` call.
- File inputs check `maxFileBytes` before reading any bytes, then check IHDR dimensions before full decode.
- The loader scans all PNG inputs for duplicate IHDR chunks before decode so a second header cannot bypass dimension limits.
- The loader inflates image data with `node:zlib` before decode, stops one byte past the expected byte count from the IHDR header, and requires that exact byte count.
- The loader rejects zero-dimension PNGs with `InvalidInputError`.
- `assertPngHeaderLimits` (internal) checks the PNG signature and IHDR limits without decoding pixel data. The Playwright matcher calls it before writing a baseline.
- `throwErrorOnInvalidInputData: false` converts invalid image data into `{ kind: 'invalid' }`, but security and resource-limit errors still throw.

### Guarded File Read

`src/readValidatedFile.ts`

Node.js does not provide a portable `openat` call. Instead of preventing path swaps, `readValidatedFile` detects them and rejects the read:

1. Run syntax checks (`assertPathSyntax`) and, when `inputBaseDir` is set, lexical containment (`assertLexicalContainment`). Paths outside the boundary fail before `open` touches the filesystem.
2. Open the lexically resolved path to pin one inode. When `inputBaseDir` is set, pass `O_NONBLOCK` so a FIFO does not block (SECU-14).
3. Call `fstat` with `{ bigint: true }` on the open file handle to read its size and inode identity.
4. Call `validatePathWithReal` to check symlink-resolved containment.
5. When `inputBaseDir` is set, call `assertSameFile` to match the handle `dev` and `ino` against the canonical path, then call `assertRegularFile` (SECU-14).
6. Check `maxFileBytes` against the `fstat` size after containment succeeds.
7. Read bytes from the open handle and enforce `maxFileBytes` on the total bytes read.

`assertSameFile` rejects a zero `ino` with `PathValidationError` because filesystems without inode numbers cannot prove identity.

## Validation and Security Boundaries

### Path Validation

`src/validatePath.ts`

The path validator performs these checks:

- Rejects empty or whitespace-only paths.
- Rejects paths with null bytes.
- Resolves paths to absolute paths.
- Checks lexical containment before filesystem access.
- Resolves symlinks for input and output containment.
- Rejects symlink loops, existing output directories, and existing output symlinks.
- Validates the nearest existing parent directory when output parent directories do not exist yet.

The module exports four functions:

- `assertPathSyntax(filePath)` — checks syntax without filesystem access.
- `assertLexicalContainment(filePath, baseDir)` — checks lexical containment without filesystem access.
- `validatePathWithReal(...)` — returns `{ validated, real }`, where `real` is the canonical path after symlink resolution.
- `validatePath(...)` — returns `validated`.

> **Check order (SECU-11):** When `baseDir` is set, lexical and realpath containment checks run **before** output target shape checks. Every path outside `baseDir` throws `Path traversal detected: ...` instead of leaking whether the target is a symlink or directory.

### Diff Write Contract

`src/ports/fsDiffWriter.ts`, `src/ports/fsAsyncDiffWriter.ts`

Both diff writers follow these steps:

- Create parent directories one component at a time with `secureMkdir` when `diffOutputBaseDir` is set, and reject any symlink component (SECU-09).
- Resolve the parent directory chain with `realDiffDirectory` before opening the file.
- Open the target file with `O_WRONLY | O_CREAT | O_NOFOLLOW` (plus `O_NONBLOCK` when `diffOutputBaseDir` is set, SECU-14).
- Close the file handle on failure without unlinking the path so a concurrent replacement file is never deleted.
- Resolve the parent chain again after `open` and verify the handle identity with `assertSameFile`.
- Reject non-regular files (`assertRegularFile`, SECU-14) and files with multiple hard links (`assertSingleLink`, SECU-13) when `diffOutputBaseDir` is set.
- Truncate the file with `ftruncate(0)` only after identity and link checks pass.
- Set file permissions to `0o600` on `open` and call `fchmod(0o600)` on the open handle (SECU-12).

### Area Validation

`src/validateArea.ts`

`excludedAreas` must meet these rules:

- Must be an array of non-null objects.
- Each coordinate (`x1`, `y1`, `x2`, `y2`) must be a non-negative finite integer.
- `x1 <= x2` and `y1 <= y2`.

### Pixelmatch Boundary

`src/validatePixelmatchOptions.ts`

The validator checks all public `PixelmatchOptions` fields before `runComparison` runs:

- `threshold`
- `alpha`
- `includeAA`
- `diffMask`
- `checkerboard`
- `windowSize`
- `ignoreMask`
- `aaColor`
- `diffColor`
- `diffColorAlt`

`src/vendor/pixelmatch.ts` is a TypeScript port of `pixelmatch` 8.0.0 under its ISC license (RELI-11). `__tests__/vendor/pixelmatch.test.ts` tests the port against the upstream `pixelmatch` package across fixtures, options, error messages, and color-delta thresholds.

## Error Model

`src/errors.ts`

Public error classes:

- `InvalidInputError` -> `ERR_INVALID_PNG_INPUT`
- `PathValidationError` -> `ERR_PATH_VALIDATION`
- `ResourceLimitError` -> `ERR_RESOURCE_LIMIT`
- `ComparisonError` -> `ERR_COMPARISON` (wraps `pixelmatch` errors and sets `cause`)

## Ports

### Synchronous Ports

- `ImageSourcePort` (default: `fsImageSource`)
- `DiffWriterPort` (default: `fsDiffWriter`)
- `ComparisonPorts`

### Asynchronous Ports

- `AsyncImageSourcePort` (default: `fsAsyncImageSource`)
- `AsyncDiffWriterPort` (default: `fsAsyncDiffWriter`)

## Package and Build Architecture

- `tsconfig.json` type-checks the entire repository (`src/`, `__tests__/`, `e2e/`, and config files) with `noEmit: true`.
- `tsconfig.prod.json` extends `tsconfig.json` and emits the package build from `src/` to `out/`.
- `npm run typecheck` checks the repository with `tsconfig.json`.
- `npm run build` compiles the package with `tsconfig.prod.json`.
- `package.json` exposes `"."`, `"./vitest"`, `"./jest"`, and `"./playwright"`.
- npm publishes only `out/`.
- `npm run codemap` generates `CODEMAP.md` from the source tree and `package.json`.

## Invariants for Maintainers

- Keep `comparePng.ts` for orchestration only.
- Keep comparison behavior identical between `comparePng` and `comparePngAsync`.
- Never downgrade security or resource-limit errors when `throwErrorOnInvalidInputData` is `false`.
- Never write a diff file when `mismatchedPixels === 0`.
- Validate all new public options in `resolveOptions`.
