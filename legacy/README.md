# billing-export (legacy)

`billing-export.js` exports invoices in the semicolon format that the
(fictional) accounting customers import. It is written the way a lot of 2014
Node code was: `var`, globals shared between calls, a callback API, and no
tests. It is deliberately left that way for Chapter 10.

## Quirks that customers depend on

- **Tax is rounded per line, half up, in floating point**, then summed. Rounding
  once on the invoice total would be "more correct" and would change some
  invoices by a cent (invoice 2014-001 in the fixtures: 0.04 becomes 0.03).
- **Dates are M/D/YY** with no zero padding (`3/7/14`).
- **Customer names are not escaped**, so a name containing `;` shifts the
  columns (`Smith; Jones & Sons`). Fixing that is a separate, deliberate change.
- **Module-level state**: concurrent calls share the `rows` array.

## The golden master

`characterisation/` pins today's output, quirks included, before anyone
changes the code:

- `fixtures/invoices.json`: recorded input invoices.
- `expected/*.csv`: what the exporter printed for them.
- `billing-export.test.ts`: fails if the output changes in any way (part of `npm test`).
- `record.ts`: re-records the expected files. Only a human runs it, after
  reading the diff and agreeing the change is wanted.

Drill D22 shows an agent's clean-up changing the rounding and the golden master
catching it.
