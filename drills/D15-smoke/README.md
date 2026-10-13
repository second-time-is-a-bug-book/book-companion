# D15 Smoke

Chapter 7, card P19.

## The mistake

The deploy copies build 1.5.0 into place but skips the restart, so the old 1.4.0 process keeps serving.

## Run it

    npm run drill D15

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node drills/D15-smoke/deploy.ts --restart`
- after: `node drills/D15-smoke/deploy.ts`

Expected: before exits 0; after exits 1 and prints "reports 1.4.0, but this deploy shipped 1.5.0".

## What you will see

Both runs start the real app as build 1.4.0 and "deploy" 1.5.0. With the restart,
the smoke check finds 1.5.0 live and healthy. Without it, the deploy still reports
success, and the smoke check catches that /version says 1.4.0. The port changes on
every run.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/smoke.ts`
- `drills/D15-smoke/deploy.ts`
- `app/src/main.ts`

## Try it with a real agent (optional)

Ask your agent to deploy a version bump to a local server and to verify the deploy; see whether it checks /version.
