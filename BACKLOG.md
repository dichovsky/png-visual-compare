# Backlog

> **Agent Rules:** Keep task descriptions short. When you finish a task, delete it from this file and add it to `BACKLOG-ARCHIVE.md`.

> Git history contains full original specifications. IDs in `[BRACKETS]` link to git history, `CHANGELOG.md`, `BACKLOG-ARCHIVE.md`, and `docs/ARCHITECTURE.md`.

> Legend — Priority: 🔴 high (P0/P1) · 🟡 medium (P2) · 🟢 low (P3). Type: 🐛 fix · 📦 feature · ♻️ refactor · 🧪 test · 📝 docs.

## 🔒 Security

- [ ] 🟢 🐛 SECU [SECU-08]: Limit path length in `validatePath` to 4096 characters.
- [ ] 🟢 🐛 SECU [SECU-15]: Fix symlink target existence leak in `inputBaseDir`. `readValidatedFile` opens the file before `realpath` validation, so an escaping symlink to an existing file throws `PathValidationError`, while a broken symlink throws `InvalidInputError`. Check `realpath` containment before opening a symlink, or map open errors on escaping paths to `PathValidationError`.

## ⚡ Performance

- [ ] 🟡 ♻️ PERF [PERF-02]: Inline per-pixel writes in the hot loop (blocked on human review).
- [ ] 🟡 ♻️ PERF [PERF-03]: Reduce peak memory in `normalizeImages` (blocked on human review).
- [ ] 🟡 ♻️ PERF [PERF-04]: Skip image cloning when no pixel changes follow.
- [ ] 🟡 ♻️ PERF [PERF-05]: Use Base64 encoding for PNG snapshot serialization.
- [ ] 🟡 ♻️ PERF [PERF-09]: Decode PNGs with one inflate pass. `assertCompleteImageData` inflates the image data and `pngjs` inflates it a second time. Pass the verified output to `pngjs` or replace its inflate call.
- [ ] 🟢 ♻️ PERF [PERF-06]: Remove duplicate pixel writes during `extendImage` padding.
- [ ] 🟢 ♻️ PERF [PERF-07]: Remove object allocations in `validateArea`.

## 🏛️ Architecture · Types · API · Reliability

- [ ] 🟡 ♻️ ARCH [ARCH-02]: Split `getPngData` into `decodePngBuffer` and `loadPngFromPath`.
- [ ] 🟡 ♻️ ARCH [ARCH-03]: Add `comparePngAsyncWithPorts` to match `comparePngWithPorts`.
- [ ] 🟡 ♻️ ARCH [ARCH-09]: Combine `getPngData`, `validateImageSourceLoad`, and `fs(Async)ImageSource` into one image-loading module (replaces ARCH-02 and ARCH-06).
- [ ] 🟡 ♻️ ARCH [ARCH-10]: Extract shared diff-write security logic from `fsDiffWriter` and `fsAsyncDiffWriter`.
- [ ] 🟡 ♻️ TYPE [TYPE-04]: Add `readonly` to public `Area` and `Color` properties.
- [ ] 🟡 ♻️ TYPE [TYPE-05]: Decide whether port interfaces are public or internal.
- [ ] 🟡 📦 API [API-02]: Add `AbortSignal` support to `comparePngAsync`.
- [ ] 🟢 ♻️ ARCH [ARCH-04]: Remove unused `ComparisonContext` and `rawOptions`.
- [ ] 🟢 ♻️ ARCH [ARCH-05]: Separate `RuntimePorts` from `ResolvedOptions`.
- [ ] 🟢 ♻️ ARCH [ARCH-06]: Move `validateImageSourceLoad.ts` to `src/internal/`.
- [ ] 🟢 ♻️ ARCH [ARCH-07]: Freeze `DEFAULT_COMPARE_PNG_OPTIONS`.
- [ ] 🟢 ♻️ ARCH [ARCH-08]: Combine `drawPixelOnBuff`, `fillImageSizeDifference`, `addColoredAreasToImage`, and `extendImage` into one module.
- [ ] 🟢 ♻️ ARCH [ARCH-11]: Extract a `SnapshotStateAdapter` interface to share Jest and Vitest snapshot-state logic.
- [ ] 🟢 ♻️ ARCH [ARCH-12]: Unify synchronous and asynchronous orchestrators into one pipeline runner (depends on ARCH-09 and ARCH-10).
- [ ] 🟢 ♻️ TYPE [TYPE-06]: Remove deprecated `LoadedPng` in version 8.0.0. Delete `src/types/png.data.ts` and remove its exports from `src/types/index.ts` and `src/index.ts`. Add a consumer type-check test on the packed tarball with `skipLibCheck: false` and without `@types/pngjs`.
- [ ] 🟢 ♻️ TYPE [TYPE-08]: Rename `isComparePngOptions` to `isPlainObject`.
- [ ] 🟢 ♻️ TYPE [TYPE-09]: Use `Partial<ComparisonPorts>` on the port overload.
- [ ] 🟢 🐛 RELI [RELI-05]: Use `Promise.allSettled` in `comparePngAsync`.
- [ ] 🟢 🐛 RELI [RELI-08]: Validate options before binding in `resolveOptions`.
- [ ] 🟢 🐛 RELI [RELI-09]: Wrap `realpathNative` errors in `PathValidationError`.
- [ ] 🟢 📦 API [API-03]: Return an in-memory diff buffer without writing to disk.
- [ ] 🟢 📦 API [API-04]: Accept `string | URL` for file path options.
- [ ] 🟢 📦 API [API-05]: Add `comparePngWithResult` to return a detailed result object.

## 🧪 Tests & QA

- [ ] 🟢 🧪 TEST [TEST-09]: Remove unused `if (process.platform === 'win32') return;` checks from test files because Windows is not supported.
- [ ] 🔴 🧪 TEST [TEST-08]: Fix the macOS Vitest worker crash (`Error: Worker exited unexpectedly`) in `pngSnapshotMatcher.test.ts`. Replace the 32 `vi.resetModules()` calls with direct calls to `registerJestPngSnapshotMatcher` or an extracted registration helper, then re-enable the `macos` CI gate.
- [ ] 🟡 🧪 TEST [TEST-02]: Add a benchmark suite (`vitest bench`) for performance checks.
- [ ] 🟡 🧪 TEST [TEST-03]: Add a packed-tarball integration test suite.
- [ ] 🟢 🧪 TEST [TEST-04]: Add mutation testing with Stryker.
- [ ] 🟢 🧪 TEST [TEST-05]: Add property-based fuzz tests for malformed PNGs with `fast-check`.
- [ ] 🟢 🧪 TEST [TEST-06]: Add type-level regression tests with `expectTypeOf`.
- [ ] 🟢 🧪 TEST [TEST-07]: Add unit tests for the `excluded-areas-builder` script.

## 📝 Docs

- [ ] 🟢 📝 DOC [DOC-03]: Deduplicate `CLAUDE.md` and `.github/copilot-instructions.md`.
- [ ] 🟢 📝 DOC [DOC-04]: Expand JSDoc comments on public functions.
- [ ] 🟢 📝 DOC [DOC-05]: Add cross-links between `docs/ARCHITECTURE.md` and `BACKLOG.md`.

## 🛠️ Build · Deps · CI · DX

- [ ] 🟢 ♻️ BUILD [BUILD-01]: Split shared compiler settings into `tsconfig.base.json`.
- [ ] 🟢 ♻️ BUILD [BUILD-02]: Update `moduleResolution` to `nodenext`.
- [ ] 🟢 ♻️ BUILD [BUILD-03]: Add explicit `import` and `require` conditions to `exports`.
- [ ] 🟢 ♻️ BUILD [BUILD-04]: Generate an SBOM in `publish.yml`.
- [ ] 🟢 ♻️ BUILD [BUILD-05]: Enable `stripInternal` in `tsconfig.prod.json`.
- [ ] 🟢 ♻️ BUILD [BUILD-06]: Remove or document the `_version` field.
- [ ] 🟢 ♻️ DEPS [DEPS-01]: Upgrade `@types/pngjs` when version 7.x is available.
- [ ] 🟢 ♻️ DEPS [DEPS-02]: Add `docker` ecosystem updates to Dependabot.
- [ ] 🟢 ♻️ DEPS [DEPS-03]: Widen `peerDependencies` upper bounds or add a check script.
- [ ] 🟢 ♻️ DX [DX-01]: Move inline `node -e` script to `scripts/open-tool.mjs`.
- [ ] 🟢 ♻️ DX [DX-02]: Add `npm run dev` for Vitest watch mode.
- [ ] 🟢 ♻️ DX [DX-04]: Add `.editorconfig`.
- [ ] 🟢 ♻️ DX [DX-05]: Add pre-commit hooks with `simple-git-hooks` and `lint-staged`.
- [ ] 🟢 ♻️ CI [CI-02]: Add a CodeQL security workflow.
- [ ] 🟢 ♻️ CI [CI-03]: Add `dependency-review-action` on pull requests.
- [ ] 🟢 ♻️ CI [CI-04]: Upload test coverage to Codecov.
