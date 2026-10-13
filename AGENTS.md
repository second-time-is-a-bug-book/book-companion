# AGENTS.md

Instructions for coding agents, and people, working in this
repository. This file is a map, not a manual: each line points
to where the detail lives. Budget: 100 lines, checked by
`node guards/instructions-lint.ts`.

## What this is

Companion code for the book "The Second Time Is a Bug".
Invoicer (a small invoicing app), a legacy exporter, the guards
the book builds, and one drill per agent mistake. TypeScript on
Node 22.18 or later, no build step.

## Map

| Path | What it is |
|---|---|
| `app/src/domain/` | Pure rules: money, totals, dates, CSV |
| `app/src/db/` | SQLite storage and `app/src/db/migrations/` |
| `app/src/http/` | JSON API and static file serving |
| `app/src/ui/` | Pages; browser code in `app/src/ui/public/` |
| `app/src/jobs/` | The overdue-reminder job and its scheduler |
| `app/test/` | Unit tests (node:test) |
| `app/e2e/` | Browser and accessibility tests (Playwright) |
| `legacy/` | billing-export, 2014 JavaScript |
| `legacy/characterisation/` | Its golden master tests |
| `guards/` | One script per guard; `guards/gate.ts` runs them |
| `drills/` | One folder per drill; `drills/run.ts` runs them |
| `toy-agent/` | A tiny agent loop driven by a scripted model |
| `templates/` | Starters to copy into your own repository |
| `experiment/` | A kit to measure whether the harness pays |
| `plans/` | Plan and handoff files for larger changes |

## Commands

- Test: `npm test`
- Type check: `npm run typecheck`
- Before every commit: `npm run gate`
- Before you say "done": `npm run evidence`, then
  `node guards/done-check.ts`

## Coupling

If you change the first path, update the others in the same
change. Checked by `node guards/coupling-check.ts`.

- When `app/src/config.ts` changes, also update
  `app/test/fixtures/pricing.json` and `app/docs/pricing.md`.
  Why: the pricing defaults are mirrored there.
- When `app/src/db/migrations/` changes, also update
  `app/test/db.test.ts`.
  Why: every schema change needs a test that uses it.
- When `guards/` changes, also update `DRILLS.md`.
  Why: the book quotes guard output from DRILLS.md.

## Rules

Each rule names the check that enforces it. A rule without a
check is a wish.

- Money is integer cents, never floats:
  `node guards/no-float-money.ts`
- ui never imports db; domain imports no other layer:
  `node guards/layer-boundary.ts`
- Tests are read-only for agents. Never delete, skip or loosen
  one: `node guards/no-skip.ts`, `node guards/test-ratchet.ts`
- Every migration has a down step:
  `node guards/migration-guard.ts`
- No secrets in code; read them from the environment:
  `node guards/secret-scan.ts`
- No dependency outside `.harness/approved-deps.json`:
  `node guards/dependency-diff.ts`,
  `node guards/package-check.ts`
- Changes over 4 files or 150 lines start with a plan in
  `plans/`: `node guards/plan-required.ts`
- Keep each change under 400 changed lines:
  `node guards/diff-budget.ts`
- legacy/ output must not change; its golden master stays
  green: `npm test`
- "Done" means fresh test evidence, not a claim:
  `node guards/done-check.ts`
- No destructive commands (rm -rf, DROP TABLE, force push):
  `node guards/destructive-command.ts` runs as a pre-action
  hook

## When a guard fails

- Read its message. It says what is wrong and what to do next.
- Fix the code, not the guard. If a guard looks wrong, stop and
  ask a human.
- Leave a handoff note in `plans/` before you stop on a long
  task (`templates/plan.md`).
