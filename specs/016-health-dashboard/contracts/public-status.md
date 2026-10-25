# Contrato consumido: estado público de la plataforma (`GET /health/status`)

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24

Lo que la sección «Estado de la plataforma» consume de `maily-system-api` y cómo reacciona. **Fuente de verdad**: la spec de system-api 005 (FR-002, FR-044 a FR-050 y su User Story 6), leída el 2026-10-24 en su worktree, y su plan: `contracts/openapi-health.yaml` (`PublicStatusRead` y `PublicComponentRead`, con `additionalProperties: false`), revisado el mismo día sin diferencias con este documento. Si cambia, este documento se revisa.

## Condiciones generales

- **Servicio y cliente**: `maily-system-api`, cliente `subscriptions`, en la **raíz** del servicio (no bajo `/api/v1`): `PUBLIC_STATUS_PATH = '/health/status'`. En desarrollo, `/proxy/subscriptions/health/status`, que el intermediario reenvía. Sin variable nueva ni cambio de CSP: es el mismo origen (FR-055, decisión (p)).
- **Sin credencial**: la consulta es `anonymous` (research D3): no pide el token, no envía `Authorization` ni cookies, y un 401 nunca activa el manejo de sesión vencida (FR-056). El servicio ignora una `Authorization` si llegara, pero el Backoffice no la envía.
- **CORS**: el servicio responde con las cabeceras de `CORS_ALLOWED_ORIGINS`, sin credenciales (005 FR-050). La consulta es simple (solo `Accept`), sin *preflight*. Se verifica por ambiente (SC-024, [quickstart.md](../quickstart.md)).
- **Tiempos** (research D7): 10 s por intento y 1 reintento a 1 s, solo ante red, tiempo agotado o 5xx.
- **Cuándo se consulta**: en «No se pudo comprobar el acceso», al aparecer y tras cada «Reintentar» que vuelve a fallar; en «Salud de servicios», tras cada consulta al agregador que falla por red, tiempo, 5xx o contrato, en el mismo ciclo (FR-061, FR-067). Nunca mientras se comprueba el acceso (FR-065). Una sola en curso; al salir, se cancela.

## P1 — Consultar el estado público

`GET /health/status` — operación `get_health_status` (fijada por la 005).

- **200** siempre que el proceso atienda HTTP, aunque la base de datos esté detenida o caída, el registro no pueda leerse o mailySoft-usuarios no responda. `Cache-Control: no-store`.

```json
{
  "status": "degraded",
  "checked_at": "2026-10-31T04:00:03Z",
  "components": [
    { "code": "maily-system-api", "name": "MailySoft System API", "kind": "service", "status": "degraded", "next_start_at": null },
    { "code": "database", "name": "Base de datos", "kind": "database", "status": "stopped", "next_start_at": "2026-11-02T14:00:00Z" },
    { "code": "mailysoft-usuarios", "name": "MailySoft Usuarios", "kind": "service", "status": "degraded", "next_start_at": null }
  ]
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `status` | `ok`, `degraded` o `down` | El mismo estado global que el agregador |
| `checked_at` | ISO 8601 UTC | El de la agregación de la que sale (no se muestra) |
| `components[]` | arreglo, nunca nulo | Los mismos componentes, en el mismo orden y con los mismos estados que el agregador (sin deshabilitados ni eliminados; con la copia del registro si no puede leerlo) |
| `components[].code`, `.name` | texto | |
| `components[].kind` | `service`, `database` o `frontend` | Identifica la base de datos; no se muestra |
| `components[].status` | `up`, `degraded`, `down`, `stopped` o `unknown` | |
| `components[].next_start_at` | ISO 8601 UTC o `null` | Solo con valor en la base de datos `stopped` con horario configurado: el primer instante en que se abre su ventana de encendido |

- **Lista cerrada**: nunca trae versiones, commits, fechas de build, entornos, direcciones, latencias, `checks`, códigos de error ni `registry_available` (005 FR-047). El esquema del Backoffice tampoco los tiene: aunque llegaran, se descartan (SC-014).
- **Caché del servicio**: comparte la agregación del agregador, con un periodo mínimo de `max(HEALTH_CACHE_SECONDS, 15)` s; dentro de él responde de inmediato con el resultado guardado. Fuera, se une a la agregación en curso o lanza una, que tarda lo de FR-019 de la 005 (con la base detenida, el chequeo de la base agota su tiempo, 3 s por defecto).
- **`next_start_at` no es la hora del arranque**: es cuando se abre la ventana; en los primeros minutos la base puede seguir sin responder y llegar `down`, sin línea de regreso (caso límite de la spec).

## Reacción de la sección

| Respuesta | Qué se muestra (FR) |
|---|---|
| 200 que cumple el esquema | Estado general en texto, cada componente con su estado (icono y texto) en el orden recibido, y, si la base de datos está `stopped`, «Base de datos detenida por horario» con la línea de regreso si trae `next_start_at` (FR-058, FR-059) |
| 200 con `components: []` | «No hay componentes para mostrar.» (FR-058) |
| 200 con un estado o un tipo desconocidos | «Desconocido» en el estado; el componente de tipo desconocido se muestra como los demás; no es un fallo (FR-057) |
| 200 fuera del esquema (falta la lista, un nombre vacío, `next_start_at` que no es fecha) | «No se pudo obtener el estado de la plataforma.», sin nada a medias (FR-060) |
| Cualquier otro estado HTTP, red, tiempo agotado o CORS | Lo mismo, y a continuación la comprobación directa (FR-060, FR-067) |

- La sección nunca completa el estado con otra fuente (tampoco con los últimos datos del agregador) ni atribuye el fallo del acceso a una causa (FR-058).
- **SC-013** (≤ 5 s con la base detenida): el Backoffice no añade esperas; lo que tarde depende de la caché del servicio y de su agregación con la base detenida. Si en un ambiente real supera los 5 s, es un punto para system-api 005.
