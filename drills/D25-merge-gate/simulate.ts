// drills/D25-merge-gate/simulate.ts
// Two agents work in parallel, one task and one git worktree
// each. Task A renames formatCents() to formatMoney()
// everywhere it is used today. Task B adds a reminder text that
// calls formatCents(). Each branch passes the gate on its own.
// Together they break: B calls a function A removed.
//   node drills/D25-merge-gate/simulate.ts --each
//     gate each branch alone
//   node drills/D25-merge-gate/simulate.ts --merged
//     rebase B onto A, then gate
// Run it inside a git repository with a clean main branch
// (drills/run.ts provides one).
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sh } from '../../guards/lib/shell.ts';
import { wrap } from '../../guards/lib/wrap.ts';

const NAME = 'user.name=agent';
const EMAIL = 'user.email=agent@example.invalid';
const GIT = `git -c ${NAME} -c ${EMAIL}`;
const DIR = 'drills/D25-merge-gate';
const A = 'task-a-rename';
const B = 'task-b-reminder-text';
const root = process.cwd();
const trees = mkdtempSync(join(tmpdir(), 'worktrees-'));

function must(command: string, cwd: string): void {
  const run = sh(command, cwd);
  if (run.code !== 0) {
    throw new Error(`${command} failed:\n${run.output}`);
  }
}

// One task, one worktree: a branch from main in its own folder,
// with the patch committed.
function startTask(name: string, patch: string): string {
  const dir = join(trees, name);
  must(`git worktree add -q -b ${name} "${dir}" main`, root);
  const modules = resolve(root, 'node_modules');
  symlinkSync(modules, join(dir, 'node_modules'), 'junction');
  must(`git apply "${resolve(root, patch)}"`, dir);
  must(`${GIT} commit -q -am "${name}"`, dir);
  return dir;
}

function gate(label: string, dir: string): number {
  const run = sh('node guards/gate.ts', dir);
  console.log(`\n### gate on ${label}`);
  console.log(run.output.trimEnd());
  return run.code;
}

try {
  const a = startTask(A, `${DIR}/branch-a.patch`);
  const b = startTask(B, `${DIR}/branch-b.patch`);
  if (process.argv.includes('--merged')) {
    // No conflicts: the two tasks touch different files.
    must(`${GIT} rebase -q ${A}`, b);
    const rebased = `rebased ${B} onto ${A}`;
    console.log(wrap(`merge gate: ${rebased} (no conflicts)`));
    process.exitCode = gate('task B rebased onto task A', b);
  } else {
    const codeA = gate('task A alone', a);
    const codeB = gate('task B alone', b);
    process.exitCode = codeA === 0 && codeB === 0 ? 0 : 1;
  }
} finally {
  // Leave the repository as we found it: no worktrees, no task
  // branches.
  rmSync(trees, { recursive: true, force: true });
  sh('git worktree prune', root);
  sh(`git branch -D ${A} ${B}`, root);
}
