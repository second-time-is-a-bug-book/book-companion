// guards/done-check.ts
// "Done" means evidence: a recorded test run that passed, on
// exactly the code you are calling done. --record runs the
// tests and saves the evidence; with no flag it checks the
// evidence exists, passed, and is not stale.
// Card P17 (Chapter 6). Placement: before the agent may report
// done. Kind: sensor, computational.
// Retire when: your agent harness runs the tests itself before
// it lets the agent stop.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { listFiles } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';
import { sh } from './lib/shell.ts';
import { wrap } from './lib/wrap.ts';

const EVIDENCE = '.harness/evidence.json';
const SOURCE_DIRS = [
  'app', 'legacy', 'guards', 'toy-agent', 'experiment',
];
const TYPES = ['.ts', '.js', '.json', '.sql', '.html', '.css'];

interface Evidence {
  command: string;
  exitCode: number;
  summary: string;
  recordedAt: string;
  // path -> content hash, at the time the tests ran
  files: Record<string, string>;
}

const sha256 = (path: string) =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

// A hash per source file. "Newer than the last change" by
// content, not by clock: copies, checkouts and clock skew
// cannot fake it.
export function fingerprint(): Record<string, string> {
  const files = SOURCE_DIRS.flatMap((d) => listFiles(d, TYPES));
  return Object.fromEntries(files.map((f) => [f, sha256(f)]));
}

export function checkEvidence(
  evidence: Evidence | undefined,
  now: Record<string, string>,
): string[] {
  if (!evidence) {
    return [
      `No test evidence in ${EVIDENCE}.\n` +
        'Fix: run npm run evidence, read the result, and ' +
        'only say "done" if it passed.',
    ];
  }
  if (evidence.exitCode !== 0) {
    return [
      `The last recorded test run failed ` +
        `(${evidence.summary}).\n` +
        'Fix: make the tests pass, then run npm run evidence ' +
        'again.',
    ];
  }
  const then = evidence.files;
  const paths = Object.keys({ ...then, ...now });
  const changed = paths.filter((p) => then[p] !== now[p]);
  if (changed.length === 0) return [];
  const at = evidence.recordedAt;
  return [
    `The evidence is stale: ${changed.length} file(s) ` +
      `changed after the tests ran at ${at}:\n` +
      changed.map((p) => `  ${p}`).join('\n') +
      '\nFix: run npm run evidence and check it passes ' +
      'before you report the task as done.',
  ];
}

// "tests 73, pass 73, fail 0", from the summary lines of either
// test reporter.
function summarise(output: string): string {
  const count = (key: string) => {
    const line = new RegExp(`^(?:#|ℹ) ${key} (\\d+)$`, 'm');
    return line.exec(output)?.[1] ?? '?';
  };
  const keys = ['tests', 'pass', 'fail'];
  return keys.map((key) => `${key} ${count(key)}`).join(', ');
}

const main = isMain(import.meta.url);
if (main && process.argv.includes('--record')) {
  const run = sh('npm test --silent');
  const evidence: Evidence = {
    command: 'npm test',
    exitCode: run.code,
    summary: summarise(run.output),
    recordedAt: new Date().toISOString(),
    files: fingerprint(),
  };
  mkdirSync('.harness', { recursive: true });
  const json = JSON.stringify(evidence, null, 2);
  writeFileSync(EVIDENCE, json + '\n');
  const result = `${evidence.summary}, exit ${run.code}`;
  console.log(wrap(`done-check: recorded (${result})`));
  process.exitCode = run.code;
} else if (main) {
  const evidence = existsSync(EVIDENCE)
    ? (JSON.parse(readFileSync(EVIDENCE, 'utf8')) as Evidence)
    : undefined;
  const ok = `evidence from ${evidence?.recordedAt}`;
  const problems = checkEvidence(evidence, fingerprint());
  report('done-check', problems, `${ok}: ${evidence?.summary}`);
}
