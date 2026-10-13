// Invoice storage. Amounts go in and out as integer cents.
import type { InvoiceRow } from '../domain/csv.ts';
import {
  invoiceNumber,
  invoiceTotals,
  type Invoice,
  type InvoiceStatus,
  type LineItem,
} from '../domain/invoice.ts';
import type {
  Reminder,
  ReminderCandidate,
} from '../domain/reminders.ts';
import { transaction, type Database } from './database.ts';

export interface NewInvoice {
  clientId: number;
  issueDate: string;
  dueDate: string;
  taxRateBps: number;
  lines: LineItem[];
}

export function createInvoice(
  db: Database,
  input: NewInvoice,
): Invoice {
  return transaction(db, () => {
    const { count } = db
      .prepare('SELECT COUNT(*) AS count FROM invoices')
      .get() as { count: number };
    const number = invoiceNumber(count + 1);
    const result = db
      .prepare(
        `INSERT INTO invoices (number, client_id, issue_date,
           due_date, status, tax_rate_bps)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        number,
        input.clientId,
        input.issueDate,
        input.dueDate,
        'draft',
        input.taxRateBps,
      );
    const id = Number(result.lastInsertRowid);
    const insertLine = db.prepare(
      `INSERT INTO line_items (invoice_id, position,
         description, quantity, unit_price_cents)
       VALUES (?, ?, ?, ?, ?)`,
    );
    input.lines.forEach((line, i) =>
      insertLine.run(
        id,
        i,
        line.description,
        line.quantity,
        line.unitPriceCents,
      ),
    );
    return { id, number, status: 'draft', ...input };
  });
}

export function getInvoice(
  db: Database,
  id: number,
): Invoice | undefined {
  const row = db
    .prepare(
      `SELECT id, number, client_id AS clientId,
         issue_date AS issueDate, due_date AS dueDate, status,
         tax_rate_bps AS taxRateBps
       FROM invoices WHERE id = ?`,
    )
    .get(id) as Omit<Invoice, 'lines'> | undefined;
  if (!row) return undefined;
  const lines = db
    .prepare(
      `SELECT description, quantity,
         unit_price_cents AS unitPriceCents
       FROM line_items WHERE invoice_id = ? ORDER BY position`,
    )
    .all(id) as unknown as LineItem[];
  return { ...row, lines };
}

export function setStatus(
  db: Database,
  id: number,
  status: InvoiceStatus,
): boolean {
  return (
    db
      .prepare('UPDATE invoices SET status = ? WHERE id = ?')
      .run(status, id).changes === 1
  );
}

// One row per invoice with client name and totals, for the
// list page and CSV.
export function listInvoiceRows(db: Database): InvoiceRow[] {
  const ids = db
    .prepare('SELECT id FROM invoices ORDER BY id')
    .all() as { id: number }[];
  return ids.map(({ id }) => {
    const invoice = getInvoice(db, id)!;
    const client = db
      .prepare('SELECT name FROM clients WHERE id = ?')
      .get(invoice.clientId) as { name: string };
    return {
      number: invoice.number,
      clientName: client.name,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      ...invoiceTotals(invoice.lines, invoice.taxRateBps),
    };
  });
}

export function reminderCandidates(
  db: Database,
): ReminderCandidate[] {
  return db
    .prepare(
      `SELECT i.id, i.number, i.status, i.due_date AS dueDate,
         MAX(r.sent_on) AS lastRemindedOn
       FROM invoices i
       LEFT JOIN reminders r ON r.invoice_id = i.id
       GROUP BY i.id ORDER BY i.id`,
    )
    .all() as unknown as ReminderCandidate[];
}

export function recordReminder(
  db: Database,
  reminder: Reminder,
  today: string,
): void {
  db.prepare(
    `INSERT INTO reminders (invoice_id, sent_on, days_overdue)
     VALUES (?, ?, ?)`,
  ).run(reminder.invoiceId, today, reminder.daysOverdue);
}
