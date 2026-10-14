# Does the harness pay? A one-developer experiment

This is the protocol for Chapter 12. It lets you measure, on your own machine
and budget, whether the harness in this repository changes how often a coding
agent gets a task right, and what each accepted change costs. It does not come
with results; Chapter 12 reports the author's own runs, and
`experiment/results/` has their records. Run it and record what
you find, whatever it is.

## The question

For a fixed task, compare:

1. **No harness**: the agent gets the task and the code, nothing else.
2. **Rules only**: the agent also gets `AGENTS.md`.
3. **Full gates**: `AGENTS.md`, plus the gate as a pre-commit hook, the
   destructive-command hook, the stop hook (`done-check`), and the
   instruction to run `npm run gate` and `npm run evidence` before saying
   "done".

And one cross-comparison: **a cheaper model with full gates** against **a
stronger model with no harness**. That is the comparison most teams care about.

## Tasks

Seven tasks against Invoicer, each with hidden acceptance tests, in two
batches. T1 to T3 are everyday features. T4 to T7 are harder: each is a change
where a quick implementation runs into a mistake the book is about.
`experiment/tasks/BATCH-2.md` is the plan for the second batch, written
before it ran.

| Task | Folder | Give the agent |
|---|---|---|
| T1 Partial payments | `experiment/tasks/T1-partial-payments/` | the text in `TASK.md` |
| T2 Late fees | `experiment/tasks/T2-late-fees/` | the text in `TASK.md` |
| T3 Overdue export | `experiment/tasks/T3-overdue-export/` | the text in `TASK.md` |
| T4 Prices below a cent | `experiment/tasks/T4-sub-cent-prices/` | the text in `TASK.md` |
| T5 Legacy options | `experiment/tasks/T5-legacy-options/` | the text in `TASK.md` |
| T6 Stored totals | `experiment/tasks/T6-stored-totals/` | the text in `TASK.md` |
| T7 Recurring invoices | `experiment/tasks/T7-recurring-invoices/` | the text in `TASK.md` |

The acceptance tests (`acceptance.test.ts`) are hidden from the agent. Run them
yourself in the run's folder after the agent says it is done, and remove them
again before any rework round:

    cp -r <your clone>/experiment/tasks experiment/
    node --test experiment/tasks/T1-partial-payments/acceptance.test.ts
    rm -r experiment/tasks

They fail on the code as shipped and pass on a correct implementation.

## Setting up each condition

| Condition | The agent works in | Add this line after the task text |
|---|---|---|
| `none` | the repository without `AGENTS.md` and `templates/` | nothing |
| `rules` | the repository with `AGENTS.md` | `Follow the rules in AGENTS.md.` |
| `gates` | as `rules`, plus the pre-commit gate, the destructive-command hook and the stop hook | `Follow the rules in AGENTS.md. Run npm run gate and npm run evidence before you say you are done.` |

The rest of the repository, guards and README included, is the same in every
condition, except `docs/`, which is removed in every condition because it
describes the guards and hooks. Give every run its own folder, made from the same commit, with no git
history (a clone's history still holds the acceptance tests):

```sh
run=../runs/t1-gates-01                              # one folder per run
mkdir -p "$run" && git archive HEAD | tar -x -C "$run" && cd "$run"
rm -r experiment/tasks experiment/PROTOCOL.md docs     # every condition
rm -r AGENTS.md templates                              # none only
git init -q && git add -A && git commit -qm "start"    # a clean tree to start from
cp templates/hooks/pre-commit .git/hooks/pre-commit    # gates only
npm ci && npm test                                     # must pass before the agent starts
npm run gate                                           # must pass too, in every condition
```

For `gates`, also wire `templates/hooks/agent-pre-action.sh` and
`templates/hooks/agent-stop.sh` into your agent (see
`templates/hooks/README.md`).

`npm run gate` passes in a clean copy of all three conditions. In `none` it
reports `coupling-check` as skipped, because there is no `AGENTS.md` to read
the coupling list from; it does not fail.

Delete `experiment/tasks/` (the acceptance tests and task texts) and this file,
not the whole of `experiment/`: the scorer's tests in `experiment/test/` run in
`npm test`, and without them the test count falls below the baseline, so the
gate would refuse every commit in the `gates` condition. In `none`, `npm test`
reports one skipped test, the check of the `AGENTS.md` coupling list.

## Running

- Use the same agent tool, version and settings for every run in a comparison.
  Write them down.
- Paste the task text from `TASK.md` (below the line), then your condition's
  line, as the first and only instruction.
- Let the agent work until it says it is done. Do not help it.
- Then run the acceptance tests in the run's folder (see Tasks). If they
  fail, give the agent the failing test names only (not the test code) and
  let it try again. Each such round is one **rework**. Stop after 3 rework
  rounds and mark the run not accepted.
- Run each condition at least 5 times per task, more if you can afford it.
  Agents are not deterministic; one run proves nothing.
- Interleave conditions (A, B, C, A, B, C ...) rather than running all of one
  condition first, so that rate limits, time of day or a provider change do not
  line up with one condition.

## What to log

One JSON object per run, one per line (JSON Lines), in a file you keep with the
results. Here is one record, wrapped to fit the page; in the file it is a
single line:

```json
{"run_id": "2026-10-20-t1-gates-01",
 "task": "T1-partial-payments", "condition": "gates",
 "model": "<model name and version>", "tokens": 41200,
 "cost_usd": 0.62, "wall_seconds": 540, "first_pass": false,
 "rework": 1, "accepted": true}
```

| Field | Meaning |
|---|---|
| `condition` | `none`, `rules` or `gates` |
| `model` | the exact model and version, as your tool reports it |
| `tokens` | total tokens for the run, input plus output, as your tool or provider reports them |
| `cost_usd` | what the run cost, from your provider's usage page or your tool's report |
| `wall_seconds` | from the first instruction to the final "done" |
| `first_pass` | the acceptance tests passed at the agent's first "done" |
| `rework` | rounds of "these tests fail, try again" (0 to 3) |
| `accepted` | the acceptance tests passed at the end |

Also note, outside the log: anything unusual (an outage, a tool update, a run
you had to restart) and how long your own review of each accepted change took.
Review time is real cost; the log does not capture it.

## Scoring

    node experiment/score.ts my-runs.jsonl

For each condition and model it prints the first-pass rate, mean rework, how
many runs were accepted, mean tokens, total cost, cost per accepted change and
mean time. Cost per accepted change divides the cost of all runs, including
failed ones, by the number of accepted changes.

`experiment/fixtures/FIXTURE-not-results.jsonl` exists only to test the scorer.
Its numbers are invented. Do not quote them.

## Reading the results honestly

- Report every run, including the ones that went badly.
- Report the spread, not just the mean. With 5 runs per cell, a difference of
  one accepted change is noise.
- Say which agent tool, model versions and dates you used. Results expire when
  models change; that is what Chapter 13 is about.
- Three small tasks on one small codebase do not generalise to your codebase.
  Treat the kit as a template: swap in tasks from your own backlog with your own
  hidden acceptance tests.
