# The author's results

The run records behind Chapter 12 ("What happened when I ran it") and
the figures in Chapters 12 and 13: 270 unattended runs of a coding
agent on the tasks in `../tasks/`, with no harness, with `AGENTS.md`
and with the full gates, on 13 and 14 October 2026.

| File | What it is |
|---|---|
| `batch-1.jsonl` | 90 runs, tasks T1 to T3, two models |
| `batch-2.jsonl` | 120 runs, tasks T4 to T7, two models |
| `batch-2-haiku.jsonl` | 60 runs, tasks T4 to T7, a third, smaller model |
| `task-scope.json` | The files each task is expected to touch, for the "files outside the task" measure |
| `METHODOLOGY.md` | How the runs were made, every field, where they depart from `../PROTOCOL.md`, what is not published, and the limits |
| `reproduce.ts` | Recomputes every number the book quotes from these files |

One JSON object per line, one line per run. The plan for the second
batch, written before any of its runs, is `../tasks/BATCH-2.md`.

## Check the book's numbers

```sh
node experiment/results/reproduce.ts                  # every number in Chapter 12
node experiment/score.ts experiment/results/*.jsonl   # the kit's own scorer
```

`experiment/test/results.test.ts` runs in `npm test` and fails if a
record or a number in the book drifts.

## Read them with care

These are one person's runs: seven small tasks on one codebase, one
agent, three models from one vendor, five runs per cell. They say what
happened here, not what will happen on your code. `METHODOLOGY.md`
lists the limits; the protocol is there so you can run your own.
