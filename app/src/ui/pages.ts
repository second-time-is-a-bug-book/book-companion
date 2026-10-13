// Server-rendered pages. The ui layer formats data it is
// given; it never fetches data itself
// (guards/layer-boundary.ts: ui may not import db).
import type { InvoiceRow } from '../domain/csv.ts';
import { formatCents } from '../domain/money.ts';

export function renderInvoiceList(rows: InvoiceRow[]): string {
  const body = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.number)}</td>
        <td>${escapeHtml(row.clientName)}</td>
        <td>${escapeHtml(row.dueDate)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td class="amount">${formatCents(row.totalCents)}</td>
      </tr>`,
    )
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoices</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main>
    <h1>Invoices</h1>
    <table>
      <thead><tr>
        <th>Number</th><th>Client</th><th>Due</th>
        <th>Status</th><th>Total</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p><a href="/">New invoice</a></p>
  </main>
</body>
</html>`;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
