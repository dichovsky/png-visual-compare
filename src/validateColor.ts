import type { Color } from './types';

/**
 * Validates that all channels of a {@link Color} are integers in the range [0, 255].
 *
 * Color values outside this range are silently truncated by JavaScript's Buffer
 * byte-assignment semantics, which can mask configuration errors and corrupt
 * exclusion/extension logic in unexpected ways.
 *
 * @param color - The color object to validate.
 * @param name - A descriptive name for the color (used in the error message).
 * @throws {RangeError} If any channel is not a finite integer in [0, 255].
 */
export function validateColor(color: Color, name: string): void {
    for (const [channel, value] of Object.entries(color) as [string, unknown][]) {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) {
            throw new RangeError(`${name}.${channel} must be an integer in [0, 255], got ${String(value)}`);
        }
    }
}
