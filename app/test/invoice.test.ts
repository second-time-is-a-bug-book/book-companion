import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_TAX_RATE_BPS } from '../src/config.ts';
import {
  dueDateFor,
  invoiceNumber,
  invoiceTotals,
  lineTotalCents,
  validateLines,
} from '../src/domain/invoice.ts';

const pricing = JSON.parse(
  readFileSync(
    new URL('./fixtures/pricing.json', import.meta.url),
    'utf8',
  ),
);

test('line total is quantity times unit price', () => {
  assert.equal(
    lineTotalCents({
      description: 'Hours',
      quantity: 3,
      unitPriceCents: 1999,
    }),
    5997,
  );
});

test('the pricing fixture matches the config', () => {
  assert.equal(pricing.defaultTaxRateBps, DEFAULT_TAX_RATE_BPS);
});

test('totals for the documented example invoice', () => {
  assert.deepEqual(
    invoiceTotals(pricing.example.lines),
    pricing.example.expected,
  );
});

test('tax is rounded once, on the subtotal', () => {
  // Per line: 3 lines of 0.03 at 20% would be 0.01 tax each,
  // 0.03 in total. On the subtotal: 0.09 at 20% is 0.018,
  // which rounds to 0.02.
  const line = {
    description: 'Stamp',
    quantity: 1,
    unitPriceCents: 3,
  };
  assert.deepEqual(invoiceTotals([line, line, line], 2000), {
    subtotalCents: 9,
    taxCents: 2,
    totalCents: 11,
  });
});

test('an explicit tax rate overrides the default', () => {
  const totals = invoiceTotals(
    [
      {
        description: 'Book',
        quantity: 1,
        unitPriceCents: 1000,
      },
    ],
    700,
  );
  assert.equal(totals.taxCents, 70);
});

test('validateLines reports each problem by line', () => {
  const problems = validateLines([
    { description: ' ', quantity: 0, unitPriceCents: 100 },
    { description: 'Fine', quantity: 1, unitPriceCents: 12.5 },
  ]);
  assert.deepEqual(problems, [
    'Line 1: description is empty.',
    'Line 1: quantity must be a whole number of at least 1.',
    'Line 2: unit price must be integer cents.',
  ]);
});

test('an invoice with no lines is invalid', () => {
  assert.deepEqual(validateLines([]), [
    'An invoice needs at least one line item.',
  ]);
});

test('due date uses the default payment terms', () => {
  assert.equal(dueDateFor('2026-01-15'), '2026-02-14');
  assert.equal(dueDateFor('2026-01-15', 14), '2026-01-29');
});

test('invoice numbers are zero padded', () => {
  assert.equal(invoiceNumber(7), 'INV-0007');
});
