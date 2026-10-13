// Hidden acceptance test for T1. Do not show this file to the agent.
//   node --test experiment/tasks/T1-partial-payments/acceptance.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startInvoicer } from '../harness.ts';

test('T1: partial payments reduce the balance and settle the invoice', async (t) => {
  const app = await startInvoicer('2026-03-01');
  t.after(app.close);
  const inv = await app.invoice('500.00'); // total 600.00 with 20% tax
  await app.call('POST', `/api/invoices/${inv.id}/send`, {});

  const first = await app.call('POST', `/api/invoices/${inv.id}/payments`, { amount: '250.00' });
  assert.equal(first.status, 201);
  const afterFirst = (await app.call('GET', `/api/invoices/${inv.id}`)).body;
  assert.equal(afterFirst.paidCents, 25000);
  assert.equal(afterFirst.balanceCents, 35000);
  assert.equal(afterFirst.status, 'sent');

  assert.equal((await app.call('POST', `/api/invoices/${inv.id}/payments`, { amount: '350.00' })).status, 201);
  const settled = (await app.call('GET', `/api/invoices/${inv.id}`)).body;
  assert.equal(settled.balanceCents, 0);
  assert.equal(settled.status, 'paid');
});

test('T1: overpayments and bad amounts are rejected with 400', async (t) => {
  const app = await startInvoicer('2026-03-01');
  t.after(app.close);
  const inv = await app.invoice('10.00'); // total 12.00
  await app.call('POST', `/api/invoices/${inv.id}/send`, {});
  assert.equal((await app.call('POST', `/api/invoices/${inv.id}/payments`, { amount: '12.01' })).status, 400);
  assert.equal((await app.call('POST', `/api/invoices/${inv.id}/payments`, { amount: '1.005' })).status, 400);
  assert.equal((await app.call('GET', `/api/invoices/${inv.id}`)).body.paidCents, 0);
});
