// guards/coupling-check.ts
// "If you change X, also update Y": reads the Coupling list
// from AGENTS.md (or a JSON file) and fails when X changed in
// this diff but Y did not.
// Card P04 (Chapter 3). Placement: commit.
// Kind: sensor, computational.
// Retire when: the coupled values are generated from one
// source, so they can no longer drift.
import { readFileSync } from 'node:fs';
import { changedFiles, skipUnlessGit } from './lib/git.ts';
import { isMain, report } from './lib/log.ts';

export interface Coupling {
  when: string[]; // "dir/" means anything under dir/
  also: string[];
  why: string;
}

const FIX =
  'Fix: update them in this same change. If they no longer ' +
  'belong together, edit the Coupling list in AGENTS.md and ' +
  'say why in your summary.';

const paths = (text: string) =>
  [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

// Reads items like these from the "## Coupling" section:
//   - When `app/src/config.ts` changes, also update
//     `app/docs/pricing.md`.
//     Why: the pricing defaults are mirrored there.
export function parseCouplings(markdown: string): Coupling[] {
  const sections = markdown.split(/^## /m);
  const section = sections.find((s) => /^Coupling/.test(s));
  // Part 0 is the text before the first item.
  const items = (section ?? '').split(/^- /m).slice(1);
  return items.map((item) => {
    const text = item.replace(/\s+/g, ' ');
    const [when, rest = ''] = text.split(/\balso update\b/);
    const [also, why = ''] = rest.split(/\bWhy:/);
    return {
      when: paths(when),
      also: paths(also),
      why: why.trim(),
    };
  });
}

function matches(file: string, path: string): boolean {
  return path.endsWith('/')
    ? file.startsWith(path)
    : file === path;
}

export function checkCoupling(
  couplings: Coupling[],
  changed: string[],
): string[] {
  const touched = (path: string) =>
    changed.some((file) => matches(file, path));
  const problems: string[] = [];
  for (const { when, also, why } of couplings) {
    const trigger = when.find(touched);
    const missing = also.filter((path) => !touched(path));
    if (trigger && missing.length > 0) {
      const others = missing.join(' and ');
      problems.push(
        `${trigger} changed, but ${others} did not.\n` +
          `Why they change together: ${why}\n${FIX}`,
      );
    }
  }
  return problems;
}

const main = isMain(import.meta.url);
if (main && !skipUnlessGit('coupling-check')) {
  const source = process.argv[2] ?? 'AGENTS.md';
  const text = readFileSync(source, 'utf8');
  const couplings = source.endsWith('.json')
    ? (JSON.parse(text) as Coupling[])
    : parseCouplings(text);
  const changed = changedFiles();
  const ok = `${couplings.length} couplings`;
  report(
    'coupling-check',
    checkCoupling(couplings, changed),
    `${ok}, ${changed.length} changed files`,
  );
}
