import type { LoadedPng as InternalLoadedPng } from '../pipeline/types';

/**
 * @deprecated No public API returns or accepts a `LoadedPng` — it describes an internal loading
 * step. It will be removed in 8.0.0; delete any import of it (TYPE-06).
 */
export type LoadedPng = InternalLoadedPng;
