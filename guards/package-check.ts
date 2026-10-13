// guards/package-check.ts
// Verifies every dependency that is not yet approved before
// anyone installs it: does it exist, how old is it, does it run
// scripts on install? Offline by default (guards/fixtures/
// registry-snapshot.json); --online asks registry.npmjs.org
// (guards/lib/registry.ts), and any failed lookup but a 404
// fails the check.
// Card P24 (Chapter 9). Placement: edit (pre-install) and
// commit. Kind: sensor, computational.
// Retire when: your package manager or registry proxy enforces
// existence, minimum age and install-script policy for you.
import { readJson } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';
import { fetchInfo, type PackageInfo } from './lib/registry.ts';

const MIN_AGE_DAYS = 30;
const DAY_MS = 86_400_000;
const SNAPSHOT = 'guards/fixtures/registry-snapshot.json';
const APPROVED = '.harness/approved-deps.json';

const MISSING =
  'does not exist on the registry.\nFix: remove it. Agents ' +
  'invent plausible package names, and attackers register ' +
  'them (slopsquatting). Find the real package in its docs, ' +
  'or write the few lines yourself.';
const TOO_NEW =
  'Fix: do not install it now. Ask a human to review it, or ' +
  'wait until it has a track record.';
const SCRIPTS =
  'runs scripts when installed.\nFix: ask a human to review ' +
  'the install script before it runs on any machine.';

export function checkPackage(
  name: string,
  info: PackageInfo | undefined,
  now: Date,
): string[] {
  if (!info) return [`${name} ${MISSING}`];
  const problems: string[] = [];
  const age = now.getTime() - Date.parse(info.created);
  const days = Math.floor(age / DAY_MS);
  if (days < MIN_AGE_DAYS) {
    const when = `${days} days ago (minimum ${MIN_AGE_DAYS})`;
    const what = `${name} was first published ${when}.`;
    problems.push(`${what}\n${TOO_NEW}`);
  }
  if (info.installScripts) problems.push(`${name} ${SCRIPTS}`);
  return problems;
}

export function couldNotVerify(name: string, reason: string) {
  return (
    `Could not verify ${name}: ${reason}.\nFix: treat it as ` +
    'unapproved and do not install it. Run the check again ' +
    'later, or ask a human to review it.'
  );
}

async function checkOnline(name: string): Promise<string[]> {
  try {
    const info = await fetchInfo(name);
    return checkPackage(name, info, new Date());
  } catch (error) {
    return [couldNotVerify(name, (error as Error).message)];
  }
}

if (isMain(import.meta.url)) {
  type Deps = Record<string, string>;
  type Snapshot = {
    fetchedAt: string;
    packages: Record<string, PackageInfo>;
  };
  const online = process.argv.includes('--online');
  const pkg = readJson<Record<string, Deps>>('package.json');
  const approved = readJson<Deps>(APPROVED);
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const unapproved = (name: string) => !(name in approved);
  const names = Object.keys(all).filter(unapproved);
  const snapshot = online ? null : readJson<Snapshot>(SNAPSHOT);
  // Offline, ages are as of the snapshot.
  const asOf = new Date(snapshot?.fetchedAt ?? Date.now());
  const problems: string[] = [];
  for (const name of names) {
    if (!snapshot) {
      problems.push(...(await checkOnline(name)));
    } else {
      const info = snapshot.packages[name];
      problems.push(...checkPackage(name, info, asOf));
    }
  }
  const how = online ? 'checked online' : 'offline snapshot';
  const ok = `${names.length} unapproved packages, ${how}`;
  report('package-check', problems, ok);
}
