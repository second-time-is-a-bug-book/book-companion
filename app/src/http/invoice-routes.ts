// Routes for clients and invoices. Handlers check input, call
// the domain and db layers, and return a Reply. They never do
// money arithmetic themselves.
import {
  getClient,
  insertClient,
  listClients,
} from '../db/clients.ts';
import type { Database } from '../db/database.ts';
import {
  createInvoice,
  getInvoice,
  listInvoiceRows,
  setStatus,
} from '../db/invoices.ts';
import { invoicesToCsv } from '../domain/csv.ts';
import {
  dueDateFor,
  invoiceTotals,
  validateLines,
  type InvoiceStatus,
  type LineItem,
} from '../domain/invoice.ts';
import { parseCents } from '../domain/money.ts';
import { DEFAULT_TAX_RATE_BPS } from '../config.ts';
import { renderInvoiceList } from '../ui/pages.ts';
import { HttpError, type Reply, type Route } from './reply.ts';

// The shape the front end posts. Prices arrive as text
// ("12.50") and become cents here.
interface LineInput {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
}

export function invoiceRoutes(
  db: Database,
  today: () => string,
): Route[] {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/clients$/,
      handle: () => ok(listClients(db)),
    },
    {
      method: 'POST',
      pattern: /^\/api\/clients$/,
      handle: (_, body) => addClient(db, body),
    },
    {
      method: 'GET',
      pattern: /^\/api\/invoices$/,
      handle: () => ok(listInvoiceRows(db)),
    },
    {
      method: 'POST',
      pattern: /^\/api\/invoices$/,
      handle: (_, body) => addInvoice(db, body, today()),
    },
    {
      method: 'GET',
      pattern: /^\/api\/invoices\.csv$/,
      handle: () => csv(db),
    },
    {
      method: 'GET',
      pattern: /^\/api\/invoices\/(\d+)$/,
      handle: ([id]) => ok(withTotals(db, Number(id))),
    },
    {
      method: 'POST',
      pattern: /^\/api\/invoices\/(\d+)\/send$/,
      handle: ([id]) => move(db, Number(id), 'sent'),
    },
    {
      method: 'POST',
      pattern: /^\/api\/invoices\/(\d+)\/pay$/,
      handle: ([id]) => move(db, Number(id), 'paid'),
    },
    {
      method: 'GET',
      pattern: /^\/invoices$/,
      handle: () => ({
        status: 200,
        body: renderInvoiceList(listInvoiceRows(db)),
        type: 'text/html; charset=utf-8',
      }),
    },
  ];
}

function ok(body: unknown, status = 200): Reply {
  return { status, body };
}

function addClient(db: Database, body: unknown): Reply {
  const { name, email } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
  };
  if (typeof name !== 'string' || name.trim() === '')
    throw new HttpError(400, 'name is required.');
  if (typeof email !== 'string' || !email.includes('@'))
    throw new HttpError(400, 'email must be an email address.');
  return ok(insertClient(db, name.trim(), email.trim()), 201);
}

function addInvoice(
  db: Database,
  body: unknown,
  issueDate: string,
): Reply {
  const input = (body ?? {}) as {
    clientId?: unknown;
    lines?: unknown;
    taxRateBps?: unknown;
  };
  const clientId = Number(input.clientId);
  if (!getClient(db, clientId))
    throw new HttpError(
      400,
      `No client with id ${String(input.clientId)}.`,
    );
  if (!Array.isArray(input.lines))
    throw new HttpError(400, 'lines must be an array.');
  const lines = input.lines.map(toLineItem);
  const problems = validateLines(lines);
  if (problems.length > 0)
    throw new HttpError(400, problems.join(' '));
  const taxRateBps =
    input.taxRateBps === undefined
      ? DEFAULT_TAX_RATE_BPS
      : Number(input.taxRateBps);
  const invoice = createInvoice(db, {
    clientId,
    issueDate,
    dueDate: dueDateFor(issueDate),
    taxRateBps,
    lines,
  });
  return ok(
    {
      ...invoice,
      ...invoiceTotals(invoice.lines, invoice.taxRateBps),
    },
    201,
  );
}

function toLineItem(line: LineInput): LineItem {
  try {
    const price = String(line.unitPrice ?? '');
    return {
      description: String(line.description ?? ''),
      quantity: Number(line.quantity),
      unitPriceCents: parseCents(price),
    };
  } catch (error) {
    throw new HttpError(400, (error as Error).message);
  }
}

function withTotals(db: Database, id: number): unknown {
  const invoice = getInvoice(db, id);
  if (!invoice)
    throw new HttpError(404, `No invoice with id ${id}.`);
  return {
    ...invoice,
    ...invoiceTotals(invoice.lines, invoice.taxRateBps),
  };
}

function move(
  db: Database,
  id: number,
  status: InvoiceStatus,
): Reply {
  if (!setStatus(db, id, status))
    throw new HttpError(404, `No invoice with id ${id}.`);
  return ok(withTotals(db, id));
}

function csv(db: Database): Reply {
  return {
    status: 200,
    body: invoicesToCsv(listInvoiceRows(db)),
    type: 'text/csv; charset=utf-8',
  };
}
