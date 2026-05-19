# Backlog Archive

> **Agent Rules:** Append completed tasks here. Add Impl: (Implementation details) and Rat: (Rationale/Why).

> Full original specs (file lists, prescribed signatures, acceptance criteria) are preserved in git history — see commits prior to the compact-backlog adoption. IDs in `[BRACKETS]` are stable cross-refs to git history, `CHANGELOG.md`, `BACKLOG.md`, and `docs/ARCHITECTURE.md`.

## 🔒 Security

- [x] 🔴 🐛 SECU [SECU-01]: Symlink-safe path containment
    - **Impl:** `realpathSync.native` on `baseDir` + target (or target's parent for output paths); ELOOP normalized; tests cover lexical + symlink traversal on Linux/macOS.
    - **Rat:** Containment was lexical only — symlinks inside `baseDir` could escape, breaking the documented security boundary on server-side usage.
- [x] 🔴 🐛 SECU [SECU-02]: Decoded-pixel limit (`maxPixels`)
    - **Impl:** Added `maxPixels` option (default `16_777_216`); enforced in `getPngData` post-IHDR and in `comparePng` on the normalized canvas.
    - **Rat:** Per-axis `maxDimension` allowed 16384×16384 ≈ 1 GiB decoded RGBA — DoS protection was incomplete.
- [x] 🔴 🐛 SECU [SECU-03]: Symlink-atomic diff write
    - **Impl:** Both `fsDiffWriter` and `fsAsyncDiffWriter` use `openSync`/`open` with `O_NOFOLLOW`; symlink at target refused with `PathValidationError`. Shipped 6.1.1.
    - **Rat:** `writeFileSync` followed symlinks → TOCTOU window between `validatePath` and write let a hostile process redirect diff bytes outside `diffOutputBaseDir`.
- [x] 🔴 🐛 SECU [SECU-10]: `maxPixels` check before `extendImage`
    - **Impl:** Relocated canvas-level `maxPixels` check into `normalizeImages` before `extendImage`; removed redundant check from `runComparison`.
    - **Rat:** Spec said "before diff allocation" but check ran after `normalizeImages` had already allocated 2× ~1 GiB extended buffers — gate was cosmetic for the DoS path it was meant to close.
- [x] 🟡 🐛 SECU [SECU-11]: `validatePath` output FS-state oracle
    - **Impl:** Reordered `validatePath` so `baseDir` containment runs before `lstat`/`stat` shape checks via new `assertOutputTargetShape` helper.
    - **Rat:** Out-of-bounds paths returned distinct error strings (symlink/directory/missing) → attacker oracle for filesystem enumeration outside the trust boundary.
- [x] 🟡 🐛 SECU [SECU-12]: Diff written `0o600` (umask-safe)
    - **Impl:** Both writers pass explicit `0o600` mode to `openSync`/`open`.
    - **Rat:** `O_CREAT` without `mode` used `0o666 & ~umask` → world-readable diff PNGs on default Linux hosts (umask `0022` → `0o644`), leaking visual evidence of screenshotted content.

## ⚡ Performance

- [x] 🔴 ♻️ PERF [PERF-01]: Lazy diff allocation
    - **Impl:** Diff `PNG` allocated only when `diffFilePath` is provided; `pixelmatch` receives `diff?.data`.
    - **Rat:** Unconditional `new PNG(maxWidth, maxHeight)` doubled memory pressure for the common compare-only case.

## 🏛️ Architecture · Types · API · Reliability

- [x] 🔴 ♻️ ARCH [ARCH-01]: Split `comparePng` → pipeline stages
    - **Impl:** Extracted `resolveOptions` / `loadSources` / `normalizeImages` / `runComparison` / `persistDiff` into `src/pipeline/*`; reduced `comparePng.ts` to a ≤30-line orchestrator.
    - **Rat:** `comparePng` mixed option parsing, validation, security, loading, normalization, comparison, and persistence — primary maintainability hotspot blocking async + new stages.
- [x] 🔴 📦 API [API-01]: Async API + injectable I/O ports (a+b+c+d)
    - **Impl:** Defined `ImageSourcePort`/`DiffWriterPort` in `src/ports/`; wired sync via `fsImageSource`/`fsDiffWriter`; added `comparePngAsync` using `fs.promises`; README + CHANGELOG updated. Four sequential sub-items a→d.
    - **Rat:** Only a sync entrypoint with monolithic I/O — blocked filesystem abstraction, async use cases, and test fakes for orchestration logic.
- [x] 🔴 🐛 RELI [RELI-01]: Runtime-validate `excludedAreas`
    - **Impl:** New `validateArea(area, i)` enforcing finite-integer + `x1 <= x2` + `y1 <= y2`; called before `addColoredAreasToImage`.
    - **Rat:** NaN/Infinity/floats/reversed coordinates silently produced partial writes or no-ops — correctness bug disguised as permissive input handling.
- [x] 🔴 🐛 RELI [RELI-02]: Boundary-validate `pixelmatchOptions`
    - **Impl:** New `validatePixelmatchOptions` checks threshold/alpha/color tuples/booleans; called from `comparePng` options block.
    - **Rat:** Caller errors depended on downstream library behavior; weakened API contract and created version coupling pressure.
- [x] 🔴 🐛 RELI [RELI-03]: Structured error classes/codes
    - **Impl:** New `src/errors.ts` exports `InvalidInputError`/`PathValidationError`/`ResourceLimitError` with stable `code` fields; throw sites migrated; tests assert types not message substrings.
    - **Rat:** Callers had no stable way to branch on failure mode besides parsing free-text — brittle as validation and security checks grew.
- [x] 🔴 🐛 RELI [RELI-04]: Zero-dimension PNG semantics
    - **Impl:** `getPngData` rejects `width === 0 || height === 0` with `InvalidInputError`; non-throw variant returns invalid `LoadedPng`.
    - **Rat:** Zero-size behavior was an implementation side effect, not a contract — corner cases under-specified for consumers and maintainers.
- [x] 🟢 🐛 RELI [RELI-10]: Wrap `pixelmatch` errors → `ComparisonError`
    - **Impl:** New public `ComparisonError extends Error` (`code: 'ERR_COMPARISON'`) in `src/errors.ts`; `runComparison` wraps the `pixelmatch(...)` call in try/catch and rethrows with the original on the ES2022 `cause` property; exported from `src/index.ts`; README + ARCHITECTURE error-model sections updated; unit tests cover Error / non-Error throws plus a passthrough.
    - **Rat:** Raw `pixelmatch` throws leaked through both sync and async public APIs as untyped `Error`s — callers had to parse free-form messages to branch on comparison-kernel failures, defeating the structured-error model established by RELI-03.
- [x] 🔴 ♻️ TYPE [TYPE-01]: Replace `PngData` sentinel with discriminated union
    - **Impl:** Replaced `PngData` with `LoadedPng = {kind:'valid',png} | {kind:'invalid',reason}`; updated `getPngData` + loaders + tests; removed from public barrel (semver-major).
    - **Rat:** Sentinel encoded failure as a fake `0×0` PNG — weakened invariants and let invalid input flow through as if real.
- [x] 🔴 ♻️ TYPE [TYPE-02]: Brand `ValidatedPath` type
    - **Impl:** Added `ValidatedPath = string & { readonly [__validatedPath]: never }`; `validatePath` returns it; internal-only (not exported from `src/index.ts`).
    - **Rat:** `validatePath` returned a plain `string` — security-sensitive flow control relied solely on developer discipline, increasingly risky as the codebase grew.
- [x] 🔴 ♻️ TYPE [TYPE-03]: Decouple public options from `pixelmatch`
    - **Impl:** Added `src/adapters/toPixelmatchOptions.ts` translating public `PixelmatchOptions` → pixelmatch raw shape; `comparePng` uses the adapter.
    - **Rat:** Public types mirrored `pixelmatch` directly — any pixelmatch option churn would propagate to the wrapper's stable surface.

## 🧪 Tests & QA

- [x] 🟡 🧪 TEST [TEST-01]: Fixture-free orchestrator tests (a+b)
    - **Impl:** New `__tests__/comparePng.logic.test.ts` (3 in-memory-buffer cases) + `__tests__/comparePng.ports.test.ts` (fake port injection). Sub-items: a (decision logic), b (port injection after API-01b).
    - **Rat:** Orchestration decision logic was only testable through real PNG decode + disk fixtures — slow and coupled logic tests to fixture maintenance.
