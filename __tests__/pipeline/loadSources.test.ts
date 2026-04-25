import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { loadSources } from '../../src/pipeline/loadSources';
import { resolveOptions } from '../../src/pipeline/resolveOptions';

describe('loadSources', () => {
    test('loads valid in-memory PNG buffers', () => {
        const png = new PNG({ width: 1, height: 1, fill: true });
        png.data[0] = 255;
        png.data[3] = 255;
        const buffer = PNG.sync.write(png);
        const opts = resolveOptions(undefined);

        const result = loadSources(buffer, buffer, opts);

        expect(result.first.kind).toBe('valid');
        expect(result.second.kind).toBe('valid');
        if (result.first.kind === 'valid' && result.second.kind === 'valid') {
            expect(result.first.png.width).toBe(1);
            expect(result.second.png.height).toBe(1);
        }
    });
});
