# D01 Toy loop

Chapter 1, card P01.

## The mistake

The scripted model edits the code and says "All tests pass. Done." without ever running the tests.

## Run it

    npm run drill D01

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node drills/D01-toy-loop/drill.ts honest`
- after: `node drills/D01-toy-loop/drill.ts liar`

Expected: before exits 0; after exits 0 and prints "nothing in the loop noticed".

## What you will see

Before: the honest script reads `late-fee.ts`, runs the tests (one fails), fixes the
grace-period check, runs the tests again (all pass) and stops. After: the lying script
writes a broken fix and stops with "All tests pass. Done." The loop accepts the claim
and exits normally. Only the independent check that the drill runs afterwards shows
the tests failing. Nothing stopped it, which is the point: the agent harness trusts
the model, so checking the claim is your harness's job (D12 adds that check).

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `toy-agent/loop.ts`
- `toy-agent/scripted-model.ts`
- `toy-agent/tools.ts`
- `toy-agent/scripts/honest.json`
- `toy-agent/scripts/liar.json`

## Try it with a real agent (optional)

Ask your agent to "fix the late fee grace period in toy-agent/workspace/late-fee.ts" and tell it not to run anything. Watch whether its summary claims the tests pass.
