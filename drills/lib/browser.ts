// drills/lib/browser.ts
// The browser drills (D13, D14) run Playwright tests, which
// need Playwright's own Chromium. Without it they fail with a
// launch error that looks like a broken drill. So the runner
// checks first: offline and fast, it asks Playwright where
// the browser should be and looks for the file.
import { existsSync } from 'node:fs';

export const INSTALL = 'npx playwright install chromium';

// Where Playwright expects Chromium. PLAYWRIGHT_BROWSERS_PATH
// moves it; Playwright reads that for us.
export async function chromiumPath(): Promise<string> {
  const { chromium } = await import('@playwright/test');
  return chromium.executablePath();
}

export async function hasChromium(
  where: () => Promise<string> = chromiumPath,
): Promise<boolean> {
  try {
    return existsSync(await where());
  } catch {
    return false; // Playwright missing or broken: no browser
  }
}

export function needsChromium(id: string): string {
  return (
    `${id} needs Playwright's Chromium: ` +
    `run \`${INSTALL}\` once, then rerun.`
  );
}

// The last line of `npm run drills`.
export function summary(
  total: number,
  good: number,
  noBrowser: number,
): string {
  const head = `${good} of ${total} drills behaved as expected`;
  if (noBrowser === 0) return `${head}.`;
  const need = noBrowser === 1 ? 'needs' : 'need';
  return `${head}; ${noBrowser} ${need} Chromium (${INSTALL}).`;
}
