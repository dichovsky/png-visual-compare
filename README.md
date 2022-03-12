# Visual Regression Testing for PNGs in JavaScript/Typescript

Node.js utility to compare PNG images or their parts without binary and OS dependencies.


[![Tests on push](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/test.yml)

## Description

This package exports single function `comparePng` which returns the number of mismatched pixels and optionally can create a diff PNG file.  
Under the hood it uses [pixelmatch](https://github.com/mapbox/pixelmatch/blob/master/README.md) lib for pixel-level image comparison.


## Getting started

Installation:

```sh
npm install -D png-visual-compare
```

## Example

```javascript
test(`Compare PNG`, async () => {
    const compareResult: number =
      comparePng(
        img1, // First File path or Buffer to compare
        img2, // Second file path or Buffer to compare
        {
            excludedAreas // Areas list to exclude from comparing. Empty array by default.
            excludedAreaColor // Color to be used to fill excluded areas. { r: 0, g: 0, b: 255 } by default.
            matchingThreshold // Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0.1 by default.
            diffFilePath // File path to file with differences
        });

    expect(compareResult).toBe(0);

   ...
});
```