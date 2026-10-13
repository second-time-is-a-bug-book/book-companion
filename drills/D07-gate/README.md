# D07 Gate

Chapter 5, card P12. Guard: `node guards/gate.ts`.

## The mistake

The agent reads a reminder interval from an environment variable and annotates it as a number; it is a string. Everything else is fine.

## Run it

    npm run drill D07

The runner copies the repository to a scratch folder, runs `node guards/gate.ts` (it should pass),
applies `drills/D07-gate/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "gate: REFUSED, 1 of 14 checks failed: typecheck".

## What you will see

All 14 checks run, fast ones first. Thirteen pass and the type check fails, so the
whole gate refuses and prints the failing check's output with an instruction not to
commit or claim done.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/gate.ts`
- `app/src/main.ts`

## Try it with a real agent (optional)

Install templates/hooks/pre-commit and let your agent commit a change; watch it read the gate's output and fix the failure.
