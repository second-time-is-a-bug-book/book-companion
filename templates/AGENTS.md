# AGENTS.md

<!-- Starter from "The Second Time Is a Bug". Replace every
     <placeholder>. Keep this file under 100 lines: it is a
     map, not a manual. Check it with
     node guards/instructions-lint.ts (copy the guard into your
     repository). -->

Instructions for coding agents, and people, working in this
repository. Each line points to where the detail lives.
Budget: 100 lines.

## What this is

<One or two sentences: what the product does and who uses it.>
<Language, runtime and the one command that starts it.>

## Map

| Path | What it is |
|---|---|
| `<src/domain/>` | <Pure business rules, no I/O> |
| `<src/db/>` | <Storage; migrations in src/db/migrations/> |
| `<src/http/>` | <API routes> |
| `<src/ui/>` | <Pages and front end> |
| `<test/>` | <Unit tests> |
| `<docs/>` | <Longer explanations this file links to> |

## Commands

- Test: `<npm test>`
- Type check: `<npm run typecheck>`
- Before every commit: `<npm run gate>`
- Before you say "done": `<npm run evidence>`

## Coupling

If you change the first path, update the others in the same
change. Checked by `<node guards/coupling-check.ts>`.

- When `<src/config.ts>` changes, also update
  `<test/fixtures/pricing.json>` and `<docs/pricing.md>`.
  Why: <the values are mirrored there>.
- When `<src/db/migrations/>` changes, also update
  `<test/db.test.ts>`.
  Why: <every schema change needs a test>.

## Rules

Each rule names the check that enforces it. A rule without a
check is a wish: add the check or delete the rule.

- <Money is integer cents>: `<node guards/no-float-money.ts>`
- <ui never imports db>: `<node guards/layer-boundary.ts>`
- <Tests are read-only for agents; never delete, skip or loosen
  one>: `<node guards/no-skip.ts>`,
  `<node guards/test-ratchet.ts>`
- <Every migration has a down step>:
  `<node guards/migration-guard.ts>`
- <No secrets in code>: `<node guards/secret-scan.ts>`
- <No unapproved dependencies>:
  `<node guards/dependency-diff.ts>`
- <Large changes start with a plan in plans/>:
  `<node guards/plan-required.ts>`
- <"Done" means fresh test evidence>:
  `<node guards/done-check.ts>`
- <No destructive commands>:
  `<node guards/destructive-command.ts>` as a pre-action hook

## When a guard fails

- Read its message. It says what is wrong and what to do next.
- Fix the code, not the guard. If a guard looks wrong, stop and
  ask a human.
- On a long task, keep a plan and handoff note in `<plans/>`.

<!-- Review this file every quarter
     (templates/harness-review-checklist.md). Delete rules whose
     check has not fired in 90 days and whose risk is gone. -->
