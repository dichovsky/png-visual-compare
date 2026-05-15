import { closeSync, constants as fsConstants, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { parse } from 'node:path';
import { PathValidationError } from '../errors';
import type { DiffWriterPort } from './types';

const SYMLINK_REFUSING_WRITE_FLAGS = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | fsConstants.O_NOFOLLOW;

export const fsDiffWriter: DiffWriterPort = {
    write(path, data) {
        mkdirSync(parse(path).dir, { recursive: true });
        let fd: number;
        try {
            fd = openSync(path, SYMLINK_REFUSING_WRITE_FLAGS);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
                throw new PathValidationError('Diff write refused: target path is a symlink (TOCTOU defence)');
            }
            throw error;
        }
        try {
            writeFileSync(fd, data);
        } finally {
            closeSync(fd);
        }
    },
};
