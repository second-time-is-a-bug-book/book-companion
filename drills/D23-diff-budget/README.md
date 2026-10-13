# D23 Diff budget

Chapter 10, card P28. Guard: `node guards/diff-budget.ts`.

## The mistake

Asked for one new icon, the agent pastes a 900-line icon set into the front end.

## Run it

    npm run drill D23

The runner copies the repository to a scratch folder, runs `node guards/diff-budget.ts` (it should pass),
applies `drills/D23-diff-budget/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "the budget is 400".

## What you will see

The guard adds up changed lines (ignoring the lockfile), names the largest files and
asks for the change to be split.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/diff-budget.ts`

## Try it with a real agent (optional)

Ask your agent for a broad change ("tidy up the front end") and run the budget before review.
