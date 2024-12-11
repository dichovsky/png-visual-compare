# Visual Regression Testing for PNGs in JavaScript/TypeScript

A Node.js utility to compare PNG images or their areas without binary and OS dependencies.

[![Tests on push](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml)

## Description

This package exports single function `comparePng` which returns the number of mismatched pixels and optionally can create a diff PNG file.  
Under the hood it uses [pixelmatch](https://github.com/mapbox/pixelmatch/blob/master/README.md) lib for pixel-level image comparison.

## Getting started

Installation:

```sh
npm install -D png-visual-compare
```

**Note:** This package requires Node.js version 20 or higher.

## Example

```javascript
test(`Compare PNG`, async () => {
  const compareResult: number =
    comparePng(
    img1, // First file path or Buffer to compare
    img2, // Second file path or Buffer to compare
    {
      excludedAreas, // Areas list to exclude from comparing, default value is [].
      diffFilePath, // File path where the differences file will be stored, default value is undefined.
      throwErrorOnInvalidInputData, // Compare with empty file if set to false, default value is undefined. Will throw an exception if both files are invalid.
      pixelmatchOptions, // Pass options to Pixelmatch, default value is undefined.
    });

  expect(compareResult).toBe(0); // Number of mismatched pixels should be 0.

   ...
});
```

## Buy Me A Coffee

In case you want support my work

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/dichovsky)

