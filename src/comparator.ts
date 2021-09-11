import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type Area = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

export type Color = { r: number; g: number; b: number };

export interface ICompareProps {
    img1: string | PNG;
    img2: string | PNG;
    excludedAreas?: Area[];
    excludedAreaColor?: Color;
    diffFilePath?: string;
    matchingThreshold?: number;
}

export class Compare {
    static png(props: ICompareProps): number {
        let img1: PNG = this.getPng(props.img1);
        let img2: PNG = this.getPng(props.img2);

        const excludedAreas: Area[] = props.excludedAreas ?? [];
        const excludedAreaColor: Color = props.excludedAreaColor ?? { r: 0, g: 0, b: 255 };

        const { width: width1, height: height1 } = img1;
        const { width: width2, height: height2 } = img2;
        const imageSizesDoNotMatch: boolean = height1 !== height2 || width1 !== width2;

        const maxWidth: number = Math.max(width1, width2);
        const maxHeight: number = Math.max(height1, height2);

        const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });

        if (excludedAreas.length > 0) {
            img1 = this.addColoredAreasToImage(img1, excludedAreas, excludedAreaColor);
            img2 = this.addColoredAreasToImage(img2, excludedAreas, excludedAreaColor);
        }

        if (imageSizesDoNotMatch) {
            img1 = this.extendImage(img1, maxWidth, maxHeight);
            img2 = this.extendImage(img2, maxWidth, maxHeight);

            img1 = this.fillImageSizeDifference(img1, width1, height1, excludedAreaColor);
            img2 = this.fillImageSizeDifference(img2, width2, height2, excludedAreaColor);
        }

        const result: number = pixelmatch(img1.data, img2.data, diff.data, maxWidth, maxHeight, {
            threshold: props.matchingThreshold ?? 0.1,
        });

        if (result > 0 && props.diffFilePath !== undefined) {
            if (!existsSync(parse(props.diffFilePath).dir)) {
                mkdirSync(parse(props.diffFilePath).dir, { recursive: true });
            }
            writeFileSync(props.diffFilePath, PNG.sync.write(diff));
        }
        return result;
    }

    private static getPng(pngSource: string | PNG): PNG {
        if (typeof pngSource === 'string') {
            if (!existsSync(pngSource)) throw Error('File not found');
            const file1Content: Buffer = readFileSync(pngSource);
            return PNG.sync.read(file1Content);
        }
        return pngSource;
    }

    private static addColoredAreasToImage(image: PNG, areas: Area[], color: Color): PNG {
        const { height, width } = image;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const shouldBeColored: boolean = areas.some((rectangle) => {
                    return x >= rectangle.x1 && y >= rectangle.y1 && x <= rectangle.x2 && y <= rectangle.y2;
                });
                if (shouldBeColored) {
                    const pos: number = (y * width + x) * 4;
                    image.data = this.drawPixelOnBuff(image.data, pos, color);
                }
            }
        }

        return image;
    }

    private static drawPixelOnBuff(buff: Buffer, position: number, color: Color): Buffer {
        buff[position + 0] = color.r;
        buff[position + 1] = color.g;
        buff[position + 2] = color.b;
        buff[position + 3] = 255;

        return buff;
    }

    private static extendImage(image: PNG, newWidth: number, newHeight: number): PNG {
        const resized = new PNG({ width: newWidth, height: newHeight, fill: true });
        PNG.bitblt(image, resized, 0, 0, image.width, image.height, 0, 0);
        return resized;
    }

    private static fillImageSizeDifference(image: PNG, width: number, height: number, color: Color): PNG {
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                if (y > height || x > width) {
                    const pos: number = (image.width * y + x) << 2;
                    image.data = this.drawPixelOnBuff(image.data, pos, color);
                }
            }
        }
        return image;
    }
}
