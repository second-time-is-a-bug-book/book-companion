// guards/smoke.ts
// After a deploy: is the new build actually what is running,
// and is it healthy?
//   node guards/smoke.ts --url http://127.0.0.1:3000 \
//     --expect 1.5.0
// Card P19 (Chapter 7). Placement: deploy.
// Kind: sensor, computational.
// Retire when: your deploy platform verifies the running
// version and health itself and fails the deploy when they are
// wrong.
import { parseArgs } from 'node:util';
import { isMain, report } from './lib/log.ts';

export async function smoke(
  url: string,
  expected: string,
): Promise<string[]> {
  const problems: string[] = [];
  try {
    const health = await fetch(`${url}/health`);
    const body = await health.json();
    if (health.status !== 200 || body.status !== 'ok') {
      const got = `${health.status} ${JSON.stringify(body)}`;
      problems.push(
        `${url}/health answered ${got}.\n` +
          'Fix: the new build is unhealthy. Roll back, then ' +
          'read the server log.',
      );
    }
    const served = await fetch(`${url}/version`);
    const { version } = await served.json();
    if (version !== expected) {
      problems.push(
        `${url}/version reports ${version}, but this deploy ` +
          `shipped ${expected}.\n` +
          'Fix: the old build is still serving. Restart or ' +
          'redeploy, run this check again, and do not report ' +
          'the deploy as done until it passes.',
      );
    }
  } catch (error) {
    const reason = (error as Error).message;
    problems.push(
      `Could not reach ${url}: ${reason}.\n` +
        'Fix: check the server started and the URL is right.',
    );
  }
  return problems;
}

if (isMain(import.meta.url)) {
  const text = { type: 'string' } as const;
  const { values } = parseArgs({
    options: { url: text, expect: text },
  });
  const { url, expect } = values;
  if (!url || !expect) {
    const args = '--url <base url> --expect <version>';
    console.error(`usage: node guards/smoke.ts ${args}`);
    process.exit(1);
  }
  const ok = `${url} is healthy and serving ${expect}`;
  report('smoke', await smoke(url, expect), ok);
}
