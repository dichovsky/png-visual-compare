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

| Option                         | Type                | Default                  | Description                                                                                                                                              |
| ------------------------------ | ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `excludedAreas`                | `Area[]`            | `[]`                     | Rectangular regions to exclude from comparison (painted on both images before diffing, so they always match)                                             |
| `diffFilePath`                 | `string`            | `undefined`              | File path for the diff PNG. Only written when `result > 0`                                                                                               |
| `throwErrorOnInvalidInputData` | `boolean`           | `true`                   | Throw on missing/unsupported input. Set to `false` to treat invalid input as a zero-size PNG. An error is always thrown when **both** inputs are invalid |
| `extendedAreaColor`            | `Color`             | `{ r: 0, g: 255, b: 0 }` | Fill colour for padded regions when images differ in size. Override when the default green clashes with your image content                               |
| `excludedAreaColor`            | `Color`             | `{ r: 0, g: 0, b: 255 }` | Fill colour applied to `excludedAreas` on both images before comparison. Override when the default blue clashes with your image content                  |
| `pixelmatchOptions`            | `PixelmatchOptions` | `undefined`              | Options forwarded to [pixelmatch](https://github.com/mapbox/pixelmatch)                                                                                  |

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

| Constant                      | Value                    | Description                                           |
| ----------------------------- | ------------------------ | ----------------------------------------------------- |
| `DEFAULT_EXTENDED_AREA_COLOR` | `{ r: 0, g: 255, b: 0 }` | Default fill colour for size-extended padding regions |
| `DEFAULT_EXCLUDED_AREA_COLOR` | `{ r: 0, g: 0, b: 255 }` | Default fill colour for excluded areas                |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, commands, and PR guidelines.

---

## License

MIT © [dichovsky](https://github.com/dichovsky)

## Buy Me A Coffee

Support this project: [![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/dichovsky)
