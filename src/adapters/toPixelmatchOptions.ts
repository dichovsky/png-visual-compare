import type { PixelmatchKernelOptions } from '../vendor/pixelmatch';
import type { PixelmatchOptions } from '../types';

export function toPixelmatchOptions(opts?: PixelmatchOptions): PixelmatchKernelOptions | undefined {
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
        ...(opts.checkerboard !== undefined ? { checkerboard: opts.checkerboard } : {}),
        ...(opts.windowSize !== undefined ? { windowSize: opts.windowSize } : {}),
        ...(opts.ignoreMask !== undefined ? { ignoreMask: opts.ignoreMask } : {}),
    };
}
