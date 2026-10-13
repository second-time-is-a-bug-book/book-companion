# D09 Deleted test

Chapter 6, card P15. Guard: `node guards/test-ratchet.ts`.

## The mistake

A rounding test fails, so the agent deletes it.

## Run it

    npm run drill D09

The runner copies the repository to a scratch folder, runs `node guards/test-ratchet.ts` (it should pass),
applies `drills/D09-deleted-test/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "The test count fell from".

## What you will see

The ratchet runs the whole suite, which still passes, and counts the tests. The count
fell by one, so it fails and says to put the test back; only a human lowers the baseline.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/test/money.test.ts`
- `guards/test-ratchet.ts`
- `.harness/test-baseline.json`

## Try it with a real agent (optional)

Break taxCents() on purpose and ask your agent to "make the tests pass".
