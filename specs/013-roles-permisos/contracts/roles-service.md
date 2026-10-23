# Contrato consumido: API de roles, permisos y módulos (MailySoft Usuarios)

**Feature**: `013-roles-permisos` | **Fecha**: 2026-10-23 | **Spec**: [../spec.md](../spec.md)

Verificado el 2026-10-23 leyendo directamente el código fuente vigente de `C:\Maily\code\mailySoft-usuarios`: `src/routers/roles.py`, `role_permissions.py`, `permissions.py`, `modules.py`, `catalogs.py`; `src/dtos/role.py`, `permission.py`, `module.py`, `role_permission.py`, `references.py`, `role_type.py`, `catalogs.py`; `src/services/role_service.py`; `project-definition/create_database.sql`. Mismo backend y mismo cliente HTTP (`VITE_USERS_API_URL`) que ya consume `features/users`; condiciones generales sin cambios respecto a esa feature: Bearer token de Auth0, timeout de 30 s, cancelación con `AbortSignal`, reintentos solo en GET (máx. 2, red/5xx), 401 con un reintento de renovación y redirección a login si falla, 403 "sin permisos" sin cerrar sesión.

Todas las rutas bajo `/api/v1`. Cada operación exige, además del token, el scope (permiso de backend) indicado — es un permiso distinto por operación, no uno solo para todo "roles":

## Roles (`/roles`)

| Operación | Método y ruta | Scope | Éxito | Notas |
|---|---|---|---|---|
| Listar roles activos | `GET /roles?status_id=1` | `roles:read` | 200 `RoleRead[]` | Sin paginar, orden alfabético (sin distinguir mayúsculas). `status_id` por omisión es `1` (Activo); esta feature nunca envía `2` (Bloqueado, fuera de alcance). |
| Crear rol | `POST /roles` body `{ name, description?, type_id }` | `roles:write` | 201 `RoleRead` (header `Location`) | `type_id` obligatorio, estricto, `1` o `2`. `name` de 1 a 50 caracteres. |
| Modificar rol | `PATCH /roles/{id}` body `{ name?, description? }` | `roles:update` | 200 `RoleRead` | Al menos un campo. **`type_id`/`type` siempre rechazados (422)**, aunque coincidan con el valor actual: el tipo no se puede cambiar nunca. |
| Eliminar rol | `DELETE /roles/{id}` | `roles:delete` | 204 | Baja lógica. **Se permite aunque el rol esté asignado a usuarios o tenga permisos** (confirmado en `role_service.py`: "Soft delete: the role and its assignments stay stored"); no hay reactivación; el nombre queda libre para otro rol. |
| Consultar permisos de un rol | `GET /roles/{id}/permissions` | `roles:read` | 200 `PermissionRead[]` | Solo los permisos Activos asociados, sin paginar, por nombre. Lista vacía si no tiene ninguno. |
| Asociar un permiso | `POST /roles/{id}/permissions` body `{ permission_id }` | `roles:update` | 201 `{ role, permission }` | Rechaza (409) si ya estaba asociado, o si el `type` del módulo del permiso no es el `type` del rol. |
| Desasociar un permiso | `DELETE /roles/{id}/permissions/{permission_id}` | `roles:update` | 204 | Rechaza (409) si no estaba asociado. |

No existen en esta API: un endpoint de "duplicar rol", uno de "reemplazar todos los permisos de un rol de una sola vez", ni uno de "bloquear/desbloquear" expuesto por esta feature (existe `POST /roles/{id}/block` y `/unblock`, pero está fuera de alcance: no se muestra en los mockups de esta feature). Ver research D6/D7 para cómo se logran "Duplicar" y "Copiar permisos de" con las operaciones de esta tabla.

## Catálogos de solo lectura

| Operación | Método y ruta | Scope | Éxito | Notas |
|---|---|---|---|---|
| Catálogo de permisos | `GET /permissions?status_id=1` | `permissions:read` | 200 `PermissionRead[]` | Sin paginar. Cada permiso trae `module` y `action` ya resueltos de su `name` (`recurso:accion`), o `null` si no corresponden a ningún módulo/acción Activo. Es la fuente para construir la matriz (data-model.md, `PermissionMatrix`); no existe un endpoint separado de "acciones por módulo". |
| Catálogo de módulos | `GET /modules?type_id=1\|2&status_id=1` | `modules:read` | 200 `ModuleRead[]` | Ordenado por `sort_order`, luego `name`. Da nombre y orden de cada fila; no trae el detalle de sus permisos (se cruza por `key` con el catálogo de permisos). |
| Tipos de rol | `GET /role-types` | `roles:read` | 200 `[{id,name}]` | `1` Sistema, `2` Clínica. Para el selector de tipo en el alta. |

**Permiso de pantalla vs. scopes de backend**: la sección se gatea en el frontend con un único recurso de política, `roles` (research D4) — equivalente a `roles:read`/`write`/`update`/`delete`. Si a la persona le falta `permissions:read` o `modules:read` (scopes de otro recurso de backend), el rol y su lista se siguen viendo con normalidad; solo la tabla de permisos no puede construirse y lo señala puntualmente (FR-020) — no existe en el backend un scope combinado "roles y permisos", así que el frontend no asume que siempre vienen juntos.

## Catálogo de errores (cuerpo uniforme `{ code, message, errors? }`; la interfaz nunca muestra `message` tal cual al usuario, solo lo usa para elegir su propio texto)

| `code` | Estado | Operación | Cómo lo trata la interfaz |
|---|---|---|---|
| `role_name_already_exists` | 409 | Crear, Modificar | Error en el campo nombre de `RoleFormDialog`/edición: "ya existe un role con este nombre" (global, no por tipo). |
| `role_not_found` | 404 | Cualquiera con `{role_id}` | Mensaje "no encontrado" uniforme (el rol se quitó de la lista mientras tanto: se refresca). |
| `role_permission_already_associated` | 409 | Asociar | Tratado como éxito silencioso para ese `permission_id` (research D6): el estado deseado ya es el real. |
| `role_permission_not_associated` | 409 | Desasociar | Igual, éxito silencioso. |
| `role_permission_module_type_conflict` | 409 | Asociar | Error de esa celda puntual; no debería ocurrir porque la matriz ya solo ofrece módulos del tipo del rol (FR-006) — señal de que el catálogo cambió a mitad de la edición. |
| `permission_not_found` | 404 | Asociar/Desasociar | Igual que `role_not_found`, referido al permiso: se refresca el catálogo. |
| `validation_error` (con `errors: [{ field, message }]`) | 422 | Crear, Modificar, Asociar | Cada entrada de `errors` se asocia al campo correspondiente del formulario (`field: "name"` → campo nombre; `field: "type_id"` no debería ocurrir porque el formulario siempre lo envía bien formado). |

Genéricos (401, 403, 404 sin `{role_id}`/`{permission_id}`, 5xx) usan el manejo ya uniforme del cliente HTTP compartido; no se documentan de nuevo aquí.

## Ejemplo de cuerpo completo (`RoleRead`, verificado contra el ejemplo del propio router)

```json
{
  "id": 6,
  "name": "Doctor",
  "description": "Atiende pacientes: agenda, expediente y recetas.",
  "created_at": "2026-10-15T05:57:30.521Z",
  "status": { "id": 1, "name": "Activo" },
  "type": { "id": 2, "name": "Clínica" }
}
```

## Ejemplo de cuerpo completo (`PermissionRead`, catálogo)

```json
{
  "id": 25,
  "name": "patients:read",
  "description": null,
  "created_at": "2026-10-15T05:57:30.521Z",
  "status": { "id": 1, "name": "Activo" },
  "module": { "id": 5, "key": "patients", "name": "Pacientes", "type": { "id": 2, "name": "Clínica" } },
  "action": { "id": 1, "key": "read", "name": "Ver" }
}
```

## Dato real del entorno local (seed vigente, no normativo)

Solo existen 4 módulos, los 4 de tipo Sistema (`users`, `roles`, `permissions`, `modules`); no hay módulos de tipo Clínica todavía (los crea la futura spec "Módulos"). Contra ese entorno, la pestaña Clínica de esta feature mostrará roles sin ninguna fila en su matriz (0 módulos de ese tipo), y la pestaña Sistema solo 4 filas — correcto y esperado, no un error; ver research D8 para cómo las pruebas cubren también el caso rico del mockup sin depender de este estado real.
