/**
 * The only place that talks to `console` (constitution V). Whatever is logged goes through a
 * redaction pass first, so tokens and personal data never reach the console by accident.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Readonly<Record<string, unknown>>;

const REDACTED = '[redacted]';
const MAX_DEPTH = 8;

/** Keys written in lower case and without separators, so `access_token` matches `accessToken`. */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'token',
  'accesstoken',
  'idtoken',
  'refreshtoken',
  'authorization',
  'password',
  'secret',
  'cookie',
  'email',
  'name',
  'firstname',
  'paternallastname',
  'maternallastname',
  'displayname',
  'picture',
  'sub',
  'auth0id',
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_\s]/g, ''));
}

function redact(value: unknown, ancestors: Set<object>, depth: number): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (ancestors.has(value)) {
    return '[circular]';
  }
  if (depth >= MAX_DEPTH) {
    return '[truncated]';
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item: unknown) => redact(item, ancestors, depth + 1));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? REDACTED : redact(entry, ancestors, depth + 1),
      ]),
    );
  } finally {
    ancestors.delete(value);
  }
}

function emit(level: LogLevel, message: string, context: LogContext | undefined): void {
  if (level === 'debug' && !import.meta.env.DEV) {
    return;
  }
  if (context === undefined) {
    console[level](message);
  } else {
    console[level](message, redact(context, new Set(), 0));
  }
}

export const logger = {
  debug: (message: string, context?: LogContext): void => {
    emit('debug', message, context);
  },
  info: (message: string, context?: LogContext): void => {
    emit('info', message, context);
  },
  warn: (message: string, context?: LogContext): void => {
    emit('warn', message, context);
  },
  error: (message: string, context?: LogContext): void => {
    emit('error', message, context);
  },
};
