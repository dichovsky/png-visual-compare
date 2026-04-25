import { InvalidInputError } from './errors';
import type { PixelmatchOptions } from './types';

function validateUnitInterval(name: string, value: unknown): void {
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) {
        throw new InvalidInputError(`${name} must be a number in [0, 1]`);
    }
}

function validateBoolean(name: string, value: unknown): void {
    if (value !== undefined && typeof value !== 'boolean') {
        throw new InvalidInputError(`${name} must be a boolean`);
    }
}

function validateColorTuple(name: string, value: unknown): void {
    if (!Array.isArray(value) || value.length !== 3) {
        throw new InvalidInputError(`${name} must be a tuple of 3 integers in [0, 255]`);
    }
    for (const channel of value) {
        if (typeof channel !== 'number' || !Number.isFinite(channel) || !Number.isInteger(channel) || channel < 0 || channel > 255) {
            throw new InvalidInputError(`${name} channel values must be integers in [0, 255]`);
        }
    }
}

export function validatePixelmatchOptions(opts: PixelmatchOptions): void {
    if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
        throw new InvalidInputError('pixelmatchOptions must be an object when provided');
    }
    validateUnitInterval('pixelmatchOptions.threshold', opts.threshold);
    validateUnitInterval('pixelmatchOptions.alpha', opts.alpha);
    validateBoolean('pixelmatchOptions.includeAA', opts.includeAA);
    validateBoolean('pixelmatchOptions.diffMask', opts.diffMask);

    if (opts.aaColor !== undefined) validateColorTuple('pixelmatchOptions.aaColor', opts.aaColor);
    if (opts.diffColor !== undefined) validateColorTuple('pixelmatchOptions.diffColor', opts.diffColor);
    if (opts.diffColorAlt !== undefined) validateColorTuple('pixelmatchOptions.diffColorAlt', opts.diffColorAlt);
}
