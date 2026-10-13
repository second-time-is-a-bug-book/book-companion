# D11 Hollow assertion

Chapter 6, card P16. Guard: `node guards/mini-mutate.ts app/src/domain/due-dates.ts app/test/due-dates.test.ts`.

## The mistake

The agent "makes the due-date tests less brittle": every assertion now only checks types and shapes.

## Run it

    npm run drill D11

The runner copies the repository to a scratch folder, runs `node guards/mini-mutate.ts app/src/domain/due-dates.ts app/test/due-dates.test.ts` (it should pass),
applies `drills/D11-hollow-assertion/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "did not fail any test".

## What you will see

Before, each of the five mutants (one flipped operator each) makes a test fail. After,
the weakened tests still pass, and they keep passing with every mutant: all five
survive, so the tests check nothing.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/test/due-dates.test.ts`
- `app/src/domain/due-dates.ts`
- `guards/mini-mutate.ts`

## Try it with a real agent (optional)

Ask your agent to "make app/test/due-dates.test.ts less brittle".
