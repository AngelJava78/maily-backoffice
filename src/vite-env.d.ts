/// <reference types="vite/client" />

// The identification of the build (feature 016), which `vite.config.ts` gives with `define`.
declare const __APP_VERSION__: string;
declare const __APP_COMMIT_SHA__: string;
declare const __APP_BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string | undefined;
  readonly VITE_AUTH0_CLIENT_ID: string | undefined;
  readonly VITE_AUTH0_AUDIENCE: string | undefined;
  readonly VITE_USERS_API_URL: string | undefined;
  readonly VITE_CLINICS_API_URL: string | undefined;
  readonly VITE_SUBSCRIPTIONS_API_URL: string | undefined;
  readonly VITE_DASHBOARD_REFRESH_MINUTES: string | undefined;
  readonly VITE_MAILYSOFT_APP_URL: string | undefined;
  readonly VITE_HEALTH_REFRESH_SECONDS: string | undefined;
  readonly VITE_HEALTH_DIRECT_SERVICES: string | undefined;
}
