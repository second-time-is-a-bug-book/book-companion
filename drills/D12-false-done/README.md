# D12 False done

Chapter 6, card P17. Guard: `node guards/done-check.ts`.

## The mistake

After the tests last ran, the agent changes the reminder rule and reports done without running them again.

## Run it

    npm run drill D12

The runner copies the repository to a scratch folder, runs `node guards/done-check.ts` (it should pass),
applies `drills/D12-false-done/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Before the first run it records test evidence with `node guards/done-check.ts --record`.

Expected: before exits 0; after exits 1 and prints "The evidence is stale".

## What you will see

The drill first records evidence (`npm run evidence`). Before the change the evidence
matches the code. After it, done-check lists the file that changed since the tests ran
and refuses. With no evidence file at all it fails too, with "No test evidence".

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/domain/reminders.ts`
- `guards/done-check.ts`

## Try it with a real agent (optional)

Ask your agent for a small change and tell it to finish with node guards/done-check.ts.
