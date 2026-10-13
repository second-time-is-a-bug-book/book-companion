// guards/no-float-money.ts
// Rejects floating-point money in Invoicer's source and schema.
// Card P11 (Chapter 5). Placement: edit and commit.
// Kind: sensor, computational.
// Retire when: amounts are a branded Cents type the compiler
// enforces, and this guard has not fired for 90 days.
import { readFileSync } from 'node:fs';
import { isComment, listFiles } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';

const FIX =
  'Fix: money in Invoicer is integer cents. Parse text with ' +
  'parseCents(), format with formatCents() and compute tax ' +
  'with taxCents(), all in app/src/domain/money.ts. ' +
  'Do not round floats.';

const MONEY_WORD = /price|amount|total|tax|cost|fee/i;
const DECIMAL = /\b\d+\.\d+\b/;

const RULES = [
  {
    test: (code: string) => /\bparseFloat\(/.test(code),
    what: 'parseFloat() turns a money amount into a float',
  },
  {
    test: (code: string) => /\.toFixed\(/.test(code),
    what: 'toFixed() rounds a float; amounts are never floats',
  },
  {
    test: (code: string) =>
      MONEY_WORD.test(code) && DECIMAL.test(code),
    what: 'a decimal number in money arithmetic',
  },
  {
    test: (code: string) => /\bREAL\b/.test(code),
    what: 'a REAL column stores a float; use INTEGER cents',
  },
];

// Text inside quotes is a message, not arithmetic:
// "like 12.50" is fine.
function withoutStrings(line: string): string {
  return line.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
}

export function findFloatMoney(
  path: string,
  source: string,
): string[] {
  const problems: string[] = [];
  source.split('\n').forEach((line, i) => {
    if (isComment(line)) return;
    for (const rule of RULES) {
      if (rule.test(withoutStrings(line))) {
        const where = `${path}:${i + 1}: ${rule.what}.`;
        problems.push(`${where}\n  ${line.trim()}\n${FIX}`);
      }
    }
  });
  return problems;
}

if (isMain(import.meta.url)) {
  const files = listFiles('app/src', ['.ts', '.js', '.sql']);
  const problems = files.flatMap((file) =>
    findFloatMoney(file, readFileSync(file, 'utf8')),
  );
  report(
    'no-float-money',
    problems,
    `${files.length} files scanned`,
  );
}
