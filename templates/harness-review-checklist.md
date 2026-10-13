# Harness review checklist

Run this every quarter, and again after you change model or agent version.
Block 60 minutes. Bring the incident log and `.harness/guard-log.jsonl`.

## 1. What fired

- [ ] Run `node guards/guard-audit.ts`. List every guard with its fire count and last-fired date.
- [ ] For each guard that fired: was the catch real, or noise? Fix noisy guards first; noise teaches people to bypass.
- [ ] For each retirement candidate: read its "Retire when" condition. Is it met? Delete the guard, or write down why it stays.
- [ ] A guard that has never fired is either insurance against a rare, costly mistake, or dead weight. Decide which, in writing.

## 2. What got through

- [ ] Read every incident-log entry since the last review. Does each one have a guard, or a written reason for none?
- [ ] Any mistake that happened twice without a guard? That is a bug in the harness: add the guard now.
- [ ] Add each new incident's defect to `guards/seeded-defects.json` and run `node guards/seeded-defects.ts`. Every defect must be caught.

## 3. What it costs

- [ ] Time the gate: `npm run gate`. Is the fast stage still fast? Move slow checks later, not out.
- [ ] Which guards do agents (or people) bypass most? Find out why before you tighten them.
- [ ] Price each guard: minutes per week it costs against the incidents it prevents (Chapter 12, card P33).

## 4. Guides

- [ ] Run `node guards/instructions-lint.ts`. Under budget, no dead paths, every rule names its check?
- [ ] Remove instructions the current model follows without being told. Re-test by removing them in a branch and running the drills.
- [ ] Is the coupling list complete? Check the last quarter's review comments for "you forgot to also update ...".

## 5. After a model or agent upgrade

- [ ] Run `npm run drills`. Every drill still behaves as expected?
- [ ] Re-run the experiment kit (`experiment/PROTOCOL.md`) on one task, with and without the harness. Record the result, whatever it is.
- [ ] Note which guards fired less with the new model. They are candidates for the next review, not for deletion today.

## Record

Date, who attended, guards added, guards retired (with the reason), and the next review date.
