# Plan: publish the author's experiment results

## Goal
Readers can inspect the 270 runs Chapter 12 reports and recompute
every number the book quotes from them.

## Context
The records come from the author's private run kit (one batch per
file). Session IDs and local paths are removed; nothing else changes.
The batch 2 plan is `experiment/tasks/BATCH-2.md`.

## Steps
1. [x] Add the run records: `experiment/results/batch-1.jsonl`,
   `batch-2.jsonl`.
2. [ ] Add `batch-2-haiku.jsonl`, `task-scope.json`, `METHODOLOGY.md`
   and the folder's `README.md`.
3. [ ] Add `reproduce.ts` and `experiment/test/results.test.ts`; raise
   the test baseline; point `PROTOCOL.md` and the README at the folder.
4. [ ] Remove this plan.

## Done when
- `node experiment/results/reproduce.ts` prints the book's numbers.
- `npm test` passes with `results.test.ts`, and `npm run gate` passes.

## Handoff
Steps run in order, one commit each, to stay under the diff budget.
