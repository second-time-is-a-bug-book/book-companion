// Invoice rules that do not depend on storage or HTTP.
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  DEFAULT_TAX_RATE_BPS,
} from '../config.ts';
import { addDays } from './due-dates.ts';
import { assertCents, taxCents, type Cents } from './money.ts';

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface Client {
  id: number;
  name: string;
  email: string;
}

export interface LineItem {
  description: string;
  quantity: number; // whole units: hours, days, items
  unitPriceCents: Cents;
}

export interface Invoice {
  id: number;
  number: string;
  clientId: number;
  issueDate: string; // ISO date, YYYY-MM-DD
  dueDate: string;
  status: InvoiceStatus;
  taxRateBps: number;
  lines: LineItem[];
}

export interface Totals {
  subtotalCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
}

export function lineTotalCents(line: LineItem): Cents {
  return line.quantity * line.unitPriceCents;
}

// Tax is computed once on the subtotal, not per line, so it is
// rounded once.
export function invoiceTotals(
  lines: LineItem[],
  taxRateBps = DEFAULT_TAX_RATE_BPS,
): Totals {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + lineTotalCents(line),
    0,
  );
  const tax = taxCents(subtotalCents, taxRateBps);
  return {
    subtotalCents,
    taxCents: tax,
    totalCents: subtotalCents + tax,
  };
}

// Returns a list of problems; an empty list means the lines
// are valid.
export function validateLines(lines: LineItem[]): string[] {
  const problems: string[] = [];
  if (lines.length === 0)
    problems.push('An invoice needs at least one line item.');
  lines.forEach((line, i) => {
    if (line.description.trim() === '')
      problems.push(`Line ${i + 1}: description is empty.`);
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      const what = 'must be a whole number of at least 1';
      problems.push(`Line ${i + 1}: quantity ${what}.`);
    }
    try {
      assertCents(line.unitPriceCents);
    } catch {
      problems.push(
        `Line ${i + 1}: unit price must be integer cents.`,
      );
    }
  });
  return problems;
}

export function dueDateFor(
  issueDate: string,
  termsDays = DEFAULT_PAYMENT_TERMS_DAYS,
): string {
  return addDays(issueDate, termsDays);
}

// Invoice numbers are sequential and zero padded: INV-0001,
// INV-0002, ...
export function invoiceNumber(sequence: number): string {
  return `INV-${String(sequence).padStart(4, '0')}`;
}
