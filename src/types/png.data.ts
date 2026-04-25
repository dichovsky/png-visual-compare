import type { PNGWithMetadata } from 'pngjs';

export type LoadedPng =
    | { readonly kind: 'valid'; readonly png: PNGWithMetadata }
    | { readonly kind: 'invalid'; readonly reason: 'path' | 'decode' | 'type' };
