# D05 Plan required

Chapter 4, card P07. Guard: `node guards/plan-required.ts`.

## The mistake

The agent adds invoice discounts across six files in one go, with no plan file.

## Run it

    npm run drill D05

The runner copies the repository to a scratch folder, runs `node guards/plan-required.ts` (it should pass),
applies `drills/D05-plan-required/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "but no plan file changed".

## What you will see

The guard counts the files and lines in the change. Over 4 files or 150 lines with no
`plans/*.md` in the diff, it asks for a plan with Goal, Steps and Done when.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/plan-required.ts`
- `templates/plan.md`
- `plans/README.md`

## Try it with a real agent (optional)

Ask your agent for a feature that touches several layers ("add discounts to invoices") and see whether it writes a plan first.
