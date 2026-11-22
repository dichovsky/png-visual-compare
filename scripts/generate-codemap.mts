/**
 * CODEMAP.md generator. Produces a deterministic, machine-readable symbol index
 * conforming to schema `codemap.v2`. See CODEMAP.md preamble for field semantics.
 *
 * Exposes named functions so tests can target individual helpers; main() runs only
 * when the file is invoked directly via node.
 */

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const SCHEMA_VERSION = 'codemap.v2';
const OUTPUT_FILENAME = 'CODEMAP.md';
const CONFIG_FILENAME = 'codemap.config.json';
const TRANSITIVE_DEPTH_LIMIT = 8;

interface CodemapConfig {
    sourceDirs: string[];
    entrypoints: string[];
    exclude: string[];
    maxSignatureLength: number;
    outputSizeWarnBytes: number;
}

interface FileReExport {
    source: string;
    names: string[] | '*';
    typeOnly: boolean;
}

interface FileSymbolMember {
    name: string;
    kind: 'constructor' | 'method' | 'property' | 'getter' | 'setter';
    line: number;
}

interface FileSymbol {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'const';
    line: number;
    exported: boolean;
    signature: string;
    members: FileSymbolMember[] | null;
    jsdoc: string | null;
}

interface CodemapFile {
    path: string;
    symbols: FileSymbol[];
    imports: string[];
    reExports: FileReExport[];
}

type PublicApiKind = FileSymbol['kind'] | 'side-effect';

interface PublicApiEntry {
    name: string;
    kind: PublicApiKind;
    entrypoint: string;
    file: string;
    line: number;
    signature: string;
    jsdoc: string | null;
    typeOnly: boolean;
}

interface CodemapDocument {
    schema: 'codemap.v2';
    repo: { name: string; version: string };
    sourceHash: string;
    entrypoints: string[];
    publicApi: PublicApiEntry[];
    files: CodemapFile[];
}

function cmp(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

export function loadConfig(repoRoot: string): {
    config: CodemapConfig;
    raw: string;
} {
    const configPath = path.join(repoRoot, CONFIG_FILENAME);
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.sourceDirs) || parsed.sourceDirs.length === 0) {
        throw new Error(`${CONFIG_FILENAME}: "sourceDirs" must be a non-empty array.`);
    }
    if (!Array.isArray(parsed.entrypoints) || parsed.entrypoints.length === 0) {
        throw new Error(`${CONFIG_FILENAME}: "entrypoints" must be a non-empty array.`);
    }
    if (!Array.isArray(parsed.exclude)) {
        throw new Error(`${CONFIG_FILENAME}: "exclude" must be an array.`);
    }
    const maxSignatureLength = typeof parsed.maxSignatureLength === 'number' ? parsed.maxSignatureLength : 200;
    const outputSizeWarnBytes = typeof parsed.outputSizeWarnBytes === 'number' ? parsed.outputSizeWarnBytes : 153600;

    return {
        config: {
            sourceDirs: parsed.sourceDirs,
            entrypoints: parsed.entrypoints,
            exclude: parsed.exclude,
            maxSignatureLength,
            outputSizeWarnBytes,
        },
        raw,
    };
}

/**
 * Convert an `exclude` glob to a RegExp matching POSIX-normalized relative paths.
 * Supports `**` (any depth) and `*` (single segment).
 */
export function globToRegExp(glob: string) {
    let pattern = '^';
    let i = 0;
    while (i < glob.length) {
        const ch = glob[i];
        if (ch === '*') {
            if (glob[i + 1] === '*') {
                pattern += '.*';
                i += 2;
                if (glob[i] === '/') i += 1;
            } else {
                pattern += '[^/]*';
                i += 1;
            }
        } else if (ch === '?') {
            pattern += '[^/]';
            i += 1;
        } else if ('.+^$|()[]{}\\'.includes(ch)) {
            pattern += `\\${ch}`;
            i += 1;
        } else {
            pattern += ch;
            i += 1;
        }
    }
    pattern += '$';
    return new RegExp(pattern);
}

/**
 * Recursively walk a directory, returning POSIX-normalized paths relative to `repoRoot`.
 */
function walkDirectory(repoRoot: string, absDir: string) {
    const collected = [];
    const stack = [absDir];
    while (stack.length > 0) {
        const current = stack.pop()!;
        let entries;
        try {
            entries = readdirSync(current, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const abs = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(abs);
            } else if (entry.isFile()) {
                const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
                collected.push(rel);
            }
        }
    }
    return collected;
}

/**
 * Filter relative paths through `git check-ignore`. If git is unavailable, returns
 * the input unchanged with a stderr warning.
 */
export function filterGitIgnored(repoRoot: string, relativePaths: string[]) {
    if (relativePaths.length === 0) return [];
    const result = spawnSync('git', ['check-ignore', '--stdin', '--no-index'], {
        cwd: repoRoot,
        input: relativePaths.join('\n'),
        encoding: 'utf8',
    });
    if (result.error || (result.status !== 0 && result.status !== 1)) {
        if (process.env.CODEMAP_SILENT !== '1') {
            process.stderr.write(`warning: git check-ignore unavailable; skipping .gitignore filter\n`);
        }
        return relativePaths;
    }
    const ignored = new Set(
        result.stdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0),
    );
    return relativePaths.filter((p) => !ignored.has(p));
}

/**
 * Collect TypeScript source files under `config.sourceDirs`, applying exclude globs,
 * .d.ts rules, and .gitignore filtering. Returns absolute paths sorted lexicographically.
 */
export function collectSourceFiles(repoRoot: string, config: CodemapConfig) {
    const excludeRegexps = config.exclude.map(globToRegExp);
    const seen = new Set<string>();

    for (const sourceDir of config.sourceDirs) {
        const absDir = path.join(repoRoot, sourceDir);
        try {
            if (!statSync(absDir).isDirectory()) continue;
        } catch {
            continue;
        }
        for (const rel of walkDirectory(repoRoot, absDir)) {
            if (!(rel.endsWith('.ts') || rel.endsWith('.mts') || rel.endsWith('.cts'))) continue;
            if (excludeRegexps.some((r) => r.test(rel))) continue;
            if (/\.d\.[cm]?ts$/.test(rel)) continue;
            seen.add(rel);
        }
    }

    const tracked = filterGitIgnored(repoRoot, [...seen]);
    return tracked.map((rel) => path.join(repoRoot, rel)).sort();
}

type Statement = ReturnType<typeof parse>['program']['body'][number];
type ClassNode = Extract<Statement, { type: 'ClassDeclaration' }>;
type Variable = Extract<Statement, { type: 'VariableDeclaration' }>;
type ExportStatement = Extract<Statement, { type: 'ExportNamedDeclaration' | 'ExportAllDeclaration' }>;
type TokenRange = { start: number; end: number };
type Source = ReturnType<typeof parseSource>;
type ResolvedExport = Omit<PublicApiEntry, 'entrypoint'>;

interface IndexFile {
    file: CodemapFile;
    exports: ExportStatement[];
    sideEffects: string[];
}

export function parseSource(text: string, filename = 'fixture.ts') {
    const ast = parse(text, {
        sourceFilename: filename,
        sourceType: 'module',
        plugins: ['typescript', 'decorators', 'decoratorAutoAccessors', 'deferredImportEvaluation'],
        // The TS compiler also returns an AST for recoverable diagnostics, such as legacy parameter decorators.
        errorRecovery: true,
        tokens: true,
        allowUndeclaredExports: true,
        createParenthesizedExpressions: true,
    });
    // Babel includes comments and an empty end-of-file token in its token list.
    const tokens: TokenRange[] = (ast.tokens ?? []).filter((token) => typeof token.type !== 'string' && token.end > token.start);
    return {
        text,
        statements: ast.program.body,
        directives: ast.program.directives,
        comments: ast.comments ?? [],
        tokens,
    };
}

/** Reassemble the original token text, collapsing spaces and comments between tokens. */
export function normalizeSignature(source: Source, start = 0, end = source.text.length): string {
    const { text, tokens } = source;
    let left = 0;
    let right = tokens.length;
    while (left < right) {
        const middle = Math.floor((left + right) / 2);
        if (tokens[middle].start < start) left = middle + 1;
        else right = middle;
    }
    let result = '';
    let previousEnd = start;
    for (let i = left; i < tokens.length && tokens[i].start < end; i++) {
        const token = tokens[i];
        if (result && token.start > previousEnd) result += ' ';
        result += text.slice(token.start, token.end);
        previousEnd = token.end;
    }
    return result;
}

function truncateSignature(text: string, maxLen: number) {
    return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

function commentSections(comment: string): string[] {
    return comment
        .replace(/^\s*\* ?/gm, '')
        .replace(/\{@(?:link|linkcode|linkplain)\s+[\w$]+(?:[.#][\w$]+)*\s*([^}]*)\}/g, '$1')
        .trim()
        .split(/\s+(?=@\w)/);
}

export function extractJSDoc(node: Statement, previousStatementEndLine = 0): string | undefined {
    const doc = node.leadingComments?.findLast(
        (c) => c.type === 'CommentBlock' && c.value.startsWith('*') && c.loc!.start.line > previousStatementEndLine,
    );
    if (!doc) return undefined;
    const parts: string[] = [];
    let exampleSeen = false;
    for (const section of commentSections(doc.value)) {
        const tag = /^\s*@(\w+)\b\s*([\s\S]*)/.exec(section);
        if (!tag) {
            const paragraph = section
                .split(/\n\s*\n/, 1)[0]
                .replace(/\s+/g, ' ')
                .trim();
            if (paragraph) parts.push(paragraph);
        } else {
            const [, name, value] = tag;
            const content = value.replace(/\s+/g, ' ').trim();
            if (name === 'deprecated' || name === 'since') parts.push(`@${name}${content ? ' ' + content : ''}`);
            if (name === 'example' && !exampleSeen) {
                if (content) parts.push(`@example ${truncateSignature(content, 80)}`);
                exampleSeen = true;
            }
        }
    }
    return parts.join(' ') || undefined;
}

function extractSideEffects(source: Source): string[] {
    const first = source.directives[0]?.start ?? source.statements[0]?.start ?? source.text.length;
    return source.comments
        .filter((comment) => comment.type === 'CommentBlock' && comment.end! <= first)
        .flatMap((comment) => [...comment.value.matchAll(/@sideEffect\s+([^*\n]+)/g)].map((match) => match[1].trim().replace(/\s+/g, ' ')));
}

export function extractSignature(source: Source, statement: Statement, maxLen: number): string {
    const node =
        statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration' ? statement.declaration : statement;
    const hasBody = node?.type === 'ClassDeclaration' || node?.type === 'FunctionDeclaration';
    const end = hasBody ? node.body.start! : statement.end!;
    return truncateSignature(normalizeSignature(source, statement.start!, end), maxLen);
}

export function extractClassMembers(source: Source, node: ClassNode): FileSymbolMember[] {
    const members: FileSymbolMember[] = [];
    for (const member of node.body.body) {
        if (!('key' in member)) continue;
        const { key } = member;
        let name: string;
        if ('computed' in member && member.computed) {
            name = '[' + source.text.slice(key.start!, key.end!).replace(/\s+/g, '') + ']';
        } else if (key.type === 'Identifier') name = key.name;
        else if (key.type === 'PrivateName') name = '#' + key.id.name;
        else if (key.type === 'StringLiteral' || key.type === 'NumericLiteral') name = String(key.value);
        else continue;

        let kind: FileSymbolMember['kind'] = 'property';
        if ('kind' in member) {
            if (member.kind === 'get') kind = 'getter';
            else if (member.kind === 'set') kind = 'setter';
            else if (member.kind === 'constructor') kind = 'constructor';
            else kind = 'method';
        }
        members.push({ name, kind, line: member.loc!.start.line });
    }
    return members.sort((a, b) => a.line - b.line || cmp(a.name, b.name));
}

const LITERAL_INITIALIZERS = new Set([
    'ObjectExpression',
    'ArrayExpression',
    'StringLiteral',
    'NumericLiteral',
    'BigIntLiteral',
    'BooleanLiteral',
    'NullLiteral',
]);

function variableSignature(
    source: Source,
    statement: Statement,
    node: Variable,
    declaration: Variable['declarations'][number],
    maxLen: number,
): string {
    const init = declaration.init;
    let end = declaration.end!;
    if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') end = init.body.start!;
    else if (init && !LITERAL_INITIALIZERS.has(init.type) && !(init.type === 'TemplateLiteral' && !init.expressions.length))
        end = declaration.id.end!;
    const signature =
        node.declarations.length === 1
            ? normalizeSignature(source, statement.start!, end)
            : node.kind + ' ' + normalizeSignature(source, declaration.start!, end);
    return truncateSignature(signature, maxLen);
}

const DECLARATION_KINDS = {
    TSDeclareFunction: 'function',
    FunctionDeclaration: 'function',
    ClassDeclaration: 'class',
    TSInterfaceDeclaration: 'interface',
    TSTypeAliasDeclaration: 'type',
    TSEnumDeclaration: 'enum',
} as const;

function symbolsFor(source: Source, statement: Statement, maxLen: number, previousStatementEndLine: number): FileSymbol[] {
    const exported = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration';
    const node = exported ? statement.declaration : statement;
    if (!node) return [];
    const jsdoc = extractJSDoc(statement, previousStatementEndLine) ?? null;
    if (node.type === 'VariableDeclaration') {
        return node.declarations.flatMap((declaration) =>
            declaration.id.type !== 'Identifier'
                ? []
                : [
                      {
                          name: declaration.id.name,
                          kind: 'const',
                          line: declaration.loc!.start.line,
                          exported,
                          signature: variableSignature(source, statement, node, declaration, maxLen),
                          members: null,
                          jsdoc,
                      },
                  ],
        );
    }
    if (!(node.type in DECLARATION_KINDS) || !('id' in node) || node.id?.type !== 'Identifier') return [];
    return [
        {
            name: node.id.name,
            kind: DECLARATION_KINDS[node.type as keyof typeof DECLARATION_KINDS],
            line: statement.loc!.start.line,
            exported,
            signature: extractSignature(source, statement, maxLen),
            members: node.type === 'ClassDeclaration' ? extractClassMembers(source, node) : null,
            jsdoc,
        },
    ];
}

function compareReExportNames(a: FileReExport['names'], b: FileReExport['names']): number {
    if (typeof a === 'string' && typeof b === 'string') return cmp(a, b);
    if (typeof a === 'string') return -1;
    if (typeof b === 'string') return 1;
    return cmp(a.join(','), b.join(','));
}

function exportedName(node: { type: 'Identifier'; name: string } | { type: 'StringLiteral'; value: string }): string {
    return node.type === 'Identifier' ? node.name : node.value;
}

function indexFile(source: Source, relativePath: string, maxLen: number): IndexFile {
    const imports = new Set<string>();
    const reExports: FileReExport[] = [];
    const symbols: FileSymbol[] = [];
    const exports: ExportStatement[] = [];
    for (const [i, statement] of source.statements.entries()) {
        if (statement.type === 'ImportDeclaration') imports.add(statement.source.value);
        else if (statement.type === 'ExportAllDeclaration' || (statement.type === 'ExportNamedDeclaration' && !statement.declaration)) {
            exports.push(statement);
            if (!statement.source) continue;
            const names =
                statement.type === 'ExportAllDeclaration' || statement.specifiers.some((s) => s.type === 'ExportNamespaceSpecifier')
                    ? '*'
                    : statement.specifiers.map((spec) => exportedName(spec.exported)).sort();
            reExports.push({
                source: statement.source.value,
                names,
                typeOnly: statement.exportKind === 'type',
            });
        } else {
            // Babel also attaches the preceding statement's trailing comments to this one.
            const previous = i === 0 ? source.directives.at(-1) : source.statements[i - 1];
            symbols.push(...symbolsFor(source, statement, maxLen, previous?.loc?.end.line ?? 0));
        }
    }
    symbols.sort((a, b) => a.line - b.line || cmp(a.name, b.name));
    reExports.sort((a, b) => cmp(a.source, b.source) || compareReExportNames(a.names, b.names));
    return {
        file: {
            path: relativePath,
            symbols,
            imports: [...imports].sort(),
            reExports,
        },
        exports,
        sideEffects: extractSideEffects(source),
    };
}

function resolveSpecifier(specifier: string, from: string, files: Map<string, IndexFile>): string | undefined {
    if (!specifier.startsWith('.')) return undefined;
    const resolved = path.resolve(path.dirname(from), specifier);
    const candidates = ['', '.ts', '.mts', '.cts', '.d.ts', '/index.ts', '/index.mts'].map((suffix) => resolved + suffix);
    const withoutJs = resolved.replace(/\.(m?js)$/, '');
    if (withoutJs !== resolved) candidates.push(...['.ts', '.mts', '.cts'].map((suffix) => withoutJs + suffix));
    return candidates.find((candidate) => files.has(candidate));
}

function resolveExportsFor(filename: string, files: Map<string, IndexFile>, visited: Set<string>): ResolvedExport[] {
    if (visited.size > TRANSITIVE_DEPTH_LIMIT || visited.has(filename)) return [];
    const index = files.get(filename);
    if (!index) return [];
    const ancestors = new Set(visited).add(filename);
    const locals = index.file.symbols.map((symbol) => ({
        name: symbol.name,
        kind: symbol.kind,
        file: index.file.path,
        line: symbol.line,
        signature: symbol.signature,
        jsdoc: symbol.jsdoc,
        typeOnly: symbol.kind === 'type' || symbol.kind === 'interface',
    }));
    const result: ResolvedExport[] = locals.filter((_, i) => index.file.symbols[i].exported);
    for (const statement of index.exports) {
        let candidates: ResolvedExport[] = locals;
        if (statement.source) {
            const target = resolveSpecifier(statement.source.value, filename, files);
            if (!target) continue;
            candidates = resolveExportsFor(target, files, ancestors);
        }
        const typeOnly = statement.exportKind === 'type';
        if (statement.type === 'ExportAllDeclaration' || statement.specifiers.some((s) => s.type === 'ExportNamespaceSpecifier')) {
            result.push(
                ...candidates.map((symbol) => ({
                    ...symbol,
                    typeOnly: symbol.typeOnly || typeOnly,
                })),
            );
        } else {
            for (const spec of statement.specifiers) {
                if (spec.type !== 'ExportSpecifier') continue;
                const localName = exportedName(spec.local);
                const symbol = candidates.find((candidate) => candidate.name === localName);
                if (symbol)
                    result.push({
                        ...symbol,
                        name: exportedName(spec.exported),
                        typeOnly: symbol.typeOnly || typeOnly || spec.exportKind === 'type',
                    });
            }
        }
    }
    return result;
}

export function computeSourceHash(fileContents: Map<string, string>, rawConfig: string) {
    const hash = createHash('sha256');
    hash.update('config\0');
    hash.update(rawConfig);
    hash.update('\0');
    const entries = [...fileContents.entries()].sort(([a], [b]) => cmp(a, b));
    for (const [relPath, content] of entries) {
        hash.update(relPath);
        hash.update('\0');
        hash.update(content);
        hash.update('\0');
    }
    return hash.digest('hex');
}

/**
 * Render the final Markdown document: short preamble + fenced JSON block.
 */
export function formatMarkdown(codemap: CodemapDocument) {
    const preamble = [
        '# CODEMAP',
        '',
        `Machine-readable symbol index for coding agents. Regenerate with \`npm run codemap\` after any source change; CI verifies freshness via \`npm run codemap:check\`.`,
        '',
        `Schema: \`${codemap.schema}\``,
        '',
        '- `publicApi[]` — transitively-resolved symbols exposed from each entrypoint.',
        '- `files[]` — per-source symbol, import, and re-export listing for navigation.',
        '- `sourceHash` — SHA-256 of source contents + config; staleness signal for `--check`.',
        '',
    ].join('\n');
    const body = `\`\`\`json\n${JSON.stringify(codemap, null, 4)}\n\`\`\`\n`;
    return `${preamble}${body}`;
}

/** Use the same BOM handling as the TypeScript compiler when hashing and parsing source text. */
function readSourceText(filename: string): string {
    const bytes = readFileSync(filename);
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
    return new TextDecoder().decode(bytes);
}

/**
 * Generate the codemap document as a string. Pure function: no filesystem writes.
 */
export function generate({ repoRoot }: { repoRoot: string }) {
    const { config, raw: rawConfig } = loadConfig(repoRoot);
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const absSourcePaths = collectSourceFiles(repoRoot, config);

    const sourceFileMap = new Map<string, IndexFile>();
    const fileContents = new Map<string, string>();
    const files: CodemapFile[] = [];

    for (const filename of absSourcePaths) {
        const relativePath = path.relative(repoRoot, filename).split(path.sep).join('/');
        const source = parseSource(readSourceText(filename), filename);
        const index = indexFile(source, relativePath, config.maxSignatureLength);
        fileContents.set(relativePath, source.text);
        sourceFileMap.set(filename, index);
        files.push(index.file);
    }
    files.sort((a, b) => cmp(a.path, b.path));

    const publicApi: PublicApiEntry[] = [];
    for (const entrypointRel of config.entrypoints) {
        const abs = path.join(repoRoot, entrypointRel);
        const sourceFile = sourceFileMap.get(abs);
        if (!sourceFile) continue;
        const resolved = resolveExportsFor(abs, sourceFileMap, new Set());
        const sideEffects = sourceFile.sideEffects;
        const entrypointRelPath = sourceFile.file.path;
        for (const entry of resolved) {
            publicApi.push({
                name: entry.name,
                kind: entry.kind,
                entrypoint: entrypointRelPath,
                file: entry.file,
                line: entry.line,
                signature: entry.signature,
                jsdoc: entry.jsdoc ?? null,
                typeOnly: entry.typeOnly,
            });
        }
        if (sideEffects.length > 0) {
            publicApi.push({
                name: '<sideEffect>',
                kind: 'side-effect',
                entrypoint: entrypointRelPath,
                file: entrypointRelPath,
                line: 1,
                signature: sideEffects.join(' | '),
                jsdoc: null,
                typeOnly: false,
            });
        }
    }
    publicApi.sort((a, b) => cmp(a.entrypoint, b.entrypoint) || cmp(a.name, b.name) || cmp(a.file, b.file));

    const sourceHash = computeSourceHash(fileContents, rawConfig);

    const codemap: CodemapDocument = {
        schema: SCHEMA_VERSION,
        repo: { name: packageJson.name, version: packageJson.version },
        sourceHash,
        entrypoints: [...config.entrypoints].sort(),
        publicApi,
        files,
    };

    return { markdown: formatMarkdown(codemap), codemap };
}

/**
 * Compare the generated codemap against the committed `CODEMAP.md`.
 */
export function check({ repoRoot }: { repoRoot: string }): { ok: true } | { ok: false; diff: string } {
    const { markdown } = generate({ repoRoot });
    const outputPath = path.join(repoRoot, OUTPUT_FILENAME);
    let committed = '';
    try {
        committed = readFileSync(outputPath, 'utf8');
    } catch {
        return {
            ok: false,
            diff: `error: ${OUTPUT_FILENAME} not found at ${outputPath}`,
        };
    }
    if (committed === markdown) return { ok: true };
    return { ok: false, diff: unifiedDiff(committed, markdown, 40) };
}

/**
 * Build a minimal unified diff between `before` and `after`, capped to `maxLines` of output.
 */
export function unifiedDiff(before: string, after: string, maxLines: number) {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const out = [`--- ${OUTPUT_FILENAME} (committed)`, `+++ ${OUTPUT_FILENAME} (generated)`];
    const length = Math.max(beforeLines.length, afterLines.length);
    for (let i = 0; i < length && out.length < maxLines; i += 1) {
        const left = beforeLines[i];
        const right = afterLines[i];
        if (left === right) continue;
        if (left !== undefined) out.push(`- ${left}`);
        if (right !== undefined && out.length < maxLines) out.push(`+ ${right}`);
    }
    return out.join('\n');
}

function main() {
    const repoRoot = process.cwd();
    const argv = process.argv.slice(2);
    const checkMode = argv.includes('--check');

    if (checkMode) {
        const result = check({ repoRoot });
        if (result.ok) {
            process.stdout.write(`✓ ${OUTPUT_FILENAME} is up to date\n`);
            return;
        }
        process.stderr.write(`${result.diff}\n`);
        process.stderr.write(`✗ ${OUTPUT_FILENAME} is stale. Run \`npm run codemap\` and commit the result.\n`);
        process.exitCode = 1;
        return;
    }

    const { markdown } = generate({ repoRoot });
    const outputPath = path.join(repoRoot, OUTPUT_FILENAME);
    writeFileSync(outputPath, markdown);
    const config = loadConfig(repoRoot).config;
    const sizeBytes = Buffer.byteLength(markdown, 'utf8');
    if (sizeBytes > config.outputSizeWarnBytes) {
        process.stderr.write(`warning: ${OUTPUT_FILENAME} is ${sizeBytes} bytes (exceeds ${config.outputSizeWarnBytes} budget)\n`);
    }
    process.stdout.write(`Wrote ${OUTPUT_FILENAME} (${sizeBytes} bytes)\n`);
}

if (import.meta.main) {
    main();
}
