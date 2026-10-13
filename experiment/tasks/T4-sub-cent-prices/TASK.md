# T4: Prices below a cent

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

Some clients are billed per SMS or per API call, at unit prices below a cent.
Let unit prices have up to four decimal places:

- `POST /api/invoices` accepts a `unitPrice` like `"0.0125"`. Prices with up
  to two decimals keep working as today. More than four decimals, or anything
  that is not an amount, is rejected with 400 and a message saying why.
- A line's total is its quantity times its unit price, rounded half up to a
  whole cent, once per line. Subtotal, tax and total stay whole cents and are
  worked out from the line totals as today.
- In `GET /api/invoices/:id`, each line has `unitPrice` (text with exactly
  four decimals, like `"0.0125"` or `"12.5000"`) and `totalCents`.
- Amounts must be exact for every price with up to four decimals.
- Invoices that already exist in a database keep exactly the same totals.

Tell me when you are done.
