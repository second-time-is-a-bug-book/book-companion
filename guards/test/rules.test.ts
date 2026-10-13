import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkCoupling, parseCouplings, readCouplings } from '../coupling-check.ts';
import { checkBudget } from '../diff-budget.ts';
import { lintInstructions } from '../instructions-lint.ts';
import { checkMigration } from '../migration-guard.ts';
import { fetchInfo } from '../lib/registry.ts';
import { checkPackage, couldNotVerify } from '../package-check.ts';
import { checkPlan } from '../plan-required.ts';

// The experiment's "none" condition (experiment/PROTOCOL.md) runs without AGENTS.md.
const noAgentsFile = !existsSync('AGENTS.md') && 'no AGENTS.md here (the experiment\'s "none" condition)';

test('the coupling list in AGENTS.md parses into rows', { skip: noAgentsFile }, () => {
  const rows = parseCouplings(readFileSync('AGENTS.md', 'utf8'));
  assert.deepEqual(rows[0].when, ['app/src/config.ts']);
  assert.deepEqual(rows[0].also, ['app/test/fixtures/pricing.json', 'app/docs/pricing.md']);
});

test('coupling fails only when X changed without Y', () => {
  const rows = [{ when: ['a.ts'], also: ['b.md', 'docs/'], why: 'mirrored' }];
  assert.equal(checkCoupling(rows, ['a.ts']).length, 1);
  assert.equal(checkCoupling(rows, ['a.ts', 'b.md', 'docs/x.md']).length, 0);
  assert.equal(checkCoupling(rows, ['b.md']).length, 0);
  // No coupling list (the experiment's "none" condition): skip.
  assert.equal(readCouplings('no-such-AGENTS.md'), null);
});

test('instructions-lint: budget, dead paths, unknown scripts, rules without checks', () => {
  const text = ['# A', 'See `no/such/file.ts`.', 'Run `npm run nope`.', '## Rules', '- Be careful.', '- Lint: `npm run lint`'].join('\n');
  const problems = lintInstructions('A.md', text, { lint: 'x' });
  assert.equal(problems.length, 3);
  assert.equal(lintInstructions('A.md', 'line\n'.repeat(101), {}).length, 1);
});

test('migration-guard wants a down step, and a backup when data is destroyed', () => {
  assert.equal(checkMigration('1.sql', '-- migrate:up\nCREATE TABLE t (id INT);\n-- migrate:down\nDROP TABLE t;\n').length, 0);
  assert.equal(checkMigration('2.sql', '-- migrate:up\nCREATE TABLE t (id INT);\n').length, 1);
  assert.equal(checkMigration('3.sql', '-- migrate:up\nCREATE TABLE t (id INT);\n-- migrate:down\n-- nothing\n').length, 1);
  const drop = '-- migrate:up\nALTER TABLE c DROP COLUMN notes;\n-- migrate:down\nALTER TABLE c ADD COLUMN notes TEXT;\n';
  assert.equal(checkMigration('4.sql', drop).length, 1);
  assert.equal(checkMigration('5.sql', `-- backup: c_notes_backup\n${drop}`).length, 0);
});

test('package-check: missing, too new, install scripts', () => {
  const now = new Date('2026-10-13T00:00:00Z');
  assert.match(checkPackage('ghost', undefined, now)[0], /does not exist/);
  assert.match(checkPackage('fresh', { created: '2026-10-10T00:00:00Z', installScripts: false }, now)[0], /3 days ago/);
  assert.match(checkPackage('hooky', { created: '2020-01-01T00:00:00Z', installScripts: true }, now)[0], /runs scripts/);
  assert.deepEqual(checkPackage('fine', { created: '2020-01-01T00:00:00Z', installScripts: false }, now), []);
});

test('package-check --online: 404 means missing; any other failure is unverified, not a crash', async () => {
  const answer = (status: number, body: unknown = {}) => async () => new Response(JSON.stringify(body), { status });
  assert.equal(await fetchInfo('ghost', answer(404)), undefined);
  const meta = { time: { created: '2020-01-01T00:00:00Z' }, 'dist-tags': { latest: '1.0.0' }, versions: { '1.0.0': { scripts: { postinstall: 'x' } } } };
  assert.deepEqual(await fetchInfo('real', answer(200, meta)), { created: '2020-01-01T00:00:00Z', installScripts: true });
  await assert.rejects(fetchInfo('busy', answer(503)), /answered 503/);
  await assert.rejects(fetchInfo('limited', answer(429)), /answered 429/);
  await assert.rejects(fetchInfo('odd', answer(200, { name: 'odd' })), /no creation date/);
  await assert.rejects(fetchInfo('offline', async () => { throw new TypeError('fetch failed'); }), /fetch failed/);
  assert.match(couldNotVerify('busy', 'the registry answered 503'), /^Could not verify busy: .*\nFix: treat it as unapproved/);
});

test('plan-required: small changes pass, large ones need a complete plan', () => {
  const small = [{ path: 'a.ts', added: 10, removed: 2 }];
  assert.deepEqual(checkPlan(small, () => ''), []);
  const large = ['a', 'b', 'c', 'd', 'e'].map((p) => ({ path: `${p}.ts`, added: 5, removed: 0 }));
  assert.match(checkPlan(large, () => '')[0], /no plan file changed/);
  const withPlan = [...large, { path: 'package.json', added: 1, removed: 0 }].map((s) => s);
  assert.equal(checkPlan(withPlan, () => '').length, 1);
});

test('diff-budget ignores the lockfile and names the largest files', () => {
  assert.deepEqual(checkBudget([{ path: 'package-lock.json', added: 5000, removed: 0 }], 400), []);
  const problems = checkBudget([{ path: 'big.ts', added: 450, removed: 0 }, { path: 'small.ts', added: 1, removed: 1 }], 400);
  assert.match(problems[0], /452 changed lines; the budget is 400/);
  assert.match(problems[0], /Largest: big\.ts \(\+450 -0\)/);
});
