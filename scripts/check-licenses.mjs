import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const allowedLicenses = new Set(['ISC', 'MIT', 'MIT OR X11', 'BSD', 'Apache-2.0', 'Unlicense']);

function readProductionDependencyPaths() {
    const output = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    });

    return output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .slice(1);
}

function readPackageMetadata(packagePath) {
    const packageJsonPath = path.join(packagePath, 'package.json');
    return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

const disallowedPackages = [];

for (const dependencyPath of readProductionDependencyPaths()) {
    const packageMetadata = readPackageMetadata(dependencyPath);
    const license = typeof packageMetadata.license === 'string' ? packageMetadata.license : undefined;

    if (license === undefined || !allowedLicenses.has(license)) {
        disallowedPackages.push({
            name: packageMetadata.name,
            version: packageMetadata.version,
            license: license ?? 'UNKNOWN',
        });
    }
}

if (disallowedPackages.length > 0) {
    for (const dependency of disallowedPackages) {
        console.error(
            `Package "${dependency.name}@${dependency.version}" is licensed under "${dependency.license}" which is not permitted.`,
        );
    }
    process.exit(1);
}

console.log('All production dependency licenses are permitted.');
