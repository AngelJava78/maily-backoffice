import { HttpResponse, type PathParams } from 'msw';

import type { RequestLog } from '../shared/requestLog';
import { authenticate, requirePermission } from './authorize';
import type { Behaviors } from './behaviors';
import { DirectoryError, type DirectoryModel } from './model';

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

/** The JSON error the service answers with: `{ code, message, errors? }`. */
export function toErrorResponse(error: DirectoryError): Response {
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
 * Builds the wrapper every operation goes through, in the order of the service (contracts/
 * users-service.md): who is asking, then the failures a test injected, then the permission, and
 * only then the operation itself. A refusal raised by the operation becomes its JSON answer.
 */
export function createHandle(model: DirectoryModel, behaviors: Behaviors, log: RequestLog) {
  return function handle(permission: string | null, operation: Operation) {
    return async ({
      request,
      params,
    }: {
      readonly request: Request;
      readonly params: PathParams;
    }): Promise<Response> => {
      const recorded = await log.record(request);
      try {
        const sub = authenticate(request);
        const injected = await behaviors.intercept(request, recorded.path);
        if (injected !== null) {
          return injected;
        }
        if (permission !== null) {
          requirePermission(sub, model, permission);
        }
        return await operation({ request, params, sub, body: recorded.body });
      } catch (error) {
        if (error instanceof DirectoryError) {
          return toErrorResponse(error);
        }
        throw error;
      }
    };
  };
}

export type Handle = ReturnType<typeof createHandle>;
