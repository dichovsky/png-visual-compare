# Code Review Improvements

Comprehensive repository audit performed against security, performance, code quality, architecture,
testing, documentation, dependency hygiene, DevOps/CI, Docker & deployment, and developer experience best practices.

---

## Security

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

## Docker & Deployment

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
- `Dockerfile`

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

## Documentation

### [P3] No `CONTRIBUTING.md` file

**Problem**
The repository has no contribution guide. New contributors cannot find information on how to set up the development environment, run tests, or understand the PR and review process.

**Impact**
Higher barrier to contribution; inconsistent PR quality; maintainer fatigue from explaining the same process repeatedly.

**Solution**
Create `CONTRIBUTING.md` covering: development setup, how to run tests (`npx vitest run`), linting (`npm run lint`), snapshot updates (`npx vitest run -u`), PR requirements, and coding conventions.

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
