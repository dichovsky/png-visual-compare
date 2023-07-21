import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { Area, Color, ComparePngOptions } from './types';

export default function comparePng(
    image1FilePathOrBuffer: string | Buffer,
    image2FilePathOrBuffer: string | Buffer,
    opts?: ComparePngOptions,
): number {
    const excludedAreas: Area[] = opts?.excludedAreas !== undefined ? opts.excludedAreas : [];
    const throwErrorOnInvalidInputData: boolean =
        opts?.throwErrorOnInvalidInputData !== undefined ? opts.throwErrorOnInvalidInputData : true;
    const extendedAreaColorImage: Color = { r: 0, g: 255, b: 0 };
    const excludedAreaColor: Color = { r: 0, g: 0, b: 255 };
    const shouldCreateDiffFile: boolean = opts?.diffFilePath !== undefined;

    const pngData1: { isValid: boolean; png: PNG } = getPng(image1FilePathOrBuffer, throwErrorOnInvalidInputData);
    const pngData2: { isValid: boolean; png: PNG } = getPng(image2FilePathOrBuffer, throwErrorOnInvalidInputData);

    if (!pngData1.isValid && !pngData2.isValid) {
        throw Error('Unknown PNG files input type');
    }

    const { width: width1, height: height1 } = pngData1.png;
    const { width: width2, height: height2 } = pngData2.png;

    const isHeightMismatch: boolean = height1 !== height2;
    const isWidthMismatch: boolean = width1 !== width2;

    const maxWidth: number = Math.max(width1, width2);
    const maxHeight: number = Math.max(height1, height2);

    const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });

    if (excludedAreas.length > 0) {
        pngData1.png = addColoredAreasToImage(pngData1.png, excludedAreas, excludedAreaColor);
        pngData2.png = addColoredAreasToImage(pngData2.png, excludedAreas, excludedAreaColor);
    }

    if (isHeightMismatch || isWidthMismatch) {
        pngData1.png = extendImage(pngData1.png, maxWidth, maxHeight);
        pngData2.png = extendImage(pngData2.png, maxWidth, maxHeight);

        pngData1.png = fillImageSizeDifference(pngData1.png, width1, height1, extendedAreaColorImage);
        pngData2.png = fillImageSizeDifference(pngData2.png, width2, height2, extendedAreaColorImage);
    }

    const pixelmatchResult: number = pixelmatch(
        pngData1.png.data,
        pngData2.png.data,
        shouldCreateDiffFile ? diff.data : null,
        maxWidth,
        maxHeight,
        opts?.pixelmatchOptions,
    );

    if (pixelmatchResult > 0 && shouldCreateDiffFile) {
        const diffFolder: string = parse(opts?.diffFilePath as string).dir;
        if (!existsSync(diffFolder)) {
            mkdirSync(diffFolder, { recursive: true });
        }
        writeFileSync(opts?.diffFilePath as string, PNG.sync.write(diff));
    }

    return pixelmatchResult;
}

function getPng(pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean): { isValid: boolean; png: PNG } {
    if (typeof pngSource === 'string') {
        if (!existsSync(pngSource)) {
            if (throwErrorOnInvalidInputData) {
                throw Error(`PNG file ${pngSource} not found`);
            }
            return { isValid: false, png: new PNG({ width: 0, height: 0 }) };
        }
        return { isValid: true, png: PNG.sync.read(readFileSync(pngSource)) };
    }

    if (Buffer.isBuffer(pngSource)) {
        return { isValid: true, png: PNG.sync.read(pngSource) };
    }

    if (throwErrorOnInvalidInputData) {
        throw Error('Unknown PNG file input type');
    }

    return { isValid: false, png: new PNG({ width: 0, height: 0 }) };
}

function addColoredAreasToImage(image: PNG, areas: Area[], color: Color): PNG {
    const { height, width } = image;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const shouldBeColored: boolean = areas.some((rectangle) => {
                return x >= rectangle.x1 && y >= rectangle.y1 && x <= rectangle.x2 && y <= rectangle.y2;
            });
            if (shouldBeColored) {
                const position: number = (y * width + x) * 4;
                image.data = drawPixelOnBuff(image.data, position, color);
            }
        }
    }

    return image;
}

function drawPixelOnBuff(buff: Buffer, position: number, color: Color): Buffer {
    buff[position + 0] = color.r;
    buff[position + 1] = color.g;
    buff[position + 2] = color.b;
    buff[position + 3] = 255;

    return buff;
}

function extendImage(image: PNG, newWidth: number, newHeight: number): PNG {
    const extendedImage = new PNG({ width: newWidth, height: newHeight, fill: true });
    PNG.bitblt(image, extendedImage, 0, 0, image.width, image.height, 0, 0);
    return extendedImage;
}

function fillImageSizeDifference(image: PNG, width: number, height: number, color: Color): PNG {
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            if (y > height || x > width) {
                const position: number = (image.width * y + x) << 2;
                image.data = drawPixelOnBuff(image.data, position, color);
            }
        }
    }
    return image;
}
