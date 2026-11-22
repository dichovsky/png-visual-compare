import { expect, test } from 'vitest';
import * as Index from '../src/index';
// @ts-expect-error The public API removed LoadedPng in v8. An accidental export fails type-checking.
export type { LoadedPng } from '../src/index';

test('index.ts should export modules', () => {
    expect(Index).toBeDefined();
    expect(Index.comparePng).toBeDefined();
    expect(Index.comparePngAsync).toBeDefined();
});
