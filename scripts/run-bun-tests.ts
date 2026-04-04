/**
 * Test runner für Bun mit Hybrid-Modus.
 *
 * DEFAULT: Gemischter Lauf (schneller und trotzdem stabil)
 * - Dateien ohne Modul-Mocks werden zusammen in EINEM Bun-Prozess ausgeführt.
 * - Dateien mit `vi.mock()`, `vi.hoisted()` oder `mock.module()` laufen isoliert
 *   jeweils in einem eigenen Prozess, damit kein Modul-/Global-State leakt.
 * - Wenn ein Sammellauf trotzdem flakey ist, werden die betroffenen Dateien
 *   automatisch einzeln erneut ausgeführt.
 *
 * SERIAL-RESET (--serial-reset Flag):
 * - Mock-/pollution-sensitive Dateien laufen seriell in EINEM Bun-Prozess
 *   mit `--max-concurrency 1`.
 * - Das ist ein Best-Effort-Modus: schneller als volle Prozess-Isolation,
 *   aber bei Instabilität fällt der Runner automatisch auf Einzelruns zurück.
 *
 * CONCURRENT (--concurrent Flag):
 * - Alle Dateien gemeinsam mit `bun test --concurrent`
 * - Schnellster Modus, aber bewusst ohne Pollutions-Schutz
 *
 * USAGE:
 *  bun run test                    # Hybrid-Modus (Standard)
 *  bun run test:serial-reset       # Hybrid + serial-reset für sensible Dateien
 *  bun run test --concurrent       # Alles parallel, ohne Extra-Isolation
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const testDir = path.join(rootDir, 'test');
const pollutionRiskPatterns = [/\bvi\.hoisted\s*\(/, /\bvi\.mock\s*\(/, /\bmock\.module\s*\(/];

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

async function collectTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__snapshots__') return [];
        return collectTestFiles(fullPath);
      }

      if (entry.isFile() && /\.test\.(ts|tsx)$/.test(entry.name)) {
        return [path.relative(rootDir, fullPath)];
      }

      return [];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

async function resolveTargets(rawArgs: string[]): Promise<string[]> {
  if (rawArgs.length === 0) {
    return collectTestFiles(testDir);
  }

  return rawArgs;
}

async function requiresIsolation(target: string): Promise<boolean> {
  try {
    const source = await readFile(path.join(rootDir, target), 'utf8');
    return pollutionRiskPatterns.some(pattern => pattern.test(source));
  } catch {
    console.log(c.red(`Konnte ${target} nicht analysieren – laufe sicherheitshalber isoliert.`));
    return true;
  }
}

async function splitTargetsByIsolation(
  targets: string[],
): Promise<{ batchedTargets: string[]; isolatedTargets: string[] }> {
  const classifications = await Promise.all(
    targets.map(async target => ({
      target,
      isolated: await requiresIsolation(target),
    })),
  );

  return {
    batchedTargets: classifications.filter(entry => !entry.isolated).map(entry => entry.target),
    isolatedTargets: classifications.filter(entry => entry.isolated).map(entry => entry.target),
  };
}

async function runTestCommand(bunBinary: string, targets: string[], extraArgs: string[] = []): Promise<number> {
  if (targets.length === 0) {
    return 0;
  }

  const subprocess = Bun.spawn({
    cmd: [bunBinary, 'test', ...extraArgs, ...targets],
    cwd: rootDir,
    // CLAUDECODE=1: zeigt kompakte Fehler/Summary statt vollem Pass-Noise.
    // CI=1: plain-text Ausgabe ohne Cursor-Rewrites.
    env: { ...process.env, CI: '1', CLAUDECODE: '1' },
    stdout: 'inherit',
    stderr: 'inherit',
  });

  return await subprocess.exited;
}

async function run(): Promise<void> {
  const args = Bun.argv.slice(2);
  const useConcurrent = args.includes('--concurrent');
  const useSerialReset = args.includes('--serial-reset');
  const filteredArgs = args.filter(arg => arg !== '--concurrent' && arg !== '--serial-reset');
  const targets = await resolveTargets(filteredArgs);

  if (useConcurrent && useSerialReset) {
    console.error('--concurrent und --serial-reset können nicht kombiniert werden.');
    process.exit(1);
  }

  if (targets.length === 0) {
    console.error('Keine Testdateien gefunden.');
    process.exit(1);
  }

  const bunBinary = Bun.which('bun') ?? 'bun';
  const failed = new Set<string>();

  if (useConcurrent) {
    const exitCode = await runTestCommand(bunBinary, targets, ['--concurrent']);
    if (exitCode !== 0) {
      console.log('\n' + '─'.repeat(60));
      console.log(c.red('Fehler beim Concurrent-Test'));
      process.exit(exitCode);
    }

    console.log('\n' + '─'.repeat(60));
    console.log(c.green(`✓ Alle ${targets.length} Dateien bestanden (concurrent mode)`));
    return;
  }

  const { batchedTargets, isolatedTargets } = await splitTargetsByIsolation(targets);
  console.log(
    c.dim(
      `Hybrid-Modus${useSerialReset ? ' + serial-reset' : ''}: ` +
        `${batchedTargets.length} Datei(en) gemeinsam, ${isolatedTargets.length} Datei(en) ` +
        `${useSerialReset ? 'seriell-reset' : 'isoliert'}.`,
    ),
  );

  if (batchedTargets.length > 0) {
    const batchExitCode = await runTestCommand(bunBinary, batchedTargets, ['--max-concurrency', '1']);

    if (batchExitCode !== 0) {
      console.log(c.red('\nSammellauf war nicht stabil – prüfe die betroffenen Dateien einzeln...'));
      for (const target of batchedTargets) {
        const exitCode = await runTestCommand(bunBinary, [target], ['--max-concurrency', '1']);
        if (exitCode !== 0) {
          failed.add(target);
        }
      }
    }
  }

  if (useSerialReset && isolatedTargets.length > 0) {
    const serialResetExitCode = await runTestCommand(bunBinary, isolatedTargets, ['--max-concurrency', '1']);

    if (serialResetExitCode !== 0) {
      console.log(c.red('\nSerial-reset Lauf war nicht stabil – prüfe sensible Dateien einzeln...'));
      for (const target of isolatedTargets) {
        const exitCode = await runTestCommand(bunBinary, [target], ['--max-concurrency', '1']);
        if (exitCode !== 0) {
          failed.add(target);
        }
      }
    }
  } else {
    for (const target of isolatedTargets) {
      const exitCode = await runTestCommand(bunBinary, [target], ['--max-concurrency', '1']);
      if (exitCode !== 0) {
        failed.add(target);
      }
    }
  }

  const total = targets.length;
  const failedTargets = Array.from(failed);
  const passed = total - failedTargets.length;

  console.log('\n' + '─'.repeat(60));
  console.log(
    `Dateien: ${total}  ${c.green(`✓ ${passed} bestanden`)}` +
      (failedTargets.length > 0 ? `  ${c.red(`✗ ${failedTargets.length} fehlgeschlagen`)}` : ''),
  );

  if (failedTargets.length > 0) {
    console.log(c.red('\nFehlgeschlagene Dateien:'));
    for (const target of failedTargets) {
      console.log(c.red('  ✗ ') + c.dim(target));
    }
    process.exit(1);
  }
}

await run();
