// Starts Invoicer.
//   node app/src/main.ts [--port 3000] [--db invoicer.db]
//     [--seed-demo]
// INVOICER_BUILD names the build this process runs; GET
// /version reports it and guards/smoke.ts checks it after a
// deploy.
import type { AddressInfo } from 'node:net';
import { parseArgs } from 'node:util';
import { insertClient, listClients } from './db/clients.ts';
import { openDatabase } from './db/database.ts';
import { createApp } from './http/server.ts';
import { runReminderJob } from './jobs/reminder-job.ts';
import { every } from './jobs/scheduler.ts';

const { values } = parseArgs({
  options: {
    port: {
      type: 'string',
      default: process.env.PORT ?? '3000',
    },
    db: {
      type: 'string',
      default: process.env.INVOICER_DB ?? ':memory:',
    },
    'seed-demo': { type: 'boolean', default: false },
  },
});

const version = process.env.INVOICER_BUILD ?? 'dev';
const port = Number(values.port);
const db = openDatabase(values.db);
if (values['seed-demo'] && listClients(db).length === 0) {
  insertClient(db, 'Demo client', 'billing@example.com');
}

const server = createApp({ db, version });
server.listen(port, '127.0.0.1', () => {
  // The actual port differs from port when port is 0.
  const { port: actual } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${actual}`;
  console.log(`Invoicer ${version} listening on ${url}`);
});

// Check for overdue invoices every hour. The decision logic is
// the pure function dueReminders(); this is only the timer
// around it.
const HOUR_MS = 3_600_000;
const stopReminders = every(HOUR_MS, () => {
  const today = new Date().toISOString().slice(0, 10);
  const sent = runReminderJob(db, today);
  if (sent.length > 0)
    console.log(`reminders: sent ${sent.length}`);
});

process.on('SIGTERM', () => {
  stopReminders();
  server.close(() => db.close());
});
