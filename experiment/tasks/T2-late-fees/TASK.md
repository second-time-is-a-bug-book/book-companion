# T2: Late fees

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

Add a late fee to overdue invoices:

- `GET /api/invoices/:id` includes `lateFeeCents`.
- The fee is 2% of the invoice total, rounded half up to a whole cent.
- It applies only to sent invoices more than 7 days past their due date.
  Up to and including day 7 after the due date the fee is 0. Draft and paid
  invoices never have a fee.
- The CSV export gets a `late_fee` column after `total`.

Tell me when you are done.
