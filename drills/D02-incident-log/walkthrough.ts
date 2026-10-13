// drills/D02-incident-log/walkthrough.ts
// Walks one incident, money stored as a float, through the five
// steps of the incident log (templates/incident-log.md), and
// runs the proof for real.
//   node drills/D02-incident-log/walkthrough.ts --blank
//     prints the empty template
//   node drills/D02-incident-log/walkthrough.ts
//     prints the filled entry, with proof
import { readFileSync } from 'node:fs';
import * as scratch from '../../guards/lib/scratch.ts';
import { sh } from '../../guards/lib/shell.ts';

const TEMPLATE = 'templates/incident-log.md';
const PATCH = 'drills/D06-float-money/mistake.patch';
// The guard's output is indented 4 below, so it wraps at 60.
const GUARD = 'WRAP_WIDTH=60 node guards/no-float-money.ts';
const indent = (text: string) =>
  text.trimEnd().replace(/^/gm, '    ');

if (process.argv.includes('--blank')) {
  console.log(readFileSync(TEMPLATE, 'utf8').trimEnd());
  process.exit(0);
}

console.log(`## 2026-10-13: unit price 1.005 invoiced as 1.00

**1. Symptom.** After an agent change, the invoice form accepted
a unit price of 1.005 and stored it as 100 cents instead of
rejecting it. Found in review of a test invoice. The change in
app/src/http/invoice-routes.ts parsed the price with
parseFloat() and rounded (1.005 * 100 is 100.49999... in
floating point).

**2. Root cause.** Nothing told the agent that money is integer
cents. One unit test did fail (it expects a 400 for 12.345), but
the agent read it as an outdated test and changed it, because
nothing said why such prices are refused. Harness gap: no guide
in AGENTS.md, and the only sensor did not explain itself.

**3. Control.** Both kinds. Guide: a rule in AGENTS.md, "Money
is integer cents, never floats". Sensor (computational):
guards/no-float-money.ts, which flags parseFloat, toFixed,
decimal literals in money lines and REAL columns, and tells the
agent to use parseCents/formatCents/taxCents instead.

**4. Placement.** Edit and commit: it runs in about 0.1s, so it
runs in the pre-commit gate (guards/gate.ts) and can run after
every agent edit.

**5. Proof.** Seed the defect in a scratch copy and run the
guard:
`);

const dir = scratch.makeScratchCopy('incident-proof');
try {
  const clean = sh(GUARD, dir);
  console.log(`  without the defect: exit ${clean.code}`);
  console.log(indent(clean.output));
  scratch.applyPatch(dir, PATCH);
  const seeded = sh(GUARD, dir);
  const exit = `exit ${seeded.code}`;
  console.log(`  with the defect (${PATCH}): ${exit}`);
  console.log(indent(seeded.output));
  console.log(`
**Retire when.** Amounts are a branded Cents type that the
compiler enforces, and the guard has not fired for 90 days
(guards/guard-audit.ts).

**Card.** P02, "Incident to guard in five steps". The guard
itself is drill D06.`);
  // The proof must hold: clean passes, seeded fails.
  const proven = clean.code === 0 && seeded.code === 1;
  process.exitCode = proven ? 0 : 1;
} finally {
  scratch.removeScratch(dir);
}
