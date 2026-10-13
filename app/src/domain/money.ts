// Money in Invoicer is always an integer number of cents.
// Floats cannot represent most decimal amounts exactly (0.1 +
// 0.2 !== 0.3), so we parse, store and add cents, and round
// exactly once, in taxCents.

export type Cents = number;

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

// Parses a decimal amount typed by a person ("12", "12.5",
// "12.50") into cents. Works on the text, never on a float, so
// "0.29" is 29 cents and not 28.999...
export function parseCents(text: string): Cents {
  const match = AMOUNT_PATTERN.exec(text.trim());
  if (!match) {
    throw new Error(
      `Not an amount: "${text}". Use digits with at most ` +
        'two decimals, like 12.50',
    );
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '0').padEnd(2, '0'));
  return whole * 100 + fraction;
}

// Formats cents for people: 123456 becomes "1234.56".
export function formatCents(cents: Cents): string {
  assertCents(cents);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${Math.floor(abs / 100)}.${fraction}`;
}

// Tax on a net amount. The rate is in basis points (2000 =
// 20.00%). Rounds half up to a whole cent, once, on the amount
// you pass in.
export function taxCents(
  netCents: Cents,
  rateBps: number,
): Cents {
  assertCents(netCents);
  assertCents(rateBps);
  return Math.floor((netCents * rateBps + 5000) / 10000);
}

export function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(
      `Expected an integer number of cents, got ${value}`,
    );
  }
}
