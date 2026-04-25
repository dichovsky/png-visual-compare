import { describe, expect, test } from 'vitest';
import { InvalidInputError, PathValidationError, ResourceLimitError } from '../src';

describe('structured errors', () => {
    test('InvalidInputError exposes name, code, and message', () => {
        const error = new InvalidInputError('invalid');

        expect(error.name).toBe('InvalidInputError');
        expect(error.code).toBe('ERR_INVALID_PNG_INPUT');
        expect(error.message).toBe('invalid');
        expect(error).toBeInstanceOf(InvalidInputError);
    });

    test('PathValidationError exposes name, code, and message', () => {
        const error = new PathValidationError('path');

        expect(error.name).toBe('PathValidationError');
        expect(error.code).toBe('ERR_PATH_VALIDATION');
        expect(error.message).toBe('path');
        expect(error).toBeInstanceOf(PathValidationError);
    });

    test('ResourceLimitError exposes name, code, and message', () => {
        const error = new ResourceLimitError('limit');

        expect(error.name).toBe('ResourceLimitError');
        expect(error.code).toBe('ERR_RESOURCE_LIMIT');
        expect(error.message).toBe('limit');
        expect(error).toBeInstanceOf(ResourceLimitError);
    });
});
