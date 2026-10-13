# Pricing defaults

Invoicer applies these defaults when an invoice does not set
its own values. The source of truth is `app/src/config.ts`.
This page and `app/test/fixtures/pricing.json` mirror it, so
change all three together.

| Setting | Value | Constant |
|---|---|---|
| Default tax rate | 20.00% (2000 basis points) | `DEFAULT_TAX_RATE_BPS` |
| Payment terms | 30 days | `DEFAULT_PAYMENT_TERMS_DAYS` |
| Reminder interval | 7 days | `REMINDER_INTERVAL_DAYS` |

## How tax is rounded

Amounts are integer cents. Tax is computed once per invoice, on
the subtotal, and rounded half up to a whole cent. Example: a
subtotal of 10.05 at 20% gives tax of 2.01 (2.010 exactly), and
a subtotal of 0.03 gives tax of 0.01 (0.006 rounds up).
