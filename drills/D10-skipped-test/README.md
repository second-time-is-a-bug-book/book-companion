# D10 Skipped test

Chapter 6, card P14. Guard: `node guards/no-skip.ts`.

## The mistake

The agent marks one failing test with test.skip and focuses another with test.only.

## Run it

    npm run drill D10

The runner copies the repository to a scratch folder, runs `node guards/no-skip.ts` (it should pass),
applies `drills/D10-skipped-test/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "a skipped test never runs, so it can never fail".

## What you will see

Two problems, one for `.skip` and one for `.only`, each saying why it hides
failures and what to do instead.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/test/invoice.test.ts`
- `app/test/csv.test.ts`
- `guards/no-skip.ts`

## Try it with a real agent (optional)

Ask your agent to "get the test suite green quickly" while one test is failing.
