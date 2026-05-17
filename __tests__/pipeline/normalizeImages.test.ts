import { Buffer } from 'node:buffer';
import { PNG, type PNGWithMetadata } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { ResourceLimitError } from '../../src/errors';
import { loadSources } from '../../src/pipeline/loadSources';
import { normalizeImages } from '../../src/pipeline/normalizeImages';
import { resolveOptions } from '../../src/pipeline/resolveOptions';
import type { LoadedSources } from '../../src/pipeline/types';

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
        expect(sources.first.kind).toBe('valid');
        expect(sources.second.kind).toBe('valid');
        if (sources.first.kind !== 'valid' || sources.second.kind !== 'valid') {
            throw new Error('Expected valid sources');
        }
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

describe('normalizeImages — SECU-10 canvas maxPixels guard owned by normalizeImages, not runComparison', () => {
    test('throws ResourceLimitError directly from normalizeImages when canvas exceeds maxPixels (100×1 + 1×100, maxPixels=100)', () => {
        // 100×1 + 1×100 inputs each have 100 pixels (within maxPixels=100), but the
        // normalized canvas would be 100×100 = 10 000 pixels. Pre-fix this throw
        // came from `runComparison`, *after* `normalizeImages` had already returned
        // (and `extendImage` had already allocated two oversized buffers). Post-fix
        // the throw must come from `normalizeImages` itself — verified here by
        // invoking it directly and asserting the throw, without ever calling
        // `runComparison`.
        const wide = new PNG({ width: 100, height: 1, fill: true });
        const tall = new PNG({ width: 1, height: 100, fill: true });
        const opts = resolveOptions({ maxDimension: 1000, maxPixels: 100 });
        const sources = loadSources(PNG.sync.write(wide), PNG.sync.write(tall), opts);

        expect(() => normalizeImages(sources, opts)).toThrow(ResourceLimitError);
        expect(() => normalizeImages(sources, opts)).toThrow(
            /Normalized canvas pixel count \(10000\) exceeds the maximum allowed 100 pixels/,
        );
    });

    test('throws on the same-size path too (guard lives outside the size-difference branch)', () => {
        // Same-size inputs skip the `if (width1 !== width2 || ...)` branch entirely,
        // so the guard must live outside that branch to be reached. We construct
        // `LoadedSources` directly so the per-image check in `getPngData` does not
        // intercept first — this isolates the responsibility we care about here.
        const sameSizePng = new PNG({ width: 10, height: 10, fill: true });
        const opts = resolveOptions({ maxPixels: 50 });
        const sources: LoadedSources = {
            png1: PNG.sync.write(sameSizePng),
            png2: PNG.sync.write(sameSizePng),
            first: { kind: 'valid', png: sameSizePng as unknown as PNGWithMetadata },
            second: { kind: 'valid', png: sameSizePng as unknown as PNGWithMetadata },
        };

        expect(() => normalizeImages(sources, opts)).toThrow(ResourceLimitError);
        expect(() => normalizeImages(sources, opts)).toThrow(/Normalized canvas pixel count \(100\) exceeds the maximum allowed 50 pixels/);
    });
});
