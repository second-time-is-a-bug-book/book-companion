// Pricing defaults for Invoicer. Coupled:
// app/test/fixtures/pricing.json and app/docs/pricing.md
// mirror these values. Change all three together (AGENTS.md,
// Coupling; checked by guards/coupling-check.ts).

// Basis points keep tax math in integers: 2000 bps = 20.00%.
export const DEFAULT_TAX_RATE_BPS = 2000;

// Days from issue date to due date when the client has no
// terms of its own.
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

// Overdue invoices get at most one reminder per this many
// days.
export const REMINDER_INTERVAL_DAYS = 7;
