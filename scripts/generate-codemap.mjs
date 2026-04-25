import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function collectTypeScriptFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectTypeScriptFiles(fullPath));
            continue;
        }
        if (entry.isFile() && fullPath.endsWith('.ts')) {
            files.push(fullPath);
        }
    }

    return files.sort();
}

function isExported(node) {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
}

function toSingleLine(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function getDeclarationText(sourceFile, node) {
    return toSingleLine(node.getText(sourceFile));
}

function collectSymbols(sourceFile) {
    const symbols = [];

    for (const statement of sourceFile.statements) {
        if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
            symbols.push({
                name: statement.name.text,
                kind: 'function',
                exported: isExported(statement),
                line: sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1,
                declaration: getDeclarationText(sourceFile, statement),
            });
            continue;
        }
        if (ts.isTypeAliasDeclaration(statement)) {
            symbols.push({
                name: statement.name.text,
                kind: 'type',
                exported: isExported(statement),
                line: sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1,
                declaration: getDeclarationText(sourceFile, statement),
            });
            continue;
        }
        if (ts.isInterfaceDeclaration(statement)) {
            symbols.push({
                name: statement.name.text,
                kind: 'interface',
                exported: isExported(statement),
                line: sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1,
                declaration: getDeclarationText(sourceFile, statement),
            });
            continue;
        }
        if (ts.isClassDeclaration(statement) && statement.name !== undefined) {
            symbols.push({
                name: statement.name.text,
                kind: 'class',
                exported: isExported(statement),
                line: sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1,
                declaration: getDeclarationText(sourceFile, statement),
            });
            continue;
        }
        if (ts.isEnumDeclaration(statement)) {
            symbols.push({
                name: statement.name.text,
                kind: 'enum',
                exported: isExported(statement),
                line: sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1,
                declaration: getDeclarationText(sourceFile, statement),
            });
            continue;
        }
        if (ts.isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name)) {
                    continue;
                }
                symbols.push({
                    name: declaration.name.text,
                    kind: 'const',
                    exported: isExported(statement),
                    line: sourceFile.getLineAndCharacterOfPosition(declaration.getStart(sourceFile)).line + 1,
                    declaration: getDeclarationText(sourceFile, statement),
                });
            }
        }
    }

    return symbols;
}

function collectEntrypointExports(sourceFile) {
    const exports = [];

    for (const statement of sourceFile.statements) {
        if (ts.isExportDeclaration(statement)) {
            const source =
                statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
                    ? statement.moduleSpecifier.text
                    : undefined;
            if (statement.exportClause !== undefined && ts.isNamedExports(statement.exportClause)) {
                for (const element of statement.exportClause.elements) {
                    exports.push({
                        name: element.name.text,
                        source,
                        typeOnly: statement.isTypeOnly || element.isTypeOnly,
                    });
                }
                continue;
            }
            exports.push({
                name: '*',
                source,
                typeOnly: statement.isTypeOnly,
            });
            continue;
        }
        if (
            (ts.isFunctionDeclaration(statement) ||
                ts.isClassDeclaration(statement) ||
                ts.isInterfaceDeclaration(statement) ||
                ts.isTypeAliasDeclaration(statement) ||
                ts.isEnumDeclaration(statement)) &&
            isExported(statement) &&
            statement.name !== undefined
        ) {
            exports.push({
                name: statement.name.text,
                typeOnly: ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement),
            });
            continue;
        }
        if (ts.isVariableStatement(statement) && isExported(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) {
                    exports.push({ name: declaration.name.text, typeOnly: false });
                }
            }
        }
    }

    return exports;
}

function main() {
    const repoRoot = process.cwd();
    const srcRoot = path.join(repoRoot, 'src');
    const outputPath = path.join(repoRoot, 'CODEMAP.md');
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const sourcePaths = collectTypeScriptFiles(srcRoot);
    const program = ts.createProgram(sourcePaths, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.Node16,
    });

    const files = [];
    let entrypointExports = [];

    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.fileName.startsWith(srcRoot) || sourceFile.isDeclarationFile) {
            continue;
        }

        const relativePath = path.relative(repoRoot, sourceFile.fileName).replaceAll(path.sep, '/');
        files.push({
            path: relativePath,
            symbols: collectSymbols(sourceFile),
        });

        if (relativePath === 'src/index.ts') {
            entrypointExports = collectEntrypointExports(sourceFile);
        }
    }

    files.sort((left, right) => left.path.localeCompare(right.path));
    mkdirSync(path.dirname(outputPath), { recursive: true });

    const codemap = {
        schema: 'codemap.v1',
        generatedAt: new Date().toISOString(),
        package: packageJson,
        entrypoint: 'src/index.ts',
        exports: entrypointExports,
        files,
    };

    const markdown = `# CODEMAP

Generated by \`npm run codemap\`. This file is intentionally machine-readable for coding agents.

\`\`\`json
${JSON.stringify(codemap, null, 2)}
\`\`\`
`;

    writeFileSync(outputPath, markdown);
    process.stdout.write(`Wrote ${path.relative(repoRoot, outputPath)}\n`);
}

main();
