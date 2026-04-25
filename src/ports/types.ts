import type { Buffer } from 'node:buffer';
import type { ResolvedOptions } from '../pipeline/types';
import type { LoadedPng } from '../types/png.data';
import type { ValidatedPath } from '../types/validated-path';

export interface ImageSourcePort {
    load(source: string | Buffer, opts: ResolvedOptions): LoadedPng;
}

export interface DiffWriterPort {
    write(path: ValidatedPath, data: Buffer): void;
}

export type ComparisonPorts = {
    readonly imageSource: ImageSourcePort;
    readonly diffWriter: DiffWriterPort;
};
