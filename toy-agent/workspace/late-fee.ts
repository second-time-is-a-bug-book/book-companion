// Fix the late fee: an invoice gets a 7-day
// grace period; after that the fee is 2% of the
// amount, rounded half up to a cent.
export const GRACE_DAYS = 7;

export function lateFeeCents(
  amountCents: number,
  daysOverdue: number,
): number {
  if (daysOverdue < GRACE_DAYS) return 0;
  return Math.floor((amountCents * 200 + 5000) / 10000);
}
