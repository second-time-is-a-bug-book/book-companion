// Small file helpers shared by the guards.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// All files under dir (recursively) with one of the given
// extensions, as forward-slash paths relative to the repository
// root, sorted.
export function listFiles(
  dir: string,
  extensions: string[],
): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((file) => join(dir, file).replaceAll('\\', '/'))
    .filter((file) => !file.includes('node_modules/'))
    .filter((file) =>
      extensions.some((ext) => file.endsWith(ext)),
    )
    .sort();
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

// Comment lines are explanations, not code; most scanners skip
// them.
export function isComment(line: string): boolean {
  return /^\s*(\/\/|\/\*|\*|--|#)/.test(line);
}
