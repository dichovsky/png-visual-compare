import type { ComparePngOptions } from '../types';
import { DEFAULT_EXCLUDED_AREA_COLOR, DEFAULT_EXTENDED_AREA_COLOR, DEFAULT_MAX_DIMENSION, DEFAULT_MAX_PIXELS } from '../defaults';
import { InvalidInputError } from '../errors';
import type { ValidatedPath } from '../types/validated-path';
import { validateArea } from '../validateArea';
import { validateColor } from '../validateColor';
import { validatePixelmatchOptions } from '../validatePixelmatchOptions';
import { validatePath } from '../validatePath';
import type { ResolvedOptions } from './types';

export function resolveOptions(raw: ComparePngOptions | undefined): ResolvedOptions {
    const excludedAreas = raw?.excludedAreas === undefined ? [] : raw.excludedAreas;
    if (!Array.isArray(excludedAreas)) {
        throw new InvalidInputError('opts.excludedAreas must be an array when provided');
    }
    const throwErrorOnInvalidInputData = raw?.throwErrorOnInvalidInputData ?? true;
    if (raw?.throwErrorOnInvalidInputData !== undefined && typeof raw.throwErrorOnInvalidInputData !== 'boolean') {
        throw new TypeError('opts.throwErrorOnInvalidInputData must be a boolean when provided');
    }
    const extendedAreaColor = raw?.extendedAreaColor ?? DEFAULT_EXTENDED_AREA_COLOR;
    const excludedAreaColor = raw?.excludedAreaColor ?? DEFAULT_EXCLUDED_AREA_COLOR;
    const rawDiffFilePath = raw?.diffFilePath;
    const inputBaseDir = raw?.inputBaseDir;
    const diffOutputBaseDir = raw?.diffOutputBaseDir;

    excludedAreas.forEach((area, index) => validateArea(area, index));

    if (inputBaseDir !== undefined && typeof inputBaseDir !== 'string') {
        throw new TypeError('opts.inputBaseDir must be a string when provided');
    }
    if (diffOutputBaseDir !== undefined && typeof diffOutputBaseDir !== 'string') {
        throw new TypeError('opts.diffOutputBaseDir must be a string when provided');
    }

    let shouldCreateDiffFile = false;
    let diffFilePath: ValidatedPath | undefined;
    if (rawDiffFilePath !== undefined) {
        if (typeof rawDiffFilePath !== 'string') {
            throw new TypeError('opts.diffFilePath must be a string when provided');
        }
        shouldCreateDiffFile = true;
        diffFilePath = validatePath(rawDiffFilePath, diffOutputBaseDir);
    }

    const rawMaxDimension = raw?.maxDimension ?? DEFAULT_MAX_DIMENSION;
    if (rawMaxDimension !== Infinity && (!Number.isInteger(rawMaxDimension) || rawMaxDimension <= 0)) {
        throw new TypeError('opts.maxDimension must be a positive integer or Infinity');
    }
    const rawMaxPixels = raw?.maxPixels ?? DEFAULT_MAX_PIXELS;
    if (rawMaxPixels !== Infinity && (!Number.isInteger(rawMaxPixels) || rawMaxPixels <= 0)) {
        throw new TypeError('opts.maxPixels must be a positive integer or Infinity');
    }

    validateColor(extendedAreaColor, 'extendedAreaColor');
    validateColor(excludedAreaColor, 'excludedAreaColor');
    if (raw?.pixelmatchOptions !== undefined) {
        validatePixelmatchOptions(raw.pixelmatchOptions);
    }

    return {
        excludedAreas,
        throwErrorOnInvalidInputData,
        extendedAreaColor,
        excludedAreaColor,
        shouldCreateDiffFile,
        diffFilePath,
        maxDimension: rawMaxDimension,
        maxPixels: rawMaxPixels,
        inputBaseDir,
        diffOutputBaseDir,
        pixelmatchOptions: raw?.pixelmatchOptions,
        rawOptions: raw,
    };
}
