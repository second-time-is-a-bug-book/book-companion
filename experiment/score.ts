// experiment/score.ts
// Reads run logs (JSON Lines, one run per line; see PROTOCOL.md) and prints,
// per condition and model: first-pass rate, rework, acceptance, tokens, cost,
// time, and the number that matters most: cost per accepted change.
//   node experiment/score.ts runs.jsonl [more.jsonl ...]
// Chapter 12, cards P32 and P33.
import { readFileSync } from 'node:fs';

export interface Run {
  run_id: string;
  task: string;
  condition: string; // none | rules | gates
  model: string;
  tokens: number;
  cost_usd: number;
  wall_seconds: number;
  first_pass: boolean; // hidden acceptance tests passed at the agent's first "done"
  rework: number; // times the change was sent back before it was accepted or abandoned
  accepted: boolean; // the final change passed the hidden acceptance tests
}

export interface Row {
  condition: string;
  model: string;
  runs: number;
  firstPassRate: number;
  meanRework: number;
  accepted: number;
  meanTokens: number;
  totalCost: number;
  costPerAccepted: number | undefined; // undefined when nothing was accepted
  meanWallSeconds: number;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function score(runs: Run[]): Row[] {
  const groups = Map.groupBy(runs, (run) => `${run.condition}\t${run.model}`);
  return [...groups.values()].map((group) => {
    const accepted = group.filter((r) => r.accepted).length;
    const totalCost = group.reduce((sum, r) => sum + r.cost_usd, 0);
    return {
      condition: group[0].condition,
      model: group[0].model,
      runs: group.length,
      firstPassRate: group.filter((r) => r.first_pass).length / group.length,
      meanRework: mean(group.map((r) => r.rework)),
      accepted,
      meanTokens: mean(group.map((r) => r.tokens)),
      totalCost,
      // Failed runs still cost money, so they count in the numerator.
      costPerAccepted: accepted > 0 ? totalCost / accepted : undefined,
      meanWallSeconds: mean(group.map((r) => r.wall_seconds)),
    };
  });
}

export function parseLog(text: string): { runs: Run[]; notes: string[] } {
  const records = text.split('\n').filter((line) => line.trim() !== '').map((line) => JSON.parse(line));
  return { runs: records.filter((r) => !('_note' in r)), notes: records.filter((r) => '_note' in r).map((r) => r._note) };
}

if (process.argv[1] === import.meta.filename) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: node experiment/score.ts <runs.jsonl> [more.jsonl ...]');
    process.exit(1);
  }
  const logs = files.map((file) => parseLog(readFileSync(file, 'utf8')));
  for (const note of logs.flatMap((log) => log.notes)) console.log(`NOTE: ${note}\n`);
  const runs = logs.flatMap((log) => log.runs);
  console.log(`score: ${runs.length} runs from ${files.join(', ')}\n`);
  const header = ['condition', 'model', 'runs', 'first-pass', 'rework', 'accepted', 'tokens/run', 'cost', '$/accepted', 'time/run'];
  const rows = score(runs).map((r) => [
    r.condition,
    r.model,
    String(r.runs),
    `${Math.round(r.firstPassRate * 100)}%`,
    r.meanRework.toFixed(1),
    `${r.accepted}/${r.runs}`,
    String(Math.round(r.meanTokens)),
    `$${r.totalCost.toFixed(2)}`,
    r.costPerAccepted === undefined ? 'n/a' : `$${r.costPerAccepted.toFixed(2)}`,
    `${Math.round(r.meanWallSeconds)}s`,
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  for (const row of [header, ...rows]) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join('  ').trimEnd());
}
