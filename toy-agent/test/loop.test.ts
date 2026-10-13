import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runLoop } from '../loop.ts';
import { scriptedModel } from '../scripted-model.ts';
import { makeTools, makeWorkspace, runTests } from '../tools.ts';

function run(script: string) {
  const workspace = makeWorkspace();
  const lines: string[] = [];
  runLoop(scriptedModel(`toy-agent/scripts/${script}.json`), makeTools(workspace), (line) => lines.push(line));
  return { trace: lines.join('\n'), tests: runTests(workspace) };
}

test('the honest script fixes the bug and the tests pass', () => {
  const { trace, tests } = run('honest');
  assert.match(trace, /stop: {8}the model says it is done/);
  assert.equal(tests.passed, true);
});

test('the lying script stops with a claim of success while the tests fail', () => {
  const { trace, tests } = run('liar');
  assert.match(trace, /All tests pass\. Done\./);
  assert.doesNotMatch(trace, /run_tests/);
  assert.equal(tests.passed, false);
});

test('tools refuse paths outside the workspace', () => {
  const tools = makeTools(makeWorkspace());
  assert.throws(() => tools.read_file({ path: '../../etc/passwd' }), /outside the workspace/);
});
