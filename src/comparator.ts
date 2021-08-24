import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type Area = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export type Color = { r: number; g: number; b: number };

export class Comparator {
    static comparePngFiles(file1Path: string, file2Path: string, excludedAreas: Area[], diffFilePath: string): boolean {
        if (!existsSync(file1Path)) {
            throw Error('file1 not found');
        }
        if (!existsSync(file2Path)) {
            throw Error('file2 not found');
        }

        const img1: PNG = PNG.sync.read(readFileSync(file1Path));
        const img2: PNG = PNG.sync.read(readFileSync(file2Path));

        const result: number = this.comparePngImages(img1, img2, excludedAreas ?? [], diffFilePath);
        return result === 0;
    }

    static comparePngImages(img1: PNG, img2: PNG, excludedAreas: Area[], diffFilePath?: string): number {
        const { width: width1, height: height1 } = img1;
        const { width: width2, height: height2 } = img1;

        const maxWidth: number = Math.max(width1, width2);
        const maxHeight: number = Math.max(height1, height2);

        const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });
        const ignoredPixelColor: Color = { r: 0, g: 0, b: 255 };

        this.addColoredAreasToImage(img1, excludedAreas, ignoredPixelColor);
        this.addColoredAreasToImage(img2, excludedAreas, ignoredPixelColor);

        this.extendImage(img1, maxWidth, maxHeight);
        this.extendImage(img2, maxWidth, maxHeight);

        this.fillSizeDifference(img1, width1, height1);
        this.fillSizeDifference(img2, width2, height2);

        const result: number = pixelmatch(img1.data, img2.data, diff.data, maxWidth, maxHeight, { threshold: 0.1 });
        const isEqual: boolean = result === 0;

        if (!isEqual && diffFilePath) {
            if (!existsSync(parse(diffFilePath).dir)) {
                mkdirSync(parse(diffFilePath).dir, {recursive: true});
            }
            writeFileSync(diffFilePath, PNG.sync.write(diff));
        }
        return result;
    }

    private static addColoredAreasToImage(img1: PNG, areas: Area[], color: Color) {
        const { height, width } = img1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isIgnoredPixel: boolean =
                    areas.length > 0 &&
                    areas.some((rectangle) => {
                        return x >= rectangle.x1 && y >= rectangle.y1 && x <= rectangle.x2 && y <= rectangle.y2;
                    });
                if (isIgnoredPixel) {
                    const pos: number = (y * width + x) * 4;
                    this.drawPixel(img1.data, pos, color);
                }
            }
        }
    }

    private static drawPixel(output: Buffer, position: number, color: Color): void {
        output[position + 0] = color.r;
        output[position + 1] = color.g;
        output[position + 2] = color.b;
        output[position + 3] = 255;
    }

    private static extendImage(source: PNG, newWidth: number, newHeight: number): PNG {
        const resized = new PNG({ width: newWidth, height: newHeight, fill: true });
        PNG.bitblt(source, resized, 0, 0, source.width, source.height, 0, 0);
        return resized;
    }

    private static fillSizeDifference(image: PNG, width: number, height: number) {
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                if (y > height || x > width) {
                    const pos: number = (image.width * y + x) << 2;
                    this.drawPixel(image.data, pos, { r: 0, g: 0, b: 0 });
                }
            }
        }
        return image;
    }
}
