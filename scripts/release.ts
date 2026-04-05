import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const bumpType = (args.find(arg => !arg.startsWith('--')) ?? 'patch').toLowerCase();
const dryRun = args.includes('--dry-run');
const shouldCommit = args.includes('--commit') || args.includes('--push');
const shouldPush = args.includes('--push');
const remoteFlagIndex = args.indexOf('--remote');
const remote = remoteFlagIndex >= 0 ? args[remoteFlagIndex + 1] : 'origin';
const validBumpTypes = new Set(['patch', 'minor', 'major']);

if (remoteFlagIndex >= 0 && !remote) {
  console.error('Usage: --remote <name> requires a value.');
  process.exit(1);
}

if (!validBumpTypes.has(bumpType)) {
  console.error(
    'Usage: bun ./scripts/release.ts <patch|minor|major> [--dry-run] [--commit] [--push] [--remote <name>]',
  );
  process.exit(1);
}

function runGit(commandArgs: string[]): string {
  return execFileSync('git', commandArgs, { encoding: 'utf8' }).trim();
}

function ensureCleanWorkingTree(): void {
  const status = runGit(['status', '--porcelain']);
  if (status.length === 0) return;

  console.error('Working tree must be clean before running release with --commit/--push.');
  console.error(status);
  process.exit(1);
}

function getCurrentBranch(): string {
  const branch = runGit(['branch', '--show-current']);
  if (!branch) {
    console.error('Cannot determine current git branch for release push.');
    process.exit(1);
  }
  return branch;
}

if (shouldCommit && !dryRun) {
  ensureCleanWorkingTree();
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
const releaseCommitMessage = `chore(release): bump version to ${nextVersion}`;

if (!dryRun) {
  pkg.version = nextVersion;
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(`${dryRun ? 'Preview' : 'Version bumped'} (${bumpType}): ${currentVersion} -> ${nextVersion}`);

if (!shouldCommit) {
  process.exit(0);
}

const branch = getCurrentBranch();

if (dryRun) {
  console.log(`[dry-run] Would create commit: ${releaseCommitMessage}`);
  if (shouldPush) {
    console.log(`[dry-run] Would push '${branch}' to '${remote}'`);
  }
  process.exit(0);
}

runGit(['add', 'package.json']);
runGit(['commit', '-m', releaseCommitMessage]);
console.log(`Release commit created: ${releaseCommitMessage}`);

if (shouldPush) {
  runGit(['push', remote, branch]);
  console.log(`Release branch pushed: ${remote}/${branch}`);
}
