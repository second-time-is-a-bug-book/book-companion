// The JSON HTTP API and the static front end, on node:http
// with no framework.
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { Database } from '../db/database.ts';
import { invoiceRoutes } from './invoice-routes.ts';
import { HttpError, type Reply, type Route } from './reply.ts';
import { serveStatic } from './static.ts';

export interface AppOptions {
  db: Database;
  // The build this process runs, reported by GET /version.
  version: string;
  today?: () => string; // injectable clock for tests
}

export function createApp(options: AppOptions): Server {
  const today =
    options.today ??
    (() => new Date().toISOString().slice(0, 10));
  const routes: Route[] = [
    {
      method: 'GET',
      pattern: /^\/health$/,
      handle: () => health(options.db),
    },
    {
      method: 'GET',
      pattern: /^\/version$/,
      handle: () => ({
        status: 200,
        body: { version: options.version },
      }),
    },
    ...invoiceRoutes(options.db, today),
  ];
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? '/', 'http://localhost')
        .pathname;
      for (const route of routes) {
        const match =
          route.method === req.method
            ? route.pattern.exec(path)
            : null;
        if (match)
          return send(
            res,
            route.handle(match.slice(1), await readBody(req)),
          );
      }
      if (req.method === 'GET' && serveStatic(path, res))
        return;
      send(res, {
        status: 404,
        body: { error: `No route for ${req.method} ${path}` },
      });
    } catch (error) {
      if (error instanceof HttpError)
        return send(res, {
          status: error.status,
          body: { error: error.message },
        });
      console.error(error);
      send(res, {
        status: 500,
        body: { error: 'Internal error' },
      });
    }
  });
}

function health(db: Database): Reply {
  // Throws, and so answers 500, if the database is unusable.
  db.prepare('SELECT 1').get();
  return { status: 200, body: { status: 'ok' } };
}

async function readBody(
  req: IncomingMessage,
): Promise<unknown> {
  if (req.method !== 'POST') return undefined;
  let text = '';
  for await (const chunk of req) text += chunk;
  if (text === '') return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

function send(res: ServerResponse, reply: Reply): void {
  const type = reply.type ?? 'application/json; charset=utf-8';
  const text = reply.type
    ? String(reply.body)
    : JSON.stringify(reply.body);
  res.writeHead(reply.status, { 'content-type': type });
  res.end(text);
}
