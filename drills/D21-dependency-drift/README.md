# D21 Dependency drift

Chapter 9, card P25. Guard: `node guards/dependency-diff.ts`.

## The mistake

The agent adds a CSV library to package.json without approval and without updating the lockfile.

## Run it

    npm run drill D21

The runner copies the repository to a scratch folder, runs `node guards/dependency-diff.ts` (it should pass),
applies `drills/D21-dependency-drift/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "is a new dependency that nobody approved".

## What you will see

Two problems: nobody approved the package (it is not in `.harness/approved-deps.json`),
and package-lock.json does not list it.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `package.json`
- `package-lock.json`
- `.harness/approved-deps.json`
- `guards/dependency-diff.ts`

## Try it with a real agent (optional)

Ask your agent to "simplify the CSV export" and see whether it reaches for a package.
