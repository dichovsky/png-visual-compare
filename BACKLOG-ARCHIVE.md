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

- [x] 🟢 🐛 SECU [SECU-07]: `comparePngWithPorts` barrel hygiene (`@internal` or relocate)
    - **Impl:** No change needed — `comparePngWithPorts` is exported from `src/comparePng.ts` but never re-exported by `src/index.ts`, and `package.json` `exports` maps only `.`, `./vitest`, `./jest`. It is unreachable from installed consumers. Tagging it `@internal` is folded into BUILD-05 (`stripInternal`).
    - **Rat:** Audited against the barrel and the `exports` map rather than assumed — the leak the task guarded against does not exist.

- [x] 🟡 🐛 SECU [SECU-04]: Cap pre-decode file read (`maxFileBytes`)
    - **Impl:** New `maxFileBytes` option (default `DEFAULT_MAX_PIXELS * 4` = 67,108,864) enforced in `readValidatedFile` from the opened handle's `fstat` size, before any bytes are read. Throws `ResourceLimitError` regardless of `throwErrorOnInvalidInputData`; path inputs only.
    - **Rat:** `maxDimension`/`maxPixels` read the declared IHDR header, so they bounded the decoded image but not the compressed bytes needed to reach that header — a multi-gigabyte file was fully resident before either limit ran.
- [x] 🟡 🐛 SECU [SECU-05]: Close async-path TOCTOU (validate→read)
    - **Impl:** New `src/readValidatedFile.ts` opens the file first to pin one inode, then runs `validatePathWithReal` and compares the handle's `dev`/`ino` (bigint) against the canonical path containment approved. Used by both `getPngData` and `fsAsyncImageSource`, so the sync path is covered too. Engages only when `inputBaseDir` is set.
    - **Rat:** `validatePath` walked the path and `readFile` walked it again from scratch; anything swapped in between was what got read. Affected the sync path as well as the async one the item named. Node has no `openat`, so the race is detected rather than prevented — bytes never come from an unverified inode.
- [x] 🟡 🐛 SECU [SECU-06]: Document decoder-bomb surface in README
    - **Impl:** New README "Security Model" section covering decoded-vs-compressed bounds, the detect-not-prevent nature of the race defences, the file-identity requirement, and an explicit "what is not covered" list.
    - **Rat:** The README presented `maxDimension`/`maxPixels` as the resource-exhaustion defence without stating that they inspect a header and bound nothing about the bytes read to reach it.
- [x] 🟡 🐛 SECU [SECU-09]: Refuse symlink in mkdir parent component
    - **Impl:** `secureMkdir` walks from `diffOutputBaseDir` downward, refusing symlinked components and creating missing ones singly; the file is then opened inside the `realDiffDirectory`-resolved parent so no symlink is traversed at open time; `O_TRUNC` moved off the open to an `ftruncate` gated on an inode match; `O_EXCL` establishes whether this call created the file, and cleanup unlinks only in that case.
    - **Rat:** `mkdir` with `recursive: true` follows symlinks in every intermediate component and `O_NOFOLLOW` guards only the final one, so a symlinked parent redirected the whole write outside the boundary — and `O_TRUNC` would have emptied whatever it landed on before anything noticed.

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
- [x] 🟢 🐛 RELI [RELI-06]: Reject negative coords in `validateArea`
    - **Impl:** `validateArea` now throws `InvalidInputError` (`excludedAreas[i]: coordinates must be non-negative`) when any of `x1/y1/x2/y2` is `< 0`, after the finite-integer check and before the ordering checks; sync + async exception suites gain negative-coordinate cases.
    - **Rat:** Negative excluded-area coordinates were silently clamped to `0` inside `addColoredAreasToImage`, so a caller typo (e.g. `x1: -5`) painted a different region than requested with no signal — fail-fast at the validation boundary instead. The paint layer keeps its defensive clamp for direct callers.
- [x] 🟢 🐛 RELI [RELI-07]: `persistDiff` use `=== 0` not `<= 0`
    - **Impl:** `getPersistableDiff` guard changed from `result.mismatchedPixels <= 0` to `=== 0`.
    - **Rat:** `pixelmatch` returns a non-negative mismatch count, so `<= 0` and `=== 0` are behaviourally identical; `=== 0` states the actual contract ("no mismatches ⇒ no diff file") without implying negative counts are reachable.
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

## 📝 Docs

- [x] 🟡 📝 DOC [DOC-02]: Add `SECURITY.md` (disclosure channel)
    - **Impl:** Added `SECURITY.md` with supported versions (`6.x`) and GitHub private vulnerability reporting guidance.
    - **Rat:** Security reporters needed a clear disclosure path without relying on public issues or an unverified contact address.

- [x] 🟡 📝 DOC [DOC-01]: Sweep stale RELI-03 frontmatter
    - **Impl:** No change needed — `RELI-03` now appears only in its own `BACKLOG-ARCHIVE.md` entry and in one rationale line that cites it as prior art. No stale frontmatter remains in any tracked Markdown.
    - **Rat:** Repo-wide grep found nothing to sweep; the task outlived the condition that created it.

## 🛠️ Build · Deps · CI · DX

- [x] 🟢 ♻️ DX [DX-03]: Add `test:fast` script (skip pretest chain)
    - **Impl:** Added `npm run test:fast` as a direct verbose Vitest run without the unit-test preflight chain.
    - **Rat:** Maintainers needed a documented fast iteration command that skips clean, lint, format, license, typecheck, and coverage gates.
- [x] 🟢 ♻️ CI [CI-01]: Add `pull_request` trigger to `test.yml`
    - **Impl:** Added `pull_request` to the main test workflow and renamed the workflow from push-only to `Tests`.
    - **Rat:** PRs should run the existing cross-platform test matrix before merge, not only after branch pushes.
- [x] 🟢 ♻️ CI [CI-05]: SHA-pin actions in `publish.yml`
    - **Impl:** Every `uses:` in `publish.yml` pins a full commit SHA with a trailing `# vX.Y.Z` comment.
    - **Rat:** Mutable tags let a compromised action publish arbitrary code with the release job's npm credentials.
