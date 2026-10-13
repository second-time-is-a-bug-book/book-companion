# D04 Instructions lint

Chapter 3, card P03. Guard: `node guards/instructions-lint.ts`.

## The mistake

The agent appends a "Lessons learned" section to AGENTS.md: past the line budget, pointing to a file that does not exist, and adding a rule with no check.

## Run it

    npm run drill D04

The runner copies the repository to a scratch folder, runs `node guards/instructions-lint.ts` (it should pass),
applies `drills/D04-instructions-lint/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "the budget is 100".

## What you will see

Three problems: the file is over its 100-line budget, it points to
`app/src/pricing/rates.ts` (which does not exist), and a new rule names no command
that checks it.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `AGENTS.md`
- `guards/instructions-lint.ts`

## Try it with a real agent (optional)

Ask your agent to "add what you learned this session to AGENTS.md" a few times, then run the lint.
