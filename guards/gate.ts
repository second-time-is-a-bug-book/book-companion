// guards/gate.ts
// One gate that refuses. Runs every check, fast ones first;
// slow ones only when the fast ones pass. Any failure fails the
// gate and prints why. --all runs slow checks after a fast
// failure too; --json prints results for seeded-defects.ts.
// Cards P12, P13 (Chapter 5). Placement: commit (pre-commit
// hook) and build (CI).
import { isMain, logFire } from './lib/log.ts';
import { sh } from './lib/shell.ts';
import { wrap } from './lib/wrap.ts';

export interface Check {
  name: string;
  command: string;
  slow?: boolean;
}

// A guard in this folder, or a slow check and its command.
const guard = (name: string): Check =>
  ({ name, command: `node guards/${name}.ts` });
const slow = (name: string, command: string): Check =>
  ({ name, command, slow: true });

export const CHECKS: Check[] = [
  guard('instructions-lint'),
  guard('coupling-check'),
  guard('plan-required'),
  guard('diff-budget'),
  guard('no-float-money'),
  guard('layer-boundary'),
  guard('no-skip'),
  guard('secret-scan'),
  guard('migration-guard'),
  guard('dependency-diff'),
  guard('package-check'),
  slow('typecheck', 'npx --no-install tsc --noEmit -p .'),
  slow('unit-tests', 'npm test --silent'),
  slow('test-ratchet', 'node guards/test-ratchet.ts'),
];

export interface CheckResult {
  name: string;
  status: 'ok' | 'FAILED' | 'skipped';
  seconds: number;
  output: string;
}

const LATER = 'gate: skipped (fix the fast checks first)';
const SKIPPED = /^[\w-]+: skipped \((.*)\)/m;
const isError = (line: string) => /^\w*Error: /.test(line);
const say = (text: string) => console.log(wrap(text));

export function runGate(runAll = false): CheckResult[] {
  const results: CheckResult[] = [];
  let fastFailed = false;
  for (const { name, command, slow } of CHECKS) {
    if (slow && fastFailed && !runAll) {
      const status = 'skipped';
      results.push({ name, status, seconds: 0, output: LATER });
      continue;
    }
    const { code, output, seconds } = sh(command);
    // A diff-based guard outside git prints "name: skipped
    // (reason)" and exits 0. Show it as skipped, not ok: a
    // check that did not run proves nothing.
    const ran = SKIPPED.test(output) ? 'skipped' : 'ok';
    const status = code !== 0 ? 'FAILED' : ran;
    if (status === 'FAILED' && !slow) fastFailed = true;
    results.push({ name, status, seconds, output });
  }
  return results;
}

function printSummary(results: CheckResult[]): void {
  say(`gate: ${results.length} checks, fast ones first`);
  for (const { name, status, seconds, output } of results) {
    const ran = `${seconds.toFixed(1)}s`;
    const why = `(${SKIPPED.exec(output)?.[1]})`;
    const time = status === 'skipped' ? why : ran;
    say(`  ${status.padEnd(8)} ${name.padEnd(18)} ${time}`);
  }
  const failed = results.filter((r) => r.status === 'FAILED');
  const names = failed.map((r) => r.name).join(', ');
  const of = `of ${results.length} checks`;
  if (failed.length === 0) {
    const ran = results.filter((r) => r.status === 'ok').length;
    say(`gate: PASSED, ${ran} ${of} ran and passed`);
    return;
  }
  say(`gate: REFUSED, ${failed.length} ${of} failed: ${names}`);
  for (const { name, output } of failed) {
    const lines = output.trimEnd().split('\n');
    // The end of the output usually says why. A test file that
    // cannot even load prints its error near the top instead,
    // so repeat those error lines first.
    const early = new Set(lines.slice(0, -30).filter(isError));
    if (early.size > 0) early.add('...');
    say(`\n--- ${name} ---`);
    say([...early, ...lines.slice(-30)].join('\n'));
  }
  say(
    '\nFix every failure above, then run npm run gate again. ' +
      'Do not commit or say "done" while the gate refuses.',
  );
  logFire('gate', `refused: ${names}`);
  process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  const results = runGate(process.argv.includes('--all'));
  if (!process.argv.includes('--json')) printSummary(results);
  else console.log(JSON.stringify(results, ['name', 'status']));
}
