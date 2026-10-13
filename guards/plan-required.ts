// guards/plan-required.ts
// A large change needs a plan file, written before the code and
// changed with it.
// Card P07 (Chapter 4). Placement: commit.
// Kind: sensor, computational.
// Retire when: your agent always plans in a file before large
// changes, and this guard has not fired for 90 days.
import { existsSync, readFileSync } from 'node:fs';
import { diffStats, skipUnlessGit } from './lib/git.ts';
import type { FileStat } from './lib/git.ts';
import { isMain, report } from './lib/log.ts';

const MAX_FILES = 4;
const MAX_LINES = 150;
const GENERATED = new Set(['package-lock.json']);
const SECTIONS = ['## Goal', '## Steps', '## Done when'];

const isPlan = ({ path }: FileStat) =>
  path.startsWith('plans/') &&
  path.endsWith('.md') &&
  path !== 'plans/README.md';

export function checkPlan(
  stats: FileStat[],
  readPlan: (path: string) => string,
): string[] {
  const counted = (s: FileStat) => !GENERATED.has(s.path);
  const work = stats.filter((s) => !isPlan(s) && counted(s));
  const size = (s: FileStat) => s.added + s.removed;
  const lines = work.reduce((sum, s) => sum + size(s), 0);
  if (work.length <= MAX_FILES && lines <= MAX_LINES) return [];

  const plans = stats
    .filter(isPlan)
    .filter((s) => existsSync(s.path));
  if (plans.length === 0) {
    const files = `${work.length} files`;
    const touches = `touches ${files} and ${lines} lines`;
    const headings = SECTIONS.map((s) => s.slice(3)).join(', ');
    const limit = `${MAX_FILES} files or ${MAX_LINES} lines`;
    return [
      `This change ${touches}, but no plan file changed.\n` +
        'Fix: stop and write plans/<task>.md from ' +
        `templates/plan.md (${headings}). Then work through ` +
        `it one step at a time. Over ${limit}, plan first.`,
    ];
  }
  return plans.flatMap(({ path }) => {
    const plan = readPlan(path);
    const missing = SECTIONS.filter((h) => !plan.includes(h));
    if (missing.length === 0) return [];
    return [
      `${path} is missing ${missing.join(', ')}.\n` +
        'Fix: fill in those sections; they are what the next ' +
        'session reads.',
    ];
  });
}

const main = isMain(import.meta.url);
if (main && !skipUnlessGit('plan-required')) {
  const stats = diffStats();
  const read = (path: string) => readFileSync(path, 'utf8');
  const problems = checkPlan(stats, read);
  const ok = `${stats.length} changed files, no plan needed`;
  report('plan-required', problems, `${ok} or plan present`);
}
