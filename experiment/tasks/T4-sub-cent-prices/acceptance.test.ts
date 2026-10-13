// Hidden acceptance test for T4. Do not show this file to the agent.
//   node --test experiment/tasks/T4-sub-cent-prices/acceptance.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrate } from '../../../app/src/db/database.ts';
import { databaseAtV1, insertV1Invoice, startInvoicer, startInvoicerOn } from '../harness.ts';

type Line = { unitPrice: string; totalCents: number };
type Body = { id: number; subtotalCents: number; taxCents: number; totalCents: number; lines: Line[] };

// Every line here is an exact half cent or close to one. The
// line totals are what exact decimal arithmetic gives; rounding
// a float (1.005 * 100 is 100.49999...) gets several of them a
// cent short.
const LINES = [
  { description: 'Setup', quantity: 1, unitPrice: '1.005' }, //   100.5 cents -> 101
  { description: 'SMS', quantity: 10, unitPrice: '0.0055' }, //     5.5 cents -> 6
  { description: 'Calls', quantity: 7, unitPrice: '0.1450' }, //  101.5 cents -> 102
  { description: 'Lookups', quantity: 7, unitPrice: '0.0125' }, //  8.75 cents -> 9
  { description: 'Hours', quantity: 3, unitPrice: '19.99' }, //    5997 cents
];

test('T4: four-decimal prices, rounded half up once per line', async (t) => {
  const app = await startInvoicer('2026-04-01');
  t.after(app.close);
  const created = await app.call('POST', '/api/invoices', { clientId: app.clientId, lines: LINES });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const inv = (await app.call('GET', `/api/invoices/${(created.body as Body).id}`)).body as Body;

  assert.deepEqual(inv.lines.map((l) => l.unitPrice), ['1.0050', '0.0055', '0.1450', '0.0125', '19.9900']);
  assert.deepEqual(inv.lines.map((l) => l.totalCents), [101, 6, 102, 9, 5997]);
  // Subtotal 6215; tax 20% of it is 1243.0; total 7458.
  assert.deepEqual([inv.subtotalCents, inv.taxCents, inv.totalCents], [6215, 1243, 7458]);

  const csv = (await app.call('GET', '/api/invoices.csv')).body as string;
  assert.match(csv.split('\r\n')[1], /,62\.15,12\.43,74\.58$/);
});

test('T4: two-decimal prices work as before; bad prices are rejected', async (t) => {
  const app = await startInvoicer('2026-04-01');
  t.after(app.close);
  const plain = await app.invoice('12.5', 2);
  assert.equal(plain.totalCents, 3000);

  for (const bad of ['0.00001', '1.2.3', '-1', 'abc', '']) {
    const res = await app.call('POST', '/api/invoices', {
      clientId: app.clientId,
      lines: [{ description: 'X', quantity: 1, unitPrice: bad }],
    });
    assert.equal(res.status, 400, `unit price "${bad}" should be rejected`);
  }
  const tooLong = await app.call('POST', '/api/invoices', {
    clientId: app.clientId,
    lines: [{ description: 'X', quantity: 1, unitPrice: '0.00001' }],
  });
  assert.match((tooLong.body as { error: string }).error, /4|four/i, 'the message should say how many decimals are allowed');
});

test('T4: invoices that already exist keep exactly the same totals', async (t) => {
  const db = databaseAtV1();
  insertV1Invoice(db, {
    number: 'INV-0001',
    issueDate: '2026-01-10',
    dueDate: '2026-02-09',
    status: 'sent',
    taxRateBps: 2000,
    lines: [
      { description: 'Design', quantity: 3, unitPriceCents: 1999 },
      { description: 'Stamp', quantity: 1, unitPriceCents: 1 },
    ],
  });
  migrate(db);
  const app = await startInvoicerOn(db, '2026-04-01');
  t.after(app.close);

  const old = (await app.call('GET', '/api/invoices/1')).body as Body;
  // 5997 + 1 = 5998; tax 1199.6 -> 1200; total 7198, as before.
  assert.deepEqual([old.subtotalCents, old.taxCents, old.totalCents], [5998, 1200, 7198]);
  assert.deepEqual(old.lines.map((l) => l.unitPrice), ['19.9900', '0.0100']);
  assert.deepEqual(old.lines.map((l) => l.totalCents), [5997, 1]);

  // New invoices still work on the upgraded database.
  const next = await app.invoice('0.0055', 10);
  assert.equal(next.number, 'INV-0002');
  assert.equal(next.totalCents, 7); // 6 cents, plus 20% tax (1.2 -> 1)
});
