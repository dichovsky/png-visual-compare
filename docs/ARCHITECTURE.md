# Architecture

This document describes the current internal architecture of `png-visual-compare` after the backlog refactor.

## System overview

The package is a small PNG comparison engine with:

- **Public sync API:** `comparePng(png1, png2, opts?)`
- **Public async API:** `comparePngAsync(png1, png2, opts?)`
- **Internal sync hook:** `comparePngWithPorts(...)` for orchestrator/port tests

The package accepts either absolute file paths or raw PNG `Buffer`s, normalizes both images to a comparable canvas, runs `pixelmatch`, and optionally writes a diff PNG.

## High-level flow

```text
comparePng / comparePngAsync
  -> resolveOptions
  -> loadSources / loadSourcesAsync
  -> normalizeImages
  -> runComparison
  -> persistDiff / async diff writer
```

## Public surface

### Runtime exports

- `comparePng`
- `comparePngAsync`
- `InvalidInputError`
- `PathValidationError`
- `ResourceLimitError`
- `DEFAULT_EXCLUDED_AREA_COLOR`
- `DEFAULT_EXTENDED_AREA_COLOR`
- `DEFAULT_MAX_DIMENSION`
- `DEFAULT_MAX_PIXELS`

### Public types

- `Area`
- `Color`
- `ComparePngOptions`
- `PixelmatchOptions`
- `LoadedPng`

## Module layout

| Area                  | Files                                                                                                                                  | Responsibility                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Public entrypoints    | `src/index.ts`, `src/comparePng.ts`, `src/comparePngAsync.ts`                                                                          | Package exports and sync/async orchestration                                   |
| Pipeline              | `src/pipeline/*`                                                                                                                       | Option resolution, source loading, normalization, comparison, diff persistence |
| Validation            | `src/validatePath.ts`, `src/validateArea.ts`, `src/validateColor.ts`, `src/validatePixelmatchOptions.ts`                               | Boundary validation for security and correctness                               |
| Image helpers         | `src/getPngData.ts`, `src/extendImage.ts`, `src/fillImageSizeDifference.ts`, `src/addColoredAreasToImage.ts`, `src/drawPixelOnBuff.ts` | PNG decoding and low-level image mutation                                      |
| Ports                 | `src/ports/*`                                                                                                                          | Sync/async filesystem adapters and internal test injection seams               |
| Types/defaults/errors | `src/types/*`, `src/defaults.ts`, `src/errors.ts`                                                                                      | Shared contracts and stable defaults                                           |
| Adapter boundary      | `src/adapters/toPixelmatchOptions.ts`                                                                                                  | Internal translation from public `PixelmatchOptions` to `pixelmatch`           |

## Sync architecture

`comparePng` is intentionally thin:

1. `resolveOptions(opts)` validates all public options and fills defaults.
2. `loadSources(png1, png2, options)` loads both inputs through the configured sync image source port.
3. `normalizeImages(sources, options)` clones/masks/extends images into a common canvas.
4. `runComparison(images, options)` enforces normalized-canvas limits and calls `pixelmatch`.
5. `persistDiff(result, options)` writes a diff only when mismatches exist and a valid output path was configured.

## Async architecture

`comparePngAsync` reuses the same option resolution, normalization, and comparison stages as sync mode. The only async-specific pieces are:

- `fsAsyncImageSource.load(...)`
- `fsAsyncDiffWriter.write(...)`

The async loader starts both source loads concurrently with `Promise.all(...)`, then returns the same `LoadedSources` shape used by the sync pipeline.

## Detailed pipeline stages

### 1. `resolveOptions`

`src/pipeline/resolveOptions.ts`

Responsibilities:

- applies defaults for colors and limits
- validates `excludedAreas`
- validates `pixelmatchOptions`
- validates `diffFilePath`
- validates `inputBaseDir` / `diffOutputBaseDir` types
- computes:
    - `shouldCreateDiffFile`
    - resolved/branded `diffFilePath`
    - validated numeric limits

This is the main **public input boundary** for options.

### 2. `loadSources`

`src/pipeline/loadSources.ts`

Loads both inputs via the selected `ImageSourcePort`:

- default sync implementation: `fsImageSource`
- default async implementation: `fsAsyncImageSource`

If both sides are invalid, the pipeline throws `InvalidInputError('Unknown PNG files input type')`.

### 3. `normalizeImages`

`src/pipeline/normalizeImages.ts`

Responsibilities:

- converts `LoadedPng` into comparable `PNGWithMetadata`
- clones valid decoded PNGs before mutation
- turns one-sided invalid inputs into comparable `0×0` canvases
- paints `excludedAreas` on both images
- extends both images to `max(width) × max(height)`
- paints padded regions with `extendedAreaColor`

Important invariant: normalization returns **new images** and does not mutate decoded source PNGs in place.

### 4. `runComparison`

`src/pipeline/runComparison.ts`

Responsibilities:

- enforces `maxPixels` on the normalized comparison canvas
- lazily allocates a diff image only when diff output is requested
- converts public `pixelmatchOptions` through `toPixelmatchOptions(...)`
- calls `pixelmatch(...)`

### 5. `persistDiff`

`src/pipeline/persistDiff.ts`

Writes the diff only when all of the following are true:

- mismatches exist
- `diffFilePath` was provided
- diff creation was requested
- a diff PNG was actually allocated

## Input loading model

`src/getPngData.ts`

`getPngData(...)` returns the discriminated union:

```ts
type LoadedPng = { kind: 'valid'; png: PNGWithMetadata } | { kind: 'invalid'; reason: 'path' | 'decode' | 'type' };
```

Key behavior:

- string paths go through `validatePath(..., 'input')`
- file-backed PNGs are pre-screened with IHDR dimension peeking before decode
- zero-dimension decoded PNGs are explicitly rejected
- malformed `Buffer`s are handled separately from malformed file paths
- `throwErrorOnInvalidInputData: false` downgrades ordinary invalid image inputs, but not security/resource-boundary failures

## Validation and security boundaries

### Path validation

`src/validatePath.ts`

The validator:

- rejects empty/whitespace-only paths
- rejects null bytes
- resolves absolute paths
- enforces lexical containment before filesystem access
- resolves symlinks for both input and output containment
- rejects:
    - symlink loops
    - existing output directories
    - existing output symlinks
- permits not-yet-created output parent directories by validating the nearest existing ancestor

### Area validation

`src/validateArea.ts`

`excludedAreas` must be:

- an array
- of non-null objects
- with finite integer coordinates
- with `x1 <= x2`
- with `y1 <= y2`

### Pixelmatch boundary

`src/validatePixelmatchOptions.ts`

The public wrapper owns runtime validation for:

- `threshold`
- `alpha`
- `includeAA`
- `diffMask`
- `aaColor`
- `diffColor`
- `diffColorAlt`

This prevents invalid data from leaking directly into the external `pixelmatch` API.

## Error model

`src/errors.ts`

Stable error classes:

- `InvalidInputError` → `ERR_INVALID_PNG_INPUT`
- `PathValidationError` → `ERR_PATH_VALIDATION`
- `ResourceLimitError` → `ERR_RESOURCE_LIMIT`

These are used consistently across sync and async flows.

## Ports and extension points

### Sync ports

- `ImageSourcePort`
- `DiffWriterPort`
- `ComparisonPorts`

Default implementations:

- `fsImageSource`
- `fsDiffWriter`

### Async ports

- `AsyncImageSourcePort`
- `AsyncDiffWriterPort`

Default implementations:

- `fsAsyncImageSource`
- `fsAsyncDiffWriter`

The ports isolate file I/O from orchestration so tests can validate decision logic without disk fixtures.

## Package/build architecture

- `tsconfig.json` is the repo-wide development config:
    - `noEmit: true`
    - includes repository TypeScript such as `src/`, `__tests__/`, `e2e/`, and root config files
    - includes DOM libs so browser-facing Playwright tests typecheck in editors and CI
- `tsconfig.prod.json` extends the dev config and restores emitted library build settings for `src/ -> out`
- `npm run typecheck` validates the full repository via `tsconfig.json`
- `npm run build` emits the published package via `tsconfig.prod.json`
- package export surface is only `"."`
- only `out/` is published to npm
- `npm run codemap` regenerates `CODEMAP.md` from the current source tree and package metadata

## Agent-relevant invariants

- `comparePng.ts` should stay orchestration-only
- sync and async APIs should preserve the same comparison semantics
- security/resource-limit failures must not be downgraded into fake success values
- diff output should never be written for zero mismatches
- new public option fields should be validated in `resolveOptions` before downstream use
