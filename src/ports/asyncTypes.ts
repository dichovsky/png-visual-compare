import type { Buffer } from 'node:buffer';
import type { LoadedPng, ResolvedOptions } from '../pipeline/types';
import type { ValidatedPath } from '../types/validated-path';

export interface AsyncImageSourcePort {
    load(source: string | Buffer, opts: ResolvedOptions): Promise<LoadedPng>;
}

export interface AsyncDiffWriterPort {
    write(path: ValidatedPath, data: Buffer, baseDir?: string): Promise<void>;
}
