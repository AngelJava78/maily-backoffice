import { z } from 'zod';

const FALLBACK_PATH = '/';
const MAX_PATH_LENGTH = 2_048;

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

/**
 * A path inside this application: it starts with a single `/` and cannot be read by a browser as
 * another origin (`//host`, backslashes and control characters, which URL parsers strip or turn
 * into slashes, are rejected).
 */
const internalPathSchema = z
  .string()
  .max(MAX_PATH_LENGTH)
  .refine(
    (value) =>
      value.startsWith('/') &&
      !value.startsWith('//') &&
      !value.includes('\\') &&
      !hasControlCharacter(value),
  );

const pathnameSchema = internalPathSchema.refine(
  (value) => !value.includes('?') && !value.includes('#'),
);

const positiveIntegerSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .refine((value) => Number.isSafeInteger(Number(value)));

const sortSchema = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/);

/** The only query parameters that may be kept to come back to a screen (never free text). */
const storableParameterSchemas = {
  page: positiveIntegerSchema,
  page_size: positiveIntegerSchema,
  sort: sortSchema,
} as const;

const locationSchema = z.object({ pathname: pathnameSchema, search: z.string().optional() });

/**
 * Returns `value` when it is a path inside this application and `/` otherwise. The value comes
 * from outside (router state, Auth0 `appState`), so nothing but text is trusted (constitution II).
 */
export function toSafeInternalPath(value: unknown): string {
  const parsed = internalPathSchema.safeParse(value);
  return parsed.success ? parsed.data : FALLBACK_PATH;
}

/**
 * Builds the path to come back to after the session expired: the pathname plus the pagination and
 * sort parameters only, so that no filter or search text (which may hold personal data) is stored.
 * It accepts `unknown` fields because the location it receives is a boundary value.
 */
export function sanitizeReturnPathForStorage(location: {
  readonly pathname: unknown;
  readonly search?: unknown;
}): string {
  const parsed = locationSchema.safeParse(location);
  if (!parsed.success) {
    return FALLBACK_PATH;
  }

  const kept = new URLSearchParams();
  for (const [name, value] of new URLSearchParams(parsed.data.search ?? '')) {
    if (name !== 'page' && name !== 'page_size' && name !== 'sort') {
      continue;
    }
    if (!kept.has(name) && storableParameterSchemas[name].safeParse(value).success) {
      kept.append(name, value);
    }
  }

  const query = kept.toString();
  return toSafeInternalPath(
    query === '' ? parsed.data.pathname : `${parsed.data.pathname}?${query}`,
  );
}
