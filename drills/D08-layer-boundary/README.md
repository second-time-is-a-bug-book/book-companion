# D08 Layer boundary

Chapter 5, card P13. Guard: `node guards/layer-boundary.ts`.

## The mistake

The agent adds a dashboard to the ui layer that reads invoices straight from the database module.

## Run it

    npm run drill D08

The runner copies the repository to a scratch folder, runs `node guards/layer-boundary.ts` (it should pass),
applies `drills/D08-layer-boundary/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "the ui layer may not import db".

## What you will see

Two problems, one per forbidden import, each with the line number and advice on
where the data should come from instead.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/ui/pages.ts`
- `app/src/db/invoices.ts`
- `guards/layer-boundary.ts`

## Try it with a real agent (optional)

Ask your agent: "Show the number of unpaid invoices on a dashboard page."
