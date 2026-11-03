# Data Model: Lista de roles con filtros de Tipo y Estatus, y bloqueo de roles

**Feature**: `025-roles-type-status-filters` | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Solo frontend: ninguna entidad nueva en el servidor. Se describen el modelo de dominio que ya existe
(`Role`), el estado navegable nuevo de la pantalla y las transiciones de estatus que la pantalla
ofrece.

## 1. Role (sin cambios de forma)

`features/roles/schemas/role.ts` (`roleSchema`), validado con Zod en la frontera:

| Campo | Tipo | Origen (DTO) | Notas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | |
| `name` | texto 1–50 | `name` | Reservado también mientras el role está bloqueado |
| `description` | texto ≤ 500 o `null` | `description` | |
| `createdAt` | ISO 8601 | `created_at` | |
| `status` | `{ id, name }` | `status` | 1 Activo, 2 Bloqueado (3 Eliminado nunca llega) |
| `type` | `{ id: 1 \| 2, name }` | `type` | 1 Sistema, 2 Clínica; no cambia |

Las respuestas de `POST /roles/{id}/block` y `/unblock` tienen esta misma forma (contracts/roles-status-service.md).

### Transiciones de estatus

```text
            Bloquear (confirmación, roles:update)
  Activo ───────────────────────────────────────▶ Bloqueado
    ▲  │                                              │
    │  │ Eliminar (014, confirmación, roles:delete)   │ Desbloquear (inmediato, roles:update)
    │  ▼                                              │
    │ Eliminado (no reaparece ni se reactiva)         │
    └─────────────────────────────────────────────────┘
```

- Un role **Bloqueado** no se puede ver en detalle, ni consultar sus permisos, ni modificar ni
  eliminar: la API responde 404 `role_not_found`. Para eliminarlo hay que desbloquearlo.
- Desbloquear devuelve el mismo id, nombre, descripción, tipo, permisos y asignaciones.

## 2. Filtros y selección de la pantalla (`RolePermissionsLocation`)

`features/roles/schemas/rolePermissionsLocation.ts`. Vive en la dirección (constitución III).

```ts
type RolesTypeFilter = 'all' | 'system' | 'clinic';
type RolesStatusFilter = 'active' | 'blocked';

interface RolePermissionsLocation {
  readonly type: RolesTypeFilter;     // por omisión 'all'
  readonly status: RolesStatusFilter; // por omisión 'active'
  readonly roleId: number | null;     // por omisión null
}
```

| Campo | Parámetro | Valores en la dirección | Valor no válido o ausente |
|---|---|---|---|
| `type` | `type` | `sistema` → `system`, `clinica` → `clinic` | `all` |
| `status` | `status` | `bloqueados` → `blocked` | `active` |
| `roleId` | `roleId` | `^[1-9]\d{0,9}$` | `null` |

- `toRolePermissionsSearchParams` omite los valores por omisión; el orden es `type`, `status`,
  `roleId`. Parsear y volver a serializar da la forma canónica, y una dirección distinta de su forma
  canónica se reemplaza (`replace`) sin entrada nueva en el historial.
- `ROLE_TYPE_ID_OF_FILTER`: `system` → 1, `clinic` → 2. `typeFilterOfRoleTypeId(1 | 2)` es la inversa.

### Reglas de cambio (hook `useRolePermissionsLocation`)

| Operación | Resultado | Requisito |
|---|---|---|
| `setType(type)` | `{ type, status, roleId: null }` | FR-007, edge case «cambiar un filtro conserva el otro» |
| `setStatus(status)` | `{ type, status, roleId: null }` | FR-007 |
| `setRoleId(id)` | `{ type, status, roleId: id }` | |
| `selectCreated(role)` | `status: 'active'`; `type` se conserva si es `all` o el del role, si no pasa al del role; `roleId: role.id` | FR-010 |

Toda navegación pasa por la guarda de cambios sin guardar (`useBlocker` en `RolesPage`), igual que
antes con las pestañas (FR-007).

## 3. Lista visible

`rolesOfType(roles, type)`: los roles de la lista del estatus elegido cuyo `type.id` corresponde al
filtro (`all` → todos), en el orden de la API (por nombre). Es exactamente lo que FR-005 pide.

## 4. Qué muestra el detalle (`detailOf`)

Función pura en `rolePermissionsLocation.ts`:

```ts
type RoleDetailView =
  | { readonly kind: 'none' }                          // mensaje de elegir un role
  | { readonly kind: 'loading' }                       // la lista del estatus aún carga
  | { readonly kind: 'active'; readonly roleId: number } // RoleDetailPanel
  | { readonly kind: 'blocked'; readonly role: Role };   // BlockedRoleDetail

detailOf({ location, isLoading, visibleRoles, lastShownRoleId }): RoleDetailView
```

| Situación | Resultado |
|---|---|
| `roleId` es `null` | `none` |
| La lista carga | `loading` |
| El role está en `visibleRoles`, con Activos | `active` |
| El role está en `visibleRoles`, con Bloqueados | `blocked` (con el role de la lista) |
| No está, pero `lastShownRoleId === roleId` y Activos (desapareció mientras estaba abierto) | `active` → `RoleDetailPanel` muestra su «no encontrado» |
| Cualquier otro caso (filtro que no lo incluye, lista con error, Bloqueados) | `none` (FR-011) |

`lastShownRoleId` es estado de `RolesPage` que se ajusta durante el render cuando el role elegido
está visible (research D4).

## 5. Mutación de estatus

```ts
type RoleStatusAction = 'block' | 'unblock';
interface ChangeRoleStatusVariables { readonly roleId: number; readonly action: RoleStatusAction }
```

`useChangeRoleStatus` → `blockRole`/`unblockRole`; en `onSettled` invalida `roleKeys.lists()` (ambos
estatus) y espera a lo sumo `REFRESH_WAIT_MS`.

`describeRoleError` gana `{ kind: 'alreadyInStatus' }` para `role_already_blocked` y
`role_already_active`. `useChangeRoleStatusAction` lo traduce:

| Resultado | Aviso | Severidad | Detalle |
|---|---|---|---|
| 200 | `roles.status.blocked(name)` / `unblocked(name)` | success | se cierra, foco al título |
| 409 ya en ese estatus | `roles.status.alreadyBlocked(name)` / `alreadyActive(name)` | info | se cierra, foco al título |
| 404, 403, red/5xx, otro | `describeRoleError(...).message` | error | sigue abierto; se puede reintentar |

## 6. Claves de consulta

| Clave | Contenido |
|---|---|
| `['roles', 'list']` (`roleKeys.lists()`) | prefijo de las dos listas; lo invalidan crear, guardar, eliminar, bloquear y desbloquear |
| `['roles', 'list', 'active' \| 'blocked']` (`roleKeys.list(status)`) | `GET /roles` (sin parámetro) o `GET /roles?status_id=2` |
| `['roles', 'detail', id, 'permissions']` | sin cambios; nunca se pide para un role bloqueado |
