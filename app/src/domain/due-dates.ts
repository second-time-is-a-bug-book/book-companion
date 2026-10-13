// Date rules for invoices. Dates are ISO strings (YYYY-MM-DD)
// in UTC, so they compare correctly as plain strings and never
// shift with the server's time zone.

const DAY_MS = 86_400_000;

export function addDays(isoDate: string, days: number): string {
  const time =
    Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

// Only sent invoices can be overdue: drafts were never sent,
// paid ones are settled. An invoice due today is not overdue
// yet.
export function isOverdue(
  status: string,
  dueDate: string,
  today: string,
): boolean {
  return status === 'sent' && today > dueDate;
}

export function daysOverdue(
  dueDate: string,
  today: string,
): number {
  const days =
    (Date.parse(today) - Date.parse(dueDate)) / DAY_MS;
  return Math.max(0, days);
}
