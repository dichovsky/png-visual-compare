import { readFileSync } from 'node:fs';
import { test } from '@playwright/test';
import { expect } from '../../../src/playwright';

test('compares the received PNG against the "shot" baseline', async () => {
    const received = readFileSync(process.env.PVC_RECEIVED ?? '');
    // Comma-separated hints, one assertion each; an empty entry makes an unnamed assertion.
    const hints = (process.env.PVC_HINTS ?? 'shot').split(',').map((hint) => hint || undefined);
    const pollFirst = process.env.PVC_POLL_FIRST;

    if (pollFirst !== undefined) {
        // The first poll attempt sees a different image; later attempts see `received`.
        let attempts = 0;
        await expect
            .poll(() => (attempts++ === 0 ? readFileSync(pollFirst) : received), { intervals: [20], timeout: 5000 })
            .toMatchPngSnapshot(hints[0]);
        return;
    }

    for (const hint of hints) {
        if (process.env.PVC_NOT === 'true') {
            expect(received).not.toMatchPngSnapshot(hint);
        } else {
            expect(received).toMatchPngSnapshot(hint);
        }
    }
});
