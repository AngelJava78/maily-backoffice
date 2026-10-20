import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Test files and their support code. */
const TEST_FILES = ['**/*.test.{ts,tsx}', 'src/test/**'];
const SOURCE_FILES = ['src/**/*.{ts,tsx}'];
const NODE_FILES = [
  'scripts/**',
  'e2e/**',
  'vite.config.ts',
  'playwright.config.ts',
  'eslint.config.js',
];

/** Browser globals that only specific modules may use (constitution IV and V). */
const RESTRICTED_GLOBALS = {
  localStorage:
    'Nothing is persisted in localStorage: tokens live in memory only (constitution V).',
  sessionStorage:
    'Only src/features/auth/session/returnPathStorage.ts may use sessionStorage (constitution V).',
  fetch: 'Use the shared HTTP client in src/shared/api/httpClient.ts instead (constitution IV).',
};

/** Keeps a feature from importing `features/auth`, which reads that feature (except in its tests). */
function forbidAuthImports(feature, reference) {
  return {
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/features/auth',
                '@/features/auth/*',
                '**/features/auth',
                '**/features/auth/*',
              ],
              message: `features/${feature} must not import features/auth: the application hands it what it needs (${reference}).`,
            },
          ],
        },
      ],
    },
  };
}

/** Rules that forbid the given globals, also when reached through `window`, `globalThis` or `self`. */
function restrictGlobals(names) {
  return {
    'no-restricted-globals': [
      'error',
      ...names.map((name) => ({ name, message: RESTRICTED_GLOBALS[name] })),
    ],
    'no-restricted-properties': [
      'error',
      ...names.flatMap((name) =>
        ['window', 'globalThis', 'self'].map((object) => ({
          object,
          property: name,
          message: RESTRICTED_GLOBALS[name],
        })),
      ),
    ],
  };
}

const CLASS_COMPONENT_MESSAGE =
  'Class components are forbidden; write function components (constitution I). The only exception is src/shared/ui/ErrorBoundary.tsx.';

export default defineConfig(
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'blob-report',
    'specs',
    '.specify',
    '.claude',
  ]),

  { files: ['**/*.{js,mjs,cjs,ts,tsx}'], extends: [js.configs.recommended] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
      // No exceptions, tests included (constitution II); `as const` is always allowed.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  { files: ['src/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  { files: NODE_FILES, languageOptions: { globals: globals.node } },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: globals.node } },

  {
    files: SOURCE_FILES,
    extends: [reactHooks.configs.flat.recommended],
  },
  { files: ['src/**/*.tsx'], extends: [jsxA11y.flatConfigs.recommended] },

  // Logging goes through the logger (constitution V).
  { files: ['**/*.{ts,tsx}'], rules: { 'no-console': 'error' } },
  { files: ['src/shared/lib/logger.ts', 'scripts/**'], rules: { 'no-console': 'off' } },

  // Browser storage and network access are confined to a single module each.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'src/shared/api/httpClient.ts',
      'src/features/auth/session/returnPathStorage.ts',
      ...TEST_FILES,
      'e2e/**',
    ],
    rules: restrictGlobals(['localStorage', 'sessionStorage', 'fetch']),
  },
  {
    files: ['src/shared/api/httpClient.ts'],
    rules: restrictGlobals(['localStorage', 'sessionStorage']),
  },
  {
    files: ['src/features/auth/session/returnPathStorage.ts'],
    rules: restrictGlobals(['localStorage', 'fetch']),
  },
  { files: [...TEST_FILES, 'e2e/**'], rules: restrictGlobals(['localStorage']) },

  // No raw HTML injection and no class components (constitution I and V).
  {
    files: SOURCE_FILES,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is forbidden (constitution V).',
        },
        {
          selector:
            ':matches(ClassDeclaration, ClassExpression)[superClass.name=/^(Component|PureComponent)$/]',
          message: CLASS_COMPONENT_MESSAGE,
        },
        {
          selector:
            ':matches(ClassDeclaration, ClassExpression)[superClass.property.name=/^(Component|PureComponent)$/]',
          message: CLASS_COMPONENT_MESSAGE,
        },
      ],
    },
  },
  { files: ['src/shared/ui/ErrorBoundary.tsx'], rules: { 'no-restricted-syntax': 'off' } },

  // Keep components small (constitution I).
  {
    files: ['src/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: { 'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }] },
  },

  // Architecture: app -> features -> shared; features talk to each other only through index.ts.
  {
    files: SOURCE_FILES,
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'shared', pattern: 'src/shared' },
      ],
      'boundaries/files': [{ category: 'public-api', pattern: 'src/features/*/index.ts' }],
      'boundaries/ignore': ['**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
        './scripts/eslint-alias-resolver.cjs': {},
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: ['app', 'shared'] } } },
            },
            {
              from: { element: { type: ['app', 'feature'] } },
              allow: { to: { element: { type: 'feature' }, file: { categories: 'public-api' } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
          ],
        },
      ],
    },
  },

  // `auth` reads `users` (the operator is a user of the platform), so `users` must never read
  // `auth` back: each would need the other to be loaded first, and the schemas that `auth` builds
  // from `users` at load time would fail in an order that depends on the import graph. What `users`
  // needs of the operator is handed to it by the application (research D2 of feature 002).
  forbidAuthImports('users', 'research D2 of 002'),
  // The same for `subscriptions`: `auth` reads the type of its capabilities, and the capabilities
  // reach the screens from the application (research D2 of feature 003).
  forbidAuthImports('subscriptions', 'research D2 of 003'),
  // And for `dashboard`: the home page decides with the permissions whether to show the summary,
  // and the summary gets the refresh interval through its props (research D1 of feature 007).
  forbidAuthImports('dashboard', 'research D1 of 007'),
);
