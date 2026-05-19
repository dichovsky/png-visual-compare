import { describe, expect, test } from 'vitest';
import { ComparisonError, InvalidInputError, PathValidationError, ResourceLimitError } from '../src';

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

    test('ComparisonError exposes name, code, and message', () => {
        const error = new ComparisonError('compare');

        expect(error.name).toBe('ComparisonError');
        expect(error.code).toBe('ERR_COMPARISON');
        expect(error.message).toBe('compare');
        expect(error).toBeInstanceOf(ComparisonError);
        expect(error).toBeInstanceOf(Error);
    });

    test('ComparisonError preserves the underlying cause when provided', () => {
        const underlying = new Error('boom');
        const error = new ComparisonError('compare', { cause: underlying });

        expect(error.cause).toBe(underlying);
    });

    test('ComparisonError accepts a non-Error cause without coercion', () => {
        const error = new ComparisonError('compare', { cause: 'raw-string' });

        expect(error.cause).toBe('raw-string');
    });

    test('ComparisonError without options leaves cause undefined', () => {
        const error = new ComparisonError('compare');

        expect(error.cause).toBeUndefined();
    });
});
