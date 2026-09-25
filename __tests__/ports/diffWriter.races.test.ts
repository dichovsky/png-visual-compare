import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Spread the original modules into plain objects so vi.spyOn can redefine their
// properties. ESM module namespaces are non-configurable by default.
vi.mock('node:fs', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs')>()) }));
vi.mock('node:fs/promises', async (importOriginal) => ({ ...(await importOriginal<typeof import('node:fs/promises')>()) }));

import * as nodeFs from 'node:fs';
import * as nodeFsPromises from 'node:fs/promises';
import { PathValidationError } from '../../src';
import { secureMkdir, secureMkdirSync } from '../../src/internal/secureMkdir';
import { fsAsyncDiffWriter } from '../../src/ports/fsAsyncDiffWriter';
import { fsDiffWriter } from '../../src/ports/fsDiffWriter';
import type { ValidatedPath } from '../../src/types/validated-path';

const asValidated = (value: string) => value as ValidatedPath;
const enoent = () => Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });

describe('diff writers under injected races', () => {
    const rootDir = path.resolve('./test-results/diff-writer-races');
    const baseDir = path.join(rootDir, 'allowed');
    const outsideDir = path.join(rootDir, 'outside');
    const subDir = path.join(baseDir, 'sub');
    const data = Buffer.from('diff bytes');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(subDir, { recursive: true });
        mkdirSync(outsideDir, { recursive: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        rmSync(rootDir, { recursive: true, force: true });
    });

    describe('a parent directory swapped for a symlink at open time (SECU-09)', () => {
        // Between the pre-open realpath and the open, a real directory in the canonical
        // chain is renamed away and replaced by a symlink to outside. O_NOFOLLOW guards
        // only the final component, so the open lands outside; only re-resolving the
        // chain after the open can notice. Stat'ing the pre-open path would walk the same
        // swapped route and agree with itself.
        const target = path.join(subDir, 'diff.png');
        const escaped = path.join(outsideDir, 'diff.png');

        function swapSubDirForOutsideLink(): void {
            renameSync(subDir, `${subDir}-moved`);
            symlinkSync(outsideDir, subDir);
        }

        function swapOnNextOpenSync(): void {
            const realOpenSync = nodeFs.openSync;
            vi.spyOn(nodeFs, 'openSync').mockImplementationOnce((...args: Parameters<typeof nodeFs.openSync>) => {
                swapSubDirForOutsideLink();
                return realOpenSync(...args);
            });
        }

        function swapOnNextOpen(): void {
            const realOpen = nodeFsPromises.open;
            vi.spyOn(nodeFsPromises, 'open').mockImplementationOnce(async (...args: Parameters<typeof nodeFsPromises.open>) => {
                swapSubDirForOutsideLink();
                return realOpen(...args);
            });
        }

        test('refuses and removes the file it created outside', () => {
            swapOnNextOpenSync();
            expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
            expect(existsSync(escaped)).toBe(false);
        });

        test('refuses and leaves an existing outside file untouched', () => {
            writeFileSync(escaped, 'outside content');
            swapOnNextOpenSync();
            expect(() => fsDiffWriter.write(asValidated(target), data, baseDir)).toThrow(PathValidationError);
            expect(readFileSync(escaped, 'utf8')).toBe('outside content');
        });

        test('refuses asynchronously and removes the file it created outside', async () => {
            swapOnNextOpen();
            await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
            expect(existsSync(escaped)).toBe(false);
        });

        test('refuses asynchronously and leaves an existing outside file untouched', async () => {
            writeFileSync(escaped, 'outside content');
            swapOnNextOpen();
            await expect(fsAsyncDiffWriter.write(asValidated(target), data, baseDir)).rejects.toThrow(PathValidationError);
            expect(readFileSync(escaped, 'utf8')).toBe('outside content');
        });
    });

    describe('a directory created by another writer between the lstat and the mkdir', () => {
        // Recursive mkdir tolerated this race; the per-component walk must too, while still
        // refusing a symlink if that is what the other side created.
        const winner = path.join(baseDir, 'run');
        const deeper = path.join(winner, 'deeper');

        test('continues into the directory the other writer created', () => {
            mkdirSync(winner);
            vi.spyOn(nodeFs, 'lstatSync').mockImplementationOnce(() => {
                throw enoent();
            });
            secureMkdirSync(deeper, baseDir);
            expect(existsSync(deeper)).toBe(true);
        });

        test('continues into the directory the other writer created asynchronously', async () => {
            mkdirSync(winner);
            vi.spyOn(nodeFsPromises, 'lstat').mockRejectedValueOnce(enoent());
            await secureMkdir(deeper, baseDir);
            expect(existsSync(deeper)).toBe(true);
        });

        test('still refuses a symlink the other side created', () => {
            symlinkSync(outsideDir, winner);
            vi.spyOn(nodeFs, 'lstatSync').mockImplementationOnce(() => {
                throw enoent();
            });
            expect(() => secureMkdirSync(deeper, baseDir)).toThrow(/is a symlink/);
            expect(existsSync(path.join(outsideDir, 'deeper'))).toBe(false);
        });

        test('still refuses a symlink the other side created asynchronously', async () => {
            symlinkSync(outsideDir, winner);
            vi.spyOn(nodeFsPromises, 'lstat').mockRejectedValueOnce(enoent());
            await expect(secureMkdir(deeper, baseDir)).rejects.toThrow(/is a symlink/);
            expect(existsSync(path.join(outsideDir, 'deeper'))).toBe(false);
        });

        test('concurrent async writes into one new directory all succeed', async () => {
            const targets = Array.from({ length: 8 }, (_, index) => path.join(baseDir, 'run', 'nested', `case-${index}.png`));
            await Promise.all(targets.map((target) => fsAsyncDiffWriter.write(asValidated(target), data, baseDir)));
            for (const target of targets) {
                expect(readFileSync(target)).toEqual(data);
            }
        });
    });
});
