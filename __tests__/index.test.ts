import { expect, test } from 'vitest';
import * as Index from '../src/index';

test('index.ts should export modules', () => {
    expect(Index).toBeDefined();
    expect(Index.comparePng).toBeDefined();
});
