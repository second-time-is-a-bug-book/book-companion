// guards/instructions-lint.ts
// Keeps instruction files small and true: a line budget, no
// pointers to files or npm scripts that do not exist, and every
// rule names the check that enforces it.
// Cards P03, P05, P06 (Chapter 3). Placement: commit. Kind:
// sensor, computational.
// Retire when: agents stop reading instruction files, or your
// agent tooling lints them for you.
import { existsSync, readFileSync } from 'node:fs';
import { readJson } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';

type Scripts = Record<string, string>;
const MAX_LINES = 100;
// A file with a known extension, or a folder ending in "/".
const FILE =
  /^[\w./-]+\.(ts|js|json|jsonl|md|sql|css|html|patch|sh)$/;
const FOLDER = /^[\w.-]+\/[\w./-]*$/;
const NPM_RUN = /`npm run ([\w:-]+)/g;
const CHECK = /^(npm run |npm test|node )/;

const isPath = (w: string) => FILE.test(w) || FOLDER.test(w);
const codeSpans = (line: string) =>
  [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

// Line i and the indented lines that continue it, as one line.
function item(lines: string[], i: number): string {
  let end = i + 1;
  while (/^\s+\S/.test(lines[end] ?? '')) end++;
  return lines.slice(i, end).join(' ');
}

const MAP =
  'is a map, not a manual. Move detail into the docs it ' +
  'points to, and keep one line per pointer.';
const DEAD_PATH =
  ', which does not exist.\nFix: correct the path or delete ' +
  'the line. A dead pointer sends agents searching.';
const NO_SCRIPT =
  ', which is not in package.json.\n' +
  'Fix: use a script that exists, or add it.';
const NO_CHECK =
  'Fix: add the command that enforces it, in backticks, ' +
  'or delete the rule.';

export function lintInstructions(
  file: string,
  text: string,
  scripts: Scripts,
): string[] {
  const lines = text.trimEnd().split('\n');
  const problems: string[] = [];
  if (lines.length > MAX_LINES) {
    problems.push(
      `${file} is ${lines.length} lines; the budget is ` +
        `${MAX_LINES}.\nFix: ${file} ${MAP}`,
    );
  }
  let inRules = false;
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    if (/^## /.test(line)) inRules = /^## Rules/.test(line);
    const spans = codeSpans(line);
    for (const word of spans.flatMap((s) => s.split(/\s+/))) {
      if (isPath(word) && !existsSync(word)) {
        problems.push(`${where} points to ${word}${DEAD_PATH}`);
      }
    }
    for (const [, script] of line.matchAll(NPM_RUN)) {
      if (script in scripts) continue;
      const run = `"npm run ${script}"`;
      problems.push(`${where} names ${run}${NO_SCRIPT}`);
    }
    // A rule is a list item; it may go on over indented lines.
    if (inRules && line.startsWith('- ')) {
      const named = codeSpans(item(lines, i));
      if (!named.some((span) => CHECK.test(span))) {
        problems.push(
          `${where}: this rule names no check.\n` +
            `  ${line.trim()}\n${NO_CHECK}`,
        );
      }
    }
  });
  return problems;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const files =
    args.length > 0 ? args : ['AGENTS.md'].filter(existsSync);
  const pkg = readJson<{ scripts: Scripts }>('package.json');
  const problems = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return lintInstructions(file, text, pkg.scripts);
  });
  const ok = `${files.join(', ')}: budget ${MAX_LINES}`;
  report('instructions-lint', problems, `${ok}, pointers live`);
}
