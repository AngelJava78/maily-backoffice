# Contrato consumido: rutas de salud v1 en la comprobación directa (`/health/live` y `/health/ready`)

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24

Lo que la sección «Comprobación directa» consulta desde el navegador, sin credencial, cuando no responden ni el agregador ni el estado público (User Story 6), y cómo decide cada fila. **Fuente de verdad**: el contrato de salud de Maily v1, igual en los tres servicios: mailySoft-usuarios 016 (FR-037 de CORS), mailySoft-pacientes 008 (CORS con `CORS_ALLOWED_ORIGINS`) y maily-system-api 005 (FR-004, FR-005, FR-008 y FR-050), leídos el 2026-10-24 en sus worktrees.

## Destinos

Solo estos, en este orden, y nunca otra ruta, una dirección del registro ni la base de datos (FR-007, FR-068):

| Fila | Nombre que se muestra | Base | Cliente |
|---|---|---|---|
| 1 | «maily-system-api» | `VITE_SUBSCRIPTIONS_API_URL` | `subscriptions` |
| 2 | «mailySoft-usuarios» | `VITE_USERS_API_URL` | `users` |
| 3… | el `name` configurado | `url` de cada elemento de `VITE_HEALTH_DIRECT_SERVICES` | uno anónimo por servicio |

- La ruta se agrega a la base tal como está configurada: con `/proxy/users`, se consultan `/proxy/users/health/live` y `/proxy/users/health/ready` (FR-068).
- Sin `VITE_HEALTH_DIRECT_SERVICES` (o con `[]`) solo hay dos filas y no se consulta ningún otro origen (FR-077, US6-13).

## Condiciones de cada consulta

- `GET`, con `probe` del cliente compartido (research D3): **sin** `Authorization`, **sin** cookies (`credentials: 'omit'`), sin pedir el token, con 5 s de límite y **sin reintentos**. Todas las consultas de una ronda van en paralelo; la ronda termina cuando terminan todas (≤ 5 s).
- Petición simple (solo `Accept: application/json`): el servicio no necesita responder `OPTIONS`, solo `Access-Control-Allow-Origin` para el origen del Backoffice.
- Nunca se muestra ni se registra el cuerpo de una respuesta: solo los textos de la sección (FR-069, FR-074).

## L1 — Vida: `GET /health/live`

- **Contrato**: 200 con `{"status":"ok"}`, sin consultar dependencias, en menos de 100 ms. `Cache-Control: no-store`. Pública.
- **Cuenta como bien**: estado 2xx y un cuerpo que cumple `{ "status": "ok" }` (los campos de más se admiten).
- **Cuenta como falla**: error de red (también un bloqueo de CORS o de la CSP, que el navegador no distingue), tiempo agotado, cualquier estado no 2xx o un cuerpo fuera del contrato, por ejemplo una página HTML con 200 de un intermediario que no reenvía la ruta (US6-6).

## L2 — Disponibilidad: `GET /health/ready`

- **Contrato**: comprueba solo la base de datos, con `HEALTH_READY_TIMEOUT_SECONDS` (2 s por defecto). Responde 200 o 503, en ambos casos con este cuerpo:

```json
{ "status": "unavailable", "checks": [{ "name": "database", "status": "error", "latency_ms": 2001, "error": "timeout" }] }
```

| Campo | Tipo | Valores |
|---|---|---|
| `status` | texto | `ok` (200) o `unavailable` (503) |
| `checks[]` | arreglo | Hoy solo `database` |
| `checks[].name` | texto | `database`; otro nombre no invalida |
| `checks[].status` | texto | `ok` o `error` |
| `checks[].latency_ms` | entero ≥ 0 o `null` | |
| `checks[].error` | texto o `null` | `null`, `timeout`, `connection_error`, `not_configured` (solo en servicios que arrancan sin `DATABASE_URL`, como pacientes 008) o `unexpected_error`; otro código no invalida |

- **Cuenta como bien**: 2xx con `status` `ok` y `checks` válidos.
- **503 del contrato**: estado 503 con `status` `unavailable` y `checks` válidos.
- **Cualquier otra cosa es falla**: red, CORS, tiempo agotado, otro estado (también un 200 con `unavailable` o un 503 con `ok`) o un cuerpo fuera del contrato.

## Decisión de cada fila (FR-069)

| Vida | Disponibilidad | Estado | Explicación |
|---|---|---|---|
| bien | bien | Operativo | — |
| bien | 503 del contrato | Degradado | Por cada chequeo con `status` `error`, sin repetir: `database` → «Su base de datos no responde.» (con `error` `not_configured`: «Le falta configuración, por ejemplo la conexión a la base de datos.»); otro nombre → «Falló uno de sus chequeos.». Si ninguno está en error: «Está en línea, pero no está listo para atender.» |
| bien | falla | Degradado | «Está en línea, pero no está listo para atender.» |
| falla | cualquiera | No responde | — |

- La base de datos queda siempre entre los componentes «Sin información», aunque una fila diga «Su base de datos no responde.»: esa explicación es del chequeo del servicio, no del componente base de datos (FR-070, caso límite).
- La sección no calcula estado general ni cuenta de operativos (FR-070).

## Requisitos del despliegue (FR-077, SC-024)

| Servicio | CORS para el origen del Backoffice, sin credenciales | CSP `connect-src` del Backoffice |
|---|---|---|
| maily-system-api | En `/health/live`, `/health/ready` y `/health/status` (005 FR-050, `CORS_ALLOWED_ORIGINS`) | Ya incluido (feature 003) o mismo origen |
| mailySoft-usuarios | En `/health/live` y `/health/ready` (016 FR-037, `CORS_ALLOWED_ORIGINS`) | Ya incluido o mismo origen |
| Cada servicio de `VITE_HEALTH_DIRECT_SERVICES` (hoy, mailySoft-pacientes) | En `/health/live` y `/health/ready` (pacientes 008, `CORS_ALLOWED_ORIGINS`, nuevo: hoy no tiene CORS) | **Debe agregarse** su origen, salvo que sea una ruta del mismo origen |

- **Riesgo**: un CORS o una CSP mal configurados hacen ver «No responde» un servicio en marcha, sin otro aviso. Por eso la verificación de [quickstart.md](../quickstart.md) se hace en cada ambiente antes de darlo por listo y cada vez que cambian dominios o configuración.
- Un intermediario del mismo origen (como `/proxy/users`) debe reenviar también estas rutas; si devolviera la página del Backoffice, cuenta como falla y el servicio nunca se ve «Operativo».
