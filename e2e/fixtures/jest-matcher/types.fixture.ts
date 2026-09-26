// Included by the repository typecheck; this fixture is never executed by Playwright.
import { expect } from '@jest/globals';
import { registerJestPngSnapshotMatcher } from '../../../src/jest';

registerJestPngSnapshotMatcher(expect);

const png = Buffer.alloc(0);
expect(png).toMatchPngSnapshot();
expect(png).toMatchPngSnapshot({ maxPixels: 100 });
expect(png).toMatchPngSnapshot('named', { maxPixels: 100 });
expect(png).not.toMatchPngSnapshot('named');
const asynchronousAssertion: Promise<void> = expect(Promise.resolve(png)).resolves.toMatchPngSnapshot('named');
void asynchronousAssertion;
