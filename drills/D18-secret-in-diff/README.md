# D18 Secret in diff

Chapter 8, card P22. Guard: `node guards/secret-scan.ts`.

## The mistake

The agent adds an email sender with the mail provider's live API key pasted into the source.

## Run it

    npm run drill D18

The runner copies the repository to a scratch folder, runs `node guards/secret-scan.ts` (it should pass),
applies `drills/D18-secret-in-diff/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "looks like a live API key".

## What you will see

The scan reads only the lines this change adds. It reports the file and line, shows a
redacted form of the key, and says to move it to the environment and have it rotated.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `guards/secret-scan.ts`

## Try it with a real agent (optional)

Give your agent a (fake) API key in the chat and ask it to "wire up reminder emails".
