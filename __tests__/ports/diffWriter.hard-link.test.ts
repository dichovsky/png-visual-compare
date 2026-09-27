import { linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PathValidationError } from '../../src';
import { fsAsyncDiffWriter } from '../../src/ports/fsAsyncDiffWriter';
import { fsDiffWriter } from '../../src/ports/fsDiffWriter';
import type { ValidatedPath } from '../../src/types/validated-path';

const asValidated = (value: string) => value as ValidatedPath;

// The sync writer is wrapped in an async function so one table drives both: a
// synchronous throw inside it surfaces as a rejection, like the async writer's.
const writers = [
    {
        name: 'fsDiffWriter',
        write: async (target: string, data: Buffer, baseDir?: string) => fsDiffWriter.write(asValidated(target), data, baseDir),
    },
    {
        name: 'fsAsyncDiffWriter',
        write: (target: string, data: Buffer, baseDir?: string) => fsAsyncDiffWriter.write(asValidated(target), data, baseDir),
    },
];

describe.each(writers)('$name on a hard-linked target (SECU-13)', ({ name, write }) => {
    // A hard link is the same inode under a second name, so the identity check that
    // proves the handle sits inside diffOutputBaseDir passes for it. Only the link
    // count tells it apart from a file that lives inside the boundary alone.
    const rootDir = path.resolve(`./test-results/diff-writer-hard-link-${name}`);
    const baseDir = path.join(rootDir, 'allowed');
    const outside = path.join(rootDir, 'outside.txt');
    const target = path.join(baseDir, 'diff.png');
    const data = Buffer.from('diff bytes');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('refuses to overwrite a file hard-linked from outside diffOutputBaseDir and leaves it intact', async () => {
        writeFileSync(outside, 'outside payload', { mode: 0o644 });
        linkSync(outside, target);

        await expect(write(target, data, baseDir)).rejects.toThrow(PathValidationError);
        await expect(write(target, data, baseDir)).rejects.toThrow(/hard link/);

        expect(readFileSync(outside, 'utf8')).toBe('outside payload');
        expect(statSync(outside).mode & 0o777).toBe(0o644);
    });

    test('creates a new file inside diffOutputBaseDir', async () => {
        await write(target, data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('overwrites an existing single-link file inside diffOutputBaseDir', async () => {
        writeFileSync(target, 'stale bytes that are longer than the diff');
        await write(target, data, baseDir);
        expect(readFileSync(target)).toEqual(data);
    });

    test('still overwrites a hard-linked target without diffOutputBaseDir, as before', async () => {
        // No boundary, nothing to escape: the 7.1.0 behaviour is kept.
        writeFileSync(outside, 'outside payload');
        linkSync(outside, target);

        await write(target, data);

        expect(readFileSync(outside)).toEqual(data);
    });
});
