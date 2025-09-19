import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { addColoredAreasToImage } from './addColoredAreasToImage';
import { extendImage } from './extendImage';
import { fillImageSizeDifference } from './fillImageSizeDifference';
import { getPngData } from './getPngData';
import { Area, Color, ComparePngOptions } from './types';
import { PngData } from './types/png.data';

export function comparePng(png1: string | Buffer, png2: string | Buffer, opts?: ComparePngOptions): number {
    // Default values
    const excludedAreas: Area[] = opts?.excludedAreas ?? [];
    const throwErrorOnInvalidInputData: boolean = opts?.throwErrorOnInvalidInputData ?? true;
    const extendedAreaColor: Color = { r: 0, g: 255, b: 0 };
    const excludedAreaColor: Color = { r: 0, g: 0, b: 255 };
    const shouldCreateDiffFile: boolean = opts?.diffFilePath !== undefined;

    // Get PNG data
    const pngData1: PngData = getPngData(png1, throwErrorOnInvalidInputData);
    const pngData2: PngData = getPngData(png2, throwErrorOnInvalidInputData);

    // Check if PNG data is valid
    if (!pngData1.isValid && !pngData2.isValid) {
        throw new Error('Unknown PNG files input type');
    }

    const { width: width1, height: height1 } = pngData1.png;
    const { width: width2, height: height2 } = pngData2.png;

    const maxWidth: number = Math.max(width1, width2);
    const maxHeight: number = Math.max(height1, height2);

    const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });

    // Add excluded areas to images
    if (excludedAreas.length > 0) {
        addColoredAreasToImage(pngData1.png, excludedAreas, excludedAreaColor);
        addColoredAreasToImage(pngData2.png, excludedAreas, excludedAreaColor);
    }

    // Extend images if they have different sizes
    if (height1 !== height2 || width1 !== width2) {
        pngData1.png = extendImage(pngData1.png, maxWidth, maxHeight);
        pngData2.png = extendImage(pngData2.png, maxWidth, maxHeight);

        fillImageSizeDifference(pngData1.png, width1, height1, extendedAreaColor);
        fillImageSizeDifference(pngData2.png, width2, height2, extendedAreaColor);
    }

    // Compare images
    const pixelmatchResult: number = pixelmatch(
        pngData1.png.data,
        pngData2.png.data,
        shouldCreateDiffFile ? diff.data : null,
        maxWidth,
        maxHeight,
        opts?.pixelmatchOptions,
    );

    // Save diff image
    if (pixelmatchResult > 0 && shouldCreateDiffFile) {
        const diffFolder: string = parse(opts!.diffFilePath!).dir;
        if (!existsSync(diffFolder)) {
            mkdirSync(diffFolder, { recursive: true });
        }
        writeFileSync(opts!.diffFilePath!, PNG.sync.write(diff));
    }

    return pixelmatchResult;
}
