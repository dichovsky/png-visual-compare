import type { Buffer } from 'node:buffer';

/**
 * A PNG input to `comparePng` / `comparePngAsync`: a file path or the PNG bytes.
 *
 * This type is internal (not exported from the package entry), but it appears in the public
 * declarations. Thus, it must not use `pngjs` types. If you define it in `src/pipeline/`, a
 * consumer without `@types/pngjs` gets TS7016 with `skipLibCheck: false` (TYPE-06, TYPE-07).
 */
export type ComparePngInput = string | Buffer;
