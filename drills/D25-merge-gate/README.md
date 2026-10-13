# D25 Merge gate

Chapter 11, card P29.

## The mistake

Two agents in two worktrees: one renames formatCents() to formatMoney(), the other adds a new call to formatCents(). Each branch passes alone.

## Run it

    npm run drill D25

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node drills/D25-merge-gate/simulate.ts --each`
- after: `node drills/D25-merge-gate/simulate.ts --merged`

Expected: before exits 0; after exits 1 and prints "gate: REFUSED, 3 of 14 checks failed: typecheck, unit-tests, test-ratchet".

## What you will see

Before: each task branch, in its own git worktree, passes the full gate. After: task B
is rebased onto task A (no textual conflict) and the gate runs again on the result: the
type check and the unit tests fail, because B calls a function A renamed, and the test
ratchet fails because the broken test files no longer load. Rebase, then gate, before
anything merges.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `drills/D25-merge-gate/simulate.ts`
- `drills/D25-merge-gate/branch-a.patch`
- `drills/D25-merge-gate/branch-b.patch`
- `guards/gate.ts`

## Try it with a real agent (optional)

Run two agents on two tasks in two worktrees, then rebase one onto the other and run npm run gate before merging.
