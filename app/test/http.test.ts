import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { insertClient } from '../src/db/clients.ts';
import { openDatabase } from '../src/db/database.ts';
import { createApp } from '../src/http/server.ts';

const db = openDatabase();
const client = insertClient(
  db,
  'Ada Studio',
  'ada@example.com',
);
const server = createApp({
  db,
  version: '1.4.0',
  today: () => '2026-03-01',
});
let base = '';

before(async () => {
  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', resolve),
  );
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});
after(() => server.close());

function post(path: string, body: unknown) {
  return fetch(base + path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

test('GET /health and /version report the build', async () => {
  assert.deepEqual(
    await (await fetch(`${base}/health`)).json(),
    { status: 'ok' },
  );
  assert.deepEqual(
    await (await fetch(`${base}/version`)).json(),
    { version: '1.4.0' },
  );
});

test('POST /api/invoices stores cents and totals', async () => {
  const response = await post('/api/invoices', {
    clientId: client.id,
    lines: [
      {
        description: 'Workshop',
        quantity: 2,
        unitPrice: '450.00',
      },
    ],
  });
  assert.equal(response.status, 201);
  const invoice = await response.json();
  assert.equal(invoice.dueDate, '2026-03-31');
  assert.deepEqual(
    [
      invoice.subtotalCents,
      invoice.taxCents,
      invoice.totalCents,
    ],
    [90000, 18000, 108000],
  );
});

test('bad input gets a 400 that says what to fix', async () => {
  const response = await post('/api/invoices', {
    clientId: client.id,
    lines: [
      {
        description: 'Hours',
        quantity: 1,
        unitPrice: '12.345',
      },
    ],
  });
  assert.equal(response.status, 400);
  assert.match(
    (await response.json()).error,
    /at most two decimals/,
  );
});

test('sending and paying changes the status', async () => {
  const created = await (
    await post('/api/invoices', {
      clientId: client.id,
      lines: [
        { description: 'Hours', quantity: 1, unitPrice: '10' },
      ],
    })
  ).json();
  assert.equal(
    (
      await (
        await post(`/api/invoices/${created.id}/send`, {})
      ).json()
    ).status,
    'sent',
  );
  assert.equal(
    (
      await (
        await post(`/api/invoices/${created.id}/pay`, {})
      ).json()
    ).status,
    'paid',
  );
});

test('unknown invoices and routes are 404', async () => {
  assert.equal(
    (await post('/api/invoices/999/send', {})).status,
    404,
  );
  assert.equal((await fetch(`${base}/nope`)).status, 404);
});

test('CSV export and the invoice list page', async () => {
  const csv = await fetch(`${base}/api/invoices.csv`);
  assert.match(
    csv.headers.get('content-type') ?? '',
    /text\/csv/,
  );
  assert.match(await csv.text(), /^number,client,/);
  assert.match(
    await (await fetch(`${base}/invoices`)).text(),
    /<td>Ada Studio<\/td>/,
  );
});

test('the front end is served; no path escapes', async () => {
  assert.match(
    await (await fetch(`${base}/`)).text(),
    /Send invoice/,
  );
  assert.equal(
    (await fetch(`${base}/%2e%2e/db/database.ts`)).status,
    404,
  );
});
