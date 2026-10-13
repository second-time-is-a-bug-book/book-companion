// Finds the shell command in a coding agent's pre-action hook
// payload. Each agent sends its own JSON shape (Appendix C of
// the book has a dated summary):
//   {tool, input: {command}}
//     this repository's drills (drills/D17-*/calls/)
//   {tool_name, tool_input: {command}}
//     Claude Code, Codex, Cursor preToolUse,
//     Gemini CLI run_shell_command
//   {command}
//     Cursor beforeShellExecution
//   {toolName, toolArgs}
//     GitHub Copilot; toolArgs is a JSON string with {command}
// If your agent sends something else, add its shape here and a
// case to guards/test/destructive-command.test.ts.

export type HookCall =
  | { kind: 'command'; command: string }
  // A tool that is not a shell, and carries no command:
  | { kind: 'other-tool'; tool: string }
  | { kind: 'unknown' };

const SHELL_TOOLS =
  /^(?:bash|shell|powershell|run_shell_command)$/i;

function parseArgs(args: unknown): unknown {
  if (typeof args !== 'string') return args;
  try {
    return JSON.parse(args);
  } catch {
    return undefined;
  }
}

export function readHookCall(text: string): HookCall {
  let call;
  try {
    call = JSON.parse(text);
  } catch {
    return { kind: 'unknown' };
  }
  if (typeof call !== 'object' || call === null) {
    return { kind: 'unknown' };
  }
  const places: ({ command?: unknown } | undefined)[] = [
    call.input,
    call.tool_input,
    call,
    parseArgs(call.toolArgs),
  ];
  const command = places
    .map((args) => args?.command)
    .find((c) => typeof c === 'string');
  if (typeof command === 'string') {
    return { kind: 'command', command };
  }
  // A named tool without a command (an edit, a file read) is
  // not this guard's business, unless the name says shell: then
  // the command is somewhere we do not know, so fail closed.
  const tool = [call.tool, call.tool_name, call.toolName].find(
    (name) => typeof name === 'string',
  );
  return tool && !SHELL_TOOLS.test(tool)
    ? { kind: 'other-tool', tool }
    : { kind: 'unknown' };
}
