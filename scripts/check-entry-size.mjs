// Bundle guards (constitution, "Rendimiento y observabilidad"; research D16 of 001, D2 and D15 of 002).
// 1. Sums the gzip size of the entry-route JS referenced by `dist/index.html` (the module <script>
//    tags and the <link rel="modulepreload"> tags) and fails above 320 KB (constitution 1.7.0).
// 2. Fails when that entry-route JS contains the Data Grid, which must stay in a lazy chunk even
//    when the size would still fit the budget. The Data Grid is recognised by DOM attributes it needs
//    as literals; `MuiDataGrid` cannot be used (the theme of the entry carries that key for the
//    Spanish locale) and neither can `MuiDataGrid-` (its class names are built at run time).
// 3. Fails when the build has the Data Grid in a lazy chunk but none of the markers appears there,
//    which means a new version of the Data Grid changed them and guard 2 no longer protects.
// 4. Fails when that entry-route JS contains the token tool of feature 005: its screen must stay in
//    a lazy chunk that is only asked for once the permission guard lets the person in (constitution
//    V, "Herramienta temporal"). The tool is recognised by the name of its error class, which
//    `tokenFailure.ts` assigns as a literal so that minifying cannot rename it.
// 5. Fails when the build has lazy chunks but none of them contains that marker, which means it was
//    renamed and guard 4 no longer protects.
// 6. Fails when that entry-route JS contains the API layer of «Salud de servicios» (feature 016,
//    research D20): the pages, the registry and the section of the access-check failure screen are
//    lazy. It is recognised by paths that only that layer has as literals.
// 7. Fails when the build has lazy chunks but none of them contains those paths, which means they
//    changed and guard 6 no longer protects.
// No dependencies.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 320 * 1024;
const DATA_GRID_MARKERS = ['data-rowindex', 'data-colindex'];
const TOKEN_TOOL_MARKERS = ['TokenRequestError'];
const HEALTH_MARKERS = ['/api/v1/monitored-components', '/health/status'];
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
  console.error('The entry-route JavaScript exceeds the 320 KB gzip budget.');
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
  for (const marker of TOKEN_TOOL_MARKERS) {
    if (row.content.includes(marker)) {
      console.error(
        `${row.file} (entry route) contains "${marker}": the token tool must be loaded lazily.`,
      );
      failed = true;
    }
  }
  for (const marker of HEALTH_MARKERS) {
    if (row.content.includes(marker)) {
      console.error(
        `${row.file} (entry route) contains "${marker}": the API layer of «Salud de servicios» ` +
          'must be loaded lazily (research D20 of 016).',
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

const tokenToolInLazyChunks = lazyChunks.some((content) =>
  TOKEN_TOOL_MARKERS.some((marker) => content.includes(marker)),
);
if (lazyChunks.length > 0 && !tokenToolInLazyChunks) {
  console.error(
    `The build has lazy chunks but none of them contains ${TOKEN_TOOL_MARKERS.join(', ')}: ` +
      'review TOKEN_TOOL_MARKERS in scripts/check-entry-size.mjs (research D15 of 005).',
  );
  failed = true;
}

const healthInLazyChunks = HEALTH_MARKERS.every((marker) =>
  lazyChunks.some((content) => content.includes(marker)),
);
if (lazyChunks.length > 0 && !healthInLazyChunks) {
  console.error(
    `The build has lazy chunks but not all of ${HEALTH_MARKERS.join(', ')} appear in them: ` +
      'review HEALTH_MARKERS in scripts/check-entry-size.mjs (research D20 of 016).',
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}
