# Backlog Archive

> **Agent Rules:** Add completed tasks here. Include **Impl:** (implementation details) and **Rat:** (reason for the change).

> Git history contains full original specifications. IDs in `[BRACKETS]` link to git history, `CHANGELOG.md`, `BACKLOG.md`, and `docs/ARCHITECTURE.md`.

## 🔒 Security

- [x] 🔴 🐛 SECU [SECU-01]: Symlink-safe path containment
    - **Impl:** Added `realpathSync.native` on `baseDir` and target paths, normalized `ELOOP`, and added symlink traversal tests on Linux and macOS.
    - **Rat:** Lexical containment alone allowed symlinks inside `baseDir` to point outside the security boundary.
- [x] 🔴 🐛 SECU [SECU-02]: Decoded-pixel limit (`maxPixels`)
    - **Impl:** Added the `maxPixels` option (default `16_777_216`) and enforced it in `getPngData` and `comparePng`.
    - **Rat:** Per-axis `maxDimension` allowed `16384 × 16384` images (~1 GiB of RGBA memory).
- [x] 🔴 🐛 SECU [SECU-03]: Symlink-atomic diff write
    - **Impl:** Updated `fsDiffWriter` and `fsAsyncDiffWriter` to open files with `O_NOFOLLOW` and reject symlinks with `PathValidationError`.
    - **Rat:** `writeFileSync` followed symlinks, which created a race window between `validatePath` and the write.
- [x] 🔴 🐛 SECU [SECU-10]: `maxPixels` check before `extendImage`
    - **Impl:** Moved the normalized-canvas `maxPixels` check into `normalizeImages` before `extendImage` runs.
    - **Rat:** Running the check in `runComparison` happened after `normalizeImages` had already allocated two large buffers.
- [x] 🟡 🐛 SECU [SECU-11]: `validatePath` output filesystem oracle
    - **Impl:** Updated `validatePath` so `baseDir` containment runs before `lstat` and `stat` target shape checks.
    - **Rat:** Out-of-bounds paths returned different errors for symlinks, directories, and missing files, which leaked filesystem state outside `baseDir`.
- [x] 🟡 🐛 SECU [SECU-12]: Diff written with `0o600` permissions
    - **Impl:** Set mode `0o600` on `open` and added `fchmod(0o600)` on the open handle in both diff writers.
    - **Rat:** Default `O_CREAT` permissions created world-readable diff PNGs under standard `0022` umasks.
- [x] 🟢 🐛 SECU [SECU-07]: `comparePngWithPorts` barrel check
    - **Impl:** Verified that `src/index.ts` and `package.json` `exports` do not expose `comparePngWithPorts`.
    - **Rat:** Confirmed that external consumers cannot import `comparePngWithPorts`.
- [x] 🟡 🐛 SECU [SECU-04]: Limit pre-decode file read (`maxFileBytes`)
    - **Impl:** Added `maxFileBytes` (default `135,266,304`) and enforced it in `readValidatedFile` on the `fstat` size and bytes read.
    - **Rat:** `maxDimension` and `maxPixels` checked the decoded image size, but did not limit the compressed file size read into memory.
- [x] 🟡 🐛 SECU [SECU-05]: Detect path swaps between validation and read
    - **Impl:** Added `src/readValidatedFile.ts` to run lexical containment, open the file, run `validatePathWithReal`, and compare `dev` and `ino`.
    - **Rat:** Opening the file before `realpath` validation ensures that bytes come from the verified inode.
- [x] 🟡 🐛 SECU [SECU-06]: Document security model in `README.md`
    - **Impl:** Added the Security Model section to `README.md` to explain resource limits, path containment, and known exclusions.
    - **Rat:** Users needed clear documentation of what each security option protects.
- [x] 🟡 🐛 SECU [SECU-09]: Reject symlinks in parent directories during diff writes
    - **Impl:** Added `secureMkdir` and `realDiffDirectory` to create parent directories one segment at a time, reject symlinks, and defer `ftruncate` until after inode verification.
    - **Rat:** `mkdir` with `recursive: true` followed symlinked parent directories outside `diffOutputBaseDir`.
- [x] 🟡 🐛 SECU [SECU-13]: Reject hard-linked diff targets under `diffOutputBaseDir`
    - **Impl:** Added `assertSingleLink` in `src/internal/assertPlainFile.ts` to reject diff targets with `nlink > 1` when `diffOutputBaseDir` is set.
    - **Rat:** A hard link inside `diffOutputBaseDir` shares the same inode as an external file on the same filesystem.
- [x] 🟡 🐛 SECU [SECU-14]: Reject FIFOs and special files inside a base directory without blocking
    - **Impl:** Added `O_NONBLOCK` to file opens when a base directory is set and added `assertRegularFile` in `src/internal/assertPlainFile.ts`.
    - **Rat:** Opening a FIFO without `O_NONBLOCK` blocked the process until a peer opened the pipe.

## ⚡ Performance

- [x] 🔴 ♻️ PERF [PERF-01]: Lazy diff allocation
    - **Impl:** Allocated the diff `PNG` buffer only when `shouldCreateDiffFile` is `true`.
    - **Rat:** Allocating a diff buffer when `diffFilePath` was omitted wasted memory.
- [x] 🟢 ♻️ PERF [PERF-08]: Check IHDR header limits without full PNG decode on Playwright baseline writes
    - **Impl:** Added `assertPngHeaderLimits` in `src/getPngData.ts` and called it from `writeBaseline` in `src/playwright.ts`.
    - **Rat:** Full PNG decoding on every new baseline write allocated an unnecessary RGBA buffer.

## 🏛️ Architecture · Types · API · Reliability

- [x] 🔴 ♻️ ARCH [ARCH-01]: Split `comparePng` into pipeline stages
    - **Impl:** Created `resolveOptions`, `loadSources`, `normalizeImages`, `runComparison`, and `persistDiff` in `src/pipeline/*`.
    - **Rat:** Separated option validation, loading, normalization, comparison, and file output into testable modules.
- [x] 🔴 📦 API [API-01]: Add `comparePngAsync` and I/O ports
    - **Impl:** Added `ImageSourcePort` and `DiffWriterPort` in `src/ports/` and added `comparePngAsync` using `fs.promises`.
    - **Rat:** Enabled asynchronous file I/O and port injection for unit tests.
- [x] 🔴 🐛 RELI [RELI-01]: Validate `excludedAreas` at runtime
    - **Impl:** Added `validateArea(area, i)` to check finite integers and coordinate order before painting.
    - **Rat:** Invalid coordinates previously caused silent no-ops or partial writes.
- [x] 🔴 🐛 RELI [RELI-02]: Validate `pixelmatchOptions` at runtime
    - **Impl:** Added `validatePixelmatchOptions` to check numeric ranges, booleans, color tuples, `windowSize`, and `ignoreMask`.
    - **Rat:** Validating options at the public boundary gives consistent `InvalidInputError` failures.
- [x] 🔴 🐛 RELI [RELI-03]: Add error classes with `code` properties
    - **Impl:** Added `InvalidInputError`, `PathValidationError`, and `ResourceLimitError` in `src/errors.ts`.
    - **Rat:** Callers can match errors by class or `code` instead of message text.
- [x] 🔴 🐛 RELI [RELI-04]: Reject zero-dimension PNGs
    - **Impl:** Updated `getPngData` to reject PNGs with `width === 0` or `height === 0`.
    - **Rat:** Defined explicit behavior for zero-dimension images.
- [x] 🟢 🐛 RELI [RELI-10]: Wrap `pixelmatch` errors in `ComparisonError`
    - **Impl:** Added `ComparisonError` (`code: 'ERR_COMPARISON'`) in `src/errors.ts` and wrapped the `pixelmatch` call in `runComparison`.
    - **Rat:** Preserved the structured error contract when `pixelmatch` throws an error.
- [x] 🟢 🐛 RELI [RELI-06]: Reject negative coordinates in `validateArea`
    - **Impl:** Updated `validateArea` to throw `InvalidInputError` when any coordinate is negative.
    - **Rat:** Replaced silent clamping of negative coordinates with an immediate validation error.
- [x] 🟢 🐛 RELI [RELI-07]: Check `mismatchedPixels === 0` in `persistDiff`
    - **Impl:** Changed `result.mismatchedPixels <= 0` to `result.mismatchedPixels === 0` in `getPersistableDiff`.
    - **Rat:** Matched the non-negative return contract of `pixelmatch`.
- [x] 🔴 ♻️ TYPE [TYPE-01]: Replace `PngData` sentinel with `LoadedPng` union
    - **Impl:** Replaced `PngData` with the `LoadedPng` discriminated union.
    - **Rat:** Removed fake `0×0` PNG sentinel objects.
- [x] 🔴 ♻️ TYPE [TYPE-02]: Add branded `ValidatedPath` type
    - **Impl:** Added `ValidatedPath` in `src/types/validated-path.ts` as the return type of `validatePath`.
    - **Rat:** Enforced path validation at compile time before file I/O.
- [x] 🔴 ♻️ TYPE [TYPE-03]: Decouple `PixelmatchOptions` from `pixelmatch`
    - **Impl:** Added `src/adapters/toPixelmatchOptions.ts` to copy validated fields to `pixelmatch`.
    - **Rat:** Prevented unknown properties on `pixelmatchOptions` from reaching `pixelmatch`.
- [x] 🔴 🐛 RELI [RELI-11]: Vendor `pixelmatch` in TypeScript
    - **Impl:** Ported `pixelmatch` to `src/vendor/pixelmatch.ts` under its ISC license and added parity tests in `__tests__/vendor/pixelmatch.test.ts`.
    - **Rat:** Removed the ESM-only runtime dependency so Jest and Vitest VM pools can load the CommonJS build without Babel transforms.
- [x] 🟢 ♻️ TYPE [TYPE-06]: Remove the deprecated `LoadedPng` export (BREAKING, 8.0.0)
    - **Impl:** Deleted `src/types/png.data.ts` and its entries in `src/types/index.ts` and `src/index.ts`. The internal type stays in `src/pipeline/types.ts`. `__tests__/index.test.ts` imports `LoadedPng` under `@ts-expect-error`, so a new export fails type-checking. Added `scripts/check-consumer-types.mjs` (`npm run test:consumer-types`, CI job `consumer-types`). It installs the packed tarball into a new project without `@types/pngjs` and type-checks all four entry points (`strict`, `skipLibCheck: false`) with `moduleResolution` `node16` and `bundler`. It allows zero diagnostics.
    - **Rat:** No public function returns or accepts `LoadedPng`, but its export put `pngjs` types in the public declarations. A consumer that type-checks with `skipLibCheck: false` then needed `@types/pngjs`. The consumer check tests the files that npm publishes, not `src/`.
- [x] 🟢 ♻️ TYPE [TYPE-07]: Deduplicate `ComparePngInput` type
    - **Impl:** Defined `ComparePngInput` in `src/types/compare.input.ts` and used it in `comparePng`, `comparePngWithPorts`, and `comparePngAsync`.
    - **Rat:** Removed duplicate `string | Buffer` type definitions.
- [x] 🔴 🐛 RELI [RELI-12]: Fix Jest 30.5+ `retryTimes` snapshot state tracking
    - **Impl:** Updated `src/jest.ts` to pass `currentTestIdentity()` to `_bumpCounter`, `_markKeyChecked`, `_addSnapshot`, and `_incrementSnapshotCount` on Jest 30.5+.
    - **Rat:** Allowed Jest 30.5+ to roll back snapshot counters and baselines when a test attempt fails before a retry.
- [x] 🟢 🐛 RELI [RELI-13]: Preserve baselines in Jest 30+ `test.failing` with `-u`
    - **Impl:** Verified that `src/jest.ts` checks `context.testFailing` and skips baseline writes during expected-failure tests.
    - **Rat:** Prevented `test.failing` assertions from overwriting valid baselines under `-u`.
- [x] 🟢 🐛 API [API-06]: Accept `toMatchPngSnapshot(undefined, options)`
    - **Impl:** Updated `normalizePngSnapshotMatcherArgs` and `createPngSnapshotMatcher` to accept `(undefined, options)` across Jest, Vitest, and Playwright.
    - **Rat:** Matched runtime argument parsing to the TypeScript function overloads.

## 🧪 Tests & QA

- [x] 🟡 🧪 TEST [TEST-01]: Add fixture-free orchestrator unit tests
    - **Impl:** Added `__tests__/comparePng.logic.test.ts` and `__tests__/comparePng.ports.test.ts`.
    - **Rat:** Tested orchestration logic in memory without disk I/O.

## 📝 Docs

- [x] 🟡 📝 DOC [DOC-02]: Add `SECURITY.md`
    - **Impl:** Added `SECURITY.md` with supported versions and vulnerability reporting instructions.
    - **Rat:** Provided a private channel for security reports.
- [x] 🟡 📝 DOC [DOC-01]: Check for obsolete RELI-03 frontmatter
    - **Impl:** Verified that no tracked Markdown files contain obsolete RELI-03 frontmatter.
    - **Rat:** Confirmed documentation cleanliness.

## 🛠️ Build · Deps · CI · DX

- [x] 🟢 ♻️ DX [DX-03]: Add `test:fast` script
    - **Impl:** Added `npm run test:fast` to run Vitest without `pretest:unit`.
    - **Rat:** Provided a fast test command for local development.
- [x] 🟢 ♻️ CI [CI-01]: Run `test.yml` on pull requests
    - **Impl:** Added the `pull_request` trigger to `.github/workflows/test.yml`.
    - **Rat:** Ran CI checks before branch merge.
- [x] 🟢 ♻️ CI [CI-05]: Pin GitHub Actions by commit SHA in `publish.yml`
    - **Impl:** Pinned all `uses:` entries in `publish.yml` to commit SHAs with version comments.
    - **Rat:** Protected the release workflow from mutable action tags.
- [x] 🟡 ♻️ CI [CI-06]: Separate `verify`, `publish`, and `post-release` jobs in `publish.yml`
    - **Impl:** Split `publish.yml` into three jobs so only `publish` has `id-token: write` permission and publishes the verified tarball with `--ignore-scripts`.
    - **Rat:** Prevented `devDependencies` from accessing the OIDC publish token during tests.
- [x] 🟢 ♻️ CI [CI-07]: Add `engines-floor` CI job and `scripts/install-smoke.mjs`
    - **Impl:** Added the `engines-floor` job in `test.yml` and `scripts/install-smoke.mjs` to test installation and runtime execution on the minimum supported Node.js version.
    - **Rat:** Verified that the packed tarball installs and runs on the `engines.node` version.
