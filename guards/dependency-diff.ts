// guards/dependency-diff.ts
// The lockfile is law: every dependency must be approved by a
// human, and package.json and package-lock.json must agree on
// what is installed.
// Card P25 (Chapter 9). Placement: commit and build. Kind:
// sensor, computational.
// Retire when: dependency changes go through a review bot or
// policy you trust, and this guard has not fired for 90 days.
import { existsSync } from 'node:fs';
import { readJson } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';

type Deps = Record<string, string>;
type Manifest = { dependencies?: Deps; devDependencies?: Deps };
type Lockfile = { packages: Record<string, Manifest> };

const APPROVED = '.harness/approved-deps.json';

// Runtime and dev dependencies together.
const both = (m: Manifest): Deps => ({
  ...m.dependencies,
  ...m.devDependencies,
});

const UNAPPROVED =
  'Fix: remove it, or stop and ask a human to review it (run ' +
  'node guards/package-check.ts first). If approved, the ' +
  'human adds it with a reason to ' +
  '.harness/approved-deps.json.';
const UNLOCKED =
  'Fix: run npm install and commit package-lock.json in the ' +
  'same change.';

export function checkDependencies(
  declared: Deps,
  approved: Deps,
  locked: Deps,
): string[] {
  const problems: string[] = [];
  for (const name of Object.keys(declared)) {
    if (!(name in approved)) {
      const what = `${name} is a new dependency`;
      problems.push(
        `${what} that nobody approved.\n${UNAPPROVED}`,
      );
    }
    if (locked[name] !== declared[name]) {
      const lock = locked[name] ?? 'missing';
      problems.push(
        `${name} is in package.json but package-lock.json ` +
          `does not match (lock: ${lock}).\n${UNLOCKED}`,
      );
    }
  }
  return problems;
}

if (isMain(import.meta.url)) {
  const LOCK = 'package-lock.json';
  const declared = both(readJson<Manifest>('package.json'));
  const lock = existsSync(LOCK)
    ? readJson<Lockfile>(LOCK)
    : { packages: {} as Lockfile['packages'] };
  const locked = both(lock.packages[''] ?? {});
  const approved = readJson<Deps>(APPROVED);
  const ok = `${Object.keys(declared).length} dependencies`;
  report(
    'dependency-diff',
    checkDependencies(declared, approved, locked),
    `${ok}, all approved and locked`,
  );
}
