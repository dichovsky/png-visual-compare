import { PixelmatchOptions } from 'pixelmatch';
import { Area } from './area';

export type ComparePngOptions = {
  excludedAreas?: Area[];
  diffFilePath?: string;
  throwErrorOnInvalidInputData?: boolean;
  pixelmatchOptions?: PixelmatchOptions;
};
