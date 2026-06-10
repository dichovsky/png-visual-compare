import { describe, expect, test } from 'vitest';
import { describeBothInvalidSources } from '../src/pipeline/describeInvalidSources';

describe('describeBothInvalidSources', () => {
    test.each([
        {
            first: 'decode',
            second: 'decode',
            expected: 'Both PNG inputs are invalid — png1: could not decode PNG content; png2: could not decode PNG content.',
        },
        {
            first: 'path',
            second: 'path',
            expected: 'Both PNG inputs are invalid — png1: source path could not be loaded; png2: source path could not be loaded.',
        },
        {
            first: 'type',
            second: 'type',
            expected: 'Both PNG inputs are invalid — png1: unrecognized input type; png2: unrecognized input type.',
        },
        {
            first: 'decode',
            second: 'path',
            expected: 'Both PNG inputs are invalid — png1: could not decode PNG content; png2: source path could not be loaded.',
        },
    ] as const)('maps $first/$second reasons to an accurate message', ({ first, second, expected }) => {
        expect(describeBothInvalidSources(first, second)).toBe(expected);
    });
});
