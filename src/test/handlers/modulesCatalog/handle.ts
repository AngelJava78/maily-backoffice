import { HttpResponse, type PathParams } from 'msw';

import type { FailureControls } from '../shared/failures';
import type { RequestLog } from '../shared/requestLog';
import type { Authorization } from './authorize';
import { ModuleCatalogError, validationError } from './model';

/** What the operation receives once the request has been recorded, identified and authorized. */
export interface RequestContext {
  readonly request: Request;
  readonly params: PathParams;
  readonly sub: string;
  readonly body: unknown;
}

type Operation = (context: RequestContext) => Response | Promise<Response>;

export function toErrorResponse(error: ModuleCatalogError): Response {
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
 * Builds the wrapper every operation goes through, same order as the real API (401/503 → 403 → 422
 * → 404 → 409, contracts/modules-service.md): a body that is not readable JSON, who is asking, an
 * injected failure, the permission, and only then the operation itself. A refusal becomes its JSON
 * answer.
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
        if (error instanceof ModuleCatalogError) {
          return toErrorResponse(error);
        }
        throw error;
      }
    };
  };
}

export type Handle = ReturnType<typeof createHandle>;
