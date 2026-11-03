# Data Model: Lista de roles y permisos en tabla, como la de Usuarios

**Feature**: `027-roles-grid-list` | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Solo frontend: ninguna entidad nueva en el servidor. Se describen el modelo de dominio que ya existe
(`Role`), el estado navegable de la tabla (que cambia de forma), la vista del detalle (que se decide
de otra manera) y el estado del historial que une las dos pantallas.

## 1. Role (sin cambios de forma)

`features/roles/schemas/role.ts` (`roleSchema`), validado con Zod en la frontera. La tabla usa `id`,
`name`, `type` y `status`; `description` y `createdAt` ya no se muestran en ella (aclaración 1 del
spec) pero siguen en el modelo, porque el detalle y los duplicados los usan.

| Campo | Tipo | Origen (DTO) | Uso en la tabla |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | clave de fila y dirección del detalle |
| `name` | texto 1–50 | `name` | columna Nombre (enlace) |
| `status` | `{ id, name }` | `status` | columna Estatus (1 Activo, 2 Bloqueado; 3 nunca llega) |
| `type` | `{ id: 1 \| 2, name }` | `type` | columna Tipo (1 Sistema, 2 Clínica) |

Las transiciones de estatus (Activo ⇄ Bloqueado, y Activo → Eliminado) no cambian: están en
[025 · data-model §1](../025-roles-type-status-filters/data-model.md).

## 2. Estado de la tabla (`RolePermissionsLocation`)

`features/roles/schemas/rolePermissionsLocation.ts`. Vive en la dirección (constitución III) y
sustituye a `{ type, status, roleId }` de la 025.

```ts
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

type RolesTypeFilter = 'all' | 'system' | 'clinic';
type RolesStatusFilter = 'active' | 'blocked';

interface RolePermissionsLocation {
  readonly type: RolesTypeFilter;     // por omisión 'all'
  readonly status: RolesStatusFilter; // por omisión 'active'
  readonly page: number;              // desde 1; por omisión 1
  readonly pageSize: PageSize;        // por omisión 10
}
```

| Campo | Parámetro | Valores en la dirección | Valor no válido o ausente |
|---|---|---|---|
| `type` | `type` | `sistema` → `system`, `clinica` → `clinic` | `all` |
| `status` | `status` | `bloqueados` → `blocked` | `active` |
| `page` | `page` | `^[1-9]\d{0,14}$` | `1` |
| `pageSize` | `page_size` | `10`, `25`, `50` | `10` |

- `toRolePermissionsSearchParams` omite los valores por omisión; el orden es `type`, `status`,
  `page`, `page_size`. Parsear y volver a serializar da la forma canónica, y una dirección distinta
  de su forma canónica se reemplaza (`replace`) sin entrada nueva en el historial. Nunca lanza.
- `roleId` **no** es parte de la forma canónica. `legacyRoleIdOf(params): number | null` lo lee solo
  para redirigir un enlace antiguo (`^[1-9]\d{0,9}$`; `007` y `abc` dan `null`). La misma regla vale
  para `parseRoleId(value)`, que valida el `:roleId` de `/roles/:roleId`.
- `ROLE_TYPE_ID_OF_FILTER` (`system` → 1, `clinic` → 2) y `typeFilterOfRoleTypeId` no cambian.

### Reglas de cambio (hook `useRolePermissionsLocation`)

| Operación | Resultado | Requisito |
|---|---|---|
| `setType(type)` | `{ type, status, page: 1, pageSize }` | FR-007 |
| `setStatus(status)` | `{ type, status, page: 1, pageSize }` | FR-007 |
| `setPage(page, { replace? })` | `{ type, status, page, pageSize }` | FR-004, FR-018 |
| `setPageSize(size)` | `{ type, status, page: 1, pageSize: size }`; un tamaño fuera de 10/25/50 se vuelve 10 | FR-008 |

El hook devuelve además `search`: la dirección canónica como texto (`''` o, por ejemplo,
`?type=sistema&page=2`), que se entrega al detalle (§6). Ya no ofrece `setRoleId` ni `selectCreated`.

## 3. La página que se ve (derivada, sin estado propio)

Funciones puras en `rolePermissionsLocation.ts`, sobre la lista del estatus elegido (D4):

| Función | Resultado |
|---|---|
| `rolesOfType(roles, type)` | los roles del tipo, en el orden de la API (sin cambios) |
| `lastPageOf(total, pageSize)` | `max(1, ceil(total / pageSize))` |
| `pageOfRoles(roles, page, pageSize)` | `roles.slice((page - 1) * pageSize, page * pageSize)` |
| `pageOfRole(roles, roleId, pageSize)` | `floor(índice / pageSize) + 1`, o `1` si el role no está |
| `emptyRolesMessage(type, status)` | el texto del vacío (tabla de abajo) |

- Una página posterior a la última (`datos cargados y sin refrescar && page > lastPageOf(total,
  pageSize)`) se corrige con `setPage(última, { replace: true })`; mientras carga o se refresca no se
  corrige nada, para no juzgar con una lista vieja. Mientras tanto la tabla se pinta en la última página.
- La zona de la tabla muestra `rowCount = total` (los roles que cumplen los dos filtros) y solo las
  filas de `pageOfRoles(...)`.

| Estatus | Tipo | Texto del vacío (`messages.roles.list`) |
|---|---|---|
| Activos | Todos | `emptyAll` |
| Activos | Sistema | `emptySistema` |
| Activos | Clínica | `emptyClinica` |
| Bloqueados | cualquiera | `emptyBlocked` |

## 4. Fila de la tabla (derivada al pintar)

| Celda | Origen |
|---|---|
| Nombre | `role.name`, enlace a `/roles/{role.id}` con `state={{ listSearch }}` |
| Estatus | `role.status.id`: 1 → `list.status.active`, 2 → `list.status.blocked` |
| Tipo | `filters.type[typeFilterOfRoleTypeId(role.type.id)]` |
| Permisos | con Activos y `counts.get(role.id)` = n → `list.permissionsCount(n)`; con Bloqueados, o si `counts` no lo tiene (carga o falla) → `list.noValue` («—») |

`counts` es el `ReadonlyMap<number, number>` de `useRolePermissionCounts(ids)`, que recibe solo los
ids de la página (y `[]` con Bloqueados).

## 5. Vista del detalle (`RoleView`)

`features/roles/schemas/roleView.ts`. Sustituye a `RoleDetailView` y `detailOf` de la 025.

```ts
type RoleView =
  | { readonly kind: 'loading' }                          // alguna lista aún carga
  | { readonly kind: 'error' }                            // una lista falló: reintentar
  | { readonly kind: 'active'; readonly role: Role }      // RoleDetailPanel; el h1 usa role.name
  | { readonly kind: 'blocked'; readonly role: Role }     // BlockedRoleDetail
  | { readonly kind: 'notFound' };                        // «Este role ya no existe»

resolveRoleView({ roleId, active, blocked, shownAsActive }): RoleView
```

`active` y `blocked` son el estado de cada consulta (`pending` | `error` | datos); `blocked` es
`undefined` mientras no se ha pedido. La tabla de decisión está en
[research.md · D5](research.md#d5--qué-muestra-el-detalle-una-función-pura-sobre-las-dos-listas).
`useRoleView(roleId)` pide la lista de bloqueados solo cuando hace falta y recuerda, con el patrón de
React de ajustar estado en el render, el último `roleId` que se mostró como activo
(`shownAsActive = lastActiveRoleId === roleId`).

## 6. Estado del historial (`RoleDetailLocationState`)

```ts
interface RoleDetailLocationState {
  readonly listSearch?: string; // '' o '?type=sistema&status=bloqueados&page=2&page_size=25'
}
```

`parseRoleDetailState(state: unknown)` (Zod; nunca lanza; lo que no es válido se descarta):

| Campo | Regla |
|---|---|
| `listSearch` | cadena ≤ 300 caracteres que empieza por `?` y cuyas claves son solo `type`, `status`, `page` y `page_size` |

| Quién escribe `listSearch` | Cuándo |
|---|---|
| El enlace del nombre en la tabla | siempre, con el `search` canónico de la tabla |
| El redireccionamiento de un enlace antiguo | el `type` y el `status` de la dirección antigua |
| Crear y duplicar | el `search` que muestra el role nuevo (§7) |

`RoleDetailPage` lo usa para «Volver al listado» (`/roles${listSearch ?? ''}`) y como base de los
retornos tras bloquear, desbloquear y eliminar.

## 7. Qué tabla muestra un role nuevo (`locationAfterCreate`)

```ts
locationAfterCreate(location, role, activeRoles): RolePermissionsLocation
```

| Parte | Resultado |
|---|---|
| `status` | siempre `active` (el role nace activo) |
| `type` | el actual si es `all` o el del role; si no, el del role |
| `pageSize` | el actual |
| `page` | `pageOfRole(rolesOfType(activeRoles, type), role.id, pageSize)`; `1` si no está en `activeRoles` |

`activeRoles` sale de la caché de TanStack Query (`useRevealRole`), leída al llamar, cuando la
mutación ya refrescó las listas.

## 8. Claves de consulta y peticiones por pantalla

Las claves no cambian (`roleKeys.list(status)`, `roleKeys.permissions(id)`).

| Pantalla | Peticiones |
|---|---|
| Tabla con Activos | `GET /roles` y, por cada fila de la página, `GET /roles/{id}/permissions` |
| Tabla con Bloqueados | `GET /roles?status_id=2`; ninguna de permisos |
| Detalle de un role activo | `GET /roles` (de la caché si está) y los permisos del role y los catálogos, como hoy |
| Detalle de un role bloqueado | `GET /roles` y `GET /roles?status_id=2`; ninguna de permisos |
| Crear, guardar, eliminar, bloquear, desbloquear | invalidan `roleKeys.lists()` (ambos estatus), sin cambios |
