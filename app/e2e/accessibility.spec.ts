// Accessibility: runs the axe-core rules against the invoice
// form (drill D14). Every violation is listed with its rule,
// what it means and where it is.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const axeSource = readFileSync(axePath, 'utf8');

interface Violation {
  id: string;
  help: string;
  nodes: { target: string[] }[];
}
type Results = { violations: Violation[] };
// The page's axe global, once the script tag has loaded it.
declare const axe: { run(): Promise<Results> };

// "rule: what it means (where)", one line per violation.
function summary({ id, help, nodes }: Violation): string {
  const where = nodes.map((node) => node.target.join(' '));
  return `${id}: ${help} (${where.join(', ')})`;
}

test('the form passes every axe rule', async ({ page }) => {
  await page.goto('/');
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(() => axe.run());
  const violations = results.violations.map(summary);
  const advice = 'Fix each violation; do not disable the rule';
  expect(violations, advice).toEqual([]);
});
