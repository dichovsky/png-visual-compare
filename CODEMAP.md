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
        "version": "7.0.1"
    },
    "sourceHash": "70a1b2cafa556b0442522f3679a46d37a7dc95b2b1d28ade085881b308aa652a",
    "entrypoints": [
        "src/index.ts",
        "src/jest.ts",
        "src/playwright.ts",
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
            "jsdoc": "Defines a rectangular region of an image by its top-left and bottom-right pixel coordinates (inclusive). All coordinates must be finite non-negative integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized.",
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
            "line": 49,
            "signature": "export type ComparePngOptions = { excludedAreas?: Area[]; diffFilePath?: string; throwErrorOnInvalidInputData?: boolean; extendedAreaColor?: Color; excludedAreaColor?: Color; maxDimension?: number; ma…",
            "jsdoc": null,
            "typeOnly": true
        },
        {
            "name": "ComparisonError",
            "kind": "class",
            "entrypoint": "src/index.ts",
            "file": "src/errors.ts",
            "line": 121,
            "signature": "export class ComparisonError extends Error",
            "jsdoc": "Thrown when the underlying `pixelmatch` call fails — for example, when the two normalized image buffers have mismatched lengths, or when `pixelmatch` itself throws for any reason the public API does not control directly. @example ```ts try { comparePng('a.png', 'b.png'); } catch (error) { if (error instanceof…",
            "typeOnly": false
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
            "name": "DEFAULT_MAX_FILE_BYTES",
            "kind": "const",
            "entrypoint": "src/index.ts",
            "file": "src/defaults.ts",
            "line": 30,
            "signature": "export const DEFAULT_MAX_FILE_BYTES",
            "jsdoc": "Default maximum size, in bytes, of a PNG file read from disk.",
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
            "line": 18,
            "signature": "export class InvalidInputError extends Error",
            "jsdoc": "Thrown when a PNG input (file path or Buffer) is invalid, malformed, or cannot be decoded, or when an `excludedAreas`, colour, or `pixelmatchOptions` value is invalid. Per-input failures are recoverable via `throwErrorOnInvalidInputData: false`, which treats invalid inputs as zero-size PNGs instead; invalid options, and both inputs being invalid, always throw. @example ```ts try { comparePng('invalid.png', 'image.png', { throwErrorOnInvalidInputDat…",
            "typeOnly": false
        },
        {
            "name": "LoadedPng",
            "kind": "type",
            "entrypoint": "src/index.ts",
            "file": "src/types/png.data.ts",
            "line": 7,
            "signature": "export type LoadedPng = InternalLoadedPng;",
            "jsdoc": "@deprecated No public API returns or accepts a `LoadedPng` — it describes an internal loading step. It will be removed in 8.0.0; delete any import of it (TYPE-06).",
            "typeOnly": true
        },
        {
            "name": "PathValidationError",
            "kind": "class",
            "entrypoint": "src/index.ts",
            "file": "src/errors.ts",
            "line": 54,
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
            "line": 88,
            "signature": "export class ResourceLimitError extends Error",
            "jsdoc": "Thrown when a PNG would exceed resource limits set via `maxDimension`, `maxPixels`, or `maxFileBytes`. This error is **NOT** recoverable and always throws regardless of `throwErrorOnInvalidInputData`, because resource exhaustion is a security concern rather than a routine input validation issue. @example ```ts try { // Defaults reject > 16384 px per axis, > 16,777,216 pixels, or file…",
            "typeOnly": false
        },
        {
            "name": "comparePng",
            "kind": "function",
            "entrypoint": "src/index.ts",
            "file": "src/comparePng.ts",
            "line": 17,
            "signature": "export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number",
            "jsdoc": "Compare two PNG inputs and return the mismatched pixel count.",
            "typeOnly": false
        },
        {
            "name": "comparePngAsync",
            "kind": "function",
            "entrypoint": "src/index.ts",
            "file": "src/comparePngAsync.ts",
            "line": 28,
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
            "signature": "Registers a `toMatchPngSnapshot` matcher on Jest's global `expect` when present, and augments both global `jest.Matchers` and the `expect` module's `Matchers` interface.",
            "jsdoc": null,
            "typeOnly": false
        },
        {
            "name": "registerJestPngSnapshotMatcher",
            "kind": "function",
            "entrypoint": "src/jest.ts",
            "file": "src/jest.ts",
            "line": 231,
            "signature": "export function registerJestPngSnapshotMatcher(expect: ExpectLike): void",
            "jsdoc": null,
            "typeOnly": false
        },
        {
            "name": "expect",
            "kind": "const",
            "entrypoint": "src/playwright.ts",
            "file": "src/playwright.ts",
            "line": 205,
            "signature": "export const expect",
            "jsdoc": null,
            "typeOnly": false
        },
        {
            "name": "pngMatchers",
            "kind": "const",
            "entrypoint": "src/playwright.ts",
            "file": "src/playwright.ts",
            "line": 199,
            "signature": "export const pngMatchers = { toMatchPngSnapshot: createPngSnapshotMatcher((matcherContext, received, args) => matchAgainstBaseline(test.info(), (matcherContext as { isNot?: boolean }).isNot === true, …",
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
                "../vendor/pixelmatch"
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
                    "line": 14,
                    "exported": false,
                    "signature": "type ComparePngInput = string | Buffer;",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "comparePng",
                    "kind": "function",
                    "line": 17,
                    "exported": true,
                    "signature": "export function comparePng(png1: ComparePngInput, png2: ComparePngInput, opts?: ComparePngOptions): number",
                    "members": null,
                    "jsdoc": "Compare two PNG inputs and return the mismatched pixel count."
                }
            ],
            "imports": [
                "./comparePngWithPorts",
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
                        "DEFAULT_MAX_FILE_BYTES",
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
                    "line": 14,
                    "exported": false,
                    "signature": "async function loadSourcesAsync( png1: string | Buffer, png2: string | Buffer, opts: ReturnType<typeof resolveOptions>, ): Promise<LoadedSources>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "comparePngAsync",
                    "kind": "function",
                    "line": 28,
                    "exported": true,
                    "signature": "export async function comparePngAsync(png1: string | Buffer, png2: string | Buffer, opts?: ComparePngOptions): Promise<number>",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./errors",
                "./pipeline/describeInvalidSources",
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
            "path": "src/comparePngWithPorts.ts",
            "symbols": [
                {
                    "name": "ComparePngInput",
                    "kind": "type",
                    "line": 10,
                    "exported": false,
                    "signature": "type ComparePngInput = string | Buffer;",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "comparePngWithPorts",
                    "kind": "function",
                    "line": 20,
                    "exported": true,
                    "signature": "export function comparePngWithPorts( png1: ComparePngInput, png2: ComparePngInput, opts: ComparePngOptions | undefined, ports?: ComparisonPorts, ): number",
                    "members": null,
                    "jsdoc": "Sync orchestration with injectable ports — the internal test seam behind `comparePng`."
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
                },
                {
                    "name": "DEFAULT_MAX_FILE_BYTES",
                    "kind": "const",
                    "line": 30,
                    "exported": true,
                    "signature": "export const DEFAULT_MAX_FILE_BYTES",
                    "members": null,
                    "jsdoc": "Default maximum size, in bytes, of a PNG file read from disk."
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
                    "line": 18,
                    "exported": true,
                    "signature": "export class InvalidInputError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 19
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 21
                        }
                    ],
                    "jsdoc": "Thrown when a PNG input (file path or Buffer) is invalid, malformed, or cannot be decoded, or when an `excludedAreas`, colour, or `pixelmatchOptions` value is invalid. Per-input failures are recoverable via `throwErrorOnInvalidInputData: false`, which treats invalid inputs as zero-size PNGs instead; invalid options, and both inputs being invalid, always throw. @example ```ts try { comparePng('invalid.png', 'image.png', { throwErrorOnInvalidInputDat…"
                },
                {
                    "name": "PathValidationError",
                    "kind": "class",
                    "line": 54,
                    "exported": true,
                    "signature": "export class PathValidationError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 55
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 57
                        }
                    ],
                    "jsdoc": "Thrown when a file path fails validation checks, including: - Path traversal attempts (when `inputBaseDir` or `diffOutputBaseDir` is set) - Symlink loops or invalid symlink usage - Empty, whitespace-only, or null-byte-containing paths @example ```ts try { comparePng( '../../etc/passwd', 'image.png', { inputBaseDir: '/safe/…"
                },
                {
                    "name": "ResourceLimitError",
                    "kind": "class",
                    "line": 88,
                    "exported": true,
                    "signature": "export class ResourceLimitError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 89
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 91
                        }
                    ],
                    "jsdoc": "Thrown when a PNG would exceed resource limits set via `maxDimension`, `maxPixels`, or `maxFileBytes`. This error is **NOT** recoverable and always throws regardless of `throwErrorOnInvalidInputData`, because resource exhaustion is a security concern rather than a routine input validation issue. @example ```ts try { // Defaults reject > 16384 px per axis, > 16,777,216 pixels, or file…"
                },
                {
                    "name": "ComparisonError",
                    "kind": "class",
                    "line": 121,
                    "exported": true,
                    "signature": "export class ComparisonError extends Error",
                    "members": [
                        {
                            "name": "code",
                            "kind": "property",
                            "line": 122
                        },
                        {
                            "name": "constructor",
                            "kind": "constructor",
                            "line": 124
                        }
                    ],
                    "jsdoc": "Thrown when the underlying `pixelmatch` call fails — for example, when the two normalized image buffers have mismatched lengths, or when `pixelmatch` itself throws for any reason the public API does not control directly. @example ```ts try { comparePng('a.png', 'b.png'); } catch (error) { if (error instanceof…"
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
                    "line": 7,
                    "exported": false,
                    "signature": "const PNG_SIGNATURE",
                    "members": null,
                    "jsdoc": "PNG file signature (first 8 bytes of every valid PNG)."
                },
                {
                    "name": "IHDR_PEEK_LENGTH",
                    "kind": "const",
                    "line": 13,
                    "exported": false,
                    "signature": "const IHDR_PEEK_LENGTH = 24",
                    "members": null,
                    "jsdoc": "Minimum bytes required to read width/height from the IHDR chunk: 8 (signature) + 4 (chunk length) + 4 (chunk type) + 4 (width) + 4 (height)."
                },
                {
                    "name": "peekPngDimensions",
                    "kind": "function",
                    "line": 20,
                    "exported": false,
                    "signature": "function peekPngDimensions(data: Buffer): { width: number; height: number } | null",
                    "members": null,
                    "jsdoc": "Reads the declared width and height from a PNG's IHDR chunk without fully decoding the image. Returns `null` if the buffer is too short or does not start with the PNG signature."
                },
                {
                    "name": "assertImageLimits",
                    "kind": "function",
                    "line": 32,
                    "exported": false,
                    "signature": "function assertImageLimits(buffer: Buffer, maxDimension: number | undefined, maxPixels: number | undefined): void",
                    "members": null,
                    "jsdoc": "Throws if the IHDR-declared dimensions exceed `maxDimension`. This check happens *before* `PNG.sync.read()` to prevent the decoder from allocating a huge output buffer for crafted PNGs with enormous header values. Always throws regardless of `throwErrorOnInvalidInputData`."
                },
                {
                    "name": "assertSinglePngHeader",
                    "kind": "function",
                    "line": 58,
                    "exported": false,
                    "signature": "function assertSinglePngHeader(buffer: Buffer): void",
                    "members": null,
                    "jsdoc": "pngjs accepts repeated IHDR chunks and decodes using the last dimensions. Reject them before decoding so a later header cannot bypass the size guard. Leave other malformed framing and CRC checks to the decoder; advancing by chunk length also avoids mistaking IHDR bytes inside chunk data for a header."
                },
                {
                    "name": "finalizeDecodedPng",
                    "kind": "function",
                    "line": 70,
                    "exported": false,
                    "signature": "function finalizeDecodedPng(decoded: LoadedPng, throwErrorOnInvalidInputData: boolean): LoadedPng",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getPngData",
                    "kind": "function",
                    "line": 81,
                    "exported": true,
                    "signature": "export function getPngData( pngSource: string | Buffer, throwErrorOnInvalidInputData: boolean, maxDimension?: number, maxPixels?: number, inputBaseDir?: string, maxFileBytes?: number, ): LoadedPng",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./errors",
                "./pipeline/types",
                "./readValidatedFile",
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
                        "DEFAULT_MAX_FILE_BYTES",
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
                        "ComparisonError",
                        "InvalidInputError",
                        "PathValidationError",
                        "ResourceLimitError"
                    ],
                    "typeOnly": false
                },
                {
                    "source": "./types",
                    "names": [
                        "Area",
                        "Color",
                        "ComparePngOptions",
                        "LoadedPng",
                        "PixelmatchOptions"
                    ],
                    "typeOnly": true
                }
            ]
        },
        {
            "path": "src/internal/assertSameFile.ts",
            "symbols": [
                {
                    "name": "FileIdentity",
                    "kind": "type",
                    "line": 4,
                    "exported": true,
                    "signature": "export type FileIdentity = { readonly dev: bigint; readonly ino: bigint; };",
                    "members": null,
                    "jsdoc": "The subset of `BigIntStats` needed to identify a file on disk."
                },
                {
                    "name": "assertSameFile",
                    "kind": "function",
                    "line": 30,
                    "exported": true,
                    "signature": "export function assertSameFile(opened: FileIdentity, expected: FileIdentity, subject: string): void",
                    "members": null,
                    "jsdoc": "Asserts that an opened file handle refers to the same on-disk file that path validation approved."
                }
            ],
            "imports": [
                "../errors"
            ],
            "reExports": []
        },
        {
            "path": "src/internal/realDiffDirectory.ts",
            "symbols": [
                {
                    "name": "realDiffDirectory",
                    "kind": "function",
                    "line": 19,
                    "exported": true,
                    "signature": "export function realDiffDirectory(directory: string, baseDir: string): string",
                    "members": null,
                    "jsdoc": "Resolves the diff file's parent directory through symlinks and re-proves it sits inside `baseDir`, returning the canonical directory."
                }
            ],
            "imports": [
                "../errors",
                "node:fs",
                "node:path"
            ],
            "reExports": []
        },
        {
            "path": "src/internal/secureMkdir.ts",
            "symbols": [
                {
                    "name": "componentsFrom",
                    "kind": "function",
                    "line": 11,
                    "exported": false,
                    "signature": "function componentsFrom(baseDir: string, dir: string): string[] | null",
                    "members": null,
                    "jsdoc": "Returns each directory that must exist between `baseDir` and `dir`, outermost first, or `null` when `dir` is not inside `baseDir`."
                },
                {
                    "name": "refuseSymlink",
                    "kind": "function",
                    "line": 26,
                    "exported": false,
                    "signature": "function refuseSymlink(component: string): never",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "errorCode",
                    "kind": "function",
                    "line": 33,
                    "exported": false,
                    "signature": "function errorCode(error: unknown): string | undefined",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "isMissing",
                    "kind": "function",
                    "line": 37,
                    "exported": false,
                    "signature": "function isMissing(error: unknown): boolean",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "secureMkdirSync",
                    "kind": "function",
                    "line": 64,
                    "exported": true,
                    "signature": "export function secureMkdirSync(dir: string, baseDir?: string): void",
                    "members": null,
                    "jsdoc": "Creates `dir`, refusing to traverse a symlinked parent component."
                },
                {
                    "name": "secureMkdir",
                    "kind": "function",
                    "line": 100,
                    "exported": true,
                    "signature": "export async function secureMkdir(dir: string, baseDir?: string): Promise<void>",
                    "members": null,
                    "jsdoc": "Asynchronous twin of ; identical contract."
                }
            ],
            "imports": [
                "../errors",
                "node:fs",
                "node:fs/promises",
                "node:path"
            ],
            "reExports": []
        },
        {
            "path": "src/jest.ts",
            "symbols": [
                {
                    "name": "JEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "kind": "const",
                    "line": 17,
                    "exported": false,
                    "signature": "const JEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ExpectLike",
                    "kind": "type",
                    "line": 19,
                    "exported": false,
                    "signature": "type ExpectLike = { extend: (matchers: { toMatchPngSnapshot: typeof toMatchPngSnapshot }) => void; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SnapshotStateLike",
                    "kind": "type",
                    "line": 23,
                    "exported": false,
                    "signature": "type SnapshotStateLike = { added?: number; expand?: boolean; matched?: number; unmatched?: number; updated?: number; [key: string]: unknown; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "JestMatcherContext",
                    "kind": "type",
                    "line": 32,
                    "exported": false,
                    "signature": "type JestMatcherContext = { currentConcurrentTestName?: () => string | undefined; currentTestName?: string; error?: Error; isNot?: boolean; snapshotState?: SnapshotStateLike | null; testFailing?: bool…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "addOuterLineBreaks",
                    "kind": "function",
                    "line": 41,
                    "exported": false,
                    "signature": "function addOuterLineBreaks(value: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getSnapshotData",
                    "kind": "function",
                    "line": 45,
                    "exported": false,
                    "signature": "function getSnapshotData(snapshotState: SnapshotStateLike): Record<string, string>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getSnapshotCounters",
                    "kind": "function",
                    "line": 55,
                    "exported": false,
                    "signature": "function getSnapshotCounters(snapshotState: SnapshotStateLike): Map<string, number>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getUncheckedKeys",
                    "kind": "function",
                    "line": 65,
                    "exported": false,
                    "signature": "function getUncheckedKeys(snapshotState: SnapshotStateLike): Set<string>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getUpdateSnapshotMode",
                    "kind": "function",
                    "line": 75,
                    "exported": false,
                    "signature": "function getUpdateSnapshotMode(snapshotState: SnapshotStateLike): 'all' | 'new' | 'none'",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "setSnapshotDirty",
                    "kind": "function",
                    "line": 85,
                    "exported": false,
                    "signature": "function setSnapshotDirty(snapshotState: SnapshotStateLike): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "incrementSnapshotCounter",
                    "kind": "function",
                    "line": 89,
                    "exported": false,
                    "signature": "function incrementSnapshotCounter( snapshotState: SnapshotStateLike, field: 'added' | 'matched' | 'unmatched' | 'updated', testFailing: boolean | undefined, ): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "resolveSnapshotKey",
                    "kind": "function",
                    "line": 103,
                    "exported": false,
                    "signature": "function resolveSnapshotKey(snapshotState: SnapshotStateLike, testName: string): { count: number; key: string }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createJestMismatchMessage",
                    "kind": "function",
                    "line": 113,
                    "exported": false,
                    "signature": "function createJestMismatchMessage(testName: string, mismatchedPixels: number): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createJestNegatedMatchMessage",
                    "kind": "function",
                    "line": 120,
                    "exported": false,
                    "signature": "function createJestNegatedMatchMessage(testName: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createJestMissingSnapshotMessage",
                    "kind": "function",
                    "line": 126,
                    "exported": false,
                    "signature": "function createJestMissingSnapshotMessage(testName: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "persistJestSnapshot",
                    "kind": "function",
                    "line": 132,
                    "exported": false,
                    "signature": "function persistJestSnapshot(snapshotState: SnapshotStateLike, key: string, serializedSnapshot: string): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toMatchPngSnapshot",
                    "kind": "const",
                    "line": 137,
                    "exported": false,
                    "signature": "const toMatchPngSnapshot",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getGlobalExpect",
                    "kind": "function",
                    "line": 227,
                    "exported": false,
                    "signature": "function getGlobalExpect(): ExpectLike | undefined",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "registerJestPngSnapshotMatcher",
                    "kind": "function",
                    "line": 231,
                    "exported": true,
                    "signature": "export function registerJestPngSnapshotMatcher(expect: ExpectLike): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "jestExpect",
                    "kind": "const",
                    "line": 238,
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
                "expect"
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
                    "signature": "type SnapshotMatcherDelegate<R> = (matcherContext: unknown, received: Buffer, args: PngSnapshotMatcherArgs) => R;",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SnapshotMatcherContext",
                    "kind": "type",
                    "line": 13,
                    "exported": false,
                    "signature": "type SnapshotMatcherContext = { isNot?: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PNG_SIGNATURE",
                    "kind": "const",
                    "line": 17,
                    "exported": false,
                    "signature": "const PNG_SIGNATURE",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "describeValue",
                    "kind": "function",
                    "line": 19,
                    "exported": false,
                    "signature": "function describeValue(value: unknown): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "hasPngSignature",
                    "kind": "function",
                    "line": 31,
                    "exported": false,
                    "signature": "function hasPngSignature(value: Uint8Array): boolean",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toBuffer",
                    "kind": "function",
                    "line": 45,
                    "exported": false,
                    "signature": "function toBuffer(value: Uint8Array): Buffer",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "createPngSnapshotMatcher",
                    "kind": "function",
                    "line": 51,
                    "exported": true,
                    "signature": "export function createPngSnapshotMatcher<R extends SnapshotMatcherResult | Promise<SnapshotMatcherResult>>( delegate: SnapshotMatcherDelegate<R>, )",
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
                    "line": 7,
                    "exported": false,
                    "signature": "const PNG_SIGNATURE",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PngSnapshotMatcherArgs",
                    "kind": "type",
                    "line": 9,
                    "exported": true,
                    "signature": "export type PngSnapshotMatcherArgs = { hint?: string; options?: ComparePngOptions; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "NormalizedMatcherArgsResult",
                    "kind": "type",
                    "line": 14,
                    "exported": false,
                    "signature": "type NormalizedMatcherArgsResult = | { args: PngSnapshotMatcherArgs; } | { errorMessage: string; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SerializedPngSnapshot",
                    "kind": "type",
                    "line": 22,
                    "exported": false,
                    "signature": "type SerializedPngSnapshot = { data: number[]; type: 'Buffer'; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE",
                    "kind": "const",
                    "line": 32,
                    "exported": true,
                    "signature": "export const NOT_REQUIRES_STORED_SNAPSHOT_MESSAGE = '.not.toMatchPngSnapshot() requires an existing snapshot to compare against.'",
                    "members": null,
                    "jsdoc": "Thrown by `.not.toMatchPngSnapshot()` when there is no stored snapshot to compare against. A missing baseline must never pass vacuously — you cannot record what an image must *not* be."
                },
                {
                    "name": "ComparedPngSnapshot",
                    "kind": "type",
                    "line": 34,
                    "exported": true,
                    "signature": "export type ComparedPngSnapshot = { pass: boolean; mismatchedPixels: number; actualSerialized: string; expectedSerialized: string; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "hasPngSignature",
                    "kind": "function",
                    "line": 41,
                    "exported": false,
                    "signature": "function hasPngSignature(value: Uint8Array): boolean",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "isComparePngOptions",
                    "kind": "function",
                    "line": 55,
                    "exported": false,
                    "signature": "function isComparePngOptions(value: unknown): value is ComparePngOptions",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "isSerializedPngSnapshot",
                    "kind": "function",
                    "line": 59,
                    "exported": false,
                    "signature": "function isSerializedPngSnapshot(value: unknown): value is SerializedPngSnapshot",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "normalizePngSnapshotMatcherArgs",
                    "kind": "function",
                    "line": 69,
                    "exported": true,
                    "signature": "export function normalizePngSnapshotMatcherArgs( hintOrOptions?: string | ComparePngOptions, options?: ComparePngOptions, ): NormalizedMatcherArgsResult",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "buildSnapshotTestName",
                    "kind": "function",
                    "line": 107,
                    "exported": true,
                    "signature": "export function buildSnapshotTestName(testName: string | undefined, hint: string | undefined, separator: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "serializePngSnapshot",
                    "kind": "function",
                    "line": 111,
                    "exported": true,
                    "signature": "export function serializePngSnapshot(received: Buffer): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "validatePngSnapshot",
                    "kind": "function",
                    "line": 117,
                    "exported": true,
                    "signature": "export function validatePngSnapshot(received: Buffer, options: ComparePngOptions | undefined): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "parseSerializedPngSnapshot",
                    "kind": "function",
                    "line": 122,
                    "exported": true,
                    "signature": "export function parseSerializedPngSnapshot(serializedSnapshot: string): Buffer",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "compareAgainstSerializedPngSnapshot",
                    "kind": "function",
                    "line": 144,
                    "exported": true,
                    "signature": "export function compareAgainstSerializedPngSnapshot( received: Buffer, serializedExpectedSnapshot: string, options?: ComparePngOptions, ): ComparedPngSnapshot",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../comparePng",
                "../getPngData",
                "../pipeline/resolveOptions",
                "../types",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/describeInvalidSources.ts",
            "symbols": [
                {
                    "name": "InvalidPngReason",
                    "kind": "type",
                    "line": 3,
                    "exported": false,
                    "signature": "type InvalidPngReason = Extract<LoadedPng, { kind: 'invalid' }>['reason'];",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "INVALID_PNG_REASON_PHRASES",
                    "kind": "const",
                    "line": 5,
                    "exported": false,
                    "signature": "const INVALID_PNG_REASON_PHRASES: Record<InvalidPngReason, string> = { decode: 'could not decode PNG content', path: 'source path could not be loaded', type: 'unrecognized input type', }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "describeBothInvalidSources",
                    "kind": "function",
                    "line": 22,
                    "exported": true,
                    "signature": "export function describeBothInvalidSources(firstReason: InvalidPngReason, secondReason: InvalidPngReason): string",
                    "members": null,
                    "jsdoc": "Builds the error message used when both PNG inputs fail to load. Reports each input's actual failure reason (invalid content vs. unloadable path vs. unknown type) instead of the misleading \"Unknown PNG files input type\", which wrongly implies the input *type* was unrecognised even for valid `Buffer`/`string` inputs whose content simply could not be decoded."
                }
            ],
            "imports": [
                "./types"
            ],
            "reExports": []
        },
        {
            "path": "src/pipeline/loadSources.ts",
            "symbols": [
                {
                    "name": "loadSources",
                    "kind": "function",
                    "line": 7,
                    "exported": true,
                    "signature": "export function loadSources(png1: string | Buffer, png2: string | Buffer, opts: ResolvedOptions): LoadedSources",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "../ports/fsImageSource",
                "./describeInvalidSources",
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
                    "line": 8,
                    "exported": false,
                    "signature": "function clonePng(image: PNGWithMetadata): PNGWithMetadata",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toComparablePng",
                    "kind": "function",
                    "line": 14,
                    "exported": false,
                    "signature": "function toComparablePng(source: LoadedPng): PNGWithMetadata",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "normalizeImages",
                    "kind": "function",
                    "line": 23,
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
                    "line": 17,
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
                    "line": 11,
                    "exported": true,
                    "signature": "export function runComparison(images: NormalizedImages, opts: ResolvedOptions): ComparisonResult",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../adapters/toPixelmatchOptions",
                "../errors",
                "../vendor/pixelmatch",
                "./types",
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
                    "line": 7,
                    "exported": true,
                    "signature": "export type ResolvedOptions = { readonly excludedAreas: Area[]; readonly throwErrorOnInvalidInputData: boolean; readonly extendedAreaColor: Color; readonly excludedAreaColor: Color; readonly shouldCre…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "LoadedPng",
                    "kind": "type",
                    "line": 31,
                    "exported": true,
                    "signature": "export type LoadedPng = { readonly kind: 'valid'; readonly png: PNGWithMetadata } | { readonly kind: 'invalid'; readonly reason: 'path' | 'decode' | 'type' };",
                    "members": null,
                    "jsdoc": "Result of loading one image source: the decoded PNG, or why it could not be loaded."
                },
                {
                    "name": "LoadedSources",
                    "kind": "type",
                    "line": 34,
                    "exported": true,
                    "signature": "export type LoadedSources = { readonly png1: string | Buffer; readonly png2: string | Buffer; readonly first: LoadedPng; readonly second: LoadedPng; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "NormalizedImages",
                    "kind": "type",
                    "line": 41,
                    "exported": true,
                    "signature": "export type NormalizedImages = { readonly first: PNGWithMetadata; readonly second: PNGWithMetadata; readonly width: number; readonly height: number; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparisonResult",
                    "kind": "type",
                    "line": 48,
                    "exported": true,
                    "signature": "export type ComparisonResult = { readonly mismatchedPixels: number; readonly diff?: PNG; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparisonContext",
                    "kind": "type",
                    "line": 53,
                    "exported": true,
                    "signature": "export type ComparisonContext = { readonly options: ResolvedOptions; readonly sources: LoadedSources; readonly normalized: NormalizedImages; readonly result: ComparisonResult; };",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../ports/types",
                "../types",
                "../types/validated-path",
                "node:buffer",
                "pngjs"
            ],
            "reExports": []
        },
        {
            "path": "src/playwright.ts",
            "symbols": [
                {
                    "name": "PNG_EXTENSION",
                    "kind": "const",
                    "line": 15,
                    "exported": false,
                    "signature": "const PNG_EXTENSION",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PNG_CONTENT_TYPE",
                    "kind": "const",
                    "line": 16,
                    "exported": false,
                    "signature": "const PNG_CONTENT_TYPE = 'image/png'",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "UNNAMED_COUNTER_KEY",
                    "kind": "const",
                    "line": 17,
                    "exported": false,
                    "signature": "const UNNAMED_COUNTER_KEY = 'unnamed'",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "MAX_GENERATED_NAME_LENGTH",
                    "kind": "const",
                    "line": 18,
                    "exported": false,
                    "signature": "const MAX_GENERATED_NAME_LENGTH = 100",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "MANAGED_DIFF_OPTIONS",
                    "kind": "const",
                    "line": 19,
                    "exported": false,
                    "signature": "const MANAGED_DIFF_OPTIONS",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "MatcherResult",
                    "kind": "type",
                    "line": 21,
                    "exported": false,
                    "signature": "type MatcherResult = { pass: boolean; message: () => string; softError?: Error; shouldNotRetryTest?: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "SnapshotNames",
                    "kind": "type",
                    "line": 28,
                    "exported": false,
                    "signature": "type SnapshotNames = { baselineName: string; artifactBase: string };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "noMessage",
                    "kind": "const",
                    "line": 30,
                    "exported": false,
                    "signature": "const noMessage = (): string =>",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PASSED",
                    "kind": "const",
                    "line": 31,
                    "exported": false,
                    "signature": "const PASSED: MatcherResult = { pass: true, message: noMessage }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "snapshotCounters",
                    "kind": "const",
                    "line": 33,
                    "exported": false,
                    "signature": "const snapshotCounters",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "nextSnapshotIndex",
                    "kind": "function",
                    "line": 35,
                    "exported": false,
                    "signature": "function nextSnapshotIndex(testInfo: TestInfo, key: string): number",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "sanitizeForFilePath",
                    "kind": "function",
                    "line": 43,
                    "exported": false,
                    "signature": "function sanitizeForFilePath(value: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "trimLongString",
                    "kind": "function",
                    "line": 47,
                    "exported": false,
                    "signature": "function trimLongString(value: string): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "resolveSnapshotNames",
                    "kind": "function",
                    "line": 62,
                    "exported": false,
                    "signature": "function resolveSnapshotNames(testInfo: TestInfo, hint: string | undefined): SnapshotNames",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "assertNoManagedDiffOptions",
                    "kind": "function",
                    "line": 75,
                    "exported": false,
                    "signature": "function assertNoManagedDiffOptions(options: ComparePngOptions | undefined): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "attach",
                    "kind": "function",
                    "line": 83,
                    "exported": false,
                    "signature": "function attach(testInfo: TestInfo, name: string, path: string): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "attachActual",
                    "kind": "function",
                    "line": 87,
                    "exported": false,
                    "signature": "function attachActual(testInfo: TestInfo, artifactBase: string, received: Buffer): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "writeBaseline",
                    "kind": "function",
                    "line": 93,
                    "exported": false,
                    "signature": "function writeBaseline(baselinePath: string, received: Buffer, options: ComparePngOptions | undefined): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "pixelLabel",
                    "kind": "function",
                    "line": 99,
                    "exported": false,
                    "signature": "function pixelLabel(count: number): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "matchMissingBaseline",
                    "kind": "function",
                    "line": 103,
                    "exported": false,
                    "signature": "function matchMissingBaseline( testInfo: TestInfo, received: Buffer, names: SnapshotNames, baselinePath: string, options: ComparePngOptions | undefined, ): MatcherResult",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "matchAgainstBaseline",
                    "kind": "function",
                    "line": 133,
                    "exported": false,
                    "signature": "function matchAgainstBaseline(testInfo: TestInfo, isNot: boolean, received: Buffer, args: PngSnapshotMatcherArgs): MatcherResult",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "pngMatchers",
                    "kind": "const",
                    "line": 199,
                    "exported": true,
                    "signature": "export const pngMatchers = { toMatchPngSnapshot: createPngSnapshotMatcher((matcherContext, received, args) => matchAgainstBaseline(test.info(), (matcherContext as { isNot?: boolean }).isNot === true, …",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "expect",
                    "kind": "const",
                    "line": 205,
                    "exported": true,
                    "signature": "export const expect",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "./comparePng",
                "./matchers/createPngSnapshotMatcher",
                "./matchers/pngSnapshot",
                "./types",
                "@playwright/test",
                "node:crypto",
                "node:fs",
                "node:path"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/asyncTypes.ts",
            "symbols": [
                {
                    "name": "AsyncImageSourcePort",
                    "kind": "interface",
                    "line": 5,
                    "exported": true,
                    "signature": "export interface AsyncImageSourcePort { load(source: string | Buffer, opts: ResolvedOptions): Promise<LoadedPng>; }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "AsyncDiffWriterPort",
                    "kind": "interface",
                    "line": 9,
                    "exported": true,
                    "signature": "export interface AsyncDiffWriterPort { write(path: ValidatedPath, data: Buffer, baseDir?: string): Promise<void>; }",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../pipeline/types",
                "../types/validated-path",
                "node:buffer"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/fsAsyncDiffWriter.ts",
            "symbols": [
                {
                    "name": "OPEN_FLAGS",
                    "kind": "const",
                    "line": 13,
                    "exported": false,
                    "signature": "const OPEN_FLAGS",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "DIFF_FILE_MODE",
                    "kind": "const",
                    "line": 24,
                    "exported": false,
                    "signature": "const DIFF_FILE_MODE = 0o600",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "asSymlinkRefusal",
                    "kind": "function",
                    "line": 26,
                    "exported": false,
                    "signature": "function asSymlinkRefusal(error: unknown): unknown",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "fsAsyncDiffWriter",
                    "kind": "const",
                    "line": 33,
                    "exported": true,
                    "signature": "export const fsAsyncDiffWriter: AsyncDiffWriterPort = { async write(path, data, baseDir) { const directory = dirname(path); await secureMkdir(directory, baseDir); const target = baseDir === undefined …",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "../internal/assertSameFile",
                "../internal/realDiffDirectory",
                "../internal/secureMkdir",
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
                    "signature": "export const fsAsyncImageSource: AsyncImageSourcePort = { async load(source, opts) { if (typeof source === 'string') { let buffer; try { buffer = await readValidatedFile(source, opts.inputBaseDir, opt…",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "../getPngData",
                "../readValidatedFile",
                "./asyncTypes",
                "./validateImageSourceLoad"
            ],
            "reExports": []
        },
        {
            "path": "src/ports/fsDiffWriter.ts",
            "symbols": [
                {
                    "name": "OPEN_FLAGS",
                    "kind": "const",
                    "line": 12,
                    "exported": false,
                    "signature": "const OPEN_FLAGS",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "DIFF_FILE_MODE",
                    "kind": "const",
                    "line": 23,
                    "exported": false,
                    "signature": "const DIFF_FILE_MODE = 0o600",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "asSymlinkRefusal",
                    "kind": "function",
                    "line": 25,
                    "exported": false,
                    "signature": "function asSymlinkRefusal(error: unknown): unknown",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "fsDiffWriter",
                    "kind": "const",
                    "line": 32,
                    "exported": true,
                    "signature": "export const fsDiffWriter: DiffWriterPort = { write(path, data, baseDir) { const directory = dirname(path); secureMkdirSync(directory, baseDir); const target = baseDir === undefined ? path : resolve(r…",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../errors",
                "../internal/assertSameFile",
                "../internal/realDiffDirectory",
                "../internal/secureMkdir",
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
                    "signature": "export const fsImageSource: ImageSourcePort = { load(source, opts) { return getPngData( source, opts.throwErrorOnInvalidInputData, opts.maxDimension, opts.maxPixels, opts.inputBaseDir, opts.maxFileByt…",
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
                    "line": 5,
                    "exported": true,
                    "signature": "export interface ImageSourcePort { load(source: string | Buffer, opts: ResolvedOptions): LoadedPng; }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "DiffWriterPort",
                    "kind": "interface",
                    "line": 9,
                    "exported": true,
                    "signature": "export interface DiffWriterPort { write(path: ValidatedPath, data: Buffer, baseDir?: string): void; }",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "ComparisonPorts",
                    "kind": "type",
                    "line": 13,
                    "exported": true,
                    "signature": "export type ComparisonPorts = { readonly imageSource: ImageSourcePort; readonly diffWriter: DiffWriterPort; };",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [
                "../pipeline/types",
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
                    "line": 11,
                    "exported": true,
                    "signature": "export function handlePathValidationError(error: unknown, opts: ResolvedOptions): LoadedPng",
                    "members": null,
                    "jsdoc": "Validates and handles errors from path validation during image source loading. Returns an invalid LoadedPng if path validation fails and throwError is false."
                },
                {
                    "name": "handleFileReadError",
                    "kind": "function",
                    "line": 33,
                    "exported": true,
                    "signature": "export function handleFileReadError(_error: unknown, opts: ResolvedOptions): LoadedPng",
                    "members": null,
                    "jsdoc": "Validates and handles errors from file read operations during image source loading. Returns an invalid LoadedPng if read fails and throwError is false."
                },
                {
                    "name": "handlePngDecodeError",
                    "kind": "function",
                    "line": 48,
                    "exported": true,
                    "signature": "export function handlePngDecodeError(error: unknown, opts: ResolvedOptions): LoadedPng",
                    "members": null,
                    "jsdoc": "Validates and handles errors from PNG decode operations during image source loading. Returns an invalid LoadedPng if decode fails and throwError is false."
                }
            ],
            "imports": [
                "../errors",
                "../pipeline/types"
            ],
            "reExports": []
        },
        {
            "path": "src/readValidatedFile.ts",
            "symbols": [
                {
                    "name": "READ_CHUNK_BYTES",
                    "kind": "const",
                    "line": 11,
                    "exported": false,
                    "signature": "const READ_CHUNK_BYTES",
                    "members": null,
                    "jsdoc": "Read size once the stat size hint is used up (a growing file, a FIFO, a device)."
                },
                {
                    "name": "hasByteCap",
                    "kind": "function",
                    "line": 13,
                    "exported": false,
                    "signature": "function hasByteCap(maxFileBytes: number | undefined): maxFileBytes is number",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "assertWithinByteCap",
                    "kind": "function",
                    "line": 17,
                    "exported": false,
                    "signature": "function assertWithinByteCap(size: bigint, maxFileBytes: number | undefined): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "readCappedSync",
                    "kind": "function",
                    "line": 37,
                    "exported": false,
                    "signature": "function readCappedSync(fd: number, sizeHint: bigint, maxFileBytes: number): Buffer",
                    "members": null,
                    "jsdoc": "Reads the handle to EOF, enforcing `maxFileBytes` on the bytes actually read."
                },
                {
                    "name": "readCapped",
                    "kind": "function",
                    "line": 55,
                    "exported": false,
                    "signature": "async function readCapped(handle: FileHandle, sizeHint: bigint, maxFileBytes: number): Promise<Buffer>",
                    "members": null,
                    "jsdoc": "Asynchronous twin of ."
                },
                {
                    "name": "readValidatedFileSync",
                    "kind": "function",
                    "line": 110,
                    "exported": true,
                    "signature": "export function readValidatedFileSync(filePath: string, inputBaseDir?: string, maxFileBytes?: number): Buffer",
                    "members": null,
                    "jsdoc": "Reads a file through a handle that is pinned before validation runs, so the bytes returned provably come from the inode that path validation approved."
                },
                {
                    "name": "readValidatedFile",
                    "kind": "function",
                    "line": 144,
                    "exported": true,
                    "signature": "export async function readValidatedFile(filePath: string, inputBaseDir?: string, maxFileBytes?: number): Promise<Buffer>",
                    "members": null,
                    "jsdoc": "Asynchronous twin of ; identical contract and ordering."
                }
            ],
            "imports": [
                "./errors",
                "./internal/assertSameFile",
                "./validatePath",
                "node:buffer",
                "node:fs",
                "node:fs/promises",
                "node:path"
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
                    "jsdoc": "Defines a rectangular region of an image by its top-left and bottom-right pixel coordinates (inclusive). All coordinates must be finite non-negative integers. `x1 <= x2`, `y1 <= y2`. Reversed coordinates are rejected at runtime — they are not auto-normalized."
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
                    "line": 49,
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
                    "line": 7,
                    "exported": true,
                    "signature": "export type LoadedPng = InternalLoadedPng;",
                    "members": null,
                    "jsdoc": "@deprecated No public API returns or accepts a `LoadedPng` — it describes an internal loading step. It will be removed in 8.0.0; delete any import of it (TYPE-06)."
                }
            ],
            "imports": [
                "../pipeline/types"
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
                    "name": "assertPathSyntax",
                    "kind": "function",
                    "line": 92,
                    "exported": true,
                    "signature": "export function assertPathSyntax(filePath: string): void",
                    "members": null,
                    "jsdoc": "Rejects paths that are malformed as strings, before any filesystem call."
                },
                {
                    "name": "assertLexicalContainment",
                    "kind": "function",
                    "line": 114,
                    "exported": true,
                    "signature": "export function assertLexicalContainment(filePath: string, baseDir: string): void",
                    "members": null,
                    "jsdoc": "Rejects a path that is lexically outside `baseDir`, before any filesystem call."
                },
                {
                    "name": "ValidatedPathWithReal",
                    "kind": "type",
                    "line": 136,
                    "exported": true,
                    "signature": "export type ValidatedPathWithReal = { readonly validated: ValidatedPath; readonly real?: string; };",
                    "members": null,
                    "jsdoc": "A validated path together with the canonical (symlink-resolved) path that the containment check actually approved."
                },
                {
                    "name": "validatePath",
                    "kind": "function",
                    "line": 176,
                    "exported": true,
                    "signature": "export function validatePath(filePath: string, baseDir?: string, mode: ValidatePathMode = 'output'): ValidatedPath",
                    "members": null,
                    "jsdoc": "Validates and resolves a file path string with optional directory containment checks."
                },
                {
                    "name": "validatePathWithReal",
                    "kind": "function",
                    "line": 186,
                    "exported": true,
                    "signature": "export function validatePathWithReal(filePath: string, baseDir?: string, mode: ValidatePathMode = 'output'): ValidatedPathWithReal",
                    "members": null,
                    "jsdoc": "Identical to , but additionally returns the canonical path that the `baseDir` containment check was proven against."
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
            "path": "src/vendor/pixelmatch.ts",
            "symbols": [
                {
                    "name": "PixelData",
                    "kind": "type",
                    "line": 32,
                    "exported": false,
                    "signature": "type PixelData = Uint8Array | Uint8ClampedArray;",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "RgbColor",
                    "kind": "type",
                    "line": 33,
                    "exported": false,
                    "signature": "type RgbColor = [number, number, number];",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "PixelmatchKernelOptions",
                    "kind": "type",
                    "line": 35,
                    "exported": true,
                    "signature": "export type PixelmatchKernelOptions = { threshold?: number; includeAA?: boolean; alpha?: number; aaColor?: RgbColor; diffColor?: RgbColor; diffColorAlt?: RgbColor; diffMask?: boolean; checkerboard?: b…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "pixelmatch",
                    "kind": "function",
                    "line": 65,
                    "exported": true,
                    "signature": "export function pixelmatch( img1: PixelData, img2: PixelData, output: PixelData | undefined, width: number, height: number, options: PixelmatchKernelOptions = {}, ): number",
                    "members": null,
                    "jsdoc": "Compare two equally sized images, pixel by pixel."
                },
                {
                    "name": "isPixelData",
                    "kind": "function",
                    "line": 160,
                    "exported": false,
                    "signature": "function isPixelData(arr: unknown): arr is PixelData",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "antialiased",
                    "kind": "function",
                    "line": 169,
                    "exported": false,
                    "signature": "function antialiased( img: PixelData, x1: number, y1: number, width: number, height: number, a32: Uint32Array, b32: Uint32Array, checkerboard: boolean, ): boolean",
                    "members": null,
                    "jsdoc": "Check if a pixel is likely a part of anti-aliasing; based on \"Anti-aliased Pixel and Intensity Slope Detector\" paper by V. Vysniauskas, 2009"
                },
                {
                    "name": "hasManySiblings",
                    "kind": "function",
                    "line": 238,
                    "exported": false,
                    "signature": "function hasManySiblings(img: Uint32Array, x1: number, y1: number, width: number, height: number): boolean",
                    "members": null,
                    "jsdoc": "Check if a pixel has 3+ adjacent pixels of the same color."
                },
                {
                    "name": "colorDelta",
                    "kind": "function",
                    "line": 262,
                    "exported": false,
                    "signature": "function colorDelta(img1: PixelData, img2: PixelData, k: number, m: number, checkerboard: boolean): number",
                    "members": null,
                    "jsdoc": "Calculate color difference according to the paper \"Measuring perceived color difference using YIQ NTSC transmission color space in mobile applications\" by Y. Kotsarenko and F. Ramos. Caller guarantees the two pixels differ, so the early-zero check is omitted."
                },
                {
                    "name": "brightnessDelta",
                    "kind": "function",
                    "line": 306,
                    "exported": false,
                    "signature": "function brightnessDelta( img: PixelData, k: number, m: number, r1: number, g1: number, b1: number, a1: number, checkerboard: boolean, ): number",
                    "members": null,
                    "jsdoc": "Specialized brightness-only color delta for the anti-aliasing detector, with the center pixel's RGBA hoisted out of the neighbor loop."
                },
                {
                    "name": "drawPixel",
                    "kind": "function",
                    "line": 345,
                    "exported": false,
                    "signature": "function drawPixel(output: PixelData, pos: number, r: number, g: number, b: number): void",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "drawGrayPixel",
                    "kind": "function",
                    "line": 352,
                    "exported": false,
                    "signature": "function drawGrayPixel(img: PixelData, i: number, alpha: number, output: PixelData): void",
                    "members": null,
                    "jsdoc": null
                }
            ],
            "imports": [],
            "reExports": []
        },
        {
            "path": "src/vitest.mts",
            "symbols": [
                {
                    "name": "VITEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "kind": "const",
                    "line": 25,
                    "exported": false,
                    "signature": "const VITEST_PNG_SNAPSHOT_MATCHER_KEY",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestTestLike",
                    "kind": "type",
                    "line": 27,
                    "exported": false,
                    "signature": "type VitestTestLike = { id: string; fails?: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestExpectedSnapshot",
                    "kind": "type",
                    "line": 32,
                    "exported": false,
                    "signature": "type VitestExpectedSnapshot = { count: number; data?: string; key: string; markAsChecked: () => void; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestSnapshotReturn",
                    "kind": "type",
                    "line": 39,
                    "exported": false,
                    "signature": "type VitestSnapshotReturn = { actual: string; expected?: string; key: string; pass: boolean; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "VitestSnapshotState",
                    "kind": "type",
                    "line": 46,
                    "exported": false,
                    "signature": "type VitestSnapshotState = { readonly snapshotUpdateState: 'all' | 'new' | 'none'; probeExpectedSnapshot: (options: { inlineSnapshot?: string; isInline: boolean; testId: string; testName: string; }) =…",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "MatcherStateWithSnapshot",
                    "kind": "type",
                    "line": 69,
                    "exported": false,
                    "signature": "type MatcherStateWithSnapshot = MatcherState & { error?: Error; snapshotState?: VitestSnapshotState | null; };",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getVitestTest",
                    "kind": "function",
                    "line": 74,
                    "exported": false,
                    "signature": "function getVitestTest(matcherContext: MatcherState): VitestTestLike",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "getAssertionName",
                    "kind": "function",
                    "line": 84,
                    "exported": false,
                    "signature": "function getAssertionName(matcherContext: MatcherState): string",
                    "members": null,
                    "jsdoc": null
                },
                {
                    "name": "toMatchPngSnapshot",
                    "kind": "const",
                    "line": 94,
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
