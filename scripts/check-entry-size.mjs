// Bundle budget (constitution, "Rendimiento y observabilidad"; research D16).
// Sums the gzip size of the entry-route JS referenced by `dist/index.html` (the module <script>
// tags and the <link rel="modulepreload"> tags) and fails above 300 KB. No dependencies.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 300 * 1024;
const distDir = 'dist';
const indexPath = join(distDir, 'index.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html does not exist: run `npm run build` before `npm run size`.');
  process.exit(1);
}

const html = readFileSync(indexPath, 'utf8');

/** Returns the value of an attribute of an HTML tag, or `undefined`. */
function attribute(tag, name) {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match?.[1];
}

const references = new Set();
for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
  const src = attribute(tag, 'src');
  if (attribute(tag, 'type') === 'module' && src) {
    references.add(src);
  }
}
for (const tag of html.match(/<link\b[^>]*>/g) ?? []) {
  const href = attribute(tag, 'href');
  if (attribute(tag, 'rel') === 'modulepreload' && href) {
    references.add(href);
  }
}

if (references.size === 0) {
  console.error('dist/index.html does not reference any entry JS module.');
  process.exit(1);
}

const rows = [...references].map((reference) => {
  const file = join(distDir, reference.replace(/^\//, ''));
  const gzipBytes = gzipSync(readFileSync(file)).length;
  return { file: reference, gzipBytes };
});
const totalBytes = rows.reduce((sum, row) => sum + row.gzipBytes, 0);

const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const width = Math.max(...rows.map((row) => row.file.length), 'Total'.length);
for (const row of rows) {
  console.log(`${row.file.padEnd(width)}  ${kilobytes(row.gzipBytes).padStart(10)}`);
}
console.log(
  `${'Total'.padEnd(width)}  ${kilobytes(totalBytes).padStart(10)}  (limit ${kilobytes(BUDGET_BYTES)})`,
);

if (totalBytes > BUDGET_BYTES) {
  console.error('The entry-route JavaScript exceeds the 300 KB gzip budget.');
  process.exit(1);
}
