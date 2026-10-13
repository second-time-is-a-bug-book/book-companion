// Unit tests for the line scanners. Fake secrets are built from pieces so
// that this file does not itself trip a secret scanner.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findViolations } from '../layer-boundary.ts';
import { findFloatMoney } from '../no-float-money.ts';
import { findSkips } from '../no-skip.ts';
import { findSecrets } from '../secret-scan.ts';

test('no-float-money flags parseFloat, toFixed, decimals in money lines and REAL columns', () => {
  const source = [
    'const price = parseFloat(input);',
    'const shown = total.toFixed(2);',
    'const tax = subtotal * 0.2;',
    'amount REAL NOT NULL',
    "const message = 'use 12.50, not 12.5';", // text in quotes is fine
    '// total * 1.2 in a comment is fine',
    'const cents = parseCents(text);',
  ].join('\n');
  const lines = findFloatMoney('x.ts', source).map((p) => p.split(':')[1]);
  assert.deepEqual(lines, ['1', '2', '3', '4']);
});

test('the fix-it message tells the agent what to use instead', () => {
  assert.match(findFloatMoney('x.ts', 'const t = parseFloat(a);')[0], /parseCents\(\)/);
});

test('layer-boundary forbids ui -> db and domain -> anything, allows http -> db', () => {
  assert.equal(findViolations('app/src/ui/pages.ts', "import { listClients } from '../db/clients.ts';").length, 1);
  assert.equal(findViolations('app/src/domain/x.ts', "import { createApp } from '../http/server.ts';").length, 1);
  assert.equal(findViolations('app/src/http/x.ts', "import { listClients } from '../db/clients.ts';").length, 0);
  assert.equal(findViolations('app/src/ui/pages.ts', "import { formatCents } from '../domain/money.ts';").length, 0);
});

test('layer-boundary sees the last line of a multi-line import', () => {
  const source = "import {\n  listClients,\n} from '../db/clients.ts';";
  assert.match(findViolations('app/src/ui/pages.ts', source)[0], /pages\.ts:3 imports/);
});

test('no-skip finds skip, only and todo in all their forms', () => {
  const source = [
    "test.skip('a', () => {});",
    "it.only('b', () => {});",
    "test('c', { skip: true }, () => {});",
    "test.todo('d');",
    "xit('e', () => {});",
    "test('f', () => {});",
  ].join('\n');
  assert.equal(findSkips('t.test.ts', source).length, 5);
});

test('secret-scan finds keys, redacts them, and ignores drill patches', () => {
  const live = 'mk_' + 'live_' + '9f8e7d6c5b4a3928';
  const lines = [
    { path: 'a.ts', line: 3, text: `const KEY = '${live}';` },
    { path: 'b.ts', line: 1, text: `const password = "${'hunter2hunter2' + 'x'}";` },
    { path: 'c.ts', line: 9, text: "const greeting = 'hello';" },
    { path: 'drills/D18/mistake.patch', line: 1, text: `+const KEY = '${live}';` },
  ];
  const problems = findSecrets(lines);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /a\.ts:3: looks like a live API key/);
  assert.ok(!problems[0].includes(live), 'the secret itself must not be printed');
});
