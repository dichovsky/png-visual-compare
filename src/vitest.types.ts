import 'vitest';
import type { ComparePngOptions } from './types';

declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Assertion<T = any> {
        toMatchPngSnapshot(opts?: ComparePngOptions): T;
        toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): T;
    }

    interface AsymmetricMatchersContaining {
        toMatchPngSnapshot(opts?: ComparePngOptions): void;
        toMatchPngSnapshot(hint?: string, opts?: ComparePngOptions): void;
    }
}

export {};
