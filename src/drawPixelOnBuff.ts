import { Buffer } from 'node:buffer';
import { Color } from './types';

export function drawPixelOnBuff(buff: Buffer, position: number, color: Color): void {
    buff[position + 0] = color.r;
    buff[position + 1] = color.g;
    buff[position + 2] = color.b;
    buff[position + 3] = 255;
}
