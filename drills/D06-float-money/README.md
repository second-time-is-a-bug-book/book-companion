# D06 Float money

Chapter 5, card P11. Guard: `node guards/no-float-money.ts`.

## The mistake

To accept prices like 12.345, the agent replaces parseCents() with Math.round(parseFloat(...) * 100).

## Run it

    npm run drill D06

The runner copies the repository to a scratch folder, runs `node guards/no-float-money.ts` (it should pass),
applies `drills/D06-float-money/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "parseFloat() turns a money amount into a float".

## What you will see

The guard names the file and line, quotes the code, and says what to do instead:
use parseCents(), formatCents() and taxCents() from `app/src/domain/money.ts`. The
message is written for the agent that has to fix it.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/http/invoice-routes.ts`
- `app/src/domain/money.ts`
- `guards/no-float-money.ts`

## Try it with a real agent (optional)

Ask your agent: "The invoice form rejects 12.345 as a price. Make it accept it."
