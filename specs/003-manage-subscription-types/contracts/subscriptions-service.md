# Contrato consumido: API de suscripciones

**Feature**: `003-manage-subscription-types` | **Fecha**: 2026-10-20 | **Spec**: [../spec.md](../spec.md)

Resume lo que consume la feature 003 de la API de suscripciones («MailySoft System API»). La fuente de verdad es su repositorio (copia local `C:\maily\code\maily-system-api`, rama `main`, commit `3c81089`): `specs/001-subscriptions-api/spec.md`, `contracts/openapi-subscriptions.yaml`, `contracts/error-catalog.md` y `contracts/permission-matrix.md`. Verificado el 2026-10-20 leyendo esos archivos, el código de sus DTO y el OpenAPI que publica el servicio en ejecución (`GET /openapi.json`, sin token; respondía en `http://127.0.0.1:8001`). Los esquemas Zod se escriben a mano a partir de este documento (research D4).

## Condiciones generales

| Tema | Valor |
|---|---|
| Base | `VITE_SUBSCRIPTIONS_API_URL` (`/proxy/subscriptions` en desarrollo); todas las rutas cuelgan de `/api/v1/subscriptions`. |
| Token | `Authorization: Bearer <access token de la sesión>`, con el audience de las APIs de MailySoft. La API no lo valida: lo reenvía al API de usuarios, que decide la identidad y el permiso **en cada petición** (quitar un permiso surte efecto en la siguiente). |
| Permisos | `subscriptions:read` (S1, S2), `subscriptions:write` (S3), `subscriptions:update` (S4, S5) y `subscriptions:delete` (S6). Existen en el catálogo del API de usuarios y deben estar asignados a algún role activo (quickstart, paso 1). |
| Orden de comprobaciones | (1) cuerpo que no es JSON legible: `422`; (2) identidad: `401`; (3) permiso: `403`, o `503 authorization_unavailable` si el API de usuarios no responde; (4) validación: `422`; (5) existencia y reglas: `404` y `409`; (6) solo al eliminar, la comprobación de clínicas: `409` o `503`. Por eso un `403` llega antes que un `422` o un `404`. |
| Estatus | `{ id, name }`; decidir por `id`: 1 Activa, 2 Inactiva, 3 Bloqueada y 4 Eliminada (nunca se devuelve). Puede haber estatus añadidos a mano (id ≥ 5), que son vigentes y solo pueden cambiarse a 1, 2 o 3. |
| Número de clínicas | Lo aporta el API de clínicas en cada lectura; `null` = no disponible, nunca un 0 inventado. Una suscripción recién creada trae 0 (un cero verdadero: aún no puede tener clínicas). |
| Concurrencia | Sin control: gana el último cambio de cada dato; el `PATCH` solo cambia los datos que recibe. |
| Paginación | Ninguna: S1 devuelve el catálogo completo (la API lo garantiza hasta 500 suscripciones; paginar sería un cambio incompatible que se versionaría). |
| Navegador (CORS) | Solo los sitios de `CORS_ALLOWED_ORIGINS` (vacía por defecto), con las cabeceras `Authorization` y `Content-Type` y sin credenciales del navegador. En desarrollo el Backoffice usa un proxy (research D13). |

## Operaciones

Todas pueden devolver además `401` (`unauthenticated`, `token_expired`, `invalid_token`), `403 permission_denied`, `503 authorization_unavailable` y `500 internal_error`.

| Id | Operación | Permiso | Entrada | Respuesta | Errores propios |
|---|---|---|---|---|---|
| S1 | `GET /api/v1/subscriptions` | `subscriptions:read` | — | `200` lista de `SubscriptionRead`: Activas, Inactivas, Bloqueadas y de estatus añadidos a mano, sin Eliminadas, por fecha de creación y, a igualdad, por id; `[]` si no hay | — |
| S2 | `GET /api/v1/subscriptions/{subscription_id}` | `subscriptions:read` | `subscription_id`: entero ≥ 1 | `200` `SubscriptionRead` | `404 subscription_not_found` (inexistente, eliminada o id mayor que 2 147 483 647); `422` (id que no es un entero positivo) |
| S3 | `POST /api/v1/subscriptions` | `subscriptions:write` | `SubscriptionCreate` | `201` `SubscriptionRead` (Activa, `clinics_count: 0`) y `Location` | `409 subscription_name_already_exists`; `422 validation_error` |
| S4 | `PATCH /api/v1/subscriptions/{subscription_id}` | `subscriptions:update` | `SubscriptionUpdate` (al menos un dato) | `200` `SubscriptionRead` | `404`; `409 subscription_name_already_exists`; `422` |
| S5 | `PATCH /api/v1/subscriptions/{subscription_id}/status` | `subscriptions:update` | `SubscriptionStatusChange` | `200` `SubscriptionRead` con el nuevo estatus | `404`; `409 subscription_status_unchanged`; `422` (`status_id` 4 o desconocido) |
| S6 | `DELETE /api/v1/subscriptions/{subscription_id}` | `subscriptions:delete` | — | `204` sin cuerpo | `404`; `409 subscription_has_clinics`; `503 clinics_check_unavailable` |

Sin cuerpo (`204`): el cliente HTTP exige un esquema aunque no haya cuerpo, y se usa `z.undefined()`, como en la 002.

## Cuerpos

### `SubscriptionRead` (S1 a S5)

`{ id, name, description | null, monthly_price, features, status: { id, name }, clinics_count | null, created_at, updated_at }`.

| Campo | Regla |
|---|---|
| `id` | Entero ≥ 1. |
| `name` | Recortado, de 1 a 100 caracteres. |
| `description` | Texto de hasta 500 o `null`. |
| `monthly_price` | Texto con dos decimales siempre (`"4500.00"`; la API lo serializa con `quantize(0.01)`), de 0 a 99 999 999,99. |
| `features` | Lista de textos, en el orden en que se guardó (hasta 20, de 1 a 150 cada uno). |
| `status` | `{ id, name }`, con `name` en español y editable a mano. |
| `clinics_count` | Entero ≥ 0 o `null` (no disponible). |
| `created_at`, `updated_at` | Fecha y hora con zona horaria. `updated_at` cambia con cualquier modificación, también con el cambio de estatus. |

El dominio del frontend es `Subscription` ([../data-model.md](../data-model.md)).

### `SubscriptionCreate` (S3)

| Campo | Regla de la API | Validación del cliente |
|---|---|---|
| `name` | Obligatorio, de 1 a 100 sin contar los espacios al inicio y al final; se guarda recortado; único, sin distinguir mayúsculas (`lower(name)`; los acentos sí cuentan), entre las suscripciones no eliminadas | Igual, sin la unicidad: la decide la API |
| `description` | Opcional, hasta 500; `""` equivale a no tener | Igual; vacía se omite del cuerpo |
| `monthly_price` | Obligatorio; número ≥ 0 o texto `^[0-9]{1,8}(\.[0-9]{1,2})?$` (de 0 a 99 999 999,99, con hasta dos decimales) | Texto con la misma forma (aclaración 8); se envía como texto |
| `features` | Lista de hasta 20 textos de 1 a 150 (recortados); por defecto `[]` | Igual |

No admite campos desconocidos ni de solo lectura (`id`, `status`, `clinics_count`, fechas…): rechaza toda la solicitud con un `422` en ese campo. La interfaz nunca los envía (FR-021).

### `SubscriptionUpdate` (S4)

Campos opcionales, con las reglas del alta: `name` (no puede ser nulo ni vacío), `description` (`""` o `null` la borran), `monthly_price` (no puede ser nulo) y `features` (la lista completa, que sustituye a la anterior; `[]` la vacía). Hay que enviar al menos uno: un cuerpo vacío es `422` en `body`. Una suscripción puede conservar su propio nombre, incluso cambiando solo las mayúsculas. La interfaz envía solo lo que cambió (`toUpdateSubscriptionBody`).

### `SubscriptionStatusChange` (S5)

`{ "status_id": 1 | 2 | 3 }`, sin otros campos. 4 (eliminar tiene su propia operación) o un id desconocido: `422`.

## Errores

Cuerpo uniforme `{ code, message, errors? }`; `errors` solo en `validation_error`: `[{ field, message }]`, con el nombre del campo de la API o `body`. La interfaz decide por `code` y por el estado HTTP, y **siempre** muestra sus propios textos en español (FR-010): ni el `message` ni los mensajes de campo de la API llegan a la pantalla.

| `code` | Estado | Cómo lo trata la interfaz |
|---|---|---|
| `validation_error` | 422 | Los errores de `name`, `description`, `monthly_price` y `features` van junto a su campo (el de `features`, junto a la lista); cualquier otro campo es un error general del formulario. |
| `subscription_name_already_exists` | 409 | Error junto al campo nombre. |
| `subscription_status_unchanged` | 409 | Aviso de que ya tenía ese estatus y nueva consulta del detalle (US4-7). |
| `subscription_has_clinics` | 409 | Aviso del motivo y nueva consulta del detalle, que muestra el número y deshabilita «Eliminar» (US5-6). |
| `clinics_check_unavailable` | 503 | Aviso: no se pudo comprobar si tiene clínicas y no se eliminó; la acción sigue disponible (US5-7). |
| `subscription_not_found` | 404 | En el detalle y la edición, «Suscripción no encontrada» con enlace al listado; en una acción, aviso y nueva consulta, que lleva a esa misma pantalla. |
| `permission_denied` | 403 | Aviso global sin cerrar la sesión (ya implementado en la 001). |
| `unauthenticated`, `token_expired`, `invalid_token` | 401 | Lo resuelve el cliente HTTP: renueva el token una vez y, si falla, aplica el flujo de sesión vencida de la 001. |
| `authorization_unavailable`, `internal_error`, red, tiempo agotado | 503, 500 | Consultas: estado de error con «Reintentar» (las lecturas se reintentan solas hasta 2 veces). Acciones: aviso genérico, con la acción disponible de nuevo. |

## Reintentos y duplicados

- Las lecturas (S1 y S2) las reintenta TanStack Query: como mucho 2 veces, con retroceso, solo ante fallos de red y 5xx (incluido `authorization_unavailable`).
- **Ninguna mutación se reintenta sola** (constitución IV): la persona decide reintentar y el botón se deshabilita mientras la mutación está pendiente (FR-007).
- Un alta cuya respuesta se pierde (red o tiempo agotado) pudo haberse hecho: el siguiente intento recibirá `subscription_name_already_exists`, que la interfaz muestra junto al nombre. No hay clave de idempotencia.
- Una eliminación cuya respuesta se pierde: el siguiente intento recibe `404` y la interfaz dice que la suscripción ya no existe.

## Diferencias entre lo documentado y lo publicado

| Tema | Documentado | Publicado u observado | Qué hace la interfaz |
|---|---|---|---|
| `clinics_count` en `SubscriptionRead` | Obligatorio, entero o `null` | Propiedad presente pero no obligatoria en el OpenAPI (`null` por defecto en el DTO; en la práctica siempre se envía) | Si falta, «No disponible» |
| Puerto | `servers: http://localhost:8010` y su README (8010) | En esta máquina, el 2026-10-20, respondía en el 8001 | La URL es configurable; el proxy de desarrollo tiene destino configurable (research D13) |
| Otras operaciones | — | `GET /api/v1/dashboard` (`dashboard:read`, spec 003 de la API) | No se consume |
| `monthly_price` de lectura | Patrón `^[0-9]{1,8}\.[0-9]{2}$` | Texto sin patrón en el OpenAPI; el código siempre envía dos decimales | Se valida con el patrón documentado |

## Validación en el cliente y simulador de pruebas

Las respuestas se validan con Zod en `features/subscriptions/schemas`: una respuesta que no cumple el esquema es un fallo de contrato (error, sin datos parciales). Las pruebas simulan la API con MSW siguiendo este contrato y la regla del token `Bearer test-token:<sub>`: un simulador con estado que toma los permisos del simulador del servicio de usuarios, como la API real los pide al API de usuarios (research D14).
