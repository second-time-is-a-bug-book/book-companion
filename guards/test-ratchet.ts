// guards/test-ratchet.ts
// The number of tests may go up, never down. Runs the suite,
// counts the tests, and compares with the baseline in
// .harness/test-baseline.json.
// Card P15 (Chapter 6). Placement: commit and build.
// Kind: sensor, computational.
// Retire when: tests are read-only to the agent by permission,
// and this guard has not fired for 90 days.
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { isMain, report } from './lib/log.ts';
import { sh } from './lib/shell.ts';

const BASELINE = '.harness/test-baseline.json';

// node:test prints "# tests 42" (TAP) or "ℹ tests 42" (spec
// reporter).
export function countTests(output: string): number | undefined {
  const match = /^(?:#|ℹ) tests (\d+)$/m.exec(output);
  return match ? Number(match[1]) : undefined;
}

export function checkRatchet(
  count: number | undefined,
  baseline: number,
): string[] {
  if (count === undefined) {
    return [
      'Found no test count in the output of npm test.\n' +
        'Fix: make sure npm test runs and finishes; run it ' +
        'yourself to see why it did not.',
    ];
  }
  if (count < baseline) {
    return [
      `The test count fell from ${baseline} to ${count}.\n` +
        'Fix: put the missing tests back. Do not delete, ' +
        'merge or skip tests to get a green run; fix the ' +
        'code instead. If a human agreed to remove a test, ' +
        `they lower the baseline in ${BASELINE} themselves.`,
    ];
  }
  return [];
}

if (isMain(import.meta.url)) {
  const baseline = existsSync(BASELINE)
    ? JSON.parse(readFileSync(BASELINE, 'utf8')).tests
    : 0;
  const count = countTests(sh('npm test --silent').output);
  const higher = count !== undefined && count > baseline;
  if (process.argv.includes('--raise') && higher) {
    // Only ever upwards.
    const json = JSON.stringify({ tests: count }, null, 2);
    writeFileSync(BASELINE, json + '\n');
    const raised = `raised from ${baseline} to ${count}`;
    console.log(`test-ratchet: baseline ${raised}`);
  } else {
    const hint = higher
      ? `; run with --raise to lock in ${count}`
      : '';
    const ok = `${count} tests, baseline ${baseline}${hint}`;
    report('test-ratchet', checkRatchet(count, baseline), ok);
  }
}
