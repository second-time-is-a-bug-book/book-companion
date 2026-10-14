// experiment/results/reproduce.ts
// Recomputes every number Chapter 12 and Chapter 13 quote from
// the author's 270 runs, from the run records in this folder.
//   node experiment/results/reproduce.ts
// No dependencies. See METHODOLOGY.md for what each field means.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Run {
  run_id: string;
  task: string;
  condition: 'none' | 'rules' | 'gates';
  model: string;
  model_alias: string;
  cost_usd: number;
  wall_seconds: number;
  first_pass: boolean;
  rework: number;
  accepted: boolean;
  defects_at_done?: string[];
  unnecessary_edits: number;
  stop_note_used: boolean;
}

const DIR = fileURLToPath(new URL('.', import.meta.url));
export const BATCHES = {
  batch1: 'batch-1.jsonl',
  batch2: 'batch-2.jsonl',
  haiku: 'batch-2-haiku.jsonl',
};
export const CONDITIONS = ['none', 'rules', 'gates'] as const;
export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

export function load(file: string): Run[] {
  return readFileSync(DIR + file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Run);
}

export interface Count {
  k: number;
  n: number;
}

const count = (runs: Run[], hit: (r: Run) => boolean): Count => ({
  k: runs.filter(hit).length,
  n: runs.length,
});

const has = (r: Run, check: string) =>
  (r.defects_at_done ?? []).includes(check);

const task = (r: Run, id: string) => r.task.startsWith(id);

// Cost per accepted change: every run's cost, failed runs
// included, divided by the runs that were accepted.
export const costPerAccepted = (runs: Run[]) =>
  runs.reduce((sum, r) => sum + r.cost_usd, 0) /
  runs.filter((r) => r.accepted).length;

// Two-sided Fisher's exact test for a 2 x 2 table:
// a of n1 against c of n2. Sums every table with the same
// margins that is no more likely than the one observed.
export function fisher(a: number, n1: number, c: number, n2: number) {
  const logF = [0];
  for (let i = 1; i <= n1 + n2; i++) logF[i] = logF[i - 1] + Math.log(i);
  const k = a + c;
  const n = n1 + n2;
  const p = (x: number) =>
    Math.exp(
      logF[k] + logF[n - k] + logF[n1] + logF[n2] -
        (logF[x] + logF[k - x] + logF[n1 - x] +
          logF[n2 - k + x] + logF[n]),
    );
  const observed = p(a);
  let total = 0;
  const lo = Math.max(0, k - n2);
  const hi = Math.min(k, n1);
  for (let x = lo; x <= hi; x++) {
    const px = p(x);
    if (px <= observed * (1 + 1e-7)) total += px;
  }
  return Math.min(1, total);
}

export function summary() {
  const b1 = load(BATCHES.batch1);
  const b2 = load(BATCHES.batch2);
  const haiku = load(BATCHES.haiku);
  const all = [...b1, ...b2, ...haiku];
  const later = [...b2, ...haiku]; // T4 to T7, all three models
  const by = (runs: Run[], m: string, c: string) =>
    runs.filter((r) => r.model_alias === m && r.condition === c);

  const table = MODELS.map((m) => ({
    model: m,
    cells: CONDITIONS.map((c) => {
      const runs = by(later, m, c);
      return {
        condition: c,
        firstPass: count(runs, (r) => r.first_pass),
        defect: count(runs, (r) => (r.defects_at_done ?? []).length > 0),
        costPerAccepted: costPerAccepted(runs),
        medianMinutes: median(runs.map((r) => r.wall_seconds)) / 60,
      };
    }),
  }));

  const hypotheses = MODELS.map((m) => {
    const g = by(later, m, 'gates');
    const n = by(later, m, 'none');
    const fp = (rs: Run[]) => rs.filter((r) => r.first_pass).length;
    const df = (rs: Run[]) =>
      rs.filter((r) => (r.defects_at_done ?? []).length > 0).length;
    return {
      model: m,
      firstPass: fisher(fp(g), g.length, fp(n), n.length),
      defect: fisher(df(g), g.length, df(n), n.length),
    };
  });

  const t7 = later.filter((r) => task(r, 'T7'));
  const t4 = later.filter((r) => task(r, 'T4'));
  const opus = all.filter((r) => r.model_alias === 'opus');
  const outside = (r: Run) => r.unnecessary_edits > 0;
  const t4Left = t4.filter(
    (r) => r.condition !== 'none' && has(r, 'unit-tests'),
  );

  return {
    runs: all.length,
    accepted: all.filter((r) => r.accepted).length,
    firstPass: all.filter((r) => r.first_pass).length,
    firstPassByCondition: CONDITIONS.map((c) =>
      count(all.filter((r) => r.condition === c), (r) => r.first_pass),
    ),
    firstPassByModel: MODELS.map((m) =>
      count(all.filter((r) => r.model_alias === m), (r) => r.first_pass),
    ),
    totalCost: all.reduce((sum, r) => sum + r.cost_usd, 0),
    table,
    hypotheses,
    t7Coupling: CONDITIONS.map((c) =>
      count(
        t7.filter((r) => r.condition === c),
        (r) => has(r, 'coupling-check'),
      ),
    ),
    t7CouplingNoneByModel: MODELS.map((m) =>
      count(by(t7, m, 'none'), (r) => has(r, 'coupling-check')),
    ),
    outsideByModel: MODELS.map((m) => ({
      model: m,
      cells: CONDITIONS.map((c) =>
        count(by(all, m, c), outside),
      ),
    })),
    opusOutsideHarnessed: count(
      opus.filter((r) => r.condition !== 'none'),
      outside,
    ),
    t4TestLeft: CONDITIONS.map((c) =>
      count(
        t4.filter((r) => r.condition === c),
        (r) => has(r, 'unit-tests'),
      ),
    ),
    t4LeftWithRule: { k: t4Left.length, n: 30 },
    t4LeftByBypass: t4Left.filter((r) => r.stop_note_used).length,
  };
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const kn = ({ k, n }: Count) => `${k} of ${n}`;
const usd = (x: number) => `$${x.toFixed(2)}`;

function print() {
  const s = summary();
  const out: string[] = [];
  const line = (text = '') => out.push(text);
  line('Chapter 12, "What happened when I ran it"');
  line(`  runs ${s.runs}, accepted ${s.accepted}, ` +
    `first pass ${s.firstPass}`);
  line('  first pass by condition (none, rules, gates): ' +
    s.firstPassByCondition.map(kn).join(', '));
  line('  first pass by model (haiku, sonnet, opus): ' +
    s.firstPassByModel.map(kn).join(', '));
  line(`  estimated cost, all runs: ${usd(s.totalCost)}`);
  line();
  line('Table, T4 to T7 (none / rules / gates)');
  for (const row of s.table) {
    const cell = (f: (c: (typeof row.cells)[number]) => string) =>
      row.cells.map(f).join(' / ');
    line(`  ${row.model.padEnd(7)}` +
      ` first pass ${cell((c) => String(c.firstPass.k))};` +
      ` left a defect ${cell((c) => String(c.defect.k))};` +
      ` cost per accepted change ${cell((c) => usd(c.costPerAccepted))};` +
      ` median minutes ${cell((c) => c.medianMinutes.toFixed(1))}`);
  }
  line();
  line('Pre-registered tests, gates against none (Fisher, two-sided)');
  for (const h of s.hypotheses) {
    line(`  ${h.model.padEnd(7)} first pass p = ${h.firstPass.toFixed(4)},` +
      ` left a defect p = ${h.defect.toFixed(4)}`);
  }
  line();
  line('What the runs left behind (figure ch12-what-changed)');
  line('  T7 migration without its test (none, rules, gates): ' +
    s.t7Coupling.map(kn).join(', '));
  line('  T7 without the list, by model (haiku, sonnet, opus): ' +
    s.t7CouplingNoneByModel.map(kn).join(', '));
  for (const row of s.outsideByModel) {
    line(`  files outside the task, ${row.model} (none, rules, gates): ` +
      row.cells.map(kn).join(', '));
  }
  line(`  opus with rules or gates: ${kn(s.opusOutsideHarnessed)}`);
  line('  T4 test left failing (none, rules, gates): ' +
    s.t4TestLeft.map(kn).join(', '));
  line(`  T4 left for a person under the rule: ${kn(s.t4LeftWithRule)},` +
    ` ${s.t4LeftByBypass} through the stop hook's written bypass`);
  console.log(out.join('\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) print();
