# D13 Hidden button

Chapter 7, card P18. Guard: `npx --no-install playwright test app/e2e/send-invoice.spec.ts`.

## The mistake

The agent adds hover-only row actions to the shared stylesheet using the class name .actions, which the invoice form already uses for its Send invoice button.

## Run it

    npm run drill D13

The runner copies the repository to a scratch folder, runs `npx --no-install playwright test app/e2e/send-invoice.spec.ts` (it should pass),
applies `drills/D13-hidden-button/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "toBeVisible".

## What you will see

Every unit test still passes. The browser test fails because the Send invoice button
is no longer visible (Playwright reports the locator as hidden).

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/ui/public/styles.css`
- `app/src/ui/public/index.html`
- `app/e2e/send-invoice.spec.ts`

## Try it with a real agent (optional)

Ask your agent to "add row actions that appear on hover to the invoice list".
