// A fake model that replays a script of turns from a JSON file,
// so the loop runs the same way every time with no API key. A
// real model would read each observation and decide; this one
// ignores them, which is the point of D01: the loop cannot tell
// the difference.
import { readFileSync } from 'node:fs';

export interface Turn {
  say: string; // what the model tells the user
  tool?: string; // the tool to call; no tool means "I am done"
  input?: Record<string, string>;
  tokens?: number; // simulated cost, for the budgets in D24
}

export interface Model {
  next(lastObservation: string | undefined): Turn | undefined;
}

export function scriptedModel(scriptPath: string): Model {
  const script = JSON.parse(readFileSync(scriptPath, 'utf8'));
  const turns = (script as { turns: Turn[] }).turns;
  let i = 0;
  return { next: () => turns[i++] };
}
