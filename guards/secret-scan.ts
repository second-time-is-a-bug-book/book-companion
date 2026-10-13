// guards/secret-scan.ts
// Looks for credentials in the lines this change adds.
// Card P22 (Chapter 8). Placement: edit and commit (again in
// CI). Kind: sensor, computational.
// Retire when: never while agents can write files; replace it
// with a dedicated scanner if you outgrow these patterns.
import { addedLines, skipUnlessGit } from './lib/git.ts';
import type { AddedLine } from './lib/git.ts';
import { isMain, report } from './lib/log.ts';

// A name like apiKey, SECRET or db_password, then = or :, then
// a quoted value of 12 or more characters with no spaces.
const NAME = /\b\w*(?:api_?key|secret|token|password)\w*/;
const VALUE = /\s*[:=]\s*['"][^'"\s]{12,}['"]/;

const PATTERNS = [
  {
    name: 'private key block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    name: 'cloud access key id',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'live API key',
    pattern: /\b[a-z]{2,8}_live_[A-Za-z0-9]{12,}\b/,
  },
  {
    name: 'hard-coded secret',
    pattern: new RegExp(NAME.source + VALUE.source, 'i'),
  },
];

const FIX =
  'Fix: delete it from the code and read it from the ' +
  'environment instead (process.env.NAME). Treat the secret ' +
  'as leaked even if it was never committed: tell a human so ' +
  'it can be rotated.';

// Shows enough of each quoted value to find it, never the
// whole secret.
function redact(text: string): string {
  return text.replace(/(['"])([^'"]{6})[^'"]+\1/g, '$1$2...$1');
}

export function findSecrets(lines: AddedLine[]): string[] {
  const problems: string[] = [];
  for (const { path, line, text } of lines) {
    // Drill patches plant fake secrets on purpose.
    if (path.endsWith('.patch')) continue;
    const hit = PATTERNS.find((p) => p.pattern.test(text));
    if (!hit) continue;
    const what = `${path}:${line}: looks like a ${hit.name}.`;
    const quote = `  ${redact(text.trim())}`;
    problems.push(`${what}\n${quote}\n${FIX}`);
  }
  return problems;
}

const main = isMain(import.meta.url);
if (main && !skipUnlessGit('secret-scan')) {
  const lines = addedLines();
  const ok = `${lines.length} added lines scanned`;
  report('secret-scan', findSecrets(lines), ok);
}
