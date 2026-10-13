import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { findDestructive } from '../destructive-command.ts';
import { readHookCall } from '../lib/hook-payload.ts';

test('blocks commands that cannot be undone', () => {
  const blocked = {
    'rm -rf build': 'rm -rf',
    'rm -fr /tmp/x': 'rm -rf',
    'rm -r -f build': 'rm -rf',
    'rm --recursive --force build': 'rm -rf',
    'rm --force -R build': 'rm -rf',
    'sqlite3 app.db "DROP TABLE invoices;"': 'DROP TABLE',
    'psql -c "truncate table clients"': 'TRUNCATE',
    'sqlite3 app.db "DELETE FROM invoices;"': 'DELETE without WHERE',
    'git push --force origin main': 'git push --force',
    'git push -f': 'git push --force',
    'git push origin +main': 'git push --force',
    'git commit --no-verify -m "wip"': 'git --no-verify',
    'git commit -n -m "wip"': 'git --no-verify',
    'git push --no-verify origin feature-f': 'git --no-verify',
    'git reset --hard HEAD~3': 'git reset --hard',
    'git clean -fd': 'git clean -f',
  };
  for (const [command, name] of Object.entries(blocked)) {
    assert.equal(findDestructive(command)?.name, name, command);
  }
});

test('allows everyday commands', () => {
  for (const command of [
    'npm test',
    'rm build/old.txt',
    'rm -r build',
    'rm -r build; ls -f',
    'git push -n origin main',
    'git push --force-with-lease --force-if-includes origin my-branch',
    'git push origin feature-f',
    'git push --force-with-lease origin my-branch',
    'git reset --soft HEAD~1',
    'sqlite3 app.db "DELETE FROM invoices WHERE id = 3;"',
  ]) {
    assert.equal(findDestructive(command), undefined, command);
  }
});

test('finds the command in every documented hook payload shape, and fails closed otherwise', () => {
  const shapes = {
    'this repository': { tool: 'bash', input: { command: 'rm -rf build' } },
    'Claude Code, Codex, Cursor preToolUse': { tool_name: 'Bash', tool_input: { command: 'rm -rf build' } },
    'Gemini CLI': { tool_name: 'run_shell_command', tool_input: { command: 'rm -rf build' } },
    'Cursor beforeShellExecution': { command: 'rm -rf build', cwd: '/project' },
    'GitHub Copilot': { toolName: 'bash', toolArgs: JSON.stringify({ command: 'rm -rf build' }) },
  };
  for (const [agent, payload] of Object.entries(shapes)) {
    assert.deepEqual(readHookCall(JSON.stringify(payload)), { kind: 'command', command: 'rm -rf build' }, agent);
  }
  assert.deepEqual(readHookCall(JSON.stringify({ toolName: 'edit', toolArgs: '{"path":"a.ts"}' })), { kind: 'other-tool', tool: 'edit' });
  for (const unknown of ['{"tool_name":"Bash","tool_input":{"cmd":"rm -rf build"}}', '{"args":["rm","-rf"]}', 'not json']) {
    assert.deepEqual(readHookCall(unknown), { kind: 'unknown' }, unknown);
  }
});

test('the hook keeps stdout empty and blocks a payload it cannot read', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'hook-')); // the guard log lands here, not in your repository
  const hook = (payload: string) =>
    spawnSync(process.execPath, [join(import.meta.dirname, '../destructive-command.ts')], { cwd, input: payload, encoding: 'utf8' });
  try {
    const allowed = hook('{"tool_name":"Bash","tool_input":{"command":"npm test"}}');
    assert.equal(allowed.status, 0);
    assert.equal(allowed.stdout, '');
    assert.match(allowed.stderr, /destructive-command: ok/);
    const unknown = hook('{"tool_name":"Bash","tool_input":{"cmd":"rm -rf build"}}');
    assert.equal(unknown.status, 2);
    assert.equal(unknown.stdout, '');
    assert.match(unknown.stderr, /unknown hook payload shape/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('a guard log that cannot be written never changes the verdict', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'hook-'));
  writeFileSync(join(cwd, '.harness'), 'a file where the log folder should be, so the log cannot be written');
  try {
    const run = spawnSync(process.execPath, [join(import.meta.dirname, '../destructive-command.ts')], {
      cwd,
      input: '{"tool_name":"Bash","tool_input":{"command":"rm -rf app"}}',
      encoding: 'utf8',
    });
    assert.equal(run.status, 2); // exit 1 would be a crash, which most agents treat as "allow"
    assert.match(run.stderr, /BLOCKED \(rm -rf\)/);
    assert.match(run.stderr, /could not write\s+\.harness\/guard-log\.jsonl[^]*the verdict stands/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
