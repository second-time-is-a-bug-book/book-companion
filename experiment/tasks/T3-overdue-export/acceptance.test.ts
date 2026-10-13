// Hidden acceptance test for T3. Do not show this file to the agent.
//   node --test experiment/tasks/T3-overdue-export/acceptance.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startInvoicer } from '../harness.ts';

test('T3: ?status=overdue exports only sent, past-due invoices', async (t) => {
  const app = await startInvoicer('2026-01-01'); // due 2026-01-31
  t.after(app.close);
  const overdue = await app.invoice('100.00');
  const draft = await app.invoice('200.00');
  const paid = await app.invoice('300.00');
  await app.call('POST', `/api/invoices/${overdue.id}/send`, {});
  await app.call('POST', `/api/invoices/${paid.id}/send`, {});
  await app.call('POST', `/api/invoices/${paid.id}/pay`, {});
  app.clock.today = '2026-02-15';

  const rows = ((await app.call('GET', '/api/invoices.csv?status=overdue')).body as string).trim().split('\r\n');
  assert.equal(rows.length, 2); // header and one invoice
  assert.match(rows[1], new RegExp(`^${overdue.number},`));
  assert.ok(!rows.some((row) => row.startsWith(draft.number) || row.startsWith(paid.number)));

  const all = ((await app.call('GET', '/api/invoices.csv')).body as string).trim().split('\r\n');
  assert.equal(all.length, 4);
});

test('T3: an unknown status is a 400 that lists the allowed values', async (t) => {
  const app = await startInvoicer('2026-01-01');
  t.after(app.close);
  const response = await app.call('GET', '/api/invoices.csv?status=late');
  assert.equal(response.status, 400);
  assert.match(JSON.stringify(response.body), /overdue/);
});
