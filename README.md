# png-visual-compare

**🎯 Visual regression testing for PNG images with zero binary dependencies**

[![npm version](https://img.shields.io/npm/v/png-visual-compare.svg?style=flat-square)](https://www.npmjs.com/package/png-visual-compare)
[![npm downloads](https://img.shields.io/npm/dm/png-visual-compare.svg?style=flat-square)](https://www.npmjs.com/package/png-visual-compare)
[![Tests](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/dichovsky/png-visual-compare?style=flat-square)](https://github.com/dichovsky/png-visual-compare/blob/main/LICENSE)

---

A Node.js utility to compare PNG images or their areas without binary and OS dependencies.

**Key Benefits:**

- ✨ **Zero Native Binaries** — Pure JavaScript, works everywhere
- 🖼️ **File or Buffer** — Accept absolute file paths or raw `Buffer` inputs
- 🔍 **Pixel-Level Accuracy** — Powered by [pixelmatch](https://github.com/mapbox/pixelmatch)
- 🎭 **Exclusion Zones** — Skip regions during comparison with `excludedAreas`
- 🗂️ **Diff Output** — Optionally write a diff PNG with highlighted mismatches
- 💪 **TypeScript Support** — Full type definitions included

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Excluded Areas Builder](#excluded-areas-builder)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```sh
npm install -D png-visual-compare
```

> **Node.js Requirement:** Node.js 20 or higher is required.

---

## Quick Start

```typescript
import { comparePng } from 'png-visual-compare';

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
        diffOutputBaseDir, // Restrict diffFilePath writes to this directory (path-traversal guard). Default: undefined
        inputBaseDir, // Restrict png1/png2 reads to this directory (path-traversal guard). Default: undefined
        pixelmatchOptions, // Options forwarded to pixelmatch. Default: undefined
    },
);

expect(mismatchedPixels).toBe(0);
```

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

### `ComparePngOptions`

| Option                         | Type                | Default                  | Description                                                                                                                                                                                                                          |
| ------------------------------ | ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `excludedAreas`                | `Area[]`            | `[]`                     | Rectangular regions to exclude from comparison (painted on both images before diffing, so they always match)                                                                                                                         |
| `diffFilePath`                 | `string`            | `undefined`              | File path for the diff PNG. Only written when `result > 0`                                                                                                                                                                           |
| `throwErrorOnInvalidInputData` | `boolean`           | `true`                   | Throw on missing/unsupported input. Set to `false` to treat invalid input as a zero-size PNG. An error is always thrown when **both** inputs are invalid                                                                             |
| `extendedAreaColor`            | `Color`             | `{ r: 0, g: 255, b: 0 }` | Fill colour for padded regions when images differ in size. Override when the default green clashes with your image content                                                                                                           |
| `excludedAreaColor`            | `Color`             | `{ r: 0, g: 0, b: 255 }` | Fill colour applied to `excludedAreas` on both images before comparison. Override when the default blue clashes with your image content                                                                                              |
| `maxDimension`                 | `number`            | `16384`                  | Maximum allowed width or height (px) for either input image. **Always throws when exceeded, regardless of `throwErrorOnInvalidInputData`.** Set to `Infinity` to disable. Protects against DoS via crafted PNG headers               |
| `diffOutputBaseDir`            | `string`            | `undefined`              | When set, `diffFilePath` must resolve to a path **inside** this directory. Any attempt to write outside it throws `"Path traversal detected"`. Use in server-side contexts where `diffFilePath` may be caller-controlled             |
| `inputBaseDir`                 | `string`            | `undefined`              | When set, string input paths (`png1` / `png2`) must resolve to a path **inside** this directory. Any attempt to read outside it throws `"Path traversal detected"`. Use in server-side contexts where paths may be caller-controlled |
| `pixelmatchOptions`            | `PixelmatchOptions` | `undefined`              | Options forwarded to [pixelmatch](https://github.com/mapbox/pixelmatch)                                                                                                                                                              |

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

| Option         | Type        | Default         | Description                                                 |
| -------------- | ----------- | --------------- | ----------------------------------------------------------- |
| `threshold`    | `number`    | `0.1`           | Matching threshold `0`–`1`. Lower = more sensitive          |
| `includeAA`    | `boolean`   | `false`         | When `true`, anti-aliased pixels count as mismatches        |
| `alpha`        | `number`    | `0.1`           | Opacity of unchanged pixels in the diff image               |
| `aaColor`      | `[r, g, b]` | `[255, 255, 0]` | Colour of anti-aliased pixels in the diff                   |
| `diffColor`    | `[r, g, b]` | `[255, 0, 0]`   | Colour of differing pixels in the diff                      |
| `diffColorAlt` | `[r, g, b]` | `undefined`     | Alternative diff colour for dark pixels (dark-mode support) |
| `diffMask`     | `boolean`   | `false`         | Show only changed pixels on a transparent background        |

### Exported constants

| Constant                      | Value                    | Description                                                                                             |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `DEFAULT_EXTENDED_AREA_COLOR` | `{ r: 0, g: 255, b: 0 }` | Default fill colour for size-extended padding regions                                                   |
| `DEFAULT_EXCLUDED_AREA_COLOR` | `{ r: 0, g: 0, b: 255 }` | Default fill colour for excluded areas                                                                  |
| `DEFAULT_MAX_DIMENSION`       | `16384`                  | Default maximum image dimension (px). Import this constant when you want to reference the default value |

---

## Excluded Areas Builder

Defining `excludedAreas` coordinates by hand can be tedious. The **Excluded Areas Builder** is a browser-based visual tool included in this repository that lets you draw exclusion rectangles directly on your image and copy the resulting `Area[]` JSON with one click.

### Launch

```sh
npm run tool:excluded-areas-builder
```

This opens `tools/excluded-areas-builder.html` in your default browser. No server or build step is required — the file runs entirely in the browser.

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
