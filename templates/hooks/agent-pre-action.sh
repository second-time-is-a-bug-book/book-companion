#!/bin/sh
# Generic pre-action hook for a coding agent: the agent runs
# this before each tool call, with the call as JSON on stdin.
# Exit 0 lets the call run; exit 2 blocks it, and the message
# on stderr is shown to the agent.
# Most agents that support hooks follow this shape; check your
# agent's docs for the exact JSON it sends and the exit codes it
# honours, then adapt.
# Runs from the repository root, wherever the agent is: this
# file sits two folders down (templates/hooks/ here, or
# .claude/hooks/ in your repository).
cd "$(dirname "$0")/../.." || exit 2
exec node guards/destructive-command.ts
