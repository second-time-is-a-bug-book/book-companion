// Serves the static front end from app/src/ui/public.
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = fileURLToPath(
  new URL('../ui/public/', import.meta.url),
);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

// Returns false when there is no such file, so the caller can
// answer 404.
export function serveStatic(
  urlPath: string,
  res: ServerResponse,
): boolean {
  const relative =
    urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const file = normalize(join(PUBLIC_DIR, relative));
  // Refuse paths that climb out of the public folder
  // ("/../db/database.ts").
  if (
    !file.startsWith(PUBLIC_DIR) ||
    !existsSync(file) ||
    !statSync(file).isFile()
  )
    return false;
  res.writeHead(200, {
    'content-type':
      TYPES[extname(file)] ?? 'application/octet-stream',
  });
  res.end(readFileSync(file));
  return true;
}
