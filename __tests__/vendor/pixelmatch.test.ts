import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import upstream from 'pixelmatch';
import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { pixelmatch, type PixelmatchKernelOptions } from '../../src/vendor/pixelmatch';

// Parity oracle for the vendored port (RELI-11): every case runs through both the port and
// the upstream package, and both the mismatch count and every byte of the diff must agree.
// When the upstream devDependency is bumped, a failure here means the port needs re-syncing.

type Image = { data: Uint8Array; width: number; height: number };

/** mulberry32 — seeded so a failing case reproduces exactly. */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function crop(png: PNG, x0: number, y0: number, width: number, height: number): Image {
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        const from = ((y0 + y) * png.width + x0) * 4;
        data.set(png.data.subarray(from, from + width * 4), y * width * 4);
    }
    return { data, width, height };
}

/** Changes ~10% of pixels, including alpha, so both opaque and blended branches run. */
function perturb(image: Image, seed: number): Image {
    const random = seededRandom(seed);
    const data = image.data.slice();
    for (let pos = 0; pos < data.length; pos += 4) {
        if (random() < 0.1) {
            data[pos] = random() * 256;
            data[pos + 1] = random() * 256;
            data[pos + 2] = random() * 256;
            data[pos + 3] = random() < 0.5 ? 255 : random() * 256;
        }
    }
    return { ...image, data };
}

/** A soft diagonal edge over a gradient with a translucent band: real anti-aliasing work. */
function synthetic(width: number, height: number, offset: number): Image {
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pos = (y * width + x) * 4;
            const edge = Math.max(0, Math.min(1, x - y + offset + 0.5));
            const shade = Math.round(40 + edge * 180);
            data[pos] = shade;
            data[pos + 1] = (x * 7) % 256;
            data[pos + 2] = (y * 5) % 256;
            data[pos + 3] = y > height / 2 && y < (height * 3) / 4 ? 128 : 255;
        }
    }
    return { data, width, height };
}

const fixtureDirs = [path.resolve('./test-data/actual'), path.resolve('./test-data/expected')];
const fixtures = fixtureDirs.flatMap((dir) =>
    readdirSync(dir)
        .filter((name) => name.endsWith('.png'))
        .map((name) => ({ name: `${path.basename(dir)}/${name}`, png: PNG.sync.read(readFileSync(path.join(dir, name))) })),
);

const CROP = 64;
const pairs: { name: string; first: Image; second: Image }[] = fixtures.flatMap(({ name, png }, index) => {
    const size = Math.min(CROP, png.width - 1, png.height);
    const x0 = Math.max(0, Math.floor(png.width / 2 - size / 2) - 1);
    const y0 = Math.max(0, Math.floor(png.height / 2 - size / 2));
    const base = crop(png, x0, y0, size, size);
    const shifted = crop(png, x0 + 1, y0, size, size);
    return [
        { name: `${name} vs itself`, first: base, second: base },
        { name: `${name} vs 1px shift`, first: base, second: shifted },
        { name: `${name} 1px shift vs original`, first: shifted, second: base },
        { name: `${name} vs perturbed`, first: base, second: perturb(base, index + 1) },
    ];
});
pairs.push(
    { name: 'synthetic edge vs shifted edge', first: synthetic(40, 32, 0), second: synthetic(40, 32, 1) },
    { name: 'synthetic edge vs perturbed', first: synthetic(40, 32, 0), second: perturb(synthetic(40, 32, 0), 99) },
    { name: '1x1 images that differ', first: synthetic(1, 1, 0), second: perturb(synthetic(1, 1, 5), 7) },
);

const optionSets: { name: string; options: PixelmatchKernelOptions | undefined }[] = [
    { name: 'no options', options: undefined },
    { name: 'empty options', options: {} },
    { name: 'threshold 0', options: { threshold: 0 } },
    { name: 'threshold 0.5', options: { threshold: 0.5 } },
    { name: 'threshold 1', options: { threshold: 1 } },
    { name: 'includeAA', options: { includeAA: true } },
    { name: 'alpha 0', options: { alpha: 0 } },
    { name: 'alpha 1', options: { alpha: 1 } },
    { name: 'custom colours', options: { aaColor: [1, 2, 3], diffColor: [9, 9, 9], diffColorAlt: [0, 255, 255] } },
    { name: 'diffMask', options: { diffMask: true } },
    { name: 'checkerboard off', options: { checkerboard: false } },
    {
        name: 'everything',
        options: { threshold: 0.05, includeAA: true, alpha: 0.5, diffMask: true, checkerboard: false, diffColorAlt: [0, 0, 255] },
    },
];

describe('vendored pixelmatch matches upstream', () => {
    test('covers the anti-aliasing and blending paths', () => {
        // Guards the oracle itself: parity over inputs that never reach these paths proves little.
        const withAA = pairs.filter(
            (pair) =>
                upstream(pair.first.data, pair.second.data, undefined, pair.first.width, pair.first.height, { includeAA: true }) >
                upstream(pair.first.data, pair.second.data, undefined, pair.first.width, pair.first.height),
        );
        expect(withAA.length).toBeGreaterThan(0);
    });

    for (const pair of pairs) {
        test(pair.name, () => {
            const { width, height } = pair.first;
            for (const { name, options } of optionSets) {
                const expectedCount = upstream(pair.first.data, pair.second.data, undefined, width, height, options);
                expect(pixelmatch(pair.first.data, pair.second.data, undefined, width, height, options), `${name}, no output`).toBe(
                    expectedCount,
                );

                for (const Output of [Uint8Array, Uint8ClampedArray]) {
                    const expectedOutput = new Output(width * height * 4);
                    const actualOutput = new Output(width * height * 4);
                    const expectedWithOutput = upstream(pair.first.data, pair.second.data, expectedOutput, width, height, options);
                    const actualWithOutput = pixelmatch(pair.first.data, pair.second.data, actualOutput, width, height, options);
                    expect(actualWithOutput, `${name}, ${Output.name} output count`).toBe(expectedWithOutput);
                    expect(Buffer.from(actualOutput).equals(Buffer.from(expectedOutput)), `${name}, ${Output.name} output bytes`).toBe(
                        true,
                    );
                }
            }
        });
    }

    test('accepts Buffer and Uint8ClampedArray inputs', () => {
        const first = synthetic(8, 8, 0);
        const second = synthetic(8, 8, 2);
        const clamped = [new Uint8ClampedArray(first.data), new Uint8ClampedArray(second.data)] as const;
        const buffers = [Buffer.from(first.data), Buffer.from(second.data)] as const;
        expect(pixelmatch(...clamped, undefined, 8, 8)).toBe(upstream(...clamped, undefined, 8, 8));
        expect(pixelmatch(...buffers, undefined, 8, 8)).toBe(upstream(...buffers, undefined, 8, 8));
    });
});

describe('vendored pixelmatch rejects invalid input like upstream', () => {
    const valid = new Uint8Array(16);
    const invalidCases: { name: string; args: Parameters<typeof pixelmatch> }[] = [
        { name: 'img1 is not pixel data', args: [[0, 0, 0, 0] as unknown as Uint8Array, valid, undefined, 2, 2] },
        { name: 'img2 is a wider typed array', args: [valid, new Uint16Array(16) as unknown as Uint8Array, undefined, 2, 2] },
        { name: 'output is a DataView', args: [valid, valid, new DataView(new ArrayBuffer(16)) as unknown as Uint8Array, 2, 2] },
        { name: 'image sizes differ', args: [valid, new Uint8Array(12), undefined, 2, 2] },
        { name: 'output size differs', args: [valid, valid, new Uint8Array(12), 2, 2] },
        { name: 'data does not match width/height', args: [valid, valid, undefined, 3, 2] },
    ];

    for (const { name, args } of invalidCases) {
        test(name, () => {
            let upstreamMessage = '';
            try {
                upstream(...args);
            } catch (error) {
                upstreamMessage = (error as Error).message;
            }
            expect(upstreamMessage).not.toBe('');
            expect(() => pixelmatch(...args)).toThrow(upstreamMessage);
        });
    }
});

describe('vendored pixelmatch colour-delta arithmetic is bit-identical to upstream', () => {
    // Count and byte parity only flip when some pixel's delta sits near the threshold, so a
    // slightly mistranscribed coefficient could hide. Bisect upstream's exact flip threshold
    // for one differing pixel, then require the port to flip between the same adjacent doubles.
    const probes: { name: string; first: number[]; second: number[] }[] = [
        { name: 'opaque, second darker', first: [200, 120, 40, 255], second: [180, 110, 60, 255] },
        { name: 'opaque, second lighter', first: [30, 60, 90, 255], second: [35, 70, 80, 255] },
        { name: 'translucent vs opaque', first: [10, 200, 30, 90], second: [10, 200, 30, 255] },
        { name: 'both translucent', first: [250, 5, 128, 30], second: [240, 20, 100, 200] },
    ];
    const WIDTH = 7;

    for (const probe of probes) {
        for (const position of [0, 5]) {
            for (const checkerboard of [true, false]) {
                test(`${probe.name}, pixel ${position}, checkerboard ${checkerboard}`, () => {
                    const first = new Uint8Array(WIDTH * 4).fill(128);
                    const second = first.slice();
                    first.set(probe.first, position * 4);
                    second.set(probe.second, position * 4);
                    const count = (match: typeof pixelmatch, threshold: number) =>
                        match(first, second, undefined, WIDTH, 1, { threshold, includeAA: true, checkerboard });

                    let below = 0;
                    let above = 1;
                    expect(count(upstream, below)).toBe(1);
                    expect(count(upstream, above)).toBe(0);
                    for (let step = 0; step < 64; step++) {
                        const mid = (below + above) / 2;
                        if (count(upstream, mid) === 1) below = mid;
                        else above = mid;
                    }
                    expect(count(pixelmatch, below)).toBe(1);
                    expect(count(pixelmatch, above)).toBe(0);
                });
            }
        }
    }
});
