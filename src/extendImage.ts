import { PNG, type PNGWithMetadata } from 'pngjs';

/**
 * Returns a new PNG of size `newWidth × newHeight` with the original image
 * bit-blitted into the top-left corner. The remaining area is transparent (zero-filled).
 *
 * If the image is already at least `newWidth` wide and `newHeight` tall the original
 * instance is returned unchanged.
 *
 * @param image - Source PNG to extend.
 * @param newWidth - Target canvas width in pixels.
 * @param newHeight - Target canvas height in pixels.
 * @returns The extended (or original) PNG.
 */
export function extendImage(image: PNGWithMetadata, newWidth: number, newHeight: number): PNGWithMetadata {
    if (image.width >= newWidth && image.height >= newHeight) {
        return image;
    }
    const extendedImage = new PNG({ width: newWidth, height: newHeight, fill: true });
    PNG.bitblt(image, extendedImage, 0, 0, image.width, image.height, 0, 0);
    return extendedImage as PNGWithMetadata;
}
