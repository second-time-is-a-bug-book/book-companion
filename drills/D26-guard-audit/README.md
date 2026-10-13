# D26 Guard audit

Chapter 13, card P34.

## The mistake

Nothing went wrong this time: a year on, some guards have not fired for months, and one never has.

## Run it

    npm run drill D26

This drill uses a script instead of a patch. In a scratch copy, the runner runs:

- before: `node guards/guard-audit.ts --log drills/D26-guard-audit/recent-log.jsonl --now 2026-10-13`
- after: `node guards/guard-audit.ts --log drills/D26-guard-audit/year-log.jsonl --now 2026-10-13`

Expected: before exits 0; after exits 1 and prints "3 retirement candidates".

## What you will see

Both logs are invented fixtures. With the recent log every guard fired in the last 90
days. With the year-long log the audit lists each guard's fire count and last date, and
flags three retirement candidates with their own "Retire when" conditions.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/guard-audit.ts`
- `guards/lib/log.ts`
- `drills/D26-guard-audit/recent-log.jsonl`
- `drills/D26-guard-audit/year-log.jsonl`

## Try it with a real agent (optional)

Run node guards/guard-audit.ts on your own .harness/guard-log.jsonl at your next quarterly harness review.
