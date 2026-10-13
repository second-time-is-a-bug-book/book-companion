// drills/run.ts
// Runs the drills. Each drill copies this repository to a
// scratch folder, runs a guard (it should pass), makes one
// agent mistake (applies mistake.patch, or runs a script), runs
// the guard again (it should catch the mistake), shows both
// outputs and deletes the scratch copy. Your working tree is
// never touched.
//   npm run drill D06   one drill, full output
//   npm run drills      all drills, then a summary table (exit 0
//                       only if all behave)
import {
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import * as scratch from '../guards/lib/scratch.ts';
import { sh } from '../guards/lib/shell.ts';
import { wrap } from '../guards/lib/wrap.ts';

interface Expectation {
  exit: number;
  // Text the output must contain. Line breaks and indentation
  // do not count, so a guard may wrap its message anywhere.
  output: string;
}

export interface Drill {
  id: string;
  title: string;
  chapter: number;
  card: string;
  mistake: string; // one line: what the agent did wrong
  files: string[];
  patch: string | null; // in the drill folder; null for scripts
  guard: string | null; // command run before and after the patch
  before?: string; // script drills: a command for each phase
  after?: string;
  setup?: string; // run once in the scratch copy, first
  highlight?: string[]; // DRILLS.md shows patch lines with these
  expect: { before: Expectation; after: Expectation };
}

export interface PhaseResult {
  command: string;
  exit: number;
  output: string;
  ok: boolean;
}

export function loadDrills(): {
  folder: string;
  drill: Drill;
}[] {
  const read = (folder: string) =>
    JSON.parse(
      readFileSync(`drills/${folder}/drill.json`, 'utf8'),
    );
  return readdirSync('drills')
    .filter((name) => /^D\d\d-/.test(name))
    .sort()
    .map((folder) => ({
      folder,
      drill: read(folder) as Drill,
    }));
}

const flat = (text: string) => text.replace(/\s+/g, ' ');

function phase(
  dir: string,
  command: string,
  expected: Expectation,
): PhaseResult {
  const { code, output } = sh(command, dir);
  const found = flat(output).includes(flat(expected.output));
  const ok = code === expected.exit && found;
  return { command, exit: code, output, ok };
}

function show(
  title: string,
  run: PhaseResult,
  expected: Expectation,
) {
  console.log(`\n== ${title} ==\n$ ${run.command}`);
  console.log(run.output.trimEnd());
  const verdict = run.ok ? 'as expected' : 'NOT AS EXPECTED';
  const want = `expected exit ${expected.exit} and output containing`;
  console.log(
    wrap(
      `[exit ${run.exit}; ${want} "${expected.output}": ${verdict}]`,
    ),
  );
}

export function runDrill(
  folder: string,
  drill: Drill,
  verbose: boolean,
) {
  const dir = scratch.makeScratchCopy(`drill-${drill.id}`);
  const patch =
    drill.patch && `drills/${folder}/${drill.patch}`;
  try {
    if (drill.setup) sh(drill.setup, dir);
    const { before: want, after: then } = drill.expect;
    const before = phase(
      dir,
      drill.before ?? drill.guard!,
      want,
    );
    const stat = patch ? scratch.applyPatch(dir, patch) : '';
    const after = phase(dir, drill.after ?? drill.guard!, then);
    if (verbose || !before.ok || !after.ok) {
      const where = `Chapter ${drill.chapter}, card ${drill.card}`;
      console.log(`\n${drill.id} ${drill.title} (${where})`);
      console.log(wrap(`The mistake: ${drill.mistake}`));
      show('before the mistake', before, want);
      if (patch) {
        console.log(
          `\n== the mistake: ${patch} ==\n${stat.trimEnd()}`,
        );
      }
      show('after the mistake', after, then);
    }
    return { before, after, stat, ok: before.ok && after.ok };
  } finally {
    scratch.removeScratch(dir);
  }
}

if (process.argv[1] === import.meta.filename) {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const wanted = args
    .find((arg) => !arg.startsWith('--'))
    ?.toLowerCase();
  const drills = loadDrills().filter(
    ({ folder }) =>
      all ||
      (wanted && folder.toLowerCase().startsWith(wanted)),
  );
  if (drills.length === 0) {
    console.error(
      'usage: npm run drill D06   (or npm run drills)',
    );
    process.exit(1);
  }
  const rows: string[] = [];
  const record: Record<string, unknown> = {};
  let failures = 0;
  for (const { folder, drill } of drills) {
    if (all)
      process.stdout.write(
        `running ${drill.id} ${drill.title} ... `,
      );
    const result = runDrill(folder, drill, !all);
    const verdict = result.ok ? 'ok' : 'NOT AS EXPECTED';
    if (all) console.log(verdict);
    if (!result.ok) failures += 1;
    record[drill.id] = result;
    const { id, title, chapter, card } = drill;
    const exits = `exit ${result.before.exit}  exit ${result.after.exit}`;
    const ch = String(chapter).padStart(3);
    rows.push(
      `${id}  ${title.padEnd(26)}${ch}  ${card}   ${exits}  ${verdict}`,
    );
  }
  const head = `ID   ${'Title'.padEnd(26)} Ch  Card  Before  After   Result`;
  console.log(`\n${head}\n${rows.join('\n')}`);
  const good = drills.length - failures;
  console.log(
    `\n${good} of ${drills.length} drills behaved as expected.`,
  );
  const flag = args.find((arg) => arg.startsWith('--record='));
  if (flag)
    writeFileSync(
      flag.slice('--record='.length),
      JSON.stringify(record, null, 2),
    );
  process.exitCode = failures === 0 ? 0 : 1;
}
