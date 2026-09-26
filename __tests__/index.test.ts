import { expect, test } from 'vitest';
import * as Index from '../src/index';
import type { LoadedPng } from '../src/index';

test('index.ts should export modules', () => {
    expect(Index).toBeDefined();
    expect(Index.comparePng).toBeDefined();
    expect(Index.comparePngAsync).toBeDefined();
});

test('keeps the deprecated LoadedPng type export until 8.0.0', () => {
    // Compile-time guard: removing the export is breaking (TYPE-06), so this fails typecheck
    // if it happens before the major.
    const invalid: LoadedPng = { kind: 'invalid', reason: 'type' };
    expect(invalid.kind).toBe('invalid');
});
