# Backlog

Atomic, testable follow-up items from the architecture-focused review.

> **AI-Agent Refinement Notice**
> This backlog has been refined for execution by an AI coding agent. Each item now includes:
> exact files to create/modify, prescribed function signatures and type shapes,
> pre-decided policies (no open design questions), explicit test case descriptions,
> and a dependency ordering table at the end.
> Items that are not yet agent-ready are marked **BLOCKED** or **SPIKE**.

---

## Cross-Cutting Agent Conventions

The following rules apply to every item unless the item explicitly overrides them:

- **Imports within `src/`** use extensionless relative paths: `import { foo } from './foo'`
- **Tests import from `../src`**, never from `../out`
- **One type per file** in `src/types/`; collected by `src/types/index.ts`
- **Data-driven test pattern**: new test cases are added to `testDataArray` in the relevant test file, not as standalone `test()` calls
- **No test helper modules** — each test file is self-contained
- **Coverage thresholds** (enforced by vitest): 90 % lines/functions/statements, 75 % branches
- **New production dependencies** require advisory database review and license approval (`ISC`, `MIT`, `BSD`, `Apache-2.0`, `Unlicense`)
- **Structured errors** (`RELI-03`) are the approved error base once that item lands; until then use plain `Error` with a `// TODO: use structured error after RELI-03` comment

## [ARCH-01] Split `comparePng` into an explicit comparison pipeline

**Priority:** P0  
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
- `CHANGELOG.md` — add `## [2.0.0]` section noting removal of `PngData`

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
**Requires:** nothing  
**Problem:** `src/comparePng.ts` creates `new PNG({ width: maxWidth, height: maxHeight })` unconditionally, even when `diffFilePath` is not provided.

**Technical rationale:** This doubles memory pressure for the common "compare only" case and becomes expensive on large images. It is a concrete, immediate inefficiency with no upside.

**File to modify:** `src/comparePng.ts`

**Exact change:**
```ts
// REMOVE:
const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });

// REPLACE WITH:
const diff: PNG | undefined = shouldCreateDiffFile
  ? new PNG({ width: maxWidth, height: maxHeight })
  : undefined;

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
     throw new Error(`Image pixel count (${dims.width * dims.height}) exceeds the maximum allowed ${maxPixels} pixels. Set opts.maxPixels to increase the limit.`);
   ```

2. In `comparePng.ts`, after `maxWidth`/`maxHeight` are computed, before diff allocation:
   ```ts
   if (maxWidth * maxHeight > maxPixels)
     throw new Error(`Normalized canvas pixel count (${maxWidth * maxHeight}) exceeds the maximum allowed ${maxPixels} pixels. Set opts.maxPixels to increase the limit.`);
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
**Requires:** RELI-03 preferred (use structured errors); acceptable to use plain `Error` with TODO comment until RELI-03 lands  
**Problem:** `src/addColoredAreasToImage.ts` assumes area coordinates are finite integers with a valid ordering, but `ComparePngOptions` accepts unchecked `number` fields.

**Technical rationale:** Floats, `NaN`, `Infinity`, or reversed coordinates can silently produce partial writes, no-ops, or non-index buffer property writes. This is a correctness bug disguised as permissive input handling.

**Pre-decided policy:** Reversed coordinates (`x1 > x2` or `y1 > y2`) are **rejected with an error** — not silently normalized. This is consistent with the fail-fast posture of the rest of the library and avoids masking caller bugs.

**New file:** `src/validateArea.ts`

```ts
export function validateArea(area: Area, index: number): void
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
Add: *"All coordinates must be finite integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized."*

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
**Requires:** RELI-03 preferred; acceptable to use plain `Error` with TODO comment  
**Problem:** `src/comparePng.ts` forwards `opts.pixelmatchOptions` directly to `pixelmatch` without any runtime validation.

**Technical rationale:** This makes caller errors depend on downstream library behavior and weakens the package's API contract. It also creates version-coupling pressure because the wrapper does not own its boundary.

**New file:** `src/validatePixelmatchOptions.ts`

```ts
export function validatePixelmatchOptions(opts: PixelmatchOptions): void
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
  if (!Array.isArray(value) || value.length !== 3)
    throw new Error(`${name} must be a tuple of 3 integers in [0, 255]`);
  for (const ch of value) {
    if (!Number.isInteger(ch) || ch < 0 || ch > 255)
      throw new Error(`${name} channel values must be integers in [0, 255]`);
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
**Requires:** RELI-02 (adapter already exists; TYPE-03 formalizes it — implement immediately after RELI-02)  
**Problem:** `src/types/compare.options.ts` mirrors `pixelmatch` options directly, making the public API structurally dependent on a third-party library contract.

**Technical rationale:** This increases upgrade risk. If `pixelmatch` changes option names, types, or semantics, this library inherits that churn in its public surface even if the desired wrapper API should remain stable.

**New file:** `src/adapters/toPixelmatchOptions.ts`
```ts
export function toPixelmatchOptions(opts: PixelmatchOptions): PixelmatchRawOptions
// where: type PixelmatchRawOptions = Parameters<typeof pixelmatch>[4]
```

**Files to modify:**
- `src/comparePng.ts` — replace direct `opts?.pixelmatchOptions` pass-through:
  ```ts
  // BEFORE: opts?.pixelmatchOptions
  // AFTER:  opts?.pixelmatchOptions ? toPixelmatchOptions(opts.pixelmatchOptions) : undefined
  ```
- `src/types/compare.options.ts` — no shape change; update JSDoc to say:
  *"These options are translated internally via an adapter. The public names are stable even if the underlying pixelmatch library changes."*

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
**Note: This Epic is decomposed into 4 sequential sub-items. The original item is replaced by [API-01a] through [API-01d] below.**

---

### [API-01a] Define I/O port interfaces (no behavior change)

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

**Requires:** API-01b  
**New file:** `src/comparePngAsync.ts`
```ts
export async function comparePngAsync(
  png1: string | Buffer,
  png2: string | Buffer,
  opts?: ComparePngOptions
): Promise<number>
```
Use `fs.promises.readFile` and `fs.promises.writeFile` internally.  
Export from `src/index.ts`.

**New test file:** `__tests__/comparePngAsync.test.ts`
Must cover the same cases as `comparePng.test.ts`, but `await`ed.

---

### [API-01d] Documentation and backward-compat validation

**Requires:** API-01c  
- Add `comparePngAsync` to `README.md` with usage example
- Add `CHANGELOG.md` entry under next minor version
- Run full test suite; verify `comparePng` (sync) behavior is unchanged

## [RELI-03] Introduce structured error classes/codes

**Priority:** P1  
**Requires:** nothing  
**Note: Implement first among P1 items — all other items depend on it.**  
**Problem:** Errors are currently plain `Error`/`TypeError`/`RangeError` strings spread across modules, and related failure modes use similar but inconsistent messages.

**Technical rationale:** Consumers have no stable way to branch on failure mode besides parsing text. This becomes brittle as the library gains more validation and security checks.

**New file:** `src/errors.ts`
```ts
export class InvalidInputError extends Error {
  readonly code = 'ERR_INVALID_PNG_INPUT' as const;
  constructor(message: string) { super(message); this.name = 'InvalidInputError'; }
}
export class PathValidationError extends Error {
  readonly code = 'ERR_PATH_VALIDATION' as const;
  constructor(message: string) { super(message); this.name = 'PathValidationError'; }
}
export class ResourceLimitError extends Error {
  readonly code = 'ERR_RESOURCE_LIMIT' as const;
  constructor(message: string) { super(message); this.name = 'ResourceLimitError'; }
}
```

Export all three from `src/index.ts` (they are public API).

**Complete throw-site migration inventory** (agent must update ALL):

| File | Current throw | New error class |
|---|---|---|
| `src/validatePath.ts` | `"Invalid file path: path must not be empty..."` | `PathValidationError` |
| `src/validatePath.ts` | `"Invalid file path: path must not contain null..."` | `PathValidationError` |
| `src/validatePath.ts` | `"Path traversal detected..."` | `PathValidationError` |
| `src/getPngData.ts` | `"Invalid PNG input: the source could not be loaded"` | `InvalidInputError` |
| `src/getPngData.ts` | `"Invalid PNG input: the data could not be parsed"` | `InvalidInputError` |
| `src/getPngData.ts` | `"Unknown PNG file input type"` | `InvalidInputError` |
| `src/getPngData.ts` | dimension-exceeded message (`assertDimensions`) | `ResourceLimitError` |
| `src/comparePng.ts` | `"Unknown PNG files input type"` | `InvalidInputError` |
| `src/comparePng.ts` | `"opts.diffFilePath must be a string..."` | Keep as `TypeError` — API misuse |
| `src/comparePng.ts` | `"opts.maxDimension must be a positive integer..."` | Keep as `TypeError` — API misuse |
| `src/validateColor.ts` | any invalid color error | `InvalidInputError` |

**Test changes required:**
All existing tests that use `.toThrow('message substring')` must **also** assert error type:
```ts
expect(err).toBeInstanceOf(PathValidationError)
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
  if (throwErrorOnInvalidInputData)
    throw new InvalidInputError('Invalid PNG input: image has zero dimensions');
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
**Note: This item is split into a human Spike and an agent Story. Do not execute PERF-02b without PERF-02a output.**

---

### [PERF-02a] SPIKE — establish benchmark baseline (**Not for AI agent execution**)

Human step: run a timing script against `addColoredAreasToImage` with a `4096×4096` image and a full-image excluded area. Record the result. Decide if improvement justifies the refactor.

---

### [PERF-02b] STORY — inline pixel writes (**Agent-ready only after PERF-02a**)

**Requires:** PERF-02a baseline established and the numeric result committed to this item.

**Files to modify:** `src/addColoredAreasToImage.ts`, `src/fillImageSizeDifference.ts`

**Exact change:** Replace `drawPixelOnBuff(image.data, pos, color)` with:
```ts
image.data[pos]     = color.r;
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
**Status: BLOCKED — awaiting human spike output**  
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
**Note: Split into [TEST-01a] (agent-ready now) and [TEST-01b] (blocked on API-01b).**

---

### [TEST-01a] Decision-logic unit tests (agent-ready now)

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

## Agent Execution Order

The following sequence ensures each item is unblocked, self-contained, and the test suite stays green after every merge:

| Sprint | Item(s) | Why This Order |
|--------|---------|----------------|
| 1 | **RELI-03** | Establishes structured error classes used by all subsequent items |
| 1 | **PERF-01** | Zero-dependency, high-value, one-file change |
| 1 | **TYPE-02** | Zero-dependency, type-only, no behavior change |
| 2 | **SECU-01** | RELI-03 errors available; isolated to `validatePath.ts` |
| 2 | **SECU-02** | RELI-03 errors available; isolated to options parsing |
| 2 | **RELI-01** | RELI-03 errors available; isolated to new `validateArea.ts` |
| 3 | **RELI-02** | Builds on validated-boundary pattern from RELI-01 |
| 3 | **TYPE-03** | Formalizes RELI-02 adapter; immediate follow-on |
| 3 | **TEST-01a** | No unresolved dependencies; exercises items from sprints 1–2 |
| 4 | **ARCH-01** | Large refactor; foundation for API-01 and TEST-01b |
| 4 | **TYPE-01** | Cleaner after ARCH-01 resolves mutable field |
| 5 | **RELI-04** | Requires TYPE-01 union |
| 5 | **API-01a/b** | Requires ARCH-01 pipeline stages |
| 6 | **API-01c/d** | Requires API-01a/b |
| 6 | **TEST-01b** | Requires API-01b ports |
| Backlog | **PERF-02b** | Requires human spike (PERF-02a) first |
| Backlog | **PERF-03** | Requires human spike first |
