# Contrato consumido: resumen de la plataforma (`GET /api/v1/dashboard`)

**Feature**: `007-dashboard` | **Fecha**: 2026-10-20

Lo que la feature consume del servicio `maily-system-api` y cómo reacciona a cada respuesta. La fuente de verdad es el repositorio del servicio (copia local `C:\maily\code\maily-system-api`, commit `3c81089` «feat: Added dashboard api»): `specs/003-platform-dashboard/contracts/openapi-dashboard.yaml`, `error-catalog.md`, `permission-matrix.md`, `data-model.md` y el código de `src/routers/dashboard.py` y `src/dtos/dashboard.py`. Verificado leyéndolos el 2026-10-20. El esquema Zod se escribe a mano a partir de este documento (research D4).

## Condiciones generales

- **Servicio**: el mismo que el de suscripciones (feature 003); los dos routers están montados en la misma aplicación. Base: `VITE_SUBSCRIPTIONS_API_URL` (obligatoria). La feature añade la ruta `/api/v1/dashboard` en su capa `api`.
- **Desarrollo**: `/proxy/subscriptions/api/v1/dashboard` → proxy de Vite → `SUBSCRIPTIONS_API_PROXY_TARGET` (por defecto `http://127.0.0.1:8010`; el contenedor publica `${API_PORT:-8010}:8000`).
- **CORS**: `CORS_ALLOWED_ORIGINS` vacía por defecto (sin middleware). Los entornos desplegados deben servir la API por el mismo origen (proxy inverso) o incluir el sitio del backoffice en esa lista; la API admite `GET` con las cabeceras `Authorization` y `Content-Type`.
- **Token**: `Authorization: Bearer <access token>` de la sesión (audience de las APIs de MailySoft), enviado por el cliente HTTP compartido solo a ese host. El servicio no valida el token: lo reenvía al API de usuarios, que decide el permiso en cada petición.
- **Permiso**: `dashboard:read`. Debe existir en el catálogo del API de usuarios y asignarse a los roles que deban ver el Panel; este servicio no lo crea.
- **Solo lectura** y sin paginación. Los parámetros desconocidos se ignoran.

## D1 — Consultar el resumen

`GET /api/v1/dashboard` — operación `get_dashboard`.

- **Parámetros**: ninguno. La feature **no envía `limit`** (FR-006): rige el valor por defecto del servicio (`DASHBOARD_RECENT_CLINICS_LIMIT`: solo `3`, `5` o `10`; `5` si no se configura; se lee al arrancar el servicio). Como referencia, `limit` admite solo dígitos ASCII (≥ 1; un valor > 10 devuelve 10) y su validación va después del permiso.
- **200** — `Content-Type: application/json`, `Cache-Control: no-store`. Cuerpo `DashboardRead`, con los siete campos **siempre presentes**:

| Campo | Tipo | Significado |
|---|---|---|
| `total_clinics` | entero ≥ 0 o `null` | Clínicas de la plataforma, en cualquier estatus. |
| `active_clinics` | entero ≥ 0 o `null` | Clínicas activas. |
| `trial_clinics` | entero ≥ 0 o `null` | Clínicas en periodo de prueba. |
| `total_doctors` | entero ≥ 0 o `null` | Doctores de toda la plataforma. |
| `total_patients` | entero ≥ 0 o `null` | Pacientes de toda la plataforma. |
| `total_users` | entero ≥ 0 o `null` | Usuarios de toda la plataforma (incluye a los doctores). |
| `recent_clinics` | arreglo de 0 a 10 `RecentClinicRead`, o `null` | Clínicas más recientes, de la más nueva a la más antigua (por `created_at` y, a igualdad, por `id` ascendente). |

`RecentClinicRead`: `id` (UUID en minúsculas), `name` (texto, sin límite de longitud), `created_at` (ISO 8601 en UTC con sufijo `Z`, hoy sin fracción de segundo: `2026-10-15T16:20:00Z`) y `status` (`ClinicStatusRead`: `id` entero estable y `name` en español, que puede cambiar). No hay más claves.

- **Semántica de los valores**: `null` = la fuente de ese dato falló (nunca un cero inventado); `0` o `[]` = la fuente respondió que no hay datos. Si todas las fuentes fallan, la respuesta sigue siendo 200 con los siete `null`. Mapa de degradación del servicio: si falla el conteo de clínicas, los tres primeros son `null` a la vez; las demás fuentes afectan solo a su campo. **No existe un error HTTP de "fuente caída"**.
- **Invariantes del servicio** (no se validan en el frontend, research D4): `active + trial ≤ total`; `total_users ≥ total_doctors`.
- **Fase 1**: datos ficticios y deterministas (dos consultas dan el mismo cuerpo): 12 / 8 / 3 / 37 / 1284 / 52 y, con el valor por defecto, cinco clínicas: Clínica Santa Aurora (En prueba, 2026-10-15T16:20:00Z), Consultorio Del Valle (En prueba, 2026-10-12T09:05:00Z), Centro Médico Horizonte (Activa, 2026-10-09T18:40:00Z), Dental Sonríe (En prueba, 2026-10-08T15:00:00Z) y Clínica San Rafael (Activa, 2026-10-08T15:00:00Z). Catálogo de estatus: 1 «Activa», 2 «En prueba», 3 «Suspendida».

## Errores y reacción del Panel

Cuerpo de error: `{ code, message }` y, solo en `validation_error`, `errors: [{ field, message }]`; en los demás la clave `errors` no aparece. Las respuestas de error no llevan `Cache-Control`. Precedencia: identidad (401) → permiso (403 / 503) → `limit` (422).

| HTTP | `code` | Cuándo | Reacción del Panel |
|---|---|---|---|
| 401 | `unauthenticated`, `token_expired`, `invalid_token` | Sin token, vencido o rechazado (con `WWW-Authenticate`) | El cliente HTTP renueva el token una vez y repite; si vuelve el 401, la sesión termina con el manejo existente (feature 001): pantalla de acceso con la ruta de retorno (FR-027). |
| 403 | `permission_denied` | Sin `dashboard:read` para el API de usuarios | Resultado `forbidden`: aviso «Sin acceso a los indicadores» en lugar de los datos, que se descartan; sin más consultas en esa visita; sin el aviso global de 403; la sesión sigue (FR-015, research D6). No se reintenta. |
| 422 | `validation_error` | Solo por `limit` | No debería ocurrir (no se envía `limit`). Si ocurre, es un fallo (FR-027). |
| 503 | `authorization_unavailable` | El API de usuarios no respondió o respondió algo inesperado (falla cerrada) | Fallo: se reintenta hasta 2 veces con espera (constitución IV); después, aviso de fallo con o sin datos previos (FR-024, FR-025) y reintento en el siguiente ciclo. |
| 500 | `internal_error` | Fallo inesperado | Igual que 503. |
| — | (red, tiempo agotado de 30 s) | Sin respuesta | Igual que 503. |
| 200 fuera de contrato | — | Falta un campo, un tipo no esperado, > 10 clínicas, fecha inválida | `ApiError` de tipo `contract`; fallo sin reintento (FR-027). |

En ningún caso se muestra el `message` del servicio: los textos salen del módulo de mensajes (constitución IV).

## Diferencias conocidas del OpenAPI publicado

- `/openapi.json` expresa la nulabilidad con `anyOf: [{ type: integer, minimum: 0 }, { type: null }]` en lugar de `type: [integer, "null"]`; es equivalente.
- El ejemplo del 403 en `/openapi.json` nombra `subscriptions:write` (reutiliza la entrada compartida); el mensaje real nombra `dashboard:read`. El Panel no muestra el mensaje, así que no le afecta.
