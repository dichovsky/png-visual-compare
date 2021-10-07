import { Area } from './area';
import { Color } from './color';

export type CompareOptions = {
    excludedAreas?: Area[];
    excludedAreaColor?: Color;
    diffFilePath?: string;
    matchingThreshold?: number;
};
