// guards/destructive-command.ts
// A pre-action hook. Reads the agent's proposed tool call as
// JSON on stdin; exit 2 blocks commands that cannot be undone
// (the reason goes to stderr for the agent), exit 0 lets the
// call run. A payload with no command it can find is blocked
// too: a check that cannot see fails closed.
// Card P21 (Chapter 8). Placement: edit (before the action
// runs). Kind: guide and sensor, computational.
// Retire when: the agent runs in a sandbox where these commands
// cannot reach anything that matters.
import { readFileSync } from 'node:fs';
import { readHookCall } from './lib/hook-payload.ts';
import { isMain, logFire } from './lib/log.ts';
import { wrap } from './lib/wrap.ts';

// The rest of one command: stops at ; & | or a newline, so a
// flag from the next command in a chain does not count.
const ARGS = /[^;&|\n]*/.source;
// rm with a recursive and a force flag, in any order and form:
// -rf, -fr, -r -f, --recursive --force.
const RECURSIVE = /\s(?:-[a-z]*r|--recursive\b)/.source;
const FORCE = /\s(?:-[a-z]*f|--force\b)/.source;
const RM_RF = new RegExp(
  String.raw`\brm\b(?=${ARGS}${RECURSIVE})(?=${ARGS}${FORCE})`,
  'i',
);
// A force push is --force, -f or a +refspec (git push origin
// +main); --force-with-lease is allowed.
const PUSH_FORCE = /\s--force(?![-\w])|\s-f\b|\s\+\S/.source;
const FORCE_PUSH = new RegExp(
  String.raw`\bgit\s+push\b${ARGS}(?:${PUSH_FORCE})`,
);
// Skipping the hooks skips the gate (Chapter 5). For git
// commit, -n is short for --no-verify.
const NO_VERIFY = new RegExp(
  String.raw`\bgit\s+(?:(?:commit|push)\b${ARGS}` +
    String.raw`\s--no-verify\b|commit\b${ARGS}\s-n\b)`,
);

// Each rule: its name, the pattern, and what to do instead.
const RULES = [
  { name: 'rm -rf',
    pattern: RM_RF,
    instead: 'move them to a trash folder, or ask the user' },
  { name: 'DROP TABLE',
    pattern: /\bdrop\s+(?:table|database|schema)\b/i,
    instead: 'write a migration with a down step and backup' },
  { name: 'TRUNCATE',
    pattern: /\btruncate\s+(?:table\s+)?\w+/i,
    instead: 'delete rows in a transaction you can roll back' },
  { name: 'DELETE without WHERE',
    pattern: /\bdelete\s+from\s+\w+\s*(?:;|$|["'])/i,
    instead: 'add a WHERE clause; check the row count first' },
  { name: 'git push --force',
    pattern: FORCE_PUSH,
    instead: 'push to a new branch and open a pull request' },
  { name: 'git reset --hard',
    pattern: /\bgit\s+reset\s+--hard\b/,
    instead: 'git stash, or commit to a temporary branch' },
  { name: 'git clean -f',
    pattern: /\bgit\s+clean\s+-[a-z]*f/i,
    instead: 'list what would go with git clean -n, and ask' },
  { name: 'git --no-verify',
    pattern: NO_VERIFY,
    instead: 'let the hooks run and fix what they report' },
];

export function findDestructive(command: string) {
  return RULES.find((rule) => rule.pattern.test(command));
}

// Everything goes to stderr: some agents read stdout as JSON
// and reject anything else.
const GUARD = 'destructive-command';
const tell = (text: string) => console.error(wrap(text));

if (isMain(import.meta.url)) {
  const call = readHookCall(readFileSync(0, 'utf8'));
  if (call.kind === 'unknown') {
    tell(
      `${GUARD}: BLOCKED (unknown hook payload shape)\n` +
        '  Found no shell command in the JSON on stdin, so ' +
        'this call cannot be checked.\n' +
        "  Fix: add your agent's payload shape to " +
        'guards/lib/hook-payload.ts, or limit the hook to ' +
        'shell calls with a matcher ' +
        '(templates/hooks/README.md).',
    );
    logFire(GUARD, 'blocked unknown hook payload shape');
    process.exit(2);
  }
  if (call.kind === 'other-tool') {
    tell(`${GUARD}: ok (not a shell call: ${call.tool})`);
    process.exit(0);
  }
  const { command } = call;
  const rule = findDestructive(command);
  if (rule) {
    tell(
      `${GUARD}: BLOCKED (${rule.name})\n` +
        `  Command: ${command}\n` +
        '  This cannot be undone, so agents may not run it.\n' +
        `  Instead: ${rule.instead}.\n` +
        '  If it really is needed, explain why and ask the ' +
        'user to run it themselves.',
    );
    logFire(GUARD, `blocked ${rule.name}: ${command}`);
    process.exit(2);
  }
  tell(`${GUARD}: ok (allowed: ${command})`);
}
