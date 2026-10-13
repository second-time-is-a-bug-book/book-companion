// guards/seeded-defects.ts
// Tests the sensors. Plants each known defect in its own
// scratch copy, runs every gate check there, and prints which
// checks caught which defect. A defect that no check catches is
// a hole in the harness.
//   node guards/seeded-defects.ts [--defects <file.json>]
// Card P20 (Chapter 7). Placement: build (weekly, and whenever
// a guard changes).
import { parseArgs } from 'node:util';
import { readJson } from './lib/files.ts';
import { isMain, logFire } from './lib/log.ts';
import { applyPatch, makeScratchCopy } from './lib/scratch.ts';
import { removeScratch } from './lib/scratch.ts';
import { shAsync } from './lib/shell.ts';
import { wrap } from './lib/wrap.ts';

interface Defect {
  id: string;
  patch: string; // a unified diff that plants the defect
}

type Result = { name: string; status: string };

const GATE = 'node guards/gate.ts --all --json';
const NONE = 'ESCAPED: no check caught it';
const say = (text: string) => console.log(wrap(text));

async function catchers(defect: Defect): Promise<string[]> {
  const dir = makeScratchCopy(`seeded-${defect.id}`);
  try {
    applyPatch(dir, defect.patch);
    const run = await shAsync(GATE, dir);
    const json = run.output.trim().split('\n').at(-1) ?? '[]';
    const results = JSON.parse(json) as Result[];
    const failed = results.filter((r) => r.status === 'FAILED');
    return failed.map((r) => r.name);
  } finally {
    removeScratch(dir);
  }
}

if (isMain(import.meta.url)) {
  const file = 'guards/seeded-defects.json';
  const { values } = parseArgs({
    options: { defects: { type: 'string', default: file } },
  });
  const defects = readJson<Defect[]>(values.defects);
  const n = defects.length;
  say(
    `seeded-defects: planting ${n} defects from ` +
      `${values.defects}, each in its own scratch copy`,
  );
  // In parallel: each copy is independent.
  const caught = await Promise.all(defects.map(catchers));

  const ids = defects.map((d) => d.id);
  const width = Math.max(...ids.map((id) => id.length)) + 2;
  say(`\n  ${'defect'.padEnd(width)}caught by`);
  ids.forEach((id, i) => {
    const by = caught[i].join(', ') || NONE;
    say(`  ${id.padEnd(width)}${by}`);
  });

  const escaped = ids.filter((_, i) => caught[i].length === 0);
  if (escaped.length === 0) {
    say(
      `\nseeded-defects: ok, every one of ${n} defects was ` +
        'caught by at least one check',
    );
  } else {
    const list = escaped.join(', ');
    say(
      `\nseeded-defects: FAILED, ${escaped.length} of ${n} ` +
        `defects escaped: ${list}\n` +
        '  Fix: add a check to the gate that catches it (or ' +
        'move an existing sensor earlier), then keep the ' +
        'defect in the list so it stays caught.',
    );
    logFire('seeded-defects', `escaped: ${list}`);
    process.exitCode = 1;
  }
}
