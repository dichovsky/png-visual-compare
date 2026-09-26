# png-visual-compare

**🎯 Visual regression testing for PNG images with zero binary dependencies**

[![npm version](https://img.shields.io/npm/v/png-visual-compare.svg?style=flat-square)](https://www.npmjs.com/package/png-visual-compare)
[![npm downloads](https://img.shields.io/npm/dm/png-visual-compare.svg?style=flat-square)](https://www.npmjs.com/package/png-visual-compare)
[![Tests](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/dichovsky/png-visual-compare?style=flat-square)](https://github.com/dichovsky/png-visual-compare/blob/main/LICENSE)

---

A Node.js utility to compare PNG images or their areas without binary and OS dependencies.

**Key Benefits:**

- ✨ **Zero Native Binaries** — Pure JavaScript for supported macOS and Linux environments
- 🖼️ **File or Buffer** — Accept absolute file paths or raw `Buffer` inputs
- 🔍 **Pixel-Level Accuracy** — Powered by [pixelmatch](https://github.com/mapbox/pixelmatch)
- 🎭 **Exclusion Zones** — Skip regions during comparison with `excludedAreas`
- 🗂️ **Diff Output** — Optionally write a diff PNG with highlighted mismatches
- 💪 **TypeScript Support** — Full type definitions included

## Table of Contents

- [Installation](#installation)
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

> **Platform Requirement:** macOS or Linux only. Windows is not supported.
>
> **Node.js Requirement:** Node.js 22.12.0 or higher is required.

---

## Migration Guide to v7.0.0

1. Run on Node.js 22.12.0 or later.
2. If you use `png-visual-compare/vitest`, upgrade to Vitest 5.
3. Expect `maxFileBytes` and the stricter containment checks to surface as new errors in edge cases.
4. If `vitest` 4 or `@playwright/test` older than 1.60 is installed, upgrade it first — npm now refuses the install even if you only use `comparePng`.

### 1. Node.js 22.12.0 or later is required

`engines.node` is now `>=22.12.0` (was `>=20`). Node.js 20 is end-of-life.

### 2. The Vitest matcher requires Vitest 5

The `vitest` peer range is now `>=5.0.0 <6` (was `>=4.1.0 <5`). Vitest 5 changed `Matchers` to two type parameters (`Matchers<R, T>`), and the `toMatchPngSnapshot` augmentation no longer type-checks against Vitest 4. Stay on 6.3.0 if you cannot upgrade Vitest yet. The Jest matcher and the `comparePng` / `comparePngAsync` signatures are unchanged.

### 3. New limits and containment checks

- `maxFileBytes` (default `135266304`) caps the size of a PNG read from a path and throws `ResourceLimitError` when exceeded, regardless of `throwErrorOnInvalidInputData`. `Buffer` inputs are not affected. See [Resource limits](#resource-limits).
- With `inputBaseDir` or `diffOutputBaseDir` set, these are now refused with `PathValidationError`: a file swapped between validation and use, a filesystem that reports no file identity, and (with `diffOutputBaseDir`) a symlinked parent directory of `diffFilePath`. See [Security Model](#security-model).

### 4. Peer dependency conflicts at install

`vitest` and `@playwright/test` are optional peer dependencies, and npm checks an optional peer whenever it is installed — whether or not you import the matching subpath. A project with `vitest` 4 or with `@playwright/test` older than 1.60 therefore gets `ERESOLVE` from `npm install png-visual-compare@7`, even if it only calls `comparePng`. With a caret range such as `^1.55.0`, npm instead upgrades Playwright to the latest 1.x, which changes the browser builds you test against. Upgrade the peer first, or keep 6.3.0. `legacy-peer-deps=true` in `.npmrc` bypasses the check, but it applies to every later install, not just this one.

---

## Migration Guide to v6.0.0

1. Replace `PngData` imports with `LoadedPng`.
2. Recheck any caller-supplied `excludedAreas`, `pixelmatchOptions`, `diffFilePath`, `inputBaseDir`, and `diffOutputBaseDir`.
3. If your code already uses async filesystem orchestration, switch to `comparePngAsync`.

### 1. Replace `PngData` with `LoadedPng`

`PngData` is no longer exported. If you imported it from the package, switch to `LoadedPng`:

```typescript
// Before
import type { PngData } from 'png-visual-compare';

// After
import type { LoadedPng } from 'png-visual-compare';
```

### 2. Expect stricter option validation

The library now fails fast for malformed option data instead of relying on downstream behavior:

- `excludedAreas` must be an array of non-negative finite integer rectangles with `x1 <= x2` and `y1 <= y2`
- `pixelmatchOptions` must be an object with validated numeric/boolean/tuple fields
- `diffFilePath`, `inputBaseDir`, and `diffOutputBaseDir` must be strings when provided
- `diffFilePath` now rejects existing directories and existing symlinks in output mode

### 3. Security/resource limits still throw in permissive mode

`throwErrorOnInvalidInputData: false` only downgrades ordinary invalid-image inputs. Security, resource-boundary, and comparison-kernel checks still throw:

- `inputBaseDir` / `diffOutputBaseDir` containment violations → `PathValidationError`
- symlink traversal and invalid output target checks → `PathValidationError`
- `maxDimension` / `maxPixels` limits → `ResourceLimitError`
- failures inside the underlying `pixelmatch` call → `ComparisonError` (the original error is preserved on `cause`)

### 4. Use `comparePngAsync` for promise-based I/O

If your integration already uses async filesystem orchestration, prefer:

```typescript
import { comparePngAsync } from 'png-visual-compare';
```

It preserves the same comparison semantics as `comparePng`, but performs file-backed reads/writes asynchronously.

---

## Quick Start

```typescript
import { comparePng, comparePngAsync } from 'png-visual-compare';

const mismatchedPixels: number = comparePng(
    img1, // First PNG: absolute file path or Buffer
    img2, // Second PNG: absolute file path or Buffer
    {
        excludedAreas, // Regions to skip during comparison. Default: []
        diffFilePath, // Path to write the diff PNG (only written when mismatch > 0). Default: undefined
        throwErrorOnInvalidInputData, // Throw on missing/invalid input. Default: true
        extendedAreaColor, // Color used for size-padding regions. Default: { r: 0, g: 255, b: 0 }
        excludedAreaColor, // Color used for excluded areas. Default: { r: 0, g: 0, b: 255 }
        maxDimension, // Max allowed image width/height in px. Always throws if exceeded. Default: 16384
        maxPixels, // Max allowed decoded pixel count per image/canvas. Default: 16777216
        maxFileBytes, // Max allowed size of a PNG read from a path. Always throws if exceeded. Default: 135266304
        diffOutputBaseDir, // Restrict diffFilePath writes to this directory (path-traversal guard). Default: undefined
        inputBaseDir, // Restrict png1/png2 reads to this directory (path-traversal guard). Default: undefined
        pixelmatchOptions, // Public PixelmatchOptions validated and adapted for pixelmatch. Default: undefined
    },
);

expect(mismatchedPixels).toBe(0);

const asyncMismatchedPixels = await comparePngAsync(img1, img2, { diffFilePath: './diff.png' });

expect(asyncMismatchedPixels).toBe(0);
```

---

## Snapshot Matchers

The package also ships `toMatchPngSnapshot()` matchers for **Vitest** and **Jest** (side-effect plugins) and for **Playwright** (an extended `expect`), so PNG buffers can be asserted against a stored baseline.

### Vitest

Register the matcher in your test setup file:

```typescript
import 'png-visual-compare/vitest';
```

Then assert any PNG `Buffer` or `Uint8Array`:

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

Update stored snapshots with the normal Vitest command:

```sh
npx vitest run -u
```

**Requires Vitest 5** (peer range `>=5.0.0 <6`). Vitest 4 is not supported from 7.0.0; see [Migration Guide to v7.0.0](#migration-guide-to-v700).

### Jest

Releases after 7.0.0 work with a stock Jest configuration — no Babel or transform setup is needed. On 7.0.0 and earlier, Jest needs the Babel transform described in the [7.0.0 README](https://github.com/dichovsky/png-visual-compare/blob/release/v7.0.0/README.md#jest); drop it once you upgrade.

The Jest type augmentation uses an optional `expect` peer with range `>=29 <31`. npm checks optional peers when present: a direct dependency on another `expect` version can cause `ERESOLVE` during installation, even if your project does not use Jest. Incompatible transitive versions can be nested separately.

> **Known issue (Jest 30.5+):** with `jest.retryTimes`, a mismatching PNG can pass on the retry and be recorded as a new snapshot (tracked as RELI-12). Do not enable retries for tests that use this matcher until it is fixed.

On Jest 30+, `test.failing` PNG assertions compare without recording or updating baselines or snapshot totals. Jest 29 does not expose the expected-failure flag to matchers, so this protection is unavailable there. Obsolete sibling PNG baselines are reported by `jest --ci`; remove them with `jest -u` after deleting assertions.

Register the matcher from `setupFilesAfterEnv`:

```typescript
import 'png-visual-compare/jest';
```

Then use it the same way in tests:

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

Update stored snapshots with Jest's normal snapshot flow:

```sh
npx jest -u
```

If your Jest config uses `injectGlobals: false`, register the matcher explicitly in your setup file:

```typescript
import { expect } from '@jest/globals';
import { registerJestPngSnapshotMatcher } from 'png-visual-compare/jest';

registerJestPngSnapshotMatcher(expect);
```

### Playwright

Import `expect` from the Playwright entry point instead of `@playwright/test`. Capture the screenshot yourself and assert the `Buffer`:

```typescript
import { test } from '@playwright/test';
import { expect } from 'png-visual-compare/playwright';

test('header', async ({ page }) => {
    await page.goto('https://example.com');

    expect(await page.screenshot()).toMatchPngSnapshot('header');
    expect(await page.locator('canvas').screenshot()).toMatchPngSnapshot('chart', {
        excludedAreas: [{ x1: 0, y1: 0, x2: 120, y2: 24 }], // e.g. a live timestamp drawn on the canvas
    });
});
```

Already extending `expect`? Add the matchers yourself, or combine with `mergeExpects`:

```typescript
import { expect as baseExpect } from '@playwright/test';
import { pngMatchers } from 'png-visual-compare/playwright';

export const expect = baseExpect.extend(pngMatchers);
```

The matcher is synchronous, like Playwright's own `toMatchSnapshot()`, so there is nothing to `await`. It follows Playwright's snapshot conventions:

- **Baselines are PNG files** at `testInfo.snapshotPath(name)`, so they honour `snapshotPathTemplate` and sit next to your `toHaveScreenshot()` baselines. `'header'` becomes `header.png`, and every assertion with that name compares against it, so `expect.poll(...).toMatchPngSnapshot('header')` works; a repeated name numbers only its report artifacts (`header-1-actual.png`, …). Unnamed assertions are named from the test title (`<title>-png-1.png`), shortened with a hash when long.
- **`--update-snapshots`** works exactly as for `toMatchSnapshot()`: `missing` (the default) writes a missing baseline and fails the test softly, so every missing baseline is written in one run and the test is not retried against it, `changed` rewrites mismatching baselines, `all` rewrites every baseline that differs, and `none` never writes. `ignoreSnapshots: true` skips the assertion.
- **On failure** the baseline, received image and diff image are attached as `<name>-expected.png`, `<name>-actual.png` and `<name>-diff.png`, so the HTML report shows its image diff viewer.
- **The diff location is managed for you**: passing `diffFilePath` or `diffOutputBaseDir` throws.
- **Image limits apply to baselines too.** A received image over `maxDimension` or `maxPixels` throws `ResourceLimitError` rather than being written as a baseline no later run could compare against. Full-page or HiDPI screenshots pass the defaults quickly — at `deviceScaleFactor: 2`, a 1280 px wide `fullPage` capture exceeds `maxPixels` once the page is about 3,277 CSS px tall — so pass a larger `maxPixels` (and `maxDimension` for very long pages) to those assertions.
- **Requires `@playwright/test` 1.60 or later.** The soft, non-retried failure for a missing baseline uses the same matcher-result fields as Playwright's built-ins, which it honours from 1.60.

How it differs from `toHaveScreenshot()` / `toMatchSnapshot()`:

|                                         | `toMatchPngSnapshot()`                                        | Playwright built-ins                                  |
| --------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Ignore a region                         | `excludedAreas` by pixel coordinates (canvas, video, images)  | `mask` by DOM locator                                 |
| Received and baseline differ in size    | Compared on a padded canvas; reports a pixel count and a diff | Fails with "Expected an image W×H, received W×H"      |
| Tolerance                               | Per-pixel `threshold` only; passes at 0 mismatched pixels     | `threshold`, `maxDiffPixels`, `maxDiffPixelRatio`     |
| Capture and stabilisation               | You pass a `Buffer`                                           | `toHaveScreenshot()` retries until two captures match |
| Same engine in Jest, Vitest, standalone | Yes                                                           | No                                                    |

`toMatchPngSnapshot()` is intentionally strict: it accepts only PNG `Buffer` / `Uint8Array` input, and passes any provided `ComparePngOptions` to `comparePng` when checking the stored snapshot. Recording or updating a baseline always requires a decodable PNG within the configured image limits, even when `throwErrorOnInvalidInputData` is `false`.

### Negated assertions

`expect(received).not.toMatchPngSnapshot()` asserts that the received PNG **differs** from the stored snapshot:

```typescript
expect(await page.screenshot()).not.toMatchPngSnapshot('light mode');
```

- **Passes** when the received PNG differs from the stored snapshot beyond the configured threshold.
- **Fails** when they match.
- **Never writes or updates a snapshot**, even under `-u` — you cannot record what an image must _not_ be.
- **Throws when no snapshot is stored.** A missing baseline would otherwise pass vacuously, which is a false green. Record the baseline with a positive `toMatchPngSnapshot()` first.

---

## API Reference

### `comparePng(png1, png2, opts?): number`

Compares two PNG images pixel-by-pixel and returns the number of mismatched pixels (`0` means identical).

**Parameters:**

| Parameter | Type                | Description                                         |
| --------- | ------------------- | --------------------------------------------------- |
| `png1`    | `string \| Buffer`  | First PNG — absolute file path or raw PNG `Buffer`  |
| `png2`    | `string \| Buffer`  | Second PNG — absolute file path or raw PNG `Buffer` |
| `opts`    | `ComparePngOptions` | Optional configuration object                       |

---

### `comparePngAsync(png1, png2, opts?): Promise<number>`

Async equivalent of `comparePng`. It performs the same comparison flow, but uses `fs.promises`
for file-backed reads and diff writes.

---

### `ComparePngOptions`

| Option                         | Type                | Default                  | Description                                                                                                                                                                                                                                                  |
| ------------------------------ | ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `excludedAreas`                | `Area[]`            | `[]`                     | Rectangular regions to exclude from comparison (painted on both images before diffing, so they always match)                                                                                                                                                 |
| `diffFilePath`                 | `string`            | `undefined`              | File path for the diff PNG. Only written when `result > 0`                                                                                                                                                                                                   |
| `throwErrorOnInvalidInputData` | `boolean`           | `true`                   | Throw on missing/unsupported input. Set to `false` to treat invalid input as a zero-size PNG. An error is always thrown when **both** inputs are invalid                                                                                                     |
| `extendedAreaColor`            | `Color`             | `{ r: 0, g: 255, b: 0 }` | Fill colour for padded regions when images differ in size. Override when the default green clashes with your image content                                                                                                                                   |
| `excludedAreaColor`            | `Color`             | `{ r: 0, g: 0, b: 255 }` | Fill colour applied to `excludedAreas` on both images before comparison. Override when the default blue clashes with your image content                                                                                                                      |
| `maxDimension`                 | `number`            | `16384`                  | Maximum allowed width or height (px) for either input image. **Always throws when exceeded, regardless of `throwErrorOnInvalidInputData`.** Set to `Infinity` to disable. Protects against DoS via crafted PNG headers                                       |
| `maxPixels`                    | `number`            | `16777216`               | Maximum decoded pixel count for a single input image and for the normalized comparison canvas. Set to `Infinity` to disable. Protects against large-but-axis-valid PNGs that would still exhaust memory                                                      |
| `maxFileBytes`                 | `number`            | `135266304`              | Maximum size, in bytes, of a PNG read from a path. Ignored for `Buffer` inputs. **Always throws when exceeded, regardless of `throwErrorOnInvalidInputData`.** Set to `Infinity` to disable. Bounds the compressed bytes read before the header is inspected |
| `diffOutputBaseDir`            | `string`            | `undefined`              | When set, `diffFilePath` must resolve to a path **inside** this directory. Any attempt to write outside it throws `"Path traversal detected"`. Use in server-side contexts where `diffFilePath` may be caller-controlled                                     |
| `inputBaseDir`                 | `string`            | `undefined`              | When set, string input paths (`png1` / `png2`) must resolve to a path **inside** this directory. Any attempt to read outside it throws `"Path traversal detected"`. Use in server-side contexts where paths may be caller-controlled                         |
| `pixelmatchOptions`            | `PixelmatchOptions` | `undefined`              | Options forwarded to [pixelmatch](https://github.com/mapbox/pixelmatch)                                                                                                                                                                                      |

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

| Option         | Type        | Default         | Description                                                                                  |
| -------------- | ----------- | --------------- | -------------------------------------------------------------------------------------------- |
| `threshold`    | `number`    | `0.1`           | Matching threshold `0`–`1`. Lower = more sensitive                                           |
| `includeAA`    | `boolean`   | `false`         | When `true`, anti-aliased pixels count as mismatches                                         |
| `alpha`        | `number`    | `0.1`           | Opacity of unchanged pixels in the diff image                                                |
| `aaColor`      | `[r, g, b]` | `[255, 255, 0]` | Colour of anti-aliased pixels in the diff                                                    |
| `diffColor`    | `[r, g, b]` | `[255, 0, 0]`   | Colour of differing pixels in the diff                                                       |
| `diffColorAlt` | `[r, g, b]` | `undefined`     | Diff colour where `png2` is darker than `png1` (added vs removed); falls back to `diffColor` |
| `diffMask`     | `boolean`   | `false`         | Show only changed pixels on a transparent background                                         |
| `checkerboard` | `boolean`   | `true`          | Blend semi-transparent pixels against a checkerboard (vs white)                              |

### Errors

All public errors extend the built-in `Error` and expose a stable string `code` for runtime matching without parsing messages. Match either via `instanceof` or via `code`:

| Class                 | `code`                  | When it throws                                                                                                                                                                                                                                                                                        |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InvalidInputError`   | `ERR_INVALID_PNG_INPUT` | A PNG input is missing, malformed, or cannot be decoded, or an `excludedAreas`, colour, or `pixelmatchOptions` value is invalid. Per-input failures are recoverable via `throwErrorOnInvalidInputData: false` (treated as a zero-size PNG); invalid options always throw                              |
| `PathValidationError` | `ERR_PATH_VALIDATION`   | A file path fails validation: traversal outside a base directory, symlink at the output target, empty/null-byte path. With `inputBaseDir` / `diffOutputBaseDir` set, also a file swapped between validation and use, a symlinked diff parent directory, or a filesystem that reports no file identity |
| `ResourceLimitError`  | `ERR_RESOURCE_LIMIT`    | A PNG would exceed `maxDimension`, `maxPixels`, or `maxFileBytes`. **Always throws** regardless of `throwErrorOnInvalidInputData`                                                                                                                                                                     |
| `ComparisonError`     | `ERR_COMPARISON`        | The underlying `pixelmatch` call threw. The original failure is preserved on the standard `cause` property. **Always throws**                                                                                                                                                                         |

```typescript
import { comparePng, ComparisonError } from 'png-visual-compare';

try {
    comparePng(img1, img2);
} catch (error) {
    if (error instanceof ComparisonError) {
        console.error('Pixel comparison failed:', error.message);
        console.error('Underlying:', error.cause);
    }
}
```

### Exported constants

| Constant                      | Value                    | Description                                                                                                                      |
| ----------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_EXTENDED_AREA_COLOR` | `{ r: 0, g: 255, b: 0 }` | Default fill colour for size-extended padding regions                                                                            |
| `DEFAULT_EXCLUDED_AREA_COLOR` | `{ r: 0, g: 0, b: 255 }` | Default fill colour for excluded areas                                                                                           |
| `DEFAULT_MAX_DIMENSION`       | `16384`                  | Default maximum image dimension (px). Import this constant when you want to reference the default value                          |
| `DEFAULT_MAX_PIXELS`          | `16777216`               | Default maximum decoded pixel count for one image or the normalized comparison canvas                                            |
| `DEFAULT_MAX_FILE_BYTES`      | `135266304`              | Default maximum size (bytes) of a PNG read from a path — the raw size of a 16-bit RGBA image at `DEFAULT_MAX_PIXELS`, plus 1 MiB |

---

## Security Model

The security options are opt-in and bound distinct things. Knowing what each one does _not_ cover matters as much as what it does.

### Resource limits

`maxDimension` and `maxPixels` read the width and height declared in the PNG's IHDR header. They bound the **decoded** image, which is what protects you from a small file that claims to be 60000 × 60000 pixels.

They say nothing about how many bytes must be read to reach that header. Without a separate limit, a multi-gigabyte file is fully resident in memory before either check runs. `maxFileBytes` closes that gap by bounding the **compressed** bytes. It is checked from the file's size before a single byte is read, and again against the bytes actually read, so a file that grows mid-read, a FIFO, or a device cannot slip past it.

The default is 135,266,304 bytes (129 MiB): the raw size of a 16-bit RGBA image — the widest PNG pixel format, 8 bytes per pixel — at `maxPixels`, plus 1 MiB for filter bytes, compression framing, and metadata chunks. No PNG that passes `maxPixels` reaches it, whatever its bit depth. Lower it if you compare untrusted uploads and want a tighter memory bound.

`maxFileBytes` applies only to path inputs. A `Buffer` you pass in is already in memory, and `maxPixels` still bounds its decode.

When `inputBaseDir` is set, containment is checked before the byte cap. The cap's error names an exact size and is not recoverable, so checking it first would disclose the size and existence of a file outside the boundary. A path outside the boundary always fails as a `PathValidationError`, before the file is even opened.

### Path containment

`inputBaseDir` and `diffOutputBaseDir` confine reads and writes to a directory, enforced after symlink resolution. Both are unset by default, in which case no boundary exists and none of the checks below run.

When a boundary is set, the library defends against a path that changes underneath it:

- **Reads** refuse a path that is lexically outside the boundary before touching the filesystem, so whether it exists is never disclosed. They then open the file, pinning one inode, and prove that inode is the one containment approved. Bytes are never returned from a file that failed the check.
- **Writes** create each parent directory one component at a time and refuse any component that is a symlink. The parent chain is then resolved and the file is opened _inside the canonical directory_, so the path traversed at open time contains no symlink at all — redirecting the write requires renaming a real directory in that chain, not merely planting a link. Truncation is deferred until after the opened handle has been proven to sit inside the boundary, so an escaped target is never emptied. Failed writes close their handles without deleting the output path: another writer may have replaced it, and Node provides no atomic way to unlink only the originally opened inode. A refused write can leave an empty owner-only file behind. After a detected parent-directory swap, that file can sit at the redirected location outside `diffOutputBaseDir`, with no diff bytes written to it. A later write failure can leave partial output at the verified destination.

Node exposes no `openat`, so the underlying race cannot be _prevented_ portably. These checks **detect** a swap and refuse, rather than making the swap impossible. The practical guarantee is that no data crosses the boundary in either direction, not that an attacker cannot try.

Both checks need the filesystem to report file identity. On a mount that reports none (some network filesystems), containment cannot be verified and the operation is refused with a `PathValidationError` rather than passing silently. Unset the base directory option if you need to run there without containment.

### What is not covered

- Decompression cost inside `pngjs` itself is bounded only indirectly, through the limits above.
- Without `inputBaseDir` or `diffOutputBaseDir` there is no containment boundary, and the swap-detection checks do not run.
- **Hard links.** A hard link inside a boundary to a file elsewhere on the same filesystem _is_ that file — the same inode — so containment cannot tell them apart: a read returns its bytes and a diff write overwrites it. Keep the base directories writable only by trusted processes. On Linux, `fs.protected_hardlinks=1` (the default on most distributions) stops users hard-linking files they do not own.
- **Special files inside a boundary.** A FIFO planted at an input path or at `diffFilePath` inside the boundary blocks the call that opens it. Paths outside the boundary are refused before they are opened.
- The library is intended for test-time and server-side comparison of images you control. It is not a sandbox for arbitrary untrusted input.

---

## Excluded Areas Builder

Defining `excludedAreas` coordinates by hand can be tedious. The **Excluded Areas Builder** is a browser-based visual tool included in this repository that lets you draw exclusion rectangles directly on your image and copy the resulting `Area[]` JSON with one click.

### Launch

```sh
npm run tool:excluded-areas-builder
```

This opens `tools/excluded-areas-builder.html` in your default browser on macOS or Linux. No server or build step is required — the file runs entirely in the browser.

### How to use

**1. Load your image**

Either click **Upload Image** in the toolbar or drag and drop any PNG (or other image format) onto the page.

**2. Zoom to a comfortable level**

- Click **Fit** to scale the image to fit the viewport (default on load).
- Click **+** / **−** to zoom in or out in 25% steps.
- Hold `Ctrl` (or `Cmd` on macOS) and scroll to zoom continuously.

**3. Draw exclusion rectangles**

Click and drag on the image to draw a rectangle. Release the mouse to commit it. Each committed rectangle is shown with an orange border and a `#N` label in its top-left corner matching the numbered list in the sidebar.

**4. Select and delete rectangles**

- Click a rectangle on the image or its entry in the sidebar to select it (turns blue).
- Press `Delete` or `Backspace` to remove the selected rectangle, or click the **×** button next to any entry in the sidebar.
- Click **Clear all** to remove every rectangle at once.
- Press `Escape` to deselect without deleting.

**5. Copy the JSON**

The **Area[] JSON** panel in the sidebar updates live as you draw. Click **Copy** to copy the JSON to your clipboard, then paste it directly into your `comparePng` call:

```typescript
import { comparePng } from 'png-visual-compare';

const mismatchedPixels = comparePng(img1, img2, {
    excludedAreas: [
        { x1: 120, y1: 45, x2: 340, y2: 210 },
        { x1: 500, y1: 300, x2: 650, y2: 400 },
    ],
});
```

All coordinates are in original image pixels regardless of the current zoom level.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commands, and PR guidelines.

---

## License

MIT © [dichovsky](https://github.com/dichovsky)

## Buy Me A Coffee

Support this project: [![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/dichovsky)
