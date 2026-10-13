import assert from 'node:assert/strict';
import { test } from 'node:test';
import { wrap, wrapLine } from '../lib/wrap.ts';

test('wrap keeps lines within 64 columns, with a hanging indent', () => {
  const fix = `    Fix: ${'word '.repeat(30).trim()}`;
  const lines = wrap(`  - short\n${fix}`).split('\n');
  assert.equal(lines[0], '  - short');
  assert.ok(lines.every((line) => line.length <= 64));
  assert.ok(lines.slice(2).every((line) => line.startsWith('      w')));
  assert.deepEqual(wrapLine('  model:  a b', 11, 12), ['  model:  a', '           b']);
  assert.deepEqual(wrapLine('x'.repeat(70)).map((l) => l.length), [64, 8]);
});
