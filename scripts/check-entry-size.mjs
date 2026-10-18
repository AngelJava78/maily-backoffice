// Bundle guards (constitution, "Rendimiento y observabilidad"; research D16 of 001, D2 and D15 of 002).
// 1. Sums the gzip size of the entry-route JS referenced by `dist/index.html` (the module <script>
//    tags and the <link rel="modulepreload"> tags) and fails above 300 KB.
// 2. Fails when that entry-route JS contains the Data Grid, which must stay in a lazy chunk even
//    when the size would still fit the budget. The Data Grid is recognised by DOM attributes it needs
//    as literals; `MuiDataGrid` cannot be used (the theme of the entry carries that key for the
//    Spanish locale) and neither can `MuiDataGrid-` (its class names are built at run time).
// 3. Fails when the build has the Data Grid in a lazy chunk but none of the markers appears there,
//    which means a new version of the Data Grid changed them and guard 2 no longer protects.
// No dependencies.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 300 * 1024;
const DATA_GRID_MARKERS = ['data-rowindex', 'data-colindex'];
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
  const path = join(distDir, reference.replace(/^\//, ''));
  const content = readFileSync(path, 'utf8');
  return { file: reference, path, content, gzipBytes: gzipSync(content).length };
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

let failed = false;

if (totalBytes > BUDGET_BYTES) {
  console.error('The entry-route JavaScript exceeds the 300 KB gzip budget.');
  failed = true;
}

for (const row of rows) {
  for (const marker of DATA_GRID_MARKERS) {
    if (row.content.includes(marker)) {
      console.error(
        `${row.file} (entry route) contains "${marker}": the Data Grid must be loaded lazily.`,
      );
      failed = true;
    }
  }
}

const assetsDir = join(distDir, 'assets');
const entryPaths = new Set(rows.map((row) => row.path));
const lazyChunks = existsSync(assetsDir)
  ? readdirSync(assetsDir)
      .filter((name) => name.endsWith('.js'))
      .map((name) => join(assetsDir, name))
      .filter((path) => !entryPaths.has(path))
      .map((path) => readFileSync(path, 'utf8'))
  : [];
const buildHasDataGrid = lazyChunks.some((content) => content.split('MuiDataGrid').length - 1 > 1);
const markersInLazyChunks = lazyChunks.some((content) =>
  DATA_GRID_MARKERS.some((marker) => content.includes(marker)),
);
if (buildHasDataGrid && !markersInLazyChunks) {
  console.error(
    `The build has the Data Grid but none of ${DATA_GRID_MARKERS.join(', ')} appears in it: ` +
      'review DATA_GRID_MARKERS in scripts/check-entry-size.mjs (research D15 of 002).',
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}
