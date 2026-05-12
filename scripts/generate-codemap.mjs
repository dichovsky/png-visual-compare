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
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const SCHEMA_VERSION = 'codemap.v2';
const OUTPUT_FILENAME = 'CODEMAP.md';
const CONFIG_FILENAME = 'codemap.config.json';
const TRANSITIVE_DEPTH_LIMIT = 8;

const SYNTAX_KIND_TO_MEMBER_KIND = new Map([
    [ts.SyntaxKind.Constructor, 'constructor'],
    [ts.SyntaxKind.MethodDeclaration, 'method'],
    [ts.SyntaxKind.PropertyDeclaration, 'property'],
    [ts.SyntaxKind.GetAccessor, 'getter'],
    [ts.SyntaxKind.SetAccessor, 'setter'],
]);

/**
 * Codepoint-deterministic string comparison. Avoids locale variance of
 * `String.prototype.localeCompare` so output is identical across CI hosts.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function cmp(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

const LITERAL_INITIALIZER_KINDS = new Set([
    ts.SyntaxKind.StringLiteral,
    ts.SyntaxKind.NumericLiteral,
    ts.SyntaxKind.BigIntLiteral,
    ts.SyntaxKind.TrueKeyword,
    ts.SyntaxKind.FalseKeyword,
    ts.SyntaxKind.NullKeyword,
    ts.SyntaxKind.ObjectLiteralExpression,
    ts.SyntaxKind.ArrayLiteralExpression,
    ts.SyntaxKind.NoSubstitutionTemplateLiteral,
]);

/**
 * @param {string} repoRoot
 * @returns {{ config: CodemapConfig, raw: string }}
 */
export function loadConfig(repoRoot) {
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
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
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
 *
 * @param {string} repoRoot
 * @param {string} absDir
 * @returns {string[]}
 */
function walkDirectory(repoRoot, absDir) {
    const collected = [];
    const stack = [absDir];
    while (stack.length > 0) {
        const current = /** @type {string} */ (stack.pop());
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
 *
 * @param {string} repoRoot
 * @param {string[]} relativePaths
 * @returns {string[]}
 */
export function filterGitIgnored(repoRoot, relativePaths) {
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
 *
 * @param {string} repoRoot
 * @param {CodemapConfig} config
 * @returns {string[]}
 */
export function collectSourceFiles(repoRoot, config) {
    const excludeRegexps = config.exclude.map(globToRegExp);
    /** @type {Set<string>} */
    const seen = new Set();

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
            if (rel.endsWith('.d.ts') && !rel.startsWith('src/types/')) continue;
            seen.add(rel);
        }
    }

    const tracked = filterGitIgnored(repoRoot, [...seen]);
    return tracked.map((rel) => path.join(repoRoot, rel)).sort();
}

/**
 * Whitespace-normalize a TS source slice using the scanner, preserving string-literal
 * contents while collapsing all trivia (newlines, indentation, comments) to single spaces.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeSignature(text) {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ false);
    scanner.setText(text);
    let out = '';
    let needsSpace = false;
    while (true) {
        const tok = scanner.scan();
        if (tok === ts.SyntaxKind.EndOfFileToken) break;
        if (
            tok === ts.SyntaxKind.WhitespaceTrivia ||
            tok === ts.SyntaxKind.NewLineTrivia ||
            tok === ts.SyntaxKind.SingleLineCommentTrivia ||
            tok === ts.SyntaxKind.MultiLineCommentTrivia ||
            tok === ts.SyntaxKind.ShebangTrivia ||
            tok === ts.SyntaxKind.ConflictMarkerTrivia
        ) {
            needsSpace = out.length > 0;
            continue;
        }
        if (needsSpace) out += ' ';
        out += scanner.getTokenText();
        needsSpace = false;
    }
    return out.trim();
}

/**
 * Truncate a normalized signature to `maxLen` characters, appending an ellipsis when cut.
 *
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncateSignature(text, maxLen) {
    return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

/**
 * Stringify a JSDoc `comment` field, which can be either a plain string or a NodeArray
 * of JSDoc child nodes (text + @link references). Uses local property access so it works
 * on nodes harvested via `node.jsDoc` (which can lack parent-source linkage that
 * `ts.getTextOfJSDocComment` requires).
 *
 * @param {string | undefined | ReadonlyArray<{ kind: number; text?: string; name?: { text?: string } }>} comment
 * @returns {string}
 */
function jsDocCommentToText(comment) {
    if (typeof comment === 'string') return comment;
    if (!comment) return '';
    let result = '';
    for (const part of comment) {
        if (typeof part.text === 'string') {
            result += part.text;
            continue;
        }
        const linkName = part.name && typeof part.name.text === 'string' ? part.name.text : '';
        if (linkName) result += linkName;
    }
    return result;
}

/**
 * Extract the leading-paragraph JSDoc for a node, preserving `@deprecated`, the first
 * `@example`, and `@since` tags. Drops `@param`/`@returns`. Returns `undefined` when
 * no JSDoc is present.
 *
 * @param {ts.Node} node
 * @returns {string | undefined}
 */
export function extractJSDoc(node) {
    const directJsDocs = Array.isArray(node.jsDoc) ? node.jsDoc.filter((n) => n.kind === ts.SyntaxKind.JSDoc) : [];
    const jsDocNodes =
        directJsDocs.length > 0 ? directJsDocs : ts.getJSDocCommentsAndTags(node).filter((n) => n.kind === ts.SyntaxKind.JSDoc);
    if (jsDocNodes.length === 0) return undefined;
    const doc = jsDocNodes[jsDocNodes.length - 1];

    /** @type {string[]} */
    const parts = [];
    const commentText = jsDocCommentToText(doc.comment);
    const firstParagraph = commentText
        .split(/\n\s*\n/, 1)[0]
        .replace(/\s+/g, ' ')
        .trim();
    if (firstParagraph.length > 0) parts.push(firstParagraph);

    const tags = doc.tags ?? [];
    let exampleSeen = false;
    for (const tag of tags) {
        const tagName = tag.tagName.escapedText.toString();
        if (tagName === 'deprecated') {
            const tagText = jsDocCommentToText(tag.comment);
            parts.push(`@deprecated${tagText ? ` ${tagText.replace(/\s+/g, ' ').trim()}` : ''}`);
        } else if (tagName === 'since') {
            const tagText = jsDocCommentToText(tag.comment);
            parts.push(`@since${tagText ? ` ${tagText.replace(/\s+/g, ' ').trim()}` : ''}`);
        } else if (tagName === 'example' && !exampleSeen) {
            const tagText = jsDocCommentToText(tag.comment);
            const exampleSummary = truncateSignature(tagText.replace(/\s+/g, ' ').trim(), 80);
            if (exampleSummary.length > 0) parts.push(`@example ${exampleSummary}`);
            exampleSeen = true;
        }
    }
    const joined = parts.join(' ').trim();
    return joined.length > 0 ? joined : undefined;
}

/**
 * Read `@sideEffect` tag(s) attached to any leading file-overview block comment.
 *
 * @param {ts.SourceFile} sourceFile
 * @returns {string[]}
 */
export function extractSideEffects(sourceFile) {
    const text = sourceFile.text;
    /** @type {string[]} */
    const results = [];
    const ranges = ts.getLeadingCommentRanges(text, 0) ?? [];
    for (const range of ranges) {
        if (range.kind !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
        const block = text.slice(range.pos, range.end);
        for (const match of block.matchAll(/@sideEffect\s+([^*\n][^*\n]*?)(?:\s*\*\/|\s*\n)/g)) {
            results.push(match[1].replace(/\s+/g, ' ').trim());
        }
    }
    if (results.length === 0) {
        const firstStatement = sourceFile.statements[0];
        if (firstStatement) {
            const directDocs = Array.isArray(firstStatement.jsDoc)
                ? firstStatement.jsDoc.filter((n) => n.kind === ts.SyntaxKind.JSDoc)
                : [];
            const jsDocs =
                directDocs.length > 0
                    ? directDocs
                    : ts.getJSDocCommentsAndTags(firstStatement).filter((n) => n.kind === ts.SyntaxKind.JSDoc);
            for (const doc of jsDocs) {
                for (const tag of doc.tags ?? []) {
                    if (tag.tagName.escapedText.toString() === 'sideEffect') {
                        const tagText = jsDocCommentToText(tag.comment);
                        const cleaned = tagText.replace(/\s+/g, ' ').trim();
                        if (cleaned.length > 0) results.push(cleaned);
                    }
                }
            }
        }
    }
    return results;
}

/**
 * Compute a signature for a declaration: slice from declaration start to body start
 * (for function-like and class shells), or the full node text otherwise. Always
 * whitespace-normalized via the TS scanner. Truncated to `maxLen`.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {ts.Node} node
 * @param {number} maxLen
 * @returns {string}
 */
export function extractSignature(sourceFile, node, maxLen) {
    const start = node.getStart(sourceFile);
    let end = node.getEnd();
    if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
    ) {
        if (node.body) end = node.body.getStart(sourceFile);
    } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        const braceToken = node.getChildren(sourceFile).find((c) => c.kind === ts.SyntaxKind.OpenBraceToken);
        if (braceToken) end = braceToken.getStart(sourceFile);
    }
    const raw = sourceFile.text.slice(start, end);
    return truncateSignature(normalizeSignature(raw), maxLen);
}

/**
 * Build the per-class `members` array. Returns members sorted by source line ascending.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {ts.ClassDeclaration | ts.ClassExpression} classNode
 * @returns {{ name: string, kind: string, line: number }[]}
 */
export function extractClassMembers(sourceFile, classNode) {
    /** @type {{ name: string, kind: string, line: number }[]} */
    const members = [];
    for (const member of classNode.members) {
        const memberKind = SYNTAX_KIND_TO_MEMBER_KIND.get(member.kind);
        if (!memberKind) continue;
        const name = memberKind === 'constructor' ? 'constructor' : member.name ? memberNameText(member.name) : undefined;
        if (name === undefined) continue;
        members.push({
            name,
            kind: memberKind,
            line: sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile)).line + 1,
        });
    }
    return members.sort((a, b) => a.line - b.line || cmp(a.name, b.name));
}

/**
 * @param {ts.PropertyName | ts.BindingName} nameNode
 * @returns {string | undefined}
 */
function memberNameText(nameNode) {
    if (ts.isIdentifier(nameNode) || ts.isPrivateIdentifier(nameNode)) return nameNode.text;
    if (ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) return nameNode.text;
    if (ts.isComputedPropertyName(nameNode)) return nameNode.getText().replace(/\s+/g, '');
    return undefined;
}

/**
 * Build a signature for a `const X = ...` declaration. Literal-aware: preserves small
 * object/array/primitive initializers but treats arrow-fn / function-expression
 * initializers as function signatures (slice up to body).
 *
 * @param {ts.SourceFile} sourceFile
 * @param {ts.VariableStatement} statement
 * @param {ts.VariableDeclaration} declaration
 * @param {number} maxLen
 * @returns {string}
 */
function extractVariableSignature(sourceFile, statement, declaration, maxLen) {
    const isMultiDeclarator = statement.declarationList.declarations.length > 1;
    const keyword =
        statement.declarationList.flags & ts.NodeFlags.Const ? 'const' : statement.declarationList.flags & ts.NodeFlags.Let ? 'let' : 'var';
    const declaratorPrefix = isMultiDeclarator
        ? `${keyword} `
        : sourceFile.text.slice(statement.getStart(sourceFile), declaration.getStart(sourceFile));

    const initializer = declaration.initializer;
    if (!initializer) {
        const declText = sourceFile.text.slice(declaration.getStart(sourceFile), declaration.getEnd());
        return truncateSignature(normalizeSignature(`${declaratorPrefix}${declText}`), maxLen);
    }
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        const end = initializer.body ? initializer.body.getStart(sourceFile) : initializer.getEnd();
        const declText = sourceFile.text.slice(declaration.getStart(sourceFile), end);
        return truncateSignature(normalizeSignature(`${declaratorPrefix}${declText}`), maxLen);
    }
    if (LITERAL_INITIALIZER_KINDS.has(initializer.kind)) {
        const declText = sourceFile.text.slice(declaration.getStart(sourceFile), declaration.getEnd());
        return truncateSignature(normalizeSignature(`${declaratorPrefix}${declText}`), maxLen);
    }
    const nameAndType = sourceFile.text.slice(
        declaration.getStart(sourceFile),
        declaration.type ? declaration.type.getEnd() : declaration.name.getEnd(),
    );
    return truncateSignature(normalizeSignature(`${declaratorPrefix}${nameAndType}`), maxLen);
}

/**
 * @param {ts.Node} node
 * @returns {boolean}
 */
function hasExportModifier(node) {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
}

/**
 * Walk the top-level statements of a source file, producing the per-file symbols,
 * imports, and re-exports arrays expected by schema codemap.v2.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {string} relativePath
 * @param {number} maxSignatureLength
 * @returns {CodemapFile}
 */
export function extractFileSymbols(sourceFile, relativePath, maxSignatureLength) {
    /** @type {FileSymbol[]} */
    const symbols = [];
    /** @type {Set<string>} */
    const imports = new Set();
    /** @type {FileReExport[]} */
    const reExports = [];

    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
            imports.add(statement.moduleSpecifier.text);
            continue;
        }
        if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
            const source = statement.moduleSpecifier.text;
            const typeOnly = statement.isTypeOnly;
            if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
                const names = statement.exportClause.elements.map((el) => el.name.text).sort();
                reExports.push({ source, names, typeOnly });
            } else {
                reExports.push({ source, names: '*', typeOnly });
            }
            continue;
        }
        appendSymbolsForStatement(sourceFile, statement, symbols, maxSignatureLength);
    }

    symbols.sort((a, b) => a.line - b.line || cmp(a.name, b.name));
    reExports.sort((a, b) => cmp(a.source, b.source) || compareReExportNames(a.names, b.names));

    return {
        path: relativePath,
        symbols,
        imports: [...imports].sort(),
        reExports,
    };
}

/**
 * @param {string | string[]} a
 * @param {string | string[]} b
 * @returns {number}
 */
function compareReExportNames(a, b) {
    if (typeof a === 'string' && typeof b === 'string') return cmp(a, b);
    if (typeof a === 'string') return -1;
    if (typeof b === 'string') return 1;
    return cmp(a.join(','), b.join(','));
}

/**
 * @param {ts.SourceFile} sourceFile
 * @param {ts.Statement} statement
 * @param {FileSymbol[]} symbols
 * @param {number} maxSignatureLength
 */
function appendSymbolsForStatement(sourceFile, statement, symbols, maxSignatureLength) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
        symbols.push(buildSymbol(sourceFile, statement, statement.name.text, 'function', maxSignatureLength, null));
        return;
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
        symbols.push(
            buildSymbol(
                sourceFile,
                statement,
                statement.name.text,
                'class',
                maxSignatureLength,
                extractClassMembers(sourceFile, statement),
            ),
        );
        return;
    }
    if (ts.isInterfaceDeclaration(statement)) {
        symbols.push(buildSymbol(sourceFile, statement, statement.name.text, 'interface', maxSignatureLength, null));
        return;
    }
    if (ts.isTypeAliasDeclaration(statement)) {
        symbols.push(buildSymbol(sourceFile, statement, statement.name.text, 'type', maxSignatureLength, null));
        return;
    }
    if (ts.isEnumDeclaration(statement)) {
        symbols.push(buildSymbol(sourceFile, statement, statement.name.text, 'enum', maxSignatureLength, null));
        return;
    }
    if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name)) continue;
            symbols.push({
                name: declaration.name.text,
                kind: 'const',
                line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile)).line + 1,
                exported: hasExportModifier(statement),
                signature: extractVariableSignature(sourceFile, statement, declaration, maxSignatureLength),
                members: null,
                jsdoc: extractJSDoc(statement) ?? null,
            });
        }
    }
}

/**
 * @param {ts.SourceFile} sourceFile
 * @param {ts.Declaration} node
 * @param {string} name
 * @param {'function' | 'class' | 'interface' | 'type' | 'enum'} kind
 * @param {number} maxSignatureLength
 * @param {Array<{name:string,kind:string,line:number}> | null} members
 * @returns {FileSymbol}
 */
function buildSymbol(sourceFile, node, name, kind, maxSignatureLength, members) {
    return {
        name,
        kind,
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        exported: hasExportModifier(node),
        signature: extractSignature(sourceFile, node, maxSignatureLength),
        members,
        jsdoc: extractJSDoc(node) ?? null,
    };
}

/**
 * Resolve a module specifier from `fromFile` to a relative path within the program.
 * Returns undefined for non-relative specifiers (external packages).
 *
 * @param {string} specifier
 * @param {string} fromFileAbs
 * @param {Map<string, ts.SourceFile>} sourceFileMap
 * @returns {string | undefined}
 */
function resolveSpecifier(specifier, fromFileAbs, sourceFileMap) {
    if (!specifier.startsWith('.')) return undefined;
    const baseDir = path.dirname(fromFileAbs);
    const resolved = path.resolve(baseDir, specifier);
    const candidates = ['', '.ts', '.mts', '.cts', '.d.ts', '/index.ts', '/index.mts'];
    for (const suffix of candidates) {
        const candidate = `${resolved}${suffix}`;
        if (sourceFileMap.has(candidate)) return candidate;
    }
    const withoutJs = resolved.replace(/\.(m?js)$/, '');
    if (withoutJs !== resolved) {
        for (const suffix of ['.ts', '.mts', '.cts']) {
            const candidate = `${withoutJs}${suffix}`;
            if (sourceFileMap.has(candidate)) return candidate;
        }
    }
    return undefined;
}

/**
 * Find the local declaration node and metadata for a given name within `sourceFile`.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {string} name
 * @returns {{ node: ts.Statement, declarationName: string, kind: PublicApiKind, typeOnly: boolean } | undefined}
 */
function findLocalDeclaration(sourceFile, name) {
    for (const statement of sourceFile.statements) {
        if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name) {
            return {
                node: statement,
                declarationName: name,
                kind: ts.isFunctionDeclaration(statement) ? 'function' : 'class',
                typeOnly: false,
            };
        }
        if (ts.isInterfaceDeclaration(statement) && statement.name.text === name) {
            return { node: statement, declarationName: name, kind: 'interface', typeOnly: true };
        }
        if (ts.isTypeAliasDeclaration(statement) && statement.name.text === name) {
            return { node: statement, declarationName: name, kind: 'type', typeOnly: true };
        }
        if (ts.isEnumDeclaration(statement) && statement.name.text === name) {
            return { node: statement, declarationName: name, kind: 'enum', typeOnly: false };
        }
        if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                    return { node: statement, declaration, declarationName: name, kind: 'const', typeOnly: false };
                }
            }
        }
    }
    return undefined;
}

/**
 * Resolve all symbols transitively exported from `sourceFile`. Each entry includes the
 * file path of the original declaration. Cycle-safe; depth-capped.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {Map<string, ts.SourceFile>} sourceFileMap
 * @param {string} repoRoot
 * @param {number} maxSignatureLength
 * @param {Set<string>} visited
 * @param {number} depth
 * @returns {ResolvedExport[]}
 */
function resolveExportsFor(sourceFile, sourceFileMap, repoRoot, maxSignatureLength, visited, depth) {
    if (depth > TRANSITIVE_DEPTH_LIMIT) return [];
    if (visited.has(sourceFile.fileName)) return [];
    visited.add(sourceFile.fileName);

    /** @type {ResolvedExport[]} */
    const collected = [];

    for (const statement of sourceFile.statements) {
        if (ts.isExportDeclaration(statement)) {
            const stmtTypeOnly = statement.isTypeOnly;
            if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
                const targetAbs = resolveSpecifier(statement.moduleSpecifier.text, sourceFile.fileName, sourceFileMap);
                if (!targetAbs) continue;
                const target = sourceFileMap.get(targetAbs);
                if (!target) continue;
                const targetExports = resolveExportsFor(target, sourceFileMap, repoRoot, maxSignatureLength, new Set(visited), depth + 1);

                if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
                    for (const element of statement.exportClause.elements) {
                        const original = element.propertyName?.text ?? element.name.text;
                        const exposedAs = element.name.text;
                        const match = targetExports.find((e) => e.exposedAs === original);
                        if (match) {
                            collected.push({ ...match, exposedAs, typeOnly: stmtTypeOnly || element.isTypeOnly || match.typeOnly });
                        }
                    }
                } else {
                    for (const exp of targetExports) {
                        collected.push({ ...exp, typeOnly: stmtTypeOnly || exp.typeOnly });
                    }
                }
                continue;
            }
            if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
                for (const element of statement.exportClause.elements) {
                    const original = element.propertyName?.text ?? element.name.text;
                    const exposedAs = element.name.text;
                    const local = findLocalDeclaration(sourceFile, original);
                    if (!local) continue;
                    collected.push({
                        exposedAs,
                        kind: local.kind,
                        file: posixRelativePath(repoRoot, sourceFile.fileName),
                        line: sourceFile.getLineAndCharacterOfPosition((local.declaration ?? local.node).getStart(sourceFile)).line + 1,
                        signature: signatureForLocal(sourceFile, local, maxSignatureLength),
                        jsdoc: extractJSDoc(local.node) ?? null,
                        typeOnly: stmtTypeOnly || element.isTypeOnly || local.typeOnly,
                    });
                }
            }
            continue;
        }
        if (!hasExportModifier(statement)) continue;

        if (ts.isFunctionDeclaration(statement) && statement.name) {
            collected.push(buildResolved(sourceFile, repoRoot, statement, statement.name.text, 'function', false, maxSignatureLength));
        } else if (ts.isClassDeclaration(statement) && statement.name) {
            collected.push(buildResolved(sourceFile, repoRoot, statement, statement.name.text, 'class', false, maxSignatureLength));
        } else if (ts.isInterfaceDeclaration(statement)) {
            collected.push(buildResolved(sourceFile, repoRoot, statement, statement.name.text, 'interface', true, maxSignatureLength));
        } else if (ts.isTypeAliasDeclaration(statement)) {
            collected.push(buildResolved(sourceFile, repoRoot, statement, statement.name.text, 'type', true, maxSignatureLength));
        } else if (ts.isEnumDeclaration(statement)) {
            collected.push(buildResolved(sourceFile, repoRoot, statement, statement.name.text, 'enum', false, maxSignatureLength));
        } else if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name)) continue;
                collected.push({
                    exposedAs: declaration.name.text,
                    kind: 'const',
                    file: posixRelativePath(repoRoot, sourceFile.fileName),
                    line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile)).line + 1,
                    signature: extractVariableSignature(sourceFile, statement, declaration, maxSignatureLength),
                    jsdoc: extractJSDoc(statement) ?? null,
                    typeOnly: false,
                });
            }
        }
    }
    return collected;
}

/**
 * @param {ts.SourceFile} sourceFile
 * @param {{ node: ts.Statement, kind: PublicApiKind }} local
 * @param {number} maxLen
 * @returns {string}
 */
function signatureForLocal(sourceFile, local, maxLen) {
    if (local.kind === 'const' && ts.isVariableStatement(local.node) && local.declaration) {
        return extractVariableSignature(sourceFile, local.node, local.declaration, maxLen);
    }
    return extractSignature(sourceFile, local.node, maxLen);
}

/**
 * @param {ts.SourceFile} sourceFile
 * @param {string} repoRoot
 * @param {ts.Declaration} node
 * @param {string} name
 * @param {PublicApiKind} kind
 * @param {boolean} typeOnly
 * @param {number} maxLen
 * @returns {ResolvedExport}
 */
function buildResolved(sourceFile, repoRoot, node, name, kind, typeOnly, maxLen) {
    return {
        exposedAs: name,
        kind,
        file: posixRelativePath(repoRoot, sourceFile.fileName),
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        signature: extractSignature(sourceFile, node, maxLen),
        jsdoc: extractJSDoc(node) ?? null,
        typeOnly,
    };
}

/**
 * @param {string} repoRoot
 * @param {string} absPath
 * @returns {string}
 */
function posixRelativePath(repoRoot, absPath) {
    return path.relative(repoRoot, absPath).split(path.sep).join('/');
}

/**
 * @param {Map<string, string>} fileContents
 * @param {string} rawConfig
 * @returns {string}
 */
export function computeSourceHash(fileContents, rawConfig) {
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
 *
 * @param {CodemapDocument} codemap
 * @returns {string}
 */
export function formatMarkdown(codemap) {
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

/**
 * Generate the codemap document as a string. Pure function: no filesystem writes.
 *
 * @param {{ repoRoot: string }} options
 * @returns {{ markdown: string, codemap: CodemapDocument }}
 */
export function generate({ repoRoot }) {
    const { config, raw: rawConfig } = loadConfig(repoRoot);
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const absSourcePaths = collectSourceFiles(repoRoot, config);

    const program = ts.createProgram(absSourcePaths, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        allowJs: false,
        noEmit: true,
    });

    /** @type {Map<string, ts.SourceFile>} */
    const sourceFileMap = new Map();
    /** @type {Map<string, string>} */
    const fileContents = new Map();
    /** @type {CodemapFile[]} */
    const files = [];

    const absSourcePathSet = new Set(absSourcePaths);
    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile) continue;
        if (!absSourcePathSet.has(sourceFile.fileName)) continue;
        sourceFileMap.set(sourceFile.fileName, sourceFile);
        const relativePath = posixRelativePath(repoRoot, sourceFile.fileName);
        fileContents.set(relativePath, sourceFile.text);
        files.push(extractFileSymbols(sourceFile, relativePath, config.maxSignatureLength));
    }

    files.sort((a, b) => cmp(a.path, b.path));

    /** @type {PublicApiEntry[]} */
    const publicApi = [];
    for (const entrypointRel of config.entrypoints) {
        const abs = path.join(repoRoot, entrypointRel);
        const sourceFile = sourceFileMap.get(abs);
        if (!sourceFile) continue;
        const resolved = resolveExportsFor(sourceFile, sourceFileMap, repoRoot, config.maxSignatureLength, new Set(), 0);
        const sideEffects = extractSideEffects(sourceFile);
        const entrypointRelPath = posixRelativePath(repoRoot, sourceFile.fileName);
        for (const entry of resolved) {
            publicApi.push({
                name: entry.exposedAs,
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

    /** @type {CodemapDocument} */
    const codemap = {
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
 *
 * @param {{ repoRoot: string }} options
 * @returns {{ ok: true } | { ok: false, diff: string }}
 */
export function check({ repoRoot }) {
    const { markdown } = generate({ repoRoot });
    const outputPath = path.join(repoRoot, OUTPUT_FILENAME);
    let committed = '';
    try {
        committed = readFileSync(outputPath, 'utf8');
    } catch {
        return { ok: false, diff: `error: ${OUTPUT_FILENAME} not found at ${outputPath}` };
    }
    if (committed === markdown) return { ok: true };
    return { ok: false, diff: unifiedDiff(committed, markdown, 40) };
}

/**
 * Build a minimal unified diff between `before` and `after`, capped to `maxLines` of output.
 *
 * @param {string} before
 * @param {string} after
 * @param {number} maxLines
 * @returns {string}
 */
export function unifiedDiff(before, after, maxLines) {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    /** @type {string[]} */
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

async function main() {
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

const invokedAsCli =
    import.meta.url === pathToFileURL(process.argv[1] ?? '').href ||
    (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (invokedAsCli) {
    await main();
}
