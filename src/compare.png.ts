import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { Area, Color, ComparePngOptions } from './types';

export default function comparePng(
  image1FilePathOrBuffer: string | Buffer,
  image2FilePathOrBuffer: string | Buffer,
  opts?: ComparePngOptions,
): number {
  let img1: PNG = getPng(image1FilePathOrBuffer);
  let img2: PNG = getPng(image2FilePathOrBuffer);

  const excludedAreas: Area[] = opts?.excludedAreas 
    ? opts.excludedAreas 
    : [];
  const excludedAreaColor: Color = opts?.excludedAreaColor 
    ? opts.excludedAreaColor 
    : { r: 0, g: 0, b: 255 };
  const matchingThreshold: number = opts?.matchingThreshold 
    ? opts?.matchingThreshold 
    : 0.1;

  const { width: width1, height: height1 } = img1;
  const { width: width2, height: height2 } = img2;
  const imageHeightDoNotMatch: boolean = height1 !== height2;
  const imageWidthDoNotMatch: boolean = width1 !== width2;

  const maxWidth: number = Math.max(width1, width2);
  const maxHeight: number = Math.max(height1, height2);

  const diff: PNG = new PNG({ width: maxWidth, height: maxHeight });

  if (excludedAreas.length > 0) {
    img1 = addColoredAreasToImage(img1, excludedAreas, excludedAreaColor);
    img2 = addColoredAreasToImage(img2, excludedAreas, excludedAreaColor);
  }

  if (imageHeightDoNotMatch || imageWidthDoNotMatch) {
    img1 = extendImage(img1, maxWidth, maxHeight);
    img2 = extendImage(img2, maxWidth, maxHeight);

    img1 = fillImageSizeDifference(img1, width1, height1, excludedAreaColor);
    img2 = fillImageSizeDifference(img2, width2, height2, excludedAreaColor);
  }

  const result: number = pixelmatch(img1.data, img2.data, diff.data, maxWidth, maxHeight, {
    threshold: matchingThreshold,
  });

  if (result > 0 && opts?.diffFilePath !== undefined) {
    if (!existsSync(parse(opts.diffFilePath).dir)) {
      mkdirSync(parse(opts.diffFilePath).dir, { recursive: true });
    }
    writeFileSync(opts.diffFilePath, PNG.sync.write(diff));
  }
  return result;
}

function getPng(pngSource: string | Buffer): PNG {
  if (typeof pngSource === 'string') {
    if (!existsSync(pngSource)) throw Error('File not found');
    return PNG.sync.read(readFileSync(pngSource));
  }
  return PNG.sync.read(pngSource);
}

function addColoredAreasToImage(image: PNG, areas: Area[], color: Color): PNG {
  const { height, width } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const shouldBeColored: boolean = areas.some((rectangle) => {
        return x >= rectangle.x1 && y >= rectangle.y1 && x <= rectangle.x2 && y <= rectangle.y2;
      });
      if (shouldBeColored) {
        const pos: number = (y * width + x) * 4;
        image.data = drawPixelOnBuff(image.data, pos, color);
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
  const resized = new PNG({ width: newWidth, height: newHeight, fill: true });
  PNG.bitblt(image, resized, 0, 0, image.width, image.height, 0, 0);
  return resized;
}

function fillImageSizeDifference(image: PNG, width: number, height: number, color: Color): PNG {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (y > height || x > width) {
        const pos: number = (image.width * y + x) << 2;
        image.data = drawPixelOnBuff(image.data, pos, color);
      }
    }
  }
  return image;
}
