import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatCents,
  parseCents,
  taxCents,
} from '../src/domain/money.ts';

test('parseCents reads amounts as integer cents', () => {
  assert.equal(parseCents('12'), 1200);
  assert.equal(parseCents('12.5'), 1250);
  assert.equal(parseCents('12.50'), 1250);
  assert.equal(parseCents(' 0.29 '), 29);
});

test('parseCents rejects inexact amounts', () => {
  assert.throws(
    () => parseCents('1.234'),
    /at most two decimals/,
  );
  assert.throws(() => parseCents('-5'), /Not an amount/);
  assert.throws(() => parseCents('ten'), /Not an amount/);
});

test('formatCents writes cents as decimal text', () => {
  assert.equal(formatCents(123456), '1234.56');
  assert.equal(formatCents(5), '0.05');
  assert.equal(formatCents(-305), '-3.05');
});

test('taxCents rounds half up to a whole cent', () => {
  assert.equal(taxCents(1005, 2000), 201); // 201.0 exactly
  assert.equal(taxCents(3, 2000), 1); // 0.6 rounds up
  assert.equal(taxCents(2, 2000), 0); // 0.4 rounds down
  assert.equal(taxCents(25, 1000), 3); // 2.5 rounds half up
});

test('taxCents refuses floats instead of guessing', () => {
  assert.throws(
    () => taxCents(10.5, 2000),
    /integer number of cents/,
  );
});
