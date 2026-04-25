import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { persistDiff } from '../../src/pipeline/persistDiff';
import { resolveOptions } from '../../src/pipeline/resolveOptions';

describe('persistDiff', () => {
    test('writes a diff PNG when mismatches are present and diff output is enabled', () => {
        const diffFilePath = resolve('./test-results/pipeline/persist-diff/diff.png');
        const diffDir = resolve('./test-results/pipeline/persist-diff');
        const diff = new PNG({ width: 1, height: 1, fill: true });
        diff.data.set(Buffer.from([255, 0, 0, 255]));
        const opts = resolveOptions({ diffFilePath });

        rmSync(diffDir, { recursive: true, force: true });

        persistDiff({ mismatchedPixels: 1, diff }, opts);

        expect(existsSync(diffFilePath)).toBe(true);
        expect(readFileSync(diffFilePath)).toEqual(PNG.sync.write(diff));
    });
});
