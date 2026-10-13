// The toy agent's tools. Each takes the model's input and
// returns an observation: plain text the model reads on its
// next turn.
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sh } from '../guards/lib/shell.ts';

export type Tools = Record<
  string,
  (input: Record<string, string>) => string
>;

// A fresh copy of toy-agent/workspace, so runs never change the
// repository.
export function makeWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'toy-agent-'));
  const source = new URL('./workspace/', import.meta.url);
  cpSync(source, dir, { recursive: true });
  return dir;
}

export function runTests(workspace: string) {
  const run = sh('node --test "*.test.ts"', workspace);
  const count = (key: string) => {
    const line = new RegExp(`^# ${key} (\\d+)$`, 'm');
    return Number(line.exec(run.output)?.[1] ?? 0);
  };
  const failures = run.output
    .split('\n')
    .filter((line) => line.startsWith('not ok'));
  const passed = run.code === 0;
  const verdict = passed ? 'PASS' : 'FAIL';
  const pass = `${count('pass')} passed`;
  const head = `${verdict}: ${pass}, ${count('fail')} failed`;
  return { passed, summary: [head, ...failures].join('\n') };
}

export function makeTools(workspace: string): Tools {
  // Keep the model inside its workspace: no "../../" paths.
  const inside = (path: string) => {
    const full = resolve(workspace, path);
    if (!full.startsWith(workspace)) {
      throw new Error(`path outside the workspace: ${path}`);
    }
    return full;
  };
  return {
    read_file: ({ path }) => readFileSync(inside(path), 'utf8'),
    write_file: ({ path, content }) => {
      writeFileSync(inside(path), content);
      const lines = content.split('\n').length;
      return `wrote ${path} (${lines} lines)`;
    },
    run_tests: () => runTests(workspace).summary,
  };
}
