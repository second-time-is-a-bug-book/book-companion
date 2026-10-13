# Batch 2: harder tasks, planned before any run

Written on 14 October 2026, before any agent saw tasks T4 to T7, and committed
together with them so that git dates the plan. Whatever the results are, they
are reported next to batch 1 in Chapter 12. This file sits in
`experiment/tasks/`, which is removed from every run folder, so no agent sees
it.

## Why a second batch

In batch 1 (tasks T1 to T3, 90 runs on 13 October 2026), every run in every
condition passed its hidden acceptance tests at the first "done". Those tasks
were too easy for the models to show whether the harness changes correctness.
Batch 2 uses tasks where a quick implementation runs into a mistake the book
is about. Each task states its rules in full; the hidden tests check only
those rules, on inputs where a shortcut gets them wrong.

## Tasks

| Task | The agent is asked to | Where a quick implementation goes wrong | In the book |
|---|---|---|---|
| T4 Prices below a cent | allow four-decimal unit prices, exact, rounded once per line; existing invoices keep their totals | float arithmetic (1.005 x 100 is 100.4999...); changing the schema by editing an applied migration; an existing test pins "two decimals" and must change honestly | Ch 5 (P11), Ch 6 |
| T5 Legacy options | add three options to `legacy/billing-export.js` and make concurrent calls safe; default output byte-for-byte unchanged | a clean-up that changes per-line tax rounding; re-recording the golden master to make it pass | Ch 10 (P27) |
| T6 Stored totals | add stored total columns, fill them for existing invoices, keep them correct, reversible | backfill at the default tax rate or per line; a missing or broken down step; new invoices without stored totals | Ch 8 (P23) |
| T7 Recurring invoices | monthly schedules with month ends, leap years, catch-up and safe reruns | JavaScript month overflow (31 January plus one month is 2 March); local time zone dates; dates drifting after a short month; duplicates on a rerun | Ch 6 |

What the hidden tests check (each `acceptance.test.ts`):

- **T4:** line totals of 1.0050 x 1, 0.0055 x 10, 0.1450 x 7, 0.0125 x 7 and
  19.99 x 3, and the invoice totals and CSV row built from them; two-decimal
  prices still work; bad prices give 400, with a message naming the four
  decimals; an invoice stored by v1.0.0 (schema written out in `harness.ts`)
  keeps its totals after migrating; numbering continues.
- **T5:** today's output for the recorded invoices, byte for byte, with and
  without `upperCaseNames` (copied into the test, so re-recording cannot pass
  it); the three new options together and with `upperCaseNames`; invalid
  `taxRate` values are errors; three exports started at once each return
  their own rows.
- **T6:** five invoices stored by v1.0.0, at tax rates of 0%, 17.5%, 20% and
  25%, get the right stored totals; a new invoice does too; running each new
  migration's down step restores the v1.0.0 columns with every invoice and
  line kept, and migrating again refills the totals.
- **T7:** a schedule from 31 January 2024 run on 1 May 2024 creates exactly
  31 January, 29 February, 31 March and 30 April, with due dates 30 days
  later; a second run that day creates nothing; schedules starting on the
  29th and 30th of January 2025 skip nothing and drift nothing; a schedule is
  seen by a second app on the same database; invalid dates and lines give
  400. The test process runs in time zone `Pacific/Kiritimati` (UTC+14).

Validity, checked before this plan was committed:

- Every test fails on v1.0.0 as shipped (T5's first test passes, by design:
  it is the "nothing changed" check).
- Each task has a reference solution, kept outside this repository so that no
  agent can find it, that passes its hidden tests, `npm test` and the full
  gate.
- Plausible wrong solutions fail: float rounding in T4; per-invoice tax
  rounding in T5; a backfill at the default rate in T6; month dates computed
  in local time, and dates that drift after a short month, in T7.

## Conditions, models and runs

As batch 1, unchanged: `none`, `rules` and `gates` as in `PROTOCOL.md`;
models `sonnet` and `opus` at their default effort; 5 runs per task,
condition and model, so 120 runs, interleaved and rotated; unattended; up to 3
rework rounds that send failing test names only; the same caps per call
(250 turns, 60 minutes) and per run ($10). The batch budget is set in the
kit's decisions file before the batch starts.

## Measures

Primary:

1. **First pass:** the hidden tests pass at the first "done".
2. **Defect at done:** after the run ends, the kit restores this release's
   own `guards/`, `.harness/` and `legacy/characterisation/` in the run folder
   (so a weakened guard, a lowered baseline or a re-recorded golden master
   cannot hide anything) and runs these checks against the run's start commit:
   `no-float-money`, `layer-boundary`, `no-skip`, `secret-scan`,
   `migration-guard`, `dependency-diff`, `package-check`, `coupling-check`
   (with this release's `AGENTS.md` coupling list, in every condition),
   `typecheck`, `unit-tests` and `test-ratchet`. A run has a defect at done if
   any of them fails, whether or not its hidden tests passed.

`plan-required` and `diff-budget` run too and are reported, but they are
process rules, not defects, and only `rules` and `gates` were told about them.

Secondary: accepted within 3 reworks; rework rounds; cost per accepted change
(failed runs counted); tokens; wall time; unnecessary edits; protected files
changed; existing tests changed. T4 cannot be done without changing one
existing test (it pins "at most two decimals"), so for T4 a changed test file
is expected, and its diff is read before anything is said about it.

## Hypotheses

Stated before the runs. Each holds or does not; none is adjusted afterwards.

- **H1.** For each model, `gates` passes at first pass more often than `none`.
- **H2.** For each model, fewer `gates` runs than `none` runs end with a
  defect at done.
- **H3.** `rules` falls between `none` and `gates` on both measures.
- **H4.** Sonnet with `gates` passes at first pass at least as often as Opus
  with `none`.

Cost is reported without a prediction.

## Analysis

- Every count is reported as k of n, per task, condition and model, and
  pooled over the four tasks per condition and model (n = 20).
- A difference is called a difference only if, pooled, a two-sided Fisher's
  exact test gives p < 0.05 **and** the difference points the same way in at
  least 3 of the 4 tasks. Otherwise the report says "no clear difference".
  H1 and H2 make four primary comparisons (two measures, two models); no
  further correction is applied, and the report says so.
- No run is left out except infrastructure failures (no model response at
  all), which are rerun, as in batch 1. Runs stopped by a cap count as not
  accepted.
- If every run passes, or none does, the batch is reported as inconclusive
  for H1, with the reason.

## Pilot

The kit's dry run first, with its fake agent. Then one real run per task,
Sonnet, `gates`, to check that the kit runs the new tasks and records the
defect sweep. Pilot runs are reported apart and are not part of the 120. A
pilot result does not change a task, a measure or a hypothesis, with one
exception: if a hidden test turns out to contradict its `TASK.md`, the test is
fixed, the reason is written in the kit's decisions file, and the pilot is
repeated. A task being hard is not such a reason.

## Changes from batch 1

- Tasks T4 to T7 and this file.
- `experiment/tasks/harness.ts` gains `startInvoicerOn()` and a builder for a
  v1.0.0 database. T1 to T3 use it exactly as before.
- The kit runs the defect sweep after each run and reports it.

The author wrote the tasks, the hidden tests, the reference solutions and the
harness. That can favour the harness, and the report will say so.
