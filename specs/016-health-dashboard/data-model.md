# Data Model: Salud de Servicios

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24 | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Modelos de dominio del frontend (camelCase), cómo se obtienen de cada DTO (snake_case) en la capa `api` y `schemas` de `src/features/health` (constitución II), qué guarda la caché y qué estados se pintan. Los contratos de origen están en [contracts/](contracts/). Los nombres de tipos y funciones son indicativos: los fija la implementación.

## 1. Resultado de salud (agregador)

Fuente: `GET /api/v1/health` ([contracts/health-aggregator.md](contracts/health-aggregator.md)). Esquema: `healthResultSchema`.

### `HealthResult`

| Campo de dominio | DTO | Tipo | Regla |
|---|---|---|---|
| `status` | `status` | `OverallStatus` (`ok`, `degraded`, `down`, `unknown`) | Texto obligatorio; cualquier otro valor → `unknown` |
| `checkedAt` | `checked_at` | texto ISO 8601 | Obligatorio y válido (no se muestra; detecta desvíos del contrato) |
| `registryAvailable` | `registry_available` | booleano | Obligatorio |
| `components` | `components` | `HealthComponent[]` | Obligatoria (puede estar vacía); el orden se conserva |

### `HealthComponent`

| Campo de dominio | DTO | Tipo | Regla |
|---|---|---|---|
| `code` | `code` | texto | Obligatorio, no vacío; clave de la lista y de lo desplegado |
| `name` | `name` | texto | Obligatorio, no vacío; se muestra tal cual |
| `kind` | `kind` | `ComponentKind` (`service`, `database`, `frontend`, `unknown`) | Texto obligatorio; otro valor → `unknown` («Componente») |
| `status` | `status` | `ComponentStatus` (`up`, `degraded`, `down`, `stopped`, `unknown`) | Texto obligatorio; otro valor → `unknown` |
| `latencyMs` | `latency_ms` | entero ≥ 0 o `null` | Ausente o `null` → `null`; negativo o con decimales → fallo de contrato |
| `checkedAt` | `checked_at` | texto ISO o `null` | Ausente, `null` o fecha inválida → `null` |
| `version`, `commit`, `environment` | `version`, `commit`, `environment` | texto o `null` | Ausente, `null`, vacío, solo espacios o `unknown` (sin distinguir mayúsculas) → `null` |
| `buildDate` | `build_date` | texto ISO o `null` | Como los anteriores, y además una fecha inválida → `null` |
| `checks` | `checks` | `HealthCheck[]` | Obligatoria (puede estar vacía) |
| `error` | `error` | `ComponentErrorCode` o `null` | Texto o `null` obligatorio; un código desconocido se conserva y se muestra con el texto genérico |
| `nextStartAt` | `next_start_at` | texto ISO o `null` | Obligatorio; un valor que no es fecha ni `null` → fallo de contrato. Solo se usa en la base de datos `stopped` |

### `HealthCheck`

| Campo de dominio | DTO | Tipo | Regla |
|---|---|---|---|
| `name` | `name` | texto | Obligatorio, no vacío; `database` se muestra «Base de datos», otro nombre tal cual |
| `status` | `status` | `CheckStatus` (`ok`, `error`, `unknown`) | Texto obligatorio; otro valor → `unknown` |
| `latencyMs` | `latency_ms` | entero ≥ 0 o `null` | Como la del componente |
| `error` | `error` | texto o `null` | Se conserva; no se muestra (el error que se explica es el del componente) |

### Reglas de validación del resultado

- **Forma estricta**: una clave obligatoria que falta o tiene otro tipo hace que la respuesta sea un fallo de contrato (`ApiError` `contract`): se trata como una consulta fallida (FR-030) y no se muestra nada de ella (FR-009).
- **Valores tolerantes**: un estado, un tipo, un nombre de chequeo o un código de error desconocidos nunca invalidan la respuesta (FR-009).
- **Precisión FR-014 / caso límite** (research D5): pueden faltar sin invalidar la respuesta `version`, `commit`, `build_date`, `environment`, `latency_ms` y el `checked_at` del componente; cualquier otra clave obligatoria que falte la invalida.
- **Campos de más**: se descartan.

## 2. Textos de los estados y de los errores

Mapeos puros en `health/policy`, con los textos en `messages.health` (FR-050). Tonos e iconos en [research.md](research.md#d12-presentación).

| `OverallStatus` | Texto (FR-010) | | `ComponentStatus` | Texto (FR-013) |
|---|---|---|---|---|
| `ok` | Todo operativo | | `up` | Operativo |
| `degraded` | Degradado | | `degraded` | Degradado |
| `down` | Con componentes caídos | | `down` | Caído |
| `unknown` | Desconocido | | `stopped` | Detenida por horario |
| | | | `unknown` | Desconocido |

| `ComponentKind` | Texto (FR-012) | | `CheckStatus` | Texto (FR-015) |
|---|---|---|---|---|
| `service` | Microservicio | | `ok` | Correcto |
| `database` | Base de datos | | `error` | Con error |
| `frontend` | Frontend | | `unknown` | Desconocido |
| `unknown` | Componente | | | |

| `ComponentErrorCode` (FR-016) | Texto |
|---|---|
| `timeout` | No respondió a tiempo. |
| `connection_error` | No se pudo conectar. |
| `dns_error` | No se encontró la dirección del servicio. |
| `host_not_allowed` | Su dirección no está en la lista permitida; no se comprobó. |
| `unexpected_status` | Respondió con un código inesperado. |
| `invalid_response` | Su respuesta no cumple el contrato de salud. |
| `response_too_large` | Su respuesta fue demasiado grande. |
| `not_ready` | Está en línea, pero no está listo para atender. |
| `not_configured` | Le falta configuración, por ejemplo la conexión a la base de datos. |
| `unexpected_error` | Ocurrió un error inesperado al comprobarlo. |
| cualquier otro | Ocurrió un problema al comprobar este componente. |

- **«No disponible»**: cualquier `null` de versión, commit, fecha de build, entorno, latencia o última comprobación (FR-014). Una latencia de 0 es «0 ms».
- **Commit corto**: los 7 primeros caracteres; completo si tiene menos (FR-012, caso límite).
- **Cuenta de operativos**: «{n} de {total} operativos», con `n` los componentes `up` (FR-010).

## 3. Estado público de la plataforma

Fuente: `GET /health/status`, sin credencial ([contracts/public-status.md](contracts/public-status.md)). Esquema: `publicStatusSchema` (FR-057).

### `PlatformStatus`

| Campo de dominio | DTO | Tipo | Regla |
|---|---|---|---|
| `status` | `status` | `OverallStatus` | Texto obligatorio; otro valor → `unknown` |
| `checkedAt` | `checked_at` | texto ISO | Obligatorio y válido (no se muestra, decisión (t) de la spec) |
| `components` | `components` | `PlatformComponent[]` | Obligatoria (puede estar vacía); el orden se conserva |

`PlatformComponent`: `code` (texto no vacío), `name` (texto no vacío), `kind` (`ComponentKind`, no se muestra pero identifica la base de datos), `status` (`ComponentStatus`) y `nextStartAt` (ISO o `null`, obligatorio). Todo lo demás se descarta: el esquema no tiene versiones, latencias, chequeos ni errores (FR-058, SC-014). Un nombre vacío, una lista que falta o un `next_start_at` que no es fecha son fallos (US5-4).

## 4. Comprobación directa

### `DirectCheckTarget`

Se arma en `health` a partir de los clientes (research D4, D10), en este orden: `{ code: 'maily-system-api', name: «maily-system-api», client: subscriptions }`, `{ code: 'mailysoft-usuarios', name: «mailySoft-usuarios», client: users }` y cada `healthServices[i]` (`{ code, name, client }`). Nunca incluye direcciones del registro ni la base de datos.

### Resultados de los sondeos

| Tipo | Valores | Cómo se obtiene |
|---|---|---|
| `LiveOutcome` | `ok` o `failed` | `ok` solo con 2xx y un cuerpo que cumple `liveBodySchema` (`{"status":"ok"}`, admite campos de más) |
| `ReadyOutcome` | `ok`, `unavailable` (con sus chequeos) o `failed` | `ok`: 2xx con `readyBodySchema` y `status` `ok`; `unavailable`: 503 con `status` `unavailable` y `checks` válidos; `failed`: cualquier otra respuesta, red, CORS o tiempo agotado |

Chequeo del contrato v1 (en `unavailable`): `name` (texto no vacío), `status` (texto), `latency_ms` (entero ≥ 0 o `null`) y `error` (texto o `null`). Un nombre o un código desconocido no invalidan; una clave que falta, sí.

### `DirectCheckRow`

| Campo | Tipo | Regla |
|---|---|---|
| `code`, `name` | texto | Del destino |
| `status` | `operational`, `degraded` o `unreachable` | Tabla de decisión de [research.md](research.md#d10-la-comprobación-directa) (FR-069) |
| `explanations` | lista de textos | Solo en `degraded`: las de los chequeos en error sin repetir, o «Está en línea, pero no está listo para atender.» |

| `status` de la fila | Texto (FR-069, FR-070) |
|---|---|
| `operational` | Operativo |
| `degraded` | Degradado, con su explicación |
| `unreachable` | No responde |

El resultado del paso es la lista de filas, en el orden de los destinos, sin estado general ni cuenta. Lo que no se comprueba se resume en el texto «Sin información» de la sección (FR-070).

## 5. Registro de componentes

Fuente: `/api/v1/monitored-components` ([contracts/monitored-components.md](contracts/monitored-components.md)). Esquema: `monitoredComponentSchema`.

### `MonitoredComponent`

| Campo de dominio | DTO | Tipo | Regla |
|---|---|---|---|
| `id` | `id` | UUID | Obligatorio; `parseComponentId` valida el de la URL |
| `code` | `code` | texto | Obligatorio; fijo desde el alta (FR-037) |
| `name` | `name` | texto | Obligatorio |
| `kind` | `kind` | `service`, `frontend` o `unknown` | Fijo desde el alta; otro valor → `unknown` («Componente») |
| `baseUrl` | `base_url` | texto | Obligatorio; se muestra como texto, nunca como enlace (FR-007) |
| `livePath` | `live_path` | texto | Obligatorio; en un frontend es su ruta de salud |
| `readyPath` | `ready_path` | texto o `null` | `null` en un frontend |
| `infoPath` | `info_path` | texto o `null` | Opcional en un frontend |
| `enabled` | `enabled` | booleano | «Habilitado» o «Deshabilitado» |
| `sortOrder` | `sort_order` | entero | |
| `createdAt`, `updatedAt` | `created_at`, `updated_at` | texto ISO | Se muestran con `formatDateTime` |

El listado es un arreglo sin envoltorio, en el orden del servicio (`sort_order` y `code`).

### Formulario (`ComponentFormValues`) y envíos

| Campo | Alta | Edición | Regla en el navegador (FR-038) |
|---|---|---|---|
| `name` | Sí | Sí | Obligatorio; de 1 a 100 sin contar espacios de los extremos |
| `code` | Sí | Información fija | Obligatorio; de 2 a 50; minúsculas, dígitos y guiones; empieza con letra; sin guion final ni dos seguidos |
| `kind` | Sí (Microservicio o Frontend) | Información fija | Obligatorio |
| `baseUrl` | Sí | Sí | Obligatoria; `http` o `https`; con dominio; sin usuario, contraseña, parámetros (ni `?`) ni fragmento (ni `#`); hasta 255 |
| `livePath` | Sí (microservicio: «Ruta de vida», propone `/health/live`; frontend: «Ruta de salud», vacía) | Sí | Obligatoria; empieza con una sola `/`; sin `\`, `?`, `#`, `%`, espacios ni segmentos `.` o `..`; hasta 200 (patrón `^/[A-Za-z0-9\-._~!$&'()*+,;=:@/]*$` de la 005) |
| `readyPath` | Solo microservicio (propone `/health/ready`) | Solo microservicio | Obligatoria en un microservicio; mismas reglas |
| `infoPath` | Microservicio (propone `/info`, obligatoria) y frontend (opcional) | Igual | Mismas reglas |
| `enabled` | Sí (marcado) | Sí | Booleano |
| `sortOrder` | Sí (vacío) | Sí | Opcional; entero de 0 a 9999; vacío vale 0 |

- **Alta** (`POST`): `{ code, name, kind, base_url, live_path, ready_path, info_path, enabled, sort_order }`; en un frontend, `ready_path: null` y, sin ruta de información, `info_path: null`.
- **Edición** (`PATCH`): solo los campos que cambiaron respecto al componente tal como se abrió el formulario, sin `code` ni `kind`. Si no cambió nada, no se envía nada (research D15).
- **Eliminación** (`DELETE`): sin cuerpo.

### `MonitoredComponentErrorOutcome`

Lo produce `describeMonitoredComponentError(error, operation)` (research D16):

| `kind` | Cuándo | Qué se pinta |
|---|---|---|
| `field` | 422 con campos conocidos o 409 de código repetido | Un texto propio junto a cada campo (`base_url` → «Esta dirección no se puede monitorear…») |
| `form` | 422 con `body`, `component_id`, un campo desconocido o sin `errors` | Error general del formulario |
| `notFound` | 404 | «Este componente ya no existe.» y vuelta al listado actualizado |
| `forbidden` | 403 | El aviso habitual; en las lecturas, el estado sin permiso |
| `unavailable` | 5xx, red o tiempo agotado | Mensaje genérico (con la causa de FR-030 si es 503) |
| `unexpected` | Cualquier otro | Mensaje genérico |

## 6. Identificación del build del Backoffice

`BackofficeBuild = { version: string | null; commit: string | null; buildDate: string | null }`, de `parseBuildInfo` (research D18): versión semver, commit de 7 a 64 caracteres hexadecimales y fecha ISO 8601 con zona; lo demás, `null` («No disponible»). Se calcula una vez al arrancar y nunca falla.

## 7. Configuración que llega a la feature

| Ajuste | Origen | Tipo | Regla |
|---|---|---|---|
| `healthRefreshMs` | `VITE_HEALTH_REFRESH_SECONDS` × 1000 | número | Entero de 10 a 300 s, solo dígitos; 30 s si no se define (FR-046) |
| `healthServices` (en `HttpClients`) | `VITE_HEALTH_DIRECT_SERVICES` | `{ code, name, client }[]` | Lista JSON de hasta 20, validada al arrancar; `[]` si no se define (FR-072) |
| `backofficeBuild` | `__APP_VERSION__`, `__APP_COMMIT_SHA__` y `__APP_BUILD_DATE__` | `BackofficeBuild` | Nunca impide arrancar (FR-045) |

Detalle de las variables en [contracts/environment.md](contracts/environment.md).

## 8. La caché

| Clave | Contenido | `gcTime` | La escribe | Se quita |
|---|---|---|---|---|
| `['health', 'cycle']` | `CycleOutcome` (`done` o `forbidden`) | por defecto | El ciclo de la página | Por GC al salir de la página |
| `['health', 'result']` | `HealthResultOutcome` (`{ kind: 'result', result }` o `{ kind: 'forbidden' }`) | `Infinity` | El paso del agregador | Al cerrar sesión (`clear()`) o al perder `health:read` (`useForgetHealthData`) |
| `['health', 'platform-status', scope]` | `PlatformStatus` | `Infinity` | El paso del estado público | Cuando la sección desaparece o se sale de la pantalla |
| `['health', 'direct-check', scope]` | `DirectCheckRow[]` | `Infinity` | El paso de la comprobación directa | Cuando la sección desaparece o se sale de la pantalla |
| `['health', 'access-chain', round]` | `done` | 0 | La cadena de la pantalla de fallo | Por GC (ronda vieja) |
| `['health', 'components', 'list']` | `MonitoredComponent[]` | por defecto | El listado | Se invalida con cada alta, edición y eliminación |
| `['health', 'components', 'detail', id]` | `MonitoredComponent` | por defecto | El detalle y la edición | Se fija al editar y se quita al eliminar o con 404 |

- `scope` es `'page'` («Salud de servicios») o `'access'` («No se pudo comprobar el acceso»): las dos pantallas nunca comparten pasos.
- `updatedAt` de la página es el `dataUpdatedAt` de `['health', 'result']`: la hora del navegador al llegar la última respuesta correcta (FR-027, decisión (b) de la spec).
- Nada de esto se guarda en el almacenamiento del navegador (FR-029, FR-064, FR-070).

### Matriz de invalidación del registro

| Operación | Listado | Detalle | Resultado del agregador |
|---|---|---|---|
| Alta | Se invalida | — | No se toca: la página consulta al entrar (FR-042) |
| Edición | Se invalida | Se fija con la respuesta | No se toca |
| Eliminación | Se invalida | Se quita | No se toca |
| 404 en cualquier operación | Se invalida | Se quita | No se toca |

## 9. El ciclo de «Salud de servicios»

```text
entrada · intervalo (pestaña visible) · regreso con el intervalo vencido · «Actualizar» · «Reintentar»
        │  (si hay un ciclo en curso, se espera ese)
        ▼
  agregador ── 200 ───────────────► quitar secciones · fin
     │ 403 ───────────────────────► resultado «sin permiso» · quitar secciones · sin más ciclos en la visita
     │ 401 ───────────────────────► manejo de sesión (feature 001) · fin
     │ otro 4xx ──────────────────► fallo de FR-030 · fin
     │ red, tiempo, 5xx, contrato
     ▼
  estado público ── 200 válido ───► sección con datos · quitar comprobación directa · fin
     │ falla
     ▼
  comprobación directa (en paralelo, 5 s) ──► filas · fin
        │
        ▼
  la cuenta del intervalo empieza aquí (FR-024, FR-071)
```

- **Regreso a la pestaña**: consulta solo si `ahora − updatedAt ≥ intervalo` o si nunca hubo una respuesta correcta (`isRefreshDue`, FR-023).
- **Salir de la página**: se cancela el ciclo y lo que esté en curso; se quitan los pasos de las secciones (FR-025, FR-064, FR-070).

## 10. Estados de la página

`toHealthPageView` (research D11). «Bloque Backoffice» es el de FR-044.

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `loading` | Sin datos y consultando (también con un «sin permiso» de una visita anterior mientras se vuelve a consultar) | `PageLoader` y el bloque Backoffice |
| `failed` | Sin datos y la última consulta falló | `ErrorState` con «Reintentar» (anunciado), la causa si fue 503, las secciones de respaldo y el bloque Backoffice |
| `forbidden` | Resultado «sin permiso» y sin consulta en curso | «No tienes permiso para ver la salud de los servicios.» (anunciado), sin acciones, sin secciones ni bloque Backoffice |
| `ready` | Hay datos | Estado general, avisos, componentes, «Actualizado hace» y «Actualizar», y el bloque Backoffice |
| `ready` + `isUpdating` | Hay datos y el agregador se está consultando | Lo anterior con «Actualizando…» |
| `ready` + `refreshFailed` | Hay datos y la última consulta falló | Lo anterior con `RefreshFailedAlert` (anunciado una vez, con la causa si fue 503) y las secciones de respaldo |
| `ready` con lista vacía | `components` vacío | «No hay componentes para mostrar.» (no es un error) |

## 11. Estados de las secciones de respaldo

### «Estado de la plataforma» (`toPlatformStatusView`)

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `hidden` | El paso no existe en la caché | Nada |
| `loading` | Consultando y sin datos de esta aparición | «Consultando el estado de la plataforma…» |
| `ready` | Datos válidos | Estado general en texto, cada componente con su estado y, si la base de datos está `stopped`, el aviso y la línea de regreso |
| `ready` + `isRefreshing` | Datos y una consulta nueva en curso | Lo anterior con «Actualizando…» |
| `empty` | Lista vacía | «No hay componentes para mostrar.» |
| `failed` | La última consulta falló (aunque hubiera datos) | «No se pudo obtener el estado de la plataforma.» |

### «Comprobación directa» (`toDirectCheckView`)

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `hidden` | El paso no existe en la caché | Nada |
| `loading` | Consultando y sin filas de esta aparición | «Comprobando los servicios desde tu navegador…» |
| `ready` | Terminaron todas las consultas | El aviso de FR-070, las filas y el texto «Sin información» |
| `ready` + `isRefreshing` | Filas y una ronda nueva en curso | Lo anterior con «Actualizando…» |

### Anuncios (FR-063, FR-075)

| Momento | ¿Se anuncia la sección? |
|---|---|
| Su paso termina por primera vez desde que apareció | Sí, una vez, de forma cortés, después del aviso del fallo |
| Termina tras un «Reintentar» o «Actualizar» de la persona | Sí |
| Termina en un ciclo automático o con el regreso a la pestaña | No |
| Cambia sola la línea de regreso (llegó la hora) | No |

## 12. La cadena en «No se pudo comprobar el acceso»

| Evento | `round` | `paused` | Qué pasa con la cadena |
|---|---|---|---|
| La pantalla aparece | 0 | No | Se consulta la ronda 0: estado público y, si falla, comprobación directa |
| La persona elige «Reintentar» | +1 | Sí, mientras se comprueba | Se cancela lo que esté en curso; la ronda nueva espera |
| La comprobación vuelve a fallar | igual | No | Se consulta la ronda nueva; las secciones conservan lo anterior con «Actualizando…» |
| La comprobación sale bien | — | — | La pantalla se desmonta y se cancela todo; la persona entra sin esperar |
| Recomprobación que la persona no pidió | igual | Sí, mientras dura | Se cancela un paso en curso, que se completa si vuelve a fallar; lo terminado no se repite (precisión de research D9) |
| Pasa el tiempo o vuelve a la pestaña | igual | No | Nada |
| La persona sale de la pantalla | — | — | Se cancela todo y se quitan los pasos |

## 13. Textos

Todos en `src/shared/messages/es.ts` (FR-050, FR-062, FR-074). Bloques nuevos, con nombres indicativos:

- `messages.nav.sections.health` y `messages.titles.health`, `healthComponents`, `healthComponentCreate`, `healthComponentDetail` y `healthComponentEdit`.
- `messages.config.rules.healthRefreshSeconds` y `healthDirectServices`.
- `messages.health.page` (encabezado, «Actualizar», «Actualizado hace…» como funciones, «Actualizando…», enlace al registro, «Componentes», vacío, sin permiso, fallo de primera carga y de actualización, causa del 503), `.overall`, `.status`, `.kinds`, `.checks` (estados y `database`), `.errors` (FR-016), `.fields` (latencia, última comprobación, versión, commit, fecha de build, entorno, «No disponible»), `.details` («Detalle de {nombre}», «Sin detalles adicionales.»), `.notices` (base de datos detenida o caída, registro no disponible), `.returnLine` (las dos líneas como funciones) y `.backoffice`.
- `messages.health.platform` (encabezado, carga, fallo, vacío, aviso de la base de datos) y `messages.health.direct` (encabezado, aviso, nombres de los dos fijos, estados, explicaciones, «Sin información», carga).
- `messages.health.registry` (listado, columnas, vacío y explicación de los integrados, detalle, formulario con etiquetas, ayudas, advertencia del frontend y textos de formato por campo, eliminación, avisos de éxito y errores de D16).
