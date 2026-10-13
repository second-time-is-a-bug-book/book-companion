// Hidden acceptance test for T7. Do not show this file to the agent.
//   node --test experiment/tasks/T7-recurring-invoices/acceptance.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startInvoicer, startInvoicerOn } from '../harness.ts';

// Invoicer's dates are UTC calendar dates (app/src/domain/due-dates.ts).
// Run far from UTC, so that date code that depends on the server's
// time zone shows up here and not on a customer's server.
process.env.TZ = 'Pacific/Kiritimati'; // UTC+14

type Inv = { id: number; number: string; issueDate: string; dueDate: string; status: string; totalCents: number };
const LINES = [{ description: 'Retainer', quantity: 1, unitPrice: '100.00' }];

async function schedule(app: Awaited<ReturnType<typeof startInvoicer>>, startDate: string) {
  const res = await app.call('POST', '/api/recurring', { clientId: app.clientId, startDate, lines: LINES });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(typeof (res.body as { id: unknown }).id, 'number');
  return res.body as { id: number };
}

async function runJob(app: Awaited<ReturnType<typeof startInvoicer>>): Promise<Inv[]> {
  const res = await app.call('POST', '/api/recurring/run', {});
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return (res.body as { created: Inv[] }).created;
}

test('T7: month ends, a leap year, and catching up after months without a run', async (t) => {
  const app = await startInvoicer('2024-01-30');
  t.after(app.close);
  await schedule(app, '2024-01-31');
  assert.deepEqual(await runJob(app), [], 'nothing is due before the start date');

  app.clock.today = '2024-05-01';
  const created = await runJob(app);
  assert.deepEqual(created.map((i) => i.issueDate), ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']);
  assert.deepEqual(created.map((i) => i.dueDate), ['2024-03-01', '2024-03-30', '2024-04-30', '2024-05-30']);
  assert.deepEqual(created.map((i) => i.status), ['draft', 'draft', 'draft', 'draft']);
  assert.deepEqual(created.map((i) => i.totalCents), [12000, 12000, 12000, 12000]);

  assert.deepEqual(await runJob(app), [], 'running again the same day creates nothing');
  app.clock.today = '2024-05-30';
  assert.deepEqual(await runJob(app), [], 'not due until the 31st');
  app.clock.today = '2024-05-31';
  assert.deepEqual((await runJob(app)).map((i) => i.issueDate), ['2024-05-31']);

  const all = (await app.call('GET', '/api/invoices')).body as unknown[];
  assert.equal(all.length, 5);
});

test('T7: a short month never shifts the later dates', async (t) => {
  const app = await startInvoicer('2025-01-01');
  t.after(app.close);
  await schedule(app, '2025-01-29');
  await schedule(app, '2025-01-30');
  app.clock.today = '2025-04-30';
  const days = (await runJob(app)).map((i) => i.issueDate).sort();
  assert.deepEqual(days, [
    '2025-01-29', '2025-01-30',
    '2025-02-28', '2025-02-28',
    '2025-03-29', '2025-03-30',
    '2025-04-29', '2025-04-30',
  ]);
});

test('T7: schedules are stored, starting today works, bad input is rejected', async (t) => {
  const app = await startInvoicer('2026-03-15');
  t.after(app.close);
  await schedule(app, '2026-03-15');

  // A second process on the same database sees the schedule.
  const other = await startInvoicerOn(app.db, '2026-03-15');
  t.after(other.close);
  const created = await runJob(other as Awaited<ReturnType<typeof startInvoicer>>);
  assert.deepEqual(created.map((i) => [i.issueDate, i.dueDate]), [['2026-03-15', '2026-04-14']]);
  assert.deepEqual(await runJob(app), []);

  for (const startDate of ['2026-02-30', '15/03/2026', 'tomorrow', '']) {
    const res = await app.call('POST', '/api/recurring', { clientId: app.clientId, startDate, lines: LINES });
    assert.equal(res.status, 400, `startDate "${startDate}" should be rejected`);
  }
  const noLines = await app.call('POST', '/api/recurring', { clientId: app.clientId, startDate: '2026-04-01', lines: [] });
  assert.equal(noLines.status, 400);
  const badPrice = await app.call('POST', '/api/recurring', { clientId: app.clientId, startDate: '2026-04-01', lines: [{ description: 'X', quantity: 1, unitPrice: '1.234' }] });
  assert.equal(badPrice.status, 400);
});
