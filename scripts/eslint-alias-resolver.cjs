'use strict';

// Import resolver for eslint-plugin-boundaries (eslint-module-utils interface v2).
// It maps the `@/` alias declared in tsconfig `paths` to `src/`; every other specifier is left to
// the Node resolver, so aliased imports are classified as local files instead of external modules.
const fs = require('node:fs');
const path = require('node:path');

const ALIAS_PREFIX = '@/';
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function isFile(candidate) {
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function findFile(basePath) {
  const candidates = [
    basePath,
    ...EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];
  return candidates.find(isFile) ?? null;
}

exports.interfaceVersion = 2;

exports.resolve = (source, _file, config) => {
  if (!source.startsWith(ALIAS_PREFIX)) {
    return { found: false };
  }
  const root = config?.root ?? process.cwd();
  const resolved = findFile(path.join(root, 'src', source.slice(ALIAS_PREFIX.length)));
  return resolved ? { found: true, path: resolved } : { found: false };
};
