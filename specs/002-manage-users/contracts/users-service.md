# Contrato consumido: servicio de usuarios (administración de usuarios)

**Feature**: `002-manage-users` | **Fecha**: 2026-10-18 | **Spec**: [../spec.md](../spec.md)

Resume lo que consume la feature 002 y completa el contrato de la 001 ([../../001-auth-session-profile/contracts/users-service.md](../../001-auth-session-profile/contracts/users-service.md): condiciones generales, token, permisos, formato de error y la consulta `me`). La fuente de verdad es el repositorio del servicio (copia local `C:\maily\code\mailySoft-usuarios`, `origin` `Quint4n4/mailySoft-usuarios`): `specs/004-users/contracts/openapi-users.yaml` y `error-catalog.md`, `specs/006-users-roles/contracts/openapi-user-roles.yaml` y `error-catalog.md`, `specs/002-roles/contracts/openapi-roles.yaml`, y los cambios de la spec `008-auth0-access-control` (`openapi-access-control.yaml`, `permission-matrix.md`, `error-catalog.md`). Verificado leyendo esos archivos el 2026-10-18. Los esquemas Zod se escriben a mano a partir de este documento (research D4 de esta feature).

## Condiciones que cambian respecto a la 001

| Tema | Valor |
|---|---|
| Permisos | Cada operación de abajo exige el permiso indicado; el servicio lo lee de su base en cada petición y responde `403 permission_denied` si falta. La interfaz ya no ofrece lo que el operador no puede hacer (ver [app-routes.md](app-routes.md)), pero el `403` sigue manejándose (aviso sin cerrar sesión, FR-014 de la 001). |
| Autoprotección | El servicio **no** impide que un operador se bloquee, se elimine o se cambie los roles a sí mismo: esa regla es solo de interfaz (spec, FR-012). |
| Estatus | `{ id, name }`; decidir siempre por `id` (1 Activo, 2 Bloqueado, 3 Eliminado). Un estatus añadido a mano se trata como «no activo, sin acciones» y sus conflictos llegan como `user_not_active`. |
| Cuenta de acceso | Crear, bloquear, desbloquear, eliminar y reactivar también actualizan la cuenta del usuario en Auth0 dentro de la misma operación, «todo o nada»: si Auth0 falla, el usuario no cambia. Modificar datos **no** se comunica con Auth0. |
| Orden de comprobaciones | Identidad → permiso → validación → existencia y reglas de negocio → Auth0. Por eso un `403` llega antes que un `422` o un `404`. |

## Operaciones

Cada fila indica el permiso, la entrada, la respuesta correcta y los errores propios de la operación (los códigos se explican en «Errores»). Todas pueden devolver además `401`, `403`, `500` y `503 authentication_unavailable`.

### Usuarios

| Id | Operación | Permiso | Entrada | Respuesta | Errores propios |
|---|---|---|---|---|---|
| U1 | `GET /api/v1/users` | `users:read` | `page` (entero ≥ 1, por defecto 1) y `page_size` (1 a 100, por defecto 50; la interfaz solo pide 10, 25 o 50) | `200` `UserPage` | `422` |
| U2 | `GET /api/v1/users/by-email` | `users:read` | `email` (1 a 255 caracteres; el servicio ignora mayúsculas y espacios sobrantes) | `200` `UserRead` con cualquier estatus | `404 user_not_found`; `422` (vacío o sin formato de correo) |
| U3 | `GET /api/v1/users/{user_id}` | `users:read` | `user_id` entero ≥ 1 | `200` `UserRead` con cualquier estatus; **no incluye los roles** | `404 user_not_found`; `422` |
| U4 | `POST /api/v1/users` | `users:write` | `UserCreate`: `email`, `password`, `first_name`, `paternal_last_name`, `maternal_last_name?`. **No** admite `auth0_id` (lo asigna Auth0) | `201` `UserRead` (sin contraseña) y `Location` | `409 user_email_already_registered` (con cualquier estatus del titular) o `auth0_account_already_exists`; `422 validation_error` o `password_rejected`; `502 identity_provider_error`; `503 identity_provider_unavailable` |
| U5 | `PATCH /api/v1/users/{user_id}` | `users:update` | `UserUpdate`: al menos uno de `first_name`, `paternal_last_name`, `maternal_last_name`. La interfaz **no envía `email`** (aclaración 4 de la spec) | `200` `UserRead` | `404`; `409 user_deleted`, `user_blocked` o `user_not_active` (solo se modifica a un usuario activo); `422` |
| U6 | `DELETE /api/v1/users/{user_id}` | `users:delete` | — | `204` sin cuerpo | `404`; `409 user_deleted`, `user_blocked` (hay que desbloquearlo antes) o `user_not_active`; `502`; `503 identity_provider_unavailable` |
| U7 | `POST /api/v1/users/{user_id}/block` | `users:update` | — | `200` `UserRead` (Bloqueado) | `404`; `409 user_blocked` (ya bloqueado), `user_deleted` (hay que reactivarlo) o `user_not_active`; `502`; `503` |
| U8 | `POST /api/v1/users/{user_id}/unblock` | `users:update` | — | `200` `UserRead` (Activo) | `404`; `409 user_already_active`, `user_deleted`, `user_not_active` o `auth0_account_not_found`; `502`; `503` |
| U9 | `POST /api/v1/users/{user_id}/reactivate` | `users:update` | — | `200` `UserRead` (Activo; conserva datos y asignaciones de roles) | `404`; `409 user_already_active`, `user_blocked` (hay que desbloquearlo), `user_not_active` o `auth0_account_not_found`; `502`; `503` |

### Roles de un usuario y catálogo de roles

| Id | Operación | Permiso | Entrada | Respuesta | Errores propios |
|---|---|---|---|---|---|
| U10 | `GET /api/v1/users/{user_id}/roles` | `users:read` | — | `200` lista de `RoleRead` (roles activos del usuario, ordenados por nombre; vacía si no tiene) | `404 user_not_found`; `409 user_deleted`, `user_blocked` o `user_not_active` (**los roles de un usuario no activo no se pueden consultar**) |
| U11 | `POST /api/v1/users/{user_id}/roles` | `users:update` | `{ "role_id": <entero ≥ 1> }` | `201` `UserRoleRead` | `404 user_not_found` o `role_not_found` (rol inexistente o no activo); `409 user_deleted`, `user_blocked`, `user_not_active` o `user_role_already_associated`; `422` |
| U12 | `DELETE /api/v1/users/{user_id}/roles/{role_id}` | `users:update` | — | `204` sin cuerpo | `404 user_not_found` o `role_not_found`; `409 user_deleted`, `user_blocked`, `user_not_active` o `user_role_not_associated`; `422` |
| R1 | `GET /api/v1/roles` | `roles:read` | — | `200` lista de `RoleRead` (todos los roles activos, **sin paginar**, ordenados por nombre; el catálogo asume hasta 100) | — |

Sin cuerpo (`204`): el cliente HTTP exige un esquema aunque no haya cuerpo; se usa `z.undefined()` (el cuerpo vacío se lee como `undefined`).

## Cuerpos

### `UserRead` (U1 a U9; ya definido en la 001)

`{ id, auth0_id, email, first_name, paternal_last_name, maternal_last_name | null, status: { id, name }, created_at, updated_at }`. Es el esquema `platformUserSchema` de `features/users`; la 002 no lo duplica. `email` llega siempre en minúsculas.

### `UserPage` (U1)

| Campo | Regla |
|---|---|
| `items` | Lista de `UserRead` de la página, ordenada por nombre, apellido paterno y apellido materno (sin distinguir mayúsculas; sin apellido materno después) y, a igualdad, por `id`. Solo usuarios **activos**. |
| `total` | Entero ≥ 0: usuarios activos en total (los bloqueados y eliminados no cuentan). |
| `page`, `page_size` | Los aplicados. |
| `pages` | Entero ≥ 0 (`0` si no hay usuarios activos). Una página posterior a la última devuelve `items` vacío (no es error). |

### `UserCreate` (U4)

| Campo | Regla de la API | Validación del cliente |
|---|---|---|
| `email` | Obligatorio, 1 a 255, patrón de correo ASCII (`^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:[.][A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$`); se guarda en minúsculas; único con cualquier estatus | Mismo patrón y límites, tras recortar espacios |
| `password` | Obligatoria. El servicio no la guarda, no la devuelve y no la registra; Auth0 aplica su política | Solo no vacía (la política es de Auth0: el cliente no la duplica); no se recorta |
| `first_name` | Obligatorio, 1 a 100 (recortado) | Igual |
| `paternal_last_name` | Obligatorio, 1 a 100 (recortado) | Igual |
| `maternal_last_name` | Opcional, hasta 100; `""` o `null` = sin apellido materno | Igual; vacío se envía como ausente |

### `UserUpdate` (U5)

Campos opcionales `first_name`, `paternal_last_name` (no pueden quedar vacíos) y `maternal_last_name` (`""` o `null` lo borra); al menos uno. No admite campos desconocidos (se rechaza toda la solicitud). La interfaz envía siempre los tres campos del formulario.

### `RoleRead` (U10 y R1)

`{ id, name, description | null, created_at, status: { id, name } }`. `name` hasta 50 caracteres; `description` hasta 500. El dominio del frontend es `Role`: `{ id, name, description, createdAt, status }`. Es distinto de `AccessRole` de la 001 (que trae permisos y viene de `me`).

### `UserRoleRead` (U11)

`{ user_id, role: { id, name } }`.

## Errores

Cuerpo uniforme `{ code, message, errors? }` (ver la 001). La interfaz decide por `code` y por el estado HTTP, y usa sus propios textos en español del módulo de mensajes; solo los mensajes de campo de un `validation_error` se muestran tal como llegan, junto al campo que nombran (son textos para personas, sin datos técnicos ni valores recibidos).

| `code` | Estado | Cómo lo trata la interfaz |
|---|---|---|
| `validation_error` | 422 | Cada `errors[].field` (`email`, `first_name`, `paternal_last_name`, `maternal_last_name`, `password`) se muestra en su campo del formulario; `body`, `auth0_id` o un campo desconocido es un error general del formulario. |
| `password_rejected` | 422 | Error del campo contraseña: «La contraseña no cumple los requisitos de seguridad de la cuenta de acceso.». |
| `user_email_already_registered` | 409 | Error del campo correo con la sugerencia de buscarlo (puede pertenecer a un usuario bloqueado o eliminado, que se recupera, spec US2-4); enlace a `/users?email=<correo escrito>`. |
| `auth0_account_already_exists` | 409 | Error del campo correo: ya existe una cuenta de acceso con ese correo. |
| `identity_provider_unavailable` | 503 | Aviso reintentable: no se pudo actualizar la cuenta de acceso; el usuario **no** cambió. |
| `identity_provider_error` | 502 | Aviso: el sistema de cuentas de acceso rechazó la operación; no se cambió nada. No se reintenta sola. |
| `auth0_account_not_found` | 409 | Al desbloquear o reactivar: aviso de que la persona no tiene cuenta de acceso; el usuario sigue como estaba. |
| `user_not_found` | 404 | Detalle y edición: pantalla «usuario no encontrado» con enlace al listado. En una acción: aviso «el usuario ya no existe» y regreso al listado. |
| `user_deleted`, `user_blocked`, `user_not_active`, `user_already_active` | 409 | «El estatus cambió»: aviso con lo ocurrido y se vuelve a consultar al usuario, de modo que la pantalla muestra el estatus vigente y solo las acciones que admite (spec US4-7, US5-4). |
| `user_role_already_associated`, `user_role_not_associated` | 409 | «El cambio ya estaba hecho»: se vuelven a consultar los roles (spec US3-7). |
| `role_not_found` | 404 | El role ya no está disponible: se vuelve a consultar el catálogo y se avisa. |
| `permission_denied` | 403 | Aviso global sin cerrar sesión (ya implementado en la 001). |
| `unauthenticated`, `token_expired`, `invalid_token` | 401 | Lo resuelve el cliente HTTP (renueva el token una vez; si falla, sesión vencida). |
| `authentication_unavailable`, `internal_error`, red, tiempo agotado | 503, 500 | Consultas: estado de error con «Reintentar» (las lecturas se reintentan solas hasta 2 veces); acciones: aviso con la acción habilitada de nuevo. |

## Operaciones compuestas del Backoffice

El servicio no ofrece una operación única para crear un usuario con roles ni para sustituir roles: el Backoffice las compone con las anteriores (constitución IV: el spec define el orden, los fallos parciales y la compensación).

| Caso | Orden | Fallos |
|---|---|---|
| Crear un usuario con roles (FR-023) | 1. U4. 2. Para cada role elegido, en orden de `id`, U11 una por una. | Si U4 falla: no se asigna nada y el usuario no se da por creado (los errores de U4 se tratan como arriba). Si U4 funciona y falla alguna U11: **no hay compensación** (no se elimina al usuario ni se quitan los roles asignados: eliminarlo dejaría su correo reservado y su cuenta de acceso ya creada); el resultado trae los roles asignados y los que faltan. Un `user_role_already_associated` en el reintento cuenta como asignado. |
| Reintentar roles pendientes (FR-023) | U11 solo para los que faltan, una por una. | Igual que arriba. |
| Agregar o quitar un role (FR-024) | U11 o U12 de un solo role. | Los conflictos 409 se tratan como arriba. |
| Reactivar y desbloquear | Una sola llamada (U9 o U8) | Sin compensación: el servicio lo hace «todo o nada». |

## Reintentos y duplicados

- Las lecturas (U1 a U3, U10, R1) las reintenta TanStack Query (máximo 2, con retroceso, solo red y 5xx).
- **Ninguna mutación se reintenta sola** (constitución IV); la persona decide reintentar y el botón se deshabilita mientras la mutación está pendiente (FR-007).
- Si una creación pierde la respuesta (red o tiempo agotado) el usuario pudo haberse creado: el siguiente intento recibirá `user_email_already_registered`, que la interfaz explica con la sugerencia de buscar el correo. No hay clave de idempotencia en el servicio.

## Validación en el cliente y datos de prueba

Las respuestas se validan con Zod en `features/users/schemas` (la respuesta que no cumple el esquema es un fallo de contrato: error, sin datos parciales). Las pruebas simulan el servicio con MSW siguiendo este contrato y la regla del token `Bearer test-token:<sub>`: un simulador con estado (usuarios, roles, asociaciones, estatus, fallos de la cuenta de acceso y permisos por operador) que aplica las reglas de arriba (research D14).
