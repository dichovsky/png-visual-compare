# Backlog

Atomic, testable follow-up items from the architecture-focused review.

## [ARCH-01] Split `comparePng` into an explicit comparison pipeline

**Priority:** P0  
**Problem:** `src/comparePng.ts` currently mixes option parsing, validation, security checks, image loading, in-place normalization, comparison, and diff persistence in one orchestration function.

**Technical rationale:** This is the main maintainability hotspot in the library. Every new feature now requires editing the same function, which increases coupling and makes it hard to add async I/O, alternative sources, or new normalization stages without regression risk.

**Implementation directions:**

- Introduce internal stages such as `resolveOptions`, `loadSources`, `normalizeImages`, `runComparison`, and `persistDiff`.
- Pass a typed `ComparisonContext` object between stages instead of mutating local variables across the function body.
- Keep the public API as `comparePng(...)`, but have it delegate to the internal pipeline.

**Acceptance criteria:**

- `comparePng.ts` becomes a thin orchestrator or wrapper.
- Each stage is unit-testable in isolation without file fixtures.
- Adding a new normalization step does not require editing more than one stage registry/wiring point.

## [TYPE-01] Replace `PngData` sentinel state with a discriminated result union

**Priority:** P0  
**Problem:** `src/getPngData.ts` returns `{ isValid: false, png: 0x0 PNG }` for invalid inputs, and `src/comparePng.ts` later reinterprets that sentinel.

**Technical rationale:** The current model encodes failure as fake success data. That weakens invariants, forces cross-function coordination through conventions, and makes it easy to accidentally process an invalid image as if it were real.

**Implementation directions:**

- Replace `type PngData = { isValid: boolean; png: PNGWithMetadata }` with a union such as:
  `type LoadedPng = { kind: 'valid'; png: PNGWithMetadata } | { kind: 'invalid'; reason: 'path' | 'decode' | 'type' }`.
- Stop exporting `PngData` from the public barrel unless there is a strong external use case.
- Update `comparePng` to branch on `kind` instead of boolean/sentinel checks.

**Acceptance criteria:**

- No internal code depends on a fake `0x0` PNG to represent failure.
- Exhaustive `switch`/narrowing is used when handling load results.
- Public API no longer exposes `pngjs` implementation types unless intentionally documented as stable.

## [TYPE-02] Introduce branded internal types for validated paths

**Priority:** P1  
**Problem:** `validatePath` returns a plain `string`, so the type system does not retain the fact that a path has already passed validation and containment checks.

**Technical rationale:** This leaves security-sensitive flow control entirely to developer discipline. As the codebase grows, it becomes easier to accidentally use raw caller-controlled strings in file I/O instead of validated paths.

**Implementation directions:**

- Introduce a branded type such as `type ValidatedPath = string & { readonly __validatedPath: unique symbol }`.
- Make `validatePath` return `ValidatedPath`.
- Update internal I/O-facing functions to accept `ValidatedPath` where validation is required.

**Acceptance criteria:**

- Raw strings cannot be passed to validated-path-only internals without an explicit validation step.
- Security-relevant path handling narrows through the type system instead of comments and convention.
- The public API remains ergonomic and backward compatible.

## [PERF-01] Allocate the diff image lazily

**Priority:** P0  
**Problem:** `src/comparePng.ts` creates `new PNG({ width: maxWidth, height: maxHeight })` unconditionally, even when `diffFilePath` is not provided.

**Technical rationale:** This doubles memory pressure for the common “compare only” case and becomes expensive on large images. It is a concrete, immediate inefficiency with no upside.

**Implementation directions:**

- Only allocate the diff PNG when `diffFilePath` is present.
- Keep `pixelmatch` output buffer `undefined` in compare-only mode.
- Add a regression test that proves compare-only mode does not instantiate a diff image.

**Acceptance criteria:**

- No diff PNG allocation occurs when `opts.diffFilePath` is absent.
- Existing compare-only behavior is unchanged.
- A test fails if a future refactor reintroduces unconditional diff allocation.

## [SECU-01] Make path containment checks symlink-safe

**Priority:** P0  
**Problem:** `src/validatePath.ts` explicitly documents that containment is lexical only and does not resolve symlinks.

**Technical rationale:** `inputBaseDir` and `diffOutputBaseDir` are positioned as security boundaries, but a symlink inside the allowed directory can still escape to an arbitrary target. That leaves a real file-read/file-write escape path in server-side usage.

**Implementation directions:**

- Resolve both `baseDir` and target paths through `fs.realpathSync.native` before containment checks.
- For output paths, validate the parent directory with `realpathSync` and handle non-existent leaf files safely.
- Add tests that create a symlink inside the base directory pointing outside it and verify rejection.

**Acceptance criteria:**

- Symlink-based escapes are rejected for both read and write paths.
- Existing valid non-symlink paths continue to work.
- Tests cover lexical traversal and symlink traversal separately.

## [SECU-02] Add decoded-size limits, not just axis limits

**Priority:** P0  
**Problem:** `maxDimension` guards width and height independently, but still allows images up to `16384 x 16384`, which implies roughly 1 GiB of decoded RGBA data before intermediate buffers.

**Technical rationale:** The current DoS protection is incomplete. A crafted image can stay within the per-axis cap while still forcing excessive allocation during decode, extension, or diff creation.

**Implementation directions:**

- Add `maxPixels` or `maxDecodedBytes` to `ComparePngOptions`.
- Enforce the limit during header peek before decode and again after size normalization.
- Lower the default resource ceiling to something aligned with library memory expectations.

**Acceptance criteria:**

- Oversized images are rejected based on total decoded size, not only per-axis size.
- Tests cover “allowed by maxDimension, rejected by maxPixels”.
- Documentation explains how to tune the limits intentionally.

## [RELI-01] Validate `excludedAreas` at runtime

**Priority:** P1  
**Problem:** `src/addColoredAreasToImage.ts` assumes area coordinates are finite integers with a valid ordering, but `ComparePngOptions` accepts unchecked `number` fields.

**Technical rationale:** Floats, `NaN`, `Infinity`, or reversed coordinates can silently produce partial writes, no-ops, or non-index buffer property writes. This is a correctness bug disguised as permissive input handling.

**Implementation directions:**

- Add `validateArea(area, name)` and validate every entry before mutation begins.
- Require finite integers and either reject or normalize reversed coordinates explicitly.
- Add tests for floats, `NaN`, `Infinity`, and reversed rectangles.

**Acceptance criteria:**

- Invalid area coordinates throw deterministic errors before image mutation.
- Valid areas keep existing inclusive-boundary behavior.
- Reversed-coordinate behavior is documented and tested.

## [RELI-02] Validate and normalize `pixelmatchOptions` at the boundary

**Priority:** P1  
**Problem:** `src/comparePng.ts` forwards `opts.pixelmatchOptions` directly to `pixelmatch` without any runtime validation.

**Technical rationale:** This makes caller errors depend on downstream library behavior and weakens the package’s API contract. It also creates version-coupling pressure because the wrapper does not own its boundary.

**Implementation directions:**

- Add an internal mapper/validator for `pixelmatchOptions`.
- Validate thresholds, alpha ranges, tuple lengths, and tuple channel bounds.
- Keep the public option names stable even if the underlying library changes.

**Acceptance criteria:**

- Invalid `pixelmatchOptions` fail with library-owned error messages.
- Valid options still reach `pixelmatch` unchanged semantically.
- Tests cover out-of-range numbers and malformed color tuples.

## [TYPE-03] Decouple public option types from `pixelmatch`

**Priority:** P1  
**Problem:** `src/types/compare.options.ts` mirrors `pixelmatch` options directly, making the public API structurally dependent on a third-party library contract.

**Technical rationale:** This increases upgrade risk. If `pixelmatch` changes option names, types, or semantics, this library inherits that churn in its public surface even if the desired wrapper API should remain stable.

**Implementation directions:**

- Define a library-owned comparison options type and keep the public docs anchored to that type.
- Map library-owned options to `pixelmatch` in a dedicated adapter.
- Document which semantics are guaranteed by this package versus delegated internally.

**Acceptance criteria:**

- Public types no longer need to change just because `pixelmatch` internals change.
- A single adapter owns the translation to the external library.
- Tests cover adapter behavior independently from the main orchestration flow.

## [API-01] Introduce an async API and injectable I/O ports

**Priority:** P1  
**Problem:** The library is synchronous end-to-end (`readFileSync`, `writeFileSync`, `PNG.sync.read`), which blocks the event loop and hard-codes file-system behavior into the comparison path.

**Technical rationale:** Sync-only I/O is acceptable for scripts, but it limits scalability in HTTP servers, workers, and bulk-processing pipelines. It also makes orchestrator logic harder to isolate in tests.

**Implementation directions:**

- Add `comparePngAsync(...)` using async file I/O and async diff persistence.
- Introduce internal ports/interfaces for source loading and diff writing so compare logic is decoupled from `node:fs`.
- Keep `comparePng(...)` as a sync convenience wrapper if backwards compatibility is required.

**Acceptance criteria:**

- Async consumers can use the library without blocking on file I/O.
- Core comparison flow can be tested with fake source/diff adapters.
- Sync API remains backwards compatible.

## [RELI-03] Introduce structured error classes/codes

**Priority:** P1  
**Problem:** Errors are currently plain `Error`/`TypeError`/`RangeError` strings spread across modules, and related failure modes use similar but inconsistent messages.

**Technical rationale:** Consumers have no stable way to branch on failure mode besides parsing text. This becomes brittle as the library gains more validation and security checks.

**Implementation directions:**

- Define library-specific errors such as `InvalidInputError`, `PathValidationError`, and `ResourceLimitError`.
- Add stable `.code` fields (`ERR_INVALID_PNG_INPUT`, `ERR_PATH_TRAVERSAL`, `ERR_MAX_DIMENSION_EXCEEDED`, etc.).
- Keep user-facing messages concise, but make programmatic handling deterministic.

**Acceptance criteria:**

- Publicly reachable failures expose stable error codes.
- Tests assert codes/types, not only message substrings.
- Similar failure modes no longer rely on near-duplicate string literals.

## [RELI-04] Define explicit zero-dimension image semantics

**Priority:** P1  
**Problem:** Invalid inputs are represented internally as `0x0` PNGs, but the library does not define clear, intentional semantics for genuinely zero-dimension images or zero-sized comparison cases.

**Technical rationale:** Right now zero-size behavior is an implementation side effect, not a contract. That makes future refactors risky and leaves corner cases under-specified for consumers and maintainers.

**Implementation directions:**

- Decide whether zero-dimension decoded images are rejected, normalized, or compared with explicit rules.
- Separate that policy from the current invalid-input sentinel handling.
- Add focused tests for both-input-zero, one-input-zero, and invalid-vs-zero cases.

**Acceptance criteria:**

- Zero-dimension behavior is documented and tested as an explicit contract.
- Internal invalid-input handling no longer depends on accidental zero-size semantics.
- `comparePng` behavior is deterministic across all zero-size edge cases.

## [PERF-02] Remove per-pixel helper dispatch in hot loops

**Priority:** P2  
**Problem:** `src/addColoredAreasToImage.ts` and `src/fillImageSizeDifference.ts` call `drawPixelOnBuff` for every pixel written.

**Technical rationale:** The function call overhead is avoidable in the hottest loops in the codebase. For large excluded areas or large size-difference regions, scanline-oriented writes will scale better and simplify profiling.

**Implementation directions:**

- Inline byte writes inside tight loops or switch to scanline buffer operations.
- Share a row-fill primitive between area painting and size-difference painting.
- Benchmark representative large-area cases before and after the refactor.

**Acceptance criteria:**

- Large-area painting performs measurably better without changing diff output.
- Behavior remains byte-for-byte identical on existing snapshots.
- The implementation still keeps bounds handling explicit and test-covered.

## [PERF-03] Reduce memory pressure when normalizing differently sized images

**Priority:** P2  
**Problem:** `extendImage` allocates a new canvas for size normalization, which can temporarily duplicate large image buffers and amplify peak memory usage.

**Technical rationale:** This is separate from lazy diff allocation. When image sizes differ, the library may hold original buffers, extended buffers, and optionally a diff buffer at once, which hurts scalability for large fixtures and server-side batch usage.

**Implementation directions:**

- Measure peak memory for same-size vs different-size comparisons.
- Investigate whether normalization can reuse buffers or reduce simultaneous allocations.
- Keep any optimization behind behavior-preserving tests for diff output and mismatch counts.

**Acceptance criteria:**

- Peak memory usage for different-size comparisons is measured and improved.
- Existing results remain byte-for-byte compatible.
- The chosen strategy is documented with tradeoffs and constraints.

## [TEST-01] Add orchestrator-focused tests that do not require PNG fixtures

**Priority:** P2  
**Problem:** Most current tests are integration-heavy and fixture-heavy, while `comparePng` itself has limited direct isolation coverage.

**Technical rationale:** The suite is strong on behavioral regression, but weak on fast, local tests for decision logic such as stage ordering, adapter interaction, and failure propagation. That slows refactoring of the architecture hotspot.

**Implementation directions:**

- After introducing ports/pipeline stages, add unit tests for orchestrator behavior with fake loaders, fake comparators, and fake writers.
- Keep fixture-based integration tests for end-to-end confidence, but reduce the need to test orchestration exclusively through PNG files.
- Add focused tests for “no diff write on zero mismatch”, “load failure propagation”, and “normalization stage ordering”.

**Acceptance criteria:**

- Core orchestration can be tested without touching disk.
- Integration tests remain for real PNG decoding/comparison behavior.
- Architectural refactors no longer require snapshot-heavy tests to verify simple control flow.
