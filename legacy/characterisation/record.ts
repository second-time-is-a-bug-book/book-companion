// Records the golden master: runs billing-export.js on the
// fixtures and saves what it prints today. Run it once, before
// changing the legacy code:
//   node legacy/characterisation/record.ts
// Re-recording after a change makes the characterisation tests
// meaningless. Only a human re-records, after reading the diff
// and agreeing the change is wanted.
import { writeFileSync } from 'node:fs';
import { cases, expectedFile, invoices } from './cases.ts';
import { runExport } from './cases.ts';

for (const { name, opts } of cases) {
  const file = expectedFile(name);
  writeFileSync(file, await runExport(invoices, opts));
  console.log(`recorded expected/${name}.csv`);
}
