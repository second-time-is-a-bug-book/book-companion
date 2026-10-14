// The numbers Chapter 12 and Chapter 13 print, checked against the
// run records in experiment/results/. If a record or the book
// changes, one of these fails.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fisher, summary } from '../results/reproduce.ts';

const s = summary();
const k = (counts: { k: number }[]) => counts.map((c) => c.k);

test('270 runs, all accepted, 267 at the first done', () => {
  assert.equal(s.runs, 270);
  assert.equal(s.accepted, 270);
  assert.equal(s.firstPass, 267);
  assert.deepEqual(k(s.firstPassByCondition), [90, 89, 88]);
  assert.deepEqual(k(s.firstPassByModel), [60, 105, 102]);
  assert.equal(s.totalCost.toFixed(2), '115.58');
});

test('the T4 to T7 table matches the chapter', () => {
  const row = (m: string) => s.table.find((r) => r.model === m)!;
  const costs = (m: string) =>
    row(m).cells.map((c) => c.costPerAccepted.toFixed(2));
  assert.deepEqual(row('opus').cells.map((c) => c.firstPass.k), [20, 19, 18]);
  assert.deepEqual(row('sonnet').cells.map((c) => c.defect.k), [5, 4, 1]);
  assert.deepEqual(costs('haiku'), ['0.06', '0.04', '0.05']);
  assert.deepEqual(costs('sonnet'), ['0.27', '0.28', '0.30']);
  assert.deepEqual(costs('opus'), ['0.97', '0.84', '0.82']);
});

test('what the runs left behind matches the chapter', () => {
  assert.deepEqual(k(s.t7Coupling), [14, 0, 0]);
  assert.deepEqual(k(s.t7CouplingNoneByModel), [4, 5, 5]);
  const opus = s.outsideByModel.find((r) => r.model === 'opus')!;
  assert.deepEqual(k(opus.cells), [10, 2, 1]);
  assert.equal(s.opusOutsideHarnessed.k, 3);
  assert.deepEqual(k(s.t4TestLeft), [0, 14, 9]);
  assert.equal(s.t4LeftWithRule.k, 23);
  assert.equal(s.t4LeftByBypass, 9);
});

test("Fisher's exact test gives the p values in the footnote", () => {
  assert.equal(fisher(18, 20, 20, 20).toFixed(4), '0.4872');
  assert.equal(fisher(1, 20, 5, 20).toFixed(4), '0.1818');
  assert.equal(fisher(3, 20, 5, 20).toFixed(4), '0.6948');
  assert.equal(fisher(20, 20, 20, 20), 1);
});
