/*!
 * pixelmatch 7.2.0 — https://github.com/mapbox/pixelmatch
 * Ported to TypeScript and vendored into png-visual-compare.
 *
 * ISC License
 *
 * Copyright (c) 2025, Mapbox
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
 * OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
 * THIS SOFTWARE.
 */

// Why vendored (RELI-11): pixelmatch 7 ships only as an ES module, and this package's
// CommonJS build `require()`d it. Node loads that through require(esm), but Jest's own
// module loader (and Vitest's vm pools) cannot, so the package failed to load in a stock
// Jest project. A local copy leaves the build with no ESM-only runtime dependency.
//
// Keep it a faithful port: the logic below mirrors upstream line for line, with types
// added. `__tests__/vendor/pixelmatch.test.ts` compares it against the upstream package
// (a devDependency) byte for byte; when upstream is bumped, a failing parity test means
// this copy needs re-syncing.

type PixelData = Uint8Array | Uint8ClampedArray;
type RgbColor = [number, number, number];

export type PixelmatchKernelOptions = {
    /** Matching threshold (0 to 1); smaller is more sensitive. Default `0.1`. */
    threshold?: number;
    /** Whether to skip anti-aliasing detection. Default `false`. */
    includeAA?: boolean;
    /** Opacity of original image in diff output. Default `0.1`. */
    alpha?: number;
    /** Color of anti-aliased pixels in diff output. Default `[255, 255, 0]`. */
    aaColor?: RgbColor;
    /** Color of different pixels in diff output. Default `[255, 0, 0]`. */
    diffColor?: RgbColor;
    /** Color of pixels where img2 is darker than img1. Defaults to `diffColor`. */
    diffColorAlt?: RgbColor;
    /** Draw the diff over a transparent background (a mask). Default `false`. */
    diffMask?: boolean;
    /** Blend semi-transparent pixels against a checkerboard (true) or plain white (false). Default `true`. */
    checkerboard?: boolean;
};

/**
 * Compare two equally sized images, pixel by pixel.
 *
 * @param img1    First image data.
 * @param img2    Second image data.
 * @param output  Image data to write the diff to, if provided.
 * @param width   Input images width.
 * @param height  Input images height.
 * @param options Comparison and diff-drawing options.
 * @returns The number of mismatched pixels.
 */
export function pixelmatch(
    img1: PixelData,
    img2: PixelData,
    output: PixelData | undefined,
    width: number,
    height: number,
    options: PixelmatchKernelOptions = {},
): number {
    const {
        threshold = 0.1,
        alpha = 0.1,
        aaColor = [255, 255, 0],
        diffColor = [255, 0, 0],
        checkerboard = true,
        includeAA,
        diffColorAlt,
        diffMask,
    } = options;

    if (!isPixelData(img1) || !isPixelData(img2) || (output && !isPixelData(output)))
        throw new Error('Image data: Uint8Array, Uint8ClampedArray or Buffer expected.');

    if (img1.length !== img2.length || (output && output.length !== img1.length))
        throw new Error(`Image sizes do not match. Image 1 size: ${img1.length}, image 2 size: ${img2.length}`);

    if (img1.length !== width * height * 4)
        throw new Error(`Image data size does not match width/height. Expecting ${width * height * 4}. Got ${img1.length}`);

    // check if images are identical
    const len = width * height;
    const a32 = new Uint32Array(img1.buffer, img1.byteOffset, len);
    const b32 = new Uint32Array(img2.buffer, img2.byteOffset, len);
    let identical = true;

    for (let i = 0; i < len; i++) {
        if (a32[i] !== b32[i]) {
            identical = false;
            break;
        }
    }
    if (identical) {
        // fast path if identical
        if (output && !diffMask) {
            for (let i = 0, pos = 0; i < len; i++, pos += 4) drawGrayPixel(img1, pos, alpha, output);
        }
        return 0;
    }

    // maximum acceptable square distance between two colors;
    // 35215 is the maximum possible value for the YIQ difference metric
    const maxDelta = 35215 * threshold * threshold;
    const [aaR, aaG, aaB] = aaColor;
    const [diffR, diffG, diffB] = diffColor;
    const [altR, altG, altB] = diffColorAlt || diffColor;
    let diff = 0;

    // compare each pixel of one image against the other one
    for (let i = 0, pos = 0; i < len; i++, pos += 4) {
        // squared YUV distance between colors at this pixel position, negative if the img2 pixel is darker
        const delta = a32[i] === b32[i] ? 0 : colorDelta(img1, img2, pos, pos, checkerboard);

        // the color difference is above the threshold
        if (Math.abs(delta) > maxDelta) {
            const x = i % width;
            const y = (i / width) | 0;
            // check it's a real rendering difference or just anti-aliasing
            const isExcludedAA =
                !includeAA &&
                (antialiased(img1, x, y, width, height, a32, b32, checkerboard) ||
                    antialiased(img2, x, y, width, height, b32, a32, checkerboard));
            if (isExcludedAA) {
                // one of the pixels is anti-aliasing; draw as yellow and do not count as difference
                // note that we do not include such pixels in a mask
                if (output && !diffMask) drawPixel(output, pos, aaR, aaG, aaB);
            } else {
                // found substantial difference not caused by anti-aliasing; draw it as such
                if (output) {
                    if (delta < 0) {
                        drawPixel(output, pos, altR, altG, altB);
                    } else {
                        drawPixel(output, pos, diffR, diffG, diffB);
                    }
                }
                diff++;
            }
        } else if (output && !diffMask) {
            // pixels are similar; draw background as grayscale image blended with white
            drawGrayPixel(img1, pos, alpha, output);
        }
    }

    // return the number of different pixels
    return diff;
}

function isPixelData(arr: unknown): arr is PixelData {
    // work around instanceof Uint8Array not working properly in some Jest environments
    return ArrayBuffer.isView(arr) && (arr as PixelData).BYTES_PER_ELEMENT === 1;
}

/**
 * Check if a pixel is likely a part of anti-aliasing;
 * based on "Anti-aliased Pixel and Intensity Slope Detector" paper by V. Vysniauskas, 2009
 */
function antialiased(
    img: PixelData,
    x1: number,
    y1: number,
    width: number,
    height: number,
    a32: Uint32Array,
    b32: Uint32Array,
    checkerboard: boolean,
): boolean {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const pos4 = (y1 * width + x1) * 4;
    // cache the center pixel's RGBA once instead of re-reading it on every neighbor comparison
    const cr = img[pos4];
    const cg = img[pos4 + 1];
    const cb = img[pos4 + 2];
    const ca = img[pos4 + 3];
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;
    let min = 0;
    let max = 0;
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;

            // brightness delta between the center pixel and adjacent one
            const delta = brightnessDelta(img, pos4, (y * width + x) * 4, cr, cg, cb, ca, checkerboard);

            // count the number of equal, darker and brighter adjacent pixels
            if (delta === 0) {
                zeroes++;
                // if found more than 2 equal siblings, it's definitely not anti-aliasing
                if (zeroes > 2) return false;

                // remember the darkest pixel
            } else if (delta < min) {
                min = delta;
                minX = x;
                minY = y;

                // remember the brightest pixel
            } else if (delta > max) {
                max = delta;
                maxX = x;
                maxY = y;
            }
        }
    }

    // if there are no both darker and brighter pixels among siblings, it's not anti-aliasing
    if (min === 0 || max === 0) return false;

    // if either the darkest or the brightest pixel has 3+ equal siblings in both images
    // (definitely not anti-aliased), this pixel is anti-aliased
    return (
        (hasManySiblings(a32, minX, minY, width, height) && hasManySiblings(b32, minX, minY, width, height)) ||
        (hasManySiblings(a32, maxX, maxY, width, height) && hasManySiblings(b32, maxX, maxY, width, height))
    );
}

/** Check if a pixel has 3+ adjacent pixels of the same color. */
function hasManySiblings(img: Uint32Array, x1: number, y1: number, width: number, height: number): boolean {
    const x0 = Math.max(x1 - 1, 0);
    const y0 = Math.max(y1 - 1, 0);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    const val = img[y1 * width + x1];
    let zeroes = x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2 ? 1 : 0;

    // go through 8 adjacent pixels
    for (let x = x0; x <= x2; x++) {
        for (let y = y0; y <= y2; y++) {
            if (x === x1 && y === y1) continue;
            zeroes += +(val === img[y * width + x]);
            if (zeroes > 2) return true;
        }
    }
    return false;
}

/**
 * Calculate color difference according to the paper "Measuring perceived color difference
 * using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos.
 * Caller guarantees the two pixels differ, so the early-zero check is omitted.
 */
function colorDelta(img1: PixelData, img2: PixelData, k: number, m: number, checkerboard: boolean): number {
    const r1 = img1[k];
    const g1 = img1[k + 1];
    const b1 = img1[k + 2];
    const a1 = img1[k + 3];
    const r2 = img2[m];
    const g2 = img2[m + 1];
    const b2 = img2[m + 2];
    const a2 = img2[m + 3];

    let dr = r1 - r2;
    let dg = g1 - g2;
    let db = b1 - b2;
    const da = a1 - a2;

    if (a1 < 255 || a2 < 255) {
        // blend pixels with background
        let rb = 255;
        let gb = 255;
        let bb = 255;
        if (checkerboard) {
            rb = 48 + 159 * (k % 2);
            gb = 48 + 159 * (((k / 1.618033988749895) | 0) % 2);
            bb = 48 + 159 * (((k / 2.618033988749895) | 0) % 2);
        }
        dr = (r1 * a1 - r2 * a2 - rb * da) / 255;
        dg = (g1 * a1 - g2 * a2 - gb * da) / 255;
        db = (b1 * a1 - b2 * a2 - bb * da) / 255;
    }

    const y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;
    const i = dr * 0.59597799 - dg * 0.2741761 - db * 0.32180189;
    const q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;

    const delta = 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;

    // encode whether the pixel lightens or darkens in the sign
    return y > 0 ? -delta : delta;
}

/**
 * Specialized brightness-only color delta for the anti-aliasing detector,
 * with the center pixel's RGBA hoisted out of the neighbor loop.
 */
function brightnessDelta(
    img: PixelData,
    k: number,
    m: number,
    r1: number,
    g1: number,
    b1: number,
    a1: number,
    checkerboard: boolean,
): number {
    const r2 = img[m];
    const g2 = img[m + 1];
    const b2 = img[m + 2];
    const a2 = img[m + 3];

    let dr = r1 - r2;
    let dg = g1 - g2;
    let db = b1 - b2;
    const da = a1 - a2;

    if (!dr && !dg && !db && !da) return 0;

    if (a1 < 255 || a2 < 255) {
        let rb = 255;
        let gb = 255;
        let bb = 255;
        if (checkerboard) {
            rb = 48 + 159 * (k % 2);
            gb = 48 + 159 * (((k / 1.618033988749895) | 0) % 2);
            bb = 48 + 159 * (((k / 2.618033988749895) | 0) % 2);
        }
        dr = (r1 * a1 - r2 * a2 - rb * da) / 255;
        dg = (g1 * a1 - g2 * a2 - gb * da) / 255;
        db = (b1 * a1 - b2 * a2 - bb * da) / 255;
    }

    return dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;
}

function drawPixel(output: PixelData, pos: number, r: number, g: number, b: number): void {
    output[pos] = r;
    output[pos + 1] = g;
    output[pos + 2] = b;
    output[pos + 3] = 255;
}

function drawGrayPixel(img: PixelData, i: number, alpha: number, output: PixelData): void {
    const val = 255 + ((img[i] * 0.29889531 + img[i + 1] * 0.58662247 + img[i + 2] * 0.11448223 - 255) * alpha * img[i + 3]) / 255;
    drawPixel(output, i, val, val, val);
}
