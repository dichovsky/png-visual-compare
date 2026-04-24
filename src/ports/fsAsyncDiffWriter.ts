import { mkdir, writeFile } from 'node:fs/promises';
import { parse } from 'node:path';
import type { AsyncDiffWriterPort } from './asyncTypes';

export const fsAsyncDiffWriter: AsyncDiffWriterPort = {
    async write(path, data) {
        await mkdir(parse(path).dir, { recursive: true });
        await writeFile(path, data);
    },
};
