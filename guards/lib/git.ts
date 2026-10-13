// What changed? Diff-based guards compare the working tree with
// a base: HEAD by default (your uncommitted work, as a
// pre-commit hook sees it), or the commit named in GUARD_BASE
// (in CI, for example GUARD_BASE=origin/main). New, untracked
// files count as changes: they are the most common agent
// change.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const BASE = process.env.GUARD_BASE ?? 'HEAD';

function git(...args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function lines(text: string): string[] {
  return text.split('\n').filter((line) => line !== '');
}

// Counts lines the way git does: a final newline ends a line,
// it does not start one.
function countLines(text: string): number {
  return text === ''
    ? 0
    : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

export function inGitRepo(): boolean {
  try {
    git('rev-parse', '--verify', '--quiet', BASE);
    return true;
  } catch {
    return false;
  }
}

function untracked(): string[] {
  return lines(
    git('ls-files', '--others', '--exclude-standard'),
  );
}

export function changedFiles(): string[] {
  return [
    ...lines(git('diff', '--name-only', BASE)),
    ...untracked(),
  ].sort();
}

export interface FileStat {
  path: string;
  added: number;
  removed: number;
}

export function diffStats(): FileStat[] {
  const rows = lines(git('diff', '--numstat', BASE));
  const tracked = rows.map((row) => {
    const [added, removed, path] = row.split('\t');
    // Binary files show "-" instead of counts.
    return {
      path,
      added: Number(added) || 0,
      removed: Number(removed) || 0,
    };
  });
  const created = untracked().map((path) => ({
    path,
    added: countLines(readFileSync(path, 'utf8')),
    removed: 0,
  }));
  return [...tracked, ...created];
}

export interface AddedLine {
  path: string;
  line: number;
  text: string;
}

// Every line this change adds, with its file and line number.
export function addedLines(): AddedLine[] {
  const added: AddedLine[] = [];
  let path = '';
  let lineNo = 0;
  const diff = git('diff', '--unified=0', '--no-color', BASE);
  for (const row of diff.split('\n')) {
    if (row.startsWith('+++ ')) {
      path = row.slice('+++ b/'.length);
    } else if (row.startsWith('@@')) {
      lineNo = Number(/\+(\d+)/.exec(row)?.[1] ?? 0);
    } else if (row.startsWith('+')) {
      added.push({ path, line: lineNo++, text: row.slice(1) });
    }
  }
  for (const file of untracked()) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, i) =>
        added.push({ path: file, line: i + 1, text }),
      );
  }
  return added;
}

// Diff-based guards call this first. Outside a git repository
// there is nothing to compare against, so they say so and pass
// instead of guessing.
export function skipUnlessGit(guard: string): boolean {
  if (inGitRepo()) return false;
  console.log(
    `${guard}: skipped (no git base "${BASE}" to diff against)`,
  );
  return true;
}
