import type { PixelmatchOptions } from 'pixelmatch';
import type { Area } from './area';

export type ComparePngOptions = {
  excludedAreas?: Area[];
  diffFilePath?: string;
  throwErrorOnInvalidInputData?: boolean;
  pixelmatchOptions?: PixelmatchOptions;
};
