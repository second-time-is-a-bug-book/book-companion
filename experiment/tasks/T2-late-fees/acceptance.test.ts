// Hidden acceptance test for T2. Do not show this file to the agent.
//   node --test experiment/tasks/T2-late-fees/acceptance.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startInvoicer } from '../harness.ts';

test('T2: late fee is 2% after a 7-day grace period, sent invoices only', async (t) => {
  const app = await startInvoicer('2026-01-01'); // due 2026-01-31
  t.after(app.close);
  const sent = await app.invoice('1000.00'); // total 1200.00, fee 24.00
  const draft = await app.invoice('1000.00');
  await app.call('POST', `/api/invoices/${sent.id}/send`, {});

  app.clock.today = '2026-02-07'; // 7 days late: still in grace
  assert.equal((await app.call('GET', `/api/invoices/${sent.id}`)).body.lateFeeCents, 0);

  app.clock.today = '2026-02-08'; // 8 days late
  assert.equal((await app.call('GET', `/api/invoices/${sent.id}`)).body.lateFeeCents, 2400);
  assert.equal((await app.call('GET', `/api/invoices/${draft.id}`)).body.lateFeeCents, 0);
});

test('T2: the fee rounds half up and appears in the CSV', async (t) => {
  const app = await startInvoicer('2026-01-01');
  t.after(app.close);
  const inv = await app.invoice('10.21'); // total 12.25; 2% is 24.5 cents, which rounds up to 25
  await app.call('POST', `/api/invoices/${inv.id}/send`, {});
  app.clock.today = '2026-03-01';
  assert.equal((await app.call('GET', `/api/invoices/${inv.id}`)).body.lateFeeCents, 25);
  const csv = (await app.call('GET', '/api/invoices.csv')).body as string;
  assert.match(csv.split('\r\n')[0], /,total,late_fee$/);
  assert.match(csv.split('\r\n')[1], /,12\.25,0\.25$/);
});
