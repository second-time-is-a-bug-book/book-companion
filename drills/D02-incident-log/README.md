# D02 Incident log

Chapter 2, card P02.

## The mistake

Money stored as a float: an agent parsed prices with parseFloat() (the incident walked through the log).

## Run it

    npm run drill D02

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node drills/D02-incident-log/walkthrough.ts --blank`
- after: `node drills/D02-incident-log/walkthrough.ts`

Expected: before exits 0; after exits 0 and prints "with the defect (drills/D06-float-money/mistake.patch): exit 1".

## What you will see

Before: the empty incident-log template. After: the same template filled in for one
incident (a unit price of 1.005 stored as 100 cents), step by step: symptom, root
cause, control, placement, proof, retire condition. The proof step is real: the
script plants the D06 defect in a scratch copy and shows `guards/no-float-money.ts`
passing without it and failing with it.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `templates/incident-log.md`
- `drills/D02-incident-log/walkthrough.ts`
- `guards/no-float-money.ts`

## Try it with a real agent (optional)

After your next real agent mistake, copy templates/incident-log.md into your repository and fill in one entry before you write any guard.
