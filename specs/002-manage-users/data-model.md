# Modelo de datos: Administración de Usuarios y Roles de Sistema

**Feature**: `002-manage-users` | **Fecha**: 2026-10-18 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

El Backoffice no persiste datos. Este modelo describe los modelos de dominio del frontend que añade la 002, derivados de las respuestas del servicio de usuarios ([contracts/users-service.md](contracts/users-service.md)), del estado de la URL y de los formularios. Como en la 001 (constitución II), cada entidad tiene un único esquema Zod y la capa `api` de la feature convierte los DTO (`snake_case`) a modelos de dominio (`camelCase`). Todo lo nuevo vive en `features/users`, salvo las capacidades (`features/auth/policy`).

## Entidades

### `PlatformUser` y `UserStatus` (ya existen, feature `users`)

Sin cambios: ver [../001-auth-session-profile/data-model.md](../001-auth-session-profile/data-model.md). La 002 los reutiliza para el listado, la búsqueda, el detalle y las respuestas de las mutaciones. Corresponde a *Usuario de MailySoft* de la spec. Se decide siempre por `status.id` (`USER_STATUS.ACTIVE` 1, `BLOCKED` 2, `DELETED` 3).

### `UserPage`

Una página del listado (U1). Solo contiene usuarios activos.

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `items` | lista de `PlatformUser` | `items` | Orden fijo del servicio; puede estar vacía. |
| `total` | entero ≥ 0 | `total` | Usuarios activos en total. |
| `page` | entero ≥ 1 | `page` | Página devuelta (empieza en 1). |
| `pageSize` | entero 1 a 100 | `page_size` | |
| `pages` | entero ≥ 0 | `pages` | `0` si no hay usuarios activos. |

### `Role`

Un role del catálogo de la plataforma (R1 y U10). No es `AccessRole` de la 001 (que trae permisos y sale de `me`).

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | |
| `name` | texto no vacío (hasta 50) | `name` | Se muestra tal cual. |
| `description` | texto o nulo (hasta 500) | `description` | |
| `createdAt` | fecha y hora con zona | `created_at` | ISO 8601. |
| `status` | `{ id, name }` | `status` | El servicio solo devuelve roles activos. |

### `UserRoleAssignment`

Resultado de asignar un role (U11): `{ userId: entero ≥ 1, role: { id: entero ≥ 1, name: texto } }` desde `{ user_id, role }`.

### `UsersLocation` (estado de la URL de `/users`)

Unión discriminada por `mode`, producida por `parseUsersSearchParams(URLSearchParams)` (Zod; [contracts/app-routes.md](contracts/app-routes.md)):

| `mode` | Campos | Cuándo |
|---|---|---|
| `list` | `page` (entero ≥ 1, por defecto 1), `pageSize` (10, 25 o 50, por defecto 10) | Sin `email` en la URL. |
| `search` | `email` (texto recortado, no vacío) | Con `email` en la URL; descarta `page` y `page_size`. |

Valores inválidos se sustituyen por los de por defecto. Constantes: `PAGE_SIZE_OPTIONS = [10, 25, 50]`, `DEFAULT_PAGE_SIZE = 10`.

### `UserDetailLocationState`

Estado de navegación hacia el detalle, validado con Zod (un valor ajeno o inválido se ignora):

| Campo | Tipo | Reglas |
|---|---|---|
| `listSearch` | texto opcional | De hasta 300 caracteres; debe empezar por `?` y solo contener las claves `page`, `page_size` y `email`; si no, se descarta. |
| `rolesNotAssigned` | lista opcional de `{ id, name }` | Roles que no se pudieron asignar tras un alta con fallo parcial: `id` entero ≥ 1, `name` de 1 a 50 caracteres y como mucho 100 elementos; una lista con un elemento inválido se descarta entera. |

### Formularios

Los valores del formulario son `camelCase`; `toCreateUserBody` y `toUpdateUserBody` los convierten a los cuerpos de la API. No hay transformaciones de Zod en los esquemas del formulario (los tipos de entrada y de salida coinciden).

**`CreateUserFormValues`** (U4 y U11):

| Campo | Tipo | Reglas (mensajes en `es.ts`) |
|---|---|---|
| `email` | texto | Recortado; obligatorio; hasta 255; patrón de correo de la API ([contracts/users-service.md](contracts/users-service.md)). El servicio lo guarda en minúsculas. |
| `firstName` | texto | Recortado; obligatorio; hasta 100. |
| `paternalLastName` | texto | Recortado; obligatorio; hasta 100. |
| `maternalLastName` | texto | Recortado; hasta 100; vacío = sin apellido materno (se omite del cuerpo). |
| `password` | texto | Obligatoria (no vacía); sin recortar; no se registra ni se conserva fuera del formulario (D13). |
| `roleIds` | lista de enteros ≥ 1 | Al menos uno; solo ids del catálogo cargado. |

**`EditUserFormValues`** (U5): `firstName`, `paternalLastName` y `maternalLastName` con las mismas reglas. El correo se muestra como dato de solo lectura y no forma parte del formulario.

Mapeo de errores del servicio a campos: `email`, `first_name`, `paternal_last_name`, `maternal_last_name` y `password` → `email`, `firstName`, `paternalLastName`, `maternalLastName` y `password`; cualquier otro nombre (`body`, `auth0_id`, desconocido) es un error general del formulario. El mapa es un `Map` (sin aserciones `as`): con un objeto, un campo llamado `constructor` encontraría una función.

### `CreateUserOutcome`

Resultado de `useCreateUser` cuando el usuario **sí** se creó (si no, la mutación falla con el `ApiError` de U4):

| `kind` | Campos | Significado |
|---|---|---|
| `created` | `user`, `assigned` (roles) | Usuario creado y todos los roles asignados. |
| `partial` | `user`, `assigned`, `failed` (lista de `{ role, error }`) | Usuario creado; falló la asignación de al menos un role (FR-023). No hay compensación. |

### `UserCapabilities`

Resultado de la función pura `getUserCapabilities(access)` (`features/auth/policy`), que solo usa `can()`; `app` lo entrega a las pantallas.

| Campo | Permisos (además de `users:read`) |
|---|---|
| `canCreate` | `users:write` + `users:update` + `roles:read` |
| `canEdit` | `users:update` |
| `canAddRoles` | `users:update` + `roles:read` |
| `canRemoveRoles` | `users:update` |
| `canChangeStatus` (bloquear, desbloquear, reactivar) | `users:update` |
| `canDelete` | `users:delete` |

### `UserAction` y acciones disponibles

`UserAction`: `edit`, `addRole`, `removeRole`, `block`, `unblock`, `delete`, `reactivate`. La función pura `getAvailableActions({ statusId, capabilities, isSelf })` devuelve el conjunto de acciones que se ofrecen: las que admite el estatus **y** permite la capacidad, sin `block`, `delete`, `addRole` ni `removeRole` si `isSelf`.

| Estatus | Acciones que admite |
|---|---|
| Activo (1) | `edit`, `addRole`, `removeRole`, `block`, `delete` |
| Bloqueado (2) | `unblock` |
| Eliminado (3) | `reactivate` |
| Otro | ninguna |

### Máquina de estados del estatus del usuario

| Desde | Acción | Hacia | Notas |
|---|---|---|---|
| Activo | Bloquear | Bloqueado | Bloquea la cuenta de acceso; sale del listado. |
| Bloqueado | Desbloquear | Activo | Habilita la cuenta; exige que exista. Vuelve al listado. |
| Activo | Eliminar | Eliminado | Eliminación lógica; deja la cuenta bloqueada y marcada; sale del listado; conserva datos y roles. |
| Eliminado | Reactivar | Activo | Habilita la cuenta; exige que exista; recupera datos y roles. |

Bloquear a un eliminado o eliminar a un bloqueado no existe: el servicio lo rechaza (`user_deleted`, `user_blocked`); para llegar hay que reactivar o desbloquear primero.

### `UserErrorOutcome` (traducción de `ApiError`)

Función pura `describeUserError(error, operation)` que clasifica un fallo para la interfaz ([contracts/users-service.md](contracts/users-service.md), «Errores»):

| `kind` | Cuándo | Efecto |
|---|---|---|
| `field` | `validation_error` con campos, `password_rejected`, `user_email_already_registered`, `auth0_account_already_exists` | Error en el campo del formulario. |
| `form` | `validation_error` sin campo conocido | Error general del formulario. |
| `statusChanged` | `user_deleted`, `user_blocked`, `user_not_active`, `user_already_active` | Aviso y nueva consulta del usuario. |
| `alreadyDone` | `user_role_already_associated`, `user_role_not_associated` | Aviso y nueva consulta de los roles. |
| `notFound` | `user_not_found` | Pantalla o aviso de usuario inexistente. |
| `roleUnavailable` | `role_not_found` | Aviso y nueva consulta del catálogo. |
| `accountMissing` | `auth0_account_not_found` | Aviso: la persona no tiene cuenta de acceso. |
| `identityUnavailable` | `identity_provider_unavailable` | Aviso reintentable; nada cambió. |
| `identityRejected` | `identity_provider_error` | Aviso; nada cambió. |
| `retryable` | red, tiempo agotado, 5xx | Aviso reintentable. |
| `forbidden` | `permission_denied` (403) | Ninguno propio: el aviso global de la 001 ya informó (también el de las mutaciones); las pantallas no lo repiten. |
| `unexpected` | cualquier otro | Aviso genérico. |

Forma del resultado: `{ kind, message, fields?, hint? }`. `message` sale de `messages.users.errors` (nunca del `message` del servicio, salvo el texto de un campo de un `validation_error`); `fields` (solo en `field`) asocia cada campo del formulario (`email`, `firstName`, `paternalLastName`, `maternalLastName`, `password`) con su texto; `hint` vale `searchEmail` cuando el correo ya está registrado (la pantalla ofrece buscar ese correo). Los textos de `accountMissing`, `identityUnavailable` e `identityRejected` dependen de `operation` (desbloquear o reactivar; crear u otra).

El `403` (`permission_denied`) lo atiende el aviso global de la 001, que `createQueryClient` aplica a consultas y mutaciones; `describeUserError` solo lo clasifica como `forbidden` para que los componentes no muestren un segundo aviso.

## Claves de TanStack Query y efecto de las mutaciones (constitución III)

Las claves salen de factorías (`userKeys`, `roleKeys`); nunca se escriben a mano en los componentes.

| Factoría | Clave | Datos |
|---|---|---|
| `userKeys.list({ page, pageSize })` | `['users', 'list', { page, pageSize }]` | `UserPage` (U1); `placeholderData: keepPreviousData` para no parpadear al cambiar de página |
| `userKeys.search(email)` | `['users', 'search', <correo recortado en minúsculas>]` | `PlatformUser` (U2); un `404` es un resultado vacío, no un error de la consulta |
| `userKeys.detail(id)` | `['users', 'detail', id]` | `PlatformUser` (U3) |
| `userKeys.roles(id)` | `['users', 'detail', id, 'roles']` | `Role[]` (U10), solo con el usuario activo |
| `roleKeys.catalog()` | `['roles', 'catalog']` | `Role[]` (R1); `staleTime` de 5 minutos y solo se consulta cuando se necesita (alta o «Agregar role») |

| Mutación | Efecto en la caché |
|---|---|
| Crear (usuario y roles) | Guarda `detail(id)` y `roles(id)` con lo asignado; invalida todos los `list` y `search` |
| Editar | Guarda `detail(id)`; invalida los `list` y `search` |
| Bloquear | Guarda `detail(id)`; quita `roles(id)`; invalida los `list` y `search` |
| Eliminar | Invalida `detail(id)` (el servicio responde `204` sin cuerpo, así que no hay usuario que guardar) y espera a que se vuelva a consultar; después quita `roles(id)`; invalida los `list` y `search` |
| Desbloquear o reactivar | Guarda `detail(id)`; invalida `roles(id)` y los `list` y `search` |
| Agregar o quitar un role | Invalida `roles(id)` |

No hay actualizaciones optimistas (constitución III: solo donde el spec las justifique): la pantalla cambia cuando el servicio responde. La mutación del alta usa `gcTime: 0` y se reinicia al terminar para no retener la contraseña en memoria (D13). Al cerrar sesión se vacía toda la caché (001).

## Trazabilidad con los requisitos

| Entidad o regla | Requisitos |
|---|---|
| `UserPage`, `UsersLocation`, claves de lista | FR-001, FR-002, FR-003, FR-004, FR-017 |
| Búsqueda (`search`) y `404` como resultado vacío | FR-018, SC-007 |
| `CreateUserFormValues`, `toCreateUserBody` | FR-005, FR-006, FR-007 |
| `CreateUserOutcome` | FR-023, SC-009 |
| `EditUserFormValues` | FR-008, FR-014 |
| `Role`, `UserRoleAssignment`, claves de roles | FR-024, FR-009 |
| `UserCapabilities`, `getAvailableActions`, `isSelf` | FR-012, FR-015, FR-019, FR-025 |
| Máquina de estados y mutaciones de estatus | FR-010, FR-020, FR-021, FR-022, SC-008 |
| `UserErrorOutcome` | FR-011, FR-021, SC-006 |
| `UserDetailLocationState` | FR-003 (volver a la misma página), FR-023 |
