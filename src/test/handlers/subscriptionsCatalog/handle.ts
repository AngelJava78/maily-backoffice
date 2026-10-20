import { HttpResponse, type PathParams } from 'msw';

import type { FailureControls } from '../shared/failures';
import type { RequestLog } from '../shared/requestLog';
import type { Authorization } from './authorize';
import { CatalogError, validationError } from './model';

/** What the operation receives once the request has been recorded, identified and authorized. */
export interface RequestContext {
  readonly request: Request;
  readonly params: PathParams;
  /** The `sub` of the person asking. */
  readonly sub: string;
  /** The JSON body, or `null` when there is none. */
  readonly body: unknown;
}

type Operation = (context: RequestContext) => Response | Promise<Response>;

/** The JSON error the API answers with: `{ code, message, errors? }`. */
export function toErrorResponse(error: CatalogError): Response {
  return HttpResponse.json(
    {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors === undefined ? {} : { errors: error.fieldErrors }),
    },
    { status: error.status },
  );
}

/**
 * Builds the wrapper every operation goes through, in the order of the API (contracts/
 * subscriptions-service.md, "Orden de comprobaciones"): a body that is not readable JSON, who is
 * asking, the failures a test injected, the permission, and only then the operation, which
 * validates, looks the subscription up and applies its rules. A refusal becomes its JSON answer.
 */
export function createHandle({
  log,
  failures,
  authorization,
}: {
  readonly log: RequestLog;
  readonly failures: FailureControls;
  readonly authorization: Authorization;
}) {
  return function handle(permission: string, operation: Operation) {
    return async ({
      request,
      params,
    }: {
      readonly request: Request;
      readonly params: PathParams;
    }): Promise<Response> => {
      const recorded = await log.record(request);
      try {
        if (recorded.unreadableBody !== undefined) {
          throw validationError([
            { field: 'body', message: 'El cuerpo de la solicitud no es válido.' },
          ]);
        }
        const sub = authorization.authenticate(request);
        const injected = await failures.intercept(request, recorded.path);
        if (injected !== null) {
          return injected;
        }
        authorization.requirePermission(sub, permission);
        return await operation({ request, params, sub, body: recorded.body });
      } catch (error) {
        if (error instanceof CatalogError) {
          return toErrorResponse(error);
        }
        throw error;
      }
    };
  };
}

export type Handle = ReturnType<typeof createHandle>;
