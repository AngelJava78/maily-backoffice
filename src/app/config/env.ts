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

/**
 * A link to another application (feature 006, FR-015): never a base the client sends a token
 * to, so — unlike `isApiBase` — a trailing slash, a path, a query or a fragment are all fine.
 * Still rejects whitespace and `\` (a browser reads `/\x` as `//x`) and requires `https` outside
 * development, for the same reasons as `isApiBase`.
 */
function isExternalAppUrl(value: string, isProduction: boolean): boolean {
  if (/[\\\s]/.test(value)) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const allowedProtocol = url.protocol === 'https:' || (!isProduction && url.protocol === 'http:');
  return allowedProtocol && url.hostname !== '';
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

/** The seconds between two automatic refreshes of «Salud de servicios» when the variable is not set. */
const DEFAULT_HEALTH_REFRESH_SECONDS = 60;

/**
 * Whole seconds from 10 to 300, written with digits only (feature 016, contracts/environment.md):
 * `030` is 30, while a sign, a decimal point, an exponent or a space is refused, not rounded.
 */
const healthRefreshSeconds = z.preprocess(
  emptyToUndefined,
  z
    .string({ error: rules.healthRefreshSeconds })
    .regex(/^\d+$/, { error: rules.healthRefreshSeconds })
    .transform(Number)
    .pipe(
      z
        .number()
        .int({ error: rules.healthRefreshSeconds })
        .min(10, { error: rules.healthRefreshSeconds })
        .max(300, { error: rules.healthRefreshSeconds }),
    )
    .default(DEFAULT_HEALTH_REFRESH_SECONDS),
);

/** The codes of the services that the direct check always has (contracts/environment.md). */
const FIXED_DIRECT_CODES: ReadonlySet<string> = new Set(['maily-system-api', 'mailysoft-usuarios']);
/** The format of the code of a component: lower case, digits and hyphens, a letter first. */
const COMPONENT_CODE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** `[]` when it is not set; the JSON it holds otherwise, or nothing (a failure) when it is not JSON. */
function parseJsonList(value: unknown): unknown {
  if (value === undefined || value === '') {
    return [];
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * The services that the direct check reaches besides the two of the platform (feature 016,
 * contracts/environment.md): a JSON list of up to 20 `{ code, name, url }`, exactly, with the
 * rules of the codes of the registry and of the bases of the APIs. Every failure is the rule.
 */
function createHealthDirectServicesSchema(isProduction: boolean) {
  const rule = rules.healthDirectServices;
  const service = z.strictObject(
    {
      code: z
        .string({ error: rule })
        .min(2, { error: rule })
        .max(50, { error: rule })
        .regex(COMPONENT_CODE_PATTERN, { error: rule }),
      name: z.string({ error: rule }).trim().min(1, { error: rule }).max(100, { error: rule }),
      url: z
        .string({ error: rule })
        .refine((value) => isApiBase(value, isProduction), { error: rule }),
    },
    { error: rule },
  );
  return z.preprocess(
    parseJsonList,
    z
      .array(service, { error: rule })
      .max(20, { error: rule })
      .superRefine((services, ctx) => {
        const codes = services.map((each) => each.code);
        if (
          new Set(codes).size !== codes.length ||
          codes.some((code) => FIXED_DIRECT_CODES.has(code))
        ) {
          ctx.addIssue({ code: 'custom', message: rule });
        }
      }),
  );
}

function createEnvSchema(isProduction: boolean) {
  const nonEmpty = (message: string) =>
    z.string({ error: message }).trim().min(1, { error: message });
  const apiBase = z
    .string({ error: rules.apiUrl })
    .refine((value) => isApiBase(value, isProduction), { error: rules.apiUrl });
  const optionalApiBase = z.preprocess(emptyToUndefined, apiBase.optional());
  const externalAppUrl = z.preprocess(
    emptyToUndefined,
    z
      .string({ error: rules.mailySoftAppUrl })
      .refine((value) => isExternalAppUrl(value, isProduction), {
        error: rules.mailySoftAppUrl,
      })
      .optional(),
  );

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
    // The "Sin acceso" link to MailySoft's clinic-facing application (feature 006, FR-015);
    // without it, the link just does not appear.
    VITE_MAILYSOFT_APP_URL: externalAppUrl,
    // Fixed when the application is built: changing it means building and deploying again.
    VITE_HEALTH_REFRESH_SECONDS: healthRefreshSeconds,
    // The same: each origin of the list must be in the CSP and answer with CORS (FR-077).
    VITE_HEALTH_DIRECT_SERVICES: createHealthDirectServicesSchema(isProduction),
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
