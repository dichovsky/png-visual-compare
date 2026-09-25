import { readFileSync } from 'node:fs';
import { test } from '@playwright/test';
import { expect } from '../../../src/playwright';

test('compares the received PNG against the "shot" baseline', () => {
    const received = readFileSync(process.env.PVC_RECEIVED ?? '');

    if (process.env.PVC_NOT === 'true') {
        expect(received).not.toMatchPngSnapshot('shot');
    } else {
        expect(received).toMatchPngSnapshot('shot');
    }
});
