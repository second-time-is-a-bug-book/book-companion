// CSV export for accountants. One row per invoice, amounts as
// decimal text.
import { formatCents, type Cents } from './money.ts';

export interface InvoiceRow {
  number: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotalCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
}

const HEADER = [
  'number',
  'client',
  'issue_date',
  'due_date',
  'status',
  'subtotal',
  'tax',
  'total',
];

export function invoicesToCsv(rows: InvoiceRow[]): string {
  const lines = rows.map((row) =>
    [
      row.number,
      row.clientName,
      row.issueDate,
      row.dueDate,
      row.status,
      formatCents(row.subtotalCents),
      formatCents(row.taxCents),
      formatCents(row.totalCents),
    ]
      .map(csvField)
      .join(','),
  );
  return [HEADER.join(','), ...lines].join('\r\n') + '\r\n';
}

// Quote a field only when it needs it, doubling any quotes
// inside (RFC 4180).
function csvField(value: string): string {
  return /[",\r\n]/.test(value)
    ? `"${value.replaceAll('"', '""')}"`
    : value;
}
