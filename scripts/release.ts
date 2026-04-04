import { readFileSync, writeFileSync } from 'node:fs';

const bumpType = (process.argv[2] ?? 'patch').toLowerCase();
const dryRun = process.argv.includes('--dry-run');
const validBumpTypes = new Set(['patch', 'minor', 'major']);

if (!validBumpTypes.has(bumpType)) {
  console.error('Usage: bun ./scripts/release.ts <patch|minor|major> [--dry-run]');
  process.exit(1);
}

const packageJsonPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
const currentVersion = pkg.version ?? '0.0.0';
let [major, minor, patch] = currentVersion.split('.').map(Number);

if ([major, minor, patch].some(value => Number.isNaN(value))) {
  console.error(`Invalid semantic version in package.json: ${currentVersion}`);
  process.exit(1);
}

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const nextVersion = `${major}.${minor}.${patch}`;

if (!dryRun) {
  pkg.version = nextVersion;
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(`${dryRun ? 'Preview' : 'Version bumped'} (${bumpType}): ${currentVersion} -> ${nextVersion}`);
