import { Area } from './area';
import { Color } from './color';

export type ComparePngOptions = {
  excludedAreas?: Area[];
  excludedAreaColor?: Color;
  diffFilePath?: string;
  matchingThreshold?: number;
};
