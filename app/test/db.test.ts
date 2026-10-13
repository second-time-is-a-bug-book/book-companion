import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  insertClient,
  listClients,
} from '../src/db/clients.ts';
import {
  migrate,
  openDatabase,
  upSection,
} from '../src/db/database.ts';
import {
  createInvoice,
  getInvoice,
  listInvoiceRows,
  setStatus,
} from '../src/db/invoices.ts';
import { runReminderJob } from '../src/jobs/reminder-job.ts';

function seeded() {
  const db = openDatabase();
  const client = insertClient(
    db,
    'Ada Studio',
    'ada@example.com',
  );
  const invoice = createInvoice(db, {
    clientId: client.id,
    issueDate: '2026-03-01',
    dueDate: '2026-03-31',
    taxRateBps: 2000,
    lines: [
      {
        description: 'Logo',
        quantity: 1,
        unitPriceCents: 50000,
      },
      {
        description: 'Revisions',
        quantity: 3,
        unitPriceCents: 4000,
      },
    ],
  });
  return { db, client, invoice };
}

test('migrations run once and are recorded', () => {
  const db = openDatabase();
  // openDatabase has applied them already.
  assert.deepEqual(migrate(db), []);
});

test('upSection returns only the up part', () => {
  const up = '-- migrate:up\nCREATE TABLE t (id INTEGER);\n';
  const sql = up + '-- migrate:down\nDROP TABLE t;\n';
  assert.equal(upSection(sql), up);
});

test('an invoice round-trips with its lines, in cents', () => {
  const { db, invoice } = seeded();
  const loaded = getInvoice(db, invoice.id);
  assert.equal(loaded?.number, 'INV-0001');
  assert.deepEqual(
    loaded?.lines.map((line) => line.unitPriceCents),
    [50000, 4000],
  );
});

test('invoice rows include the client name and totals', () => {
  const { db } = seeded();
  const [row] = listInvoiceRows(db);
  assert.equal(row.clientName, 'Ada Studio');
  assert.equal(row.subtotalCents, 62000);
  assert.equal(row.totalCents, 74400);
});

test('a failed insert leaves no half-written invoice', () => {
  const { db } = seeded();
  assert.throws(() =>
    createInvoice(db, {
      clientId: 999, // no such client: the foreign key fails
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      taxRateBps: 2000,
      lines: [
        { description: 'X', quantity: 1, unitPriceCents: 1 },
      ],
    }),
  );
  assert.equal(listInvoiceRows(db).length, 1);
});

test('clients are listed by name', () => {
  const { db } = seeded();
  insertClient(db, 'Aaron', 'aaron@example.com');
  assert.deepEqual(
    listClients(db).map((c) => c.name),
    ['Aaron', 'Ada Studio'],
  );
});

test('reminds an overdue invoice once per interval', () => {
  const { db, invoice } = seeded();
  setStatus(db, invoice.id, 'sent');
  assert.equal(runReminderJob(db, '2026-04-02').length, 1);
  assert.equal(runReminderJob(db, '2026-04-03').length, 0);
  assert.equal(runReminderJob(db, '2026-04-09').length, 1);
});
