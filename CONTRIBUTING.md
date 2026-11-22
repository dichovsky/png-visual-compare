# Contributing

## Development Setup

```sh
git clone https://github.com/dichovsky/png-visual-compare.git
cd png-visual-compare
npm ci
```

Node.js 26.0.0 or later is necessary for this package (`engines.node`). `.nvmrc` sets Node.js 26 for local development, CI, and the Docker image.

The `engines-floor` CI job installs the packed tarball on Node.js 26.0.0 and runs `scripts/install-smoke.mts`. To run this check locally:

1. Run `npm run build && npm pack`.
2. Switch to Node.js 26.0.0.
3. Run `node ./scripts/install-smoke.mts png-visual-compare-<version>.tgz`.

This project supports macOS and Linux only. It does not support Windows.

## Common Commands

| Command                               | Description                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm test`                            | Run unit tests with 100% repo-wide coverage and Playwright e2e tests                                    |
| `npm run test:e2e`                    | Run Playwright e2e tests for the Excluded Areas Builder and the `png-visual-compare/playwright` matcher |
| `npm run lint`                        | Run Oxlint and fail on warnings                                                                         |
| `npm run lint:fix`                    | Apply automatic Oxlint fixes                                                                            |
| `npm run format`                      | Format supported files with Oxfmt                                                                       |
| `npm run format:check`                | Check file formatting with Oxfmt                                                                        |
| `npm run build`                       | Compile TypeScript to `./out` with `tsconfig.prod.json`                                                 |
| `npm run typecheck`                   | Type-check the repository with `tsconfig.json`                                                          |
| `npm run test:consumer-types`         | Type-check the packed tarball in a new project without `@types/pngjs` (CI `consumer-types` job)         |
| `npm run codemap`                     | Generate `CODEMAP.md` for coding agents                                                                 |
| `npm run tool:excluded-areas-builder` | Open the Excluded Areas Builder tool in the default browser                                             |

For details about the compiler and code generator, see [TypeScript 7 tooling](docs/TYPESCRIPT_7_MIGRATION.md).

### Run One Unit Test File

```sh
npx vitest run __tests__/comparePng.test.ts
```

Run `npm test` or `npm run test:unit` to check 100% coverage across the repository. A focused `npx vitest run ... --coverage` command reports coverage only for the files in that run.

### Update Snapshots

```sh
npx vitest run -u
```

PNG snapshot matcher tests import `../src/vitest.mjs` and check diff images with `toMatchPngSnapshot()`. The matcher compares decoded pixels with `comparePng`. Pass `ComparePngOptions` to change how the matcher compares pixels.

### Run E2E Tests

```sh
npm run test:e2e
```

Playwright downloads Chromium automatically on the first run through the `pretest:e2e` hook. To run one e2e test by name, run:

```sh
npx playwright test --reporter=list -g "drawing a rectangle"
```

### Run Tests in Docker

```sh
npm run test:docker
```

This command builds the Docker image and runs the unit and e2e tests in a container.

## Pull Request Rules

- Make sure that all tests pass (`npm test`).
- Make sure that type-checking passes (`npm run typecheck`).
- Add tests for all new code (100% coverage is necessary for all metrics).
- Fix all Oxlint errors and warnings. Run `npm run format` to apply Oxfmt formatting.
- Keep commits small and include one logical change per pull request.
- Write documentation and doc comments with the rules in [docs/WRITING_GUIDE.md](docs/WRITING_GUIDE.md).

## Branch Protection

A failed `macos` job fails the Tests workflow. The `main` branch has these protection rules:

- The `ubuntu` and `engines-floor` CI checks must pass before merge.
- Force pushes are not permitted.
