import { Area } from './area';
import { PNG } from 'pngjs';
import { Color } from './color';

export type CompareOptions = {
    img1: string | PNG;
    img2: string | PNG;
    excludedAreas?: Area[];
    excludedAreaColor?: Color;
    diffFilePath?: string;
    matchingThreshold?: number;
};
