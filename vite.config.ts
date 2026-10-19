import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const usersApiProxyTarget = env.USERS_API_PROXY_TARGET ?? 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
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
      },
    },
    test: {
      environment: 'jsdom',
      environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
      setupFiles: ['./src/test/setup.ts'],
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
