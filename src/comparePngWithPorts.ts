import { Buffer } from 'node:buffer';
import type { ComparePngOptions } from './types';
import { loadSources } from './pipeline/loadSources';
import { normalizeImages } from './pipeline/normalizeImages';
import { persistDiff } from './pipeline/persistDiff';
import { resolveOptions } from './pipeline/resolveOptions';
import { runComparison } from './pipeline/runComparison';
import type { ComparisonPorts } from './ports/types';

type ComparePngInput = string | Buffer;

/**
 * Sync orchestration with injectable ports — the internal test seam behind `comparePng`.
 *
 * Lives outside `comparePng.ts` so the public declarations never reference the port
 * types, which reach `pngjs` types a consumer may not have installed (TS7016 under
 * `skipLibCheck: false`, TYPE-06). Not re-exported from the package entry, and
 * unreachable through the `exports` map.
 */
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
