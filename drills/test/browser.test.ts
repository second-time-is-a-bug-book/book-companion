// Tests for the drill runner's Chromium check. Not part of
// npm test (that count is fixed for the experiment); run them
// with: node --test drills/test/*.test.ts
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  hasChromium,
  needsChromium,
  summary,
} from '../lib/browser.ts';

const root = join(import.meta.dirname, '../..');

test('hasChromium: file check, never throws', async () => {
  const missing = async () => join(tmpdir(), 'no-such-chrome');
  assert.equal(await hasChromium(missing), false);
  const present = async () => process.execPath; // any real file
  assert.equal(await hasChromium(present), true);
  const broken = async (): Promise<string> => {
    throw new Error('Cannot find module @playwright/test');
  };
  assert.equal(await hasChromium(broken), false);
});

test('the message and summary say what to do', () => {
  assert.equal(
    needsChromium('D13'),
    "D13 needs Playwright's Chromium: run " +
      '`npx playwright install chromium` once, then rerun.',
  );
  assert.equal(
    summary(26, 26, 0),
    '26 of 26 drills behaved as expected.',
  );
  assert.equal(
    summary(26, 24, 2),
    '24 of 26 drills behaved as expected; ' +
      '2 need Chromium (npx playwright install chromium).',
  );
  assert.match(summary(26, 25, 1), /; 1 needs Chromium/);
});

test('without Chromium, D13 is not run; it says why', () => {
  const empty = mkdtempSync(join(tmpdir(), 'no-browsers-'));
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const quiet = '--disable-warning=ExperimentalWarning';
  try {
    const run = spawnSync(
      process.execPath,
      [quiet, 'drills/run.ts', 'D13'],
      {
        cwd: root,
        env: { ...env, PLAYWRIGHT_BROWSERS_PATH: empty },
        encoding: 'utf8',
      },
    );
    assert.equal(run.status, 1); // not complete, so not 0
    const said = run.stdout + run.stderr;
    assert.match(said, /^D13 needs Playwright's Chromium/m);
    assert.match(run.stdout, /D13 .*not run\s+needs Chromium/);
    assert.match(
      run.stdout,
      /0 of 1 drills behaved as expected; 1 needs Chromium/,
    );
    assert.doesNotMatch(said, /NOT AS EXPECTED/);
    assert.doesNotMatch(said, /browserType/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});
