import { Buffer } from 'node:buffer';
import type { ComparePngOptions } from './types';
import { loadSources } from './pipeline/loadSources';
import { normalizeImages } from './pipeline/normalizeImages';
import { persistDiff } from './pipeline/persistDiff';
import { resolveOptions } from './pipeline/resolveOptions';
import { runComparison } from './pipeline/runComparison';
import type { ComparisonPorts } from './ports/types';
export { DEFAULT_EXCLUDED_AREA_COLOR, DEFAULT_EXTENDED_AREA_COLOR, DEFAULT_MAX_DIMENSION, DEFAULT_MAX_PIXELS } from './defaults';

type ComparePngInput = string | Buffer;

export function comparePngWithPorts(
    png1: ComparePngInput,
    png2: ComparePngInput,
    opts: ComparePngOptions | undefined,
    ports?: ComparisonPorts,
): number {
    const options = { ...resolveOptions(opts), imageSourcePort: ports?.imageSource, diffWriterPort: ports?.diffWriter };
    const sources = loadSources(png1, png2, options);
    const normalized = normalizeImages(sources, options);
    const result = runComparison(normalized, options);
    persistDiff(result, options);
    return result.mismatchedPixels;
}

/** Compare two PNG inputs and return the mismatched pixel count. */
export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number {
    return comparePngWithPorts(png1, png2, opts);
}
