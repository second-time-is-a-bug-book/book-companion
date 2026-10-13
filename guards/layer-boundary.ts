// guards/layer-boundary.ts
// Keeps Invoicer's layers apart: domain is pure, ui only
// formats what it is given.
// Card P13 (Chapter 5). Placement: edit and commit.
// Kind: sensor, computational.
// Retire when: the layers live in separate packages whose
// dependencies make a forbidden import impossible to write.
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { listFiles } from './lib/files.ts';
import { isMain, report } from './lib/log.ts';

const SRC = 'app/src';

// layer -> layers it may NOT import. http may import anything:
// it wires the app together.
const FORBIDDEN: Record<string, string[]> = {
  domain: ['db', 'http', 'ui', 'jobs'],
  db: ['http', 'ui', 'jobs'],
  ui: ['db', 'http', 'jobs'],
  jobs: ['http', 'ui'],
};

// What to do instead, per layer, written for whoever fixes it.
const ADVICE: Record<string, string> = {
  domain:
    'keep domain functions pure: take data as arguments and ' +
    'return results; let db or http do the I/O.',
  db:
    'db stores and loads data only; move the logic to domain ' +
    'or http.',
  ui:
    'ui formats data it is given. Load the data in the http ' +
    'layer and pass it in, as app/src/http/invoice-routes.ts ' +
    'does for renderInvoiceList().',
  jobs: 'jobs may use domain and db; the rest belongs in http.',
};

// "... from './x.ts'" (also the last line of a multi-line
// import) and "import './x.ts'".
const IMPORT = /(?:\bfrom|^\s*import)\s+['"](\.[^'"]+)['"]/;

function layerOf(path: string): string {
  return relative(SRC, path).split('/')[0];
}

export function findViolations(
  file: string,
  source: string,
): string[] {
  const from = layerOf(file);
  const problems: string[] = [];
  source.split('\n').forEach((line, i) => {
    const target = IMPORT.exec(line)?.[1];
    if (!target) return;
    const to = layerOf(join(dirname(file), target));
    if (FORBIDDEN[from]?.includes(to)) {
      const where = `${file}:${i + 1} imports ${target}`;
      problems.push(
        `${where}: the ${from} layer may not import ${to}.\n` +
          `Fix: ${ADVICE[from]}`,
      );
    }
  });
  return problems;
}

if (isMain(import.meta.url)) {
  const files = listFiles(SRC, ['.ts']);
  const problems = files.flatMap((file) =>
    findViolations(file, readFileSync(file, 'utf8')),
  );
  const rules = Object.keys(FORBIDDEN).join(', ');
  const ok = `${files.length} files, rules: ${rules}`;
  report('layer-boundary', problems, ok);
}
