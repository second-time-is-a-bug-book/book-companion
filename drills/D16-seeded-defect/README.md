# D16 Seeded defects

Chapter 7, card P20.

## The mistake

A defect class no gate check covers: the hidden button from D13, which only a browser test sees.

## Run it

    npm run drill D16

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node guards/seeded-defects.ts`
- after: `node guards/seeded-defects.ts --defects drills/D16-seeded-defect/with-hidden-button.json`

Expected: before exits 0; after exits 1 and prints "1 of 9 defects escaped: hidden-button".

## What you will see

Each defect is planted in its own scratch copy and every gate check runs against it.
The table shows which checks caught which defect. Before: all eight known defects are
caught. After: the hidden-button defect escapes every check in the gate, because the
gate has no browser test; that is the gap to close.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/seeded-defects.ts`
- `guards/seeded-defects.json`
- `drills/D16-seeded-defect/with-hidden-button.json`
- `guards/gate.ts`

## Try it with a real agent (optional)

Write a ninth defect patch of your own (a mistake your agent made last week) and add it to guards/seeded-defects.json.
