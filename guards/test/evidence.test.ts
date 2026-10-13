import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkEvidence } from '../done-check.ts';
import { retireWhen } from '../guard-audit.ts';
import { mutants } from '../mini-mutate.ts';
import { checkRatchet, countTests } from '../test-ratchet.ts';

test('done-check: missing, failed and stale evidence are all refused', () => {
  const evidence = { command: 'npm test', exitCode: 0, summary: 'tests 3', recordedAt: 't', files: { 'a.ts': 'h1' } };
  assert.match(checkEvidence(undefined, {})[0], /No test evidence/);
  assert.match(checkEvidence({ ...evidence, exitCode: 1 }, { 'a.ts': 'h1' })[0], /failed/);
  assert.match(checkEvidence(evidence, { 'a.ts': 'h2' })[0], /stale.*\n\s+a\.ts/);
  assert.match(checkEvidence(evidence, { 'a.ts': 'h1', 'new.ts': 'h3' })[0], /new\.ts/);
  assert.deepEqual(checkEvidence(evidence, { 'a.ts': 'h1' }), []);
});

test('test-ratchet reads both reporters and never lets the count fall', () => {
  assert.equal(countTests('# tests 42\n# pass 42'), 42);
  assert.equal(countTests('ℹ tests 7'), 7);
  assert.equal(countTests('no summary'), undefined);
  assert.match(checkRatchet(40, 41)[0], /fell from 41 to 40/);
  assert.deepEqual(checkRatchet(42, 41), []);
});

test('mini-mutate flips spaced operators only, never arrows or comments', () => {
  const source = ['// a > b in a comment', 'const f = (a: number) => a > 1 && a !== 3;'].join('\n');
  const found = mutants(source).map((m) => `${m.line}:${m.from}->${m.to}`);
  assert.deepEqual(found, ['2:!==->===', '2:>->>=', '2:&&->||']);
});

test('guard-audit reads a multi-line retire condition from the header', () => {
  const header = '// guards/x.ts\n// Retire when: the sky\n// is green.\nimport x from "y";';
  assert.equal(retireWhen(header), 'the sky is green.');
  assert.equal(retireWhen('// no condition'), undefined);
});
