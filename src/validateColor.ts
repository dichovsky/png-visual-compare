import type { Color } from './types';

/**
 * Validates that all channels of a {@link Color} are integers in the range [0, 255].
 *
 * Iterates the fixed set `['r', 'g', 'b']` explicitly so that missing channels
 * (e.g. `{ r: 0, g: 0 }`) are always caught, regardless of how many keys the
 * runtime object actually has.
 *
 * Color values outside [0, 255] are silently truncated by JavaScript's Buffer
 * byte-assignment semantics, which can mask configuration errors and corrupt
 * exclusion/extension logic without any visible signal.
 *
 * @param color - The color object to validate.
 * @param name - A descriptive name used in the thrown error message.
 * @throws {RangeError} If any channel is not a finite integer in [0, 255].
 */
export function validateColor(color: Color, name: string): void {
    for (const channel of ['r', 'g', 'b'] as const) {
        const value = color[channel];
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) {
            throw new RangeError(`${name}.${channel} must be an integer in [0, 255], got ${String(value)}`);
        }
    }
}
