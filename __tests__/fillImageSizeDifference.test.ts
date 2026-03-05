import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import { fillImageSizeDifference } from '../src/fillImageSizeDifference';
import { type Color } from '../src/types';

const color: Color = { r: 0, g: 255, b: 0 };

function makeExtendedImage(extWidth: number, extHeight: number): PNG {
    const image = new PNG({ width: extWidth, height: extHeight });
    image.data = Buffer.alloc(extWidth * extHeight * 4, 0);
    return image;
}

function getPixel(image: PNG, x: number, y: number): { r: number; g: number; b: number; a: number } {
    const pos = (image.width * y + x) * 4;
    return { r: image.data[pos], g: image.data[pos + 1], b: image.data[pos + 2], a: image.data[pos + 3] };
}

test('paints pixel at exactly x === originalWidth (right boundary)', () => {
    const origWidth = 5;
    const origHeight = 5;
    const image = makeExtendedImage(10, 10);

    fillImageSizeDifference(image, origWidth, origHeight, color);

    const pixel = getPixel(image, origWidth, 0);
    expect(pixel.r).toBe(color.r);
    expect(pixel.g).toBe(color.g);
    expect(pixel.b).toBe(color.b);
    expect(pixel.a).toBe(255);
});

test('paints pixel at exactly y === originalHeight (bottom boundary)', () => {
    const origWidth = 5;
    const origHeight = 5;
    const image = makeExtendedImage(10, 10);

    fillImageSizeDifference(image, origWidth, origHeight, color);

    const pixel = getPixel(image, 0, origHeight);
    expect(pixel.r).toBe(color.r);
    expect(pixel.g).toBe(color.g);
    expect(pixel.b).toBe(color.b);
    expect(pixel.a).toBe(255);
});

test('paints corner pixel at (originalWidth, originalHeight)', () => {
    const origWidth = 5;
    const origHeight = 5;
    const image = makeExtendedImage(10, 10);

    fillImageSizeDifference(image, origWidth, origHeight, color);

    const pixel = getPixel(image, origWidth, origHeight);
    expect(pixel.r).toBe(color.r);
    expect(pixel.g).toBe(color.g);
    expect(pixel.b).toBe(color.b);
    expect(pixel.a).toBe(255);
});

test('does NOT paint pixels inside original bounds', () => {
    const origWidth = 5;
    const origHeight = 5;
    const image = makeExtendedImage(10, 10);

    fillImageSizeDifference(image, origWidth, origHeight, color);

    // All pixels strictly inside [0, origWidth) x [0, origHeight) must remain unpainted
    for (let y = 0; y < origHeight; y++) {
        for (let x = 0; x < origWidth; x++) {
            const pixel = getPixel(image, x, y);
            expect(pixel.r).toBe(0);
            expect(pixel.g).toBe(0);
            expect(pixel.b).toBe(0);
            expect(pixel.a).toBe(0);
        }
    }
});

test('paints all pixels in the right extension strip', () => {
    const origWidth = 5;
    const origHeight = 5;
    const extWidth = 8;
    const image = makeExtendedImage(extWidth, 5);

    fillImageSizeDifference(image, origWidth, origHeight, color);

    for (let y = 0; y < origHeight; y++) {
        for (let x = origWidth; x < extWidth; x++) {
            const pixel = getPixel(image, x, y);
            expect(pixel.g).toBe(255);
        }
    }
});

test('paints all pixels in the bottom extension strip', () => {
    const origWidth = 5;
    const origHeight = 5;
    const extHeight = 8;
    const image = makeExtendedImage(5, extHeight);

    fillImageSizeDifference(image, origWidth, origHeight, color);

    for (let y = origHeight; y < extHeight; y++) {
        for (let x = 0; x < origWidth; x++) {
            const pixel = getPixel(image, x, y);
            expect(pixel.g).toBe(255);
        }
    }
});
