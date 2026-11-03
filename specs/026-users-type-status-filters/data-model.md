# Data Model: Lista de usuarios con filtros de Tipo y Estatus

**Feature**: `026-users-type-status-filters` | **Date**: 2026-11-03 | **Plan**: [plan.md](plan.md)

El Backoffice no guarda datos: estos son los modelos de dominio en los que se convierte la respuesta de
la API (constitución II) y el estado de la pantalla que vive en la dirección (constitución III).

## 1. `UserListItem` (nuevo, `schemas/userListItem.ts`)

Un usuario de la lista: todo `PlatformUser` más los tipos de sus roles Activos.

| Campo | Tipo | Origen (DTO) | Regla |
|---|---|---|---|
| *(todos los de `PlatformUser`)* | — | `UserRead` | Sin cambios: `id`, `auth0Id`, `email`, `firstName`, `paternalLastName`, `maternalLastName`, `status`, `createdAt`, `updatedAt` |
| `roleTypes` | `readonly RoleType[]` | `role_types` | **Obligatorio** (D2). Sin repetidos y ordenado por `id`, como lo manda la API; puede ser `[]` |

`RoleType = { id: number; name: string }` (entero y texto no vacío), la misma forma que el `type` de un
role. El Backoffice no reordena ni deduplica: confía en el contrato y solo valida la forma.

**Validación**: `userListItemSchema = platformUserDtoSchema.extend({ role_types: z.array(roleTypeSchema) })`
con la transformación de `PlatformUser` más `roleTypes` (D6). Si falta `role_types`, la respuesta
entera se rechaza y la tabla muestra el error con reintento.

**Derivado — texto del tipo** (`describeUserType(roleTypes)`, D7):

| `roleTypes` (ids) | Texto |
|---|---|
| `[]` | «—» (texto nuevo `messages.users.list.noType`, igual que `users.detail.emptyValue`) |
| `[1]` | «Sistema» |
| `[2]` | «Clínica» |
| `[1, 2]` | «Sistema y Clínica» |
| con un id desconocido | los textos conocidos y el `name` de la API para el resto: «A y B», o «A, B y C» con tres o más |

## 2. `UserPage` (cambia, `schemas/userPage.ts`)

| Campo | Cambio |
|---|---|
| `items` | De `PlatformUser[]` a `UserListItem[]` |
| `total`, `pages` | Mismo tipo; ahora cuentan solo los usuarios que cumplen los filtros (`pages` = 0 si no hay ninguno) |
| `page`, `pageSize` | Sin cambio |

## 3. Filtros y `UsersLocation` (cambia, `schemas/usersLocation.ts`)

```text
UsersTypeFilter   = 'all' | 'system' | 'clinic'      // por omisión 'all'
UsersStatusFilter = 'active' | 'blocked'             // por omisión 'active'

UsersLocation =
  | { mode: 'list';   page: number; pageSize: 10 | 25 | 50; type; status }
  | { mode: 'search'; email: string;                       type; status }
```

**En la dirección** (D3), omitiendo lo que es por omisión:

| Parámetro | Valores | Se lee como | No válido o ausente |
|---|---|---|---|
| `type_id` | `1` / `2` | `system` / `clinic` | `all` |
| `status_id` | `2` | `blocked` | `active` (incluido `1`, que es el valor por omisión y no se escribe) |
| `page` | entero ≥ 1 | número | 1 |
| `page_size` | 10, 25 o 50 | número | 10 |
| `email` | texto no vacío | modo búsqueda | modo lista |

- `parseUsersSearchParams` nunca lanza; `toUsersSearchParams` es su inverso y produce la forma canónica
  (orden fijo de parámetros). Un enlace anterior (`?page=3&page_size=25`) ya es canónico (FR-010).
- En modo búsqueda se escriben `email`, `type_id` y `status_id`; `page` y `page_size` no (D4).

**Transiciones** (`useUsersLocation`):

| Acción | Resultado |
|---|---|
| `setType(t)` / `setStatus(s)` en modo lista | Mismo `pageSize` y el otro filtro; `page` = 1 (FR-008) |
| `setType(t)` / `setStatus(s)` en modo búsqueda | Sale de la búsqueda: modo lista, `page` = 1, tamaño por omisión, ambos filtros (D4) |
| `setPage(p)` | Mismo tamaño y filtros |
| `setPageSize(n)` | `page` = 1, mismos filtros; un tamaño no ofrecido → 10 |
| `searchEmail(e)` | Modo búsqueda con los filtros actuales |
| `clearSearch()` | Modo lista, `page` = 1, tamaño por omisión, los filtros que había (FR-011) |
| Dirección con valores no válidos | Se reemplaza por su forma canónica con `replace` (sin entrada en el historial) |

**Hacia la API** (`listUsers`): `status` → `status_id` 1 | 2 (siempre); `type` → `role_type_id` 1 | 2,
o nada con `all` (D1).

## 4. Clave de consulta (cambia, `hooks/userKeys.ts`)

```text
UserListParams = { page, pageSize, type: UsersTypeFilter, status: UsersStatusFilter }
userKeys.list(params) = ['users', 'list', params]     // bajo userKeys.lists()
```

Las invalidaciones existentes (`refreshUser` → `userKeys.lists()`) alcanzan todas las combinaciones;
`refreshAfterRoleChange` pasa a invalidar también `userKeys.lists()`, y `useUsersPage` vuelve a pedir
la página al montarse (`refetchOnMount: 'always'`) (D5).

## 5. Estados de la zona de la tabla

| Estado | Condición | Se muestra | Anuncio (`LiveStatus`) |
|---|---|---|---|
| Cargando | primera carga o cambio de filtro/página | la tabla anterior (si la hay) con el indicador del DataGrid | — |
| Error | falla la consulta y no hay datos | `ErrorState` con reintento | (el del `ErrorState`) |
| Vacío | `total` = 0 | `emptyUsersMessage(type, status)`; «Crear usuario» solo con `active` y permiso | el mismo texto |
| Con datos | `items` no vacío | filas con Nombre (+ chip si no está activo), Correo, Tipo y Fecha de alta | «Mostrando X a Y de Z usuarios.» |
| Página inexistente | `items` vacío, `pages` > 0 y `page` > `pages` | se corrige a la última página con `replace` | — |

Título, buscador, filtros y «Crear usuario» quedan fuera de esa zona y nunca se ocultan (FR-013, US3-8).

## 6. Simulador (MSW, `test/handlers/usersDirectory`)

`model.listUsers(page, pageSize, { statusId, roleTypeId })` sustituye a `listActiveUsers`:

1. Usuarios con `statusId` igual al pedido (1 o 2); los Eliminados nunca.
2. Con `roleTypeId`, solo los que tienen al menos un role **Activo** de ese tipo.
3. Orden por nombre como hoy; página y totales sobre lo filtrado.
4. `role_types` de cada usuario: tipos distintos de sus roles Activos, ordenados por `id`, con el
   nombre del catálogo de tipos.

El manejador responde 422 (`validation_error`) con `status_id` o `role_type_id` fuera de {1, 2}, como
ya hace con `page` y `page_size`.
