import { readFileSync } from 'node:fs';
import { test } from '@playwright/test';
import { expect } from '../../../src/playwright';

test('compares the received PNG against the "shot" baseline', () => {
    const received = readFileSync(process.env.PVC_RECEIVED ?? '');
    const hint = process.env.PVC_UNNAMED === 'true' ? undefined : 'shot';

    if (process.env.PVC_NOT === 'true') {
        expect(received).not.toMatchPngSnapshot(hint);
    } else {
        expect(received).toMatchPngSnapshot(hint);
    }
});
