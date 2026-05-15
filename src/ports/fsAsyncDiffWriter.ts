import { constants as fsConstants } from 'node:fs';
import { mkdir, open } from 'node:fs/promises';
import { parse } from 'node:path';
import { PathValidationError } from '../errors';
import type { AsyncDiffWriterPort } from './asyncTypes';

const SYMLINK_REFUSING_WRITE_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW;

export const fsAsyncDiffWriter: AsyncDiffWriterPort = {
    async write(path, data) {
        await mkdir(parse(path).dir, { recursive: true });
        try {
            const handle = await open(path, SYMLINK_REFUSING_WRITE_FLAGS);
            try {
                await handle.writeFile(data);
            } finally {
                await handle.close();
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
                throw new PathValidationError('Diff write refused: target path is a symlink (TOCTOU defence)');
            }
            throw error;
        }
    },
};
