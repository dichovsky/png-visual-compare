import { Buffer } from 'node:buffer';
import { InvalidInputError } from '../errors';
import { fsImageSource } from '../ports/fsImageSource';
import type { LoadedSources, ResolvedOptions } from './types';

export function loadSources(png1: string | Buffer, png2: string | Buffer, opts: ResolvedOptions): LoadedSources {
    const imageSource = opts.imageSourcePort ?? fsImageSource;
    const first = imageSource.load(png1, opts);
    const second = imageSource.load(png2, opts);

    if (first.kind === 'invalid' && second.kind === 'invalid') {
        throw new InvalidInputError('Unknown PNG files input type');
    }

    return { png1, png2, first, second };
}
