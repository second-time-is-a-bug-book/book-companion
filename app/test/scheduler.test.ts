import assert from 'node:assert/strict';
import { test } from 'node:test';
import { every } from '../src/jobs/scheduler.ts';

// Each run finishes asynchronously, so let it settle before
// the next tick.
const settle = () =>
  new Promise((resolve) => setImmediate(resolve));

test('every() runs now, then each interval', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let runs = 0;
  const stop = every(1000, () => {
    runs += 1;
  });
  await settle();
  assert.equal(runs, 1);
  t.mock.timers.tick(1000);
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(runs, 3);
  stop();
  t.mock.timers.tick(5000);
  assert.equal(runs, 3);
});

test('a slow run is never overlapped', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let started = 0;
  let finish = () => {};
  const stop = every(1000, () => {
    started += 1;
    return new Promise<void>((resolve) => (finish = resolve));
  });
  // Three ticks while the first run is still going.
  t.mock.timers.tick(3000);
  assert.equal(started, 1);
  finish();
  await settle();
  t.mock.timers.tick(1000);
  assert.equal(started, 2);
  stop();
});

test('a throwing run does not stop the schedule', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const logged = t.mock.method(console, 'error', () => {});
  let runs = 0;
  const stop = every(1000, () => {
    runs += 1;
    throw new Error('boom');
  });
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(runs, 2);
  assert.equal(logged.mock.callCount(), 2);
  stop();
});
