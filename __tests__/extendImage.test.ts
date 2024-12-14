import { PNG, PNGWithMetadata } from 'pngjs';
import { expect, test } from 'vitest';
import { extendImage } from '../out/extendImage';

test('extendImage should return the same image if new dimensions are smaller or equal', () => {
    const image = new PNG({ width: 100, height: 100 }) as PNGWithMetadata;
    const result = extendImage(image, 100, 100);
    expect(result).toBe(image);
});

test('extendImage should extend the image to new dimensions', () => {
    const image = new PNG({ width: 100, height: 100 }) as PNGWithMetadata;
    const result = extendImage(image, 200, 200);
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.data.length).toBe(200 * 200 * 4);
});

test('extendImage should copy the original image data to the extended image', () => {
    const image = new PNG({ width: 100, height: 100 }) as PNGWithMetadata;
    // Fill the original image with some data
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            const idx = (image.width * y + x) << 2;
            image.data[idx] = 255; // Red
            image.data[idx + 1] = 0; // Green
            image.data[idx + 2] = 0; // Blue
            image.data[idx + 3] = 255; // Alpha
        }
    }
    const result = extendImage(image, 200, 200);
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            const idx = (result.width * y + x) << 2;
            expect(result.data[idx]).toBe(255); // Red
            expect(result.data[idx + 1]).toBe(0); // Green
            expect(result.data[idx + 2]).toBe(0); // Blue
            expect(result.data[idx + 3]).toBe(255); // Alpha
        }
    }
});
