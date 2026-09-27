// Included by the repository typecheck; this fixture is never executed by Playwright.
import { expect } from '../../../src/playwright';

const png = Buffer.alloc(0);
expect(png).toMatchPngSnapshot();
expect(png).toMatchPngSnapshot({ maxPixels: 100 });
expect(png).toMatchPngSnapshot('named', { maxPixels: 100 });
expect(png).toMatchPngSnapshot(undefined, { maxPixels: 100 });
// @ts-expect-error Options go first, or second after a name; the matcher rejects them in both places.
expect(png).toMatchPngSnapshot({ maxPixels: 100 }, { maxPixels: 100 });
