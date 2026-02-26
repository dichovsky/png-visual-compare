import { Buffer } from 'node:buffer';
import type { Color } from './types';

/**
 * Writes a single fully-opaque pixel into a raw RGBA buffer.
 *
 * @param buff - The raw RGBA image buffer (4 bytes per pixel).
 * @param position - Byte offset of the pixel's red channel (i.e. `(y * width + x) * 4`).
 * @param color - RGB values to write; alpha is always set to 255.
 */
export function drawPixelOnBuff(buff: Buffer, position: number, color: Color): void {
    buff[position + 0] = color.r;
    buff[position + 1] = color.g;
    buff[position + 2] = color.b;
    buff[position + 3] = 255;
}
