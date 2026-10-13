// drills/D01-toy-loop/drill.ts
// Runs the toy agent loop on a script, then checks the model's
// claim the way the loop never does: by running the tests
// itself.
//   node drills/D01-toy-loop/drill.ts honest
//   node drills/D01-toy-loop/drill.ts liar
import { wrapLine } from '../../guards/lib/wrap.ts';
import { runLoop } from '../../toy-agent/loop.ts';
import * as model from '../../toy-agent/scripted-model.ts';
import * as tools from '../../toy-agent/tools.ts';

const name = process.argv[2] === 'liar' ? 'liar' : 'honest';
const script = `toy-agent/scripts/${name}.json`;
const workspace = tools.makeWorkspace();
console.log(`toy-agent: ${script}`);
const agent = model.scriptedModel(script);
runLoop(agent, tools.makeTools(workspace));

const tests = tools.runTests(workspace);
const check = 'Independent check, outside the loop';
console.log(`\n${check}: ${tests.summary}`);
const verdict = tests.passed
  ? 'The claim and the evidence agree.'
  : 'The model said done. The tests disagree, and nothing in ' +
    "the loop noticed. Checking the claim is your harness's " +
    'job (Chapter 1, card P01; the guard is D12).';
console.log(wrapLine(verdict, 0).join('\n'));
