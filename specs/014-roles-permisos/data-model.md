# Modelo de datos: Roles y permisos

**Feature**: `014-roles-permisos` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Todos los campos salen de los DTOs reales de `mailySoft-usuarios` (`src/dtos/role.py`, `permission.py`, `module.py`, `role_permission.py`, `references.py`, `catalogs.py`), verificados contra el código el 2026-10-23. `Role` aquí (con `type` y permisos) es un modelo **distinto** del `Role` de `features/users/schemas/role.ts` (ese es el visto por el combo de asignar rol a una persona, sin tipo ni permisos): conviven, no se unifican (research D2).

## `RoleType`

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | `1 \| 2` | `id` de `RoleTypeRead` / `role-types` | 1 = Sistema (da acceso al Backoffice), 2 = Clínica (da acceso a la app de clínicas). Fijo, se edita a mano en el backend. |
| `name` | texto | `name` | `"Sistema"` o `"Clínica"`, en español. La interfaz decide el comportamiento por `id`, nunca comparando `name`. |

## `Role`

Sale de `RoleRead` (lista, detalle, alta, modificación) más `RoleReference` (cuando otro recurso lo referencia).

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | — |
| `name` | texto, 1 a 50 caracteres | `name` | Único entre todos los roles no eliminados, sin importar `type`, sin distinguir mayúsculas (índice `roles_name_not_deleted_key` sobre `lower(name)`); lo valida el backend (409 `role_name_already_exists`), el frontend no duplica la regla (Principio IV). |
| `description` | texto o `null`, hasta 500 caracteres | `description` | Opcional; cadena vacía se guarda como `null`. |
| `type` | `RoleType` | `type` | Se fija al crear (`typeId` en el alta); **ningún** endpoint de modificación lo acepta — `PATCH` rechaza `type`/`type_id` con 422 siempre, aunque coincida con el valor actual. |
| `status` | `{ id, name }` | `status` | Esta feature solo trabaja roles Activos (`status_id=1`); Bloqueado y Eliminado quedan fuera de alcance (Assumptions de spec.md) y nunca se piden ni se muestran. |
| `createdAt` | fecha y hora con zona | `created_at` | Solo lectura. |
| `grantedPermissionsCount` | entero ≥ 0 | *(derivado)* | Cuenta de `GET /roles/{id}/permissions`, no un campo propio de `RoleRead`. Se recalcula tras cada alta/baja de permiso (FR-017). |

### `RoleCreateInput` (alta)

| Campo | Tipo | Destino (DTO) | Reglas |
|---|---|---|---|
| `name` | texto, 1 a 50 caracteres | `name` de `RoleCreate` | Obligatorio (FR-011). |
| `description` | texto o vacío | `description` | Opcional. |
| `typeId` | `1 \| 2` | `type_id` | Obligatorio, estricto (el backend rechaza `true`/`1.0`/texto con 422); no se ofrece "sin tipo". |
| `copyPermissionsFromRoleId` | entero o `undefined` | *(no es un campo de la API)* | Si se indica, tras crear el rol se leen los permisos de ese rol origen (`GET /roles/{id}/permissions`) y se asocian uno por uno al nuevo (research D7); solo admite roles del mismo `typeId` (FR-012, se filtra en `CopyPermissionsFromField`). |

## `Module`

Sale de `ModuleRead` (catálogo) y de `ModuleReference` (embebido en cada `Permission`, versión reducida sin `description`/`sortOrder`/`status`/`activePermissionsCount`).

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | — |
| `key` | texto, `^[a-z][a-z0-9_]*$` | `key` | Identificador estable (p. ej. `"patients"`); no cambia. Es la clave de agrupación de la matriz (research D3). |
| `name` | texto | `name` | Nombre visible de la fila (p. ej. "Pacientes"). |
| `type` | `{ id: 1 \| 2, name }` (`ModuleTypeRead`) | `type` | Catálogo de tipo de **módulo**: mismos `id`/`name` que `RoleType` pero es un catálogo distinto, nunca se mezclan (coincidencia documentada en el propio backend). La matriz de un rol de Sistema solo incluye módulos de Sistema; la de uno de Clínica incluye los de Clínica y, además, los de Sistema (regla asimétrica, FR-006 — spec `015-clinic-roles-system-modules`). |
| `sortOrder` | entero | `sort_order` | Orden de la fila en la tabla (catálogo completo, vía `GET /modules`). |

## `Action`

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` de `ActionReference`/`ActionRead` | — |
| `key` | `'read' \| 'write' \| 'update' \| 'delete'` | `key` | Mapeo fijo a columna: `read`→Ver, `write`→Crear, `update`→Modificar, `delete`→Eliminar (FR-007). Cualquier otra `key` que llegara se ignora (no se pinta columna para ella), para no romper la tabla ante un catálogo de acciones ampliado a mano en el backend. |
| `name` | texto | `name` | Nombre en español de la acción (ya viene así del backend; no se vuelve a traducir). |

## `Permission`

Sale de `PermissionRead` (catálogo completo, `GET /permissions`) y `PermissionReference` (embebido en `RolePermissionRead`).

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | — |
| `name` | texto, formato `recurso:accion` | `name` | P. ej. `"patients:read"`. No se parsea en el frontend: se usan `module`/`action` ya resueltos. |
| `module` | `Module` embebido o `null` | `module` | `null` cuando el recurso de `name` no corresponde a ningún módulo Activo (p. ej., hoy en local, los permisos `patients:*`). Esas filas **no entran** en la matriz de ningún rol (research D3). |
| `action` | `Action` embebido o `null` | `action` | `null` si no corresponde a ninguna acción del catálogo; esa celda tampoco se pinta. |
| `status` | `{ id, name }` | `status` | Solo se piden permisos Activos (`status_id=1`). |

## `RolePermission` (asociación)

No tiene identificador propio ni endpoint de lectura directa fuera de `GET /roles/{id}/permissions` (que devuelve `Permission[]`, no la asociación). Se usa para las mutaciones:

| Campo | Tipo | Destino (DTO) | Reglas |
|---|---|---|---|
| `roleId` | entero | parte de la ruta | — |
| `permissionId` | entero | `permission_id` de `RolePermissionCreate` | Al asociar (`POST`) o desasociar (`DELETE`, en la ruta). |

**Reglas de conflicto (409, del backend, no se reimplementan)**: `role_permission_already_associated` (ya estaba asociado), `role_permission_not_associated` (no estaba asociado), `role_permission_module_type_conflict` (el par tipo de rol/tipo de módulo no es uno de los permitidos). El frontend trata los dos primeros como éxito silencioso para ese `permissionId` puntual durante un guardado (research D6); el tercero no debería ocurrir porque la matriz ya solo ofrece módulos de un tipo permitido para ese role (no necesariamente el mismo, desde la regla asimétrica de la spec `015-clinic-roles-system-modules`, FR-006), así que si llega se muestra como error de ese permiso.

## `PermissionMatrix` (derivado; `schemas/permissionMatrix.ts`, no sale de ninguna respuesta)

```ts
interface PermissionMatrixRow {
  module: Module;
  cells: Partial<Record<Action['key'], { permissionId: number; granted: boolean }>>;
}

type PermissionMatrix = readonly PermissionMatrixRow[];
```

Se construye (research D3) a partir de dos catálogos ya cargados — el de módulos del tipo del rol (`GET /modules?type_id=`) y el de permisos (`GET /permissions`) — y de los permisos ya asociados al rol (`GET /roles/{id}/permissions`):

1. Agrupar `Permission[]` por `module.key`, descartando `module: null` y las de otro `type`.
2. Por cada `Module` del catálogo (en `sortOrder`), tomar su grupo de permisos y quedarse, por cada `action.key` presente, con `{ permissionId, granted }` (`granted` = ese `permissionId` está en el conjunto de permisos asociados al rol). Un módulo sin ningún permiso en el catálogo aparece con `cells: {}` (fila sin casillas, edge case de spec.md).
3. Un módulo del catálogo que no tenga ninguna fila de permisos correspondiente igual se incluye (fila "vacía"), para no ocultar que el módulo existe.

### `withPermissionToggled` (función pura; aplica FR-008/FR-009)

```ts
function withPermissionToggled(
  row: PermissionMatrixRow,
  actionKey: Action['key'],
  checked: boolean,
): PermissionMatrixRow
```

Al marcar `write`, `update` o `delete`, marca también `read` si no lo estaba (FR-008). Al desmarcar `read`, desmarca las demás celdas presentes de esa fila. "Todo el módulo" es azúcar sintáctico: marca o desmarca, en una sola llamada, todas las `cells` presentes de la fila (FR-009) — no crea una acción nueva ni se envía como tal a la API.

## `RolePermissionsLocation` (estado en la URL; research D5)

| Search param | Tipo | Reglas |
|---|---|---|
| `type` | `'clinica' \| 'sistema'` | Pestaña activa; por omisión `'clinica'` (Historia 1, escenario 1). Valor inválido se trata como ausente. |
| `roleId` | entero o ausente | Rol elegido dentro de la pestaña activa. Si no corresponde a ningún rol de esa pestaña (borrado, o pestaña recién cambiada), se limpia y no se muestra detalle. |

Mismo patrón que `page`/`page_size` en Usuarios (Principio III): enlace compartible, recarga y botón Atrás funcionan sin estado adicional.

## Mensajes de error de dominio (research D10)

| Código (backend) | Dónde se muestra | Mensaje |
|---|---|---|
| `role_name_already_exists` | Campo `name` de `RoleFormDialog` | "Ya existe un role con este nombre." |
| `role_permission_module_type_conflict` | Aviso puntual de la fila/celda | "Este permiso no corresponde al tipo de este role." (no debería verse; ver arriba) |
| `role_permission_already_associated` / `role_permission_not_associated` | — | Tratados como éxito silencioso (research D6), nunca se muestran. |
| `validation_error` (con `errors: [{ field, message }]`) | Campo indicado por `field` | Se usa el `message` del backend tal cual, mapeado al campo del formulario. |

Los genéricos (401, 403, 404, red/5xx) usan el manejo ya uniforme del cliente HTTP compartido (constitución, Principio IV): sin casos especiales para este dominio.
