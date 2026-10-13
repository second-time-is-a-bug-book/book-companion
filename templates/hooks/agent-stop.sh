#!/bin/sh
# Generic end-of-turn hook: the agent runs this when it is about
# to stop, with the hook input as JSON on stdin. If done-check
# fails, exit 2 sends the agent back to work with the reason on
# stderr.
# Two ways out, so the hook neither loops nor traps an agent
# that should stop:
# - stop_hook_active is true when this hook already sent the
#   agent back once. Then a failing check exits 1: the agent may
#   stop, and you see the failure.
# - An agent that must stop before it is done (to ask a human,
#   or to hand off) writes why in .harness/stop-note.md. The
#   hook lets that stop through once and moves the note to
#   .harness/stop-note.last.md for you to read. It is a bypass,
#   but a written one: the stop comes with a reason, not a
#   claim of done.
# Field name and exit codes follow Claude Code; check your
# agent's docs and adapt.
cd "$(dirname "$0")/../.." || exit 1
input=$(cat)
node guards/done-check.ts 1>&2 && exit 0
if [ -s .harness/stop-note.md ]; then
  mv .harness/stop-note.md .harness/stop-note.last.md
  cat >&2 <<'MSG'
agent-stop: stopping without passing done-check; the agent's
  reason is in .harness/stop-note.last.md
MSG
  exit 0
fi
case "$input" in
  *'"stop_hook_active":true'*) exit 1 ;;
  *'"stop_hook_active": true'*) exit 1 ;;
esac
cat >&2 <<'MSG'
If you must stop before the check passes (to ask a human or
  hand off), write why in .harness/stop-note.md, then stop.
MSG
exit 2
