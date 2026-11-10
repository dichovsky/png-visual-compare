# Contributing

## Development Setup

```sh
git clone https://github.com/dichovsky/png-visual-compare.git
cd png-visual-compare
npm install
```

This package requires Node.js 26.0.0 or later (`engines.node`). `.nvmrc` sets Node.js 26 for local development, CI, and the Docker image. The `engines-floor` CI job installs the packed tarball on Node.js 26.0.0 and runs `scripts/install-smoke.mjs`. To run this check locally:

1. Run `npm run build && npm pack`.
2. Switch to Node.js 26.0.0.
3. Run `node ./scripts/install-smoke.mjs png-visual-compare-<version>.tgz`.

This project supports macOS and Linux only. It does not support Windows.

## Common Commands

| Command                               | Description                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm test`                            | Run unit tests with 100% repo-wide coverage and Playwright e2e tests                                    |
| `npm run test:e2e`                    | Run Playwright e2e tests for the Excluded Areas Builder and the `png-visual-compare/playwright` matcher |
| `npm run lint`                        | Run ESLint                                                                                              |
| `npm run lint:fix`                    | Run ESLint and fix problems automatically                                                               |
| `npm run format`                      | Format all files with Prettier                                                                          |
| `npm run format:check`                | Check file formatting with Prettier                                                                     |
| `npm run build`                       | Compile TypeScript to `./out` with `tsconfig.prod.json`                                                 |
| `npm run typecheck`                   | Type-check the repository with `tsconfig.json`                                                          |
| `npm run codemap`                     | Generate `CODEMAP.md` for coding agents                                                                 |
| `npm run tool:excluded-areas-builder` | Open the Excluded Areas Builder tool in the default browser                                             |

### Run One Unit Test File

```sh
npx vitest run __tests__/comparePng.test.ts
```

Run `npm test` or `npm run test:unit` to check 100% coverage across the repository. A focused `npx vitest run ... --coverage` command reports coverage only for the files in that run.

> **Known failure on macOS.** In about 1 of 5 coverage runs, a Vitest worker stops with `Error: Worker exited unexpectedly`. Vitest loses the results for that file, and the 100% coverage gate fails on untested files. Run the command again. `BACKLOG.md` tracks this issue as TEST-08. Because of this issue, the macOS CI job uses `continue-on-error`. Linux is not affected.

### Update Snapshots

```sh
npx vitest run -u
```

PNG snapshot matcher tests import `../src/vitest.mjs` and check diff images with `toMatchPngSnapshot()`. Pass `ComparePngOptions` when you want a semantic comparison instead of a byte-for-byte comparison.

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
- Add tests for all new code (100% coverage is required for all metrics).
- Fix all ESLint errors and Prettier formatting issues.
- Keep commits small and include one logical change per pull request.

## Branch Protection

The `main` branch enforces these rules:

- The `ubuntu` and `engines-floor` CI checks must pass before merge.
- Force pushes are not allowed.
