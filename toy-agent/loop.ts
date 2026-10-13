// toy-agent/loop.ts
// The agent harness in miniature. Ask the model for its next
// turn, run the tool it asks for, hand back the observation,
// and stop when the model says it is done.
//   node toy-agent/loop.ts toy-agent/scripts/honest.json
// Chapter 1, card P01. Note what is missing: nothing checks the
// model's "done" (drill D01).
import { wrapLine } from '../guards/lib/wrap.ts';
import { scriptedModel, type Model } from './scripted-model.ts';
import { makeTools, makeWorkspace } from './tools.ts';
import type { Tools } from './tools.ts';

const MAX_STEPS = 10;

export function runLoop(
  model: Model,
  tools: Tools,
  print = console.log,
): void {
  const show = (label: string, text: string) =>
    print(labelled(label, text));
  let observation: string | undefined;
  for (let step = 1; step <= MAX_STEPS; step++) {
    const turn = model.next(observation);
    if (!turn) return print('\nstop: the script has ended');
    print(`\nstep ${step}`);
    show('model', turn.say);
    if (!turn.tool) {
      return show('stop', 'the model says it is done');
    }
    show('tool call', `${turn.tool} ${describe(turn.input)}`);
    const tool = tools[turn.tool];
    observation = tool
      ? tool(turn.input ?? {})
      : `error: there is no tool called ${turn.tool}`;
    show('observation', preview(observation));
  }
  print(`\nstop: reached the limit of ${MAX_STEPS} steps`);
}

// "  label:      text": every line of the text, and every part
// of a long line, starts in the same column.
const COLUMN = 15;
function labelled(label: string, text: string): string {
  const first = `  ${label}:`.padEnd(COLUMN);
  const rest = ' '.repeat(COLUMN);
  return text
    .split('\n')
    .map((line, i) => (i === 0 ? first : rest) + line)
    .flatMap((line) => wrapLine(line, COLUMN))
    .join('\n');
}

// Long file contents make the trace unreadable; show the start
// and a count.
function preview(text: string): string {
  const lines = text.trimEnd().split('\n');
  const shown = lines.slice(0, 4).join('\n');
  const more = lines.length - 4;
  if (more <= 0) return shown;
  return `${shown}\n... (${more} more lines)`;
}

// The tool's input as key=value pairs, long text as a count.
function describe(input: Record<string, string> = {}): string {
  return Object.entries(input)
    .map(([key, value]) => {
      const lines = value.split('\n').length;
      return `${key}=${lines > 1 ? `<${lines} lines>` : value}`;
    })
    .join(' ');
}

if (process.argv[1] === import.meta.filename) {
  const script =
    process.argv[2] ?? 'toy-agent/scripts/honest.json';
  const workspace = makeWorkspace();
  console.log(`toy-agent: script ${script}`);
  console.log(`  workspace ${workspace}`);
  runLoop(scriptedModel(script), makeTools(workspace));
}
