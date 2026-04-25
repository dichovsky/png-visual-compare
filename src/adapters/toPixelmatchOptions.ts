import pixelmatch from 'pixelmatch';
import type { PixelmatchOptions } from '../types';

export type PixelmatchRawOptions = Parameters<typeof pixelmatch>[5];

export function toPixelmatchOptions(opts?: PixelmatchOptions): PixelmatchRawOptions | undefined {
    if (opts === undefined) {
        return undefined;
    }

    return {
        ...(opts.threshold !== undefined ? { threshold: opts.threshold } : {}),
        ...(opts.includeAA !== undefined ? { includeAA: opts.includeAA } : {}),
        ...(opts.alpha !== undefined ? { alpha: opts.alpha } : {}),
        ...(opts.aaColor !== undefined ? { aaColor: opts.aaColor } : {}),
        ...(opts.diffColor !== undefined ? { diffColor: opts.diffColor } : {}),
        ...(opts.diffColorAlt !== undefined ? { diffColorAlt: opts.diffColorAlt } : {}),
        ...(opts.diffMask !== undefined ? { diffMask: opts.diffMask } : {}),
    };
}
