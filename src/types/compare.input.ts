import type { Buffer } from 'node:buffer';

/**
 * A PNG input to `comparePng` / `comparePngAsync`: a file path or the PNG bytes.
 *
 * Internal (not exported from the package entry), but it appears in the public declarations,
 * so it must stay free of `pngjs` types — defining it under `src/pipeline/` would give a
 * consumer without `@types/pngjs` TS7016 under `skipLibCheck: false` (TYPE-06, TYPE-07).
 */
export type ComparePngInput = string | Buffer;
