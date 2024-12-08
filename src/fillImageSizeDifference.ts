import { PNG } from 'pngjs';
import { drawPixelOnBuff } from './drawPixelOnBuff';
import { Color } from './types';

export function fillImageSizeDifference(image: PNG, width: number, height: number, color: Color): void {
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            if (y > height || x > width) {
                const position: number = (image.width * y + x) << 2;
                drawPixelOnBuff(image.data, position, color);
            }
        }
    }
}
