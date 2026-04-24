import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { loadSources } from '../../src/pipeline/loadSources';
import { normalizeImages } from '../../src/pipeline/normalizeImages';
import { resolveOptions } from '../../src/pipeline/resolveOptions';

describe('normalizeImages', () => {
    test('returns new images without mutating the loaded source PNGs', () => {
        const firstPng = new PNG({ width: 1, height: 1, fill: true });
        firstPng.data.set(Buffer.from([10, 20, 30, 255]));
        const secondPng = new PNG({ width: 2, height: 1, fill: true });
        secondPng.data.set(Buffer.from([10, 20, 30, 255, 0, 0, 0, 0]));
        const opts = resolveOptions({
            excludedAreas: [{ x1: 0, y1: 0, x2: 0, y2: 0 }],
        });
        const sources = loadSources(PNG.sync.write(firstPng), PNG.sync.write(secondPng), opts);
        const firstOriginalPixel = Array.from(sources.first.png.data.subarray(0, 4));

        const normalized = normalizeImages(sources, opts);

        expect(normalized.width).toBe(2);
        expect(normalized.height).toBe(1);
        expect(normalized.first).not.toBe(sources.first.png);
        expect(normalized.second).not.toBe(sources.second.png);
        expect(Array.from(sources.first.png.data.subarray(0, 4))).toEqual(firstOriginalPixel);
        expect(Array.from(normalized.first.data.subarray(0, 4))).toEqual([0, 0, 255, 255]);
        expect(Array.from(normalized.first.data.subarray(4, 8))).toEqual([0, 255, 0, 255]);
    });
});
