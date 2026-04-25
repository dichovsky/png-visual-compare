import type { Buffer } from 'node:buffer';
import type { ResolvedOptions } from '../pipeline/types';
import type { LoadedPng } from '../types/png.data';
import type { ValidatedPath } from '../types/validated-path';

export interface AsyncImageSourcePort {
    load(source: string | Buffer, opts: ResolvedOptions): Promise<LoadedPng>;
}

export interface AsyncDiffWriterPort {
    write(path: ValidatedPath, data: Buffer): Promise<void>;
}
