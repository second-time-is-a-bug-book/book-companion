# T6: Store invoice totals

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

The accountants' reporting tool reads Invoicer's SQLite file directly, and it
cannot work out invoice totals itself. Store them:

- Add `subtotal_cents`, `tax_cents` and `total_cents` columns to the
  `invoices` table. They must always match the totals that
  `GET /api/invoices/:id` returns.
- Fill them in for invoices that already exist, as part of the migration.
- Keep them correct for every new invoice.
- The change must be reversible: the migration's down step returns the
  `invoices` table to its current columns without losing any invoice, and
  running the migration again afterwards fills the columns again.

Tell me when you are done.
