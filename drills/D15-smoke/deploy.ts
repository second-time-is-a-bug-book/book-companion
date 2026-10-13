// drills/D15-smoke/deploy.ts
// Simulates deploying Invoicer build 1.5.0 over a running build
// 1.4.0, then runs the post-deploy smoke check against the live
// server.
//   node drills/D15-smoke/deploy.ts --restart
//     the deploy restarts the server
//   node drills/D15-smoke/deploy.ts
//     the agent skips the restart
import { spawn } from 'node:child_process';
import { sh } from '../../guards/lib/shell.ts';

type Server = { url: string; stop: () => void };

// Starts the real app on a free port and resolves with its URL
// once it listens.
function start(build: string): Promise<Server> {
  const args = [
    '--disable-warning=ExperimentalWarning',
    'app/src/main.ts',
    '--port',
    '0',
  ];
  const child = spawn(process.execPath, args, {
    env: { ...process.env, INVOICER_BUILD: build },
  });
  return new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      const url = /listening on (\S+)/.exec(String(chunk))?.[1];
      if (url) resolve({ url, stop: () => child.kill() });
    });
    child.on('exit', (code) => {
      const why = `server exited early with code ${code}`;
      reject(new Error(why));
    });
  });
}

let server = await start('1.4.0');
console.log('deploy: build 1.4.0 is running');
console.log('deploy: copying build 1.5.0 into place');
if (process.argv.includes('--restart')) {
  server.stop();
  server = await start('1.5.0');
  console.log('deploy: restarted the server');
} else {
  console.log('deploy: skipped the restart');
  console.log('  ("the server will pick up the new files")');
}
console.log('deploy: done, reporting success\n');

const check = `--url ${server.url} --expect 1.5.0`;
const smoke = sh(`node guards/smoke.ts ${check}`);
console.log(smoke.output.trimEnd());
server.stop();
process.exitCode = smoke.code;
