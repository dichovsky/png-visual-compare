import { comparePngWithPorts } from './comparePngWithPorts';
import type { ComparePngInput, ComparePngOptions } from './types';
export {
    DEFAULT_EXCLUDED_AREA_COLOR,
    DEFAULT_EXTENDED_AREA_COLOR,
    DEFAULT_MAX_DIMENSION,
    DEFAULT_MAX_FILE_BYTES,
    DEFAULT_MAX_PIXELS,
} from './defaults';

/** Compare two PNG inputs and return the mismatched pixel count. */
export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number {
    return comparePngWithPorts(png1, png2, opts);
}
