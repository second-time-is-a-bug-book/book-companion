# Toy agent

A coding agent's runtime loop in miniature, for Chapter 1. No API key: the
"model" replays a script of turns from a JSON file.

| File | What it is |
|---|---|
| `loop.ts` | The loop: ask the model, run the tool, return the observation, stop when it says done |
| `scripted-model.ts` | The fake model that replays `scripts/*.json` |
| `tools.ts` | `read_file`, `write_file` and `run_tests`, working in a temp copy of `workspace/` |
| `unattended.ts` | The same loop with exits: iteration, cost and time budgets, and stop on red (drill D24) |
| `workspace/` | The task: a late-fee function with an off-by-one bug, and its tests |
| `scripts/` | `honest.json`, `liar.json` (D01), `goes-red.json` and `runaway.json` (D24) |

Try it:

    node toy-agent/loop.ts toy-agent/scripts/honest.json
    node toy-agent/loop.ts toy-agent/scripts/liar.json
    node toy-agent/unattended.ts toy-agent/scripts/runaway.json

Each run works in a fresh copy of `workspace/` in your temp folder, so the
repository's own `workspace/` is never modified. `loop.ts` prints the copy's
path, so you can look at what the "agent" changed.
