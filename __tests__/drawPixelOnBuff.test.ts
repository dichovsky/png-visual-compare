import { describe, expect, it } from 'vitest';
import { drawPixelOnBuff } from '../src/drawPixelOnBuff';
import { Color } from '../src/types';
import { Buffer } from 'node:buffer';

describe('drawPixelOnBuff', () => {
    it('should draw the correct color at the specified position in the buffer', () => {
        const buff = Buffer.alloc(8); // Create a buffer with 8 bytes
        const position = 0;
        const color: Color = { r: 255, g: 128, b: 64 };

        drawPixelOnBuff(buff, position, color);

        expect(buff[position + 0]).toBe(255);
        expect(buff[position + 1]).toBe(128);
        expect(buff[position + 2]).toBe(64);
        expect(buff[position + 3]).toBe(255);
    });

    it('should draw the correct color at a different position in the buffer', () => {
        const buff = Buffer.alloc(8); // Create a buffer with 8 bytes
        const position = 4;
        const color: Color = { r: 0, g: 255, b: 128 };

        drawPixelOnBuff(buff, position, color);

        expect(buff[position + 0]).toBe(0);
        expect(buff[position + 1]).toBe(255);
        expect(buff[position + 2]).toBe(128);
        expect(buff[position + 3]).toBe(255);
    });
});
