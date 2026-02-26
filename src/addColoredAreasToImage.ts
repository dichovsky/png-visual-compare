import { PNG } from 'pngjs';
import { drawPixelOnBuff } from './drawPixelOnBuff';
import type { Area, Color } from './types';

/**
 * Paints rectangular areas on an image with a solid colour in-place.
 *
 * Used to neutralise regions before diffing: excluded areas are painted blue so both images
 * are identical there, and extended (size-difference) regions are painted green.
 * Area coordinates are clamped to the image bounds.
 *
 * @param image - The PNG image to modify in-place.
 * @param areas - List of rectangular regions to fill.
 * @param color - RGB colour to paint each region with (alpha is always 255).
 */
export function addColoredAreasToImage(image: PNG, areas: Area[], color: Color): void {
    const { height, width } = image;
    for (const { x1, y1, x2, y2 } of areas) {
        const startX = Math.max(0, x1);
        const endX = Math.min(width - 1, x2);
        const startY = Math.max(0, y1);
        const endY = Math.min(height - 1, y2);

        for (let y = startY; y <= endY; y++) {
            let pos = (y * width + startX) * 4;
            for (let x = startX; x <= endX; x++) {
                drawPixelOnBuff(image.data, pos, color);
                pos += 4;
            }
        }
    }
}
