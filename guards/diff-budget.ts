// guards/diff-budget.ts
// Refuses changes too large to review well, and asks for them
// to be split.
// Card P28 (Chapter 10). Placement: commit. Kind: sensor,
// computational.
// Retire when: never as a whole; tune DIFF_BUDGET to what your
// reviewers can actually read.
import { diffStats, skipUnlessGit } from './lib/git.ts';
import type { FileStat } from './lib/git.ts';
import { isMain, report } from './lib/log.ts';

const BUDGET = Number(process.env.DIFF_BUDGET ?? 400);
// Machine-written, and reviewed by other guards.
const GENERATED = new Set(['package-lock.json']);

const size = (s: FileStat) => s.added + s.removed;

const FIX =
  'Fix: split it. Keep the smallest part that works and ' +
  'passes the gate on its own, set the rest aside (git stash ' +
  'or a branch), and commit in steps. Reviewers miss ' +
  'mistakes in big diffs.';

export function checkBudget(
  stats: FileStat[],
  budget = BUDGET,
): string[] {
  const counted = stats.filter((s) => !GENERATED.has(s.path));
  const total = counted.reduce((sum, s) => sum + size(s), 0);
  if (total <= budget) return [];
  const largest = [...counted]
    .sort((a, b) => size(b) - size(a))
    .slice(0, 3)
    .map((s) => `${s.path} (+${s.added} -${s.removed})`);
  return [
    `This change is ${total} changed lines; the budget is ` +
      `${budget}.\nLargest: ${largest.join(', ')}\n${FIX}`,
  ];
}

const main = isMain(import.meta.url);
if (main && !skipUnlessGit('diff-budget')) {
  const stats = diffStats();
  const total = stats.reduce((sum, s) => sum + size(s), 0);
  const ok = `${total} changed lines, budget ${BUDGET}`;
  report('diff-budget', checkBudget(stats), ok);
}
