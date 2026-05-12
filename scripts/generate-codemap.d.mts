// Ambient declarations for scripts/generate-codemap.mjs.
// Hand-maintained: the generator itself stays as plain ESM JavaScript per the
// project convention for build-time scripts (see scripts/check-licenses.mjs).
// Keep this file in sync with the exported named functions.

export interface CodemapConfig {
    sourceDirs: string[];
    entrypoints: string[];
    exclude: string[];
    maxSignatureLength: number;
    outputSizeWarnBytes: number;
}

export interface FileReExport {
    source: string;
    names: string[] | '*';
    typeOnly: boolean;
}

export interface FileSymbolMember {
    name: string;
    kind: 'constructor' | 'method' | 'property' | 'getter' | 'setter';
    line: number;
}

export interface FileSymbol {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const';
    line: number;
    exported: boolean;
    signature: string;
    members: FileSymbolMember[] | null;
    jsdoc: string | null;
}

export interface CodemapFile {
    path: string;
    symbols: FileSymbol[];
    imports: string[];
    reExports: FileReExport[];
}

export type PublicApiKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const' | 'side-effect';

export interface PublicApiEntry {
    name: string;
    kind: PublicApiKind;
    entrypoint: string;
    file: string;
    line: number;
    signature: string;
    jsdoc: string | null;
    typeOnly: boolean;
}

export interface CodemapDocument {
    schema: 'codemap.v2';
    repo: { name: string; version: string };
    sourceHash: string;
    entrypoints: string[];
    publicApi: PublicApiEntry[];
    files: CodemapFile[];
}

export function loadConfig(repoRoot: string): { config: CodemapConfig; raw: string };
export function globToRegExp(glob: string): RegExp;
export function filterGitIgnored(repoRoot: string, relativePaths: string[]): string[];
export function collectSourceFiles(repoRoot: string, config: CodemapConfig): string[];
export function normalizeSignature(text: string): string;
export function extractJSDoc(node: unknown): string | undefined;
export function extractSideEffects(sourceFile: unknown): string[];
export function extractSignature(sourceFile: unknown, node: unknown, maxLen: number): string;
export function extractClassMembers(sourceFile: unknown, classNode: unknown): FileSymbolMember[];
export function extractFileSymbols(sourceFile: unknown, relativePath: string, maxSignatureLength: number): CodemapFile;
export function computeSourceHash(fileContents: Map<string, string>, rawConfig: string): string;
export function formatMarkdown(codemap: CodemapDocument): string;
export function generate(options: { repoRoot: string }): { markdown: string; codemap: CodemapDocument };
export function check(options: { repoRoot: string }): { ok: true } | { ok: false; diff: string };
export function unifiedDiff(before: string, after: string, maxLines: number): string;
