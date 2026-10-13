# Wiring guards into today's coding agents

Last checked 13 October 2026.

This is the maintained copy of Appendix C of *The Second Time Is a Bug*. The book prints the version tagged `v1.0.0`; this file, on the `main` branch, is revised as the tools change. Hook formats and permission rules move often, so check the vendor pages in the footnotes before you rely on a detail.

For each of five agents: the instruction file it reads, the hooks that block a risky action or check its work when it stops, how to keep it out of protected paths, and where its extensions live. Each section's footnote lists the vendor pages it was checked against; where they did not settle a point, the text says so.

The pre-action guard reads one tool call as JSON on stdin and exits 0 to allow or 2 to block, with the reason on stderr and nothing on stdout. It finds the command in each vendor's payload:

```ts
// guards/lib/hook-payload.ts
//   {tool, input: {command}}
//     this repository's drills (drills/D17-*/calls/)
//   {tool_name, tool_input: {command}}
//     Claude Code, Codex, Cursor preToolUse,
//     Gemini CLI run_shell_command
//   {command}
//     Cursor beforeShellExecution
//   {toolName, toolArgs}
//     GitHub Copilot; toolArgs is a JSON string with {command}
```

If the guard cannot find a command in the payload, it blocks the call, so a wrong wiring fails closed; prove yours with a vendor-shaped `rm -rf` call ([drill D17](../drills/D17-destructive-command/)). Failing closed makes the hook a reliable tripwire, not a security boundary: it judges only the commands it is shown. The sandbox and protected-path settings in each section below, and credentials that cannot reach production (Chapter 8 of the book), are the boundary.

One guard serves every agent; only the hook point, the payload shape and the way the agent reads a block differ. Cursor needs the `guard.sh` wrapper shown below to turn exit 2 into a JSON deny. When the agent stops, run [`templates/hooks/agent-stop.sh`](../templates/hooks/). The guards need Node 22.18 or later.

Invoicer's protected paths are the tests (`app/test/`, `app/e2e/`, `legacy/characterisation/`), `guards/`, `.harness/approved-deps.json` and `.harness/test-baseline.json`, and changes under `app/src/db/migrations/` need approval. Most mechanisms below stop the agent's edit tools, not a script it runs, so keep `no-skip.ts` and `test-ratchet.ts` in the gate and a human review on the approval files (Chapter 9 of the book). For your extension inventory: Codex, Cursor, Copilot and Gemini CLI all read `.agents/skills/`, and Cursor and Copilot also read `.claude/skills/`, so review a skill for every agent that can load it.

## Claude Code

**Instructions.** `CLAUDE.md` or `.claude/CLAUDE.md`. Since version 2.1.277 Claude Code reads `AGENTS.md` when there is no `CLAUDE.md`; when both exist it reads only `CLAUDE.md`, so start that file with `@AGENTS.md`.[^cc]

**Hooks.** `PreToolUse` matched on `Bash` sends `tool_input.command`; exit 2 blocks and shows stderr to Claude. Any other non-zero exit lets the call run unless the hook sets `"onFailure": "block"` (version 2.1.295 or later). On Windows, also match the PowerShell tool. On `Stop`, exit 2 keeps Claude working, up to eight blocks in a row; `agent-stop.sh` reads `stop_hook_active` and exits 1 after one failed stop, so you see the failure instead of a loop. `templates/hooks/agent-pre-action.example.json` wires both hooks.

**Protected paths.** `Edit(...)` deny rules in `.claude/settings.json` take gitignore patterns, anchored at the project by a leading `/`, and beat any allow rule; `Write(...)` path rules are never consulted. They cover Claude's file tools, the file commands it recognises in Bash, and redirects, but not a script that opens files itself unless the sandbox is on. An `ask` rule suits migrations, and the hook runs this repository's `templates/hooks/agent-pre-action.sh`, copied into `.claude/hooks/`:

```json
// simplified: .claude/settings.json, not in this repository
{
  "permissions": {
    "deny": ["Edit(/app/test/**)", "Edit(/app/e2e/**)",
      "Edit(/legacy/characterisation/**)", "Edit(/guards/**)",
      "Edit(/.harness/approved-deps.json)",
      "Edit(/.harness/test-baseline.json)"],
    "ask": ["Edit(/app/src/db/migrations/**)"]
  },
  "hooks": { "PreToolUse": [{ "matcher": "Bash", "hooks": [{
    "type": "command", "onFailure": "block", "command":
    "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/agent-pre-action.sh"
  }]}]}
}
```

**Extensions.** `.claude/skills/`, `.claude/agents/` and `.claude/rules/`, with twins under `~/.claude/`; MCP servers in `.mcp.json` and `~/.claude.json`. Plugins, which can add hooks and MCP servers, are enabled under `enabledPlugins` from marketplaces in `extraKnownMarketplaces`, install under `~/.claude/plugins`, and pin to a commit with `sha`.

## OpenAI Codex CLI

**Instructions.** `~/.codex/AGENTS.md`, then one `AGENTS.md` (or `AGENTS.override.md`) per directory from the project root down, up to 32 KiB (`project_doc_max_bytes`). In the `workspace-write` sandbox the network is off by default and `.git`, `.codex` and `.agents` are read-only.[^cx]

**Hooks.** On by default, in `.codex/hooks.json` or `.codex/config.toml`. Project hooks need a trusted `.codex/` layer, and each hook must be trusted in `/hooks`, again after any edit. `PreToolUse` sends `tool_input.command`; exit 2 blocks. Anchor the matcher as `^Bash$`: patches arrive as `apply_patch` with the patch text in that field, and the guard would block a migration containing `DROP TABLE`. `Stop` receives `stop_hook_active`, continues on exit 2 and accepts only JSON on stdout at exit 0 (`agent-stop.sh` prints none). Other exit codes are undocumented, so check that exit 1 lets Codex stop. The documentation calls hooks a guardrail, not a boundary: keep the sandbox on.

**Protected paths.** Permission profiles (in beta) set per-path access for sandboxed commands. The documented examples use single folder names, and the documentation does not say whether profiles bind Codex's own `apply_patch` edits, so also add a hook on `^apply_patch$` that rejects a patch naming a protected path.

```toml
# simplified: .codex/config.toml, not in this repository
default_permissions = "invoicer"
[permissions.invoicer]
extends = ":workspace"
[permissions.invoicer.filesystem.":workspace_roots"]
"guards" = "read"
"app/test" = "read"
```

**Extensions.** Skills in `.agents/skills/` from the working directory up to the repository root, in `~/.agents/skills/` and in `/etc/codex/skills`. MCP servers are `[mcp_servers.<name>]` tables in `~/.codex/config.toml` or a trusted project's `.codex/config.toml`, with `enabled_tools` and `disabled_tools`; `codex mcp list` prints them. Plugins come from marketplace files such as `.agents/plugins/marketplace.json`, install under `~/.codex/plugins/cache/`, and pin to a git `ref` or `sha`.

## Cursor

**Instructions.** `.mdc` rules in `.cursor/rules/`, applied according to their frontmatter, and `AGENTS.md` in the root and in subdirectories.[^cu]

**Hooks.** In `.cursor/hooks.json` (or `~/.cursor/hooks.json`) with `"version": 1`, run from the project root. `preToolUse` matched on `Shell` sends `tool_input.command`, and `beforeShellExecution` sends `command`. Exit 2 blocks; a crash or timeout allows unless the hook sets `"failClosed": true`. Stdout that is not valid JSON blocks, and empty output is not documented as an allow, so wrap the guard (needs `jq`):

```sh
#!/bin/sh
# simplified: .cursor/hooks/guard.sh, not in this repository
why=$(node guards/destructive-command.ts 2>&1 >/dev/null)
if [ $? -eq 2 ]; then
  jq -n --arg m "$why" '{permission: "deny", agent_message: $m}'
else
  echo '{"permission": "allow"}'
fi
```

A `stop` hook can return `followup_message`, sent as the next user message up to `loop_limit` times (5 by default).

**Protected paths.** `preToolUse` matched on `Write` (and `Delete`) can deny an edit; set `failClosed` on it. The documented `tool_input` shows only a shell command, so log one edit's payload to find the path field. The CLI also takes deny rules such as `Write(app/test/**)` in `.cursor/cli.json`.

**Extensions.** MCP servers in `.cursor/mcp.json` and `~/.cursor/mcp.json`. Skills in `.cursor/skills/` and `.agents/skills/`, their twins in your home folder, and `.claude/skills/` and `.codex/skills/`. Plugins bundle rules, skills, agents, commands, MCP servers and hooks, managed in the Customize view; no version pinning is documented, so record the commit you reviewed.

## GitHub Copilot cloud agent

**Instructions.** `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` files with an `applyTo` glob, and the nearest `AGENTS.md`, or one root `CLAUDE.md` or `GEMINI.md`. Install Node in `.github/workflows/copilot-setup-steps.yml`.[^gh]

**Hooks.** `.github/hooks/*.json` with `"version": 1`, on the default branch; each hook has `type`, `bash`, `powershell`, `cwd` and `timeoutSec` (30 seconds by default). A command `preToolUse` hook fails closed: any non-zero exit denies. `toolArgs` may hold the arguments as a JSON string, which the guard parses, so `"bash": "node guards/destructive-command.ts"` needs no adapter; whether stderr reaches the agent is not clear from the reference. `agentStop` can return `decision: "block"` for another turn, but timeouts fail open, so the dependable end check is the gate workflow as a required status check.

**Protected paths.** `preToolUse` can deny edits too (`edit`, `create`, `str_replace_editor`, `apply_patch`), but the reference does not show where the path sits in `toolArgs`; log one call first. The firmer lock is a push ruleset with "Restrict file paths", which rejects every push that changes the listed paths, the agent's and yours (GitHub Team plan, private and internal repositories).

**Extensions.** Skills in `.github/skills/`, `.claude/skills/` or `.agents/skills/`; custom agents in `.github/agents/`, whose frontmatter can add tools and MCP servers. Both are versioned with the repository, so review them in the pull request. Repository MCP servers are JSON in the repository's settings, outside the code and its history; the GitHub and Playwright servers are on by default, and allowlisted tools run without asking.

## Gemini CLI

Google's documentation notes that Antigravity CLI replaced Gemini CLI for unpaid and Google One users on 18 June 2026.[^gm]

**Instructions.** `~/.gemini/GEMINI.md`, then `GEMINI.md` files in the workspace and its parents; add `AGENTS.md` through `context.fileName`.

**Hooks.** On by default, under `hooks` in `.gemini/settings.json` or `~/.gemini/settings.json`, with timeouts in milliseconds. `BeforeTool` matched on `run_shell_command` sends `tool_input.command`; exit 2 blocks with stderr as the reason. Stdout may hold only the final JSON, and the guard writes none. `AfterAgent` receives `stop_hook_active`, and `decision: "deny"` with a `reason` sends the reason back as a prompt. The hooks' working directory is not documented, so test relative paths.

**Protected paths.** A policy rule can deny `write_file` and `replace` when its `argsPattern` matches the `file_path` argument, but workspace policies are currently non-functional, so the rule must live in `~/.gemini/policies/`. To keep the rule in the repository, use a `BeforeTool` hook on `write_file|replace` that reads `tool_input.file_path` and exits 2.

**Extensions.** Installed as copies under `~/.gemini/extensions/`, bundling MCP servers, commands, hooks, sub-agents and skills; `--ref` pins a branch, tag or commit, and `gemini extensions list` prints them. Skills live in `.gemini/skills/` or `.agents/skills/` and their twins in your home folder. MCP servers sit under `mcpServers` in either `settings.json`, where `trust: true` skips every confirmation.

[^cc]: Anthropic, Claude Code documentation, checked 13 October 2026: <https://code.claude.com/docs/en/memory>, <https://code.claude.com/docs/en/hooks>, <https://code.claude.com/docs/en/hooks-guide>, <https://code.claude.com/docs/en/permissions>, <https://code.claude.com/docs/en/claude-directory>, <https://code.claude.com/docs/en/settings> and <https://code.claude.com/docs/en/plugins/marketplace-reference>.

[^cx]: OpenAI, Codex documentation, checked 13 October 2026 (links under developers.openai.com/codex redirect to learn.chatgpt.com): <https://learn.chatgpt.com/docs/agent-configuration/agents-md>, <https://learn.chatgpt.com/docs/agent-approvals-security>, <https://learn.chatgpt.com/docs/hooks>, <https://learn.chatgpt.com/docs/permissions>, <https://learn.chatgpt.com/docs/build-skills>, <https://learn.chatgpt.com/docs/extend/mcp> and <https://developers.openai.com/codex/plugins/build>.

[^cu]: Cursor documentation, checked 13 October 2026: <https://cursor.com/docs/rules>, <https://cursor.com/docs/hooks>, <https://cursor.com/docs/cli/reference/permissions>, <https://cursor.com/docs/mcp>, <https://cursor.com/docs/skills> and <https://cursor.com/docs/plugins>.

[^gh]: GitHub Docs, checked 13 October 2026: <https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions>, <https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/customize-the-agent-environment>, <https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks>, <https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-hooks>, <https://docs.github.com/en/copilot/reference/hooks-reference> (parts could not be read in full), <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills>, <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents>, <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers> and <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets>.

[^gm]: Google, Gemini CLI documentation, checked 13 October 2026: <https://geminicli.com/docs/>, <https://geminicli.com/docs/cli/gemini-md/>, <https://geminicli.com/docs/reference/configuration/>, <https://geminicli.com/docs/tools/shell/>, <https://geminicli.com/docs/hooks/>, <https://geminicli.com/docs/hooks/reference/>, <https://geminicli.com/docs/reference/policy-engine/>, <https://geminicli.com/docs/tools/file-system/>, <https://geminicli.com/docs/extensions/>, <https://geminicli.com/docs/extensions/reference/>, <https://geminicli.com/docs/cli/skills/> and <https://geminicli.com/docs/tools/mcp-server/>.
