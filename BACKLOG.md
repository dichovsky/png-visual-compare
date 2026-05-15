# Backlog

Atomic, testable follow-up items from the architecture-focused review.

> **AI-Agent Refinement Notice**
> This backlog has been refined for execution by an AI coding agent. Each item now includes:
> exact files to create/modify, prescribed function signatures and type shapes,
> pre-decided policies (no open design questions), explicit test case descriptions,
> and a dependency ordering table at the end.
> Items that are not yet agent-ready are marked **BLOCKED** or **SPIKE**.

> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current shipped architecture (post-refactor state).

---

## Executive Summary (2026-05-12 audit)

**Repository health: strong.** The library is small (~1,730 LOC across `src/`), tightly scoped, fully typed, 100 % covered (485 statements / 383 branches / 85 funcs / 469 lines via v8), lint-clean, build-clean, `npm audit`-clean across 192 transitive deps, license-clean across the prod tree, all direct deps at their latest published versions, and all 314 unit + e2e tests passing on the audit run. The Wave-1 architecture refactor (pipeline split, async API, ports/adapters, structured errors, branded `ValidatedPath`, discriminated `LoadedPng` union, symlink-safe `validatePath`, decoded-size + pixel-count limits) has shipped and is reflected in `docs/ARCHITECTURE.md`.

**Reconciliation status (15 original items → 18 trackable units):**

- **15 Done** — all P0/P1 architecture, type-safety, security, and reliability items from the original review have shipped: `ARCH-01`, `TYPE-01`, `TYPE-02`, `TYPE-03`, `PERF-01`, `SECU-01`, `SECU-02`, `RELI-01`, `RELI-02`, `RELI-03`, `RELI-04`, `API-01` (a/b/c/d), `TEST-01` (a/b).
- **3 Open** — all gated on a human-only benchmarking spike that has not been performed: `PERF-02` (parent + `PERF-02a` Spike + `PERF-02b` Story), `PERF-03`.
- **0 In Progress / 0 Won't Do / 0 Superseded.**

**New findings from this audit (62 items, all `Open`):**

| Prefix    | P0    | P1    | P2     | P3     | Total  | Theme                                                                              |
| --------- | ----- | ----- | ------ | ------ | ------ | ---------------------------------------------------------------------------------- |
| SECU      | 0     | 1     | 3      | 2      | 6      | TOCTOU on diff write, file-size pre-cap, decoder-bomb threat model                 |
| PERF      | 0     | 0     | 2      | 2      | 4      | Eager clone, snapshot inflation, padding double-write                              |
| ARCH      | 0     | 0     | 2      | 4      | 6      | Decoder/loader split, async port-injection seam, runtime-vs-config separation      |
| TYPE      | 0     | 0     | 2      | 4      | 6      | Mutable public fields, port-export ambiguity, narrowing public surface             |
| RELI      | 0     | 0     | 0      | 6      | 6      | Async unhandled-rejection, error normalization, validation ordering                |
| API       | 0     | 0     | 1      | 3      | 4      | `AbortSignal`, in-memory diff buffer, URL paths, verbose result                    |
| TEST      | 0     | 0     | 2      | 4      | 6      | Bench suite, packed-artifact integration test, mutation, fuzz, type-level, tool JS |
| DOC       | 0     | 0     | 2      | 3      | 5      | Stale RELI-03 frontmatter, missing SECURITY.md, agent-guide drift                  |
| BUILD     | 0     | 0     | 0      | 6      | 6      | tsconfig hygiene, exports map, SBOM, strip-internal                                |
| DEPS      | 0     | 0     | 0      | 3      | 3      | `@types/pngjs` lag, Docker not in Dependabot, peer-dep upper bounds                |
| DX        | 0     | 0     | 0      | 5      | 5      | Inline node `-e` script, watch-mode, fast-path test, `.editorconfig`, pre-commit   |
| CI        | 0     | 0     | 0      | 5      | 5      | PR trigger, CodeQL, dep-review, codecov, SHA-pinning `publish.yml`                 |
| **Total** | **0** | **1** | **14** | **47** | **62** |                                                                                    |

**Top 5 themes worth acting on first:**

1. **TOCTOU window on diff-output writes** (`SECU-03`, **P1**) — the only new P1. `validatePath` rejects existing symlinks at the target, but the subsequent `writeFile` follows symlinks, leaving a small race window. Closing it with `O_EXCL` (`flag: 'wx'`) is a small surgical change with a clear behavioral contract shift documented in TSDoc.
2. **Pre-decode resource caps** (`SECU-04`, `SECU-05`, `SECU-06`) — the current `maxDimension` / `maxPixels` checks fire _after_ the file is fully read into memory. `maxFileBytes` + handle-based reads close that gap and let the README codify a precise security model.
3. **Test infrastructure for perf claims and shipped artifacts** (`TEST-02`, `TEST-03`) — the existing PERF-02 / PERF-03 spike items have no objective acceptance gate without a bench suite; the published `out/` bundle is never exercised end-to-end. Both are infrastructure investments that pay off across multiple subsequent items.
4. **Public-API ergonomics asymmetries** (`ARCH-03`, `TYPE-05`, `API-02`, `API-03`, `API-05`) — sync API has port injection but async doesn't; ports exist but aren't exported; no `AbortSignal`; diff bytes only via disk; return is a bare `number`. Each is small; together they polish the public surface.
5. **Documentation hygiene around RELI-03 and the security model** (`DOC-01`, `DOC-02`, `SECU-06`) — the file you're reading contains stale guidance about RELI-03 being pending; there is no SECURITY.md; the README has no consolidated security model section.

**Action plan:** the Execution Order table at the bottom of this file slots the new P0/P1 work into Sprint 7. P2 items are best picked up by theme (security cluster, then perf cluster, then ergonomics cluster). P3 items can be batched into polish sprints or addressed opportunistically alongside related P0/P1/P2 work.

---

## Cross-Cutting Agent Conventions

The following rules apply to every item unless the item explicitly overrides them:

- **Imports within `src/`** use extensionless relative paths: `import { foo } from './foo'`
- **Tests import from `../src`**, never from `../out`
- **One type per file** in `src/types/`; collected by `src/types/index.ts`
- **Data-driven test pattern**: new test cases are added to `testDataArray` in the relevant test file, not as standalone `test()` calls
- **No test helper modules** — each test file is self-contained
- **Coverage thresholds** (enforced by vitest): 100 % lines/functions/statements/branches
- **New production dependencies** require advisory database review and license approval (`ISC`, `MIT`, `BSD`, `Apache-2.0`, `Unlicense`)
- **Structured errors** (`RELI-03`, shipped): always throw `InvalidInputError` / `PathValidationError` / `ResourceLimitError` from `src/errors.ts`. Keep `TypeError` only for API-misuse paths where the caller passed a value of the wrong shape. (See `DOC-01` for the staleness sweep that retired the original "until that item lands" phrasing.)

## [ARCH-01] Split `comparePng` into an explicit comparison pipeline

**Priority:** P0  
**Status:** Done  
**Requires:** nothing  
**Problem:** `src/comparePng.ts` currently mixes option parsing, validation, security checks, image loading, in-place normalization, comparison, and diff persistence in one orchestration function.

**Technical rationale:** This is the main maintainability hotspot in the library. Every new feature now requires editing the same function, which increases coupling and makes it hard to add async I/O, alternative sources, or new normalization stages without regression risk.

**Files to modify:**

- `src/comparePng.ts` — reduce to thin orchestrator (≤ 30 lines after refactor)

**New files to create:**

- `src/pipeline/types.ts` — `ComparisonContext` and nested types
- `src/pipeline/resolveOptions.ts`
- `src/pipeline/loadSources.ts`
- `src/pipeline/normalizeImages.ts`
- `src/pipeline/runComparison.ts`
- `src/pipeline/persistDiff.ts`

**Prescribed `ComparisonContext` shape** (define in `src/pipeline/types.ts`):

```ts
type ComparisonContext = {
    readonly options: ResolvedOptions;
    readonly sources: LoadedSources;
    readonly normalized: NormalizedImages;
    readonly result: ComparisonResult;
};
```

Each nested type is defined by the agent in the same file.

**Prescribed stage function signatures:**

```ts
resolveOptions(raw: ComparePngOptions | undefined): ResolvedOptions
loadSources(png1: string | Buffer, png2: string | Buffer, opts: ResolvedOptions): LoadedSources
normalizeImages(sources: LoadedSources, opts: ResolvedOptions): NormalizedImages
runComparison(images: NormalizedImages, opts: ResolvedOptions): ComparisonResult
persistDiff(result: ComparisonResult, opts: ResolvedOptions): void
```

**Constraint:** `normalizeImages` must return new objects — it must not mutate its inputs (resolves the mutable `pngData.png =` reassignment on the current line 111).

**Tests:**

- `__tests__/comparePng.test.ts` — no new tests; all existing tests must pass unchanged
- New `__tests__/pipeline/` directory — one `describe` block per stage, each with ≥ 1 unit test using in-memory `Buffer`s and no file fixtures

**Acceptance criteria:**

- `comparePng.ts` contains ≤ 30 lines (orchestration only)
- Each stage is unit-testable in isolation without file fixtures
- Adding a new normalization step requires editing only the wiring in `comparePng.ts`

## [TYPE-01] Replace `PngData` sentinel state with a discriminated result union

**Priority:** P0  
**Status:** Done  
**Requires:** ARCH-01 (so `normalizeImages` owns mutation and the union can be immutable)  
**Problem:** `src/getPngData.ts` returns `{ isValid: false, png: 0×0 PNG }` for invalid inputs, and `src/comparePng.ts` later reinterprets that sentinel.

**Technical rationale:** The current model encodes failure as fake success data. That weakens invariants, forces cross-function coordination through conventions, and makes it easy to accidentally process an invalid image as if it were real.

**Prescribed union** (replace existing `PngData` in `src/types/png.data.ts`):

```ts
export type LoadedPng =
    | { readonly kind: 'valid'; readonly png: PNGWithMetadata }
    | { readonly kind: 'invalid'; readonly reason: 'path' | 'decode' | 'type' };
```

**Files to modify:**

- `src/types/png.data.ts` — replace `PngData` with `LoadedPng`
- `src/types/index.ts` — remove `PngData` export, add `LoadedPng` export
- `src/index.ts` — remove `PngData` from public barrel (**BREAKING — semver-major**)
- `src/getPngData.ts` — return `LoadedPng` instead of `PngData`
- `src/pipeline/loadSources.ts` (after ARCH-01) or `src/comparePng.ts` — branch on `kind: 'valid' | 'invalid'`
- `__tests__/getPngData.test.ts` — update all assertions to use `.kind === 'valid' | 'invalid'`
- `__tests__/comparePng.exceptions.test.ts` — update any assertions checking `isValid`
- `CHANGELOG.md` — add a semver-major release note documenting removal of `PngData`

**Banned pattern** (agent must not produce this):

```
// DO NOT add a PngData alias or isValid shim for backward compat
```

**Acceptance criteria:**

- No internal code depends on a fake `0×0` PNG to represent failure
- Exhaustive `switch`/narrowing is used when handling load results
- Public API no longer exports `PngData`

## [TYPE-02] Introduce branded internal types for validated paths

**Priority:** P1  
**Status:** Done  
**Requires:** nothing  
**Problem:** `validatePath` returns a plain `string`, so the type system does not retain the fact that a path has already passed validation and containment checks.

**Technical rationale:** This leaves security-sensitive flow control entirely to developer discipline. As the codebase grows, it becomes easier to accidentally use raw caller-controlled strings in file I/O instead of validated paths.

**New file to create:** `src/types/validated-path.ts`

```ts
declare const __validatedPath: unique symbol;
export type ValidatedPath = string & { readonly [__validatedPath]: never };
```

**Files to modify:**

- `src/validatePath.ts` — return type changes from `string` to `ValidatedPath`
- `src/getPngData.ts` — `resolvedPath: ValidatedPath` (no cast needed after `validatePath` returns it)
- `src/comparePng.ts` — `validatedDiffFilePath: ValidatedPath | undefined`

**Do NOT** export `ValidatedPath` from `src/index.ts` — it is an internal implementation detail.

**Test additions in `__tests__/comparePng.exceptions.test.ts`:**

- `"validatePath result is accepted by getPngData without cast"` (compile-time only; add `@ts-expect-error` to prove raw string is rejected)

**Acceptance criteria:**

- Raw strings cannot be passed to validated-path-only internals without an explicit validation step
- The public API remains ergonomic and backward compatible

## [PERF-01] Allocate the diff image lazily

**Priority:** P0  
**Status:** Done  
**Requires:** nothing  
**Problem:** `src/comparePng.ts` creates `new PNG({ width: maxWidth, height: maxHeight })` unconditionally, even when `diffFilePath` is not provided.

**Technical rationale:** This doubles memory pressure for the common "compare only" case and becomes expensive on large images. It is a concrete, immediate inefficiency with no upside.

**File to modify:** `src/comparePng.ts`

**Exact change:**

```ts
// REMOVE:
const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });

// REPLACE WITH:
const diff: PNG | undefined = shouldCreateDiffFile ? new PNG({ width: maxWidth, height: maxHeight }) : undefined;

// UPDATE pixelmatch call — third argument:
// BEFORE: shouldCreateDiffFile ? diff.data : undefined
// AFTER:  diff?.data
```

**Test to add in `__tests__/comparePng.test.ts`** (add to `testDataArray`):

- Name: `'compare-only mode does not write a diff file'`
    - Create two identical `2×2` PNG buffers using `pngjs`
    - Call `comparePng(buf1, buf2, { diffFilePath: '/tmp/should-not-exist.png' })`
    - Assert the file was NOT created (`fs.existsSync`)
    - Assert return value is `0`

**Acceptance criteria:**

- No diff PNG allocation occurs when `opts.diffFilePath` is absent
- Existing compare-only behavior is unchanged
- A test fails if a future refactor reintroduces unconditional diff allocation

## [SECU-01] Make path containment checks symlink-safe

**Priority:** P0  
**Status:** Done  
**Requires:** nothing  
**Problem:** `src/validatePath.ts` explicitly documents that containment is lexical only and does not resolve symlinks.

**Technical rationale:** `inputBaseDir` and `diffOutputBaseDir` are positioned as security boundaries, but a symlink inside the allowed directory can still escape to an arbitrary target. That leaves a real file-read/file-write escape path in server-side usage.

**File to modify:** `src/validatePath.ts`

**Exact algorithm** (replace the current containment block when `baseDir` is provided):

1. Resolve `baseDir` via `fs.realpathSync.native(resolve(baseDir))`.
   If it throws (base dir doesn't exist): re-throw as
   `new Error('Path validation failed: base directory does not exist or is not accessible')`
2. For **input** paths (reading): resolve target via `fs.realpathSync.native(resolved)`.
   If it throws and `throwErrorOnInvalidInputData` is `true`, throw as currently.
3. For **output** paths (`diffFilePath`): the leaf file may not exist yet.
   Resolve the parent directory: `fs.realpathSync.native(parse(resolved).dir)`.
   Re-append the original filename after resolving the parent. Check containment against the real parent.
4. Circular symlinks (`ELOOP`): catch and throw
   `new Error('Path validation failed: symlink loop detected')`

Note on Windows: `realpathSync.native` returns UNC-prefixed paths (`\\?\`) for long paths; `path.relative` handles UNC correctly — no special-casing needed.

**New test file:** `__tests__/validatePath.symlinks.test.ts`

Required test cases (agent must implement all):

- Symlink inside `baseDir` pointing to a file **outside** `baseDir` → rejected
- Symlink inside `baseDir` pointing to a file **inside** `baseDir` → accepted
- Lexical traversal (`../../etc`) → rejected (regression test)
- Normal path inside `baseDir` → accepted (regression)
- Output path: symlink in parent dir pointing outside `baseDir` → rejected
- Circular symlink → rejected with ELOOP message

Use `fs.symlinkSync` in `beforeEach`, clean up in `afterEach`.
Add `if (process.platform === 'win32') return;` at the top of each test with a TODO comment for Windows symlink coverage.

**Acceptance criteria:**

- Symlink-based escapes are rejected for both read and write paths
- Existing valid non-symlink paths continue to work
- Tests cover lexical traversal and symlink traversal separately

## [SECU-02] Add decoded-size limits, not just axis limits

**Priority:** P0  
**Status:** Done  
**Requires:** nothing  
**Problem:** `maxDimension` guards width and height independently, but still allows images up to `16384 × 16384`, implying roughly 1 GiB of decoded RGBA data before intermediate buffers.

**Technical rationale:** The current DoS protection is incomplete. A crafted image can stay within the per-axis cap while still forcing excessive allocation during decode, extension, or diff creation.

**New option to add to `ComparePngOptions`** (in `src/types/compare.options.ts`):

```ts
/**
 * Maximum total pixel count (width × height) for a single input image after decoding,
 * and for the normalized comparison canvas (max(w1,w2) × max(h1,h2)).
 * Set to Infinity to disable.
 * @default 16_777_216  (4096 × 4096 = ~64 MB RGBA)
 */
maxPixels?: number;
```

**New constant** (add to `src/comparePng.ts`):

```ts
export const DEFAULT_MAX_PIXELS = 16_777_216; // 4096 × 4096
```

**Two enforcement points** (both required):

1. In `getPngData` (or `assertDimensions`): after `peekPngDimensions`, before `PNG.sync.read`:

    ```ts
    if (dims.width * dims.height > maxPixels)
        throw new Error(
            `Image pixel count (${dims.width * dims.height}) exceeds the maximum allowed ${maxPixels} pixels. Set opts.maxPixels to increase the limit.`,
        );
    ```

2. In `comparePng.ts`, after `maxWidth`/`maxHeight` are computed, before diff allocation:
    ```ts
    if (maxWidth * maxHeight > maxPixels)
        throw new Error(
            `Normalized canvas pixel count (${maxWidth * maxHeight}) exceeds the maximum allowed ${maxPixels} pixels. Set opts.maxPixels to increase the limit.`,
        );
    ```

**Files to modify:**

- `src/types/compare.options.ts` — add `maxPixels` option
- `src/comparePng.ts` — add `DEFAULT_MAX_PIXELS`, validate option, add combined-canvas check
- `src/getPngData.ts` — pass `maxPixels` to `assertDimensions`, add pixel-count check

**Test additions in `__tests__/comparePng.exceptions.test.ts`:**

- `"rejects image with dimension within maxDimension but pixel count exceeding maxPixels"` — create a `200×200` image, set `maxPixels: 100`, expect throw
- `"rejects normalized canvas that exceeds maxPixels even when individual images do not"` — `200×1` actual + `1×200` expected, `maxPixels: 100`, expect throw on canvas check
- `"accepts image at exactly maxPixels"` — `100×100` with `maxPixels: 10000`

**Acceptance criteria:**

- Oversized images are rejected based on total decoded size, not only per-axis size
- Tests cover "allowed by maxDimension, rejected by maxPixels"
- `maxPixels` is documented in `ComparePngOptions` TSDoc

## [RELI-01] Validate `excludedAreas` at runtime

**Priority:** P1  
**Status:** Done  
**Requires:** RELI-03 preferred (use structured errors); acceptable to use plain `Error` with TODO comment until RELI-03 lands  
**Problem:** `src/addColoredAreasToImage.ts` assumes area coordinates are finite integers with a valid ordering, but `ComparePngOptions` accepts unchecked `number` fields.

**Technical rationale:** Floats, `NaN`, `Infinity`, or reversed coordinates can silently produce partial writes, no-ops, or non-index buffer property writes. This is a correctness bug disguised as permissive input handling.

**Pre-decided policy:** Reversed coordinates (`x1 > x2` or `y1 > y2`) are **rejected with an error** — not silently normalized. This is consistent with the fail-fast posture of the rest of the library and avoids masking caller bugs.

**New file:** `src/validateArea.ts`

```ts
export function validateArea(area: Area, index: number): void;
```

Validation rules (agent must implement all):

- `x1`, `y1`, `x2`, `y2` must all be `Number.isFinite`
- `x1`, `y1`, `x2`, `y2` must all be integers (`Math.round(v) === v`)
- `x1 <= x2`, else throw with message `` `excludedAreas[${index}]: x1 must be <= x2` ``
- `y1 <= y2`, else throw with message `` `excludedAreas[${index}]: y1 must be <= y2` ``
- On NaN/Infinity/float: throw with message `` `excludedAreas[${index}]: coordinates must be finite integers` ``

**File to modify:** `src/comparePng.ts`  
In the `excludedAreas` processing block, add before `addColoredAreasToImage`:

```ts
excludedAreas.forEach((area, i) => validateArea(area, i));
```

**Update `src/types/area.ts` TSDoc:**
Add: _"All coordinates must be finite integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized."_

**Test additions in `__tests__/comparePng.exceptions.test.ts`:**

- Float coordinate (`x1: 1.5`) → throw
- NaN coordinate → throw
- Infinity coordinate → throw
- Reversed x (`x1: 10, x2: 5`) → throw with message `excludedAreas[0]: x1 must be <= x2`
- Reversed y (`y1: 10, y2: 5`) → throw with message `excludedAreas[0]: y1 must be <= y2`
- Valid area `{x1:0, y1:0, x2:10, y2:10}` → no throw (regression)

**Acceptance criteria:**

- Invalid area coordinates throw deterministic errors before image mutation
- Valid areas keep existing inclusive-boundary behavior
- Reversed-coordinate behavior is documented and tested

## [RELI-02] Validate and normalize `pixelmatchOptions` at the boundary

**Priority:** P1  
**Status:** Done  
**Requires:** RELI-03 preferred; acceptable to use plain `Error` with TODO comment  
**Problem:** `src/comparePng.ts` forwards `opts.pixelmatchOptions` directly to `pixelmatch` without any runtime validation.

**Technical rationale:** This makes caller errors depend on downstream library behavior and weakens the package's API contract. It also creates version-coupling pressure because the wrapper does not own its boundary.

**New file:** `src/validatePixelmatchOptions.ts`

```ts
export function validatePixelmatchOptions(opts: PixelmatchOptions): void;
```

Validation rules (agent must implement all):

- `threshold`: if defined, must be a `number` in `[0, 1]` inclusive
- `alpha`: if defined, must be a `number` in `[0, 1]` inclusive
- `aaColor`: if defined, must be a tuple of exactly 3 integers each in `[0, 255]`
- `diffColor`: same rules as `aaColor`
- `diffColorAlt`: same rules as `aaColor`
- `includeAA`: if defined, must be `boolean`
- `diffMask`: if defined, must be `boolean`

Include a private tuple helper:

```ts
function validateColorTuple(name: string, value: unknown): void {
    if (!Array.isArray(value) || value.length !== 3) throw new Error(`${name} must be a tuple of 3 integers in [0, 255]`);
    for (const ch of value) {
        if (!Number.isInteger(ch) || ch < 0 || ch > 255) throw new Error(`${name} channel values must be integers in [0, 255]`);
    }
}
```

**File to modify:** `src/comparePng.ts`  
After existing `validateColor` calls in the options-parsing block, add:

```ts
if (opts?.pixelmatchOptions) validatePixelmatchOptions(opts.pixelmatchOptions);
```

**Test additions in `__tests__/comparePng.pixelmatch-options.test.ts`:**

- `threshold: -0.1` → throw
- `threshold: 1.1` → throw
- `threshold: 0.5` → no throw
- `alpha: 1.5` → throw
- `aaColor: [255, 0]` (length 2) → throw
- `aaColor: [255, 0, 300]` (channel > 255) → throw
- `aaColor: [255, 0, 0]` → no throw
- `diffColor: [0, 0, -1]` → throw

**Acceptance criteria:**

- Invalid `pixelmatchOptions` fail with library-owned error messages
- Valid options still reach `pixelmatch` unchanged semantically
- Tests cover out-of-range numbers and malformed color tuples

## [TYPE-03] Decouple public option types from `pixelmatch`

**Priority:** P1  
**Status:** Done  
**Requires:** RELI-02 (adapter already exists; TYPE-03 formalizes it — implement immediately after RELI-02)  
**Problem:** `src/types/compare.options.ts` mirrors `pixelmatch` options directly, making the public API structurally dependent on a third-party library contract.

**Technical rationale:** This increases upgrade risk. If `pixelmatch` changes option names, types, or semantics, this library inherits that churn in its public surface even if the desired wrapper API should remain stable.

**New file:** `src/adapters/toPixelmatchOptions.ts`

```ts
export function toPixelmatchOptions(opts: PixelmatchOptions): PixelmatchRawOptions;
// where: type PixelmatchRawOptions = Parameters<typeof pixelmatch>[4]
```

**Files to modify:**

- `src/comparePng.ts` — replace direct `opts?.pixelmatchOptions` pass-through:
    ```ts
    // BEFORE: opts?.pixelmatchOptions
    // AFTER:  opts?.pixelmatchOptions ? toPixelmatchOptions(opts.pixelmatchOptions) : undefined
    ```
- `src/types/compare.options.ts` — no shape change; update JSDoc to say:
  _"These options are translated internally via an adapter. The public names are stable even if the underlying pixelmatch library changes."_

**Note:** Do NOT change the `PixelmatchOptions` public type shape in this item — that is a future concern.

**New test file:** `__tests__/adapters/toPixelmatchOptions.test.ts`

- All fields present → adapter output matches expected pixelmatch raw object
- `undefined` → returns `undefined`
- Partial (only `threshold`) → only `threshold` key in output, all others absent

**Acceptance criteria:**

- Public types no longer need to change just because `pixelmatch` internals change
- A single adapter owns the translation to the external library
- Tests cover adapter behavior independently from the main orchestration flow

## [API-01] Introduce an async API and injectable I/O ports

**Priority:** P1  
**Status:** Done  
**Note: This Epic is decomposed into 4 sequential sub-items. The original item is replaced by [API-01a] through [API-01d] below.**

---

### [API-01a] Define I/O port interfaces (no behavior change)

**Status:** Done  
**Requires:** ARCH-01  
**New file:** `src/ports/types.ts`

```ts
export interface ImageSourcePort {
    load(source: string | Buffer, opts: ResolvedOptions): LoadedPng;
}
export interface DiffWriterPort {
    write(path: ValidatedPath, data: Buffer): void;
}
```

No runtime code. Types only. No tests needed.

---

### [API-01b] Wire existing sync implementations through ports

**Status:** Done  
**Requires:** API-01a  
**New files:**

- `src/ports/fsImageSource.ts` — implements `ImageSourcePort` using existing `getPngData`
- `src/ports/fsDiffWriter.ts` — implements `DiffWriterPort` using existing `writeFileSync`

**File to modify:** `src/comparePng.ts` — accept optional ports in an **internal** (not public) overload.

All existing tests must pass unchanged.

**Add one test** (new `describe` block in `__tests__/comparePng.test.ts`):

- Inject a fake `DiffWriterPort` that records calls
- Verify it is called on mismatch and not called on zero mismatch

---

### [API-01c] Implement `comparePngAsync` using async ports

**Status:** Done  
**Requires:** API-01b  
**New file:** `src/comparePngAsync.ts`

```ts
export async function comparePngAsync(png1: string | Buffer, png2: string | Buffer, opts?: ComparePngOptions): Promise<number>;
```

Use `fs.promises.readFile` and `fs.promises.writeFile` internally.  
Export from `src/index.ts`.

**New test file:** `__tests__/comparePngAsync.test.ts`
Must cover the same cases as `comparePng.test.ts`, but `await`ed.

---

### [API-01d] Documentation and backward-compat validation

**Status:** Done  
**Requires:** API-01c

- Add `comparePngAsync` to `README.md` with usage example
- Add `CHANGELOG.md` entry under next minor version
- Run full test suite; verify `comparePng` (sync) behavior is unchanged

## [RELI-03] Introduce structured error classes/codes

**Priority:** P1  
**Status:** Done  
**Requires:** nothing  
**Note: Implement first among P1 items — all other items depend on it.**  
**Problem:** Errors are currently plain `Error`/`TypeError`/`RangeError` strings spread across modules, and related failure modes use similar but inconsistent messages.

**Technical rationale:** Consumers have no stable way to branch on failure mode besides parsing text. This becomes brittle as the library gains more validation and security checks.

**New file:** `src/errors.ts`

```ts
export class InvalidInputError extends Error {
    readonly code = 'ERR_INVALID_PNG_INPUT' as const;
    constructor(message: string) {
        super(message);
        this.name = 'InvalidInputError';
    }
}
export class PathValidationError extends Error {
    readonly code = 'ERR_PATH_VALIDATION' as const;
    constructor(message: string) {
        super(message);
        this.name = 'PathValidationError';
    }
}
export class ResourceLimitError extends Error {
    readonly code = 'ERR_RESOURCE_LIMIT' as const;
    constructor(message: string) {
        super(message);
        this.name = 'ResourceLimitError';
    }
}
```

Export all three from `src/index.ts` (they are public API).

**Complete throw-site migration inventory** (agent must update ALL):

| File                   | Current throw                                         | New error class                  |
| ---------------------- | ----------------------------------------------------- | -------------------------------- |
| `src/validatePath.ts`  | `"Invalid file path: path must not be empty..."`      | `PathValidationError`            |
| `src/validatePath.ts`  | `"Invalid file path: path must not contain null..."`  | `PathValidationError`            |
| `src/validatePath.ts`  | `"Path traversal detected..."`                        | `PathValidationError`            |
| `src/getPngData.ts`    | `"Invalid PNG input: the source could not be loaded"` | `InvalidInputError`              |
| `src/getPngData.ts`    | `"Invalid PNG input: the data could not be parsed"`   | `InvalidInputError`              |
| `src/getPngData.ts`    | `"Unknown PNG file input type"`                       | `InvalidInputError`              |
| `src/getPngData.ts`    | dimension-exceeded message (`assertDimensions`)       | `ResourceLimitError`             |
| `src/comparePng.ts`    | `"Unknown PNG files input type"`                      | `InvalidInputError`              |
| `src/comparePng.ts`    | `"opts.diffFilePath must be a string..."`             | Keep as `TypeError` — API misuse |
| `src/comparePng.ts`    | `"opts.maxDimension must be a positive integer..."`   | Keep as `TypeError` — API misuse |
| `src/validateColor.ts` | any invalid color error                               | `InvalidInputError`              |

**Test changes required:**
All existing tests that use `.toThrow('message substring')` must **also** assert error type:

```ts
expect(err).toBeInstanceOf(PathValidationError);
```

**New test file:** `__tests__/errors.test.ts`

- Each error class has correct `.name`, `.code`, and `.message`
- `instanceof` checks work after thrown and caught

**Acceptance criteria:**

- Publicly reachable failures expose stable error codes
- Tests assert codes/types, not only message substrings
- Similar failure modes no longer rely on near-duplicate string literals

## [RELI-04] Define explicit zero-dimension image semantics

**Priority:** P1  
**Status:** Done  
**Requires:** TYPE-01 (sentinel removal), RELI-03 (error types)  
**Problem:** Invalid inputs are represented internally as `0×0` PNGs, but the library does not define clear, intentional semantics for genuinely zero-dimension images or zero-sized comparison cases.

**Technical rationale:** Right now zero-size behavior is an implementation side effect, not a contract. That makes future refactors risky and leaves corner cases under-specified for consumers and maintainers.

**Pre-decided policy:**

- A decoded PNG with `width === 0` OR `height === 0` is rejected with `InvalidInputError('Invalid PNG input: image has zero dimensions')`
- This check applies when `throwErrorOnInvalidInputData` is `true`
- When `throwErrorOnInvalidInputData` is `false`, a zero-dimension PNG (not the invalid-sentinel path) is also rejected — zero dimensions are never valid, unlike missing files

**File to modify:** `src/getPngData.ts`  
After `PNG.sync.read` succeeds, add:

```ts
if (result.width === 0 || result.height === 0) {
    if (throwErrorOnInvalidInputData) throw new InvalidInputError('Invalid PNG input: image has zero dimensions');
    return { kind: 'invalid', reason: 'decode' }; // TYPE-01 union
}
```

**Test additions in `__tests__/comparePng.exceptions.test.ts`:**

- `"throws InvalidInputError for a valid-but-zero-dimension PNG buffer"`:
  Construct `new PNG({width:0, height:0})`, write to `Buffer`, pass to `comparePng` — expect throw
- `"with throwErrorOnInvalidInputData=false, zero-dimension PNG is treated as invalid"`:
  One zero-dimension + one valid → should not throw; both zero-dimension → throws dual-invalid error

**Acceptance criteria:**

- Zero-dimension behavior is documented and tested as an explicit contract
- Internal invalid-input handling no longer depends on accidental zero-size semantics
- `comparePng` behavior is deterministic across all zero-size edge cases

## [PERF-02] Remove per-pixel helper dispatch in hot loops

**Priority:** P2  
**Status:** Open  
**Note: This item is split into a human Spike and an agent Story. Do not execute PERF-02b without PERF-02a output.**

---

### [PERF-02a] SPIKE — establish benchmark baseline (**Not for AI agent execution**)

**Status:** Open

Human step: run a timing script against `addColoredAreasToImage` with a `4096×4096` image and a full-image excluded area. Record the result. Decide if improvement justifies the refactor.

---

### [PERF-02b] STORY — inline pixel writes (**Agent-ready only after PERF-02a**)

**Status:** Open  
**Requires:** PERF-02a baseline established and the numeric result committed to this item.

**Files to modify:** `src/addColoredAreasToImage.ts`, `src/fillImageSizeDifference.ts`

**Exact change:** Replace `drawPixelOnBuff(image.data, pos, color)` with:

```ts
image.data[pos] = color.r;
image.data[pos + 1] = color.g;
image.data[pos + 2] = color.b;
image.data[pos + 3] = 255;
```

Remove `import` of `drawPixelOnBuff` in both files if no other callers remain.

**Acceptance criteria:**

- All existing snapshot tests pass byte-for-byte (`npx vitest run --update-snapshots` must produce **zero** snapshot changes)
- Large-area painting is measurably faster than the baseline from PERF-02a
- Bounds handling remains explicit and test-covered

## [PERF-03] Reduce memory pressure when normalizing differently sized images

**Priority:** P2  
**Status:** Open  
**Note: BLOCKED — awaiting human spike output**  
**Problem:** `extendImage` allocates a new canvas for size normalization, which can temporarily duplicate large image buffers and amplify peak memory usage.

**Technical rationale:** This is separate from lazy diff allocation. When image sizes differ, the library may hold original buffers, extended buffers, and a diff buffer simultaneously, hurting scalability for large fixtures and server-side batch usage.

**This item requires profiling with heap snapshots** (V8 inspector, clinic.js, or `--expose-gc` manual measurement) before any code change can be justified or verified. An AI agent cannot meaningfully "measure peak memory" and make a sound trade-off decision.

When the spike output exists, the resulting Story must specify:

- Whether to reuse buffers in `extendImage` (modify in-place vs. new allocation)
- Whether to defer `extendImage` until after `excludedArea` painting
- Exact before/after memory figures as the AC threshold

Only then is the item agent-executable.

**Acceptance criteria (after spike):**

- Peak memory usage for different-size comparisons is measured and improved
- Existing results remain byte-for-byte compatible
- The chosen strategy is documented with tradeoffs and constraints

## [TEST-01] Add orchestrator-focused tests that do not require PNG fixtures

**Priority:** P2  
**Status:** Done  
**Note: Split into [TEST-01a] (agent-ready now) and [TEST-01b] (blocked on API-01b).**

---

### [TEST-01a] Decision-logic unit tests (agent-ready now)

**Status:** Done  
**Requires:** nothing  
**New file:** `__tests__/comparePng.logic.test.ts`

Implement exactly these three test cases using in-memory PNG `Buffer`s (create minimal valid PNG buffers with `pngjs` — no file fixtures):

**Test 1:** `"does not write diff file when pixelmatch returns 0"`

- Create two identical `2×2` PNG buffers
- Call `comparePng(buf1, buf2, { diffFilePath: '/tmp/should-not-exist.png' })`
- Assert the file was NOT created (`fs.existsSync`)
- Assert return value is `0`

**Test 2:** `"throws when both inputs are invalid"`

- Pass two garbage `Buffer`s with `throwErrorOnInvalidInputData: true`
- Assert thrown error is `instanceof InvalidInputError` (after RELI-03); until then assert message includes `'Unknown PNG'`

**Test 3:** `"excludedAreas validation runs before image mutation"`

- Pass valid PNG buffers and `excludedAreas: [{x1: NaN, y1: 0, x2: 10, y2: 10}]`
- Assert throw before any comparison occurs
- Verify by checking that no diff file was created

---

### [TEST-01b] Port-injection orchestrator tests (**BLOCKED on API-01b**)

**Status:** Done  
**Requires:** API-01b (ports wired)

When unblocked, the agent should:

- Create `__tests__/comparePng.ports.test.ts`
- Inject a fake `ImageSourcePort` that records `load()` calls
- Inject a fake `DiffWriterPort` that records `write()` calls
- Verify: no diff write on zero mismatch, `load` called exactly twice, normalization stage called after load

**Acceptance criteria (TEST-01a):**

- Core orchestration decision logic can be tested without touching disk
- All three test cases are implemented and pass
- Integration tests in existing files remain for real PNG decoding/comparison behavior

---

## [SECU-03] Make diff write symlink-atomic

**Priority:** P1  
**Status:** Done  
**Shipped:** 2026-05-16 (`6.1.1`) via `O_NOFOLLOW` on both `fsDiffWriter` and `fsAsyncDiffWriter`; behaviour preserved for regular-file overwrite; symlink at target now refused with `PathValidationError`. Residual parent-directory race tracked as `SECU-09`.  
**Requires:** nothing  
**Problem:** `src/ports/fsDiffWriter.ts` and `src/ports/fsAsyncDiffWriter.ts` write the diff PNG via `writeFileSync(path, data)` / `writeFile(path, data)`, both of which follow symlinks by default. `validatePath` correctly rejects an _existing_ symlink at the target path under output mode, but between that validation and the actual write a hostile or buggy process can plant a symlink at `diffFilePath`, causing the diff bytes to be written to an arbitrary destination outside `diffOutputBaseDir`.

**Technical rationale:** Closes the documented TOCTOU window for the diff-output security boundary. `diffOutputBaseDir` is positioned as a defence; with this gap, a symlink planted after validation can escape it even when the base directory is enforced.

**Files to modify:**

- `src/ports/fsDiffWriter.ts` — replace `writeFileSync(path, data)` with an exclusive-create flow: `const fd = openSync(path, 'wx'); try { writeSync(fd, data); } finally { closeSync(fd); }`. The `'wx'` flag (O_EXCL | O_CREAT | O_WRONLY) refuses pre-existing destinations and bypasses the symlink-follow path entirely.
- `src/ports/fsAsyncDiffWriter.ts` — equivalent change using `fs.promises.open(path, 'wx')` / `handle.writeFile(data)` / `handle.close()` in a `try/finally`.
- `src/types/compare.options.ts` — TSDoc for `diffFilePath` updated to document the new exclusive-create semantics: writing is refused if any filesystem entry already exists at the target.

**Constraint:** Current behavior is "overwrite an existing diff at this path." Exclusive-create changes that to "fail if anything already exists." This is a small behavior shift; callers that intentionally overwrite must delete the previous file first. This shift is the point of the change — overwrite-by-follow is the unsafe operation.

**Tests:**

- New `__tests__/ports/fsDiffWriter.symlink.test.ts` — create a tmp dir, validate a target path, then plant a symlink at that path before invoking the writer, assert the writer throws an `EEXIST`-style error and the symlink's target file is unchanged. Guard with `if (process.platform === 'win32') return;`.
- New `__tests__/ports/fsAsyncDiffWriter.symlink.test.ts` — same case for the async port.
- Regression: existing "diff is written to a fresh path" tests must still pass.

**Acceptance criteria:**

- Diff write fails with `EEXIST` (or wrapped equivalent) when any filesystem entry exists at the target path
- TSDoc on `diffFilePath` documents the exclusive-create contract
- TOCTOU symlink test passes on Linux and macOS; Windows is explicitly skipped with a TODO

## [SECU-04] Cap file read size before decoding

**Priority:** P2  
**Status:** Open  
**Problem:** `src/getPngData.ts` and `src/ports/fsAsyncImageSource.ts` call `readFileSync` / `readFile` to slurp the entire file into memory before `peekPngDimensions` or any limit check runs. A 10 GiB file passes `validatePath` and exhausts the heap regardless of `maxPixels` / `maxDimension`, because those limits only act on already-loaded bytes.

**Files to modify:**

- `src/types/compare.options.ts` — add `maxFileBytes?: number` to `ComparePngOptions` with TSDoc explaining it gates pre-read size
- `src/defaults.ts` — add `DEFAULT_MAX_FILE_BYTES = 64 * 1024 * 1024` (64 MB; large enough for any realistic PNG, small enough to refuse outright bombs); export from `src/index.ts`
- `src/pipeline/resolveOptions.ts` — validate `maxFileBytes` is a positive integer or `Infinity` (same shape as `maxDimension`/`maxPixels`)
- `src/getPngData.ts` — `statSync(resolvedPath)` before `readFileSync`; throw `ResourceLimitError` if `size > maxFileBytes`. Only applies to the string-input branch; the buffer-input branch is unaffected because the caller already controls the buffer size.
- `src/ports/fsAsyncImageSource.ts` — `await fs.promises.stat(validatedPath)` before `readFile`; same throw.

**Acceptance criteria:**

- A file larger than `maxFileBytes` throws `ResourceLimitError` with a clear message before any read
- `maxFileBytes: Infinity` disables the check
- Tests cover: file at exactly the cap (accepted), one byte over (rejected), default cap rejects a synthetic 100 MB file, buffer input is unaffected (no `stat` call)
- `DEFAULT_MAX_FILE_BYTES` is documented and exported

## [SECU-05] Document or close the async-path TOCTOU between validate and read

**Priority:** P2  
**Status:** Open  
**See also:** SECU-03 (analogous TOCTOU on the diff-output side)  
**Problem:** `fsAsyncImageSource.load` runs `validatePath(source, opts.inputBaseDir, 'input')` then awaits `readFile(validatedPath)`. Between those two awaits the filesystem can change — a symlink can be planted, the file replaced, the parent directory moved. The sync port has no such window because `readFileSync` happens in the same tick. `inputBaseDir`'s TSDoc does not currently call out this async-specific behavior, and no test pins down what is expected.

**Files to modify:**

- `src/types/compare.options.ts` — extend the existing TSDoc for `inputBaseDir` with a TOCTOU note matching the one already on `diffOutputBaseDir` (point-in-time check, race possible in async mode, recommend OS-level chroot/jails for hostile environments)
- `README.md` — add (or extend) a `## Security model` section listing this caveat for async-mode input loading
- `src/ports/fsAsyncImageSource.ts` _(optional, if closing rather than documenting)_ — open the validated path with `O_NOFOLLOW` via `fs.promises.open` and read through the file handle; combine with SECU-04 so the same handle's `stat()` services both checks
- New `__tests__/ports/fsAsyncImageSource.toctou.test.ts` — assert the documented behavior on Linux/macOS (whichever path is taken)

**Acceptance criteria:**

- Either the TOCTOU window is closed by handle-based read with `O_NOFOLLOW`, or the limitation is documented in TSDoc _and_ README _and_ covered by a behavioral test that demonstrates the documented semantics
- The chosen path is explicit; the docs do not imply a guarantee that the code does not provide

## [SECU-06] Document and bound the PNG decoder bomb surface

**Priority:** P2  
**Status:** Open  
**Requires:** SECU-04 preferred (the `maxFileBytes` lever is the most useful single mitigation to reference)  
**Problem:** IHDR peek catches header-declared dimensions, but malicious PNGs can still cause unbounded resource consumption through (a) zlib-compressed IDAT streams that expand far beyond a "reasonable" file size, (b) malformed ancillary chunks that some decoders mishandle, (c) zlib bombs with very high compression ratios. `pngjs` is a third-party decoder with a history of CVE patterns around malformed inputs; this library's threat model has not been written down.

**Files to modify:**

- `README.md` — add `## Security model` (or extend an existing security-relevant section) that explicitly lists: (i) what `maxDimension` / `maxPixels` / `maxFileBytes` _do_ protect; (ii) what they _don't_ (decoder-level chunk bombs, pathological zlib ratios, third-party CVEs in `pngjs`); (iii) recommended defence-in-depth (run in a worker thread with a hard memory cap, or in a container with cgroup memory limits)
- `docs/ARCHITECTURE.md` — cross-link to the README security section from "Validation and security boundaries"

**Acceptance criteria:**

- README has a Security section that names each protected and unprotected vector
- `docs/ARCHITECTURE.md` no longer implies the boundary is total
- No source code changes required by this item; the `maxFileBytes` cap landed in SECU-04 is the closest related code lever and is referenced from the docs

## [SECU-07] `comparePngWithPorts` is module-exported but not part of the public barrel

**Priority:** P3  
**Status:** Open  
**Problem:** `src/comparePng.ts:13` exports `comparePngWithPorts` as a test seam. It is not re-exported by `src/index.ts`, and `package.json#exports` restricts the published surface to `.`, `./vitest`, `./jest`, so consumers cannot deep-import today. Functional risk is zero — but the symbol's reachability depends entirely on packaging hygiene staying intact through future refactors.

**Suggested change:** Either (a) move `comparePngWithPorts` and the `ComparisonPorts`-using overload into `src/internal/` (or `src/_seams/`) so accidental re-export becomes structurally less likely, or (b) annotate the export with a `@internal` JSDoc tag and a one-line comment marking it as test-only. The `@internal` tag is the smallest change; the move is the most defensive. Either is acceptable.

## [SECU-08] `validatePath` does not bound path length

**Priority:** P3  
**Status:** Open  
**Problem:** `validatePath` accepts strings of arbitrary length. `resolve(filePath)` and `realpathSync.native(...)` will happily process a 100 KB path string and fail at the OS layer with `ENAMETOOLONG` (Linux) or undefined behavior on some filesystems. There is no library-owned deterministic rejection for adversarially long inputs.

**Suggested change:** Add a length cap to `validatePath` next to the existing empty / null-byte checks:

```ts
if (filePath.length > 4096) {
    throw new PathValidationError('Invalid file path: path length exceeds limit');
}
```

4096 is Linux `PATH_MAX`; macOS `pathconf(_PC_PATH_MAX)` is 1024 but APFS tolerates longer. A 4096-byte cap is permissive enough not to false-trigger on real paths and strict enough to refuse pathological inputs.

## [SECU-09] `mkdirSync(recursive)` can cross a symlink planted in a parent directory component

**Priority:** P2  
**Status:** Open  
**Filed:** 2026-05-16 as a follow-on from SECU-03 (target-path race closed; parent-component race deferred).  
**Problem:** Both `fsDiffWriter` and `fsAsyncDiffWriter` call `mkdirSync(parse(path).dir, { recursive: true })` (or its async equivalent) before opening the target file. `mkdir` does **not** refuse symlinks in path components; if an attacker plants a symlink at any ancestor of `diffFilePath` between `validatePath` (which `realpath`s the longest existing parent) and the `mkdir` call, the diff write proceeds through that symlink. SECU-03 closed the race at the final path component via `O_NOFOLLOW`; this item is the analogous closure for intermediate components.

**Technical rationale:** `validatePath` performs a `realpath` of the longest existing parent at validate-time. Between that point and `mkdirSync`, an attacker can `mkdir`/`ln -s` a new component that bypasses containment. The threat is narrower than SECU-03 because the attacker must control a directory inside `diffOutputBaseDir`, but the same `diffOutputBaseDir` security boundary is the one we claim to enforce.

**Suggested approach:**

- Walk the path segments manually (`path.relative(baseDir, target).split(path.sep)`), and for each non-existent segment, `mkdir` it without `recursive: true` and re-`lstat` it after creation to confirm it is a real directory (not a symlink). On any `lstat` mismatch, throw `PathValidationError`.
- Alternative: skip the `mkdir` step in the writer entirely and document that callers must pre-create `diffFilePath`'s parent directory. Smaller code; larger behaviour shift.

**Files to modify:**

- `src/ports/fsDiffWriter.ts`, `src/ports/fsAsyncDiffWriter.ts` — replace `mkdirSync(parent, { recursive: true })` with a per-segment loop that lstats each created directory.
- `src/types/compare.options.ts` — once closed, retract the "parent-directory race remains" caveat in the `diffFilePath` and `diffOutputBaseDir` TSDoc.
- New test files mirroring `fsDiffWriter.symlink.test.ts` / `fsAsyncDiffWriter.symlink.test.ts` — assert that a symlink planted between `validatePath` and the per-segment `mkdir` is refused.

**Acceptance criteria:**

- Diff write refuses to traverse a symlink in any ancestor of `diffFilePath`
- TSDoc on `diffFilePath` and `diffOutputBaseDir` no longer flags a residual parent-dir race
- Coverage stays at 100 %
- Symlink-in-parent test passes on Linux and macOS; Windows guarded as elsewhere

## [PERF-04] Skip eager clone in `normalizeImages` when no mutation follows

**Priority:** P2  
**Status:** Open  
**Problem:** `src/pipeline/normalizeImages.ts:23-25` always calls `clonePng(...)` on every valid input via `toComparablePng`. In the common path — same-sized images with no `excludedAreas` — the function performs no mutation afterwards, so the clone is wasted: a full RGBA buffer allocation plus a full-image `PNG.bitblt`, per side, per comparison.

**Files to modify:**

- `src/pipeline/normalizeImages.ts` — change `toComparablePng` to return the original `PNGWithMetadata` for the `'valid'` branch (without cloning). Move the clone into a guarded helper that runs only when mutation will follow — i.e. when `opts.excludedAreas.length > 0` _or_ when the size-difference branch is taken. The fact that `getPngData` decoded the PNG inside this library means the source is library-owned and safe to mutate; if a custom `ImageSourcePort` returns a cached PNG the contract is "the pipeline may mutate it" (document this on `ImageSourcePort`).

**Acceptance criteria:**

- Zero clones in the equal-size, no-excluded-areas path (verify with a spy on `PNG.bitblt` or a counter on `clonePng`)
- Snapshot test suite still passes byte-for-byte (no functional change)
- `ImageSourcePort` JSDoc explicitly states that returned PNGs may be mutated by the pipeline
- New microbenchmark or test asserts that the equal-size no-exclusions path does not allocate a clone

## [PERF-05] Replace JSON-byte-array PNG snapshot serialization with base64

**Priority:** P2  
**Status:** Open  
**Problem:** `src/matchers/pngSnapshot.ts:102` serializes received PNGs as `JSON.stringify(received, null, 2)`, which renders a `Buffer` as a 2-space-indented JSON array of byte values. Each source byte expands to ~5–7 characters (`"  255,\n"`). A 50 KB PNG produces a ~300 KB snapshot file. Base64 (`buffer.toString('base64')`) holds the same bytes in ~1.33× source size — a 4–5× win on disk and snapshot diff readability.

**Files to modify:**

- `src/matchers/pngSnapshot.ts` — write new snapshots as `{ type: 'Buffer-base64', data: '<base64-string>' }`
- `src/matchers/pngSnapshot.ts:parseSerializedPngSnapshot` — accept both the legacy `{type:'Buffer', data:[…]}` form and the new base64 form for one deprecation window
- `CHANGELOG.md` — mark the format change as additive for one release, then format-removal as breaking in the next major
- New `__tests__/pngSnapshot.serialization.test.ts` — round-trip both formats; assert legacy snapshots still match

**Acceptance criteria:**

- New snapshots are written in base64 form
- Legacy snapshots still pass without forced regeneration
- File size on a 1 MB synthetic PNG snapshot is ≤ 1.4× the source bytes
- Migration note added to the README

## [PERF-06] `extendImage` double-writes the padding region

**Priority:** P3  
**Status:** Open  
**Problem:** `src/extendImage.ts:19` allocates the target canvas with `new PNG({ ..., fill: true })`, which zeros the entire pixel buffer. `PNG.bitblt` then overwrites the top-left region, after which `fillImageSizeDifference` writes the padding region a second time with the configured colour. The padding bytes are written twice (once to zero, once to colour).

**Suggested change:** Pass `fill: false` (or omit `fill`) when creating the extended PNG; the padding pass in `fillImageSizeDifference` is the authoritative writer for those bytes. The brief window where `image.data` contains uninitialized memory is invisible to consumers — nothing reads the padding region between `extendImage` and `fillImageSizeDifference`. Verify with the existing snapshot suite, which must remain byte-for-byte identical.

## [PERF-07] `validateArea` allocates a transient array per call

**Priority:** P3  
**Status:** Open  
**Problem:** `src/validateArea.ts:11-13` builds `[x1, y1, x2, y2]` on every call to drive `.every((coord) => typeof === 'number' && Number.isFinite(coord) && Math.round(coord) === coord)`. For a backlog of 1000 areas, that is 1000 small array allocations plus one closure per area.

**Suggested change:** Unroll the four checks into four conditionals against the unpacked locals (`x1`, `y1`, `x2`, `y2` are already in scope). Marginal in absolute terms; aligns with the rest of the validation modules which use unrolled, allocation-free checks.

## [ARCH-02] Split `getPngData` into decode and load-from-path helpers

**Priority:** P2  
**Status:** Open  
**Problem:** `src/getPngData.ts` mixes two responsibilities — validating + reading a string path _and_ decoding a Buffer + applying limits. The async port (`src/ports/fsAsyncImageSource.ts`) does its own `validatePath` + `readFile` to get the buffer, then has to call `getPngData(buffer, ...)` purely for the decode-and-finalize half, which is the same call shape the sync path uses for a different reason. The function is doing double duty and the async port has to know which half it is reusing.

**Files to modify:**

- `src/getPngData.ts` — split into two functions:
    - `decodePngBuffer(buffer: Buffer, throwOnInvalid: boolean, maxDimension?: number, maxPixels?: number): LoadedPng` — assumes the buffer is already in memory; runs `assertImageLimits` + `PNG.sync.read` + `finalizeDecodedPng`
    - `loadPngFromPath(path: string, throwOnInvalid: boolean, maxDimension?: number, maxPixels?: number, inputBaseDir?: string): LoadedPng` — runs `validatePath` + `readFileSync` + delegates to `decodePngBuffer`
- `src/ports/fsImageSource.ts` — call `loadPngFromPath` when source is a string, `decodePngBuffer` when source is a Buffer
- `src/ports/fsAsyncImageSource.ts` — already does its own path/read; switch its decode call from `getPngData(buffer, ...)` to `decodePngBuffer(...)` for clarity
- `src/index.ts` / `src/types/index.ts` — no public-surface change

**Acceptance criteria:**

- Each helper has a single, named responsibility and is unit-testable in isolation
- Async port no longer reuses a polymorphic function to do half its job
- All existing tests pass with no semantic change
- Coverage on `decodePngBuffer` and `loadPngFromPath` reaches 100 % independently (no shared code path required to hit branches)

## [ARCH-03] Add `comparePngAsyncWithPorts` for async port-injection symmetry

**Priority:** P2  
**Status:** Open  
**Requires:** ARCH-02 preferred (the decode/load split clarifies what the async port actually needs to inject)  
**Problem:** The sync API exposes `comparePngWithPorts(...)` so tests can inject fakes for `ImageSourcePort` / `DiffWriterPort` — `__tests__/comparePng.ports.test.ts` exercises this. The async API has no equivalent: `comparePngAsync` cannot accept ports, and there is no `__tests__/comparePngAsync.ports.test.ts`. Async decision logic (`getPersistableDiff` gating, order of `Promise.all`, error-path branching in `loadSourcesAsync`) is therefore only covered through real filesystem fixtures.

**Files to modify:**

- `src/comparePngAsync.ts` — extract a `comparePngAsyncWithPorts(png1, png2, opts, ports?: AsyncComparisonPorts)` overload alongside the existing `comparePngAsync`. Default ports are `fsAsyncImageSource` / `fsAsyncDiffWriter`.
- `src/ports/asyncTypes.ts` — add `AsyncComparisonPorts = { readonly imageSource: AsyncImageSourcePort; readonly diffWriter: AsyncDiffWriterPort; }`
- New `__tests__/comparePngAsync.ports.test.ts` — mirrors `__tests__/comparePng.ports.test.ts`: inject fakes, assert no diff write on zero mismatch, `load` called exactly twice, both loads run concurrently (assert `Promise.all` start ordering by side-effect timing)
- Do NOT export `comparePngAsyncWithPorts` from `src/index.ts` (consistent with `comparePngWithPorts` being internal); the SECU-07 disposition will eventually move both seams together

**Acceptance criteria:**

- Async decision logic is testable without disk I/O
- The sync and async surfaces are symmetric in port-injection capability
- New test file matches the existing sync ports-test in shape and coverage

## [ARCH-04] Remove dead type `ComparisonContext` and dead field `ResolvedOptions.rawOptions`

**Priority:** P3  
**Status:** Open  
**Problem:** `src/pipeline/types.ts:44-49` defines `ComparisonContext` but no code in `src/` imports or uses it. `src/pipeline/resolveOptions.ts:72` writes `rawOptions: raw` into the returned `ResolvedOptions`, but no downstream stage reads that field. Both are dead.

**Suggested change:** Delete `ComparisonContext` from `pipeline/types.ts` and the `rawOptions` field from both the `ResolvedOptions` type and the `resolveOptions` return literal. Run `npm run typecheck` + `npm run test:unit` to confirm no consumer existed.

## [ARCH-05] Separate runtime ports from `ResolvedOptions`

**Priority:** P3  
**Status:** Open  
**Problem:** `ResolvedOptions` (`src/pipeline/types.ts:8-23`) carries `imageSourcePort` and `diffWriterPort` alongside `excludedAreas`, `maxPixels`, etc. Ports are infrastructure (runtime injectables); the other fields are configuration (user-controlled values). Mixing them widens the type and forces every stage's signature to ferry runtime ports even when the stage only reads configuration.

**Suggested change:** Introduce a `RuntimePorts` (or `ComparisonRuntime`) parameter threaded through pipeline stages as a sibling of `ResolvedOptions`. `comparePngWithPorts` builds the runtime object from the optional `ports` argument; downstream stages that don't touch I/O (e.g. `normalizeImages`, `runComparison`) don't receive it. Apply the same separation in the async path once ARCH-03 lands.

## [ARCH-06] Move `validateImageSourceLoad.ts` out of `src/ports/`

**Priority:** P3  
**Status:** Open  
**Problem:** `src/ports/validateImageSourceLoad.ts` lives under `src/ports/` but does not implement any port — it exports plain functions (`handlePathValidationError`, `handleFileReadError`, `handlePngDecodeError`) that translate raw errors into either an `InvalidInputError`/`PathValidationError`/`ResourceLimitError` throw or a `LoadedPng` invalid value. Location and contents disagree, making the directory's "this is where ports live" promise misleading.

**Suggested change:** Move the file to `src/internal/errorHandling.ts` (creating that directory if needed) and update the two import sites in `fsAsyncImageSource.ts`. `src/internal/` then becomes the conventional home for cross-cutting helpers that are neither pipeline stages, ports, adapters, validators, nor public types.

## [ARCH-07] Collect defaults into a single frozen options object

**Priority:** P3  
**Status:** Open  
**Problem:** `src/defaults.ts` exports four independent constants (`DEFAULT_EXCLUDED_AREA_COLOR`, `DEFAULT_EXTENDED_AREA_COLOR`, `DEFAULT_MAX_DIMENSION`, `DEFAULT_MAX_PIXELS`). `resolveOptions` reads each by name. Future defaults (`DEFAULT_MAX_FILE_BYTES` from SECU-04, etc.) will follow the same pattern, growing the surface.

**Suggested change:** Introduce `export const DEFAULT_COMPARE_PNG_OPTIONS = Object.freeze({ excludedAreaColor: ..., extendedAreaColor: ..., maxDimension: ..., maxPixels: ..., maxFileBytes: ... });` alongside the existing individual exports (kept for backward compatibility). `resolveOptions` can then spread defaults instead of cherry-picking. New defaults land in one place.

## [TYPE-04] Make public `Area` and `Color` fields `readonly`

**Priority:** P2  
**Status:** Open  
**Problem:** `src/types/area.ts` declares `x1: number; y1: number; x2: number; y2: number;` (all mutable). `src/types/color.ts` declares `r: number; g: number; b: number;` (all mutable). Public callers can mutate an `Area` after passing it into `excludedAreas`, or mutate a `Color` referenced from `DEFAULT_EXCLUDED_AREA_COLOR` / `DEFAULT_EXTENDED_AREA_COLOR`. The library treats both shapes as values; the type does not communicate that.

**Files to modify:**

- `src/types/area.ts` — mark every field `readonly`; update TSDoc to mention immutability
- `src/types/color.ts` — same
- `src/defaults.ts` — wrap the default color constants in `Object.freeze({...})` so a runtime mutation matches the type
- `src/validateArea.ts`, `src/validateColor.ts`, `src/addColoredAreasToImage.ts` — no semantic change needed; verify destructuring still typechecks
- Update README example snippets only if any current example reassigns a field

**Acceptance criteria:**

- `Area` and `Color` exported fields are `readonly`
- Default color exports are runtime-frozen
- Existing tests pass without modification
- A new test case asserts that attempted reassignment fails at the TS layer (`@ts-expect-error`) and that the frozen defaults throw in strict mode

## [TYPE-05] Decide whether port interfaces are public — and align types accordingly

**Priority:** P2  
**Status:** Open  
**See also:** ARCH-03 (async port-injection symmetry), SECU-07 (`comparePngWithPorts` placement)  
**Problem:** `ImageSourcePort`, `DiffWriterPort`, `ComparisonPorts`, `AsyncImageSourcePort`, `AsyncDiffWriterPort` are defined under `src/ports/` but `src/index.ts` does not re-export any of them. The architecture supports port injection through `comparePngWithPorts`, but external consumers cannot implement a custom port because the contract types aren't reachable. The ambiguity — "ports exist but aren't exported" — is itself the defect: there is no single answer to "are ports a public extension point?"

**Files to modify (option A: ports are public):**

- `src/index.ts` — re-export `ImageSourcePort`, `DiffWriterPort`, `ComparisonPorts`, `AsyncImageSourcePort`, `AsyncDiffWriterPort`, `AsyncComparisonPorts` (after ARCH-03)
- `src/comparePng.ts` / `src/comparePngAsync.ts` — promote `comparePngWithPorts` / `comparePngAsyncWithPorts` to public exports with stable signatures; update README
- Add an "Implementing a custom port" section to the README

**Files to modify (option B: ports are internal-only):**

- `src/ports/types.ts` and `src/ports/asyncTypes.ts` — add `@internal` JSDoc tags
- `docs/ARCHITECTURE.md` — explicitly state ports are a test seam, not a public extension point
- Combine with SECU-07 to relocate `comparePngWithPorts` out of the public source path

**Acceptance criteria:**

- The implementation matches the documented intent
- Public TSDoc and README either teach port injection (option A) or stay silent about it (option B); no middle ground
- Tests reference the chosen surface — public if A, internal if B

## [TYPE-06] `LoadedPng` is re-exported publicly without a consumer

**Priority:** P3  
**Status:** Open  
**Problem:** `src/index.ts:11` does `export type * from './types';`, which re-exports `LoadedPng`. The union describes the return shape of `getPngData`, which is internal — public callers of `comparePng` / `comparePngAsync` receive `number` (mismatched pixel count) and never see a `LoadedPng` in the public flow. Exposing it widens the supported surface for no consumer benefit and ties future internal refactors to a publicly committed shape.

**Suggested change:** Either replace `export type * from './types';` with explicit `export type { Area, Color, ComparePngOptions, PixelmatchOptions } from './types';`, or move `LoadedPng` out of `src/types/` into a clearly-internal location (`src/internal/loadedPng.ts`) so the public barrel can't pull it in by accident.

## [TYPE-07] `string | Buffer` input type is duplicated between sync and async entrypoints

**Priority:** P3  
**Status:** Open  
**Problem:** `src/comparePng.ts:11` defines `type ComparePngInput = string | Buffer;`. `src/comparePngAsync.ts:27` inlines `png1: string | Buffer, png2: string | Buffer` in its function signature without referencing the alias. The two entrypoints diverge on a shared concept that should have one definition.

**Suggested change:** Export `ComparePngInput` from `src/pipeline/types.ts` (or move it to `src/types/inputs.ts`) and have both `comparePng` and `comparePngAsync` reference the shared alias. Not part of the public type surface; internal hygiene only.

## [TYPE-08] `isComparePngOptions` is misleadingly named

**Priority:** P3  
**Status:** Open  
**Problem:** `src/matchers/pngSnapshot.ts:46-48` defines `function isComparePngOptions(value: unknown): value is ComparePngOptions { return typeof value === 'object' && value !== null && !Array.isArray(value); }`. The function does not validate a single field of `ComparePngOptions`; it only checks "is a plain object." The cast to `ComparePngOptions` in the return type is unsafe and the name promises validation that doesn't happen.

**Suggested change:** Rename to `isPlainObject` and change the return type to `value is Record<string, unknown>`. Call sites that need the cast to `ComparePngOptions` perform it explicitly with a comment, making the type assertion auditable. Alternatively, add real shape validation (only if it earns its keep elsewhere).

## [TYPE-09] `ComparisonPorts` forces full port injection when partial is the common case

**Priority:** P3  
**Status:** Open  
**Problem:** `src/ports/types.ts:14-17` declares `type ComparisonPorts = { readonly imageSource: ImageSourcePort; readonly diffWriter: DiffWriterPort; };` — both fields are non-optional. The call-site (`src/comparePng.ts:19`) then defaults each individually with `ports?.imageSource ?? fsImageSource`. The type forces tests to supply both ports even when they only want to fake one, contradicting the default-fallback logic.

**Suggested change:** Either relax the public/internal `ComparisonPorts` type to `Partial<...>` (matching what `comparePngWithPorts` actually accepts), or define a separate `PartialComparisonPorts = Partial<ComparisonPorts>` and use that on the overload. Apply the same to `AsyncComparisonPorts` once ARCH-03 lands.

## [RELI-05] `Promise.all` in `comparePngAsync` can leak unhandled rejection from the second load

**Priority:** P3  
**Status:** Open  
**Problem:** `src/comparePngAsync.ts:18-20` uses `Promise.all([fsAsyncImageSource.load(png1, opts), fsAsyncImageSource.load(png2, opts)])`. If the first leg rejects (e.g. `PathValidationError`), the second leg is still pending; if it later rejects, Node logs an unhandled-rejection warning because the consumer's `await` already received the first error. In strict modes (`--unhandled-rejections=strict`), Node may even crash.

**Suggested change:** Use `Promise.allSettled` and then re-throw the first rejection deterministically, _or_ attach a no-op `.catch(() => undefined)` to whichever leg is the "loser" once one rejects. The `allSettled` approach is cleaner because it preserves both errors for diagnostic reporting (e.g. "both inputs invalid" with both reasons named) and avoids relying on the host's unhandled-rejection policy.

## [RELI-06] `validateArea` accepts negative coordinates that silently become no-ops

**Priority:** P3  
**Status:** Open  
**Problem:** `src/validateArea.ts` requires only finite integer coordinates plus `x1 <= x2`, `y1 <= y2`. `{ x1: -10, y1: -5, x2: -1, y2: -1 }` passes validation. `src/addColoredAreasToImage.ts:19-22` then clamps the range to `[0, width-1]` / `[0, height-1]`, so the inner loop body never executes and the area is silently a no-op. The caller's intent ("paint a region to the left of the canvas"?) is ambiguous and the result is invisible.

**Suggested change:** Either (a) reject negative coordinates in `validateArea` with a structured `InvalidInputError`, matching the existing fail-fast posture of the rest of the library, or (b) document the silent-clamp-to-empty behavior in `Area`'s TSDoc with an explicit example. Option (a) is preferred — the silent no-op is more likely a bug than an intent.

## [RELI-07] `persistDiff` compares a non-negative count with `<= 0`

**Priority:** P3  
**Status:** Open  
**Problem:** `src/pipeline/persistDiff.ts:12` gates on `result.mismatchedPixels <= 0`, but `mismatchedPixels` is a count returned by `pixelmatch` and is always `>= 0`. The `<=` reads as if negative values are possible, weakening the local invariant.

**Suggested change:** Tighten the comparison to `=== 0`. Mechanical change; covered by existing tests.

## [RELI-08] `resolveOptions` reads `throwErrorOnInvalidInputData` before validating its type

**Priority:** P3  
**Status:** Open  
**Problem:** `src/pipeline/resolveOptions.ts:16` assigns `const throwErrorOnInvalidInputData = raw?.throwErrorOnInvalidInputData ?? true;` and the typeof check follows on lines 17-19. If the caller passes a non-boolean truthy value (e.g. `'yes'`), the local binds to `'yes'` and the `TypeError` is thrown on the next line. The variable is not used before the check, so correctness holds, but the ordering is misleading and inconsistent with the validate-before-bind pattern used by the other option resolvers below it.

**Suggested change:** Move the `typeof` check above the `??` assignment so the validation happens first. Same one-line behavioral outcome, clearer reading order, consistent with how `inputBaseDir` / `diffOutputBaseDir` are handled.

## [RELI-09] `validatePath.realpathNative` propagates raw filesystem errors when `missingBaseDirMessage` is absent

**Priority:** P3  
**Status:** Open  
**Problem:** `src/validatePath.ts:13-26` wraps `realpathSync.native`. ELOOP is normalized into `PathValidationError`; if `missingBaseDirMessage` is provided, missing-path errors also become `PathValidationError`. Otherwise (`throw error;` on line 24), raw `NodeJS.ErrnoException` instances propagate. Callers therefore see two different error shapes from the same security boundary — `PathValidationError` for some failure modes, raw `ENOENT` / `EACCES` for others.

**Suggested change:** Normalize all `realpathNative` failures into `PathValidationError` (preserving the underlying `code` via `cause` per ES2022 error chaining) so consumers can branch on a single type. Update affected tests to assert on `PathValidationError` + `cause.code` instead of raw `NodeJS.ErrnoException`.

## [RELI-10] Errors thrown by `pixelmatch` are not wrapped in a structured error class

**Priority:** P3  
**Status:** Open  
**Problem:** `src/pipeline/runComparison.ts:17` calls `pixelmatch(...)` without a `try`/`catch`. If `pixelmatch` throws (typically on buffer-size mismatch — a current invariant of `normalizeImages` but not enforced by the type system), the error escapes the library as a plain `Error` with a third-party message and no `code`. Every other failure mode in this package surfaces as `InvalidInputError` / `PathValidationError` / `ResourceLimitError` with a stable code.

**Suggested change:** Wrap the `pixelmatch` call in `try`/`catch`; on catch, throw a new `ComparisonError extends Error` (or reuse `InvalidInputError` with a distinct message) with `code: 'ERR_PIXELMATCH_FAILURE'` and `cause: originalError`. Adds one error class to the public surface — list it in `src/errors.ts` and `src/index.ts`. Even though the codepath is in practice unreachable today, the wrapper keeps the error contract uniform.

## [API-02] `comparePngAsync` accepts no `AbortSignal`

**Priority:** P2  
**Status:** Open  
**Problem:** Long-running async comparisons cannot be cancelled. Large images (16k × 16k canvas), slow disks, or backed-up CI runners can keep `comparePngAsync` busy for several seconds with no caller-controlled bail-out. Node 20+ supports `AbortSignal.timeout(...)`, and `fs.promises.readFile` / `writeFile` accept `{ signal }` natively. The library should accept and honor a caller-supplied signal.

**Files to modify:**

- `src/types/compare.options.ts` — add `signal?: AbortSignal;` to `ComparePngOptions` with TSDoc clarifying it only applies to `comparePngAsync` (sync API cannot honor an abort)
- `src/pipeline/resolveOptions.ts` — pass through (no validation needed beyond `instanceof AbortSignal`)
- `src/ports/fsAsyncImageSource.ts` — pass `{ signal: opts.signal }` to `readFile`
- `src/ports/fsAsyncDiffWriter.ts` — pass `{ signal: opts.signal }` to `writeFile`
- `src/comparePngAsync.ts` — check `opts.signal?.aborted` and throw an `AbortError` (or `signal.reason`) before each synchronous compute step (`PNG.sync.read`, `pixelmatch`); after the `Promise.all` if the signal aborted mid-load
- `src/errors.ts` — optionally add `AbortError` (or rely on Node's built-in `DOMException` with `name: 'AbortError'`); document the choice

**Acceptance criteria:**

- `await comparePngAsync(p1, p2, { signal: AbortSignal.timeout(50) })` rejects with an abort error if the comparison would have taken longer
- Calling `controller.abort()` mid-flight rejects the in-flight promise
- The sync `comparePng` API is unchanged (signal is silently ignored or throws on use — pick one and document)
- New `__tests__/comparePngAsync.abort.test.ts` covers (a) abort-before-start, (b) abort-during-load, (c) abort-after-compare-before-write, (d) `AbortSignal.timeout` integration

## [API-03] No way to obtain the diff PNG bytes without writing them to disk

**Priority:** P3  
**Status:** Open  
**Problem:** Callers who want the diff in memory — to ship over HTTP, attach to a CI report, render in a UI — must set `diffFilePath` to a tmp path and re-read the file. The internal pipeline already builds the diff `PNG` in `runComparison`; throwing it away after `persistDiff` is the only reason callers need the round-trip.

**Suggested change:** Add an opt-in mode that returns the diff buffer alongside the count. Two shapes worth considering: (a) `comparePngWithResult(png1, png2, opts?): { mismatchedPixels: number; diff?: Buffer }` as a sibling function, leaving the existing `comparePng` signature untouched; (b) a `returnDiffBuffer?: boolean` option that changes the return type of the existing function via overload. (a) is cleaner from a typing standpoint. Either way, the same diff bytes `persistDiff` would have written are returned via `PNG.sync.write(...)`.

## [API-04] `diffFilePath` / `inputBaseDir` / `diffOutputBaseDir` accept only `string`

**Priority:** P3  
**Status:** Open  
**Problem:** Modern Node APIs (`fs.readFile`, `fs.writeFile`, `path.resolve`, etc.) accept `string | URL` for file paths. ESM consumers commonly build paths from `import.meta.url` via `new URL('./fixtures/a.png', import.meta.url)`. This library forces those callers to call `fileURLToPath` themselves before invoking `comparePng`.

**Suggested change:** Update `ComparePngOptions.diffFilePath`, `inputBaseDir`, `diffOutputBaseDir` types to `string | URL`. In `validatePath` (or at the boundary in `resolveOptions`), convert via `fileURLToPath` when the value is a `URL`. Convert string image inputs (`png1` / `png2`) similarly if they're `URL` instances. Add one TSDoc note per option and one round-trip test.

## [API-05] No verbose-result accessor for callers wanting comparison metadata

**Priority:** P3  
**Status:** Open  
**See also:** API-03 (in-memory diff buffer) — these can share a result shape  
**Problem:** `comparePng` / `comparePngAsync` return only `number` (mismatched pixel count). Callers wanting "was the diff written?", "what canvas size was used after normalization?", "did the inputs differ in dimensions?" can only get those answers by inspecting the filesystem after the call, or by re-deriving them externally.

**Suggested change:** Add a sibling `comparePngWithResult(...)` (and `comparePngAsyncWithResult(...)`) that returns:

```ts
type ComparePngResult = {
    readonly mismatchedPixels: number;
    readonly width: number; // normalized canvas
    readonly height: number; // normalized canvas
    readonly sizeDelta: { readonly width: number; readonly height: number }; // |first - second| per axis
    readonly diffWritten: boolean;
    readonly diffPath?: ValidatedPath;
    readonly diff?: Buffer; // present iff API-03's returnDiffBuffer is true
};
```

Coordinate with API-03 so the verbose mode and the diff-buffer mode share one result type. Leave `comparePng` / `comparePngAsync`'s `number` return unchanged for backward compatibility.

## [TEST-02] Add a benchmark suite so PERF items have a verifiable acceptance gate

**Priority:** P2  
**Status:** Open  
**Requires:** PERF-02a preferred (the spike baseline numbers seed the bench thresholds)  
**Problem:** PERF-02a is explicitly a human spike for benchmarking, and PERF-04, PERF-06, PERF-07 have no objective acceptance gate. "Measurably faster than baseline" is unfalsifiable without a baseline committed to source.

**Files to create:**

- `bench/addColoredAreasToImage.bench.ts` — `vitest bench` exercising a `4096×4096` PNG with a full-image excluded area (matches PERF-02a's scenario)
- `bench/extendImage.bench.ts` — `2048×2048` extended to `4096×4096` (covers PERF-06 padding path)
- `bench/normalize-and-compare.bench.ts` — full pipeline against same-size and different-size inputs (covers PERF-04 clone-elision)
- `package.json` — add `"test:bench": "vitest bench --run"` so the suite is opt-in and doesn't bloat `npm test`
- `vitest.config.mjs` — add a `bench` block if needed

**Acceptance criteria:**

- `npm run test:bench` produces stable per-iteration timings
- PERF-02b, PERF-04, PERF-06, PERF-07 each reference a specific bench file as their measurement source
- Benches are not gated in CI by default (perf is noisy on shared runners); they're a local/offline tool plus an opt-in CI job

## [TEST-03] Add a public-API integration test against the built artifact

**Priority:** P2  
**Status:** Open  
**Problem:** All current tests import from `../src`. The published `out/` bundle is never exercised end-to-end. A regression in `tsconfig.prod.json`, the `exports` map, the `.d.ts` shape, or the CJS/ESM split for `vitest.mts` would pass `npm test` and only surface when consumers fail to install.

**Files to create:**

- `scripts/pack-test.mjs` — runs `npm pack`, installs the resulting tarball into a tmp dir, spawns one CJS smoke test (`require('png-visual-compare').comparePng(p1, p2)`) and one ESM smoke test (`import {comparePng} from 'png-visual-compare'`), and exits non-zero on any failure
- `package.json` — add `"test:integration": "node ./scripts/pack-test.mjs"` and wire into `prepublishOnly`
- `.github/workflows/test.yml` — add an `integration` job that runs after `ubuntu` / `macos` and executes `npm run test:integration`

**Acceptance criteria:**

- The packed tarball is installable and importable via both CJS and ESM resolution
- The integration test fails fast if `exports` map drift breaks any subpath (`.`, `./vitest`, `./jest`)
- `npm publish` is blocked unless the integration test passes

## [TEST-04] Add mutation testing

**Priority:** P3  
**Status:** Open  
**Problem:** 100 % branch coverage is achieved by the existing suite but does not measure whether tests would _detect_ breaking mutations (e.g. flipped boolean, off-by-one, dropped throw). For a security-sensitive library where `validatePath` and `getPngData` are the trust boundary, mutation coverage is the more meaningful signal.

**Suggested change:** Add Stryker (`@stryker-mutator/core` + `@stryker-mutator/vitest-runner`) as a dev dependency, configure a `stryker.config.json` that mutates only `src/`, and add `npm run test:mutation` (kept off the default `npm test` because mutation runs are slow). Target mutation score ≥ 80 % overall, ≥ 95 % for `src/validatePath.ts` and `src/getPngData.ts`.

## [TEST-05] Add a fuzz test for malformed PNG buffers

**Priority:** P3  
**Status:** Open  
**Problem:** `getPngData.ts` rejects oversized headers via IHDR peek, but inputs that pass the IHDR check and only fail later in `PNG.sync.read` are exercised only by the small set of hand-crafted fixtures in `__tests__/getPngData.test.ts`. Adversarial inputs in this gap are exactly what production callers may encounter.

**Suggested change:** Add `fast-check` as a dev dependency. Write `__tests__/getPngData.fuzz.test.ts` that generates buffers starting with the valid PNG signature + a randomized IHDR within `maxDimension` and random IDAT bytes. Assert: the call either returns a valid `LoadedPng` _or_ throws `InvalidInputError` — never throws `RangeError` or hangs. Time-box each run to keep CI fast.

## [TEST-06] Add type-level regression tests

**Priority:** P3  
**Status:** Open  
**Problem:** Nothing asserts that the public type surface stays stable. A refactor that changes `comparePng`'s return to `number | undefined`, drops a field from `ComparePngOptions`, or relaxes an error class's `code` field would pass `npm test`.

**Suggested change:** Add `__tests__/types/public-surface.test-d.ts` (or use `vitest`'s `expectTypeOf`) with assertions: `expectTypeOf(comparePng).returns.toEqualTypeOf<number>()`, `expectTypeOf<InvalidInputError['code']>().toEqualTypeOf<'ERR_INVALID_PNG_INPUT'>()`, etc. Run alongside the regular suite (no extra script needed; vitest picks them up).

## [TEST-07] `tools/excluded-areas-builder.html` JS has only Playwright E2E coverage

**Priority:** P3  
**Status:** Open  
**Problem:** The 688-line HTML tool embeds non-trivial JavaScript for coordinate math, hit-testing, and area normalization. Coverage of that JS is zero at the unit level — only the Playwright happy-path E2E exercises it through a browser.

**Suggested change:** Either (a) extract the embedded JS into one or more ESM modules under `tools/excluded-areas-builder/` that the HTML imports via `<script type="module" src="...">`, then unit-test those modules with the regular vitest harness, or (b) accept the trade-off and add a CONTRIBUTING note acknowledging the tool's coverage gap. Option (a) is preferred because the tool's coord math is exactly the kind of code where regressions are easy and tests are cheap.

## [DOC-01] `BACKLOG.md` Cross-Cutting Conventions frontmatter is stale (RELI-03 has shipped)

**Priority:** P2  
**Status:** Open  
**Problem:** The preamble of this file (Cross-Cutting Agent Conventions section, near the top) says:

> "Structured errors (`RELI-03`) are the approved error base once that item lands; until then use plain `Error` with a `// TODO: use structured error after RELI-03` comment"

`RELI-03` is `Done` (verified in Wave 1). The instruction now points future contributors at a workaround that no longer exists, and could cause new code to use plain `Error` "temporarily" — a regression.

**Files to modify:**

- `BACKLOG.md` — replace the stale bullet with: "Always throw structured errors from `src/errors.ts` (`InvalidInputError` / `PathValidationError` / `ResourceLimitError`). Keep `TypeError` only for API-misuse paths where the caller passed a value of the wrong shape."

**Acceptance criteria:**

- The preamble does not reference RELI-03 as pending
- The convention reflects the post-RELI-03 reality
- No source file in `src/` contains a `TODO: use structured error after RELI-03` comment (grep, fix any survivors as part of this item)

## [DOC-02] Add `SECURITY.md` for vulnerability disclosure

**Priority:** P2  
**Status:** Open  
**Requires:** SECU-06 preferred (cross-link to the README security model section)  
**Problem:** This library exposes `inputBaseDir`/`diffOutputBaseDir` as security boundaries, defends against PNG decode bombs via `maxDimension` / `maxPixels`, and has documented TOCTOU caveats. It is the kind of package that will eventually receive a vulnerability report. There is no `SECURITY.md`, so the GitHub Security tab is empty and reporters have no clear channel.

**Files to modify:**

- New `SECURITY.md` at repo root — sections: Supported Versions (point to the current major), Reporting a Vulnerability (private disclosure channel — GitHub private advisory or the maintainer's email), Response SLA (best-effort, OSS norms), Scope (path traversal, resource exhaustion, decode bombs — link to the README security model from SECU-06), Out of Scope (third-party CVEs in `pngjs` should be reported upstream)
- `README.md` — add a brief "Security" callout linking to `SECURITY.md`
- `package.json` — no changes required (npm picks up `SECURITY.md` automatically)

**Acceptance criteria:**

- `SECURITY.md` exists with a working reporting channel
- The GitHub "Security" tab surfaces the policy
- README links to it
- The reporting channel is staffed (i.e. the email is a real address the maintainer reads)

## [DOC-03] `CLAUDE.md` and `.github/copilot-instructions.md` duplicate guidance with drift

**Priority:** P3  
**Status:** Open  
**Problem:** Both files redundantly describe npm scripts, test patterns, and architecture invariants. The wording has already diverged in multiple places — "skips pretest steps" vs "skips pretest", different `npm run test` descriptions, slightly different command tables. As the project evolves, the drift will widen and one of the two files will silently become wrong.

**Suggested change:** Pick one canonical source (suggest `CLAUDE.md` since it predates `.github/copilot-instructions.md`) and either (a) delete the other and add a one-line file at the deleted path saying "See CLAUDE.md", or (b) extract the duplicated sections into a shared `docs/agent-guide.md` that both files transclude or reference. (a) is the smaller change.

## [DOC-04] Public function JSDoc is sparse

**Priority:** P3  
**Status:** Open  
**Problem:** `src/comparePng.ts:28` has a one-line JSDoc (`/** Compare two PNG inputs and return the mismatched pixel count. */`). `src/comparePngAsync.ts:27` has no JSDoc at all. The exported functions are the primary public contract; their hover documentation in IDEs is the first thing a consumer reads.

**Suggested change:** Add full JSDoc blocks to both functions covering `@param`, `@returns`, `@throws` (`InvalidInputError`, `PathValidationError`, `ResourceLimitError`), and an `@example` short snippet. The `ComparePngOptions` field-level docs are already strong; the function-level docs just need to point at the failure modes and the contract.

## [DOC-05] `docs/ARCHITECTURE.md` and `BACKLOG.md` don't cross-link

**Priority:** P3  
**Status:** Open  
**Problem:** `docs/ARCHITECTURE.md` describes the _current_ state of the codebase post-refactor. `BACKLOG.md` tracks the _outstanding_ state. Neither file references the other, so a newcomer reading either has no signpost to the matching half.

**Suggested change:** Add a one-line cross-reference near the top of each file: in `docs/ARCHITECTURE.md`, "Tracked follow-on work and refactors lives in [BACKLOG.md](../BACKLOG.md)." In `BACKLOG.md`, "See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the current shipped architecture." Costs nothing; meaningfully improves discoverability.

## [BUILD-01] `tsconfig.prod.json` overrides `noEmit` from its parent

**Priority:** P3  
**Status:** Open  
**Problem:** `tsconfig.json` sets `noEmit: true`; `tsconfig.prod.json` `extends` it and overrides `noEmit: false`. The extension-then-override is functionally correct but slightly confusing: a reader has to mentally re-apply the override. Conventional TS project layouts use a neutral base config that defines neither flag, and let each leaf config opt in.

**Suggested change:** Add `tsconfig.base.json` containing the shared compiler options minus `noEmit`. Update `tsconfig.json` (dev) and `tsconfig.prod.json` (prod) to extend `tsconfig.base.json` and each set `noEmit` for their own use. Cosmetic; no runtime impact.

## [BUILD-02] `moduleResolution: "node16"` lags behind `module: "nodenext"`

**Priority:** P3  
**Status:** Open  
**Problem:** `tsconfig.json` declares `module: "nodenext"` but `moduleResolution: "node16"`. TypeScript 5.4+ docs recommend `nodenext` for both when targeting Node's current ESM/CJS rules. Both currently resolve identically, but the mismatch is the kind of thing that surfaces edge cases on future TS upgrades (e.g. when `nodenext` adds new resolution behavior that `node16` doesn't).

**Suggested change:** Set `moduleResolution: "nodenext"` in `tsconfig.json`. Run `npm run typecheck` and `npm test` after the change to confirm no resolution drift.

## [BUILD-03] `package.json#exports` for `.` lacks explicit `import` / `require` conditions

**Priority:** P3  
**Status:** Open  
**Problem:** `package.json#exports."."` has only `types` and `default`. The package is currently CJS (no `type: module`), so Node resolves both `import` and `require` to the same file via the `default` condition. Functional today, but: (a) the intent of which file serves which resolution path is implicit, (b) the day a `.mjs` build is added (e.g. for a tree-shakable ESM entry), the missing conditions become a hazard.

**Suggested change:** Promote `"."` to an explicit conditional object: `{ "types": "./out/index.d.ts", "import": "./out/index.js", "require": "./out/index.js", "default": "./out/index.js" }`. Same files today; future-proof for a dual build.

## [BUILD-04] No SBOM emitted by `publish.yml`

**Priority:** P3  
**Status:** Open  
**Problem:** `.github/workflows/publish.yml` runs `npm audit --audit-level=high` and `npm publish --provenance`. It does not produce a Software Bill of Materials (CycloneDX or SPDX) and does not attach one to the GitHub release. SBOMs are increasingly expected for security-sensitive libraries by both enterprise consumers and several emerging regulatory frameworks.

**Suggested change:** Add a CI step that runs `npx @cyclonedx/cdxgen -o sbom.json` (or equivalent SPDX tooling), then uploads `sbom.json` as a release asset via `softprops/action-gh-release`. One additional step; one additional file per release.

## [BUILD-05] `tsconfig.prod.json` does not strip `@internal` tags from emitted `.d.ts`

**Priority:** P3  
**Status:** Open  
**Requires:** SECU-07 or TYPE-05 — only useful once `@internal` annotations are actually used  
**Problem:** `tsconfig.prod.json` does not set `stripInternal: true`. If SECU-07 / TYPE-05 adopt `@internal` JSDoc annotations to mark `comparePngWithPorts` and the port interfaces as test seams, those tags currently flow through to `out/*.d.ts` and are visible to consumers (as commented-out types or, with some tooling, even importable).

**Suggested change:** Set `stripInternal: true` in `tsconfig.prod.json` so emitted declarations omit symbols tagged `@internal`. Verify by grepping `out/*.d.ts` after a build for any surviving `@internal` references.

## [BUILD-06] `tsconfig.json#_version` is a non-standard field

**Priority:** P3  
**Status:** Open  
**Problem:** `tsconfig.json` sets `"_version": "22.0.0"` at the top level. TypeScript's tsconfig schema (json.schemastore.org) does not define `_version`. The field is either a custom annotation (then it should have a one-line comment explaining its purpose) or a leftover from an external tool / generator.

**Suggested change:** Either remove the field, or add a `//` comment immediately above it documenting what produces or consumes it. Tooling that strips unknown fields would otherwise quietly drop it.

## [DEPS-01] `@types/pngjs` lags one major behind runtime `pngjs`

**Priority:** P3  
**Status:** Open  
**Problem:** Runtime dependency is `pngjs ~7.0.0`; the types package is pinned to `@types/pngjs ~6.0.5`. The library currently compiles and runs because `PNGWithMetadata` / `PNG.sync.read` / `PNG.bitblt` are unchanged across the boundary. Any pngjs 7-specific surface — new fields, refined return shapes, removed deprecated methods — will silently be typed as the 6.x shape in our compile units.

**Suggested change:** Track upstream `@types/pngjs`; bump to `~7.x.x` when published. Until then, document the mismatch in `CONTRIBUTING.md` under a "Known dependency mismatches" subsection so future contributors don't bisect into it. Optionally add a comment in `package.json` near the `@types/pngjs` line (via the `npm-package-json-lint` extension or a sibling `package.json` note file).

## [DEPS-02] `dependabot.yml` doesn't cover the `docker` ecosystem

**Priority:** P3  
**Status:** Open  
**Problem:** The repo ships a `Dockerfile` using `node:24-slim`. `.github/dependabot.yml` is configured for `npm` and `github-actions` but not `docker`. The base image won't be auto-bumped when Node 24 patch releases land or when `node:24-slim` is replaced by a successor tag.

**Suggested change:** Add a third entry to `.github/dependabot.yml`:

```yaml
- package-ecosystem: 'docker'
  directory: '/'
  schedule:
      interval: 'weekly'
```

## [DEPS-03] `peerDependencies` hard upper bounds will need bumps for major releases

**Priority:** P3  
**Status:** Open  
**Problem:** `package.json#peerDependencies` declares `jest >=29 <31` and `vitest >=4.1.0 <5`. When jest 31 or vitest 5 release, consumers on the new major will see `EPEERINVALID` install errors (or warnings, depending on npm config) until this package republishes with a relaxed range. The lag between upstream release and our re-publish is the window of broken installs.

**Suggested change:** Either (a) automate the watch: add a scheduled GitHub Action that runs `npm view jest version` and `npm view vitest version` weekly and opens an issue when a new major appears, or (b) relax to `>=29` / `>=4.1.0` (no upper bound) and accept the risk that an incompatible upstream major would slip through. (a) is the safer default.

## [DX-01] `tool:excluded-areas-builder` script is brittle inline node `-e`

**Priority:** P3  
**Status:** Open  
**Problem:** `package.json#scripts.tool:excluded-areas-builder` uses `node -e "const { execFileSync } = require('node:child_process'); if (process.platform === 'darwin') { execFileSync('open', ['tools/excluded-areas-builder.html'], { stdio: 'inherit' }); } else if (process.platform === 'linux') { execFileSync('xdg-open', ['tools/excluded-areas-builder.html'], { stdio: 'inherit' }); } else { throw new Error('Unsupported platform: development tooling is only supported on macOS and Linux'); }"`. The inline string is unreadable, hard to maintain, and unparseable by package-json linters or codemod tools.

**Suggested change:** Extract into `scripts/open-tool.mjs` taking a tool name argument; the script entry becomes `"tool:excluded-areas-builder": "node ./scripts/open-tool.mjs excluded-areas-builder"`. The new script can use a small switch on the tool name so future tools (if any) reuse the same launcher.

## [DX-02] No `npm run dev` / watch-mode script

**Priority:** P3  
**Status:** Open  
**Problem:** Inner-loop editing requires running `npx vitest --reporter=verbose` directly. `CLAUDE.md` documents this, but `npm run dev` is the universal contributor expectation. Without it, every new contributor reads docs to find the command.

**Suggested change:** Add `"dev": "vitest --reporter=verbose"` to `package.json#scripts`. Document in CONTRIBUTING.md alongside the existing command table.

## [DX-03] `pretest:unit` chain is long; no fast-path for inner-loop iteration

**Priority:** P3  
**Status:** Open  
**Problem:** `pretest:unit` runs `clean → lint → format:check → test:license → typecheck` before vitest fires. The full sequence takes ~10–30 s before any test executes. For iterative work on a single test, this is excessive — CLAUDE.md acknowledges it and recommends `npx vitest run` to bypass the gates.

**Suggested change:** Add `"test:fast": "vitest run"` to `package.json#scripts` so the inner-loop has its own named entry. Keep `test:unit` as the thorough gate. Document the trade-off in CONTRIBUTING.md: `test:fast` for inner-loop, `test:unit` before pushing, `test` before opening a PR.

## [DX-04] No `.editorconfig`

**Priority:** P3  
**Status:** Open  
**Problem:** `.prettierrc` configures formatting for Prettier users, but `.editorconfig` is the cross-IDE standard for indent style, line endings, charset, and final-newline rules. JetBrains, Sublime, and many other editors honor `.editorconfig` natively without a Prettier plugin; new contributors using those editors will format inconsistently until Prettier runs.

**Suggested change:** Add a minimal `.editorconfig` at the repo root:

```
root = true

[*]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{json,jsonc}]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

Mirrors the existing Prettier config so the two systems agree.

## [DX-05] No pre-commit hook for format + lint

**Priority:** P3  
**Status:** Open  
**Problem:** Contributors can commit code that fails `npm run lint` or `npm run format:check`. CI catches it via `pretest:unit`, but the feedback loop is minutes instead of seconds, and a failing CI on a freshly opened PR is noisy.

**Suggested change:** Add `simple-git-hooks` (or `husky`) as a dev dependency with a pre-commit hook running `lint-staged` over staged files. `lint-staged.config.json`:

```json
{
    "*.{ts,mts,mjs,js}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

Plus a `prepare` script that activates the hook on `npm install`. Small dev-dep cost; tight inner-loop feedback.

## [CI-01] `test.yml` triggers on `push` only, not `pull_request`

**Priority:** P3  
**Status:** Open  
**Problem:** `.github/workflows/test.yml` has `on: push: branches-ignore: ['release/*']` only. Branch pushes from contributors with write access trigger CI, but pull requests opened from forks do not — GitHub's fork-PR security model requires an explicit `pull_request` (or `pull_request_target` with caveats) trigger for the workflow to attach to a PR review. If fork PRs are accepted in this repo's policy, the workflow currently fails to cover them. If not, the omission should be made intentional and documented.

**Suggested change:** Either (a) add `pull_request: branches: ['main']` to the trigger so fork PRs run CI under the read-only token (safe for build/test, not for secret-using steps), or (b) document in `CONTRIBUTING.md` that fork PRs are not currently accepted and explain why. (a) is the standard pattern.

## [CI-02] No CodeQL / SAST scanning configured

**Priority:** P3  
**Status:** Open  
**Problem:** A security-sensitive library defending against path traversal, TOCTOU races, and resource exhaustion runs no static-analysis security scan. GitHub provides CodeQL free for public repos and it surfaces classes of bugs that test coverage doesn't (e.g. taint flow from user input to filesystem APIs).

**Suggested change:** Add `.github/workflows/codeql.yml` using the standard template — runs on `push: branches: ['main']`, on `pull_request`, and on a weekly schedule. Default queries (`security-and-quality`) are sufficient.

## [CI-03] No Dependency Review Action on PRs

**Priority:** P3  
**Status:** Open  
**Problem:** `actions/dependency-review-action` catches new vulnerable / unlicensed / wrong-tier dependencies introduced by a PR _before_ they merge. The only dep-hygiene gate today is `npm audit --audit-level=high` in `publish.yml`, which runs after a release is cut — too late.

**Suggested change:** Add a `dependency-review` job to `test.yml` (or a dedicated `pr-checks.yml`) gated on `pull_request`. Use the action's `fail-on-severity: high` and `comment-summary-in-pr: always` settings.

## [CI-04] No coverage report uploaded to an external tracker

**Priority:** P3  
**Status:** Open  
**Problem:** `npm run test:unit` runs `--coverage` and enforces 100 % thresholds locally and in CI. The coverage report is computed in `coverage/` but never uploaded to Codecov, Coveralls, or any external tracker. PRs don't show coverage deltas, and reviewers can't see at a glance what new code is covered.

**Suggested change:** Add a `codecov/codecov-action@v5` step to `test.yml` after the test run, with the project token. Codecov surfaces per-PR coverage deltas and adds a status check; if the 100 % threshold ever slips, the PR's check goes red even if the suite itself doesn't fail. Add the `codecov.yml` config at the repo root if custom thresholds are wanted.

## [CI-05] `publish.yml` uses unpinned action versions

**Priority:** P3  
**Status:** Open  
**Problem:** `test.yml` SHA-pins its third-party actions (`actions/checkout@de0fac2…@v6`, `actions/setup-node@53b83947…@v6`) — supply-chain best practice that prevents a compromised tag from silently injecting code. `publish.yml` uses only the soft `@v6` reference (lines 20, 21). The publish workflow runs with `NODE_AUTH_TOKEN` — i.e. it is the _more_ security-sensitive of the two — and should be pinned at least as strictly as the test workflow.

**Suggested change:** SHA-pin `actions/checkout` and `actions/setup-node` in `publish.yml` to match the pins already used in `test.yml`. Add a comment explaining the pinning policy so future bumps maintain it. Dependabot will update SHA-pinned action references automatically.

---

## Agent Execution Order

The following sequence ensures each item is unblocked, self-contained, and the test suite stays green after every merge:

| Sprint  | Item(s)       | Why This Order                                                                                                                                              |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **RELI-03**   | Establishes structured error classes used by all subsequent items                                                                                           |
| 1       | **PERF-01**   | Zero-dependency, high-value, one-file change                                                                                                                |
| 1       | **TYPE-02**   | Zero-dependency, type-only, no behavior change                                                                                                              |
| 2       | **SECU-01**   | RELI-03 errors available; isolated to `validatePath.ts`                                                                                                     |
| 2       | **SECU-02**   | RELI-03 errors available; isolated to options parsing                                                                                                       |
| 2       | **RELI-01**   | RELI-03 errors available; isolated to new `validateArea.ts`                                                                                                 |
| 3       | **RELI-02**   | Builds on validated-boundary pattern from RELI-01                                                                                                           |
| 3       | **TYPE-03**   | Formalizes RELI-02 adapter; immediate follow-on                                                                                                             |
| 3       | **TEST-01a**  | No unresolved dependencies; exercises items from sprints 1–2                                                                                                |
| 4       | **ARCH-01**   | Large refactor; foundation for API-01 and TEST-01b                                                                                                          |
| 4       | **TYPE-01**   | Cleaner after ARCH-01 resolves mutable field                                                                                                                |
| 5       | **RELI-04**   | Requires TYPE-01 union                                                                                                                                      |
| 5       | **API-01a/b** | Requires ARCH-01 pipeline stages                                                                                                                            |
| 6       | **API-01c/d** | Requires API-01a/b                                                                                                                                          |
| 6       | **TEST-01b**  | Requires API-01b ports                                                                                                                                      |
| Backlog | **PERF-02b**  | Requires human spike (PERF-02a) first                                                                                                                       |
| Backlog | **PERF-03**   | Requires human spike first                                                                                                                                  |
| 7       | **SECU-03**   | New P1 finding (2026-05-12 audit); no `Requires:`; closes TOCTOU window on diff write. Adds two ports-symlink test files but does not block any other item. |
