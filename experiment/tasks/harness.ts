// Shared setup for the hidden acceptance tests: a fresh Invoicer on a free
// port with one client, and a clock the test can move.
// The tests talk HTTP only, so they compile before the feature exists.
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { insertClient } from '../../app/src/db/clients.ts';
import { openDatabase, type Database } from '../../app/src/db/database.ts';
import { createApp } from '../../app/src/http/server.ts';

export async function startInvoicer(today: string) {
  const db = openDatabase();
  const client = insertClient(db, 'Acceptance Client', 'client@example.com');
  return { ...(await startInvoicerOn(db, today)), clientId: client.id };
}

// Starts Invoicer on a database you prepared, for example one
// made by databaseAtV1() and then migrated.
export async function startInvoicerOn(db: Database, today: string) {
  const clock = { today };
  const server = createApp({ db, version: 'acceptance', today: () => clock.today });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const clientId = (db.prepare('SELECT MIN(id) AS id FROM clients').get() as { id: number }).id;

  async function call(method: string, path: string, body?: unknown) {
    const response = await fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const type = response.headers.get('content-type') ?? '';
    return { status: response.status, body: type.includes('json') ? await response.json() : await response.text() };
  }

  // Creates an invoice with one line and returns its JSON.
  async function invoice(unitPrice: string, quantity = 1) {
    const created = await call('POST', '/api/invoices', {
      clientId,
      lines: [{ description: 'Work', quantity, unitPrice }],
    });
    return created.body as { id: number; number: string; totalCents: number; dueDate: string };
  }

  return { clock, call, invoice, db, clientId, close: () => server.close() };
}

// ------------------------------------------------------------------
// A database as release v1.0.0 left it: the schema of migrations 001
// to 003, written out here so that editing those files cannot change
// what "an existing database" means. Insert rows with insertV1Invoice,
// then call migrate(db) to bring it up to date.

export const V1_MIGRATIONS = ['001_create_clients.sql', '002_create_invoices.sql', '003_create_reminders.sql'];

const V1_SCHEMA = `
CREATE TABLE clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid')),
  tax_rate_bps INTEGER NOT NULL
);
CREATE TABLE line_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);
CREATE TABLE reminders (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_on TEXT NOT NULL,
  days_overdue INTEGER NOT NULL
);
`;

export function databaseAtV1(): Database {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY)');
  db.exec(V1_SCHEMA);
  for (const name of V1_MIGRATIONS) db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
  db.prepare("INSERT INTO clients (name, email) VALUES ('Existing Client', 'existing@example.com')").run();
  return db;
}

export interface V1Invoice {
  number: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid';
  taxRateBps: number;
  lines: { description: string; quantity: number; unitPriceCents: number }[];
}

// Inserts an invoice the way v1.0.0 stored it. Returns its id.
export function insertV1Invoice(db: Database, inv: V1Invoice): number {
  const result = db
    .prepare(
      `INSERT INTO invoices (number, client_id, issue_date, due_date, status, tax_rate_bps)
       VALUES (?, (SELECT MIN(id) FROM clients), ?, ?, ?, ?)`,
    )
    .run(inv.number, inv.issueDate, inv.dueDate, inv.status, inv.taxRateBps);
  const id = Number(result.lastInsertRowid);
  const line = db.prepare(
    `INSERT INTO line_items (invoice_id, position, description, quantity, unit_price_cents)
     VALUES (?, ?, ?, ?, ?)`,
  );
  inv.lines.forEach((l, i) => line.run(id, i, l.description, l.quantity, l.unitPriceCents));
  return id;
}

// The column names of a table, in order.
export function columns(db: Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}
