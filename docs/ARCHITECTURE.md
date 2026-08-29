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
- `ComparisonError`
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

| Area                  | Files                                                                                                                                  | Responsibility                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Public entrypoints    | `src/index.ts`, `src/comparePng.ts`, `src/comparePngAsync.ts`                                                                          | Package exports and sync/async orchestration                                               |
| Pipeline              | `src/pipeline/*`                                                                                                                       | Option resolution, source loading, normalization, comparison, diff persistence             |
| Validation            | `src/validatePath.ts`, `src/validateArea.ts`, `src/validateColor.ts`, `src/validatePixelmatchOptions.ts`                               | Boundary validation for security and correctness                                           |
| Image helpers         | `src/getPngData.ts`, `src/extendImage.ts`, `src/fillImageSizeDifference.ts`, `src/addColoredAreasToImage.ts`, `src/drawPixelOnBuff.ts` | PNG decoding and low-level image mutation                                                  |
| Guarded file read     | `src/readValidatedFile.ts`                                                                                                             | Opens a file before validating it, so bytes provably come from the approved inode          |
| Internal helpers      | `src/internal/*`                                                                                                                       | `assertSameFile`, `secureMkdir`, `realDiffDirectory` — shared filesystem-safety primitives |
| Ports                 | `src/ports/*`                                                                                                                          | Sync/async filesystem adapters and internal test injection seams                           |
| Types/defaults/errors | `src/types/*`, `src/defaults.ts`, `src/errors.ts`                                                                                      | Shared contracts and stable defaults                                                       |
| Adapter boundary      | `src/adapters/toPixelmatchOptions.ts`                                                                                                  | Internal translation from public `PixelmatchOptions` to `pixelmatch`                       |

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
    - validated numeric limits (`maxDimension`, `maxPixels`, `maxFileBytes`)

This is the main **public input boundary** for options.

### 2. `loadSources`

`src/pipeline/loadSources.ts`

Loads both inputs via the selected `ImageSourcePort`:

- default sync implementation: `fsImageSource`
- default async implementation: `fsAsyncImageSource`

If both sides are invalid, the pipeline throws `InvalidInputError` with a message naming each input's failure reason (e.g. `Both PNG inputs are invalid — png1: could not decode PNG content; png2: source path could not be loaded.`).

### 3. `normalizeImages`

`src/pipeline/normalizeImages.ts`

Responsibilities:

- converts `LoadedPng` into comparable `PNGWithMetadata`
- clones valid decoded PNGs before mutation
- turns one-sided invalid inputs into comparable `0×0` canvases
- enforces `maxPixels` on the normalized comparison canvas (SECU-10), **before** any extension allocates oversized buffers
- extends both images to `max(width) × max(height)`
- paints padded regions with `extendedAreaColor`
- paints `excludedAreas` on both images **last**, on the final canvas, so they always match regardless of content — including regions added by size extension

Important invariant: normalization returns **new images** and does not mutate decoded source PNGs in place.

### 4. `runComparison`

`src/pipeline/runComparison.ts`

Responsibilities:

- lazily allocates a diff image only when diff output is requested
- converts public `pixelmatchOptions` through `toPixelmatchOptions(...)`
- calls `pixelmatch(...)`
- wraps any throw from `pixelmatch` in a `ComparisonError` (RELI-10), preserving the original failure on the standard `cause` property

> The normalized-canvas `maxPixels` guard lives in `normalizeImages` (SECU-10), not here — the check must fire **before** `extendImage` allocates its target buffers.

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

- string paths are read through `readValidatedFileSync` / `readValidatedFile` (see below), never with a bare `readFile`
- file-backed PNGs are capped by `maxFileBytes` before any bytes are read, then pre-screened with IHDR dimension peeking before decode
- zero-dimension decoded PNGs are explicitly rejected
- malformed `Buffer`s are handled separately from malformed file paths
- `throwErrorOnInvalidInputData: false` downgrades ordinary invalid image inputs, but not security/resource-boundary failures

### Guarded file read

`src/readValidatedFile.ts`

`validatePath` walks a path and the subsequent `readFile` walks it again from scratch, so anything swapped in between is what actually gets read. Node exposes no `openat`, and `/proc/self/fd` is Linux-only, so the race cannot be _prevented_ portably. It is detected instead:

1. `open` first, pinning one inode for the rest of the call
2. `fstat` the handle with `{ bigint: true }` for its size and identity
3. `validatePathWithReal` for containment
4. when `inputBaseDir` is set, `assertSameFile` compares the handle's `dev`/`ino` against the canonical path containment approved
5. `maxFileBytes` is enforced — **after** step 4, because its error names an exact byte count and escapes permissive mode, so checking earlier would disclose the size and existence of a file outside the boundary
6. read from the handle, never from the path string again

The identity check is skipped without `inputBaseDir`: `validatePath` consults no filesystem in that case, so there is no boundary a swap could cross, and running it anyway would expose every default caller to a false positive whenever a baseline is replaced by atomic rename.

`assertSameFile` refuses a zero `ino` rather than treating it as a match — some network mounts report no file identity, and two zeroes would otherwise compare equal and silently disable the check.

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

The module exposes three entry points:

- `assertPathSyntax(filePath)` — the filesystem-free checks (empty, whitespace-only, null byte). Split out so `readValidatedFile`, which must `open` before validating, can still reject a malformed path as a `PathValidationError` instead of letting the runtime raise its own `TypeError`.
- `validatePathWithReal(...)` — returns `{ validated, real }`, where `real` is the canonical path the containment check was proven against.
- `validatePath(...)` — the original signature, a thin wrapper returning `.validated`.

> **Why `real` matters:** `validated` is the _lexically_ resolved path. Stat'ing it walks the same, possibly already-compromised, route a second time, so a symlink planted after validation would be followed by both walks and the two inodes would agree on the escaped file. Any caller proving an opened handle sits inside the boundary must compare against `real`.

> **Check ordering (SECU-11):** when `baseDir` is set, the lexical and realpath containment checks run **before** the output-mode symlink/directory shape checks. As a consequence, every out-of-bounds path surfaces as a uniform `Path traversal detected: …` error and never as `must not be an existing symlink/directory` — closing a filesystem-enumeration oracle for paths outside the security boundary.

### Diff write contract

`src/ports/fsDiffWriter.ts`, `src/ports/fsAsyncDiffWriter.ts`

The diff write:

- creates parent directories one component at a time via `secureMkdir`, refusing any component that is a symlink. `mkdir(..., { recursive: true })` follows symlinks in every intermediate component while `O_NOFOLLOW` guards only the final one, so a symlinked parent could redirect the whole write outside `diffOutputBaseDir` (SECU-09). Without `diffOutputBaseDir` there is no boundary to protect and the recursive form is kept.
- resolves the parent chain with `realDiffDirectory` **before** opening, then opens inside that canonical directory. The path traversed at open time therefore contains no symlink at all: redirecting the write requires renaming a real directory in the resolved chain, not merely planting a link.
- opens the target with `O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW`, falling back to a reopen without `O_CREAT` on `EEXIST` (target-component symlink race closed by SECU-03; a symlink reports `EEXIST` under `O_EXCL` and then surfaces as `ELOOP` on the reopen). `O_EXCL` also establishes whether _this_ call created the file, which plain `O_CREAT` cannot — so cleanup after a refused write removes only a file it created, never a pre-existing empty placeholder.
- defers truncation: `O_TRUNC` is absent from the open, and `ftruncate(0)` runs only once `assertSameFile` has tied the handle to the canonical target. Truncating on open would empty an escaped target before anything could detect it.
- passes an explicit POSIX create-mode `0o600` to `open` and then issues an explicit `fchmod(0o600)` on the open handle (SECU-12). The `open` mode alone is insufficient: POSIX masks it with `~umask` (a restrictive umask can only narrow it further, never widen it) and truncation does not reset the mode of a pre-existing file. The post-open `fchmod` makes the final mode `0o600` in both the create and overwrite cases.

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
- `ComparisonError` → `ERR_COMPARISON` (wraps `pixelmatch` failures; preserves the underlying error on `cause`)

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
