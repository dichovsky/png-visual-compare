# Store Playwright baselines as PNG files

The Jest and Vitest `toMatchPngSnapshot` matchers store each baseline as a serialized `Buffer` in a `.snap` file. Both frameworks expose snapshot state to custom matchers. Playwright `expect` does not expose snapshot state. Because of this, the Playwright adapter writes each baseline as a PNG file at `testInfo.snapshotPath(name)`. The adapter obeys `snapshotPathTemplate` and `--update-snapshots`. It stores baselines next to `toHaveScreenshot` and `toMatchSnapshot` baselines. You cannot share baselines between Playwright and Jest or Vitest.
