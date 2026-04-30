import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createPngSnapshotMatcher } from '../src/matchers/createPngSnapshotMatcher';
import {
    compareAgainstSerializedPngSnapshot,
    normalizePngSnapshotMatcherArgs,
    parseSerializedPngSnapshot,
    serializePngSnapshot,
    type PngSnapshotMatcherArgs,
} from '../src/matchers/pngSnapshot';

const PNG_FILE = resolve('./test-data/actual/pnggrad16rgb.png');
const VITEST_PNG_SNAPSHOT_MATCHER_KEY = Symbol.for('png-visual-compare/vitest/toMatchPngSnapshot');
const JEST_PNG_SNAPSHOT_MATCHER_KEY = Symbol.for('png-visual-compare/jest/toMatchPngSnapshot');

type ExtendSpy = ReturnType<typeof vi.fn>;
type JestPluginModule = {
    registerJestPngSnapshotMatcher: (expect: { extend: ExtendSpy }) => void;
};
type RegisteredMatchers = {
    toMatchPngSnapshot: ReturnType<typeof createPngSnapshotMatcher>;
};

function createJestSnapshotState(snapshotData: Record<string, string>, updateSnapshot: 'all' | 'new' | 'none' = 'none') {
    return {
        _counters: new Map<string, number>(),
        _dirty: false,
        _snapshotData: snapshotData,
        _snapshotPath: resolve('./__tests__/__snapshots__/placeholder.snap'),
        _uncheckedKeys: new Set<string>(Object.keys(snapshotData)),
        _updateSnapshot: updateSnapshot,
        added: 0,
        matched: 0,
        unmatched: 0,
        updated: 0,
    };
}

function createSolidPng(r: number, g: number, b: number): Buffer {
    const png = new PNG({ width: 1, height: 1 });
    png.data[0] = r;
    png.data[1] = g;
    png.data[2] = b;
    png.data[3] = 255;
    return PNG.sync.write(png);
}

function clearMatcherRegistration(): void {
    delete (globalThis as Record<PropertyKey, unknown>)[VITEST_PNG_SNAPSHOT_MATCHER_KEY];
    delete (globalThis as Record<PropertyKey, unknown>)[JEST_PNG_SNAPSHOT_MATCHER_KEY];
}

function expectSyncResult(result: ReturnType<ReturnType<typeof createPngSnapshotMatcher>>) {
    if (result instanceof Promise) {
        throw new Error('Expected matcher to return synchronously');
    }

    return result;
}

describe('createPngSnapshotMatcher', () => {
    test('passes a PNG Uint8Array to the snapshot delegate as a Buffer', () => {
        const snapshotDelegate = vi.fn<(...args: [unknown, Buffer, PngSnapshotMatcherArgs]) => { pass: true; message: () => string }>(
            () => ({
                pass: true,
                message: () => '',
            }),
        );
        const matcher = createPngSnapshotMatcher(snapshotDelegate);
        const pngBytes = Uint8Array.from(readFileSync(PNG_FILE));

        const result = expectSyncResult(matcher.call({}, pngBytes, 'diff image'));

        expect(result).toEqual({ pass: true, message: expect.any(Function) });
        expect(snapshotDelegate).toHaveBeenCalledTimes(1);
        const delegateCall = snapshotDelegate.mock.calls[0];

        if (delegateCall === undefined) {
            throw new Error('Expected the snapshot delegate to be called');
        }

        const [, actualBuffer, actualArgs] = delegateCall;

        expect(actualBuffer).toBeInstanceOf(Buffer);
        expect(actualBuffer).toEqual(readFileSync(PNG_FILE));
        expect(actualArgs).toEqual({ hint: 'diff image', options: undefined });
    });

    test('passes ComparePngOptions to the snapshot delegate', () => {
        const snapshotDelegate = vi.fn<(...args: [unknown, Buffer, PngSnapshotMatcherArgs]) => { pass: true; message: () => string }>(
            () => ({
                pass: true,
                message: () => '',
            }),
        );
        const matcher = createPngSnapshotMatcher(snapshotDelegate);
        const options = { excludedAreas: [] };

        expectSyncResult(matcher.call({}, readFileSync(PNG_FILE), options));

        expect(snapshotDelegate).toHaveBeenCalledWith({}, expect.any(Buffer), { hint: undefined, options });
    });

    test('rejects .not because snapshot negation is unsupported', () => {
        const matcher = createPngSnapshotMatcher(() => ({ pass: true, message: () => '' }));

        const result = expectSyncResult(matcher.call({ isNot: true }, readFileSync(PNG_FILE)));

        expect(result.pass).toBe(false);
        expect(result.message()).toContain('.not.toMatchPngSnapshot() is not supported');
    });

    test.each([
        {
            name: 'non-binary input',
            received: 'not a png',
        },
        {
            name: 'null input',
            received: null,
        },
        {
            name: 'non-png binary input',
            received: Buffer.from('not-a-png'),
        },
        {
            name: 'too-short binary input',
            received: Uint8Array.from([0x89]),
        },
    ])('rejects $name', ({ received }) => {
        const matcher = createPngSnapshotMatcher(() => ({ pass: true, message: () => '' }));

        const result = expectSyncResult(matcher.call({}, received));

        expect(result.pass).toBe(false);
        expect(result.message()).toContain('toMatchPngSnapshot() expects a PNG Buffer or Uint8Array');
    });

    test.each([
        {
            name: 'invalid first argument',
            matcherArgs: [123],
            expectedMessage: 'expects either a snapshot hint string or a ComparePngOptions object',
        },
        {
            name: 'invalid second argument',
            matcherArgs: ['hint', 123],
            expectedMessage: 'second argument to toMatchPngSnapshot() must be a ComparePngOptions object',
        },
        {
            name: 'options as second argument without hint',
            matcherArgs: [undefined, {}],
            expectedMessage: 'accepts ComparePngOptions as the first argument unless a snapshot hint string is provided',
        },
    ])('rejects $name', ({ matcherArgs, expectedMessage }) => {
        const matcher = createPngSnapshotMatcher(() => ({ pass: true, message: () => '' }));

        const result = expectSyncResult(matcher.call({}, readFileSync(PNG_FILE), ...(matcherArgs as [never, never?])));

        expect(result.pass).toBe(false);
        expect(result.message()).toContain(expectedMessage);
    });
});

describe('png snapshot helpers', () => {
    test('normalizes matcher args', () => {
        expect(normalizePngSnapshotMatcherArgs('diff', { excludedAreas: [] })).toEqual({
            args: {
                hint: 'diff',
                options: { excludedAreas: [] },
            },
        });
        expect(normalizePngSnapshotMatcherArgs({ excludedAreas: [] })).toEqual({
            args: {
                options: { excludedAreas: [] },
            },
        });
    });

    test('serializes and parses PNG snapshots', () => {
        const pngBuffer = readFileSync(PNG_FILE);
        const serialized = serializePngSnapshot(pngBuffer);

        expect(parseSerializedPngSnapshot(serialized)).toEqual(pngBuffer);
    });

    test.each([
        {
            name: 'invalid serialized text',
            serialized: 'not a snapshot',
            message: 'Stored PNG snapshot is not a valid serialized Buffer.',
        },
        {
            name: 'non-buffer serialized value',
            serialized: '{"type":"NotBuffer","data":[1,2,3]}',
            message: 'Stored PNG snapshot must be a serialized Buffer.',
        },
        {
            name: 'array payload',
            serialized: '[1,2,3]',
            message: 'Stored PNG snapshot must be a serialized Buffer.',
        },
        {
            name: 'non-png buffer payload',
            serialized: '{"type":"Buffer","data":[1,2,3,4]}',
            message: 'Stored PNG snapshot is not a valid PNG Buffer.',
        },
        {
            name: 'wrong PNG signature payload',
            serialized: '{"type":"Buffer","data":[137,80,78,71,13,10,26,9,0]}',
            message: 'Stored PNG snapshot is not a valid PNG Buffer.',
        },
    ])('rejects $name when parsing a serialized snapshot', ({ serialized, message }) => {
        expect(() => parseSerializedPngSnapshot(serialized)).toThrow(message);
    });

    test('compares serialized PNG snapshots with ComparePngOptions', () => {
        const expected = readFileSync(resolve('./test-data/expected/ILTQq copy.png'));
        const actual = readFileSync(resolve('./test-data/actual/ILTQq copy.png'));
        const serializedExpected = serializePngSnapshot(expected);

        const strictComparison = compareAgainstSerializedPngSnapshot(actual, serializedExpected);
        const thresholdComparison = compareAgainstSerializedPngSnapshot(actual, serializedExpected, {
            pixelmatchOptions: { threshold: 0.97 },
        });

        expect(strictComparison.pass).toBe(false);
        expect(strictComparison.mismatchedPixels).toBe(480);
        expect(thresholdComparison.pass).toBe(true);
        expect(thresholdComparison.mismatchedPixels).toBe(0);
    });
});

describe('vitest matcher entrypoint', () => {
    afterEach(() => {
        clearMatcherRegistration();
        vi.restoreAllMocks();
    });

    test('registers the matcher exactly once', async () => {
        vi.resetModules();
        clearMatcherRegistration();
        const extendSpy = vi.spyOn(expect, 'extend');

        await import('../src/vitest.mjs');

        expect(extendSpy).toHaveBeenCalledTimes(1);
        expect(extendSpy.mock.calls[0][0]).toHaveProperty('toMatchPngSnapshot');
    });

    test('skips registration when the matcher is already installed', async () => {
        vi.resetModules();
        (globalThis as Record<PropertyKey, unknown>)[VITEST_PNG_SNAPSHOT_MATCHER_KEY] = true;
        const extendSpy = vi.spyOn(expect, 'extend');

        await import('../src/vitest.mjs');

        expect(extendSpy).not.toHaveBeenCalled();
    });
});

describe('jest matcher entrypoint', () => {
    afterEach(() => {
        clearMatcherRegistration();
        delete (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect;
        vi.restoreAllMocks();
    });

    test('registers the matcher against the global Jest expect', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        const jestPlugin = (await import('../src/jest.js')) as JestPluginModule;

        expect(extend).toHaveBeenCalledTimes(1);
        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        expect(registeredMatchers).toHaveProperty('toMatchPngSnapshot');
        expect(jestPlugin.registerJestPngSnapshotMatcher).toBeTypeOf('function');

        const snapshotState = createJestSnapshotState({
            'compares PNG diffs: dark mode 1': serializePngSnapshot(readFileSync(PNG_FILE)),
        });

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'compares PNG diffs',
                    snapshotState,
                } as never,
                readFileSync(PNG_FILE),
                'dark mode',
            ),
        );

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(snapshotState.matched).toBe(1);
    });

    test('skips duplicate registration when the matcher is already installed', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };
        (globalThis as Record<PropertyKey, unknown>)[JEST_PNG_SNAPSHOT_MATCHER_KEY] = true;

        await import('../src/jest.js');

        expect(extend).not.toHaveBeenCalled();
    });

    test('exports an explicit registration helper when Jest does not inject globals', async () => {
        vi.resetModules();
        delete (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect;

        const jestPlugin = (await import('../src/jest.js')) as JestPluginModule;
        const extend = vi.fn();

        jestPlugin.registerJestPngSnapshotMatcher({ extend });

        expect(extend).toHaveBeenCalledTimes(1);
        expect(extend.mock.calls[0][0]).toHaveProperty('toMatchPngSnapshot');
    });

    test('returns a helpful failure result when the stored Jest snapshot does not match', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'compares PNG diffs',
                    snapshotState: createJestSnapshotState({
                        'compares PNG diffs: light theme 1': serializePngSnapshot(
                            readFileSync(resolve('./test-data/expected/ILTQq copy.png')),
                        ),
                    }),
                } as never,
                readFileSync(resolve('./test-data/actual/ILTQq copy.png')),
                'light theme',
            ),
        );

        expect(result.pass).toBe(false);
        expect(result.message()).toContain(
            'Received PNG snapshot does not match the stored snapshot for "compares PNG diffs: light theme"',
        );
        expect(result.message()).toContain('480 mismatched pixels');
    });

    test('returns a generic failure result when no Jest test name is available', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    snapshotState: createJestSnapshotState({
                        ' 1': serializePngSnapshot(readFileSync(resolve('./test-data/expected/ILTQq copy.png'))),
                    }),
                } as never,
                readFileSync(resolve('./test-data/actual/ILTQq copy.png')),
            ),
        );

        expect(result.pass).toBe(false);
        expect(result.message()).toBe('Received PNG snapshot does not match the stored snapshot (480 mismatched pixels).');
    });

    test('uses the singular mismatch label when exactly one pixel differs', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'single pixel mismatch',
                    snapshotState: createJestSnapshotState({
                        'single pixel mismatch 1': serializePngSnapshot(createSolidPng(255, 255, 255)),
                    }),
                } as never,
                createSolidPng(0, 0, 0),
            ),
        );

        expect(result.pass).toBe(false);
        expect(result.message()).toContain('1 mismatched pixel');
    });

    test('passes ComparePngOptions through Jest snapshot comparison', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'compares PNG diffs',
                    snapshotState: createJestSnapshotState({
                        'compares PNG diffs 1': serializePngSnapshot(readFileSync(resolve('./test-data/expected/ILTQq copy.png'))),
                    }),
                } as never,
                readFileSync(resolve('./test-data/actual/ILTQq copy.png')),
                {
                    pixelmatchOptions: { threshold: 0.97 },
                },
            ),
        );

        expect(result.pass).toBe(true);
    });

    test('creates a new Jest PNG snapshot when updates are enabled', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const snapshotState = createJestSnapshotState({}, 'new');
        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                { currentTestName: 'creates snapshot', snapshotState } as never,
                readFileSync(PNG_FILE),
            ),
        );

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(snapshotState.added).toBe(1);
        expect(snapshotState._dirty).toBe(true);
        expect(snapshotState._snapshotData).toHaveProperty('creates snapshot 1');
    });

    test('updates an existing Jest PNG snapshot when snapshot updates are enabled', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const snapshotState = createJestSnapshotState(
            {
                'updates snapshot 1': serializePngSnapshot(readFileSync(resolve('./test-data/expected/ILTQq copy.png'))),
            },
            'all',
        );
        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                { currentTestName: 'updates snapshot', snapshotState } as never,
                readFileSync(resolve('./test-data/actual/ILTQq copy.png')),
            ),
        );

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(snapshotState.updated).toBe(1);
        expect(snapshotState._dirty).toBe(true);
        expect(snapshotState._snapshotData['updates snapshot 1']).toContain('"type": "Buffer"');
    });

    test('returns a helpful failure result when a new Jest PNG snapshot cannot be written', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'creates snapshot',
                    snapshotState: createJestSnapshotState({}),
                } as never,
                readFileSync(PNG_FILE),
            ),
        );

        expect(result.pass).toBe(false);
        expect(result.message()).toContain('New PNG snapshot was not written for "creates snapshot"');
    });

    test('returns a generic missing-snapshot message when no Jest test name is available', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    snapshotState: createJestSnapshotState({}),
                } as never,
                readFileSync(PNG_FILE),
            ),
        );

        expect(result.pass).toBe(false);
        expect(result.message()).toBe('New PNG snapshot was not written. Run Jest with -u to create it.');
    });

    test('does not create a new Jest PNG snapshot when a snapshot file already exists', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'existing snapshot file',
                    snapshotState: {
                        _counters: new Map<string, number>(),
                        _dirty: false,
                        _snapshotData: {},
                        _snapshotPath: PNG_FILE,
                        _uncheckedKeys: new Set<string>(),
                        _updateSnapshot: 'new',
                    },
                } as never,
                readFileSync(PNG_FILE),
            ),
        );

        expect(result.pass).toBe(false);
        expect(result.message()).toContain('New PNG snapshot was not written for "existing snapshot file"');
    });

    test('initializes Jest snapshot counters when they are missing', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const snapshotState = {
            _counters: new Map<string, number>(),
            _dirty: false,
            _snapshotData: {},
            _snapshotPath: resolve('./__tests__/__snapshots__/placeholder.snap'),
            _uncheckedKeys: new Set<string>(),
            _updateSnapshot: 'new',
        };

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'missing counter field',
                    snapshotState,
                } as never,
                readFileSync(PNG_FILE),
            ),
        );

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(snapshotState).toHaveProperty('added', 1);
    });

    test('creates a Jest PNG snapshot when no snapshot path is exposed yet', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        const snapshotState = {
            _counters: new Map<string, number>(),
            _dirty: false,
            _snapshotData: {},
            _uncheckedKeys: new Set<string>(),
            _updateSnapshot: 'new',
            added: 0,
        };

        const result = expectSyncResult(
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'missing snapshot path',
                    snapshotState,
                } as never,
                readFileSync(PNG_FILE),
            ),
        );

        expect(result.pass).toBe(true);
        expect(result.message()).toBe('');
        expect(snapshotState.added).toBe(1);
    });

    test.each([
        {
            name: 'missing snapshot data',
            snapshotState: {
                _counters: new Map<string, number>(),
                _dirty: false,
                _snapshotPath: resolve('./__tests__/__snapshots__/placeholder.snap'),
                _uncheckedKeys: new Set<string>(),
                _updateSnapshot: 'none',
            },
            message: 'Snapshot state does not expose snapshot data.',
        },
        {
            name: 'missing snapshot counters',
            snapshotState: {
                _dirty: false,
                _snapshotData: {},
                _snapshotPath: resolve('./__tests__/__snapshots__/placeholder.snap'),
                _uncheckedKeys: new Set<string>(),
                _updateSnapshot: 'none',
            },
            message: 'Snapshot state does not expose snapshot counters.',
        },
        {
            name: 'missing unchecked snapshot keys',
            snapshotState: {
                _counters: new Map<string, number>(),
                _dirty: false,
                _snapshotData: {},
                _snapshotPath: resolve('./__tests__/__snapshots__/placeholder.snap'),
                _updateSnapshot: 'none',
            },
            message: 'Snapshot state does not expose unchecked snapshot keys.',
        },
        {
            name: 'missing update snapshot mode',
            snapshotState: {
                _counters: new Map<string, number>(),
                _dirty: false,
                _snapshotData: {},
                _snapshotPath: resolve('./__tests__/__snapshots__/placeholder.snap'),
                _uncheckedKeys: new Set<string>(),
            },
            message: 'Snapshot state does not expose updateSnapshot mode.',
        },
    ])('throws when Jest snapshot state has $name', async ({ snapshotState, message }) => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        expect(() =>
            registeredMatchers.toMatchPngSnapshot.call(
                {
                    currentTestName: 'broken snapshot state',
                    snapshotState,
                } as never,
                readFileSync(PNG_FILE),
            ),
        ).toThrow(message);
    });

    test('throws when the Jest matcher runs without snapshot state', async () => {
        vi.resetModules();
        const extend = vi.fn();
        (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect = { extend };

        await import('../src/jest.js');

        const registeredMatchers = extend.mock.calls[0]?.[0] as RegisteredMatchers | undefined;

        if (registeredMatchers === undefined) {
            throw new Error('Expected the Jest matcher to be registered');
        }

        expect(() => registeredMatchers.toMatchPngSnapshot.call({}, readFileSync(PNG_FILE))).toThrow('Snapshot state must be initialized');
    });

    test('does not auto-register when Jest globals are unavailable', async () => {
        vi.resetModules();
        delete (globalThis as typeof globalThis & { expect?: { extend: ExtendSpy } }).expect;

        const jestPlugin = (await import('../src/jest.js')) as JestPluginModule;

        expect(jestPlugin.registerJestPngSnapshotMatcher).toBeTypeOf('function');
    });
});
