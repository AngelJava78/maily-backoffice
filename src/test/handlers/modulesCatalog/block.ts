import { http, HttpResponse, type HttpHandler } from 'msw';

import { USERS_API_BASE_URL } from '../usersService';
import type { Handle } from './handle';
import type { ModulesCatalogModel } from './model';
import { readModuleId } from './validation';

/** Blocks and unblocks a module (FR-019 to FR-021, FR-025 to FR-029), with `modules:update`. */
export function blockHandlers(model: ModulesCatalogModel, handle: Handle): HttpHandler[] {
  return [
    http.post(
      `${USERS_API_BASE_URL}/api/v1/modules/:moduleId/block`,
      handle('modules:update', ({ params }) => {
        return HttpResponse.json(model.toModuleDto(model.blockModule(readModuleId(params))));
      }),
    ),

    http.post(
      `${USERS_API_BASE_URL}/api/v1/modules/:moduleId/unblock`,
      handle('modules:update', ({ params }) => {
        return HttpResponse.json(model.toModuleDto(model.unblockModule(readModuleId(params))));
      }),
    ),
  ];
}
