import { expect, test } from 'vitest';
import * as Index from '../src/index';
// Compile-time guard: `LoadedPng` was removed in 8.0.0 (TYPE-06). Re-exporting it would make
// this directive unused and fail typecheck, and put `pngjs` types back in the public declarations.
// @ts-expect-error LoadedPng is not part of the public API.
import type { LoadedPng } from '../src/index';

test('index.ts should export modules', () => {
    expect(Index).toBeDefined();
    expect(Index.comparePng).toBeDefined();
    expect(Index.comparePngAsync).toBeDefined();
});

test('does not export the removed LoadedPng type', () => {
    const removed: LoadedPng | undefined = undefined;
    expect(removed).toBeUndefined();
});
