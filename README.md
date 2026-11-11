# png-visual-compare

**🎯 Visual regression testing for PNG images with zero binary dependencies**

[![npm version](https://img.shields.io/npm/v/png-visual-compare.svg?style=flat-square)](https://www.npmjs.com/package/png-visual-compare)
[![npm downloads](https://img.shields.io/npm/dm/png-visual-compare.svg?style=flat-square)](https://www.npmjs.com/package/png-visual-compare)
[![Tests](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/dichovsky/png-visual-compare?style=flat-square)](https://github.com/dichovsky/png-visual-compare/blob/main/LICENSE)

---

A Node.js library that compares PNG images or image regions without native binary dependencies.

**Key Features:**

- ✨ **Zero Native Binaries** — Pure JavaScript for macOS and Linux
- 🖼️ **File or Buffer Input** — Accepts file paths or raw PNG `Buffer` objects
- 🔍 **Pixel-Level Accuracy** — Uses [pixelmatch](https://github.com/mapbox/pixelmatch) 8.0.0
- 🎭 **Excluded Areas** — Skips rectangular regions during comparison with `excludedAreas`
- 🗂️ **Diff Image Output** — Writes a diff PNG with highlighted mismatches when requested
- 💪 **TypeScript Support** — Includes complete TypeScript declarations

## Table of Contents

- [Installation](#installation)
- [Migration Guide to v8.0.0](#migration-guide-to-v800)
- [Migration Guide to v7.0.0](#migration-guide-to-v700)
- [Migration Guide to v6.0.0](#migration-guide-to-v600)
- [Quick Start](#quick-start)
- [Snapshot Matchers](#snapshot-matchers)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Excluded Areas Builder](#excluded-areas-builder)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```sh
npm install -D png-visual-compare
```

> **Operating System:** macOS or Linux only. Windows is not supported.
>
> **Node.js Version:** Node.js 26.0.0 or later is required.

---

## Migration Guide to v8.0.0

1. Use Node.js 26.0.0 or later.
2. Remove `LoadedPng` imports.

### 1. Node.js Version Requirement

`engines.node` requires `>=26.0.0`.

### 2. Remove `LoadedPng` Imports

The package no longer exports `LoadedPng`. Version 7.1.0 deprecated it because no public function returns or accepts it. Remove all `import type { LoadedPng } from 'png-visual-compare'` statements. If you upgrade from 5.x, remove your `PngData` imports too. Do not replace them with `LoadedPng` as the v6.0.0 guide shows.

The declarations of the package entry points no longer refer to `pngjs`. Type-checking with `skipLibCheck: false` does not need `@types/pngjs`.

---

## Migration Guide to v7.0.0

1. Use Node.js 26.0.0 or later.
2. Upgrade to Vitest 5 if you use `png-visual-compare/vitest`.
3. Check for new errors from `maxFileBytes` and path containment rules.
4. Upgrade `vitest` to v5 and `@playwright/test` to v1.60+ if they are installed in your project.

### 1. Node.js Version Requirement

`engines.node` requires `>=26.0.0`.

### 2. Vitest 5 Requirement

The `vitest` peer dependency range is `>=5.0.0 <6`. Vitest 5 changed `Matchers` to take two type parameters (`Matchers<R, T>`). Because of this change, `toMatchPngSnapshot` does not type-check with Vitest 4. Use version 6.3.0 if you must stay on Vitest 4. The Jest matcher and `comparePng` / `comparePngAsync` signatures did not change.

### 3. File Size Limits and Containment Checks

- `maxFileBytes` (default `135266304`) limits the byte size of a PNG file read from a path. It throws `ResourceLimitError` when a file exceeds the limit, even when `throwErrorOnInvalidInputData` is `false`. This limit does not apply to `Buffer` inputs. See [Resource limits](#resource-limits).
- When `inputBaseDir` or `diffOutputBaseDir` is set, the library throws `PathValidationError` if a file changes between validation and use, if the filesystem reports no inode number, or if a parent directory of `diffFilePath` is a symlink. See [Security Model](#security-model).

### 4. Peer Dependency Checks During Install

`vitest` and `@playwright/test` are optional peer dependencies. npm checks optional peer ranges whenever those packages are installed in your project. If your project has `vitest` 4 or `@playwright/test` older than 1.60, `npm install` fails with `ERESOLVE` even when you use only `comparePng`. Upgrade those peer packages first, or stay on version 6.3.0.

---

## Migration Guide to v6.0.0

1. Replace `PngData` imports with `LoadedPng`.
2. Check all `excludedAreas`, `pixelmatchOptions`, `diffFilePath`, `inputBaseDir`, and `diffOutputBaseDir` values.
3. Use `comparePngAsync` for asynchronous file operations.

### 1. Replace `PngData` with `LoadedPng`

The package no longer exports `PngData`. Import `LoadedPng` instead:

```typescript
// Before
import type { PngData } from 'png-visual-compare';

// After
import type { LoadedPng } from 'png-visual-compare';
```

### 2. Option Validation Rules

The library validates all options before it loads or compares images:

- `excludedAreas` must be an array of rectangles with non-negative finite integers where `x1 <= x2` and `y1 <= y2`.
- `pixelmatchOptions` must be an object with valid field types and ranges.
- `diffFilePath`, `inputBaseDir`, and `diffOutputBaseDir` must be strings when defined.
- `diffFilePath` rejects existing directories and existing symlinks.

### 3. Security and Resource Errors Always Throw

Setting `throwErrorOnInvalidInputData: false` ignores only invalid image inputs. Security, resource-limit, and comparison errors always throw:

- `inputBaseDir` and `diffOutputBaseDir` containment errors throw `PathValidationError`.
- Symlink traversal and invalid output targets throw `PathValidationError`.
- `maxDimension`, `maxPixels`, and `maxFileBytes` violations throw `ResourceLimitError`.
- Errors inside `pixelmatch` throw `ComparisonError` (with the original error in `cause`).

### 4. Use `comparePngAsync` for Promises

Use `comparePngAsync` for asynchronous file reads and diff writes:

```typescript
import { comparePngAsync } from 'png-visual-compare';
```

`comparePngAsync` uses the same comparison rules as `comparePng` and runs file I/O with `fs.promises`.

---

## Quick Start

```typescript
import { comparePng, comparePngAsync } from 'png-visual-compare';

const mismatchedPixels: number = comparePng(
    img1, // First PNG: file path or Buffer
    img2, // Second PNG: file path or Buffer
    {
        excludedAreas, // Rectangular regions to skip. Default: []
        diffFilePath, // Output path for the diff PNG (written only when mismatches > 0). Default: undefined
        throwErrorOnInvalidInputData, // Throw on missing or invalid input. Default: true
        extendedAreaColor, // Fill color for size-padding regions. Default: { r: 0, g: 255, b: 0 }
        excludedAreaColor, // Fill color for excluded areas. Default: { r: 0, g: 0, b: 255 }
        maxDimension, // Maximum image width or height in pixels. Default: 16384
        maxPixels, // Maximum pixel count per image or comparison canvas. Default: 16777216
        maxFileBytes, // Maximum file size in bytes for path inputs. Default: 135266304
        diffOutputBaseDir, // Restrict diffFilePath writes to this directory. Default: undefined
        inputBaseDir, // Restrict png1 and png2 file reads to this directory. Default: undefined
        pixelmatchOptions, // Options passed to pixelmatch. Default: undefined
    },
);

expect(mismatchedPixels).toBe(0);

const asyncMismatchedPixels = await comparePngAsync(img1, img2, { diffFilePath: './diff.png' });

expect(asyncMismatchedPixels).toBe(0);
```

---

## Snapshot Matchers

The package provides `toMatchPngSnapshot()` matchers for **Vitest**, **Jest**, and **Playwright** to compare a PNG `Buffer` against a stored baseline.

### Vitest

Import the matcher in your Vitest setup file:

```typescript
import 'png-visual-compare/vitest';
```

Call `toMatchPngSnapshot()` on a PNG `Buffer` or `Uint8Array`:

```typescript
import { readFileSync } from 'node:fs';

expect(readFileSync('./diff.png')).toMatchPngSnapshot();
expect(readFileSync('./dark-mode-diff.png')).toMatchPngSnapshot('dark mode diff');
expect(readFileSync('./masked-diff.png')).toMatchPngSnapshot({
    excludedAreas: [{ x1: 0, y1: 0, x2: 20, y2: 20 }],
});
expect(readFileSync('./thresholded-diff.png')).toMatchPngSnapshot('thresholded diff', {
    pixelmatchOptions: { threshold: 0.2 },
});
```

Update stored snapshots with Vitest:

```sh
npx vitest run -u
```

**Requires Vitest 5** (peer range `>=5.0.0 <6`).

### Jest

The Jest matcher works with default Jest configurations without Babel transforms.

The Jest type augmentation lists `expect` as an optional peer dependency with no version range so pnpm 9+ can resolve `expect` types. On pnpm 8, install `expect` as a direct `devDependency` to load the type augmentation.

You can retry tests that use the matcher with `jest.retryTimes`. Every attempt compares against the same baseline. On Jest 30.5+, Jest rolls back baselines and snapshot counts from failed attempts before it retries.

On Jest 30+, `test.failing` assertions compare images without writing baselines or changing snapshot counts. Run `jest --ci` to detect obsolete sibling baselines, and run `jest -u` to remove them.

Register the matcher in `setupFilesAfterEnv`:

```typescript
import 'png-visual-compare/jest';
```

Call `toMatchPngSnapshot()` in your tests:

```typescript
import { readFileSync } from 'node:fs';

expect(readFileSync('./diff.png')).toMatchPngSnapshot();
expect(readFileSync('./dark-mode-diff.png')).toMatchPngSnapshot('dark mode diff');
expect(readFileSync('./masked-diff.png')).toMatchPngSnapshot({
    excludedAreas: [{ x1: 0, y1: 0, x2: 20, y2: 20 }],
});
expect(readFileSync('./thresholded-diff.png')).toMatchPngSnapshot('thresholded diff', {
    pixelmatchOptions: { threshold: 0.2 },
});
```

Update stored snapshots with Jest:

```sh
npx jest -u
```

If your Jest configuration sets `injectGlobals: false`, register the matcher in your setup file:

```typescript
import { expect } from '@jest/globals';
import { registerJestPngSnapshotMatcher } from 'png-visual-compare/jest';

registerJestPngSnapshotMatcher(expect);
```

### Playwright

Import `expect` from `png-visual-compare/playwright`. Take a screenshot and pass the `Buffer` to `expect`:

```typescript
import { test } from '@playwright/test';
import { expect } from 'png-visual-compare/playwright';

test('header', async ({ page }) => {
    await page.goto('https://example.com');

    expect(await page.screenshot()).toMatchPngSnapshot('header');
    expect(await page.locator('canvas').screenshot()).toMatchPngSnapshot('chart', {
        excludedAreas: [{ x1: 0, y1: 0, x2: 120, y2: 24 }],
    });
});
```

To combine with custom Playwright matchers, extend `baseExpect` with `pngMatchers`:

```typescript
import { expect as baseExpect } from '@playwright/test';
import { pngMatchers } from 'png-visual-compare/playwright';

export const expect = baseExpect.extend(pngMatchers);
```

The Playwright matcher is synchronous and follows Playwright snapshot conventions:

- **Baselines are PNG files** at `testInfo.snapshotPath(name)`. They use `snapshotPathTemplate` and sit next to `toHaveScreenshot()` baselines. `'header'` resolves to `header.png`. Unnamed assertions use `<title>-png-1.png`.
- **`--update-snapshots`** works like `toMatchSnapshot()`: `missing` writes missing baselines and marks the test as a soft failure, `changed` updates mismatching baselines, `all` rewrites all baselines that differ, and `none` never writes baselines. `ignoreSnapshots: true` skips the assertion.
- **On failure**, the matcher attaches `<name>-expected.png`, `<name>-actual.png`, and `<name>-diff.png` to the Playwright HTML report.
- **Do not pass `diffFilePath` or `diffOutputBaseDir`**: the matcher manages diff paths and throws if you set those options.
- **Image limits apply to baselines**: a received image above `maxDimension` or `maxPixels` throws `ResourceLimitError` before writing the baseline. For large `fullPage` or HiDPI screenshots, pass a larger `maxPixels` or `maxDimension` in the matcher options.
- **Requires `@playwright/test` 1.60 or later.**

Differences between `toMatchPngSnapshot()` and Playwright built-in matchers:

| Feature                                    | `toMatchPngSnapshot()`                                     | Playwright built-in matchers                          |
| ------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------- |
| Ignore a region                            | `excludedAreas` in pixel coordinates                       | `mask` by DOM locator                                 |
| Different image dimensions                 | Pads to common canvas and reports pixel count and diff PNG | Fails immediately on dimension mismatch               |
| Tolerance                                  | Per-pixel `threshold`; passes at 0 mismatched pixels       | `threshold`, `maxDiffPixels`, `maxDiffPixelRatio`     |
| Screenshot capture                         | Caller passes a `Buffer`                                   | `toHaveScreenshot()` retries until two captures match |
| Shared engine across Jest, Vitest, Node.js | Yes                                                        | No                                                    |

### Negated Assertions

Use `expect(received).not.toMatchPngSnapshot()` to verify that a PNG **differs** from the stored baseline:

```typescript
expect(await page.screenshot()).not.toMatchPngSnapshot('light mode');
```

- **Passes** when the received PNG has at least 1 mismatched pixel.
- **Fails** when the received PNG has 0 mismatched pixels.
- **Never writes or updates a baseline**, even when you run with `-u`.
- **Throws an error when no baseline exists.** Record the baseline with a positive `toMatchPngSnapshot()` assertion first.

---

## API Reference

### `comparePng(png1, png2, opts?): number`

Compares two PNG images pixel by pixel and returns the number of mismatched pixels (`0` means that the images match).

**Parameters:**

| Parameter | Type                | Description                               |
| --------- | ------------------- | ----------------------------------------- |
| `png1`    | `string \| Buffer`  | First PNG: file path or raw PNG `Buffer`  |
| `png2`    | `string \| Buffer`  | Second PNG: file path or raw PNG `Buffer` |
| `opts`    | `ComparePngOptions` | Optional configuration object             |

---

### `comparePngAsync(png1, png2, opts?): Promise<number>`

Asynchronous version of `comparePng`. It runs the same comparison pipeline and uses `fs.promises` for file reads and diff writes.

---

### `ComparePngOptions`

| Option                         | Type                | Default                  | Description                                                                                                                                                               |
| ------------------------------ | ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `excludedAreas`                | `Area[]`            | `[]`                     | Rectangular regions to skip during comparison. The library paints these regions on both images so they always match.                                                      |
| `diffFilePath`                 | `string`            | `undefined`              | File path for the output diff PNG. The library writes this file only when `mismatchedPixels > 0`.                                                                         |
| `throwErrorOnInvalidInputData` | `boolean`           | `true`                   | Throw an error when an input is missing or invalid. Set to `false` to treat one invalid input as a `0×0` PNG. The library always throws when **both** inputs are invalid. |
| `extendedAreaColor`            | `Color`             | `{ r: 0, g: 255, b: 0 }` | Fill color for padded areas when the two images have different dimensions.                                                                                                |
| `excludedAreaColor`            | `Color`             | `{ r: 0, g: 0, b: 255 }` | Fill color for `excludedAreas` on both images.                                                                                                                            |
| `maxDimension`                 | `number`            | `16384`                  | Maximum width or height in pixels for each input image. **Always throws `ResourceLimitError` when exceeded.** Set to `Infinity` to disable.                               |
| `maxPixels`                    | `number`            | `16777216`               | Maximum pixel count for each input image and for the normalized canvas. **Always throws `ResourceLimitError` when exceeded.** Set to `Infinity` to disable.               |
| `maxFileBytes`                 | `number`            | `135266304`              | Maximum byte size for a PNG file read from a path (ignored for `Buffer` inputs). **Always throws `ResourceLimitError` when exceeded.** Set to `Infinity` to disable.      |
| `diffOutputBaseDir`            | `string`            | `undefined`              | Base directory for `diffFilePath`. Writing outside this directory throws `PathValidationError`.                                                                           |
| `inputBaseDir`                 | `string`            | `undefined`              | Base directory for `png1` and `png2` file paths. Reading outside this directory throws `PathValidationError`.                                                             |
| `pixelmatchOptions`            | `PixelmatchOptions` | `undefined`              | Options passed to [pixelmatch](https://github.com/mapbox/pixelmatch).                                                                                                     |

---

### `Area`

```typescript
type Area = {
    x1: number; // left edge (pixels from left)
    y1: number; // top edge (pixels from top)
    x2: number; // right edge (pixels from left, inclusive)
    y2: number; // bottom edge (pixels from top, inclusive)
};
```

---

### `Color`

```typescript
type Color = {
    r: number; // red channel (0-255)
    g: number; // green channel (0-255)
    b: number; // blue channel (0-255)
};
```

---

### `PixelmatchOptions`

| Option         | Type                              | Default         | Description                                                                                    |
| -------------- | --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `threshold`    | `number`                          | `0.1`           | Matching threshold from `0` to `1`. Smaller values make the comparison more sensitive.         |
| `includeAA`    | `boolean`                         | `false`         | Set to `true` to disable anti-aliasing detection and count anti-aliased pixels as mismatches.  |
| `alpha`        | `number`                          | `0.1`           | Opacity of unchanged pixels in the diff image (`0` to `1`).                                    |
| `aaColor`      | `[r, g, b]`                       | `[255, 255, 0]` | Color of anti-aliased pixels in the diff image.                                                |
| `diffColor`    | `[r, g, b]`                       | `[255, 0, 0]`   | Color of mismatched pixels in the diff image.                                                  |
| `diffColorAlt` | `[r, g, b]`                       | `undefined`     | Color for dark-on-light differences in the diff image. Defaults to `diffColor` when undefined. |
| `diffMask`     | `boolean`                         | `false`         | Draw the diff over a transparent background instead of the original image.                     |
| `checkerboard` | `boolean`                         | `true`          | Blend semi-transparent pixels over a checkerboard pattern (`true`) or over white (`false`).    |
| `windowSize`   | `number`                          | `16`            | Side length in pixels of square blocks for the spatial pre-pass, or `Infinity` to disable it.  |
| `ignoreMask`   | `Uint8Array \| Uint8ClampedArray` | `undefined`     | Flat byte mask (`1 byte per pixel`, length `width * height`). Non-zero entries skip pixels.    |

### Errors

All public error classes extend `Error` and define a string `code` property. Check errors with `instanceof` or `error.code`:

| Class                 | `code`                  | Cause                                                                                                                                                                                                              |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InvalidInputError`   | `ERR_INVALID_PNG_INPUT` | A PNG input is missing, malformed, or undecodable, or an option in `excludedAreas`, `extendedAreaColor`, `excludedAreaColor`, or `pixelmatchOptions` is invalid.                                                   |
| `PathValidationError` | `ERR_PATH_VALIDATION`   | A path fails validation: traversal outside a base directory, symlink at the output path, null byte, swapped inode, symlinked diff parent directory, missing inode identity, FIFO/device, or hard-linked diff file. |
| `ResourceLimitError`  | `ERR_RESOURCE_LIMIT`    | A PNG exceeds `maxDimension`, `maxPixels`, or `maxFileBytes`. **Always throws** regardless of `throwErrorOnInvalidInputData`.                                                                                      |
| `ComparisonError`     | `ERR_COMPARISON`        | The `pixelmatch` call threw an error (for example, an `ignoreMask` size mismatch). The original error is on `error.cause`. **Always throws.**                                                                      |

```typescript
import { comparePng, ComparisonError } from 'png-visual-compare';

try {
    comparePng(img1, img2);
} catch (error) {
    if (error instanceof ComparisonError) {
        console.error('Pixel comparison failed:', error.message);
        console.error('Cause:', error.cause);
    }
}
```

### Exported Constants

| Constant                      | Value                    | Description                                                                                  |
| ----------------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `DEFAULT_EXTENDED_AREA_COLOR` | `{ r: 0, g: 255, b: 0 }` | Default fill color for extended canvas padding                                               |
| `DEFAULT_EXCLUDED_AREA_COLOR` | `{ r: 0, g: 0, b: 255 }` | Default fill color for excluded areas                                                        |
| `DEFAULT_MAX_DIMENSION`       | `16384`                  | Default maximum image width or height in pixels                                              |
| `DEFAULT_MAX_PIXELS`          | `16777216`               | Default maximum pixel count per image or normalized canvas                                   |
| `DEFAULT_MAX_FILE_BYTES`      | `135266304`              | Default maximum byte size for a PNG read from a file path (`DEFAULT_MAX_PIXELS * 8 + 1 MiB`) |

---

## Security Model

The security options are optional and protect distinct boundaries.

### Resource Limits

`maxDimension` and `maxPixels` check the width and height in the PNG IHDR header. They limit the **decoded** image size and stop small files that declare huge dimensions (for example, `60000 × 60000` pixels).

They also limit decompression. Before `pngjs` decodes an image, the library inflates the image data with `node:zlib` and stops one byte past the size declared in the IHDR header (at most about 128 MiB with default limits). If a file decompresses past that size, the library rejects it immediately.

`maxFileBytes` limits the **compressed** file size before the header is read. The library checks `maxFileBytes` against the file size before reading any bytes, and checks it again against the bytes read. The default limit is `135,266,304` bytes (129 MiB). `maxFileBytes` applies only to file path inputs, not to `Buffer` inputs.

When `inputBaseDir` is set, the library checks path containment before `maxFileBytes` so the error message never leaks the size of a file outside `inputBaseDir`.

### Corrupt Image Data

`pngjs` 7 does not report an error when non-interlaced PNG image data is truncated or has an invalid Adler-32 checksum, and it inflates interlaced PNG data without an output size limit. To prevent uninitialized memory reads and decompression bombs, this library inflates the image data with `node:zlib` before decoding and requires the exact byte count declared by the header. Any mismatch throws `InvalidInputError`.

### Path Containment

`inputBaseDir` and `diffOutputBaseDir` restrict file reads and diff writes to a base directory after symlink resolution. Both options are `undefined` by default.

When you set a base directory, the library checks for path swaps during I/O:

- **Reads** reject paths lexically outside `inputBaseDir` before touching the filesystem. Then the library opens the file with `O_NONBLOCK`, pins the file descriptor, verifies symlink-resolved containment, and checks that the open descriptor has the same `dev` and `ino` as the approved path and is a regular file.
- **Writes** create missing parent directories one segment at a time and reject symlinks in the parent chain. The writer resolves the canonical parent directory, opens the file with `O_WRONLY | O_CREAT | O_NOFOLLOW | O_NONBLOCK`, verifies `dev` and `ino` after open, rejects non-regular files and files with more than one hard link, and truncates the file only after all checks pass. On failure, the writer closes the handle without unlinking the path so it never deletes a file swapped in by another process.

Node.js does not provide `openat`. Because of this, these checks **detect** a path swap and abort the operation instead of preventing the rename at the OS level.

Both containment checks require non-zero inode numbers from the filesystem. If a filesystem reports `ino === 0`, the library throws `PathValidationError`.

### What Is Not Covered

- Setting `maxDimension` and `maxPixels` to `Infinity` removes the decompression size limit.
- When `inputBaseDir` and `diffOutputBaseDir` are not set, containment, swap detection, hard-link checks, and FIFO checks do not run.
- **Hard links on reads**: A hard link inside `inputBaseDir` shares the same inode as its target on the same filesystem. Reads allow hard links so content-addressed caches and `cp -al` baselines work. Diff writes under `diffOutputBaseDir` reject files with `nlink > 1`. Keep `inputBaseDir` writable only by trusted processes.
- This library is designed for test runners and server-side comparisons of controlled images. Do not use it as an untrusted sandbox.

---

## Excluded Areas Builder

The **Excluded Areas Builder** is a browser tool in this repository. Use it to draw exclusion rectangles on an image and copy the `Area[]` JSON array.

### Start the Tool

```sh
npm run tool:excluded-areas-builder
```

This command opens `tools/excluded-areas-builder.html` in your default browser on macOS or Linux.

### How to Use the Tool

**1. Load an image**

Click **Upload Image** in the toolbar or drag and drop a PNG image onto the page.

**2. Adjust the zoom level**

- Click **Fit** to fit the image to the viewport.
- Click **+** or **−** to zoom in or out in 25% steps.
- Hold `Ctrl` (or `Cmd` on macOS) and scroll to zoom.

**3. Draw exclusion rectangles**

Click and drag on the image to draw a rectangle. Release the mouse button to save the rectangle.

**4. Select and delete rectangles**

- Click a rectangle on the image or in the sidebar list to select it.
- Press `Delete` or `Backspace`, or click **×** in the sidebar, to delete a rectangle.
- Click **Clear all** to delete all rectangles.
- Press `Escape` to clear the selection.

**5. Copy the JSON**

Click **Copy** in the **Area[] JSON** panel and paste the array into `comparePng`:

```typescript
import { comparePng } from 'png-visual-compare';

const mismatchedPixels = comparePng(img1, img2, {
    excludedAreas: [
        { x1: 120, y1: 45, x2: 340, y2: 210 },
        { x1: 500, y1: 300, x2: 650, y2: 400 },
    ],
});
```

The tool always outputs coordinates in original image pixels regardless of the zoom level.

---

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, commands, and pull request rules.

---

## License

MIT © [dichovsky](https://github.com/dichovsky)

## Buy Me A Coffee

Support this project: [![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/dichovsky)
