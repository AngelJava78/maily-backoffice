import { z } from 'zod';

import { messages } from '@/shared/messages/es';

const { rules } = messages.config;

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/**
 * Base URL of an API: a same-origin path (`/proxy/users`) or an absolute http(s) URL, without a
 * trailing slash, credentials, query or fragment. Production builds only accept `https`.
 */
function isApiBase(value: string, isProduction: boolean): boolean {
  // A browser reads a backslash as a slash (`/\evil.com` is `//evil.com`), and whitespace is stripped
  // from URLs: neither can be part of an address that the token will be sent to.
  if (value.endsWith('/') || /[\\\s]/.test(value)) {
    return false;
  }
  if (value.startsWith('/')) {
    return !value.startsWith('//');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const allowedProtocol = url.protocol === 'https:' || (!isProduction && url.protocol === 'http:');
  return (
    allowedProtocol &&
    url.hostname !== '' &&
    url.username === '' &&
    url.password === '' &&
    url.search === '' &&
    url.hash === ''
  );
}

/** An `.env` line such as `VITE_CLINICS_API_URL=` arrives as an empty string: treat it as unset. */
function emptyToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value;
}

/** The minutes between two automatic refreshes of the Panel when the variable is not set. */
const DEFAULT_DASHBOARD_REFRESH_MINUTES = 5;

/**
 * Whole minutes from 1 to 60, written with digits only (feature 007, contracts/environment.md):
 * `05` is 5, while a sign, a decimal point, an exponent or a space is refused, not rounded.
 */
const dashboardRefreshMinutes = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: rules.refreshMinutes })
    .regex(/^\d+$/, { error: rules.refreshMinutes })
    .transform(Number)
    .pipe(
      z
        .number()
        .int({ error: rules.refreshMinutes })
        .min(1, { error: rules.refreshMinutes })
        .max(60, { error: rules.refreshMinutes }),
    )
    .default(DEFAULT_DASHBOARD_REFRESH_MINUTES),
);

function createEnvSchema(isProduction: boolean) {
  const nonEmpty = (message: string) =>
    z.string({ error: message }).trim().min(1, { error: message });
  const apiBase = z
    .string({ error: rules.apiUrl })
    .refine((value) => isApiBase(value, isProduction), { error: rules.apiUrl });
  const optionalApiBase = z.preprocess(emptyToUndefined, apiBase.optional());

  return z.object({
    VITE_AUTH0_DOMAIN: z
      .string({ error: rules.domain })
      .trim()
      .regex(DOMAIN_PATTERN, { error: rules.domain }),
    VITE_AUTH0_CLIENT_ID: nonEmpty(rules.nonEmpty),
    VITE_AUTH0_AUDIENCE: nonEmpty(rules.audience),
    VITE_USERS_API_URL: apiBase,
    VITE_CLINICS_API_URL: optionalApiBase,
    // Required since feature 003: the subscriptions section cannot work without its API.
    VITE_SUBSCRIPTIONS_API_URL: apiBase,
    // Fixed when the application is built: changing it means building and deploying again.
    VITE_DASHBOARD_REFRESH_MINUTES: dashboardRefreshMinutes,
  });
}

/** Validated configuration of the application. */
export type AppEnv = z.infer<ReturnType<typeof createEnvSchema>>;

export type EnvParseResult =
  | { readonly ok: true; readonly env: AppEnv }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Validates the raw `import.meta.env` (constitution II). It never throws: invalid variables come
 * back as `"<NAME>: <rule>"` messages in Spanish, one per variable and never echoing the value.
 */
export function parseEnv(
  source: Readonly<Record<string, unknown>>,
  options: { readonly isProduction: boolean },
): EnvParseResult {
  const result = createEnvSchema(options.isProduction).safeParse(source);
  if (result.success) {
    return { ok: true, env: result.data };
  }

  const reported = new Set<string>();
  const errors: string[] = [];
  for (const issue of result.error.issues) {
    const name = String(issue.path[0] ?? 'env');
    if (!reported.has(name)) {
      reported.add(name);
      errors.push(`${name}: ${issue.message}`);
    }
  }
  return { ok: false, errors };
}
