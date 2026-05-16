# CODEMAP

Machine-readable symbol index for coding agents. Regenerate with `npm run codemap` after any source change; CI verifies freshness via `npm run codemap:check`.

Schema: `codemap.v2`

- `publicApi[]` — transitively-resolved symbols exposed from each entrypoint.
- `files[]` — per-source symbol, import, and re-export listing for navigation.
- `sourceHash` — SHA-256 of source contents + config; staleness signal for `--check`.
```json
{
    "schema": "codemap.v2",
    "repo": {
        "name": "png-visual-compare",
        "version": "6.1.1"
    },
    "sourceHash": "714454209099df64be148639a8651f9eba43a8f4877280ec24403f39b5851b76",
    "entrypoints": [
        "src/index.ts",
        "src/jest.ts",
        "src/vitest.mts"
    ],
    "publicApi": [
        {
            "name": "Area",
            "kind": "type",
            "entrypoint": "src/index.ts",
            "file": "src/types/area.ts",
            "line": 2,
            "signature": "export type Area = { x1: number; y1: number; x2: number; y2: number; };",
            "jsdoc": "Defines a rectangular region of an image by its top-left and bottom-right pixel coordinates (inclusive). All coordinates must be finite integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized.",
            "typeOnly": true
        },
        {
            "name": "Color",
            "kind": "type",
            "entrypoint": "src/index.ts",
            "file": "src/types/color.ts",
            "line": 2,
            "signature": "export type Color = { r: number; g: number; b: number; };",
            "jsdoc": "An RGB colour used to paint pixels on a PNG buffer. All channels are in the range 0–255.",
            "typeOnly": true
        },
        {
            "name": "ComparePngOptions",
            "kind": "type",
            "entrypoint": "src/index.ts",
            "file": "src/types/compare.options.ts",
            "line": 43,
            "signature": "export type ComparePngOptions = { excludedAreas?: Area[]; diffFilePath?: string; throwErrorOnInvalidInputData?: boolean; extendedAreaColor?: Color; excludedAreaColor?: Color; maxDimension?: number; ma…",
            "jsdoc": null,
            "typeOnly": true
        },
        {
            "name": "DEFAULT_EXCLUDED_AREA_COLOR",
            "kind": "const",
            "entrypoint": "src/index.ts",
            "file": "src/defaults.ts",
            "line": 7,
            "signature": "export const DEFAULT_EXCLUDED_AREA_COLOR: Color = { r: 0, g: 0, b: 255 }",
            "jsdoc": "Default colour applied to excluded areas before comparison (blue).",
            "typeOnly": false
        },
        {
            "name": "DEFAULT_EXTENDED_AREA_COLOR",
            "kind": "const",
            "entrypoint": "src/index.ts",
            "file": "src/defaults.ts",
            "line": 4,
            "signature": "export const DEFAULT_EXTENDED_AREA_COLOR: Color = { r: 0, g: 255, b: 0 }",
            "jsdoc": "Default colour applied to size-extended padding regions (green).",
            "typeOnly": false
        },
        {
            "name": "DEFAULT_MAX_DIMENSION",
            "kind": "const",
            "entrypoint": "src/index.ts",
            "file": "src/defaults.ts",
            "line": 14,
            "signature": "export const DEFAULT_MAX_DIMENSION = 16384",
            "jsdoc": "Default maximum image dimension (width or height) in pixels. Images exceeding this in either axis will throw an error to prevent denial-of-service via crafted PNG headers with enormous declared sizes.",
            "typeOnly": false
        },
        {
            "name": "DEFAULT_MAX_PIXELS",
            "kind": "const",
            "entrypoint": "src/index.ts",
            "file": "src/defaults.ts",
            "line": 17,
            "signature": "export const DEFAULT_MAX_PIXELS = 16_777_216",
            "jsdoc": "Default maximum decoded pixel count for a single image or normalized canvas.",
            "typeOnly": false
        },
        {
            "name": "InvalidInputError",
            "kind": "class",
            "entrypoint": "src/index.ts",
            "file": "src/errors.ts",
            "line": 17,
            "signature": "export class InvalidInputError extends Error",
            "jsdoc": "Thrown when a PNG input (file path or Buffer) is invalid, malformed, or cannot be decoded. This error is recoverable via `throwErrorOnInvalidInputData: false`, which treats invalid inputs as zero-size PNGs instead. @example ```ts try { comparePng('invalid.png', 'image.png', { throwErrorOnInvalidInputDat…",
            "typeOnly": false
        },
        {
            "name": "LoadedPng",
            "kind": "type",
            "entrypoint": "src/index.ts",
            "file": "src/types/png.data.ts",
            "line": 3,
            "signature": "export type LoadedPng = | { readonly kind: 'valid'; readonly png: PNGWithMetadata } | { readonly kind: 'invalid'; readonly reason: 'path' | 'decode' | 'type' };",
            "jsdoc": null,
            "typeOnly": true
        },
        {
            "name": "PathValidationError",
            "kind": "class",
            "entrypoint": "src/index.ts",
            "file": "src/errors.ts",
            "line": 53,
            "signature": "export class PathValidationError extends Error",
            "jsdoc": "Thrown when a file path fails validation checks, including: - Path traversal attempts (when `inputBaseDir` or `diffOutputBaseDir` is set) - Symlink loops or invalid symlink usage - Empty, whitespace-only, or null-byte-containing paths @example ```ts try { comparePng( '../../etc/passwd', 'image.png', { inputBaseDir: '/safe/…",
            "typeOnly": false
        },
        {
            "name": "PixelmatchOptions",
            "kind": "type",
            "entrypoint": "src/index.ts",
            "file": "src/types/compare.options.ts",
            "line": 4,
            "signature": "export type PixelmatchOptions = { threshold?: number; includeAA?: boolean; alpha?: number; aaColor?: [number, number, number]; diffColor?: [number, number, number]; diffColorAlt?: [number, number, num…",
            "jsdoc": null,
            "typeOnly": true
        },
        {
            "name": "ResourceLimitError",
            "kind": "class",
            "entrypoint": "src/index.ts",
            "file": "src/errors.ts",
            "line": 86,
            "signature": "export class ResourceLimitError extends Error",
            "jsdoc": "Thrown when a PNG would exceed resource limits set via `maxDimension` or `maxPixels`. This error is **NOT** recoverable and always throws regardless of `throwErrorOnInvalidInputData`, because resource exhaustion is a security concern rather than a routine input validation issue. @example ```ts try { // Reject PNGs larger than 16384 × 16384 comparePng('huge.png', 'ima…",
            "typeOnly": false
        },
        {
            "name": "comparePng",
            "kind": "function",
            "entrypoint": "src/index.ts",
            "file": "src/comparePng.ts",
            "line": 28,
            "signature": "export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number",
            "jsdoc": "Compare two PNG inputs and return the mismatched pixel count.",
            "typeOnly": false
        },
        {
            "name": "comparePngAsync",
            "kind": "function",
            "entrypoint": "src/index.ts",
            "file": "src/comparePngAsync.ts",
            "line": 27,
            "signature": "export async function comparePngAsync(png1: string | Buffer, png2: string | Buffer, opts?: ComparePngOptions): Promise<number>",
            "jsdoc": null,
            "typeOnly": false
        },
        {
            "name": "<sideEffect>",
            "kind": "side-effect",
            "entrypoint": "src/jest.ts",
            "file": "src/jest.ts",
            "line": 1,
            "signature": "Registers a `toMatchPngSnapshot` matcher on Jest's global `expect` when present, and augments the global `jest.Matchers` interface.",
            "jsdoc": null,
            "typeOnly": false
        },
        {
            "name": "registerJestPngSnapshotMatcher",
            "kind": "function",
            "entrypoint": "src/jest.ts",
            "file": "src/jest.ts",
            "line": 187,
            "signature": "export function registerJestPngSnapshotMatcher(expect: ExpectLike): void",
            "jsdoc": null,
            "typeOnly": false
        },
        {
            "name": "<sideEffect>",
            "kind": "side-effect",
            "entrypoint": "src/vitest.mts",
            "file": "src/vitest.mts",
            "line": 1,
            "signature": "Registers a `toMatchPngSnapshot` matcher on Vitest's `expect`.",
            "jsdoc": null,
            "typeOnly": false
        }
    ],
    "files": [
        {
            "path": "src/adapters/toPixelmatchOptions.ts",
            "symbols": [
                {
                    "name": "PixelmatchRawOptions",
                    "kind": "type",
                    "line": 4,
                    "exported": true,
                    "signature": "export type PixelmatchRawOptions = Parameters<typeof pixelmatch>[5];",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toPixelmatchOptions",
                    "kind": "function",
                    "line": 6,
                    "exported": true,
                    "signature": "export function toPixelmatchOptions(opts?: PixelmatchOptions): PixelmatchRawOptions | undefined",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../types",
                "pixelmatch"
            ],
            "reExports": []
        },
        {
            "path": "src/addColoredAreasToImage.ts",
            "symbols": [
                {
                    "name": "addColoredAreasToImage",
                    "kind": "function",
                    "line": 16,
                    "exported": true,
                    "signature": "export function addColoredAreasToImage(image: PNG, areas: Area[], color: Color): void",
                    "members": null,
                    "jsdoc": "Paints rectangular areas on an image with a solid colour in-place."
                }
            ],
            "imports": [
                "./drawPixelOnBuff",
                "./types",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/comparePng.ts",
            "symbols": [
                {
                    "name": "ComparePngInput",
                    "kind": "type",
                    "line": 11,
                    "exported": false,
                    "signature": "type ComparePngInput = string | Buffer;",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "comparePngWithPorts",
                    "kind": "function",
                    "line": 13,
                    "exported": true,
                    "signature": "export function comparePngWithPorts( png1: ComparePngInput, png2: ComparePngInput, opts: ComparePngOptions | undefined, ports?: ComparisonPorts, ): number",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "comparePng",
                    "kind": "function",
                    "line": 28,
                    "exported": true,
                    "signature": "export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number",
                    "members": null,
                    "jsdoc": "Compare two PNG inputs and return the mismatched pixel count."
                }
            ],
            "imports": [
                "./pipeline/loadSources",
                "./pipeline/normalizeImages",
                "./pipeline/persistDiff",
                "./pipeline/resolveOptions",
                "./pipeline/runComparison",
                "./ports/types",
                "./types",
                "node:buffer"
            ],
            "reExports": [
                {
                    "source": "./defaults",
                    "names": [
                        "DEFAULT_EXCLUDED_AREA_COLOR",
                        "DEFAULT_EXTENDED_AREA_COLOR",
                        "DEFAULT_MAX_DIMENSION",
                        "DEFAULT_MAX_PIXELS"
                    ],
                    "typeOnly": false
                }
            ]
        },
        {
            "path": "src/comparePngAsync.ts",
            "symbols": [
                {
                    "name": "loadSourcesAsync",
                    "kind": "function",
                    "line": 13,
                    "exported": false,
                    "signature": "async function loadSourcesAsync( png1: string | Buffer, png2: string | Buffer, opts: ReturnType<typeof resolveOptions>, ): Promise<LoadedSources>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "comparePngAsync",
                    "kind": "function",
                    "line": 27,
                    "exported": true,
                    "signature": "export async function comparePngAsync(png1: string | Buffer, png2: string | Buffer, opts?: ComparePngOptions): Promise<number>",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./errors",
                "./pipeline/normalizeImages",
                "./pipeline/persistDiff",
                "./pipeline/resolveOptions",
                "./pipeline/runComparison",
                "./pipeline/types",
                "./ports/fsAsyncDiffWriter",
                "./ports/fsAsyncImageSource",
                "./types",
                "node:buffer",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/defaults.ts",
            "symbols": [
                {
                    "name": "DEFAULT_EXTENDED_AREA_COLOR",
                    "kind": "const",
                    "line": 4,
                    "exported": true,
                    "signature": "export const DEFAULT_EXTENDED_AREA_COLOR: Color = { r: 0, g: 255, b: 0 }",
                    "members": null,
                    "jsdoc": "Default colour applied to size-extended padding regions (green)."
                },
                {
                    "name": "DEFAULT_EXCLUDED_AREA_COLOR",
                    "kind": "const",
                    "line": 7,
                    "exported": true,
                    "signature": "export const DEFAULT_EXCLUDED_AREA_COLOR: Color = { r: 0, g: 0, b: 255 }",
                    "members": null,
                    "jsdoc": "Default colour applied to excluded areas before comparison (blue)."
                },
                {
                    "name": "DEFAULT_MAX_DIMENSION",
                    "kind": "const",
                    "line": 14,
                    "exported": true,
                    "signature": "export const DEFAULT_MAX_DIMENSION = 16384",
                    "members": null,
                    "jsdoc": "Default maximum image dimension (width or height) in pixels. Images exceeding this in either axis will throw an error to prevent denial-of-service via crafted PNG headers with enormous declared sizes."
                },
                {
                    "name": "DEFAULT_MAX_PIXELS",
                    "kind": "const",
                    "line": 17,
                    "exported": true,
                    "signature": "export const DEFAULT_MAX_PIXELS = 16_777_216",
                    "members": null,
                    "jsdoc": "Default maximum decoded pixel count for a single image or normalized canvas."
                }
            ],
            "imports": [
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/drawPixelOnBuff.ts",
            "symbols": [
                {
                    "name": "drawPixelOnBuff",
                    "kind": "function",
                    "line": 11,
                    "exported": true,
                    "signature": "export function drawPixelOnBuff(buff: Buffer, position: number, color: Color): void",
                    "members": null,
                    "jsdoc": "Writes a single fully-opaque pixel into a raw RGBA buffer."
                }
            ],
            "imports": [
                "./types",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/errors.ts",
            "symbols": [
                {
                    "name": "InvalidInputError",
                    "kind": "class",
                    "line": 17,
                    "exported": true,
                    "signature": "export class InvalidInputError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 18
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 20
                        }
                    ],
                    "jsdoc": "Thrown when a PNG input (file path or Buffer) is invalid, malformed, or cannot be decoded. This error is recoverable via `throwErrorOnInvalidInputData: false`, which treats invalid inputs as zero-size PNGs instead. @example ```ts try { comparePng('invalid.png', 'image.png', { throwErrorOnInvalidInputDat…"
                },
                {
                    "name": "PathValidationError",
                    "kind": "class",
                    "line": 53,
                    "exported": true,
                    "signature": "export class PathValidationError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 54
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 56
                        }
                    ],
                    "jsdoc": "Thrown when a file path fails validation checks, including: - Path traversal attempts (when `inputBaseDir` or `diffOutputBaseDir` is set) - Symlink loops or invalid symlink usage - Empty, whitespace-only, or null-byte-containing paths @example ```ts try { comparePng( '../../etc/passwd', 'image.png', { inputBaseDir: '/safe/…"
                },
                {
                    "name": "ResourceLimitError",
                    "kind": "class",
                    "line": 86,
                    "exported": true,
                    "signature": "export class ResourceLimitError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 87
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 89
                        }
                    ],
                    "jsdoc": "Thrown when a PNG would exceed resource limits set via `maxDimension` or `maxPixels`. This error is **NOT** recoverable and always throws regardless of `throwErrorOnInvalidInputData`, because resource exhaustion is a security concern rather than a routine input validation issue. @example ```ts try { // Reject PNGs larger than 16384 × 16384 comparePng('huge.png', 'ima…"
                }
            ],
            "imports": [],
            "reExports": []
        },
        {
            "path": "src/extendImage.ts",
            "symbols": [
                {
                    "name": "extendImage",
                    "kind": "function",
                    "line": 15,
                    "exported": true,
                    "signature": "export function extendImage(image: PNGWithMetadata, newWidth: number, newHeight: number): PNGWithMetadata",
                    "members": null,
                    "jsdoc": "Returns a new PNG of size `newWidth × newHeight` with the original image bit-blitted into the top-left corner. The remaining area is transparent (zero-filled)."
                }
            ],
            "imports": [
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/fillImageSizeDifference.ts",
            "symbols": [
                {
                    "name": "fillImageSizeDifference",
                    "kind": "function",
                    "line": 17,
                    "exported": true,
                    "signature": "export function fillImageSizeDifference(image: PNG, width: number, height: number, color: Color): void",
                    "members": null,
                    "jsdoc": "Paints the pixels that were added when the canvas was extended (i.e. those that lie outside the original image bounds) with a solid colour in-place."
                }
            ],
            "imports": [
                "./drawPixelOnBuff",
                "./types",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/getPngData.ts",
            "symbols": [
                {
                    "name": "PNG_SIGNATURE",
                    "kind": "const",
                    "line": 9,
                    "exported": false,
                    "signature": "const PNG_SIGNATURE",
                    "members": null,
                    "jsdoc": "PNG file signature (first 8 bytes of every valid PNG)."
                },
                {
                    "name": "IHDR_PEEK_LENGTH",
                    "kind": "const",
                    "line": 15,
                    "exported": false,
                    "signature": "const IHDR_PEEK_LENGTH = 24",
                    "members": null,
                    "jsdoc": "Minimum bytes required to read width/height from the IHDR chunk: 8 (signature) + 4 (chunk length) + 4 (chunk type) + 4 (width) + 4 (height)."
                },
                {
                    "name": "peekPngDimensions",
                    "kind": "function",
                    "line": 22,
                    "exported": false,
                    "signature": "function peekPngDimensions(data: Buffer): { width: number; height: number } | null",
                    "members": null,
                    "jsdoc": "Reads the declared width and height from a PNG's IHDR chunk without fully decoding the image. Returns `null` if the buffer is too short or does not start with the PNG signature."
                },
                {
                    "name": "assertImageLimits",
                    "kind": "function",
                    "line": 34,
                    "exported": false,
                    "signature": "function assertImageLimits(buffer: Buffer, maxDimension: number | undefined, maxPixels: number | undefined): void",
                    "members": null,
                    "jsdoc": "Throws if the IHDR-declared dimensions exceed `maxDimension`. This check happens *before* `PNG.sync.read()` to prevent the decoder from allocating a huge output buffer for crafted PNGs with enormous header values. Always throws regardless of `throwErrorOnInvalidInputData`."
                },
                {
                    "name": "finalizeDecodedPng",
                    "kind": "function",
                    "line": 54,
                    "exported": false,
                    "signature": "function finalizeDecodedPng(decoded: LoadedPng, throwErrorOnInvalidInputData: boolean): LoadedPng",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getPngData",
                    "kind": "function",
                    "line": 65,
                    "exported": true,
                    "signature": "export function getPngData( pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean, maxDimension?: number, maxPixels?: number, inputBaseDir?: string, ): LoadedPng",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./errors",
                "./types/png.data",
                "./types/validated-path",
                "./validatePath",
                "node:fs",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/index.ts",
            "symbols": [],
            "imports": [],
            "reExports": [
                {
                    "source": "./comparePng",
                    "names": [
                        "DEFAULT_EXCLUDED_AREA_COLOR",
                        "DEFAULT_EXTENDED_AREA_COLOR",
                        "DEFAULT_MAX_DIMENSION",
                        "DEFAULT_MAX_PIXELS",
                        "comparePng"
                    ],
                    "typeOnly": false
                },
                {
                    "source": "./comparePngAsync",
                    "names": [
                        "comparePngAsync"
                    ],
                    "typeOnly": false
                },
                {
                    "source": "./errors",
                    "names": [
                        "InvalidInputError",
                        "PathValidationError",
                        "ResourceLimitError"
                    ],
                    "typeOnly": false
                },
                {
                    "source": "./types",
                    "names": "*",
                    "typeOnly": true
                }
            ]
        },
        {
            "path": "src/jest.ts",
            "symbols": [
                {
                    "name": "JEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "kind": "const",
                    "line": 9,
                    "exported": false,
                    "signature": "const JEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ExpectLike",
                    "kind": "type",
                    "line": 11,
                    "exported": false,
                    "signature": "type ExpectLike = { extend: (matchers: Record<string, unknown>) => void; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SnapshotStateLike",
                    "kind": "type",
                    "line": 15,
                    "exported": false,
                    "signature": "type SnapshotStateLike = { added?: number; expand?: boolean; matched?: number; unmatched?: number; updated?: number; markSnapshotsAsCheckedForTest?: (testName: string) => void; [key: string]: unknown;…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "JestMatcherContext",
                    "kind": "type",
                    "line": 25,
                    "exported": false,
                    "signature": "type JestMatcherContext = { currentConcurrentTestName?: () => string | undefined; currentTestName?: string; error?: Error; snapshotState?: SnapshotStateLike | null; testFailing?: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "addOuterLineBreaks",
                    "kind": "function",
                    "line": 33,
                    "exported": false,
                    "signature": "function addOuterLineBreaks(value: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getSnapshotData",
                    "kind": "function",
                    "line": 37,
                    "exported": false,
                    "signature": "function getSnapshotData(snapshotState: SnapshotStateLike): Record<string, string>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getSnapshotCounters",
                    "kind": "function",
                    "line": 47,
                    "exported": false,
                    "signature": "function getSnapshotCounters(snapshotState: SnapshotStateLike): Map<string, number>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getUncheckedKeys",
                    "kind": "function",
                    "line": 57,
                    "exported": false,
                    "signature": "function getUncheckedKeys(snapshotState: SnapshotStateLike): Set<string>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getUpdateSnapshotMode",
                    "kind": "function",
                    "line": 67,
                    "exported": false,
                    "signature": "function getUpdateSnapshotMode(snapshotState: SnapshotStateLike): 'all' | 'new' | 'none'",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getSnapshotPath",
                    "kind": "function",
                    "line": 77,
                    "exported": false,
                    "signature": "function getSnapshotPath(snapshotState: SnapshotStateLike): string | undefined",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "setSnapshotDirty",
                    "kind": "function",
                    "line": 82,
                    "exported": false,
                    "signature": "function setSnapshotDirty(snapshotState: SnapshotStateLike): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "incrementSnapshotCounter",
                    "kind": "function",
                    "line": 86,
                    "exported": false,
                    "signature": "function incrementSnapshotCounter(snapshotState: SnapshotStateLike, field: 'added' | 'matched' | 'unmatched' | 'updated'): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "resolveSnapshotKey",
                    "kind": "function",
                    "line": 91,
                    "exported": false,
                    "signature": "function resolveSnapshotKey(snapshotState: SnapshotStateLike, testName: string): { count: number; key: string }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createJestMismatchMessage",
                    "kind": "function",
                    "line": 101,
                    "exported": false,
                    "signature": "function createJestMismatchMessage(testName: string, mismatchedPixels: number): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createJestMissingSnapshotMessage",
                    "kind": "function",
                    "line": 108,
                    "exported": false,
                    "signature": "function createJestMissingSnapshotMessage(testName: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "persistJestSnapshot",
                    "kind": "function",
                    "line": 114,
                    "exported": false,
                    "signature": "function persistJestSnapshot(snapshotState: SnapshotStateLike, key: string, serializedSnapshot: string): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toMatchPngSnapshot",
                    "kind": "const",
                    "line": 119,
                    "exported": false,
                    "signature": "const toMatchPngSnapshot",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getGlobalExpect",
                    "kind": "function",
                    "line": 183,
                    "exported": false,
                    "signature": "function getGlobalExpect(): ExpectLike | undefined",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "registerJestPngSnapshotMatcher",
                    "kind": "function",
                    "line": 187,
                    "exported": true,
                    "signature": "export function registerJestPngSnapshotMatcher(expect: ExpectLike): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "jestExpect",
                    "kind": "const",
                    "line": 194,
                    "exported": false,
                    "signature": "const jestExpect",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./matchers/createPngSnapshotMatcher",
                "./matchers/pngSnapshot",
                "./types",
                "node:fs"
            ],
            "reExports": []
        },
        {
            "path": "src/matchers/createPngSnapshotMatcher.ts",
            "symbols": [
                {
                    "name": "SnapshotMatcherResult",
                    "kind": "type",
                    "line": 4,
                    "exported": false,
                    "signature": "type SnapshotMatcherResult = { pass: boolean; message: () => string; actual?: unknown; expected?: unknown; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SnapshotMatcherDelegate",
                    "kind": "type",
                    "line": 11,
                    "exported": false,
                    "signature": "type SnapshotMatcherDelegate = ( matcherContext: unknown, received: Buffer, args: PngSnapshotMatcherArgs, ) => SnapshotMatcherResult | Promise<SnapshotMatcherResult>;",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SnapshotMatcherContext",
                    "kind": "type",
                    "line": 17,
                    "exported": false,
                    "signature": "type SnapshotMatcherContext = { isNot?: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PNG_SIGNATURE",
                    "kind": "const",
                    "line": 21,
                    "exported": false,
                    "signature": "const PNG_SIGNATURE",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "describeValue",
                    "kind": "function",
                    "line": 23,
                    "exported": false,
                    "signature": "function describeValue(value: unknown): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "hasPngSignature",
                    "kind": "function",
                    "line": 35,
                    "exported": false,
                    "signature": "function hasPngSignature(value: Uint8Array): boolean",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toBuffer",
                    "kind": "function",
                    "line": 49,
                    "exported": false,
                    "signature": "function toBuffer(value: Uint8Array): Buffer",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createPngSnapshotMatcher",
                    "kind": "function",
                    "line": 53,
                    "exported": true,
                    "signature": "export function createPngSnapshotMatcher(delegate: SnapshotMatcherDelegate)",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../types",
                "./pngSnapshot"
            ],
            "reExports": []
        },
        {
            "path": "src/matchers/pngSnapshot.ts",
            "symbols": [
                {
                    "name": "PNG_SIGNATURE",
                    "kind": "const",
                    "line": 5,
                    "exported": false,
                    "signature": "const PNG_SIGNATURE",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PngSnapshotMatcherArgs",
                    "kind": "type",
                    "line": 7,
                    "exported": true,
                    "signature": "export type PngSnapshotMatcherArgs = { hint?: string; options?: ComparePngOptions; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "NormalizedMatcherArgsResult",
                    "kind": "type",
                    "line": 12,
                    "exported": false,
                    "signature": "type NormalizedMatcherArgsResult = | { args: PngSnapshotMatcherArgs; } | { errorMessage: string; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SerializedPngSnapshot",
                    "kind": "type",
                    "line": 20,
                    "exported": false,
                    "signature": "type SerializedPngSnapshot = { data: number[]; type: 'Buffer'; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparedPngSnapshot",
                    "kind": "type",
                    "line": 25,
                    "exported": true,
                    "signature": "export type ComparedPngSnapshot = { pass: boolean; mismatchedPixels: number; actualSerialized: string; expectedSerialized: string; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "hasPngSignature",
                    "kind": "function",
                    "line": 32,
                    "exported": false,
                    "signature": "function hasPngSignature(value: Uint8Array): boolean",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "isComparePngOptions",
                    "kind": "function",
                    "line": 46,
                    "exported": false,
                    "signature": "function isComparePngOptions(value: unknown): value is ComparePngOptions",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "isSerializedPngSnapshot",
                    "kind": "function",
                    "line": 50,
                    "exported": false,
                    "signature": "function isSerializedPngSnapshot(value: unknown): value is SerializedPngSnapshot",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "normalizePngSnapshotMatcherArgs",
                    "kind": "function",
                    "line": 60,
                    "exported": true,
                    "signature": "export function normalizePngSnapshotMatcherArgs( hintOrOptions?: string | ComparePngOptions, options?: ComparePngOptions, ): NormalizedMatcherArgsResult",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "buildSnapshotTestName",
                    "kind": "function",
                    "line": 98,
                    "exported": true,
                    "signature": "export function buildSnapshotTestName(testName: string | undefined, hint: string | undefined, separator: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "serializePngSnapshot",
                    "kind": "function",
                    "line": 102,
                    "exported": true,
                    "signature": "export function serializePngSnapshot(received: Buffer): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "parseSerializedPngSnapshot",
                    "kind": "function",
                    "line": 106,
                    "exported": true,
                    "signature": "export function parseSerializedPngSnapshot(serializedSnapshot: string): Buffer",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "compareAgainstSerializedPngSnapshot",
                    "kind": "function",
                    "line": 128,
                    "exported": true,
                    "signature": "export function compareAgainstSerializedPngSnapshot( received: Buffer, serializedExpectedSnapshot: string, options?: ComparePngOptions, ): ComparedPngSnapshot",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../comparePng",
                "../types",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/loadSources.ts",
            "symbols": [
                {
                    "name": "loadSources",
                    "kind": "function",
                    "line": 6,
                    "exported": true,
                    "signature": "export function loadSources(png1: string | Buffer, png2: string | Buffer, opts: ResolvedOptions): LoadedSources",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "../ports/fsImageSource",
                "./types",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/normalizeImages.ts",
            "symbols": [
                {
                    "name": "clonePng",
                    "kind": "function",
                    "line": 9,
                    "exported": false,
                    "signature": "function clonePng(image: PNGWithMetadata): PNGWithMetadata",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toComparablePng",
                    "kind": "function",
                    "line": 15,
                    "exported": false,
                    "signature": "function toComparablePng(source: LoadedPng): PNGWithMetadata",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "normalizeImages",
                    "kind": "function",
                    "line": 24,
                    "exported": true,
                    "signature": "export function normalizeImages(sources: LoadedSources, opts: ResolvedOptions): NormalizedImages",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../addColoredAreasToImage",
                "../errors",
                "../extendImage",
                "../fillImageSizeDifference",
                "../types/png.data",
                "./types",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/persistDiff.ts",
            "symbols": [
                {
                    "name": "PersistableDiff",
                    "kind": "type",
                    "line": 6,
                    "exported": true,
                    "signature": "export type PersistableDiff = { readonly diff: PNG; readonly diffFilePath: ValidatedPath; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getPersistableDiff",
                    "kind": "function",
                    "line": 11,
                    "exported": true,
                    "signature": "export function getPersistableDiff(result: ComparisonResult, opts: ResolvedOptions): PersistableDiff | undefined",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "persistDiff",
                    "kind": "function",
                    "line": 22,
                    "exported": true,
                    "signature": "export function persistDiff(result: ComparisonResult, opts: ResolvedOptions): void",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../ports/fsDiffWriter",
                "../types/validated-path",
                "./types",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/resolveOptions.ts",
            "symbols": [
                {
                    "name": "resolveOptions",
                    "kind": "function",
                    "line": 11,
                    "exported": true,
                    "signature": "export function resolveOptions(raw: ComparePngOptions | undefined): ResolvedOptions",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../defaults",
                "../errors",
                "../types",
                "../types/validated-path",
                "../validateArea",
                "../validateColor",
                "../validatePath",
                "../validatePixelmatchOptions",
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/runComparison.ts",
            "symbols": [
                {
                    "name": "runComparison",
                    "kind": "function",
                    "line": 10,
                    "exported": true,
                    "signature": "export function runComparison(images: NormalizedImages, opts: ResolvedOptions): ComparisonResult",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../adapters/toPixelmatchOptions",
                "./types",
                "pixelmatch",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/types.ts",
            "symbols": [
                {
                    "name": "ResolvedOptions",
                    "kind": "type",
                    "line": 8,
                    "exported": true,
                    "signature": "export type ResolvedOptions = { readonly excludedAreas: Area[]; readonly throwErrorOnInvalidInputData: boolean; readonly extendedAreaColor: Color; readonly excludedAreaColor: Color; readonly shouldCre…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "LoadedSources",
                    "kind": "type",
                    "line": 25,
                    "exported": true,
                    "signature": "export type LoadedSources = { readonly png1: string | Buffer; readonly png2: string | Buffer; readonly first: LoadedPng; readonly second: LoadedPng; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "NormalizedImages",
                    "kind": "type",
                    "line": 32,
                    "exported": true,
                    "signature": "export type NormalizedImages = { readonly first: PNGWithMetadata; readonly second: PNGWithMetadata; readonly width: number; readonly height: number; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparisonResult",
                    "kind": "type",
                    "line": 39,
                    "exported": true,
                    "signature": "export type ComparisonResult = { readonly mismatchedPixels: number; readonly diff?: PNG; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparisonContext",
                    "kind": "type",
                    "line": 44,
                    "exported": true,
                    "signature": "export type ComparisonContext = { readonly options: ResolvedOptions; readonly sources: LoadedSources; readonly normalized: NormalizedImages; readonly result: ComparisonResult; };",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../ports/types",
                "../types",
                "../types/png.data",
                "../types/validated-path",
                "node:buffer",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/asyncTypes.ts",
            "symbols": [
                {
                    "name": "AsyncImageSourcePort",
                    "kind": "interface",
                    "line": 6,
                    "exported": true,
                    "signature": "export interface AsyncImageSourcePort { load(source: string | Buffer, opts: ResolvedOptions): Promise<LoadedPng>; }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "AsyncDiffWriterPort",
                    "kind": "interface",
                    "line": 10,
                    "exported": true,
                    "signature": "export interface AsyncDiffWriterPort { write(path: ValidatedPath, data: Buffer): Promise<void>; }",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../pipeline/types",
                "../types/png.data",
                "../types/validated-path",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/fsAsyncDiffWriter.ts",
            "symbols": [
                {
                    "name": "SYMLINK_REFUSING_WRITE_FLAGS",
                    "kind": "const",
                    "line": 7,
                    "exported": false,
                    "signature": "const SYMLINK_REFUSING_WRITE_FLAGS",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "DIFF_FILE_MODE",
                    "kind": "const",
                    "line": 12,
                    "exported": false,
                    "signature": "const DIFF_FILE_MODE = 0o600",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "fsAsyncDiffWriter",
                    "kind": "const",
                    "line": 14,
                    "exported": true,
                    "signature": "export const fsAsyncDiffWriter: AsyncDiffWriterPort = { async write(path, data) { await mkdir(parse(path).dir, { recursive: true }); try { const handle = await open(path, SYMLINK_REFUSING_WRITE_FLAGS,…",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "./asyncTypes",
                "node:fs",
                "node:fs/promises",
                "node:path"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/fsAsyncImageSource.ts",
            "symbols": [
                {
                    "name": "fsAsyncImageSource",
                    "kind": "const",
                    "line": 7,
                    "exported": true,
                    "signature": "export const fsAsyncImageSource: AsyncImageSourcePort = { async load(source, opts) { if (typeof source === 'string') { let validatedPath; try { validatedPath = validatePath(source, opts.inputBaseDir, …",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../getPngData",
                "../validatePath",
                "./asyncTypes",
                "./validateImageSourceLoad",
                "node:fs/promises"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/fsDiffWriter.ts",
            "symbols": [
                {
                    "name": "SYMLINK_REFUSING_WRITE_FLAGS",
                    "kind": "const",
                    "line": 6,
                    "exported": false,
                    "signature": "const SYMLINK_REFUSING_WRITE_FLAGS",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "DIFF_FILE_MODE",
                    "kind": "const",
                    "line": 11,
                    "exported": false,
                    "signature": "const DIFF_FILE_MODE = 0o600",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "fsDiffWriter",
                    "kind": "const",
                    "line": 13,
                    "exported": true,
                    "signature": "export const fsDiffWriter: DiffWriterPort = { write(path, data) { mkdirSync(parse(path).dir, { recursive: true }); let fd: number; try { fd = openSync(path, SYMLINK_REFUSING_WRITE_FLAGS, DIFF_FILE_MOD…",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "./types",
                "node:fs",
                "node:path"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/fsImageSource.ts",
            "symbols": [
                {
                    "name": "fsImageSource",
                    "kind": "const",
                    "line": 4,
                    "exported": true,
                    "signature": "export const fsImageSource: ImageSourcePort = { load(source, opts) { return getPngData(source, opts.throwErrorOnInvalidInputData, opts.maxDimension, opts.maxPixels, opts.inputBaseDir); }, }",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../getPngData",
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/types.ts",
            "symbols": [
                {
                    "name": "ImageSourcePort",
                    "kind": "interface",
                    "line": 6,
                    "exported": true,
                    "signature": "export interface ImageSourcePort { load(source: string | Buffer, opts: ResolvedOptions): LoadedPng; }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "DiffWriterPort",
                    "kind": "interface",
                    "line": 10,
                    "exported": true,
                    "signature": "export interface DiffWriterPort { write(path: ValidatedPath, data: Buffer): void; }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparisonPorts",
                    "kind": "type",
                    "line": 14,
                    "exported": true,
                    "signature": "export type ComparisonPorts = { readonly imageSource: ImageSourcePort; readonly diffWriter: DiffWriterPort; };",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../pipeline/types",
                "../types/png.data",
                "../types/validated-path",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/validateImageSourceLoad.ts",
            "symbols": [
                {
                    "name": "handlePathValidationError",
                    "kind": "function",
                    "line": 12,
                    "exported": true,
                    "signature": "export function handlePathValidationError(error: unknown, opts: ResolvedOptions): LoadedPng",
                    "members": null,
                    "jsdoc": "Validates and handles errors from path validation during image source loading. Returns an invalid LoadedPng if path validation fails and throwError is false."
                },
                {
                    "name": "handleFileReadError",
                    "kind": "function",
                    "line": 34,
                    "exported": true,
                    "signature": "export function handleFileReadError(_error: unknown, opts: ResolvedOptions): LoadedPng",
                    "members": null,
                    "jsdoc": "Validates and handles errors from file read operations during image source loading. Returns an invalid LoadedPng if read fails and throwError is false."
                },
                {
                    "name": "handlePngDecodeError",
                    "kind": "function",
                    "line": 49,
                    "exported": true,
                    "signature": "export function handlePngDecodeError(error: unknown, opts: ResolvedOptions): LoadedPng",
                    "members": null,
                    "jsdoc": "Validates and handles errors from PNG decode operations during image source loading. Returns an invalid LoadedPng if decode fails and throwError is false."
                }
            ],
            "imports": [
                "../errors",
                "../pipeline/types",
                "../types/png.data"
            ],
            "reExports": []
        },
        {
            "path": "src/types/area.ts",
            "symbols": [
                {
                    "name": "Area",
                    "kind": "type",
                    "line": 2,
                    "exported": true,
                    "signature": "export type Area = { x1: number; y1: number; x2: number; y2: number; };",
                    "members": null,
                    "jsdoc": "Defines a rectangular region of an image by its top-left and bottom-right pixel coordinates (inclusive). All coordinates must be finite integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized."
                }
            ],
            "imports": [],
            "reExports": []
        },
        {
            "path": "src/types/color.ts",
            "symbols": [
                {
                    "name": "Color",
                    "kind": "type",
                    "line": 2,
                    "exported": true,
                    "signature": "export type Color = { r: number; g: number; b: number; };",
                    "members": null,
                    "jsdoc": "An RGB colour used to paint pixels on a PNG buffer. All channels are in the range 0–255."
                }
            ],
            "imports": [],
            "reExports": []
        },
        {
            "path": "src/types/compare.options.ts",
            "symbols": [
                {
                    "name": "PixelmatchOptions",
                    "kind": "type",
                    "line": 4,
                    "exported": true,
                    "signature": "export type PixelmatchOptions = { threshold?: number; includeAA?: boolean; alpha?: number; aaColor?: [number, number, number]; diffColor?: [number, number, number]; diffColorAlt?: [number, number, num…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparePngOptions",
                    "kind": "type",
                    "line": 43,
                    "exported": true,
                    "signature": "export type ComparePngOptions = { excludedAreas?: Area[]; diffFilePath?: string; throwErrorOnInvalidInputData?: boolean; extendedAreaColor?: Color; excludedAreaColor?: Color; maxDimension?: number; ma…",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./area",
                "./color"
            ],
            "reExports": []
        },
        {
            "path": "src/types/index.ts",
            "symbols": [],
            "imports": [],
            "reExports": [
                {
                    "source": "./area",
                    "names": [
                        "Area"
                    ],
                    "typeOnly": true
                },
                {
                    "source": "./color",
                    "names": [
                        "Color"
                    ],
                    "typeOnly": true
                },
                {
                    "source": "./compare.options",
                    "names": [
                        "ComparePngOptions",
                        "PixelmatchOptions"
                    ],
                    "typeOnly": true
                },
                {
                    "source": "./png.data",
                    "names": [
                        "LoadedPng"
                    ],
                    "typeOnly": true
                }
            ]
        },
        {
            "path": "src/types/png.data.ts",
            "symbols": [
                {
                    "name": "LoadedPng",
                    "kind": "type",
                    "line": 3,
                    "exported": true,
                    "signature": "export type LoadedPng = | { readonly kind: 'valid'; readonly png: PNGWithMetadata } | { readonly kind: 'invalid'; readonly reason: 'path' | 'decode' | 'type' };",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/types/validated-path.ts",
            "symbols": [
                {
                    "name": "__validatedPath",
                    "kind": "const",
                    "line": 1,
                    "exported": false,
                    "signature": "declare const __validatedPath: unique symbol",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ValidatedPath",
                    "kind": "type",
                    "line": 3,
                    "exported": true,
                    "signature": "export type ValidatedPath = string & { readonly [__validatedPath]: never };",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [],
            "reExports": []
        },
        {
            "path": "src/validateArea.ts",
            "symbols": [
                {
                    "name": "validateArea",
                    "kind": "function",
                    "line": 4,
                    "exported": true,
                    "signature": "export function validateArea(area: Area, index: number): void",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./errors",
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/validateColor.ts",
            "symbols": [
                {
                    "name": "validateColor",
                    "kind": "function",
                    "line": 19,
                    "exported": true,
                    "signature": "export function validateColor(color: Color, name: string): void",
                    "members": null,
                    "jsdoc": "Validates that all channels of a are integers in the range [0, 255]."
                }
            ],
            "imports": [
                "./errors",
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/validatePath.ts",
            "symbols": [
                {
                    "name": "ValidatePathMode",
                    "kind": "type",
                    "line": 6,
                    "exported": true,
                    "signature": "export type ValidatePathMode = 'input' | 'output';",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "isContained",
                    "kind": "function",
                    "line": 8,
                    "exported": false,
                    "signature": "function isContained(baseDir: string, targetPath: string): boolean",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "realpathNative",
                    "kind": "function",
                    "line": 13,
                    "exported": false,
                    "signature": "function realpathNative(targetPath: string, missingBaseDirMessage?: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "realpathExistingPath",
                    "kind": "function",
                    "line": 28,
                    "exported": false,
                    "signature": "function realpathExistingPath(targetPath: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "assertOutputTargetShape",
                    "kind": "function",
                    "line": 61,
                    "exported": false,
                    "signature": "function assertOutputTargetShape(resolved: string): void",
                    "members": null,
                    "jsdoc": "Asserts that an output-mode target is not an existing symlink or directory."
                },
                {
                    "name": "validatePath",
                    "kind": "function",
                    "line": 116,
                    "exported": true,
                    "signature": "export function validatePath(filePath: string, baseDir?: string, mode: ValidatePathMode = 'output'): ValidatedPath",
                    "members": null,
                    "jsdoc": "Validates and resolves a file path string with optional directory containment checks."
                }
            ],
            "imports": [
                "./errors",
                "./types/validated-path",
                "node:fs",
                "node:path"
            ],
            "reExports": []
        },
        {
            "path": "src/validatePixelmatchOptions.ts",
            "symbols": [
                {
                    "name": "validateUnitInterval",
                    "kind": "function",
                    "line": 4,
                    "exported": false,
                    "signature": "function validateUnitInterval(name: string, value: unknown): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "validateBoolean",
                    "kind": "function",
                    "line": 10,
                    "exported": false,
                    "signature": "function validateBoolean(name: string, value: unknown): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "validateColorTuple",
                    "kind": "function",
                    "line": 16,
                    "exported": false,
                    "signature": "function validateColorTuple(name: string, value: unknown): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "validatePixelmatchOptions",
                    "kind": "function",
                    "line": 27,
                    "exported": true,
                    "signature": "export function validatePixelmatchOptions(opts: PixelmatchOptions): void",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./errors",
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/vitest.mts",
            "symbols": [
                {
                    "name": "VITEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "kind": "const",
                    "line": 23,
                    "exported": false,
                    "signature": "const VITEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestTestLike",
                    "kind": "type",
                    "line": 25,
                    "exported": false,
                    "signature": "type VitestTestLike = { id: string; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestExpectedSnapshot",
                    "kind": "type",
                    "line": 29,
                    "exported": false,
                    "signature": "type VitestExpectedSnapshot = { count: number; data?: string; key: string; markAsChecked: () => void; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestSnapshotReturn",
                    "kind": "type",
                    "line": 36,
                    "exported": false,
                    "signature": "type VitestSnapshotReturn = { actual: string; expected?: string; key: string; pass: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestSnapshotState",
                    "kind": "type",
                    "line": 43,
                    "exported": false,
                    "signature": "type VitestSnapshotState = { probeExpectedSnapshot: (options: { inlineSnapshot?: string; isInline: boolean; testId: string; testName: string; }) => VitestExpectedSnapshot; processDomainSnapshot: (opti…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "MatcherStateWithSnapshot",
                    "kind": "type",
                    "line": 65,
                    "exported": false,
                    "signature": "type MatcherStateWithSnapshot = MatcherState & { error?: Error; snapshotState?: VitestSnapshotState | null; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getVitestTest",
                    "kind": "function",
                    "line": 70,
                    "exported": false,
                    "signature": "function getVitestTest(matcherContext: MatcherState): VitestTestLike",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getAssertionName",
                    "kind": "function",
                    "line": 80,
                    "exported": false,
                    "signature": "function getAssertionName(matcherContext: MatcherState): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toMatchPngSnapshot",
                    "kind": "const",
                    "line": 90,
                    "exported": false,
                    "signature": "const toMatchPngSnapshot",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./matchers/createPngSnapshotMatcher.js",
                "./matchers/pngSnapshot.js",
                "./types/index.js",
                "vitest"
            ],
            "reExports": []
        }
    ]
}
```
