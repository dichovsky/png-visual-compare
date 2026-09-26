import { Buffer } from 'node:buffer';
import { comparePngWithPorts } from './comparePngWithPorts';
import type { ComparePngOptions } from './types';
export {
    DEFAULT_EXCLUDED_AREA_COLOR,
    DEFAULT_EXTENDED_AREA_COLOR,
    DEFAULT_MAX_DIMENSION,
    DEFAULT_MAX_FILE_BYTES,
    DEFAULT_MAX_PIXELS,
} from './defaults';

// Declared here rather than imported from `comparePngWithPorts`: a type import would put
// that module — and the `pngjs` types its ports reach — into the public declarations.
type ComparePngInput = string | Buffer;

/** Compare two PNG inputs and return the mismatched pixel count. */
export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number {
    return comparePngWithPorts(png1, png2, opts);
}
