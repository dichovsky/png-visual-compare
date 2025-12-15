export type PixelmatchOptions = {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    aaColor?: [number, number, number];
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
    diffMask?: boolean;
};

import type { Area } from './area';

export type ComparePngOptions = {
  excludedAreas?: Area[];
  diffFilePath?: string;
  throwErrorOnInvalidInputData?: boolean;
  pixelmatchOptions?: PixelmatchOptions;
};
