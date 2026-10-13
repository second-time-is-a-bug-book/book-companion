// Shared setup for the hidden acceptance tests: a fresh Invoicer on a free
// port with one client, and a clock the test can move.
// The tests talk HTTP only, so they compile before the feature exists.
import type { AddressInfo } from 'node:net';
import { insertClient } from '../../app/src/db/clients.ts';
import { openDatabase } from '../../app/src/db/database.ts';
import { createApp } from '../../app/src/http/server.ts';

export async function startInvoicer(today: string) {
  const clock = { today };
  const db = openDatabase();
  const client = insertClient(db, 'Acceptance Client', 'client@example.com');
  const server = createApp({ db, version: 'acceptance', today: () => clock.today });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function call(method: string, path: string, body?: unknown) {
    const response = await fetch(base + path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    const type = response.headers.get('content-type') ?? '';
    return { status: response.status, body: type.includes('json') ? await response.json() : await response.text() };
  }

  // Creates an invoice with one line and returns its JSON.
  async function invoice(unitPrice: string, quantity = 1) {
    const created = await call('POST', '/api/invoices', {
      clientId: client.id,
      lines: [{ description: 'Work', quantity, unitPrice }],
    });
    return created.body as { id: number; number: string; totalCents: number; dueDate: string };
  }

  return { clock, call, invoice, close: () => server.close() };
}
