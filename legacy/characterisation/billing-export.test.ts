// Golden-master (characterisation) tests for
// legacy/billing-export.js. They pin what the exporter does
// TODAY, quirks included: tax rounded half up per line, M/D/YY
// dates, and customer names with ";" left unescaped. If one
// fails, the output changed. Do not re-record to make it pass;
// find out which change altered the output and whether
// customers asked for it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cases, expectedFile, invoices } from './cases.ts';
import { runExport } from './cases.ts';

for (const { name, opts } of cases) {
  const title = `billing-export output is unchanged: ${name}`;
  test(title, async () => {
    const expected = readFileSync(expectedFile(name), 'utf8');
    assert.equal(await runExport(invoices, opts), expected);
  });
}

const NO_LINES =
  'billing-export still rejects an invoice with no lines';
test(NO_LINES, async () => {
  const empty = [{ no: 'X-1', lines: [] }];
  const error = /invoice X-1 has no lines/;
  await assert.rejects(runExport(empty, {}), error);
});
