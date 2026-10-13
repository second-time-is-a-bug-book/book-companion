// guards/guard-audit.ts
// For the quarterly harness review: lists every guard, how
// often and when it last fired (from .harness/guard-log.jsonl),
// and flags retirement candidates: guards that never fired, or
// have been quiet for --quiet-days (default 90).
//   node guards/guard-audit.ts [--log <file>]
//     [--now YYYY-MM-DD] [--quiet-days 90]
// Card P34 (Chapter 13). Exit 1 when there are candidates to
// review.
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { listFiles } from './lib/files.ts';
import { isMain, LOG_FILE } from './lib/log.ts';
import { wrap } from './lib/wrap.ts';

const DAY_MS = 86_400_000;
const RETIRE = '// Retire when:';
const say = (text: string) => console.log(wrap(text));
const daysBetween = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / DAY_MS;

// A guard is any top-level script in guards/ whose header says
// when to retire it.
export function retireWhen(source: string): string | undefined {
  const lines = source.split('\n');
  const start = lines.findIndex((l) => l.startsWith(RETIRE));
  if (start === -1) return undefined;
  const parts = [lines[start].slice(RETIRE.length)];
  for (const line of lines.slice(start + 1)) {
    // The condition ends where the header comment ends.
    if (!line.startsWith('//')) break;
    parts.push(line.slice(2));
  }
  return parts.map((part) => part.trim()).join(' ');
}

interface Entry {
  guard?: string;
  at: string;
}

function readLog(file: string): Entry[] {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').split('\n');
  return lines
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Entry)
    .filter((entry) => entry.guard !== undefined); // skip notes
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      log: { type: 'string', default: LOG_FILE },
      now: { type: 'string' },
      'quiet-days': { type: 'string', default: '90' },
    },
  });
  const today = new Date().toISOString().slice(0, 10);
  const now = values.now ?? today;
  const quietDays = Number(values['quiet-days']);
  const entries = readLog(values.log);
  const guards = listFiles('guards', ['.ts'])
    .filter((file) => file.split('/').length === 2)
    .map((file) => ({
      name: file.slice('guards/'.length, -'.ts'.length),
      retire: retireWhen(readFileSync(file, 'utf8')),
    }))
    .filter((g) => g.retire !== undefined);

  const log = `${entries.length} log entries in ${values.log}`;
  const counts = `${guards.length} guards, ${log}`;
  say(`guard-audit: ${counts}, as of ${now}\n`);
  const head = `${'guard'.padEnd(22)}${'fired'.padStart(5)}`;
  say(`  ${head}  ${'last fired'.padEnd(12)}status`);
  const candidates: [string, string][] = [];
  for (const { name, retire } of guards) {
    const fired = entries
      .filter((e) => e.guard === name)
      .map((e) => e.at.slice(0, 10))
      .sort();
    const last = fired.at(-1);
    const idle = last ? daysBetween(last, now) : Infinity;
    const status = idle > quietDays ? 'RETIRE?' : 'active';
    const count = String(fired.length).padStart(5);
    const when = (last ?? 'never').padEnd(12);
    say(`  ${name.padEnd(22)}${count}  ${when}${status}`);
    if (status !== 'RETIRE?') continue;
    const why = last ? `quiet for ${idle} days` : 'never fired';
    candidates.push([`${name}: ${why}.`, retire ?? '']);
  }
  if (candidates.length === 0) {
    const recent = `in the last ${quietDays} days`;
    say(`\nguard-audit: ok, every guard fired ${recent}`);
  } else {
    const n = candidates.length;
    say(
      `\nguard-audit: ${n} retirement candidates. For each, ` +
        'check its retire condition, then delete it or say ' +
        'why it stays:',
    );
    for (const [what, retire] of candidates) {
      say(`  - ${what}\n    Retire when: ${retire}`);
    }
    process.exitCode = 1;
  }
}
