import { mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'node:path';
import type { DiffWriterPort } from './types';

export const fsDiffWriter: DiffWriterPort = {
    write(path, data) {
        mkdirSync(parse(path).dir, { recursive: true });
        writeFileSync(path, data);
    },
};
