import { InvalidInputError } from './errors';
import type { Area } from './types';

export function validateArea(area: Area, index: number): void {
    if (typeof area !== 'object' || area === null) {
        throw new InvalidInputError(`excludedAreas[${index}]: area must be an object with x1, y1, x2, y2 coordinates`);
    }
    const { x1, y1, x2, y2 } = area;

    if (![x1, y1, x2, y2].every((coordinate) => Number.isFinite(coordinate) && Math.round(coordinate) === coordinate)) {
        throw new InvalidInputError(`excludedAreas[${index}]: coordinates must be finite integers`);
    }
    if (x1 > x2) {
        throw new InvalidInputError(`excludedAreas[${index}]: x1 must be <= x2`);
    }
    if (y1 > y2) {
        throw new InvalidInputError(`excludedAreas[${index}]: y1 must be <= y2`);
    }
}
