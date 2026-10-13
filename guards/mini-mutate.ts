// guards/mini-mutate.ts
// A tiny mutation tester. It makes one small change at a time
// to a source file (flips an operator), runs the tests, and
// puts the file back. A change that no test notices is a
// "surviving mutant": proof the tests do not check that line.
//   node guards/mini-mutate.ts <source file> <test file>
// Card P16 (Chapter 6). Placement: build (nightly, or on files
// an agent touched). Kind: sensor, computational.
// Retire when: you run a full mutation testing tool on the
// same files.
import { readFileSync, writeFileSync } from 'node:fs';
import { isMain, report } from './lib/log.ts';
import { sh } from './lib/shell.ts';
import { wrap } from './lib/wrap.ts';

// Each operator and what it becomes. The spaces matter: they
// keep "=>" and generics like Map<string, number> from being
// treated as comparisons.
const FLIPS: [string, string][] = [
  [' === ', ' !== '],
  [' !== ', ' === '],
  [' < ', ' <= '],
  [' <= ', ' < '],
  [' > ', ' >= '],
  [' >= ', ' > '],
  [' && ', ' || '],
  [' || ', ' && '],
  [' + ', ' - '],
  [' - ', ' + '],
];

// Comments and imports are not behaviour.
const SKIP = /^\s*(\/\/|\*|\/\*|import )/;

export interface Mutant {
  line: number;
  from: string;
  to: string;
  source: string;
}

export function mutants(source: string): Mutant[] {
  const lines = source.split('\n');
  const result: Mutant[] = [];
  lines.forEach((text, i) => {
    if (SKIP.test(text)) return;
    for (const [from, to] of FLIPS) {
      const flip = { from: from.trim(), to: to.trim() };
      let at = text.indexOf(from);
      for (; at !== -1; at = text.indexOf(from, at + 1)) {
        const mutated =
          text.slice(0, at) + to + text.slice(at + from.length);
        const source = lines.with(i, mutated).join('\n');
        result.push({ line: i + 1, ...flip, source });
      }
    }
  });
  return result;
}

if (isMain(import.meta.url)) {
  const [target, testFile] = process.argv.slice(2);
  if (!target || !testFile) {
    const args = '<source file> <test file>';
    console.error(`usage: node guards/mini-mutate.ts ${args}`);
    process.exit(1);
  }
  const original = readFileSync(target, 'utf8');
  const survivors: string[] = [];
  const all = mutants(original);
  const node = 'node --disable-warning=ExperimentalWarning';
  const title = `${all.length} mutants of ${target}, judged by`;
  console.log(wrap(`mini-mutate: ${title} ${testFile}`));
  try {
    for (const { line, from, to, source } of all) {
      writeFileSync(target, source);
      const killed =
        sh(`${node} --test "${testFile}"`).code !== 0;
      const verdict = killed ? 'killed  ' : 'SURVIVED';
      const flip = `${from} -> ${to}`;
      console.log(`  ${verdict}  line ${line}: ${flip}`);
      if (!killed) {
        survivors.push(
          `${target}:${line}: changing "${from}" to "${to}" ` +
            'did not fail any test.\n' +
            'Fix: add or strengthen an assertion in ' +
            `${testFile} that this change would break.\n` +
            'Never loosen an assertion to make a test pass.',
        );
      }
    }
  } finally {
    // Always restore, even if a test run crashes.
    writeFileSync(target, original);
  }
  const ok = `${all.length} of ${all.length} mutants killed`;
  report('mini-mutate', survivors, ok);
}
