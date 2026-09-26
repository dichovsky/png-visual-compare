import type { Buffer } from 'node:buffer';
import type { PNG, PNGWithMetadata } from 'pngjs';
import type { Area, Color, ComparePngOptions, PixelmatchOptions } from '../types';
import type { ValidatedPath } from '../types/validated-path';
import type { DiffWriterPort, ImageSourcePort } from '../ports/types';

export type ResolvedOptions = {
    readonly excludedAreas: Area[];
    readonly throwErrorOnInvalidInputData: boolean;
    readonly extendedAreaColor: Color;
    readonly excludedAreaColor: Color;
    readonly shouldCreateDiffFile: boolean;
    readonly diffFilePath?: ValidatedPath;
    readonly maxDimension: number;
    readonly maxPixels: number;
    readonly maxFileBytes: number;
    readonly inputBaseDir?: string;
    readonly diffOutputBaseDir?: string;
    readonly pixelmatchOptions?: PixelmatchOptions;
    readonly rawOptions?: ComparePngOptions;
    readonly imageSourcePort?: ImageSourcePort;
    readonly diffWriterPort?: DiffWriterPort;
};

/**
 * Result of loading one image source: the decoded PNG, or why it could not be loaded.
 *
 * Internal. The public `LoadedPng` in `src/types/png.data.ts` is a deprecated alias of this
 * type, kept only until 8.0.0 (TYPE-06).
 */
export type LoadedPng =
    { readonly kind: 'valid'; readonly png: PNGWithMetadata } | { readonly kind: 'invalid'; readonly reason: 'path' | 'decode' | 'type' };

export type LoadedSources = {
    readonly png1: string | Buffer;
    readonly png2: string | Buffer;
    readonly first: LoadedPng;
    readonly second: LoadedPng;
};

export type NormalizedImages = {
    readonly first: PNGWithMetadata;
    readonly second: PNGWithMetadata;
    readonly width: number;
    readonly height: number;
};

export type ComparisonResult = {
    readonly mismatchedPixels: number;
    readonly diff?: PNG;
};

export type ComparisonContext = {
    readonly options: ResolvedOptions;
    readonly sources: LoadedSources;
    readonly normalized: NormalizedImages;
    readonly result: ComparisonResult;
};
