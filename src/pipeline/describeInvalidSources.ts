import type { LoadedPng } from '../types/png.data';

type InvalidPngReason = Extract<LoadedPng, { kind: 'invalid' }>['reason'];

const INVALID_PNG_REASON_PHRASES: Record<InvalidPngReason, string> = {
    decode: 'could not decode PNG content',
    path: 'source path could not be loaded',
    type: 'unrecognized input type',
};

/**
 * Builds the error message used when both PNG inputs fail to load. Reports each
 * input's actual failure reason (invalid content vs. unloadable path vs. unknown
 * type) instead of the misleading "Unknown PNG files input type", which wrongly
 * implies the input *type* was unrecognised even for valid `Buffer`/`string`
 * inputs whose content simply could not be decoded.
 *
 * The `path` phrasing intentionally stays generic ("could not be loaded") rather
 * than "file not found": `reason: 'path'` also covers unreadable files, ENOTDIR,
 * and path-validation failures, mirroring the VUL-05 messaging in getPngData.
 */
export function describeBothInvalidSources(firstReason: InvalidPngReason, secondReason: InvalidPngReason): string {
    return `Both PNG inputs are invalid — png1: ${INVALID_PNG_REASON_PHRASES[firstReason]}; png2: ${INVALID_PNG_REASON_PHRASES[secondReason]}.`;
}
