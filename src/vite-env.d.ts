/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string | undefined;
  readonly VITE_AUTH0_CLIENT_ID: string | undefined;
  readonly VITE_AUTH0_AUDIENCE: string | undefined;
  readonly VITE_USERS_API_URL: string | undefined;
  readonly VITE_CLINICS_API_URL: string | undefined;
  readonly VITE_SUBSCRIPTIONS_API_URL: string | undefined;
}
