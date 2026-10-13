# D22 Legacy refactor

Chapter 10, card P27. Guard: `node --test --test-reporter=spec "legacy/characterisation/**/*.test.ts"`.

## The mistake

The agent "cleans up" legacy/billing-export.js and rounds tax once per invoice instead of once per line, changing totals customers reconcile against.

## Run it

    npm run drill D22

The runner copies the repository to a scratch folder, runs `node --test --test-reporter=spec "legacy/characterisation/**/*.test.ts"` (it should pass),
applies `drills/D22-legacy-refactor/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "fail 2".

## What you will see

The golden-master tests compare the exporter's output with output recorded before
anyone touched it. After the clean-up, invoice 2014-001's tax changes from 0.04 to 0.03
and the grand total moves by a cent; the test output shows the differing lines.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `legacy/billing-export.js`
- `legacy/characterisation/billing-export.test.ts`
- `legacy/characterisation/fixtures/`

## Try it with a real agent (optional)

Ask your agent to "modernise legacy/billing-export.js".
