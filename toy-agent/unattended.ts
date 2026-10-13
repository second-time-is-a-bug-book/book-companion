// toy-agent/unattended.ts
// An unattended loop needs exits. The same loop as loop.ts,
// plus four ways out: an iteration budget, a cost budget, a
// time budget, and stop-on-red (after any write, and before
// accepting "done", run the tests; if they fail, stop).
//   node toy-agent/unattended.ts <script> [--max-iterations 10]
//     [--max-cost 0.50] [--max-seconds 60]
// Card P30 (Chapter 11), drill D24. Exit 0 only when the run
// finished green.
import { parseArgs } from 'node:util';
import { logFire } from '../guards/lib/log.ts';
import { wrap, wrapLine } from '../guards/lib/wrap.ts';
import { scriptedModel } from './scripted-model.ts';
import { makeTools, makeWorkspace, runTests } from './tools.ts';

// A made-up price, only for the simulation.
const DOLLARS_PER_1K_TOKENS = 0.01;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'max-iterations': { type: 'string', default: '10' },
    'max-cost': { type: 'string', default: '0.50' },
    'max-seconds': { type: 'string', default: '60' },
  },
});
const budget = {
  iterations: Number(values['max-iterations']),
  cost: Number(values['max-cost']),
  seconds: Number(values['max-seconds']),
};
const script =
  positionals[0] ?? 'toy-agent/scripts/goes-red.json';
const workspace = makeWorkspace();
const model = scriptedModel(script);
const tools = makeTools(workspace);
const started = Date.now();
let cost = 0;

const say = (text: string) => console.log(wrap(text));
const dollars = (n: number) => `$${n.toFixed(2)}`;

function stop(reason: string, ok: boolean): never {
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const verdict = ok ? 'FINISHED' : 'STOPPED';
  say(`\nunattended: ${verdict}, ${reason}`);
  say(
    `  spent: ${dollars(cost)} of ${dollars(budget.cost)}, ` +
      `${seconds}s of ${budget.seconds}s`,
  );
  if (!ok) logFire('bounded-loop', reason);
  process.exit(ok ? 0 : 1);
}

say(
  `unattended: budgets ${budget.iterations} iterations, ` +
    `${dollars(budget.cost)}, ${budget.seconds}s; stop on red`,
);
for (let i = 1; ; i++) {
  const ran = `after ${i - 1} iterations`;
  if (i > budget.iterations) {
    stop(
      `iteration budget used up (${budget.iterations}). ` +
        'A human should look at why it never finished.',
      false,
    );
  }
  if (cost >= budget.cost) {
    stop(
      `cost budget spent ${ran}. A human should look ` +
        'before more money goes in.',
      false,
    );
  }
  if (Date.now() - started > budget.seconds * 1000) {
    stop(`time budget used up ${ran}.`, false);
  }

  const turn = model.next(undefined);
  if (!turn) stop('the script ran out of turns.', false);
  cost += ((turn.tokens ?? 0) / 1000) * DOLLARS_PER_1K_TOKENS;
  const tool = turn.tool ? ` [${turn.tool}]` : '';
  const line = `  ${String(i).padStart(2)}. ${turn.say}${tool}`;
  console.log(wrapLine(line, 6).join('\n'));

  if (!turn.tool || turn.tool === 'write_file') {
    if (turn.tool) tools.write_file(turn.input ?? {});
    const tests = runTests(workspace);
    say(`      tests: ${tests.summary.split('\n')[0]}`);
    if (!tests.passed) {
      stop(
        `tests went red after iteration ${i}. Not continuing ` +
          'unattended; the change is left for review in ' +
          `${workspace}.`,
        false,
      );
    }
    if (!turn.tool) {
      const done = `the tests are green after ${i} iterations.`;
      stop(`the model is done and ${done}`, true);
    }
  } else {
    tools[turn.tool]?.(turn.input ?? {});
  }
}
