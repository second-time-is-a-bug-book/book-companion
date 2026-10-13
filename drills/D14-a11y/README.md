# D14 Accessibility

Chapter 7, card P18. Guard: `npx --no-install playwright test app/e2e/accessibility.spec.ts`.

## The mistake

The agent renames the description input's id for a future multi-line form and leaves its label pointing at the old id.

## Run it

    npm run drill D14

This drill runs a browser test, so it needs Playwright's Chromium. Install it once with
`npx playwright install chromium`. Without it the runner says so and does not run the drill.

The runner copies the repository to a scratch folder, runs `npx --no-install playwright test app/e2e/accessibility.spec.ts` (it should pass),
applies `drills/D14-a11y/mistake.patch`, runs the guard again (it should fail), prints both
outputs and deletes the scratch copy. Your working tree is never changed.

Expected: before exits 0; after exits 1 and prints "label: Form elements must have labels".

## What you will see

axe-core reports the input with no label: the rule, what it means and the element.

The exact output of both runs is in `DRILLS.md` at the repository root.

## Files

- `app/src/ui/public/index.html`
- `app/e2e/accessibility.spec.ts`

## Try it with a real agent (optional)

Ask your agent to "rename the form field ids to line-*".
