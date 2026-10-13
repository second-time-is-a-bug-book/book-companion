// Hidden acceptance test for T6. Do not show this file to the agent.
//   node --test experiment/tasks/T6-stored-totals/acceptance.test.ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { migrate } from '../../../app/src/db/database.ts';
import { columns, databaseAtV1, insertV1Invoice, startInvoicerOn, V1_MIGRATIONS } from '../harness.ts';

const MIGRATIONS = new URL('../../../app/src/db/migrations/', import.meta.url);
const V1_INVOICE_COLUMNS = ['id', 'number', 'client_id', 'issue_date', 'due_date', 'status', 'tax_rate_bps'];
type Totals = { subtotalCents: number; taxCents: number; totalCents: number };

function stored(db: ReturnType<typeof databaseAtV1>, id: number): number[] {
  const row = db.prepare('SELECT subtotal_cents AS s, tax_cents AS t, total_cents AS g FROM invoices WHERE id = ?').get(id) as { s: number; t: number; g: number };
  return [row.s, row.t, row.g];
}

// Existing invoices, with the totals v1.0.0 shows for them. Tax is
// rounded half up once, on the subtotal, at each invoice's own rate.
function seedV1() {
  const db = databaseAtV1();
  const base = { issueDate: '2026-01-10', dueDate: '2026-02-09', status: 'sent' as const };
  const cases: [number, number[]][] = [
    [insertV1Invoice(db, { ...base, number: 'INV-0001', taxRateBps: 2000, lines: [{ description: 'A', quantity: 3, unitPriceCents: 1999 }, { description: 'B', quantity: 1, unitPriceCents: 1 }] }), [5998, 1200, 7198]],
    [insertV1Invoice(db, { ...base, number: 'INV-0002', taxRateBps: 0, lines: [{ description: 'A', quantity: 2, unitPriceCents: 4500 }] }), [9000, 0, 9000]],
    [insertV1Invoice(db, { ...base, number: 'INV-0003', taxRateBps: 1750, lines: [{ description: 'A', quantity: 1, unitPriceCents: 1250 }] }), [1250, 219, 1469]],
    // Per line, 25% of 2 cents is 0.5 -> 1, twice: 2. Once on the subtotal, 25% of 4 is 1.
    [insertV1Invoice(db, { ...base, number: 'INV-0004', taxRateBps: 2500, lines: [{ description: 'A', quantity: 1, unitPriceCents: 2 }, { description: 'B', quantity: 1, unitPriceCents: 2 }] }), [4, 1, 5]],
    [insertV1Invoice(db, { ...base, number: 'INV-0005', status: 'paid', taxRateBps: 2000, lines: [{ description: 'A', quantity: 7, unitPriceCents: 333 }] }), [2331, 466, 2797]],
  ];
  return { db, cases };
}

function newMigrations(): string[] {
  return readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql') && !V1_MIGRATIONS.includes(f)).sort();
}

function downSection(sql: string): string {
  const at = sql.indexOf('-- migrate:down');
  assert.notEqual(at, -1, 'every migration needs a "-- migrate:down" section');
  return sql.slice(at);
}

test('T6: the migration fills the totals of existing invoices', async (t) => {
  const { db, cases } = seedV1();
  migrate(db);
  const app = await startInvoicerOn(db, '2026-04-01');
  t.after(app.close);
  for (const [id, want] of cases) {
    assert.deepEqual(stored(db, id), want, `stored totals of invoice ${id}`);
    const api = (await app.call('GET', `/api/invoices/${id}`)).body as Totals;
    assert.deepEqual([api.subtotalCents, api.taxCents, api.totalCents], want, `API totals of invoice ${id}`);
  }
});

test('T6: new invoices get correct stored totals', async (t) => {
  const { db } = seedV1();
  migrate(db);
  const app = await startInvoicerOn(db, '2026-04-01');
  t.after(app.close);
  const made = await app.call('POST', '/api/invoices', {
    clientId: app.clientId,
    taxRateBps: 2500,
    lines: [
      { description: 'A', quantity: 1, unitPrice: '0.02' },
      { description: 'B', quantity: 1, unitPrice: '0.02' },
      { description: 'C', quantity: 3, unitPrice: '10.10' },
    ],
  });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const id = (made.body as { id: number }).id;
  // 4 + 3030 = 3034; 25% is 758.5 -> 759; total 3793.
  assert.deepEqual(stored(db, id), [3034, 759, 3793]);
  await app.call('POST', `/api/invoices/${id}/send`, {});
  assert.deepEqual(stored(db, id), [3034, 759, 3793]);
});

test('T6: the down step restores the old schema and keeps every invoice; up again refills', () => {
  const { db, cases } = seedV1();
  migrate(db);
  const added = newMigrations();
  assert.ok(added.length > 0, 'expected a new migration file');
  for (const file of [...added].reverse()) {
    db.exec(downSection(readFileSync(new URL(file, MIGRATIONS), 'utf8')));
    db.prepare('DELETE FROM schema_migrations WHERE name = ?').run(file);
  }
  assert.deepEqual(columns(db, 'invoices'), V1_INVOICE_COLUMNS);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM invoices').get() as { n: number }).n, cases.length);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM line_items').get() as { n: number }).n, 7);

  migrate(db);
  for (const [id, want] of cases) assert.deepEqual(stored(db, id), want, `refilled totals of invoice ${id}`);
});
