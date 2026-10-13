// Runs a shell command and captures its combined output, for
// guards that run other tools (the gate, the test ratchet, the
// mutation tester, the drills).
import { exec, spawnSync } from 'node:child_process';

export interface RunResult {
  code: number;
  output: string; // stdout and stderr, interleaved
  seconds: number;
}

// node:test marks its child processes with NODE_TEST_CONTEXT. A
// test run we start from inside a test must not inherit it, or
// it reports to the wrong place.
const { NODE_TEST_CONTEXT, ...env } = process.env;
const maxBuffer = 32 * 1024 * 1024;

export function sh(
  command: string,
  cwd = process.cwd(),
): RunResult {
  const started = performance.now();
  const result = spawnSync(`${command} 2>&1`, {
    cwd,
    env,
    shell: true,
    encoding: 'utf8',
    maxBuffer,
  });
  return {
    code: result.status ?? 1,
    output: result.stdout ?? '',
    seconds: (performance.now() - started) / 1000,
  };
}

// The same, without blocking, so several scratch copies can run
// at once.
export function shAsync(
  command: string,
  cwd = process.cwd(),
): Promise<RunResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    exec(
      `${command} 2>&1`,
      { cwd, env, maxBuffer },
      (error, stdout) => {
        const status = error?.code;
        const failed = typeof status === 'number' ? status : 1;
        const code = error ? failed : 0;
        const seconds = (performance.now() - started) / 1000;
        resolve({ code, output: stdout, seconds });
      },
    );
  });
}
