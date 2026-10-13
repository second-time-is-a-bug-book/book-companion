// Scratch copies, so drills and seeded-defect runs never touch
// your work. A scratch copy is this repository copied to a temp
// folder without .git and node_modules, with node_modules
// linked back in, and committed once as a clean git baseline.
// Diff-based guards then see exactly what a mistake changed.
import {
  cpSync,
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { sh } from './shell.ts';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'test-results',
  'playwright-report',
]);
// Run-time output in .harness/, not part of the repository.
const SKIP_FILES = new Set([
  'guard-log.jsonl',
  'evidence.json',
]);

export function makeScratchCopy(
  label: string,
  root = process.cwd(),
): string {
  const dir = mkdtempSync(join(tmpdir(), `${label}-`));
  cpSync(root, dir, {
    recursive: true,
    filter: (source) =>
      !SKIP_DIRS.has(basename(source)) &&
      !SKIP_FILES.has(basename(source)),
  });
  if (existsSync(join(root, 'node_modules'))) {
    symlinkSync(
      join(root, 'node_modules'),
      join(dir, 'node_modules'),
      'junction',
    );
  }
  run('git init -q -b main', dir);
  run('git add -A', dir);
  const name = 'user.name=drill';
  const email = 'user.email=drill@example.invalid';
  run(`git -c ${name} -c ${email} commit -q -m baseline`, dir);
  return dir;
}

// Applies a unified diff (path relative to the repository root)
// and returns git's summary of what it changed.
export function applyPatch(
  dir: string,
  patchFile: string,
): string {
  const stat = run(`git apply --stat "${patchFile}"`, dir);
  run(`git apply "${patchFile}"`, dir);
  return stat;
}

export function removeScratch(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function run(command: string, cwd: string): string {
  const result = sh(command, cwd);
  if (result.code !== 0) {
    const where = `"${command}" failed in ${cwd}`;
    throw new Error(`${where}:\n${result.output}`);
  }
  return result.output;
}
