import { execFileSync } from 'node:child_process';
import { closeSync, constants as fsConstants, lstatSync, mkdirSync, openSync, rmSync } from 'node:fs';
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

describe.each(writers)('$name on a FIFO inside diffOutputBaseDir (SECU-14)', ({ name, write }) => {
    // A blocking write-open of a FIFO waits for a reader that never comes. The short
    // timeouts make a regression show up as a timeout rather than a hung run.
    const rootDir = path.resolve(`./test-results/diff-writer-special-files-${name}`);
    const baseDir = path.join(rootDir, 'allowed');
    const fifo = path.join(baseDir, 'diff.png');
    const data = Buffer.from('diff bytes');

    beforeEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
        mkdirSync(baseDir, { recursive: true });
        execFileSync('mkfifo', [fifo]);
    });

    afterEach(() => {
        rmSync(rootDir, { recursive: true, force: true });
    });

    test('is refused instead of blocking when nothing reads the FIFO', { timeout: 2000 }, async () => {
        await expect(write(fifo, data, baseDir)).rejects.toThrow(PathValidationError);
        await expect(write(fifo, data, baseDir)).rejects.toThrow(/not a regular file/);
        expect(lstatSync(fifo).isFIFO()).toBe(true);
    });

    test('is refused when a reader holds the FIFO open, so the open itself succeeds', { timeout: 2000 }, async () => {
        const reader = openSync(fifo, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK);
        try {
            await expect(write(fifo, data, baseDir)).rejects.toThrow(PathValidationError);
            await expect(write(fifo, data, baseDir)).rejects.toThrow(/not a regular file/);
        } finally {
            closeSync(reader);
        }
    });
});
