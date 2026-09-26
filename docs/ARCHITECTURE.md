# Architecture

This document describes the current internal architecture of `png-visual-compare` after the backlog refactor.

## System overview

The package is a small PNG comparison engine with:

- **Public sync API:** `comparePng(png1, png2, opts?)`
- **Public async API:** `comparePngAsync(png1, png2, opts?)`
- **Test-framework matchers:** `toMatchPngSnapshot()` via the `png-visual-compare/vitest`, `png-visual-compare/jest`, and `png-visual-compare/playwright` subpaths
- **Internal sync hook:** `comparePngWithPorts(...)` in `src/comparePngWithPorts.ts` for orchestrator/port tests — kept out of `comparePng.ts` so the public declarations never reference the port types

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
- `DEFAULT_MAX_FILE_BYTES`
- `DEFAULT_MAX_PIXELS`

### Public types

- `Area`
- `Color`
- `ComparePngOptions`
- `PixelmatchOptions`
- `LoadedPng` — deprecated alias of the internal type in `src/pipeline/types.ts`; removed in 8.0.0 (TYPE-06)

### Subpath exports

Each subpath adds a `toMatchPngSnapshot()` matcher for one test framework. All three validate the received PNG and the matcher arguments through `src/matchers/createPngSnapshotMatcher.ts` and compare with `comparePng`.

- `png-visual-compare/vitest` (`src/vitest.mts`): side-effect import. Registers the matcher on Vitest's `expect` and augments `Matchers<R, T>` (Vitest 5). Baselines are serialised Buffers in Vitest's `.snap` file. Optional peer: `vitest` `>=5.0.0 <6`.
- `png-visual-compare/jest` (`src/jest.ts`): side-effect import. Registers the matcher on Jest's global `expect` when present, exports `registerJestPngSnapshotMatcher`, and augments both global `jest.Matchers` and the imported `expect` matcher types. Baselines are serialised Buffers in Jest's `.snap` file. Optional peers: `jest` (`>=29 <31`) and `expect` (any version; used only for the type augmentation).
- `png-visual-compare/playwright` (`src/playwright.ts`): no side effects. Exports `expect` (Playwright's `expect` extended with a synchronous `toMatchPngSnapshot()`) and `pngMatchers`. Baselines are PNG files at `testInfo.snapshotPath(name)` (see `docs/adr/0001-playwright-baselines-as-png-files.md`). Optional peer: `@playwright/test` `>=1.60.0 <2`.

## Module layout

| Area                  | Files                                                                                                                                  | Responsibility                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Public entrypoints    | `src/index.ts`, `src/comparePng.ts`, `src/comparePngAsync.ts`                                                                          | Package exports and sync/async orchestration                                                    |
| Pipeline              | `src/pipeline/*`                                                                                                                       | Option resolution, source loading, normalization, comparison, diff persistence                  |
| Validation            | `src/validatePath.ts`, `src/validateArea.ts`, `src/validateColor.ts`, `src/validatePixelmatchOptions.ts`                               | Boundary validation for security and correctness                                                |
| Image helpers         | `src/getPngData.ts`, `src/extendImage.ts`, `src/fillImageSizeDifference.ts`, `src/addColoredAreasToImage.ts`, `src/drawPixelOnBuff.ts` | PNG decoding and low-level image mutation                                                       |
| Guarded file read     | `src/readValidatedFile.ts`                                                                                                             | Opens a file before validating it, so bytes provably come from the approved inode               |
| Internal helpers      | `src/internal/*`                                                                                                                       | `assertSameFile`, `secureMkdir`, `realDiffDirectory` — shared filesystem-safety primitives      |
| Ports                 | `src/ports/*`                                                                                                                          | Sync/async filesystem adapters and internal test injection seams                                |
| Vendored kernel       | `src/vendor/pixelmatch.ts`                                                                                                             | `pixelmatch` 7.2.0 as a TypeScript port (ISC), so the CommonJS build has no ESM-only dependency |
| Types/defaults/errors | `src/types/*`, `src/defaults.ts`, `src/errors.ts`                                                                                      | Shared contracts and stable defaults                                                            |
| Adapter boundary      | `src/adapters/toPixelmatchOptions.ts`                                                                                                  | Internal translation from public `PixelmatchOptions` to `pixelmatch`                            |
| Matchers              | `src/vitest.mts`, `src/jest.ts`, `src/playwright.ts`, `src/matchers/*`                                                                 | `toMatchPngSnapshot` adapters for the `./vitest`, `./jest`, `./playwright` subpaths             |

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

Loads both inputs via the selected `ImageSourcePort` (default: `fsImageSource`).

The async path does not use this module: `loadSourcesAsync`, private to `src/comparePngAsync.ts`, loads both inputs concurrently through `fsAsyncImageSource` (an `AsyncImageSourcePort`) and applies the same both-invalid check.

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
- all PNG sources are scanned for duplicate IHDR chunks before decode, so a later header cannot override the dimensions checked by the resource limits
- zero-dimension decoded PNGs are explicitly rejected
- malformed `Buffer`s are handled separately from malformed file paths
- `throwErrorOnInvalidInputData: false` downgrades ordinary invalid image inputs, but not security/resource-boundary failures

### Guarded file read

`src/readValidatedFile.ts`

`validatePath` walks a path and the subsequent `readFile` walks it again from scratch, so anything swapped in between is what actually gets read. Node exposes no `openat`, and `/proc/self/fd` is Linux-only, so the race cannot be _prevented_ portably. It is detected instead:

1. filesystem-free checks: `assertPathSyntax`, and when `inputBaseDir` is set, `assertLexicalContainment` — a path outside the boundary fails as containment before the open can reveal whether it exists (ENOENT vs `PathValidationError` would otherwise be an existence oracle) or block on a FIFO
2. `open` the lexically resolved path — the one validation approves — pinning one inode for the rest of the call. The raw string could name a different file when `..` follows a symlinked directory, because the kernel resolves `..` after the link
3. `fstat` the handle with `{ bigint: true }` for its size and identity
4. `validatePathWithReal` for the symlink-resolved containment check
5. when `inputBaseDir` is set, `assertSameFile` compares the handle's `dev`/`ino` against the canonical path containment approved
6. `maxFileBytes` is enforced against the stat size — **after** step 5, because its error names an exact byte count and escapes permissive mode, so checking earlier would disclose the size of a file outside the boundary
7. read from the handle, never from the path string again, holding `maxFileBytes` against the bytes actually read — the stat size is only a hint, understated by a file that grows mid-read, a FIFO, or a device

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

The module exposes four entry points:

- `assertPathSyntax(filePath)` — the filesystem-free checks (empty, whitespace-only, null byte). Split out so `readValidatedFile`, which must `open` before validating, can still reject a malformed path as a `PathValidationError` instead of letting the runtime raise its own `TypeError`.
- `assertLexicalContainment(filePath, baseDir)` — the filesystem-free half of the containment check, run by `readValidatedFile` before its `open`. It only ever rejects; approval still needs the symlink-resolved check, so it cannot be raced into letting anything through.
- `validatePathWithReal(...)` — returns `{ validated, real }`, where `real` is the canonical path the containment check was proven against.
- `validatePath(...)` — the original signature, a thin wrapper returning `.validated`.

> **Why `real` matters:** `validated` is the _lexically_ resolved path. Stat'ing it walks the same, possibly already-compromised, route a second time, so a symlink planted after validation would be followed by both walks and the two inodes would agree on the escaped file. Any caller proving an opened handle sits inside the boundary must compare against `real`.

> **Check ordering (SECU-11):** when `baseDir` is set, the lexical and realpath containment checks run **before** the output-mode symlink/directory shape checks. As a consequence, every out-of-bounds path surfaces as a uniform `Path traversal detected: …` error and never as `must not be an existing symlink/directory` — closing a filesystem-enumeration oracle for paths outside the security boundary.

### Diff write contract

`src/ports/fsDiffWriter.ts`, `src/ports/fsAsyncDiffWriter.ts`

The diff write:

- creates parent directories one component at a time via `secureMkdir`, refusing any component that is a symlink. `mkdir(..., { recursive: true })` follows symlinks in every intermediate component while `O_NOFOLLOW` guards only the final one, so a symlinked parent could redirect the whole write outside `diffOutputBaseDir` (SECU-09). A component another writer creates between the `lstat` and the `mkdir` is not an error — the `EEXIST` re-checks what was created, so concurrent writes into one new directory succeed while a symlink planted in that window is still refused. Without `diffOutputBaseDir` there is no boundary to protect and the recursive form is kept.
- resolves the parent chain with `realDiffDirectory` **before** opening, then opens inside that canonical directory. The path traversed at open time therefore contains no symlink at all: redirecting the write requires renaming a real directory in the resolved chain, not merely planting a link.
- opens the target once with `O_WRONLY | O_CREAT | O_NOFOLLOW`, creating a new file or opening an existing file without truncation. A live or dangling symlink at the target fails with `ELOOP`, mapped to `PathValidationError` (SECU-03).
- closes the handle on failure without unlinking the target path. Even after a successful identity check, another writer can replace that path before cleanup. Node has no atomic unlink-by-inode operation, so preserving replacement files takes precedence over removing failed output. A detected parent swap can leave an empty owner-only file at the redirected location outside `diffOutputBaseDir`, with no diff bytes written. A later write failure can leave partial output at the verified destination.
- re-resolves the parent chain with `realDiffDirectory` **after** the open, in both writers, and ties the handle to the file inside it with `assertSameFile`. Stat'ing the pre-open canonical path instead would walk a route swapped since and agree with itself.
- defers truncation: `O_TRUNC` is absent from the open, and `ftruncate(0)` runs only once `assertSameFile` has tied the handle to the canonical target. Truncating on open would empty an escaped target before anything could detect it.
- passes an explicit POSIX create-mode `0o600` to `open` and then issues an explicit `fchmod(0o600)` on the open handle (SECU-12). The `open` mode alone is insufficient: POSIX masks it with `~umask` (a restrictive umask can only narrow it further, never widen it) and truncation does not reset the mode of a pre-existing file. The post-open `fchmod` makes the final mode `0o600` in both the create and overwrite cases.

### Area validation

`src/validateArea.ts`

`excludedAreas` must be:

- an array
- of non-null objects
- with finite integer coordinates
- with non-negative coordinates
- with `x1 <= x2`
- with `y1 <= y2`

### Pixelmatch boundary

`src/validatePixelmatchOptions.ts`

The public wrapper owns runtime validation for:

- `threshold`
- `alpha`
- `includeAA`
- `diffMask`
- `checkerboard`
- `aaColor`
- `diffColor`
- `diffColorAlt`

This prevents invalid data from leaking directly into the `pixelmatch` kernel.

`pixelmatch` itself is vendored as `src/vendor/pixelmatch.ts`, a line-for-line TypeScript port of 7.2.0 kept under its ISC notice. The CommonJS build used to `require()` the ESM-only upstream package, which Jest's module loader and Vitest's vm pools on Node.js 22 cannot load (RELI-11). `__tests__/vendor/pixelmatch.test.ts` checks the port against upstream, kept as a devDependency: mismatch counts and diff bytes across the fixtures and every option, error messages, and the exact colour-delta threshold boundary. A failure there after an upstream bump means the port needs re-syncing.

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
- package export surface is `"."` plus the `"./vitest"`, `"./jest"`, and `"./playwright"` matcher subpaths (`sideEffects` lists `./out/vitest.mjs` and `./out/jest.js`; the Playwright entry has none)
- only `out/` is published to npm
- `npm run codemap` regenerates `CODEMAP.md` from the current source tree and package metadata

## Agent-relevant invariants

- `comparePng.ts` should stay orchestration-only
- sync and async APIs should preserve the same comparison semantics
- security/resource-limit failures must not be downgraded into fake success values
- diff output should never be written for zero mismatches
- new public option fields should be validated in `resolveOptions` before downstream use
