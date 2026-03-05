import { PNG } from 'pngjs';
import { drawPixelOnBuff } from './drawPixelOnBuff';
import { type Color } from './types';

/**
 * Paints the pixels that were added when the canvas was extended (i.e. those that lie
 * outside the original image bounds) with a solid colour in-place.
 *
 * Call this after {@link extendImage} so the padded region is clearly marked in the diff
 * rather than left as transparent/black.
 *
 * @param image - The already-extended PNG to modify in-place.
 * @param width - Original width of the image before extension (pixels).
 * @param height - Original height of the image before extension (pixels).
 * @param color - RGB colour to paint the extended region with (alpha is always 255).
 */
export function fillImageSizeDifference(image: PNG, width: number, height: number, color: Color): void {
    // Paint the right extension (x >= width, all rows)
    for (let y = 0; y < image.height; y++) {
        for (let x = width; x < image.width; x++) {
            drawPixelOnBuff(image.data, (image.width * y + x) << 2, color);
        }
    }
    // Paint the bottom extension (y >= height, original-width columns only)
    for (let y = height; y < image.height; y++) {
        for (let x = 0; x < width; x++) {
            drawPixelOnBuff(image.data, (image.width * y + x) << 2, color);
        }
    }
}
