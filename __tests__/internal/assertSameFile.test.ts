import { describe, expect, test } from 'vitest';
import { PathValidationError } from '../../src';
import { assertSameFile } from '../../src/internal/assertSameFile';

const identity = (dev: bigint, ino: bigint) => ({ dev, ino });

describe('assertSameFile', () => {
    test('accepts two identities describing the same file', () => {
        expect(() => assertSameFile(identity(1n, 42n), identity(1n, 42n), 'input image')).not.toThrow();
    });

    test('refuses when the opened handle reports no file identity', () => {
        expect(() => assertSameFile(identity(1n, 0n), identity(1n, 42n), 'input image')).toThrow(PathValidationError);
        expect(() => assertSameFile(identity(1n, 0n), identity(1n, 42n), 'input image')).toThrow(/reports no file identity/);
    });

    test('refuses when the validated path reports no file identity', () => {
        expect(() => assertSameFile(identity(1n, 42n), identity(1n, 0n), 'diff file')).toThrow(/reports no file identity/);
    });

    test('names the subject so the caller knows which path failed', () => {
        expect(() => assertSameFile(identity(1n, 0n), identity(1n, 0n), 'diff file')).toThrow(/for diff file/);
    });

    test('refuses when the inode differs', () => {
        expect(() => assertSameFile(identity(1n, 42n), identity(1n, 43n), 'input image')).toThrow(/changed between validation and access/);
    });

    test('refuses when only the device differs, catching a same-inode file on another volume', () => {
        expect(() => assertSameFile(identity(1n, 42n), identity(2n, 42n), 'input image')).toThrow(PathValidationError);
    });
});
