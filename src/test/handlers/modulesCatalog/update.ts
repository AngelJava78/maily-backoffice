import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { ModulesCatalogModel } from './model';
import { moduleChangesFromBody, readModuleId } from './validation';

/** Modifies name/description/order of a module (FR-014, FR-015, FR-022 to FR-024), with `modules:update`. */
export function updateHandlers(model: ModulesCatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.patch(
      `${USERS_API_BASE_URL}/api/v1/modules/:moduleId`,
      handle('modules:update', ({ params, body }) => {
        const updated = model.updateModule(readModuleId(params), moduleChangesFromBody(body));
        return HttpResponse.json(model.toModuleDto(updated));
      }),
    ),
  ];
}
