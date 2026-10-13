// guards/no-skip.ts
// Finds tests that were switched off: .skip, .only, .todo and
// their option forms.
// Card P14 (Chapter 6). Placement: edit and commit.
// Kind: sensor, computational.
// Retire when: tests are read-only to the agent (enforced by
// permissions), and this guard has not fired for 90 days.
import { readFileSync } from 'node:fs';
import { isComment, listFiles } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';

// Guard sources and guard tests mention these patterns on
// purpose, so they are not scanned.
const TEST_DIRS = [
  'app/test',
  'app/e2e',
  'legacy/characterisation',
  'toy-agent/test',
  'experiment/test',
];

// Each rule: the call form (test.skip and friends), the option
// form ({ skip: true }), and what is wrong with it.
const RULES = [
  {
    patterns: [
      /\b(?:test|it|describe|suite)\.skip\(/,
      /\{\s*skip:\s*true/,
    ],
    what: 'a skipped test never runs, so it can never fail',
  },
  {
    patterns: [
      /\b(?:test|it|describe|suite)\.only\(/,
      /\{\s*only:\s*true/,
    ],
    what: 'an .only test makes the runner skip its neighbours',
  },
  {
    patterns: [/\b(?:test|it)\.todo\(/, /\{\s*todo:\s*true/],
    what: 'a todo test reports success without checking',
  },
  {
    patterns: [/\bx(?:it|describe)\(/],
    what: 'xit/xdescribe skips a test',
  },
];

const FIX =
  'Fix: remove it and make the test pass by fixing the code ' +
  'under test. If you believe the test is wrong, stop and ' +
  'ask a human: tests are read-only for agents (AGENTS.md, ' +
  'Rules).';

export function findSkips(
  path: string,
  source: string,
): string[] {
  const problems: string[] = [];
  source.split('\n').forEach((line, i) => {
    if (isComment(line)) return;
    const rule = RULES.find((r) =>
      r.patterns.some((p) => p.test(line)),
    );
    if (!rule) return;
    const where = `${path}:${i + 1}: ${rule.what}.`;
    problems.push(`${where}\n  ${line.trim()}\n${FIX}`);
  });
  return problems;
}

if (isMain(import.meta.url)) {
  const files = TEST_DIRS.flatMap((dir) =>
    listFiles(dir, ['.ts', '.js']),
  );
  const problems = files.flatMap((file) =>
    findSkips(file, readFileSync(file, 'utf8')),
  );
  const ok = `${files.length} test files scanned`;
  report('no-skip', problems, ok);
}
