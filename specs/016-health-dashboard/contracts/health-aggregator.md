# Contrato consumido: resultado de salud agregado (`GET /api/v1/health`)

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24

Lo que «Salud de servicios» consume del agregador de `maily-system-api` y cómo reacciona a cada respuesta. **Fuente de verdad**: la spec de system-api 005 (worktree `C:\Maily\code\maily-system-api-005-health-monitoring`, rama `005-health-monitoring`, `specs/005-health-monitoring/spec.md`, FR-001, FR-003, FR-010 a FR-021 y FR-044), leída el 2026-10-24, y su plan: `contracts/openapi-health.yaml` (`HealthRead`, `ComponentHealthRead`, `CheckRead`) y `contracts/error-catalog.md`, revisados el mismo día sin diferencias con este documento. Si cambian, este documento se revisa. El esquema Zod se escribe a mano a partir de aquí (research D5).

## Condiciones generales

- **Servicio y cliente**: `maily-system-api`, con el cliente `subscriptions` (`VITE_SUBSCRIPTIONS_API_URL`, la raíz del servicio). Ruta en la capa `api`: `HEALTH_RESULT_PATH = '/api/v1/health'`. En desarrollo, `/proxy/subscriptions/api/v1/health`.
- **Token**: `Authorization: Bearer <access token>` de la sesión, enviado por el cliente compartido solo a ese origen. El servicio no valida el token: lo reenvía a `GET /api/v1/authorization/check` de mailySoft-usuarios con `health:read` en cada petición, sin guardar la decisión.
- **Permiso**: `health:read` (lo crea mailySoft-usuarios 016, módulo «Salud de servicios», tipo Sistema).
- **Sin parámetros**; los desconocidos se ignoran. **Sin forma de saltarse la caché**: «Actualizar» puede recibir el resultado guardado (FR-026).
- **Tiempos del lado del servicio**: los chequeos van en paralelo, con `HEALTH_CHECK_TIMEOUT_SECONDS` (3 s por defecto, de 1 a 10) por llamada y sin reintentos; una agregación termina en ≤ `T` + 1 s más la lectura del registro y nunca en más de 2 × `T` + 1 s. El resultado se comparte `HEALTH_CACHE_SECONDS` (15 s por defecto, de 0 a 300).
- **Tiempos del lado del Backoffice** (research D7): 15 s por intento y 1 reintento a 1 s, solo ante red, tiempo agotado o 5xx. **Punto de coordinación**: si un ambiente sube `HEALTH_CHECK_TIMEOUT_SECONDS` por encima de 4, el peor caso del servicio (autorización de 5 s + 2 × `T` + 1) supera los 15 s y la consulta se cortaría antes.
- **CORS**: el de la feature 003 (`CORS_ALLOWED_ORIGINS`), con `Authorization` permitida; en desarrollo, el intermediario.

## A1 — Consultar el resultado

`GET /api/v1/health` — operación `get_health` (nombre propuesto por la 005).

- **200** — `Content-Type: application/json`, `Cache-Control: no-store`, **siempre que se conceda el acceso**, aunque todos los componentes estén caídos, la base de datos detenida o el registro ilegible: la degradación va por componente.

```json
{
  "status": "degraded",
  "checked_at": "2026-10-30T04:00:03Z",
  "registry_available": false,
  "components": [
    {
      "code": "maily-system-api",
      "name": "MailySoft System API",
      "kind": "service",
      "status": "degraded",
      "latency_ms": 3001,
      "checked_at": "2026-10-30T04:00:03Z",
      "version": "2.1.0",
      "commit": "9fceb02d0ae598e95dc970b74767f19372d61af8",
      "build_date": "2026-10-24T15:30:00Z",
      "environment": "production",
      "checks": [{ "name": "database", "status": "error", "latency_ms": 3001, "error": "timeout" }],
      "error": "not_ready",
      "next_start_at": null
    },
    {
      "code": "database",
      "name": "Base de datos",
      "kind": "database",
      "status": "stopped",
      "latency_ms": 3000,
      "checked_at": "2026-10-30T04:00:03Z",
      "version": "unknown",
      "commit": "unknown",
      "build_date": "unknown",
      "environment": "unknown",
      "checks": [],
      "error": "timeout",
      "next_start_at": "2026-11-02T14:00:00Z"
    }
  ]
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `status` | `ok`, `degraded` o `down` | Estado global: `down` si alguno está `down`; si no, `degraded` si alguno está `degraded`, `stopped` o `unknown`; si no, `ok`. El Backoffice lo muestra sin recalcularlo (FR-010) |
| `checked_at` | ISO 8601 UTC | Cuando terminó la agregación (también si se sirve de la caché) |
| `registry_available` | booleano | `false` si no pudo leer el registro: usa la última copia leída o, si nunca lo leyó, solo los integrados (FR-018) |
| `components` | arreglo, nunca nulo | Primero `maily-system-api` y `database` (integrados), después los registrados habilitados y no eliminados, por `sort_order` y `code`. Los deshabilitados y eliminados no aparecen |

Cada componente:

| Campo | Tipo | Significado |
|---|---|---|
| `code`, `name` | texto | Identificador y nombre (`maily-system-api` «MailySoft System API», `database` «Base de datos») |
| `kind` | `service`, `database` o `frontend` | |
| `status` | `up`, `degraded`, `down`, `stopped` o `unknown` | `stopped` solo en la base de datos, fuera de su horario de encendido |
| `latency_ms` | entero ≥ 0 o `null` | Duración del chequeo principal, también si falló; `null` si no se intentó |
| `checked_at` | ISO 8601 UTC | Cuando terminó su chequeo |
| `version`, `commit`, `build_date`, `environment` | texto o `"unknown"` | De su `/info`; textos recortados a 64 caracteres y sin caracteres de control; `build_date` válida o `"unknown"` |
| `checks` | arreglo de `{ name, status: ok\|error, latency_ms, error }` | Los de su `/health/ready` (a lo más 20; hoy solo `database`); vacío si no aplica |
| `error` | `null` o un código | `null` si está `up`; si no, uno de la tabla siguiente |
| `next_start_at` | ISO 8601 UTC o `null` | Próximo encendido programado; solo con valor en `database` `stopped` con horario configurado |

**Códigos de error de componente** (lista cerrada; agregar uno es compatible, quitar o renombrar no): `timeout`, `connection_error`, `dns_error`, `host_not_allowed` (estado `unknown`, no se le llamó), `unexpected_status`, `invalid_response`, `response_too_large`, `not_ready` y `unexpected_error`. Los chequeos del contrato v1 añaden `not_configured`. Textos en [data-model.md](../data-model.md#2-textos-de-los-estados-y-de-los-errores).

**Nunca trae** secretos, nombres de host, direcciones (`base_url`), IP, cadenas de conexión, mensajes de excepción, trazas ni el token.

## Errores y reacción de la página

Cuerpo de error uniforme del servicio: `{ code, message }` (y `errors` solo en `validation_error`). Precedencia: identidad (401) → permiso (403 o 503). El `message` nunca se muestra.

| HTTP | `code` | Cuándo | Reacción (FR) |
|---|---|---|---|
| 401 | `unauthenticated`, `token_expired`, `invalid_token` | Sin token, vencido o rechazado | El cliente renueva el token una vez; si vuelve el 401, termina la sesión con el manejo de la 001 y, al identificarse, vuelve a `/health` (FR-033). Sin cadena de respaldo |
| 403 | `permission_denied` | Sin `health:read` para mailySoft-usuarios | Resultado «sin permiso»: «No tienes permiso para ver la salud de los servicios.», descarta los datos, deja de consultar en la visita, sin el aviso global y sin cadena (FR-031, research D8) |
| 503 | `authorization_unavailable` | mailySoft-usuarios no respondió o respondió algo inesperado (falla cerrada); por ejemplo, de noche, con la base detenida | Fallo de FR-030 con la causa posible (mailySoft-usuarios o la base de datos no disponibles), tras 1 reintento; luego la cadena: estado público y, si falla, comprobación directa |
| 500 | `internal_error` | Fallo inesperado | Fallo de FR-030 y cadena, tras 1 reintento |
| — | red, tiempo agotado (15 s), bloqueo de CORS | Sin respuesta | Igual que 500 |
| 200 fuera de contrato | — | Falta una clave obligatoria, otro tipo, latencia negativa, `next_start_at` que no es fecha | `ApiError` `contract`: fallo de FR-030 y cadena, sin reintento; nada a medias (FR-009) |
| otro 4xx | cualquiera | Por ejemplo, 404 de un servicio sin la 005 | Fallo de FR-030 sin cadena (research D8) |

- Con datos en pantalla, el fallo los conserva con su antigüedad y `RefreshFailedAlert`; sin datos, `ErrorState` con «Reintentar» (FR-030).
- Un estado, un tipo, un chequeo o un código desconocidos **no** son un fallo de contrato: se muestran con su texto genérico (FR-009).
