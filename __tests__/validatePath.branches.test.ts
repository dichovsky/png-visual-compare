import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { lstatSyncMock, statSyncMock, realpathNativeMock } = vi.hoisted(() => ({
    lstatSyncMock: vi.fn(),
    statSyncMock: vi.fn(),
    realpathNativeMock: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
    const mod = await importOriginal<typeof import('node:fs')>();
    return {
        ...mod,
        lstatSync: lstatSyncMock,
        statSync: statSyncMock,
        realpathSync: {
            ...mod.realpathSync,
            native: realpathNativeMock,
        },
    };
});

import { validatePath } from '../src/validatePath';

describe('validatePath branch coverage', () => {
    beforeEach(() => {
        lstatSyncMock.mockReset();
        statSyncMock.mockReset();
        realpathNativeMock.mockReset();
    });

    test('rethrows non-ENOENT output stat errors', () => {
        const error = Object.assign(new Error('denied'), { code: 'EACCES' });
        lstatSyncMock.mockImplementation(() => {
            throw error;
        });

        expect(() => validatePath('/tmp/file.png')).toThrow(error);
    });

    test('rethrows non-ENOENT errors while resolving the nearest existing ancestor', () => {
        const root = path.parse(process.cwd()).root;
        const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' });
        const eacces = Object.assign(new Error('denied'), { code: 'EACCES' });
        lstatSyncMock.mockImplementation(() => {
            throw enoent;
        });
        realpathNativeMock
            .mockImplementationOnce(() => root)
            .mockImplementationOnce(() => {
                throw eacces;
            });

        expect(() => validatePath(path.join(root, 'tmp', 'file.png'), root, 'output')).toThrow(eacces);
    });

    test('rethrows ENOENT when ancestor resolution reaches the filesystem root', () => {
        const root = path.parse(process.cwd()).root;
        const enoent = Object.assign(new Error('missing'), { code: 'ENOENT' });
        lstatSyncMock.mockImplementation(() => {
            throw enoent;
        });
        realpathNativeMock
            .mockImplementationOnce(() => root)
            .mockImplementationOnce(() => {
                throw enoent;
            });

        expect(() => validatePath(path.join(root, 'file.png'), root, 'output')).toThrow(enoent);
    });
});
