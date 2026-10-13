import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lateFeeCents } from './late-fee.ts';

test('no fee inside the grace period', () => {
  assert.equal(lateFeeCents(10000, 3), 0);
});

test('day 7 is still inside the grace period', () => {
  assert.equal(lateFeeCents(10000, 7), 0);
});

test('2% from day 8', () => {
  assert.equal(lateFeeCents(10000, 8), 200);
});

test('the fee is whole cents, rounded half up', () => {
  assert.equal(lateFeeCents(125, 30), 3); // 2.5 cents rounds up
  assert.equal(lateFeeCents(99, 30), 2); // 1.98 cents
});
