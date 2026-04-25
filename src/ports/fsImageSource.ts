import { getPngData } from '../getPngData';
import type { ImageSourcePort } from './types';

export const fsImageSource: ImageSourcePort = {
    load(source, opts) {
        return getPngData(source, opts.throwErrorOnInvalidInputData, opts.maxDimension, opts.maxPixels, opts.inputBaseDir);
    },
};
