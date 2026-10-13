# T1: Partial payments

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

Clients sometimes pay an invoice in parts. Add partial payments to Invoicer:

- `POST /api/invoices/:id/payments` with a body like `{ "amount": "250.00" }`
  records a payment against a sent invoice and answers 201 with the updated invoice.
- `GET /api/invoices/:id` includes `paidCents` (sum of payments) and
  `balanceCents` (total minus paid).
- When the balance reaches zero the invoice's status becomes `paid`.
- A payment larger than the balance, or an amount that is not a valid money
  amount, is rejected with 400 and a message saying why.
- Payments are stored in the database and survive a restart.

Tell me when you are done.
