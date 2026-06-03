# Backlog

> **Agent Rules:** Keep descriptions brief. When a task is completed, REMOVE it from here and APPEND it to BACKLOG-ARCHIVE.md.

> Verbose original specs (problem / files / acceptance criteria / dependency table) are preserved in git history — see commits prior to the compact-backlog adoption. IDs in `[BRACKETS]` are stable cross-refs to git history, `CHANGELOG.md`, `BACKLOG-ARCHIVE.md`, and `docs/ARCHITECTURE.md`.

> Legend — Priority: 🔴 high (P0/P1) · 🟡 medium (P2) · 🟢 low (P3). Type: 🐛 fix · 📦 feature · ♻️ refactor · 🧪 test · 📝 docs.

## 🔒 Security

- [ ] 🟡 🐛 SECU [SECU-04]: Cap pre-decode file read (`maxFileBytes`)
- [ ] 🟡 🐛 SECU [SECU-05]: Close async-path TOCTOU (validate→read)
- [ ] 🟡 🐛 SECU [SECU-06]: Document decoder-bomb surface in README
- [ ] 🟡 🐛 SECU [SECU-09]: Refuse symlink in mkdir parent component
- [ ] 🟢 🐛 SECU [SECU-07]: `comparePngWithPorts` barrel hygiene (`@internal` or relocate)
- [ ] 🟢 🐛 SECU [SECU-08]: Cap path length in `validatePath` (4096)

## ⚡ Performance

- [ ] 🟡 ♻️ PERF [PERF-02]: Inline per-pixel writes in hot loop (a+b, BLOCKED on human spike)
- [ ] 🟡 ♻️ PERF [PERF-03]: Reduce normalize memory peak (BLOCKED on human spike)
- [ ] 🟡 ♻️ PERF [PERF-04]: Skip eager clone when no mutation follows
- [ ] 🟡 ♻️ PERF [PERF-05]: PNG snapshot serialization → base64
- [ ] 🟢 ♻️ PERF [PERF-06]: `extendImage` padding double-write
- [ ] 🟢 ♻️ PERF [PERF-07]: `validateArea` allocation-free

## 🏛️ Architecture · Types · API · Reliability

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

## 🧪 Tests & QA

- [ ] 🟡 🧪 TEST [TEST-02]: Bench suite (`vitest bench`) for PERF gating
- [ ] 🟡 🧪 TEST [TEST-03]: Pack-test integration against built artifact
- [ ] 🟢 🧪 TEST [TEST-04]: Mutation testing (Stryker)
- [ ] 🟢 🧪 TEST [TEST-05]: Fuzz malformed PNG (`fast-check`)
- [ ] 🟢 🧪 TEST [TEST-06]: Type-level regression tests (`expectTypeOf`)
- [ ] 🟢 🧪 TEST [TEST-07]: Unit-test `excluded-areas-builder` JS

## 📝 Docs

- [ ] 🟡 📝 DOC [DOC-01]: Sweep stale RELI-03 frontmatter
- [ ] 🟡 📝 DOC [DOC-02]: Add `SECURITY.md` (disclosure channel)
- [ ] 🟢 📝 DOC [DOC-03]: Dedupe `CLAUDE.md` vs `.github/copilot-instructions.md`
- [ ] 🟢 📝 DOC [DOC-04]: Expand public function JSDoc
- [ ] 🟢 📝 DOC [DOC-05]: Cross-link `ARCHITECTURE.md` ↔ `BACKLOG.md`

## 🛠️ Build · Deps · CI · DX

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
- [ ] 🟢 ♻️ DX [DX-03]: Add `test:fast` script (skip pretest chain)
- [ ] 🟢 ♻️ DX [DX-04]: Add `.editorconfig`
- [ ] 🟢 ♻️ DX [DX-05]: Pre-commit hook (`simple-git-hooks` + `lint-staged`)
- [ ] 🟢 ♻️ CI [CI-01]: Add `pull_request` trigger to `test.yml`
- [ ] 🟢 ♻️ CI [CI-02]: Add CodeQL workflow
- [ ] 🟢 ♻️ CI [CI-03]: `dependency-review-action` on PRs
- [ ] 🟢 ♻️ CI [CI-04]: Upload coverage to Codecov
- [ ] 🟢 ♻️ CI [CI-05]: SHA-pin actions in `publish.yml`
