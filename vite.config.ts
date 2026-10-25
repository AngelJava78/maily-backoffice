import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The identification of the build of «Salud de servicios» (feature 016, FR-044, FR-045): the
  // version of package.json, its only source, and the commit and the date the build is given.
  // A missing one is an empty text, which the application shows as «No disponible»: it never keeps
  // the application from being built or from starting.
  const packageJson: unknown = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
  );
  const appVersion =
    typeof packageJson === 'object' &&
    packageJson !== null &&
    'version' in packageJson &&
    typeof packageJson.version === 'string'
      ? packageJson.version
      : '';
  const usersApiProxyTarget = env.USERS_API_PROXY_TARGET ?? 'http://127.0.0.1:8000';
  // The port the subscriptions API documents (its README reserves 8001 for its clinics stub).
  const subscriptionsApiProxyTarget = env.SUBSCRIPTIONS_API_PROXY_TARGET ?? 'http://127.0.0.1:8010';
  // Optional (feature 016, research D19): the direct check can reach mailySoft-pacientes through
  // this origin, without its CORS, only when the target is given.
  const patientsApiProxyTarget = env.PATIENTS_API_PROXY_TARGET;

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_COMMIT_SHA__: JSON.stringify(env.APP_COMMIT_SHA ?? ''),
      __APP_BUILD_DATE__: JSON.stringify(env.APP_BUILD_DATE ?? ''),
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // Fixed port: the URLs registered in Auth0 depend on it.
      port: 5173,
      strictPort: true,
      proxy: {
        // The users service only enables CORS when configured: in development the proxy avoids it.
        '/proxy/users': {
          target: usersApiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/users/, ''),
        },
        // The subscriptions API only enables CORS for the sites of its CORS_ALLOWED_ORIGINS, which is
        // empty by default: in development the proxy avoids it too (research D13 of 003).
        '/proxy/subscriptions': {
          target: subscriptionsApiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/subscriptions/, ''),
        },
        ...(patientsApiProxyTarget === undefined || patientsApiProxyTarget === ''
          ? {}
          : {
              '/proxy/patients': {
                target: patientsApiProxyTarget,
                changeOrigin: true,
                rewrite: (path: string) => path.replace(/^\/proxy\/patients/, ''),
              },
            }),
      },
    },
    test: {
      environment: 'jsdom',
      environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
      setupFiles: ['./src/test/setup.ts'],
      // Dates are shown in the zone of the browser, so the tests pin one: they pass the same on a
      // developer machine and in CI.
      env: { TZ: 'UTC' },
      // Each worker holds a jsdom with MUI (and the Data Grid) in memory: with one per processor a
      // laptop with 8 GB runs out of memory and the workers crash (exit code 134, `spawn UNKNOWN`).
      maxWorkers: 4,
      // The tests of screens with dialogs and selectors take a few seconds when several workers (or
      // the coverage instrumentation) compete for the processor; a real hang still fails.
      testTimeout: 15_000,
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: [
          'src/features/*/api/**',
          'src/features/*/policy/**',
          'src/features/*/schemas/**',
          'src/features/*/hooks/**',
          'src/shared/api/**',
          'src/shared/lib/**',
        ],
        exclude: ['**/*.test.{ts,tsx}', '**/index.ts'],
        thresholds: { lines: 80 },
      },
    },
  };
});
