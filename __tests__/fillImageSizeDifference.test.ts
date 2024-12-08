import { PNG } from 'pngjs';
import { describe, expect, it, vi } from 'vitest';
import { drawPixelOnBuff } from '../src/drawPixelOnBuff';
import { fillImageSizeDifference } from '../src/fillImageSizeDifference';
import { Color } from '../src/types';

vi.mock('../src/drawPixelOnBuff');

describe('fillImageSizeDifference', () => {
    it('should fill the image size difference with the specified color', () => {
        const width = 5;
        const height = 5;
        const color: Color = { r: 255, g: 0, b: 0 };
        const image = new PNG({ width: 10, height: 10 });

        fillImageSizeDifference(image, width, height, color);

        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                if (y > height || x > width) {
                    const position: number = (image.width * y + x) << 2;
                    expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, position, color);
                }
            }
        }
    });

    it('should not fill pixels within the specified width and height', () => {
        const width = 5;
        const height = 5;
        const color: Color = { r: 255, g: 0, b: 0 };
        const image = new PNG({ width: 10, height: 10 });

        fillImageSizeDifference(image, width, height, color);

        for (let y = 0; y <= height; y++) {
            for (let x = 0; x <= width; x++) {
                const position: number = (image.width * y + x) << 2;
                expect(drawPixelOnBuff).not.toHaveBeenCalledWith(image.data, position, color);
            }
        }
    });
});
