# How the author's runs were made

The runs Chapter 12 reports: 270 unattended runs of a coding agent on
the experiment tasks, in three conditions, with three models, on 13 and
14 October 2026 (UTC). This file describes how they were made, where
they depart from `../PROTOCOL.md`, and what they cannot show. The run
records are in this folder; `reproduce.ts` recomputes every number the
book quotes from them.

## What ran

- **Agent:** Claude Code 2.1.296 in non-interactive mode, the same
  version for every run.
- **Models:** claude-haiku-5-5, claude-sonnet-5-5 and claude-opus-5-5
  (asked for as `haiku`, `sonnet` and `opus`), each at its default
  effort. The record's `model` field is the model the tool reported
  using; `model_alias` is what was asked for.
- **Sign-in:** a subscription, so `cost_usd` is the tool's own estimate
  at list prices (its `total_cost_usd`), not a bill.
- **Tasks:** T1 to T3 (batch 1) and T4 to T7 (batch 2), exactly as in
  `../tasks/`. Each run's companion commit is in `companion_sha`.
- **Conditions:** as `../PROTOCOL.md` describes. `none`: the task and
  the code, with `AGENTS.md`, `templates/` and `docs/` removed. `rules`:
  plus `AGENTS.md` and the line "Follow the rules in AGENTS.md."
  `gates`: plus the pre-commit gate, the destructive-command hook, the
  stop hook (`done-check`) and the instruction to run `npm run gate`
  and `npm run evidence` before saying done.

| Batch | File | Tasks | Models | Runs | When (UTC) |
|---|---|---|---|---|---|
| 1 | `batch-1.jsonl` | T1 to T3 | sonnet, opus | 90 | 13 Oct, 18:48 to 21:20 |
| 2 | `batch-2.jsonl` | T4 to T7 | sonnet, opus | 120 | 14 Oct, 00:32 to 05:02 |
| 2, Haiku | `batch-2-haiku.jsonl` | T4 to T7 | haiku | 60 | 14 Oct, 05:25 to 08:48 |

Five runs per task, condition and model, interleaved, with the order of
the conditions rotated from block to block.

## How a run went

1. A fresh folder from the companion commit, with no git history, then
   the condition's files removed or added, `npm ci`, and a check that
   `npm test` and `npm run gate` pass before the agent starts.
2. The task text (and the condition's line) as the only instruction.
   Nobody helped the agent: `human_interventions` is 0 in every record.
3. When the agent said it was done, the hidden acceptance tests were
   copied in, run and removed again. If any failed, the agent got the
   failing test names only (never the test code), in the same session.
   Each such round is one `rework`; after three, the run is not
   accepted.
4. Batch 2 and the Haiku batch only: the **defect sweep**. The script
   restored the release's own `guards/`, `.harness/` and
   `legacy/characterisation/` in the run folder (so a weakened guard, a
   lowered test baseline or a re-recorded golden master could hide
   nothing), then ran `no-float-money`, `layer-boundary`, `no-skip`,
   `secret-scan`, `migration-guard`, `dependency-diff`,
   `package-check`, `coupling-check` (with the release's `AGENTS.md`
   coupling list, in every condition), `typecheck`, `unit-tests` and
   `test-ratchet` against the run's start commit. Any failure is a
   defect at done (`defects_at_done`; per check in `defect_sweep`).
   `plan-required` and `diff-budget` ran too but are process rules,
   only told to `rules` and `gates`, and are recorded separately in
   `process_flags`.

## The fields

The first ten fields are the ones `../score.ts` reads (see
`../PROTOCOL.md`), so `node experiment/score.ts experiment/results/batch-2.jsonl`
works on these files. The others:

| Field | Meaning |
|---|---|
| `tokens`, `tokens_in`, `tokens_out`, `tokens_uncached_in`, `tokens_cache_write`, `tokens_cache_read` | the whole session, as the tool reported them |
| `wall_seconds` | first agent call to the last "done", rework rounds and acceptance checks included |
| `turns`, `turns_reported` | API responses in the main loop; the tool's own count per call |
| `files_changed`, `lines_added`, `lines_removed`, `lines_changed` | the run folder against its start commit, new files included |
| `unnecessary_edits`, `unnecessary_edit_files` | changed files outside the task's expected files in `task-scope.json` ("files outside the task" in the book) |
| `existing_tests_modified`, `protected_files_changed` | pre-existing test files changed; changes to guards, `.harness/`, `AGENTS.md`, `legacy/` and similar |
| `hook_events`, `guard_fires`, `commits_by_agent`, `permission_denials`, `api_retries` | what the harness and the tool did |
| `stop_note_used` | the agent ended through the stop hook's written bypass (`.harness/stop-note.md`) |
| `defect_sweep`, `defects_at_done`, `process_flags` | the defect sweep above (batch 2 and Haiku only) |
| `calls`, `acceptance`, `stop_reason` | per agent call and per acceptance round; why the run ended |
| `order`, `rep`, `plan_id`, `started_at` | position in the interleaved plan |

## Where the runs depart from PROTOCOL.md

1. **A script drove every step**, and caps applied to each agent call:
   250 turns, 60 minutes, and a per-run cost cap ($10 for batches 1 and
   2, $5 for Haiku). No run reached a cap.
2. **Isolation.** Each run used an empty tool configuration: no user or
   project settings beyond the condition's own files, no MCP servers,
   no web tools, no memory. Shell commands ran in the tool's sandbox,
   in every condition: no network, and writes only in the run folder
   and a temp folder, with `.claude/` and `.git/hooks` write-protected
   so the agent could not switch the gates off from the shell.
3. **The gates condition included the stop hook**, as above. The
   protocol now says so too.
4. **`docs/` was removed in every condition**, because it describes the
   guards and hooks.
5. **The defect sweep** was added for batch 2, before any batch 2 run.
6. **The Haiku batch was added during batch 2**, after its pilot and
   before its results were complete, because the two larger models
   looked to be at a ceiling. It used the same tasks, conditions,
   measures, hypotheses and companion commit. Its comparison with the
   large model is across batches run a few hours apart, so it is weaker
   than a comparison within one batch.

## What was planned before the runs

`../tasks/BATCH-2.md` was written and committed before any agent saw T4
to T7: the tasks, the measures, the four hypotheses and the analysis
(two-sided Fisher's exact test on the four tasks pooled, and a
difference called only if it also points the same way in at least three
of the four tasks). The same rules were applied to the Haiku batch.
Pilot runs were made before each batch and are not part of these
files. Under the batch 2 plan, a pilot could change only a hidden test
that contradicted its task text; none did, and nothing in the tasks,
measures or hypotheses changed after the pilots.

## Incidents

- Batch 1 and batch 2: no infrastructure failures, no restarts, no API
  retries.
- Haiku batch: the runner was stopped once, during run 22, when the
  session that started it ended. That run left no record; it was run
  again when the batch resumed. Two probe checks (that the sandbox and
  the hook work) were inconclusive on a first attempt and passed when
  repeated; probes are not runs.

## What is not published, and why

- **Agent transcripts and diffs.** They are long and repeat the task
  texts and the hidden tests. The records keep what the analysis uses.
- **The reference solutions** to the hidden tests, so that the tasks
  stay useful for your own runs.
- **The runner script.** It drives one specific agent tool from the
  command line and changes with that tool's versions; `../PROTOCOL.md`
  is the tool-neutral way to repeat the experiment.
- **Session IDs and local paths** were removed from the records. Nothing
  else was changed.

## Limits

Five runs per cell is the protocol's minimum. Seven tasks on one small
codebase, one agent, three models from one vendor, about fourteen hours
of runs. The author wrote the tasks, the hidden tests, the harness and
the defect sweep, which could favour the harness, and the defect sweep
uses the harness's own guards. The defect measure counts "stopped and
asked a person" the same as "left a bug". Costs are estimates. Review
time was not measured. All of it describes these model versions in
October 2026.
