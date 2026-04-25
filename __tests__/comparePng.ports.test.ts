import { resolve } from 'path';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { comparePngWithPorts } from '../src/comparePng';
import type { ComparisonPorts } from '../src/ports/types';

function createPngBuffer(width: number, height: number, rgba: [number, number, number, number]): Buffer {
    const png = new PNG({ width, height, fill: true });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = rgba[0];
        png.data[i + 1] = rgba[1];
        png.data[i + 2] = rgba[2];
        png.data[i + 3] = rgba[3];
    }
    return PNG.sync.write(png);
}

describe('comparePng port orchestration', () => {
    test('loads both sources and skips diff writes for zero mismatches', () => {
        const loadCalls: Array<string | Buffer> = [];
        const writes: Buffer[] = [];
        const ports: ComparisonPorts = {
            imageSource: {
                load(source) {
                    loadCalls.push(source);
                    return { kind: 'valid', png: PNG.sync.read(source as Buffer) };
                },
            },
            diffWriter: {
                write(_path, data) {
                    writes.push(data);
                },
            },
        };

        const buffer = createPngBuffer(2, 2, [255, 255, 255, 255]);
        const result = comparePngWithPorts(buffer, buffer, { diffFilePath: resolve('./test-results/ports/no-diff.png') }, ports);

        expect(result).toBe(0);
        expect(loadCalls).toHaveLength(2);
        expect(writes).toHaveLength(0);
    });

    test('applies normalization after load and writes diffs for remaining mismatches', () => {
        const loadCalls: Array<string | Buffer> = [];
        const writes: Buffer[] = [];
        const ports: ComparisonPorts = {
            imageSource: {
                load(source) {
                    loadCalls.push(source);
                    return { kind: 'valid', png: PNG.sync.read(source as Buffer) };
                },
            },
            diffWriter: {
                write(_path, data) {
                    writes.push(data);
                },
            },
        };

        const first = new PNG({ width: 2, height: 2, fill: true });
        const second = new PNG({ width: 2, height: 2, fill: true });
        first.data.set(Buffer.from([255, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]));
        second.data.set(Buffer.from([0, 0, 255, 255, 0, 255, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255]));

        const result = comparePngWithPorts(
            PNG.sync.write(first),
            PNG.sync.write(second),
            {
                diffFilePath: resolve('./test-results/ports/normalized-diff.png'),
                excludedAreas: [{ x1: 0, y1: 0, x2: 0, y2: 0 }],
            },
            ports,
        );

        expect(result).toBeGreaterThan(0);
        expect(loadCalls).toHaveLength(2);
        expect(writes).toHaveLength(1);
    });
});
