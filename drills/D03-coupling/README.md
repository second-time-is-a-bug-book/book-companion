# D03 Coupling

Chapter 3, card P04. Guard: `node guards/coupling-check.ts`.

## The mistake

The agent changes the default tax rate in app/src/config.ts but not the fixture and the docs that mirror it.

## Run it

    npm run drill D03

The runner copies the repository to a scratch folder, runs `node guards/coupling-check.ts` (it should pass),
applies `drills/D03-coupling/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "app/test/fixtures/pricing.json and app/docs/pricing.md did not".

## What you will see

The guard reads the Coupling list in AGENTS.md. After the patch it names the file that
changed, the two files that should have changed with it, and why they belong together.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/config.ts`
- `app/test/fixtures/pricing.json`
- `app/docs/pricing.md`
- `AGENTS.md`
- `guards/coupling-check.ts`

## Try it with a real agent (optional)

Ask your agent: "Change the default tax rate to 19%." Then run node guards/coupling-check.ts before reviewing its diff.
