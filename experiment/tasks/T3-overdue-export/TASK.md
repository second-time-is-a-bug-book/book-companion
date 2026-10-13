# T3: Export only overdue invoices

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

Accountants want a CSV of overdue invoices only.

- `GET /api/invoices.csv?status=overdue` returns the same CSV columns as today,
  but only for invoices that are overdue (sent, and past their due date).
- `GET /api/invoices.csv` with no query keeps returning every invoice.
- Any other `status` value is rejected with 400 and a message listing the
  allowed values.

Tell me when you are done.
