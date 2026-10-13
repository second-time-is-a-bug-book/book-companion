# D17 Destructive command

Chapter 8, card P21.

## The mistake

The agent proposes rm -rf app/src/db to "start the schema from scratch".

## Run it

    npm run drill D17

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node guards/destructive-command.ts < drills/D17-destructive-command/calls/safe.json`
- after: `node guards/destructive-command.ts < drills/D17-destructive-command/calls/rm-rf.json`

Expected: before exits 0; after exits 2 and prints "BLOCKED (rm -rf)".

## What you will see

The hook reads the proposed tool call as JSON on stdin. `npm test` is allowed (exit 0).
`rm -rf app/src/db` is blocked with exit 2 and a reason and a safer alternative on
stderr, which is what agent hooks show to the model. Try the other calls in
`calls/`: DROP TABLE, git push --force, git reset --hard.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/destructive-command.ts`
- `drills/D17-destructive-command/calls/`
- `templates/hooks/`

## Try it with a real agent (optional)

Wire templates/hooks/agent-pre-action.example.json into your agent and ask it to "clean out the build folder".
