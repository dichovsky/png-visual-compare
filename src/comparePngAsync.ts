import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';
import { getPersistableDiff } from './pipeline/persistDiff';
import { resolveOptions } from './pipeline/resolveOptions';
import { normalizeImages } from './pipeline/normalizeImages';
import { runComparison } from './pipeline/runComparison';
import { fsAsyncDiffWriter } from './ports/fsAsyncDiffWriter';
import { fsAsyncImageSource } from './ports/fsAsyncImageSource';
import type { ComparePngOptions } from './types';
import type { LoadedSources } from './pipeline/types';
import { InvalidInputError } from './errors';

async function loadSourcesAsync(
    png1: string | Buffer,
    png2: string | Buffer,
    opts: ReturnType<typeof resolveOptions>,
): Promise<LoadedSources> {
    const [first, second] = await Promise.all([fsAsyncImageSource.load(png1, opts), fsAsyncImageSource.load(png2, opts)]);

    if (first.kind === 'invalid' && second.kind === 'invalid') {
        throw new InvalidInputError('Unknown PNG files input type');
    }

    return { png1, png2, first, second };
}

export async function comparePngAsync(png1: string | Buffer, png2: string | Buffer, opts?: ComparePngOptions): Promise<number> {
    const options = resolveOptions(opts);
    const sources = await loadSourcesAsync(png1, png2, options);
    const normalized = normalizeImages(sources, options);
    const result = runComparison(normalized, options);
    const persistableDiff = getPersistableDiff(result, options);

    if (persistableDiff) {
        await fsAsyncDiffWriter.write(persistableDiff.diffFilePath, PNG.sync.write(persistableDiff.diff));
    }

    return result.mismatchedPixels;
}
