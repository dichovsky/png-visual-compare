export {
    comparePng,
    DEFAULT_EXCLUDED_AREA_COLOR,
    DEFAULT_EXTENDED_AREA_COLOR,
    DEFAULT_MAX_DIMENSION,
    DEFAULT_MAX_FILE_BYTES,
    DEFAULT_MAX_PIXELS,
} from './comparePng';
export { comparePngAsync } from './comparePngAsync';
export { ComparisonError, InvalidInputError, PathValidationError, ResourceLimitError } from './errors';

// An explicit list, not `export type *`, so a type added under `src/types` cannot become
// public by accident (TYPE-06). `LoadedPng` is deprecated and goes in 8.0.0.
export type { Area, Color, ComparePngOptions, LoadedPng, PixelmatchOptions } from './types';
