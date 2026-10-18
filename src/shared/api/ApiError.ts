import { z } from 'zod';

/** Where a request failed: `network` and `timeout` never got an answer, `contract` got a bad one. */
export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'contract';

/** Error body of the platform services: `{ code, message }` plus `errors` on validation errors. */
const errorBodySchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  errors: z.unknown().optional(),
});

const fieldErrorsSchema = z.array(z.object({ field: z.string(), message: z.string() }));

export type FieldError = z.infer<typeof fieldErrorsSchema>[number];

interface ApiErrorInit {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: readonly FieldError[];
  readonly cause?: unknown;
}

/**
 * Failure of a call to one of the platform services. `message` is meant for developers, or is the
 * Spanish text sent by the service; what a person reads comes from the messages module.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, or `null` when there was no answer. */
  readonly status: number | null;
  readonly code: string;
  readonly fieldErrors: readonly FieldError[];
  /** Network failures, timeouts and 5xx answers may work if tried again; the rest will not. */
  readonly isRetryable: boolean;

  private constructor(init: ApiErrorInit) {
    super(init.message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? [];
    this.isRetryable =
      init.kind === 'network' ||
      init.kind === 'timeout' ||
      (init.kind === 'http' && init.status !== null && init.status >= 500);
  }

  /** Builds the error of a non-successful response; the body may be anything. */
  static fromResponse(status: number, body: unknown): ApiError {
    const parsed = errorBodySchema.safeParse(body);
    if (!parsed.success) {
      return new ApiError({
        kind: 'http',
        status,
        code: 'unknown_error',
        message: `The service answered with status ${status}`,
      });
    }
    const fieldErrors = fieldErrorsSchema.safeParse(parsed.data.errors);
    return new ApiError({
      kind: 'http',
      status,
      code: parsed.data.code,
      message: parsed.data.message,
      fieldErrors: fieldErrors.success ? fieldErrors.data : [],
    });
  }

  static network(cause?: unknown): ApiError {
    return new ApiError({
      kind: 'network',
      status: null,
      code: 'network_error',
      message: 'The request could not reach the service',
      cause,
    });
  }

  static timeout(): ApiError {
    return new ApiError({
      kind: 'timeout',
      status: null,
      code: 'timeout',
      message: 'The service did not answer in time',
    });
  }

  /** The service answered successfully but not with the shape the contract promises. */
  static contract(status: number, message: string): ApiError {
    return new ApiError({ kind: 'contract', status, code: 'contract_violation', message });
  }
}

/**
 * The session cannot be recovered (the token was refused again after renewing it, or it cannot
 * be renewed). It is not an `ApiError` because the right reaction is leaving, not retrying.
 */
export class SessionExpiredError extends Error {
  constructor(options?: ErrorOptions) {
    super('The session has expired', options);
    this.name = 'SessionExpiredError';
  }
}
