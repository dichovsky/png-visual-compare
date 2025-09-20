import { PNG } from 'pngjs';
import { drawPixelOnBuff } from './drawPixelOnBuff';
import type { Area, Color } from './types';

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
