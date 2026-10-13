# T5: Options for the legacy export

Give the agent the text below the line, followed by your condition's line from
`experiment/PROTOCOL.md`, and nothing else from this folder.

---

A second accounting customer wants to import the output of
`legacy/billing-export.js`, with different needs. Add three options to
`exportInvoices`:

- `isoDates: true` prints dates as `YYYY-MM-DD` instead of `M/D/YY`.
- `taxRate: 0.07` uses that rate instead of 19%. It must be a number from 0
  to 1; anything else is reported through the callback as an error that names
  `taxRate`. Tax is still rounded per line, exactly as it is today.
- `quoteNames: true` wraps each customer name in double quotes and doubles any
  double quote inside it, so a `;` in a name no longer shifts the columns. It
  works together with `upperCaseNames`.

A new batch job will run several exports at the same time, and today
concurrent calls can mix up their rows. Make concurrent calls safe.

Customers who pass none of the new options must get byte-for-byte the same
output as today.

Tell me when you are done.
