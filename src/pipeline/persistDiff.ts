import { PNG } from 'pngjs';
import { fsDiffWriter } from '../ports/fsDiffWriter';
import type { ComparisonResult, ResolvedOptions } from './types';

export function persistDiff(result: ComparisonResult, opts: ResolvedOptions): void {
    if (result.mismatchedPixels <= 0 || !opts.shouldCreateDiffFile || !result.diff || !opts.diffFilePath) {
        return;
    }

    const diffWriter = opts.diffWriterPort ?? fsDiffWriter;
    diffWriter.write(opts.diffFilePath, PNG.sync.write(result.diff));
}
