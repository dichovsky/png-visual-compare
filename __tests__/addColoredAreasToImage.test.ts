import { PNG, PNGWithMetadata } from 'pngjs';
import { expect, test } from 'vitest';
import { addColoredAreasToImage } from '../src/addColoredAreasToImage';
import { type Color } from '../src/types';

const color: Color = { r: 255, g: 0, b: 0 };

function makeImage(width: number, height: number): PNGWithMetadata {
    const image = new PNG({ width, height }) as PNGWithMetadata;
    image.data = Buffer.alloc(width * height * 4, 0);
    return image;
}

function getPixel(image: PNGWithMetadata, x: number, y: number): { r: number; g: number; b: number; a: number } {
    const pos = (image.width * y + x) * 4;
    return { r: image.data[pos], g: image.data[pos + 1], b: image.data[pos + 2], a: image.data[pos + 3] };
}

test('clamps negative x1/y1 coordinates to 0', () => {
    const image = makeImage(10, 10);

    addColoredAreasToImage(image, [{ x1: -5, y1: -5, x2: 2, y2: 2 }], color);

    // Pixel at (0,0) must be painted — clamped start
    const pixel = getPixel(image, 0, 0);
    expect(pixel.r).toBe(color.r);
    expect(pixel.a).toBe(255);
});

test('clamps x2/y2 coordinates beyond image bounds', () => {
    const image = makeImage(10, 10);

    addColoredAreasToImage(image, [{ x1: 7, y1: 7, x2: 999, y2: 999 }], color);

    // Pixel at (9,9) — last valid pixel — must be painted
    const pixel = getPixel(image, 9, 9);
    expect(pixel.r).toBe(color.r);
    expect(pixel.a).toBe(255);
});

test('does not throw or corrupt buffer with fully out-of-bounds area', () => {
    const image = makeImage(10, 10);

    // Area entirely outside the image (negative coords that don't overlap)
    expect(() => addColoredAreasToImage(image, [{ x1: -100, y1: -100, x2: -1, y2: -1 }], color)).not.toThrow();

    // All pixels must remain unpainted
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            expect(getPixel(image, x, y).a).toBe(0);
        }
    }
});

test('does not paint pixels outside the clamped area', () => {
    const image = makeImage(10, 10);

    addColoredAreasToImage(image, [{ x1: 3, y1: 3, x2: 6, y2: 6 }], color);

    // Pixel just outside the area must not be painted
    expect(getPixel(image, 2, 3).a).toBe(0);
    expect(getPixel(image, 7, 3).a).toBe(0);
    expect(getPixel(image, 3, 2).a).toBe(0);
    expect(getPixel(image, 3, 7).a).toBe(0);
});

test('paints entire area when coordinates are within bounds', () => {
    const image = makeImage(10, 10);

    addColoredAreasToImage(image, [{ x1: 2, y1: 2, x2: 4, y2: 4 }], color);

    for (let y = 2; y <= 4; y++) {
        for (let x = 2; x <= 4; x++) {
            const pixel = getPixel(image, x, y);
            expect(pixel.r).toBe(color.r);
            expect(pixel.a).toBe(255);
        }
    }
});

test('handles area that fully covers the image', () => {
    const image = makeImage(5, 5);

    addColoredAreasToImage(image, [{ x1: -10, y1: -10, x2: 100, y2: 100 }], color);

    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            expect(getPixel(image, x, y).r).toBe(color.r);
        }
    }
});
