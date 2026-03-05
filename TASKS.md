# Code Review Improvements

Comprehensive repository audit performed against security, performance, code quality, architecture,
testing, documentation, dependency hygiene, DevOps/CI, Docker & deployment, and developer experience best practices.

---

## Security

### [P2] Validate and sanitise `diffFilePath` to prevent path traversal

**Problem**
`opts.diffFilePath` is passed directly to `mkdirSync` and `writeFileSync` without any validation. A caller can supply a path like `../../../../etc/cron.d/malicious` to write outside the intended output directory.

**Impact**
Depending on the process's file-system permissions this could allow writing arbitrary files to the host, enabling privilege escalation or data corruption.

**Solution**
Resolve `diffFilePath` to an absolute path with `path.resolve` and document that callers are expected to supply a trusted path. Optionally add an option to restrict diff output to a configurable base directory and throw if the resolved path escapes it.

**Files**
- `src/comparePng.ts`

---

### [P3] Avoid passing unbounded `Buffer` input directly to `PNG.sync.read`

**Problem**
`getPngData` accepts an arbitrary `Buffer` and passes it directly to `PNG.sync.read` without any size limit. An extremely large buffer (e.g., crafted to decode into a multi-gigapixel PNG) could cause unbounded memory allocation.

**Impact**
A malicious or accidental huge PNG could exhaust process memory and crash the process (denial of service).

**Solution**
Document the expected maximum input size in `ComparePngOptions` or add an optional `maxFileSizeBytes` guard. At minimum, document the lack of size validation as a known limitation so consumers can apply their own guards before calling `comparePng`.

**Files**
- `src/getPngData.ts`
- `src/types/compare.options.ts`

---

## Performance

## Code Quality

### [P3] Magic colour literals hardcoded in `comparePng`

**Problem**
`comparePng.ts` defines `extendedAreaColor` and `excludedAreaColor` as inline object literals. The chosen colours (green for extended areas, blue for excluded areas) are not explained and cannot be overridden by callers.

**Impact**
If the default colours need to change, or if a caller's images happen to contain the same solid blue/green, the exclusion mechanism could produce incorrect matches without any indication. Discoverability is poor.

**Solution**
Export the default colours as named constants (or document them in JSDoc) and consider adding optional `excludedAreaColor` / `extendedAreaColor` fields to `ComparePngOptions` so callers can override them when the defaults clash with their image content.

**Files**
- `src/comparePng.ts`
- `src/types/compare.options.ts`

---

## Architecture

### [P2] `getPngData` violates the Single Responsibility Principle

**Problem**
`getPngData` handles three distinct concerns in one function: input-type detection, filesystem existence checking, and PNG decoding. These concerns are tightly coupled, making it harder to test each concern in isolation.

**Impact**
Adding a new input type (e.g., URL, stream) requires modifying `getPngData` itself rather than extending an abstraction. Unit tests for the filesystem layer need to mock the PNG decoder and vice versa.

**Solution**
Separate the filesystem check and read into a helper (e.g., `readPngFromFile`) and keep `getPngData` as a thin dispatcher. This is a low-priority refactor that can be deferred but should be tracked.

**Files**
- `src/getPngData.ts`

---

### [P3] Dockerfile filename violates convention

**Problem**
The Dockerfile is named `dockerfile` (all-lowercase) instead of the conventional `Dockerfile` (capitalized). Most Docker tooling, CI systems, and IDE plugins use the conventional capitalized name by default.

**Impact**
`docker build .` (without `-f`) defaults to looking for `Dockerfile` on case-sensitive filesystems (Linux). CI pipelines, GitHub Actions, or `docker buildx` that do not explicitly pass `-f dockerfile` will fail on Linux.

**Solution**
Rename `dockerfile` to `Dockerfile`.

**Files**
- `dockerfile` → `Dockerfile`

---

### [P3] `@tsconfig/recommended` devDependency is not used

**Problem**
`@tsconfig/recommended` is listed in `devDependencies` but `tsconfig.json` does not extend it.

**Impact**
Dead dependencies increase `node_modules` size, add a potential attack surface from transitive dependencies, and mislead developers into thinking the recommended tsconfig is applied when it is not.

**Solution**
Either remove the dependency entirely, or add `"extends": "@tsconfig/recommended/tsconfig.json"` to `tsconfig.json` and verify the compilation still succeeds. The current `tsconfig.json` already enables `strict`, so removal is the simpler option.

**Files**
- `package.json`
- `tsconfig.json`

---

## Testing

### [P2] Missing test: diff file must NOT be created when images match

**Problem**
There is no test that verifies `comparePng` does not write a diff file when `pixelmatchResult === 0` but `diffFilePath` is provided. The code contains this guard (`if (pixelmatchResult > 0 && shouldCreateDiffFile)`), but it is not tested.

**Impact**
If the guard is accidentally removed or inverted in future, identical image comparisons would silently produce diff files, confusing consumers.

**Solution**
Add a test case to `comparePng.test.ts` (or `comparePng.diffs.test.ts`) that:
1. Compares two identical images with `diffFilePath` set.
2. Asserts `result === 0`.
3. Asserts `existsSync(diffFilePath)` is `false`.

**Files**
- `__tests__/comparePng.test.ts`

---

### [P2] Missing test for `addColoredAreasToImage` coordinate clamping

**Problem**
`addColoredAreasToImage` clamps area coordinates to the image bounds with `Math.max` / `Math.min`, but there are no tests that exercise this clamping logic with out-of-bounds coordinates.

**Impact**
A buffer overrun could occur if the clamping logic is accidentally removed. The guard goes untested.

**Solution**
Add tests to `__tests__/comparePng.test.ts` (or a dedicated `addColoredAreasToImage.test.ts`) that pass `Area` objects with negative coordinates, coordinates larger than the image dimensions, and verify the function neither throws nor corrupts the image buffer.

**Files**
- `__tests__/comparePng.test.ts` (or a new `__tests__/addColoredAreasToImage.test.ts`)

---

### [P3] Test timeout of 90 seconds in `vitest.config.mjs` is excessive

**Problem**
`vitest.config.mjs` sets `testTimeout: 90000` (90 seconds per test). The entire test suite currently completes in well under 10 seconds. An individual test should not take 90 seconds unless it performs real I/O over a network.

**Impact**
Slow or hanging tests will not be detected for up to 90 seconds per test, masking performance regressions and making developers wait unnecessarily for a hung test to time out.

**Solution**
Lower the timeout to a more appropriate value, e.g., `5000` ms (5 seconds). If specific tests need longer, override `timeout` on those individual tests with `test('...', { timeout: 30000 }, async () => { ... })`.

**Files**
- `vitest.config.mjs`

---

## Documentation

### [P3] No `CONTRIBUTING.md` file

**Problem**
The repository has no contribution guide. New contributors cannot find information on how to set up the development environment, run tests, or understand the PR and review process.

**Impact**
Higher barrier to contribution; inconsistent PR quality; maintainer fatigue from explaining the same process repeatedly.

**Solution**
Create `CONTRIBUTING.md` covering: development setup, how to run tests (`npx vitest run`), linting (`npm run lint`), snapshot updates (`npx vitest run --update-snapshots`), PR requirements, and coding conventions.

**Files**
- `CONTRIBUTING.md` *(new)*

---

### [P3] No `CHANGELOG.md` or release notes format

**Problem**
The repository has no changelog. Users upgrading between versions cannot determine what changed, what was fixed, or what is breaking.

**Impact**
Increased support burden; users are reluctant to upgrade; semantic versioning promise is hard to verify.

**Solution**
Create a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format and document it in the README. Consider using a tool like `conventional-changelog` to automate generation on release.

**Files**
- `CHANGELOG.md` *(new)*

---

## Dependencies

### [P2] Set up Dependabot for automated dependency updates

**Problem**
There is no `.github/dependabot.yml` configuration. Dependencies are only updated manually. Outdated dependencies (especially `pixelmatch` and `pngjs`) may contain security vulnerabilities that are never surfaced.

**Impact**
Security vulnerabilities in transitive dependencies go undetected. Manual update processes are slow and inconsistently applied.

**Solution**
Create `.github/dependabot.yml` with weekly update schedules for both `npm` packages and `github-actions`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Files**
- `.github/dependabot.yml` *(new)*

---

### [P3] Remove unused `ts-node` devDependency

**Problem**
`ts-node` is listed in `devDependencies` but is not referenced in any script, configuration file, or test in the repository. The project uses `vitest` with native TypeScript support.

**Impact**
Dead dependencies increase `node_modules` size, add unnecessary transitive dependencies (and their potential vulnerabilities), and mislead developers about the project's toolchain.

**Solution**
Run `npm uninstall ts-node` and verify the test suite still passes.

**Files**
- `package.json`
- `package-lock.json`

---

### [P3] Remove unused `@tsconfig/recommended` devDependency

**Problem**
`@tsconfig/recommended` appears in `devDependencies` but `tsconfig.json` does not extend it (see Architecture tasks).

**Impact**
Same impact as the `ts-node` issue — dead dependency adding unnecessary weight and potential vulnerability surface.

**Solution**
Run `npm uninstall @tsconfig/recommended` and verify the build still succeeds.

**Files**
- `package.json`
- `package-lock.json`

---

## DevOps / CI

### [P2] CI workflow does not run Prettier format check

**Problem**
`test.yml` runs `npm test` which includes lint (ESLint) but has no step to verify code formatting with Prettier. Formatting violations go undetected in CI.

**Impact**
Unformatted code can be merged, leading to noisy diffs and formatting debates in code reviews.

**Solution**
Add a `npm run format:check` script that runs `prettier --check .` and include it in `pretest` or as a separate CI step:

```json
"format:check": "prettier --check .",
"format": "prettier --write ."
```

Add `prettier` to `devDependencies` (it is currently only referenced in `.prettierrc` and `.prettierignore` but not installed as a project dependency).

**Files**
- `package.json`
- `.github/workflows/test.yml`

---

### [P3] `publish.yml` runs `npm run build` redundantly after `npm test`

**Problem**
`publish.yml` runs `npm test` (which internally runs `npm run clean && npm run build` via `pretest`) and then runs `npm run build` again immediately after. The second build deletes `./coverage` and `./test-results` produced by the test run.

**Impact**
The double-build is intentional (per the README) to ensure a clean `./out` for publishing. However, `npm test` running a full `prebuild → clean → tsc` cycle makes the total CI time unnecessarily long.

**Solution**
Document the rationale for the double build clearly in a comment in `publish.yml` so future maintainers do not remove it thinking it is a mistake. Alternatively, add a `build:clean` script that runs `npm run clean && tsc` without the full test overhead, and use that instead of the second `npm run build`.

**Files**
- `.github/workflows/publish.yml`

---

### [P3] No branch protection or required status checks documented

**Problem**
There are no documented branch protection rules for `main`. CI runs exist but it is unclear if they are required before merging, or if force-pushes to `main` are allowed.

**Impact**
Accidental or malicious direct pushes to `main` can bypass CI entirely. Breaking changes can be merged without passing tests.

**Solution**
Enable branch protection on `main` in the GitHub repository settings: require PR reviews, require status checks to pass before merging, and disallow force pushes. Document this in `CONTRIBUTING.md`.

**Files**
- Repository settings (GitHub UI)
- `CONTRIBUTING.md` *(new)*

---

## Docker & Deployment

### [P1] Dockerfile uses full `node:22` image (large base image) and runs as root

**Problem**
The Dockerfile uses `FROM node:22` — a Debian-based image that includes compilers, Python, git, and other tools not needed at runtime. The resulting image is ~1 GB. Additionally, the container runs as root (no `USER` directive), violating the principle of least privilege.

**Impact**
Larger images increase pull time, registry storage cost, and attack surface. Running as root means a compromised container process has unrestricted access inside the container and to any mounted host volumes. This is a Docker CIS Benchmark finding.

**Solution**
Switch to `node:22-slim` (Debian-slim, ~250 MB) or `node:22-alpine` (~50 MB). The project has no native dependencies so Alpine is safe to use. Add a `USER node` directive and use `--chown=node:node` when copying files (the `node:22` base image ships a pre-created `node` user with UID 1000):

```dockerfile
FROM node:22-slim
WORKDIR /usr/pkg/
COPY --chown=node:node . .
RUN npm ci
USER node
CMD ["npm", "run", "test"]
```

**Files**
- `dockerfile` (rename to `Dockerfile`)

---

### [P2] No multi-stage Docker build

**Problem**
The Dockerfile performs a single-stage build that copies source, installs all dependencies (including dev), and runs tests. This means the test runner, TypeScript compiler, and all dev dependencies are present in the image.

**Impact**
If the image is used as a library consumer's base, or if it is cached and re-used, it carries unnecessary weight and attack surface from dev tools.

**Solution**
Use a two-stage build: a `test` stage that installs all dependencies and runs the test suite, and a `build` stage that produces a minimal image with only production files:

```dockerfile
FROM node:22-slim AS test
WORKDIR /usr/pkg/
COPY --chown=node:node . .
RUN npm ci
USER node
CMD ["npm", "run", "test"]
```

For a publishable package image, add a second stage that installs only production dependencies and copies only `./out`.

**Files**
- `dockerfile` (rename to `Dockerfile`)

---

### [P2] `.dockerignore` does not exclude `dockerfile` and documentation files

**Problem**
`.dockerignore` excludes `node_modules`, `coverage`, `out`, and some IDE folders, but does not exclude `dockerfile` itself, `*.md` files, `LICENSE`, or `.prettierrc`. These files are copied into the image unnecessarily.

**Impact**
Slightly larger image build context; documentation or configuration files leak into the production image unnecessarily. The `dockerfile` inside the image is especially unnecessary.

**Solution**
Extend `.dockerignore` to exclude additional non-runtime files. Both `dockerfile` and `Dockerfile` are listed to handle the transition period during renaming (case-sensitive Linux filesystems treat them as distinct files):

```
# Both names listed to cover the pre/post-rename transition period
dockerfile
Dockerfile
*.md
LICENSE
.prettierrc
.prettierignore
eslint.config.mjs
vitest.config.mjs
tsconfig.json
.github
__tests__
```

**Files**
- `.dockerignore`

---

### [P3] No `HEALTHCHECK` instruction in Dockerfile

**Problem**
The Dockerfile has no `HEALTHCHECK` instruction. When the container is used inside an orchestrator (Kubernetes, Docker Swarm, ECS), there is no built-in way to detect whether the container has failed or become unresponsive.

**Impact**
Unhealthy containers will not be automatically restarted or replaced by orchestrators. This reduces reliability in production deployments.

**Solution**
Since this image only runs tests and exits, a `HEALTHCHECK` is not meaningful for the current use case. Document this limitation. If a server use-case is ever added, add an appropriate `HEALTHCHECK`.

**Files**
- `dockerfile` (rename to `Dockerfile`)

---

### [P3] No `docker-compose.yml` for local development

**Problem**
There is no `docker-compose.yml` file. Running the tests in Docker currently requires knowing and running two separate npm scripts (`docker:build` then `docker:run`), or using `npm run test:docker` which is undiscoverable without reading `package.json`.

**Impact**
Poor developer experience for contributors who want to run tests in an isolated Docker environment without installing Node locally.

**Solution**
Create a `docker-compose.yml` that defines a single `test` service pointing at the Dockerfile. This makes `docker compose up` the one command needed to run the full test suite in Docker:

```yaml
services:
  test:
    build: .
    volumes: []
```

**Files**
- `docker-compose.yml` *(new)*

---

## Developer Experience

### [P2] No `format` or `format:check` npm scripts for Prettier

**Problem**
The repository has `.prettierrc` and `.prettierignore` configuration files but no npm scripts to run Prettier. Developers must know to run `npx prettier --write .` manually, and CI does not enforce formatting.

**Impact**
Formatting inconsistencies accumulate over time; PRs contain noisy formatting diffs; new contributors are not guided toward the project's style.

**Solution**
Add Prettier as an explicit dev dependency and add scripts:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Include `format:check` in the CI pipeline (see DevOps task).

**Files**
- `package.json`

---

### [P3] No `lint:fix` npm script

**Problem**
The `lint` script runs ESLint in check-only mode. There is no `lint:fix` script. Developers must know to run `npx eslint . --fix` manually to auto-fix issues.

**Solution**
Add a convenience script:

```json
"lint:fix": "eslint . --fix"
```

**Files**
- `package.json`

---

### [P3] `vitest.config.mjs` uses inconsistent indentation (2 spaces vs 4 spaces elsewhere)

**Problem**
`vitest.config.mjs` uses 2-space indentation while `.prettierrc` specifies `"tabWidth": 4` and all other configuration files use 4-space indentation.

**Impact**
Minor cosmetic inconsistency; will produce a Prettier format error once `format:check` is added to CI.

**Solution**
Re-format `vitest.config.mjs` with 4-space indentation, or run `prettier --write vitest.config.mjs`.

**Files**
- `vitest.config.mjs`
