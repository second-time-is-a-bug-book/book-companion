// Hidden acceptance test for T5. Do not show this file to the agent.
//   node --test experiment/tasks/T5-legacy-options/acceptance.test.ts
// The recorded invoices and today's output are copied in here, so
// that re-recording the golden master cannot make this test pass.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const legacy = require('../../../legacy/billing-export.js');

type Cb = (err: Error | null, csv?: string) => void;
function run(invoices: unknown[], opts?: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const cb: Cb = (err, csv) => (err ? reject(err) : resolve(csv ?? ''));
    if (opts === undefined) legacy.exportInvoices(invoices, cb);
    else legacy.exportInvoices(invoices, opts, cb);
  });
}

// legacy/characterisation/fixtures/invoices.json at v1.0.0.
const RECORDED = [
  { no: '2014-001', date: '2014-03-07', customer: 'Harbour Bakery', lines: [{ qty: 3, price: 0.03 }, { qty: 1, price: 0.03 }, { qty: 1, price: 0.03 }] },
  { no: '2014-002', date: '2014-11-30', customer: 'North Field Farm', lines: [{ qty: 1, price: 12.5 }, { qty: 2, price: 7.3 }] },
  { no: '2014-003', date: '2015-01-02', customer: 'Smith; Jones & Sons', lines: [{ qty: 10, price: 99.99 }, { qty: 1, price: 0.05 }, { qty: 1, price: 0.05 }, { qty: 1, price: 0.05 }] },
  { no: '2014-004', date: '2014-12-31', customer: 'Quiet Pines Studio', lines: [{ qty: 4, price: 1.005 }] },
];

// legacy/characterisation/expected/*.csv at v1.0.0.
const TODAY_DEFAULT =
  'No;Date;Customer;Net;Tax;Gross\n' +
  '2014-001;3/7/14;Harbour Bakery;0.15;0.04;0.19\n' +
  '2014-002;11/30/14;North Field Farm;27.10;5.15;32.25\n' +
  '2014-003;1/2/15;Smith; Jones & Sons;1000.05;190.01;1190.06\n' +
  '2014-004;12/31/14;Quiet Pines Studio;4.02;0.76;4.78\n' +
  'TOTAL;;;;;1227.28\n';
const TODAY_UPPER =
  'No;Date;Customer;Net;Tax;Gross\n' +
  '2014-001;3/7/14;HARBOUR BAKERY;0.15;0.04;0.19\n' +
  '2014-002;11/30/14;NORTH FIELD FARM;27.10;5.15;32.25\n' +
  '2014-003;1/2/15;SMITH; JONES & SONS;1000.05;190.01;1190.06\n' +
  '2014-004;12/31/14;QUIET PINES STUDIO;4.02;0.76;4.78\n' +
  'TOTAL;;;;;1227.28\n';

// Two new invoices. With a 7% rate, N-1's tax is 0.00 when it is
// rounded per line (0.0049 + 0.0049), as today's 19% tax is; it
// would be 0.01 if it were rounded once per invoice.
const NEW = [
  { no: 'N-1', date: '2026-02-03', customer: 'Fjord & Co', lines: [{ qty: 1, price: 0.07 }, { qty: 1, price: 0.07 }] },
  { no: 'N-2', date: '2026-12-25', customer: 'The "Best" Shop; Ltd', lines: [{ qty: 2, price: 12 }, { qty: 1, price: 0.15 }] },
];

test('T5: output without the new options is byte-for-byte unchanged', async () => {
  assert.equal(await run(RECORDED), TODAY_DEFAULT);
  assert.equal(await run(RECORDED, {}), TODAY_DEFAULT);
  assert.equal(await run(RECORDED, { upperCaseNames: true }), TODAY_UPPER);
  assert.equal(legacy.lastCount(), 4);
  await assert.rejects(run([{ no: 'X-1', lines: [] }], {}), /invoice X-1 has no lines/);
});

test('T5: isoDates, taxRate and quoteNames', async () => {
  assert.equal(
    await run(NEW, { isoDates: true, taxRate: 0.07, quoteNames: true }),
    'No;Date;Customer;Net;Tax;Gross\n' +
      'N-1;2026-02-03;"Fjord & Co";0.14;0.00;0.14\n' +
      'N-2;2026-12-25;"The ""Best"" Shop; Ltd";24.15;1.69;25.84\n' +
      'TOTAL;;;;;25.98\n',
  );
  assert.equal(
    await run(NEW, { quoteNames: true, upperCaseNames: true }),
    'No;Date;Customer;Net;Tax;Gross\n' +
      'N-1;2/3/26;"FJORD & CO";0.14;0.02;0.16\n' +
      'N-2;12/25/26;"THE ""BEST"" SHOP; LTD";24.15;4.59;28.74\n' +
      'TOTAL;;;;;28.90\n',
  );
  assert.equal(
    await run([RECORDED[0]], { isoDates: true }),
    'No;Date;Customer;Net;Tax;Gross\n2014-001;2014-03-07;Harbour Bakery;0.15;0.04;0.19\nTOTAL;;;;;0.19\n',
  );
  for (const bad of [1.5, -0.1, '7%', Number.NaN]) {
    await assert.rejects(run(NEW, { taxRate: bad }), /taxRate/, `taxRate ${String(bad)} should be an error`);
  }
});

test('T5: exports started at the same time do not mix their rows', async () => {
  const [a, b, c] = await Promise.all([
    run(RECORDED),
    run(NEW, { isoDates: true }),
    run(RECORDED, { upperCaseNames: true }),
  ]);
  assert.equal(a, TODAY_DEFAULT);
  assert.equal(
    b,
    'No;Date;Customer;Net;Tax;Gross\n' +
      'N-1;2026-02-03;Fjord & Co;0.14;0.02;0.16\n' +
      'N-2;2026-12-25;The "Best" Shop; Ltd;24.15;4.59;28.74\n' +
      'TOTAL;;;;;28.90\n',
  );
  assert.equal(c, TODAY_UPPER);
});
