// Shared output for every guard. Each guard reports in the same
// shape, and each time a guard fires (finds a problem) it
// appends one line to .harness/guard-log.jsonl.
// guards/guard-audit.ts reads that log to find guards that no
// longer fire (Chapter 13).
import { appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { wrap } from './wrap.ts';

export const LOG_FILE = '.harness/guard-log.jsonl';

// Best effort: a log that cannot be written (read-only folder,
// sandbox) gets a warning on stderr, never an exception.
// Logging must not change a guard's verdict.
export function logFire(guard: string, summary: string): void {
  const at = new Date().toISOString();
  try {
    mkdirSync('.harness', { recursive: true });
    const entry = JSON.stringify({ guard, at, summary });
    appendFileSync(LOG_FILE, entry + '\n');
  } catch (error) {
    const reason = (error as Error).message;
    console.error(
      wrap(
        `${guard}: warning: could not write ${LOG_FILE} ` +
          `(${reason}); the verdict stands.`,
      ),
    );
  }
}

// Prints "guard: ok (...)" or "guard: FAILED" plus one entry
// per problem, wrapped to 64 columns, and sets the exit code.
// Write each problem for an agent: what is wrong, where, and
// what to do next. A problem may span lines; the first line is
// the summary.
export function report(
  guard: string,
  problems: string[],
  okDetail: string,
): void {
  if (problems.length === 0) {
    console.log(wrap(`${guard}: ok (${okDetail})`));
    return;
  }
  const count =
    problems.length === 1
      ? '1 problem'
      : `${problems.length} problems`;
  console.log(`${guard}: FAILED, ${count}`);
  for (const problem of problems) {
    const [first, ...rest] = problem.split('\n');
    const lines = [
      `  - ${first}`,
      ...rest.map((line) => `    ${line}`),
    ];
    console.log(wrap(lines.join('\n')));
  }
  logFire(guard, problems[0].split('\n')[0]);
  process.exitCode = 1;
}

// True when this module is the script node was asked to run, so
// guards can export their pure functions to tests and still
// work from the command line.
export function isMain(moduleUrl: string): boolean {
  return process.argv[1] === fileURLToPath(moduleUrl);
}
