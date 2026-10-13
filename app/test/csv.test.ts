import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  invoicesToCsv,
  type InvoiceRow,
} from '../src/domain/csv.ts';

const row: InvoiceRow = {
  number: 'INV-0001',
  clientName: 'Plain Client',
  issueDate: '2026-03-01',
  dueDate: '2026-03-31',
  status: 'sent',
  subtotalCents: 93725,
  taxCents: 18745,
  totalCents: 112470,
};

const HEADER =
  'number,client,issue_date,due_date,status,' +
  'subtotal,tax,total\r\n';

test('CSV has a header and one row per invoice', () => {
  assert.equal(
    invoicesToCsv([row]),
    HEADER +
      'INV-0001,Plain Client,2026-03-01,2026-03-31,sent,' +
      '937.25,187.45,1124.70\r\n',
  );
});

test('commas and quotes force quoting', () => {
  const csv = invoicesToCsv([
    { ...row, clientName: 'Smith, "Jo" & Co' },
  ]);
  assert.match(csv, /,"Smith, ""Jo"" & Co",/);
});

test('an empty export still has the header', () => {
  assert.equal(
    invoicesToCsv([]),
    HEADER,
  );
});
