// The golden-master cases: the same recorded invoices, run
// through each option.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

type Export = (
  invoices: unknown[],
  opts: object,
  cb: (err: Error | null, csv?: string) => void,
) => void;

const require = createRequire(import.meta.url);
const legacy = require('../billing-export.js');
const exportInvoices: Export = legacy.exportInvoices;

const here = import.meta.url;
const fixture = new URL('./fixtures/invoices.json', here);
export const invoices = JSON.parse(
  readFileSync(fixture, 'utf8'),
);

export const cases = [
  { name: 'default', opts: {} },
  { name: 'upper-case-names', opts: { upperCaseNames: true } },
];

export function expectedFile(name: string): URL {
  return new URL(`./expected/${name}.csv`, here);
}

// Wraps the 2014 callback API in a promise, for the tests.
export function runExport(input: unknown[], opts: object) {
  return new Promise<string>((resolve, reject) => {
    exportInvoices(input, opts, (err, csv) =>
      err ? reject(err) : resolve(csv ?? ''),
    );
  });
}
