# Contributing

## Development setup

```sh
git clone https://github.com/dichovsky/png-visual-compare.git
cd png-visual-compare
npm install
```

Node.js 20 or higher is required.

Development and local tooling are supported on macOS and Linux only. Windows is not supported.

## Common commands

| Command                               | Description                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm test`                            | Run the full test suite: unit tests with repo-wide 100% coverage plus Playwright e2e tests |
| `npm run test:e2e`                    | Run Playwright e2e tests for the Excluded Areas Builder tool                               |
| `npm run lint`                        | Run ESLint                                                                                 |
| `npm run lint:fix`                    | Run ESLint with auto-fix                                                                   |
| `npm run format`                      | Format all files with Prettier                                                             |
| `npm run format:check`                | Check formatting without writing changes                                                   |
| `npm run build`                       | Compile TypeScript to `./out` using `tsconfig.prod.json`                                   |
| `npm run typecheck`                   | Typecheck the full repository with the dev `tsconfig.json`                                 |
| `npm run codemap`                     | Regenerate `CODEMAP.md` for coding agents                                                  |
| `npm run tool:excluded-areas-builder` | Open the Excluded Areas Builder tool in the browser                                        |

### Running a single unit test file

```sh
npx vitest run __tests__/comparePng.test.ts
```

Use `npm test` or `npm run test:unit` when you need the repo-wide 100% coverage gate. Direct `npx vitest run ... --coverage` commands only report coverage for the files exercised by that focused run.

> **Known flake on macOS.** Roughly 1 run in 5 under coverage, a Vitest fork exits with
> `Error: Worker exited unexpectedly`. The affected file's results are lost, so the 100% threshold
> then fails on code the run never executed — usually `jest.ts`, `vitest.mts`, and `src/matchers/*`.
> It is unrelated to your change; re-run. Tracked as TEST-08 in `BACKLOG.md`, and the reason the
> macOS CI job is currently `continue-on-error`. Linux is unaffected.

### Updating snapshots

```sh
npx vitest run -u
```

PNG snapshot matcher tests import `../src/vitest.mjs` and assert diff images with `toMatchPngSnapshot()`, which still uses the normal Vitest snapshot update flow and can take `ComparePngOptions` when a snapshot should be compared semantically instead of byte-for-byte.

### Running e2e tests

```sh
npm run test:e2e
```

Playwright downloads Chromium automatically on first run via the `pretest:e2e` hook. To run a specific e2e test by name:

```sh
npx playwright test --reporter=list -g "drawing a rectangle"
```

### Running tests in Docker

```sh
npm run test:docker
```

This builds the Docker image and runs both unit and e2e tests inside a container.

## Pull request guidelines

- All tests must pass (`npm test`)
- Typechecking must pass (`npm run typecheck`)
- New functionality must be covered by tests (unit coverage threshold: 100% for all metrics)
- No ESLint errors or Prettier formatting violations
- Keep commits focused; one logical change per PR

## Branch protection

The `main` branch requires:

- All CI status checks to pass before merging
- At least one approving review
- No force pushes
