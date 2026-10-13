# D20 Phantom package

Chapter 9, card P24. Guard: `node guards/package-check.ts`.

## The mistake

The agent adds two dependencies: one that does not exist, and one first published two days ago that runs an install script.

## Run it

    npm run drill D20

The runner copies the repository to a scratch folder, runs `node guards/package-check.ts` (it should pass),
applies `drills/D20-phantom-package/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "does not exist on the registry".

## What you will see

Offline, the check uses the registry snapshot in `guards/fixtures/`, with ages measured
from the snapshot date, so the result never changes. Three problems: one package does
not exist, the other is too new and runs scripts on install. Add `--online` to ask
registry.npmjs.org instead (the only drill step that can use the network).

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `package.json`
- `guards/package-check.ts`
- `guards/fixtures/registry-snapshot.json`

## Try it with a real agent (optional)

Ask your agent to "add PDF export for invoices using a library" and check every package it names before installing.
