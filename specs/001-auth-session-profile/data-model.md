# Modelo de datos: Acceso, Sesión y Perfil del Usuario

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

El Backoffice no persiste datos. Este modelo describe los modelos de dominio del frontend, derivados de las respuestas del servicio de usuarios ([contracts/users-service.md](contracts/users-service.md)) y del estado de sesión. Cada entidad tiene un único esquema Zod (constitución II); la capa `api` de cada feature convierte los DTO (`snake_case`) a modelos de dominio (`camelCase`).

## Entidades

### `PlatformUser` (feature `users`)

Registro de una persona en la plataforma. Corresponde a *Usuario de MailySoft* de la spec.

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | |
| `auth0Id` | texto no vacío | `auth0_id` | Coincide con el `sub` del token que identificó a la persona. |
| `email` | texto | `email` | En minúsculas (lo garantiza el servicio). |
| `firstName` | texto no vacío | `first_name` | |
| `paternalLastName` | texto no vacío | `paternal_last_name` | |
| `maternalLastName` | texto o nulo | `maternal_last_name` | |
| `status` | `{ id: entero, name: texto }` | `status` | Se decide por `id` (ver `UserStatus`), nunca por `name`. |
| `createdAt`, `updatedAt` | fecha y hora con zona | `created_at`, `updated_at` | ISO 8601; solo se formatean en presentación. |

Derivado: `displayName` (encabezado) = `firstName` + `paternalLastName`; `initials` = primeras letras de las dos primeras palabras de `displayName`, en mayúscula. El perfil muestra `firstName`, `paternalLastName`, `maternalLastName` (vacío, «—», si es nulo), `email`, `initials` y los roles activos (aclaración 12). La plataforma no guarda imagen, así que este modelo no tiene campo de imagen.

### `UserStatus` (constantes)

| Constante | `id` | Efecto en el acceso |
|---|---|---|
| `ACTIVE` | 1 | Único que puede entrar. |
| `BLOCKED` | 2 | Denegado: cuenta no activa. |
| `DELETED` | 3 | Denegado: cuenta no activa. |
| cualquier otro id | n/a | Denegado: cuenta no activa. |

### `Role` (feature `roles`)

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | |
| `name` | texto | `name` | La comparación con la lista de autorizados ignora mayúsculas y espacios. |
| `description` | texto o nulo | `description` | |
| `status` | `{ id, name }` | `status` | El servicio solo devuelve roles activos en los listados usados aquí. |
| `createdAt` | fecha y hora | `created_at` | |

### `Permission` (feature `roles`)

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `id` | entero ≥ 1 | `id` | |
| `name` | texto `recurso:acción` | `name` | Patrón `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$` (lo impone el servicio). |
| `status` | `{ id, name }` | `status` | |

Derivado: `PermissionKey` = `{ resource, action }` al separar el nombre por `:`; `action` ∈ `read`, `write`, `update`, `delete` para las secciones de este producto.

### `OperatorAccess` (feature `auth`)

Resultado de la resolución de acceso (D7). Se guarda solo en la caché de TanStack Query (clave `accessKeys.operator(sub)`), nunca en almacenamiento.

| Campo | Tipo | Notas |
|---|---|---|
| `user` | `PlatformUser` | |
| `roles` | `Role[]` | Roles activos del usuario. |
| `authorizedRoles` | `Role[]` | Subconjunto con nombre en `AUTHORIZED_ROLE_NAMES`. |
| `permissions` | conjunto de texto de solo lectura | Unión de los permisos activos de `authorizedRoles`; puede estar vacío. |

### `OperatorClaims` (feature `auth`)

Reclamaciones del token de Auth0 que lee la aplicación, validadas con Zod en la frontera (constitución II). En Auth0 solo viven el correo, la contraseña y el identificador de la cuenta: de allí se toman el `sub` y el correo (este solo para mostrar la cuenta en las pantallas de acceso denegado y de comprobación fallida, aclaración 13), y todos los demás datos del operador salen del `PlatformUser` (aclaración 11).

| Campo | Tipo | Reglas |
|---|---|---|
| `sub` | texto no vacío | Identificador de la cuenta; es el `auth0Id` con el que se localiza al `PlatformUser`. |
| `email` | texto opcional | Correo de la cuenta con la que se identificó la persona. No sirve para localizar al usuario ni sustituye al correo del `PlatformUser`; si el token no lo trae, esas pantallas omiten la línea. |

### `AccessDecision` (feature `auth`, función pura `evaluateAccess`)

Unión discriminada por `kind`:

| `kind` | Campos | Cuándo |
|---|---|---|
| `granted` | `access: OperatorAccess` | Usuario activo con al menos un role autorizado activo. |
| `denied` | `reason` | `not_registered`, `inactive_account` o `no_authorized_role`. |

Estado de la guarda (derivado de la query): `resolving` (sin datos y cargando), `failed` (sin datos y con error: FR-005), `denied`, `granted`; con datos previos y un error de recomprobación, se mantiene el último estado.

### `SectionDefinition` (registro de navegación, `app/navigation`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | `users`, `subscription-types` o `clinics`. |
| `path` | texto | Raíz de la sección. |
| `labelKey` | clave de mensaje | Texto en español del módulo de mensajes. |
| `resource` | texto | `users`, `subscriptions` o `tenants` (aclaración 3). |

El registro solo contiene las secciones implementadas (FR-009); en la 001 está vacío y las pruebas inyectan secciones de ejemplo. El aviso de "sin permisos asignados" (FR-018) no depende del registro: se evalúa sobre los tres recursos conocidos (`users`, `subscriptions` y `tenants`) y aparece solo si el operador no tiene `read` en ninguno.

### Correspondencia acción → permiso (aclaración 3)

| Acción de la interfaz | Permiso |
|---|---|
| Ver sección, listado y detalle | `<recurso>:read` |
| Crear | `<recurso>:write` |
| Modificar | `<recurso>:update` |
| Eliminar | `<recurso>:delete` |

`can(access, { resource, action })` es la única función que decide; ningún componente compara nombres de role ni de permiso sueltos. Ver una sección exige `read`; sin `read` no se ofrece ninguna otra acción de esa sección.

### Constantes de sesión (`src/features/auth/config/session.ts`)

| Constante | Valor | Requisito |
|---|---|---|
| `IDLE_TIMEOUT_MS` | 900 000 (15 min) | FR-020 |
| `IDLE_PROMPT_BEFORE_MS` | 60 000 (1 min) | FR-020 |
| `ACCESS_RECHECK_INTERVAL_MS` | 300 000 (5 min) | FR-019 |
| `ACCESS_CHECK_ATTEMPT_TIMEOUT_MS` | 8 000 (8 s) | FR-005, SC-011: presupuesto de cada intento de la cadena usuario → roles → permisos; con 3 intentos y esperas de 1 y 2 s el fallo aparece a los 27 s, por debajo del máximo de 30 s |
| `AUTHORIZED_ROLE_NAMES` (en `features/auth/policy`) | `Administrator`, `Developer`, `Marketing`, `Billing` | FR-004 |

### Sesión: motivos y avisos

| Tipo | Valores |
|---|---|
| `SessionEndReason` | `logout`, `idle`, `expired` |
| `AccessNotice` (aviso en la pantalla de acceso) | `none`, `idle`, `expired`, `cancelled`, `idpError` |

## Máquina de estados de la sesión

| Desde | Evento | Hacia | Efecto |
|---|---|---|---|
| `signed_out` | "Iniciar sesión" | `authenticating` | Redirección a Auth0 con `appState.returnTo`. |
| `authenticating` | callback correcto | `resolving` | Se ejecuta `/callback` y se resuelve el acceso (D7). |
| `authenticating` | error o cancelación del proveedor | `signed_out` | Aviso `idpError` o `cancelled` en `/access`. |
| `resolving` | `granted` | `granted` | Navega a `returnTo` o a `/`. |
| `resolving` | `denied` | `denied` | Pantalla de acceso denegado con motivo. |
| `resolving` | error sin datos o sin respuesta | `check_failed` | Reintentar o cerrar sesión (FR-005); como máximo a los 30 s de iniciada la comprobación (SC-011). |
| `granted` | recomprobación `denied` | `denied` | Se retira el contenido protegido (FR-021). |
| `denied` | recomprobación `granted` | `granted` | Se recupera el acceso sin volver a identificarse. |
| `granted` | recomprobación con permisos distintos | `granted` | Se actualizan secciones y acciones (FR-021). |
| `granted` | 14 min sin actividad | `idle_warning` | Diálogo de aviso con cuenta atrás (FR-020). |
| `idle_warning` | "Continuar" o actividad | `granted` | Reinicia el conteo. |
| `idle_warning` | 15 min sin actividad | `signed_out` | Cierre con motivo `idle`, destino `/access/idle`. |
| cualquiera con sesión | "Cerrar sesión" | `signed_out` | Cierre con motivo `logout`, destino `/access`. |
| `granted` | renovación imposible (`login_required`, `MissingRefreshTokenError`, `invalid_grant`) | `signed_out` | Aviso `expired` y retorno a la pantalla de origen (FR-013). |
| cualquiera | `session-ended` desde otra pestaña | `signed_out` | Vaciar caché y navegar a la pantalla de acceso (User Story 3, escenario 4). |

## Trazabilidad con los requisitos

| Entidad o regla | Requisitos |
|---|---|
| `PlatformUser`, `UserStatus` | FR-003, FR-004, FR-012 |
| `Role`, `AUTHORIZED_ROLE_NAMES` | FR-004, FR-017 |
| `Permission`, `PermissionKey`, correspondencia acción → permiso | FR-009, FR-017, FR-018 |
| `OperatorClaims`, `OperatorAccess`, `AccessDecision` | FR-003, FR-004, FR-005, FR-021 |
| Constantes y máquina de sesión | FR-005, FR-010, FR-013, FR-019, FR-020 |
