import { PNG } from 'pngjs';
import { fsDiffWriter } from '../ports/fsDiffWriter';
import type { ComparisonResult, ResolvedOptions } from './types';
import type { ValidatedPath } from '../types/validated-path';

export type PersistableDiff = {
    readonly diff: PNG;
    readonly diffFilePath: ValidatedPath;
};

export function getPersistableDiff(result: ComparisonResult, opts: ResolvedOptions): PersistableDiff | undefined {
    if (result.mismatchedPixels <= 0 || !opts.shouldCreateDiffFile || !result.diff || !opts.diffFilePath) {
        return undefined;
    }

    return {
        diff: result.diff,
        diffFilePath: opts.diffFilePath,
    };
}

export function persistDiff(result: ComparisonResult, opts: ResolvedOptions): void {
    const persistableDiff = getPersistableDiff(result, opts);
    if (!persistableDiff) {
        return;
    }

    const diffWriter = opts.diffWriterPort ?? fsDiffWriter;
    diffWriter.write(persistableDiff.diffFilePath, PNG.sync.write(persistableDiff.diff));
}
