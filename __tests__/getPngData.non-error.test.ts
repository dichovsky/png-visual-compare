import { expect, it, vi } from 'vitest';

// Spread the original module into a plain object so vi.spyOn can redefine its properties.
// ESM module namespaces are non-configurable by default, which prevents spying.
vi.mock('node:fs', async (importOriginal) => {
    const mod = await importOriginal<typeof import('node:fs')>();
    return { ...mod };
});

import * as nodeFs from 'node:fs';
import { PNG } from 'pngjs';
import { getPngData } from '../src/getPngData';

it('should throw with fallback error detail when the caught value is not an Error instance', () => {
    vi.spyOn(nodeFs, 'readFileSync').mockImplementationOnce(() => {
        throw 'non-error string';
    });
    expect(() => getPngData('/any/path.png', true)).toThrow(/^PNG file .+ could not be read: Unknown error$/);
});

it('should throw with fallback error detail when PNG parsing throws a non-Error value', () => {
    vi.spyOn(PNG.sync, 'read').mockImplementationOnce(() => {
        throw 'non-error string';
    });
    expect(() => getPngData(Buffer.from('not-a-real-png'), true)).toThrow(/^PNG buffer could not be read: Unknown error$/);
});
