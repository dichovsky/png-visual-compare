# Visual Regression Testing for PNGs in JavaScript/TypeScript

A Node.js utility to compare PNG images or their areas without binary and OS dependencies.

[![Tests on push](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml)

## Description

This package exports a single function `comparePng` which returns the number of mismatched pixels and optionally creates a diff PNG file.  
Under the hood it uses [pixelmatch](https://github.com/mapbox/pixelmatch/blob/master/README.md) for pixel-level image comparison.

## Getting started

```sh
npm install -D png-visual-compare
```

**Note:** This package requires Node.js version 20 or higher.

## Example

```typescript
import { comparePng } from 'png-visual-compare';

const mismatchedPixels: number = comparePng(
  img1, // First PNG: absolute file path or Buffer
  img2, // Second PNG: absolute file path or Buffer
  {
    excludedAreas,          // Regions to skip during comparison. Default: []
    diffFilePath,           // Path to write the diff PNG (only written when mismatch > 0). Default: undefined
    throwErrorOnInvalidInputData, // Throw on missing/invalid input. Default: true
    pixelmatchOptions,      // Options forwarded to pixelmatch. Default: undefined
  }
);

expect(mismatchedPixels).toBe(0);
```

## API

### `comparePng(png1, png2, opts?): number`

| Parameter | Type | Description |
|---|---|---|
| `png1` | `string \| Buffer` | First PNG — absolute file path or raw PNG `Buffer` |
| `png2` | `string \| Buffer` | Second PNG — absolute file path or raw PNG `Buffer` |
| `opts` | `ComparePngOptions` | Optional. See below |

Returns the number of mismatched pixels (`0` means identical).

### `ComparePngOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `excludedAreas` | `Area[]` | `[]` | Rectangular regions to exclude from comparison |
| `diffFilePath` | `string` | `undefined` | File path for the diff PNG. Only written when `result > 0` |
| `throwErrorOnInvalidInputData` | `boolean` | `true` | Throw on missing/unsupported input. Set to `false` to treat invalid input as a zero-size PNG. An error is always thrown when **both** inputs are invalid |
| `pixelmatchOptions` | `PixelmatchOptions` | `undefined` | Options forwarded to [pixelmatch](https://github.com/mapbox/pixelmatch) |

### `Area`

```typescript
type Area = {
  x1: number; // left edge (pixels from left)
  y1: number; // top edge (pixels from top)
  x2: number; // right edge (pixels from left, inclusive)
  y2: number; // bottom edge (pixels from top, inclusive)
};
```

### `PixelmatchOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `threshold` | `number` | `0.1` | Matching threshold `0`–`1`. Lower = more sensitive |
| `includeAA` | `boolean` | `false` | When `true`, anti-aliased pixels count as mismatches |
| `alpha` | `number` | `0.1` | Opacity of unchanged pixels in the diff image |
| `aaColor` | `[r, g, b]` | `[255, 255, 0]` | Colour of anti-aliased pixels in the diff |
| `diffColor` | `[r, g, b]` | `[255, 0, 0]` | Colour of differing pixels in the diff |
| `diffColorAlt` | `[r, g, b]` | `undefined` | Alternative diff colour for dark pixels (dark-mode support) |
| `diffMask` | `boolean` | `false` | Show only changed pixels on a transparent background |

## Buy Me A Coffee

In case you want support my work

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/dichovsky)
