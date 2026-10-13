import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseLog, score, type Run } from '../score.ts';

const run = (overrides: Partial<Run>): Run => ({
  run_id: 'r',
  task: 'T1',
  condition: 'gates',
  model: 'm',
  tokens: 1000,
  cost_usd: 1,
  wall_seconds: 60,
  first_pass: true,
  rework: 0,
  accepted: true,
  ...overrides,
});

test('cost per accepted change counts the cost of failed runs too', () => {
  const [row] = score([run({ cost_usd: 1 }), run({ cost_usd: 3, accepted: false, first_pass: false, rework: 2 })]);
  assert.equal(row.accepted, 1);
  assert.equal(row.costPerAccepted, 4);
  assert.equal(row.firstPassRate, 0.5);
  assert.equal(row.meanRework, 1);
});

test('no accepted change means no cost per accepted change', () => {
  const [row] = score([run({ accepted: false })]);
  assert.equal(row.costPerAccepted, undefined);
});

test('runs are grouped by condition and model', () => {
  const rows = score([run({}), run({ model: 'other' }), run({ condition: 'none' })]);
  assert.equal(rows.length, 3);
});

test('the fixture log is labelled as a fixture and parses', () => {
  const log = parseLog(readFileSync(new URL('../fixtures/FIXTURE-not-results.jsonl', import.meta.url), 'utf8'));
  assert.match(log.notes[0], /^FIXTURE FOR TESTING THE SCORER, NOT RESULTS/);
  assert.equal(log.runs.length, 12);
});
