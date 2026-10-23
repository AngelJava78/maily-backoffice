# Contract: API de Módulos y Permisos (consumida por 013-manage-modules)

Recorte, en los términos que usa esta pantalla, del contrato real y ya implementado de
`C:\Maily\code\mailySoft-usuarios` — `specs/013-modules-permissions-catalogs/contracts/
openapi-modules.yaml` (v5.0.0) y `specs/003-permissions/contracts/openapi-permissions.yaml`. Esos
dos documentos son la fuente de verdad completa; aquí solo se listan las operaciones que
`src/features/modules/api/modulesApi.ts` usa, con la forma en que las usa.

Host: el mismo de `VITE_USERS_API_URL` (research D2). Autenticación: `Authorization: Bearer <token>`
del mismo cliente HTTP que ya usan `users` y `roles`.

## Módulos

| Operación | Método y ruta | Cuándo la usa esta pantalla |
|---|---|---|
| Listar | `GET /api/v1/modules?status_id={1\|2}` | al cargar la pantalla y al cambiar el filtro Estatus (research D6); `type_id` no se envía (el filtro Tipo es de cliente) |
| Crear | `POST /api/v1/modules` | al guardar "Nuevo módulo" |
| Modificar | `PATCH /api/v1/modules/{id}` | al guardar "Editar módulo", solo si cambió nombre, descripción u orden |
| Bloquear | `POST /api/v1/modules/{id}/block` | botón "Bloquear módulo" |
| Desbloquear | `POST /api/v1/modules/{id}/unblock` | botón "Desbloquear módulo" |
| Eliminar | `DELETE /api/v1/modules/{id}` | botón "Eliminar módulo", tras confirmar |

Campos de `ModuleRead` que usa la pantalla: `id`, `key`, `name`, `description`, `sort_order`,
`created_at`, `status.id`, `type.id`, `active_permissions_count` (solo informativo, ver
[data-model.md](../data-model.md)). `ModuleCreate` enviado: `{ key, name, type_id, description?,
sort_order? }`. `ModuleUpdate` enviado: solo los campos que cambiaron entre `name`, `description`,
`sort_order` (nunca `key` ni `type_id`: la API los rechaza con `422 validation_error` si se envían,
y esta pantalla nunca los ofrece como editables).

No se usan: `GET /modules/{id}`, `GET /modules/by-key` (la pantalla ya tiene el módulo cargado por la
lista, research D10), ni `GET /module-types`/`GET /module-statuses` (catálogos fijos, research D4).

## Permisos (acciones de un módulo)

| Operación | Método y ruta | Cuándo la usa esta pantalla |
|---|---|---|
| Listar | `GET /api/v1/permissions` | al cargar la pantalla, para cruzar con los módulos (research D3); sin `status_id` (siempre activos) |
| Crear | `POST /api/v1/permissions` con `{ name: "<key>:<accion>" }` | al marcar una acción que el módulo no tenía |
| Eliminar | `DELETE /api/v1/permissions/{id}` | al desmarcar una acción que el módulo ya tenía (research D5) |

De `PermissionRead` esta pantalla solo usa `id`, `name`, `module.key` y `action.key` (para el cruce
de D3); `description`, `created_at` y `status` no se muestran aquí.

No se usan: `GET /actions` (catálogo fijo, research D4), ni `PATCH`/`block`/`unblock` de un permiso
individual (desmarcar una acción elimina el permiso, no lo bloquea; research D5).

## Errores que esta pantalla distingue (`describeModuleError`, research D8)

| `code` | Status | Cuándo | Resultado en pantalla |
|---|---|---|---|
| `module_key_already_exists` | 409 | crear con una `key` ya usada | error en el campo Clave |
| `module_name_already_exists` | 409 | crear o modificar con un `name` ya usado | error en el campo Nombre |
| `module_not_found` | 404 | editar/bloquear/desbloquear/eliminar un módulo que ya no existe | aviso de "ya no existe", vuelve al listado |
| `module_protected` | 409 | bloquear o eliminar uno de los cuatro módulos base | no debería ocurrir (la UI ya oculta la opción); si ocurre, aviso explicando por qué |
| `module_already_blocked` / `module_already_active` | 409 | carrera entre dos personas bloqueando/desbloqueando el mismo módulo | aviso de que ya cambió de estatus, recarga el módulo |
| `validation_error` (en `key` o `type_id` de un `PATCH`) | 422 | no debería ocurrir (la UI no los ofrece editables); defensivo | error genérico de formulario |
| `validation_error` (formato de `key`, longitud de `name`/`description`, `type_id` inválido al crear) | 422 | crear con datos inválidos | error en el campo correspondiente |
| `permission_not_found` | 404 | desmarcar una acción cuyo permiso ya no existe (carrera) | se ignora como error: el resultado deseado (que no exista) ya se cumplió |
| `permission_name_already_exists` | 409 | carrera: dos personas marcan la misma acción a la vez | error reintentable en esa acción |
| cualquier 5xx o fallo de red | — | — | error reintentable, sin perder lo ya capturado en el formulario |

Todo mensaje llega del catálogo de mensajes de esta aplicación (`messages.modules.*`), nunca el
texto crudo de la API (constitución IV).
