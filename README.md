# Visual Regression Testing for PNGs in JavaScript/Typescript

Node.js utility to compare PNG files.  
Does NOT contain any binary dependencies.  

[![Tests on push](https://github.com/dichovsky/png-visual-compare/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/dichovsky/png-visual-compare/actions/workflows/main.yml)

## Description

This package exports single function `comparePng`.  
Under the hood it uses [pixelmatch](https://github.com/mapbox/pixelmatch/blob/master/README.md) lib for pixel-level image comparison.

Inspired by

## Getting started

Installation:

```sh
npm install -D png-visual-compare
```