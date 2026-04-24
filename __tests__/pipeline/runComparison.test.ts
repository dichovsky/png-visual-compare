import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { loadSources } from '../../src/pipeline/loadSources';
import { normalizeImages } from '../../src/pipeline/normalizeImages';
import { resolveOptions } from '../../src/pipeline/resolveOptions';
import { runComparison } from '../../src/pipeline/runComparison';

describe('runComparison', () => {
    test('returns zero mismatches for identical in-memory PNGs', () => {
        const png = new PNG({ width: 1, height: 1, fill: true });
        png.data.set(Buffer.from([255, 0, 0, 255]));
        const opts = resolveOptions(undefined);
        const sources = loadSources(PNG.sync.write(png), PNG.sync.write(png), opts);
        const normalized = normalizeImages(sources, opts);

        const result = runComparison(normalized, opts);

        expect(result.mismatchedPixels).toBe(0);
        expect(result.diff).toBeUndefined();
    });
});
