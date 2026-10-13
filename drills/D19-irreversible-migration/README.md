# D19 Irreversible migration

Chapter 8, card P23. Guard: `node guards/migration-guard.ts`.

## The mistake

The agent adds a migration that drops the clients.notes column, with no down step and no backup.

## Run it

    npm run drill D19

The runner copies the repository to a scratch folder, runs `node guards/migration-guard.ts` (it should pass),
applies `drills/D19-irreversible-migration/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "has no down step".

## What you will see

Two problems: there is no down step, and the up step destroys data without naming a
backup. Each says what to add.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/db/migrations/`
- `guards/migration-guard.ts`

## Try it with a real agent (optional)

Ask your agent: "We no longer use client notes. Remove them."
