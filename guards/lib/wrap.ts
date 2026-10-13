// Wraps output to 64 columns, the width of a printed page of
// the book and a comfortable width for a terminal pane next to
// an agent. A long line breaks at spaces; its continuation
// lines are indented two more spaces than the line itself (or
// to a column you choose), so a message keeps its shape: what
// failed, where, and what to do next.
// WRAP_WIDTH overrides it, for output that a caller indents
// further (drill D02 does).
export const WIDTH = Number(process.env.WRAP_WIDTH) || 64;

export function wrapLine(
  line: string,
  hang?: number,
  width = WIDTH,
): string[] {
  const own = line.length - line.trimStart().length;
  const indent = ' '.repeat(hang ?? own + 2);
  const lines: string[] = [];
  let rest = line.trimEnd();
  while (rest.length > width) {
    const start = rest.length - rest.trimStart().length;
    const space = rest.lastIndexOf(' ', width);
    // No space to break at: cut the word, rather than overflow.
    const cut = space > start ? space : width;
    lines.push(rest.slice(0, cut).trimEnd());
    rest = indent + rest.slice(cut).trimStart();
  }
  lines.push(rest);
  return lines;
}

export function wrap(text: string, width = WIDTH): string {
  return text
    .split('\n')
    .flatMap((line) => wrapLine(line, undefined, width))
    .join('\n');
}
