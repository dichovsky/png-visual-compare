import { PNG, type PNGWithMetadata } from 'pngjs';

export function extendImage(image: PNGWithMetadata, newWidth: number, newHeight: number): PNGWithMetadata {
    if (image.width >= newWidth && image.height >= newHeight) {
        return image;
    }
    const extendedImage = new PNG({ width: newWidth, height: newHeight, fill: true });
    PNG.bitblt(image, extendedImage, 0, 0, image.width, image.height, 0, 0);
    return extendedImage as PNGWithMetadata;
}
