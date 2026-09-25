# Backlog

> **Agent Rules:** Keep descriptions brief. When a task is completed, REMOVE it from here and APPEND it to BACKLOG-ARCHIVE.md.

> Verbose original specs (problem / files / acceptance criteria / dependency table) are preserved in git history — see commits prior to the compact-backlog adoption. IDs in `[BRACKETS]` are stable cross-refs to git history, `CHANGELOG.md`, `BACKLOG-ARCHIVE.md`, and `docs/ARCHITECTURE.md`.

> Legend — Priority: 🔴 high (P0/P1) · 🟡 medium (P2) · 🟢 low (P3). Type: 🐛 fix · 📦 feature · ♻️ refactor · 🧪 test · 📝 docs.

## 🔒 Security

- [ ] 🟡 🐛 SECU [SECU-13]: Hard link inside a base dir defeats containment — it is the same inode, so the identity checks pass and a diff write overwrites the linked file; consider refusing `nlink > 1` on overwrite (documented in README → What is not covered; 7.0.0 audit)
- [ ] 🟡 🐛 SECU [SECU-14]: FIFO/special file inside a boundary blocks the open — reads and diff writes open without `O_NONBLOCK`; add it and refuse a non-regular `fstat` when a base dir is set (7.0.0 audit)
- [ ] 🟢 🐛 SECU [SECU-08]: Cap path length in `validatePath` (4096)

## ⚡ Performance

- [ ] 🟡 ♻️ PERF [PERF-02]: Inline per-pixel writes in hot loop (a+b, BLOCKED on human spike)
- [ ] 🟡 ♻️ PERF [PERF-03]: Reduce normalize memory peak (BLOCKED on human spike)
- [ ] 🟡 ♻️ PERF [PERF-04]: Skip eager clone when no mutation follows
- [ ] 🟡 ♻️ PERF [PERF-05]: PNG snapshot serialization → base64
- [ ] 🟢 ♻️ PERF [PERF-06]: `extendImage` padding double-write
- [ ] 🟢 ♻️ PERF [PERF-07]: `validateArea` allocation-free
- [ ] 🟢 ♻️ PERF [PERF-08]: Playwright baseline writes fully decode the PNG to check limits — export an IHDR-only `assertImageLimits` from `getPngData`

## 🏛️ Architecture · Types · API · Reliability

- [ ] 🔴 🐛 RELI [RELI-11]: Jest cannot load the package without a Babel transform — the CJS build `require()`s ESM-only `pixelmatch`, which Jest's loader (and Vitest vm pools) cannot load; bundle `pixelmatch` (ISC) into the CJS build, then drop the README workaround
- [ ] 🔴 🐛 RELI [RELI-12]: Jest 30.5+ `retryTimes` false green — the matcher bumps `snapshotState._counters` directly, which `clear(testIdentity)` does not roll back, so the retry resolves `<name> 2`, writes it and passes; route through `_bumpCounter` / `_markKeyChecked` / `_addSnapshot` / `_incrementSnapshotCount` with the test identity
- [ ] 🟡 ♻️ ARCH [ARCH-02]: Split `getPngData` → `decodePngBuffer` + `loadPngFromPath`
- [ ] 🟡 ♻️ ARCH [ARCH-03]: `comparePngAsyncWithPorts` for injection symmetry
- [ ] 🟡 ♻️ ARCH [ARCH-09]: Unify image-loading module — fuse `getPngData` + `validateImageSourceLoad` + `fs(Async)ImageSource` policy; seam at read primitive only (supersedes ARCH-02 + ARCH-06)
- [ ] 🟡 ♻️ ARCH [ARCH-10]: Extract secure diff-write contract — share SECU-12 invariants between `fsDiffWriter` + `fsAsyncDiffWriter`; seam at I/O primitives, not at the diff writer
- [ ] 🟡 ♻️ TYPE [TYPE-04]: `readonly` on public `Area`/`Color` fields
- [ ] 🟡 ♻️ TYPE [TYPE-05]: Decide port interfaces public vs internal
- [ ] 🟡 📦 API [API-02]: `AbortSignal` in `comparePngAsync`
- [ ] 🟢 ♻️ ARCH [ARCH-04]: Remove dead `ComparisonContext` + `rawOptions`
- [ ] 🟢 ♻️ ARCH [ARCH-05]: Split `RuntimePorts` from `ResolvedOptions`
- [ ] 🟢 ♻️ ARCH [ARCH-06]: Move `validateImageSourceLoad.ts` → `internal/`
- [ ] 🟢 ♻️ ARCH [ARCH-07]: Frozen `DEFAULT_COMPARE_PNG_OPTIONS`
- [ ] 🟢 ♻️ ARCH [ARCH-08]: Collapse pixel-painting modules — fold `drawPixelOnBuff` + `fillImageSizeDifference` + `addColoredAreasToImage` + `extendImage` into one image-painting module
- [ ] 🟢 ♻️ ARCH [ARCH-11]: Snapshot framework adapter — extract `SnapshotStateAdapter` interface; dedupe Jest/Vitest snapshot-state plumbing (~350 LOC → ~150 core + thin adapters)
- [ ] 🟢 ♻️ ARCH [ARCH-12]: Unify sync/async orchestrators — single 5-stage pipeline driver parameterized by port bundle (depends on ARCH-09 + ARCH-10)
- [ ] 🟢 ♻️ TYPE [TYPE-06]: Stop exporting `LoadedPng` publicly
- [ ] 🟢 ♻️ TYPE [TYPE-07]: Dedupe `ComparePngInput` (`string|Buffer`) type
- [ ] 🟢 ♻️ TYPE [TYPE-08]: Rename `isComparePngOptions` → `isPlainObject`
- [ ] 🟢 ♻️ TYPE [TYPE-09]: `Partial<ComparisonPorts>` on overload
- [ ] 🟢 🐛 RELI [RELI-05]: `Promise.allSettled` in `comparePngAsync`
- [ ] 🟢 🐛 RELI [RELI-08]: Validate-before-bind in `resolveOptions`
- [ ] 🟢 🐛 RELI [RELI-09]: Wrap `realpathNative` errors in `PathValidationError`
- [ ] 🟢 📦 API [API-03]: In-memory diff buffer (no disk round-trip)
- [ ] 🟢 📦 API [API-04]: Accept `string|URL` for path options
- [ ] 🟢 📦 API [API-05]: `comparePngWithResult` verbose return shape
- [ ] 🟢 🐛 API [API-06]: `toMatchPngSnapshot(undefined, options)` is rejected despite matching the declared overload
- [ ] 🟢 🐛 RELI [RELI-13]: Jest 30 `test.failing` + `-u` overwrites the baseline with the known-bad image (`context.testFailing` is never read)

## 🧪 Tests & QA

- [ ] 🟢 🧪 TEST [TEST-09]: Remove vestigial `win32` guards — `if (process.platform === 'win32') return;` appears in 6 test files, but Windows was dropped as a supported platform in 6.0.0 (`"os": ["darwin", "linux"]`), so the guards imply support that does not exist
- [ ] 🔴 🧪 TEST [TEST-08]: Fix macOS Vitest fork crash so the macOS CI job can gate again — `Error: Worker exited unexpectedly` kills the worker running `pngSnapshotMatcher.test.ts`, dropping its coverage and failing the 100% gate. Measured ~1 in 7 without coverage, ~1 in 5 with. Localized: the file calls `vi.resetModules()` 32 times, each re-evaluating the matcher module graph. Ruled out — `pool: 'threads'` (breaks `process.umask` in the SECU-12 tests), `maxForks: 4` (1/20), `--max-old-space-size=4096` (0/20 plain, 3/15 under coverage). Likely fix: rework the file to call the exported `registerJestPngSnapshotMatcher` / an extracted auto-register seam instead of resetting the module registry. Reproduces on `main`; Linux unaffected
- [ ] 🟡 🧪 TEST [TEST-02]: Bench suite (`vitest bench`) for PERF gating
- [ ] 🟡 🧪 TEST [TEST-03]: Pack-test integration against built artifact
- [ ] 🟢 🧪 TEST [TEST-04]: Mutation testing (Stryker)
- [ ] 🟢 🧪 TEST [TEST-05]: Fuzz malformed PNG (`fast-check`)
- [ ] 🟢 🧪 TEST [TEST-06]: Type-level regression tests (`expectTypeOf`)
- [ ] 🟢 🧪 TEST [TEST-07]: Unit-test `excluded-areas-builder` JS

## 📝 Docs

- [ ] 🟢 📝 DOC [DOC-03]: Dedupe `CLAUDE.md` vs `.github/copilot-instructions.md`
- [ ] 🟢 📝 DOC [DOC-04]: Expand public function JSDoc
- [ ] 🟢 📝 DOC [DOC-05]: Cross-link `ARCHITECTURE.md` ↔ `BACKLOG.md`

## 🛠️ Build · Deps · CI · DX

- [ ] 🟡 ♻️ CI [CI-06]: Split `publish.yml` into test and publish jobs — `id-token: write` is job-scoped, so every devDependency script `prepublishOnly` runs (`npm test`) can mint the OIDC publish token; publish from a job that only builds and runs `npm publish --ignore-scripts`
- [ ] 🟢 ♻️ CI [CI-07]: CI job at the engines floor (Node 22.12.0) — build and install-smoke the packed tarball
- [ ] 🟢 ♻️ BUILD [BUILD-01]: `tsconfig.base.json` split
- [ ] 🟢 ♻️ BUILD [BUILD-02]: `moduleResolution` → `nodenext`
- [ ] 🟢 ♻️ BUILD [BUILD-03]: Explicit `import`/`require` in `exports`
- [ ] 🟢 ♻️ BUILD [BUILD-04]: Emit SBOM in `publish.yml`
- [ ] 🟢 ♻️ BUILD [BUILD-05]: `stripInternal` in `tsconfig.prod.json`
- [ ] 🟢 ♻️ BUILD [BUILD-06]: Remove/document `_version` field
- [ ] 🟢 ♻️ DEPS [DEPS-01]: Bump `@types/pngjs` → 7.x
- [ ] 🟢 ♻️ DEPS [DEPS-02]: Add `docker` to Dependabot
- [ ] 🟢 ♻️ DEPS [DEPS-03]: Loosen `peerDependencies` upper bounds (or watch script)
- [ ] 🟢 ♻️ DX [DX-01]: Extract `scripts/open-tool.mjs` (kill inline `node -e`)
- [ ] 🟢 ♻️ DX [DX-02]: Add `npm run dev` (vitest watch)
- [ ] 🟢 ♻️ DX [DX-04]: Add `.editorconfig`
- [ ] 🟢 ♻️ DX [DX-05]: Pre-commit hook (`simple-git-hooks` + `lint-staged`)
- [ ] 🟢 ♻️ CI [CI-02]: Add CodeQL workflow
- [ ] 🟢 ♻️ CI [CI-03]: `dependency-review-action` on PRs
- [ ] 🟢 ♻️ CI [CI-04]: Upload coverage to Codecov
