# D24 Bounded loop

Chapter 11, card P30.

## The mistake

Running unattended, the scripted agent "simplifies" the late fee and turns the tests red, then keeps going.

## Run it

    npm run drill D24

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node toy-agent/unattended.ts toy-agent/scripts/honest.json`
- after: `node toy-agent/unattended.ts toy-agent/scripts/goes-red.json`

Expected: before exits 0; after exits 1 and prints "STOPPED, tests went red after iteration 2".

## What you will see

The unattended loop has four exits: iterations, cost, time, and red tests. Before, the
honest run finishes green within budget. After, the loop stops at the first red test
run instead of carrying on. Run it with `toy-agent/scripts/runaway.json` to see the
cost budget stop a model that never finishes.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `toy-agent/unattended.ts`
- `toy-agent/scripts/goes-red.json`
- `toy-agent/scripts/runaway.json`

## Try it with a real agent (optional)

Before you leave any agent running unattended, write down its iteration, cost and time budgets and what it does on red.
