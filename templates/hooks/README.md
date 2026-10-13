# Hooks

The guards are plain scripts: they read files or stdin, print a
message and set an exit code. That makes them easy to call from
anywhere.

- `pre-commit`: git runs it before each commit. It calls
  `node guards/gate.ts`.
- `agent-pre-action.sh`: your coding agent runs it before each
  shell call. It calls `node guards/destructive-command.ts`.
- `agent-stop.sh`: your coding agent runs it when it is about to
  stop. It calls `node guards/done-check.ts`.
- `agent-pre-action.example.json`: your coding agent's settings,
  wiring up both scripts above.

## Git pre-commit

    cp templates/hooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit

## Coding agent hooks

Most coding agents can run a command before a tool call and
block the call when the command exits with a particular code.
The guards use the common convention: exit 0 to allow, exit 2 to
block, reason on stderr. The pre-action guard writes nothing to
stdout, because some agents read a hook's stdout as JSON and
reject anything else.

`destructive-command.ts` reads the call as JSON on stdin and
finds the command in the shapes today's agents send (listed in
`guards/lib/hook-payload.ts`). If it finds no command, it blocks
the call and says the payload shape is unknown: a check that
cannot see the command fails closed. A call to a tool that is
not a shell (an edit, a file read) is allowed. Prove your wiring
with the calls in `drills/D17-destructive-command/calls/`,
reshaped the way your agent sends them.

These details in the example settings matter whichever agent you
use:

- **Anchor the matcher.** `^Bash$` matches the shell tool and
  nothing else. Some agents treat the matcher as an unanchored
  pattern, and some send file patches with the patch text where
  the command goes, so a loose matcher would block a migration
  that legitimately contains `DROP TABLE`. In Claude Code on
  Windows, where there is also a PowerShell tool, match
  `Bash|PowerShell` (and add rules for PowerShell's own
  destructive commands).
- **Block when the hook itself fails.** Many agents treat a hook
  that crashes or times out as "allow". The example sets
  `"onFailure": "block"` (Claude Code 2.1.295 or later);
  Cursor's equivalent is `"failClosed": true`. The guards also
  never let a failed log write change their exit code.
- **Run from the repository root.** Hooks may run in a
  subdirectory. The example uses `$CLAUDE_PROJECT_DIR`; other
  agents have their own variable or a `cwd` setting, and the two
  scripts here also change to the root themselves.
- **Do not loop at the end of a turn.** `agent-stop.sh` blocks
  the first stop that fails `done-check.ts`. When the input says
  `stop_hook_active` (this hook already sent the agent back
  once), a failure exits 1 instead: the agent may stop, and you
  see the failure.
- **Leave a way to stop and ask.** A hook that blocks every stop
  without test evidence also blocks the agent that rightly stops
  to ask a human or hand off. So `agent-stop.sh` lets one stop
  through when the agent has written its reason in
  `.harness/stop-note.md`, and moves the note to
  `.harness/stop-note.last.md` for you. That is a bypass, and an
  agent could misuse it; the trade is that a stop without
  evidence now comes with a written reason instead of a claim of
  done.

`agent-pre-action.example.json` is an example to adapt, written
in Claude Code's format because a real shape is easier to adapt
than an invented one. Formats differ between agents and change
over time; check your agent's documentation. Appendix C of the
book has a dated summary for five agents.

## In CI

`.github/workflows/gate.yml` runs the same gate in CI, where an
agent cannot skip it, against the branch's base so it sees the
whole branch rather than uncommitted work, plus the browser
tests and two mutation runs. The command at its core:

    GUARD_BASE=origin/main node guards/gate.ts --all
