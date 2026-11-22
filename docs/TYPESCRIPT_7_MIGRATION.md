# TypeScript 7 tooling

The repository uses the `typescript` development dependency for all type checks and package builds. The `nodenext` module setting selects NodeNext module resolution. Node.js 26 runs the `.mts` maintenance scripts directly.

| Command                 | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `npm run typecheck`     | Check source, tests, scripts, and configuration with `tsconfig.json`.                |
| `npm run build`         | Compile `src` with `tsconfig.prod.json`. Write JavaScript and declarations to `out`. |
| `npm run codemap`       | Generate `CODEMAP.md` from the TypeScript sources.                                   |
| `npm run codemap:check` | Check that `CODEMAP.md` matches the current sources.                                 |
| `npm run lint`          | Run Oxlint and fail on warnings.                                                     |
| `npm run format:check`  | Check the repository format with Oxfmt.                                              |

The codemap generator uses `@babel/parser` to read TypeScript syntax and extract symbols. Use the latest compatible 7.x release so Jest and the generator share one parser installation. The compiler emits the declarations that the public declaration tests inspect. The published package uses the compiled files in `out`.

For the full test suite, run `npm test`. The suite checks the generated codemap, lint, formatting, licenses, types, unit coverage, and Playwright behavior.
