# Contributing

## Development setup

```sh
git clone https://github.com/dichovsky/png-visual-compare.git
cd png-visual-compare
npm install
```

Node.js 20 or higher is required.

## Common commands

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm test`             | Lint, format-check, build, and run all tests with coverage |
| `npm run lint`         | Run ESLint                                                 |
| `npm run lint:fix`     | Run ESLint with auto-fix                                   |
| `npm run format`       | Format all files with Prettier                             |
| `npm run format:check` | Check formatting without writing changes                   |
| `npm run build`        | Compile TypeScript to `./out`                              |

### Running a single test file

```sh
npx vitest run __tests__/comparePng.test.ts
```

### Updating snapshots

```sh
npx vitest run -u
```

### Running tests in Docker

```sh
docker compose up
```

Or using the npm scripts:

```sh
npm run test:docker
```

## Pull request guidelines

- All tests must pass (`npm test`)
- New functionality must be covered by tests (coverage thresholds: 90% lines/functions/statements, 75% branches)
- No ESLint errors or Prettier formatting violations
- Keep commits focused; one logical change per PR

## Branch protection

The `main` branch requires:

- All CI status checks to pass before merging
- At least one approving review
- No force pushes
