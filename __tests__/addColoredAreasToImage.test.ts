import { PNG } from 'pngjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addColoredAreasToImage } from '../src/addColoredAreasToImage';
import { drawPixelOnBuff } from '../src/drawPixelOnBuff';
import { Area, Color } from '../src/types';

vi.mock('../src/drawPixelOnBuff');

describe('addColoredAreasToImage', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should color the specified areas in the image', () => {
        const width = 10;
        const height = 10;
        const image = new PNG({ width, height });
        const areas: Area[] = [{ x1: 1, y1: 1, x2: 3, y2: 3 }];
        const color: Color = { r: 255, g: 0, b: 0 };

        addColoredAreasToImage(image, areas, color);

        expect(drawPixelOnBuff).toHaveBeenCalledTimes(9);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 44, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 48, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 52, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 84, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 88, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 92, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 124, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 128, color);
        expect(drawPixelOnBuff).toHaveBeenCalledWith(image.data, 132, color);
    });

    it('should handle areas outside the image boundaries', () => {
        const width = 10;
        const height = 10;
        const image = new PNG({ width, height });
        const areas: Area[] = [{ x1: -5, y1: -5, x2: 5, y2: 5 }];
        const color: Color = { r: 0, g: 255, b: 0 };

        addColoredAreasToImage(image, areas, color);

        expect(drawPixelOnBuff).toHaveBeenCalledTimes(36);
    });

    it('should not color anything if areas are empty', () => {
        const width = 10;
        const height = 10;
        const image = new PNG({ width, height });
        const areas: Area[] = [];
        const color: Color = { r: 0, g: 0, b: 255 };

        addColoredAreasToImage(image, areas, color);

        expect(drawPixelOnBuff).not.toHaveBeenCalled();
    });
});
