# Research: Salud de Servicios (Estado de los Componentes de Maily)

**Feature**: `016-health-dashboard` | **Fecha**: 2026-10-24 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Decisiones de la Fase 0. Cada una sale de leer el código de `main` (`c7a7c72`, con las features 001 a 015 integradas), los planes de la 003 y la 007 (los precedentes más cercanos), la spec de `maily-system-api` 005 (`specs/005-health-monitoring/spec.md` de su worktree, sin plan ni contratos todavía), el código de errores de ese servicio (`src/error_handlers.py` y `src/dtos/errors.py`), las specs de mailySoft-usuarios 016 y mailySoft-pacientes 008, y los paquetes instalados (TanStack Query 5.104.4 y lucide-react 1.61.0). No queda ningún NEEDS CLARIFICATION: lo que depende de otra spec o de una decisión del responsable está en [plan.md](plan.md#lo-que-necesita-aprobación).

## D1. Dónde vive el código: una feature `health` que no importa `auth`

- **Decisión**: una feature nueva, `src/features/health`, con las capas `api`, `schemas`, `policy` (reglas puras), `hooks`, `components`, `pages` e `index.ts` (constitución I). No importa `features/auth`: recibe sus capacidades, el intervalo y la identificación del build por props, como la 003 y la 007. Se añade `forbidAuthImports('health', 'research D1 of 016')` en `eslint.config.js`.
- **Composición en `app`**: `src/app/router/health/` tiene las cinco rutas (`HealthRoute`, `MonitoredComponentsListRoute`, `MonitoredComponentCreateRoute`, `MonitoredComponentDetailRoute` y `MonitoredComponentEditRoute`), que leen `useGrantedAccess()` y `useAppSettings()` y pintan las páginas diferidas de `health`. La pantalla «No se pudo comprobar el acceso» se compone en `src/app/router` (D9).
- **`index.ts`**: exporta las páginas como componentes `lazy` (patrón de `subscriptions` y `modules`: `auth` importa de aquí el tipo de las capacidades, y una exportación estática de una página arrastraría el Data Grid a la entrada), la sección diferida de la pantalla de fallo con sus dos marcadores ligeros (D9), `parseComponentId` (para titular las rutas), `useForgetHealthData` (D21) y los tipos `HealthCapabilities` y `BackofficeBuild`.
- **Alternativas descartadas**: (a) meter la página en `dashboard`, que comparte servicio: es otro recurso, otro permiso y otra pantalla; (b) una feature para la página y otra para el registro: el registro solo existe para alimentar la página y comparten esquemas, claves y textos.

## D2. Permisos, navegación y títulos

- **Recurso**: `health` entra en `SECTION_RESOURCES` (tiene entrada propia en el menú) y, con él, en `PERMISSION_RESOURCES`. `can(access, { resource: 'health', action })` decide todo (constitución V); sin `health:read` no se ofrece nada más. Solo cuentan los permisos de los roles de Sistema activos, porque salen de `evaluateAccess` (feature 006): esta feature no toca esa regla. `hasAnythingToSee` lo hereda sin cambios.
- **Capacidades**: `getHealthCapabilities(access): HealthCapabilities` en `src/features/auth/policy/healthCapabilities.ts`, como `getModuleCapabilities`: `canCreate` (`health:write`), `canEdit` (`health:update`) y `canDelete` (`health:delete`). El tipo vive en `health` y `auth` lo importa con `import type`, como hace con las demás features: no hay dependencia en tiempo de ejecución. Prueba primero (constitución VII).
- **Rutas**: `/health`, `/health/components`, `/health/components/new`, `/health/components/:componentId` y `/health/components/:componentId/edit`, bajo `RequirePermission resource="health"` (FR-002). El alta y la edición van dentro de `RequireCapability` (`canCreate`, `canEdit`), que devuelve al listado con «No tienes permiso para realizar esta acción.» (FR-041). `new` se declara antes de `:componentId`.
- **Navegación**: una entrada en `src/app/navigation/sections.ts` después de Suscripciones y antes de Token (FR-003), con `labelKey: 'health'` («Salud de servicios») y el icono nuevo `health` (`Activity` de lucide, D12). La administración del registro no tiene entrada (FR-003).
- **Títulos y foco** (FR-004): las claves `health`, `healthComponents`, `healthComponentCreate`, `healthComponentDetail` y `healthComponentEdit` en `messages.titles` y en la lista de `useRouteAccessibility`, con un `componentIdParam` que, como `userIdParam`, titula «Página no encontrada» si el segmento no es un UUID. El foco va al `h1` con el mecanismo existente.

## D3. El cliente HTTP: consultas sin credencial, tiempo por consulta y sondeo

El cliente compartido (`src/shared/api/httpClient.ts`) pide el token para **cada** consulta a su propio origen y, ante un 401, lo renueva y termina la sesión. El estado público y la comprobación directa no pueden hacer nada de eso (FR-056, FR-076). Se amplía el único cliente, sin crear otro (constitución IV):

| Cambio | Comportamiento | Lo usa |
|---|---|---|
| Opción `anonymous: true` por consulta (también en `get`) | No llama a `getAccessToken`, no envía `Authorization`, usa `fetch(…, { credentials: 'omit' })` (sin cookies) y un 401 es un error más: no renueva el token ni llama a `onSessionExpired` | Estado público (`subscriptions`) |
| Opción `timeoutMs` por consulta | Sustituye el límite del cliente (30 s) en esa consulta | Agregador, estado público y sondeos (D7) |
| Método `probe(path, { signal, timeoutMs })` | Siempre anónimo. Devuelve `{ status, body }` con el cuerpo JSON leído (o `undefined`) **sea cual sea el estado HTTP**; la red y el tiempo agotado siguen siendo `ApiError` (`network`, `timeout`) | Comprobación directa (D10) |
| `createAnonymousHttpClient({ baseUrl, timeoutMs })` | Un cliente del mismo módulo cuyas consultas son todas anónimas: no recibe funciones de token | Servicios de `VITE_HEALTH_DIRECT_SERVICES` (D4) |

- **Por qué `probe`**: el 503 de `/health/ready` con `{"status":"unavailable","checks":[…]}` es una respuesta del contrato v1, no un error, y FR-069 necesita su cuerpo y su estado a la vez (un 503 con `status` `ok` no puede verse «Operativo»). Hoy un no-2xx se convierte en `ApiError` y el cuerpo se pierde. `probe` no valida: la capa `api` de `health` valida con Zod antes de usar nada (constitución II), y nunca se muestra ni se registra el cuerpo (FR-069).
- **Peticiones simples**: sin cuerpo, el cliente solo envía `Accept: application/json`, una cabecera admitida por CORS sin *preflight*. Las consultas anónimas no llevan `Authorization` ni `Content-Type`, así que no hay `OPTIONS` previo: basta con que el servicio responda `Access-Control-Allow-Origin` (D19).
- **Uso acotado de `probe`**: una regla `no-restricted-syntax` de ESLint (`CallExpression[callee.property.name='probe']`) impide llamarlo fuera de `src/features/health/api/directCheckApi.ts`, del propio cliente y de las pruebas, para que no se convierta en una forma de saltarse la normalización de errores de la constitución IV.
- **El token sigue la regla de siempre**: solo al origen de la base de cada cliente (`url.origin === base.origin`), y nunca en las consultas anónimas (FR-008). Las direcciones del registro nunca llegan al cliente: se muestran como texto (FR-007).
- **Alternativas descartadas**: (a) un cliente nuevo para el estado público: el solicitante pidió el de `subscriptions`, y duplicaría la base; (b) leer el 503 desde el `ApiError` guardando el cuerpo crudo en todos los errores: expondría cuerpos de cualquier servicio en un objeto que se registra; (c) `fetch` directo en `health`: lo prohíbe la constitución IV y ESLint.

## D4. Clientes y direcciones de cada consulta

- **maily-system-api** (`useHttpClients().subscriptions`, `VITE_SUBSCRIPTIONS_API_URL`, que apunta a la raíz del servicio): el agregador `GET /api/v1/health`, el registro `/api/v1/monitored-components`, el estado público `GET /health/status` (raíz, `anonymous`) y los sondeos `/health/live` y `/health/ready` de su fila de la comprobación directa (FR-006, FR-055, FR-068). En desarrollo, `/proxy/subscriptions` reenvía cualquier ruta, también estas.
- **mailySoft-usuarios** (`users`, `VITE_USERS_API_URL`): solo los dos sondeos (FR-068). `/proxy/users` también los reenvía.
- **Servicios de `VITE_HEALTH_DIRECT_SERVICES`**: `HttpClientsProvider` crea, una sola vez y junto a los otros dos, un cliente anónimo por servicio. `HttpClients` (en `shared/api`) gana `healthServices: readonly NamedHttpClient[]` (`{ code, name, client }`, en el orden de la variable); el nombre y el comentario son genéricos, sin hablar de la feature.
- **Rutas aisladas** en `health/api` (constitución IV): `HEALTH_RESULT_PATH`, `MONITORED_COMPONENTS_PATH`, `PUBLIC_STATUS_PATH`, `LIVE_PATH` y `READY_PATH`. Las rutas se agregan a la base tal como está configurada (`/proxy/users` + `/health/live`), porque el cliente ya concatena así (FR-068).
- **Nunca**: una dirección del registro, otra ruta de un servicio o la base de datos (FR-007, SC-008). La lista de destinos de la comprobación directa se arma solo con estos tres orígenes de configuración.

## D5. Esquemas Zod: forma estricta, valores tolerantes

- **Decisión**: un esquema por respuesta, con `.transform` a camelCase en `health/schemas` (constitución II): `healthResultSchema`, `publicStatusSchema`, `liveBodySchema` y `readyBodySchema` (contrato v1), y `monitoredComponentSchema` (registro). La forma es estricta (si falta una clave obligatoria o tiene otro tipo, es `ApiError` de tipo `contract` y nunca se muestran datos a medias, FR-009) y los **valores** desconocidos de estado, tipo, chequeo y código de error se aceptan como texto y se traducen a «desconocido» en un mapeo puro (`toComponentStatus`, `toOverallStatus`, `toComponentKind`, `toCheckStatus`), nunca con `z.enum`.
- **«No disponible»** (FR-014): `version`, `commit` y `environment` vacíos, solo espacios, `unknown`, `null` o ausentes valen `null`; `build_date` y el `checked_at` del componente, además, si no son una fecha ISO 8601 válida; `latency_ms` ausente o `null` vale `null` y 0 sigue siendo 0. En cambio, una latencia negativa o con decimales, un `checked_at` del resultado inválido o un `next_start_at` que no es fecha ni `null` son fallos de contrato (caso límite de la spec).
- **Precisión aplicada a la spec** (FR-014 y su caso límite): los cuatro datos de build, la latencia y la última comprobación de un componente toleran faltar, porque el agregador los copia de cada componente y el contrato los admite desconocidos; cualquier otra clave obligatoria que falte invalida la respuesta. Se registra en [data-model.md](data-model.md#reglas-de-validación-del-resultado).
- **Campos de más**: `z.object` los descarta. La sección «Estado de la plataforma» nunca puede mostrar versiones, latencias ni errores porque su esquema no los tiene (SC-014).
- **Tipos desde el OpenAPI (DEBERÍA)**: se escriben a mano, como en la 002, la 003 y la 007 (Complexity Tracking). Hoy ni siquiera hay OpenAPI: system-api 005 está en planeación. Los contratos que se consumen quedan en [contracts/](contracts/).

## D6. El ciclo de «Salud de servicios» y la cadena de respaldo

El ciclo tiene que cumplir FR-020 a FR-029 como el Panel (007 D5) y, además, FR-071: cuando falla el agregador, el ciclo sigue con el estado público y, si también falla, con la comprobación directa; la cuenta del intervalo empieza **cuando termina la cadena** y ningún ciclo o «Actualizar» lanza otra mientras está en curso.

- **Decisión**: una consulta de TanStack Query que representa **el ciclo** (`healthKeys.cycle()`), con las opciones de la 007, y una consulta por **paso** (`healthKeys.result()`, `healthKeys.platformStatus('page')` y `healthKeys.directCheck('page')`), definidas con `queryOptions` y compartidas por el ciclo y por los componentes:
  - la función del ciclo ejecuta cada paso con `queryClient.fetchQuery(opcionesDelPaso)`, en orden, y empieza un paso solo si el anterior falló (FR-067);
  - los componentes observan cada paso con `useQuery({ ...opcionesDelPaso, enabled: false })`: ven su carga, sus datos y su error en cuanto cambian, así que el aviso de FR-030 aparece en cuanto falla el agregador, antes de que el estado público responda (US6-8);
  - el ciclo resuelve `{ kind: 'done' }` o `{ kind: 'forbidden' }` y solo rechaza con `SessionExpiredError`.

| Opción del ciclo | Valor | Requisito | Comportamiento |
|---|---|---|---|
| `queryFn` | `({ signal }) => runHealthCycle(…)` con la señal | FR-025 | Al salir de la página, el último observador se va y el ciclo se aborta; su señal cancela los pasos en curso (`cancelQueries`) |
| `refetchOnMount` | `'always'` | FR-022 | Cada entrada lanza un ciclo; los últimos datos del agregador se ven mientras tanto |
| `refetchInterval` | `(q) => q.state.data?.kind === 'forbidden' ? false : refreshMs` | FR-020, FR-024, FR-071 | TanStack rearma el temporizador en cada cambio de estado del ciclo, y el ciclo cambia de estado cuando termina la cadena: la cuenta empieza ahí (007, «Lo aprendido») |
| `refetchIntervalInBackground` | `false` | FR-021 | Con la pestaña oculta no empieza ningún ciclo |
| `refetchOnWindowFocus` | `(q) => !forbidden && isRefreshDue(últimaCorrecta, Date.now(), refreshMs)` | FR-023 | `últimaCorrecta` es el `dataUpdatedAt` de `healthKeys.result()`, leído con `queryClient` dentro de la función, que corre en el evento y no en el render |
| `refetchOnReconnect` | `false` | FR-020 | Las únicas consultas automáticas son el intervalo, la entrada y el regreso |
| `retry` | `false` | IV | Los reintentos son de cada paso (D7), no del ciclo |
| `networkMode` | `'always'` | IV, VI | Como el resto: sin conexión, falla en vez de quedar en pausa |

- **Una sola en curso** (FR-025, FR-071): «Actualizar» y «Reintentar» llaman a `refetch({ cancelRefetch: false })` del ciclo, que se une al que esté en curso; el intervalo, la entrada y el foco también se deduplican. Así nunca hay dos consultas iguales en curso, tampoco dos cadenas.
- **Lo que hace la cadena con las secciones**: si el agregador responde bien o con 403, el ciclo quita de la caché los pasos de las secciones (desaparecen, FR-061, FR-070). Si el estado público responde bien, quita el de la comprobación directa. Al salir de la página los quita todos, para que cada aparición empiece en carga (FR-064, FR-070).
- **Alternativas descartadas**:
  - (a) El `refetchInterval` en la consulta del agregador y la cadena aparte: la cuenta empezaría al fallar el agregador y no al terminar la cadena, y un ciclo podría empezar con la comprobación directa todavía en curso (FR-071).
  - (b) Una sola consulta que devuelva todo el estado (agregador y respaldo): escondería el progreso de la cadena (el aviso del fallo llegaría al final) y obligaría a copiar los últimos datos buenos dentro del resultado.
  - (c) Un temporizador propio con `useEffect`: reescribiría la deduplicación, la cancelación, la pausa con la pestaña oculta y la regla del regreso que TanStack ya resuelve (007 D5).

## D7. Tiempos límite y reintentos

| Consulta | Límite por intento | Reintentos (solo red, tiempo agotado y 5xx) | Motivo |
|---|---|---|---|
| Agregador `GET /api/v1/health` | 15 s | 1, a 1 s | Con la configuración por defecto de system-api, su peor caso es 5 s de autorización (`USERS_API_TIMEOUT_SECONDS`) más 7 s de agregación (2 × `HEALTH_CHECK_TIMEOUT_SECONDS` + 1): 12 s. Un reintento tapa un corte aislado sin retrasar la cadena |
| Estado público `GET /health/status` | 10 s | 1, a 1 s | No autoriza; su peor caso es una agregación nueva, 7 s. Casi siempre responde de la caché (15 s) |
| Comprobación directa (cada `live` y `ready`) | 5 s | 0 | Fijado por la spec (FR-068, decisión (z)); las consultas van en paralelo |
| Registro: listado y detalle | 30 s | 2, a 1 s y 2 s | Los valores comunes de `createQueryClient` |
| Registro: alta, edición y eliminación | 30 s | 0 | Las mutaciones nunca se reintentan (IV) |

- **Presupuesto de la cadena con maily-system-api detenido** (SC-019, SC-020): un proceso detenido rechaza la conexión (o su intermediario responde 502 sin CORS), así que cada intento falla al instante. En «Salud de servicios»: agregador (1 s de espera) + estado público (1 s) + comprobación directa (5 s como máximo) ≈ 7 s, dentro de 10 s. En la pantalla de fallo, sin agregador, ≈ 6 s. Si el servicio **no responde** en lugar de estar detenido, la cadena puede llegar a ≈ 57 s (15 + 1 + 15, 10 + 1 + 10 y 5): no rompe nada, porque el siguiente ciclo se cuenta desde que termina, pero queda fuera de esos criterios, que hablan de un servicio detenido.
- **SC-013** (5 s en la pantalla de fallo con la base detenida): el Backoffice no añade esperas; el tiempo lo pone la agregación de system-api con la base detenida (su FR-019) o su caché. Se anota en [contracts/public-status.md](contracts/public-status.md).
- **Una sola regla de reintentos**: `shared/api/retry.ts` gana `retryUpTo(max)` (la misma condición de `shouldRetryQuery` con otro máximo) y `retryDelay` no cambia.
- **Si system-api sube `HEALTH_CHECK_TIMEOUT_SECONDS` por encima de 4**, el peor caso del agregador pasa de 15 s y la consulta se cortaría antes: se anota como punto de coordinación en [contracts/health-aggregator.md](contracts/health-aggregator.md).

## D8. Rechazos del agregador y cuándo empieza la cadena

- **403** (FR-031): la función del paso convierte el `ApiError` 403 en el resultado `{ kind: 'forbidden' }`, como la 007 (D6): reemplaza los datos, el ciclo deja de repetirse en esa visita, no hay cadena (FR-067) y el manejador global no muestra «No tienes permiso para realizar esta acción.», que duplicaría el aviso de la página. Al volver a entrar, `refetchOnMount: 'always'` consulta de nuevo y, mientras tanto, la página muestra la carga (no el aviso viejo).
- **401** (FR-033): lo resuelve el cliente (un intento de renovar y, si no, `onSessionExpired`). El paso rechaza con `SessionExpiredError`; el ciclo no sigue la cadena.
- **Disparan la cadena** (`startsFallbackChain`, FR-067): `ApiError` de tipo `network`, `timeout` o `contract`, y `http` con estado 5xx (incluido el 503 de permiso no verificable).
- **Otros 4xx** (por ejemplo, un 404 de un system-api sin la 005): son el fallo de FR-030 sin cadena, porque el servicio respondió y la spec solo encadena ante red, tiempo, 5xx y contrato.
- **503** (FR-030): el aviso y el mensaje añaden la posible causa: mailySoft-usuarios o la base de datos no disponibles, por ejemplo fuera del horario de encendido. Se decide por el estado HTTP, no por el texto del servicio.

## D9. La cadena en «No se pudo comprobar el acceso»

- **Composición** (restricción 8 de la spec): `AccessCheckFailedPage` (en `auth`) gana un `children` que pinta después de la línea de la cuenta, y no sabe qué recibe. `ProtectedRoute` (en `app`) pinta, en el caso `failed`, `AccessCheckFailedScreen`, un componente nuevo de `app/router` que:
  - guarda `round` (0 al aparecer), y envuelve `refetch` para sumar 1 cada vez que la persona elige «Reintentar»;
  - pasa a `AccessCheckFallback` (diferido, de `health`) `round` y `paused`, que es «se está comprobando el acceso»;
  - lo envuelve en `Suspense` (marcador «Consultando el estado de la plataforma…») y en `ErrorBoundary` (marcador «No se pudo obtener el estado de la plataforma.»), así que un fragmento que no carga se ve como el fallo de FR-060 y no rompe la pantalla.
- **`paused`**: `OperatorAccessState` en `failed` gana `isChecking` (el `isFetching` de la consulta de acceso). Es la única línea que cambia en `useOperatorAccess`: no cambian cuándo se comprueba, el límite de 30 s ni la regla por tipo de rol (FR-065). Mientras se reintenta, la consulta de acceso sigue en error, así que la pantalla no se desmonta.
- **La cadena por ronda**: `AccessCheckFallback` usa `useQuery` con `healthKeys.accessChain(round)`, `enabled: !paused`, `staleTime: Infinity`, sin intervalo, sin foco y sin reconexión, `retry: false` y `gcTime: 0`. Su función ejecuta estado público y, si falla, comprobación directa, con los mismos pasos de D6 en el ámbito `'access'`.
  - Al aparecer, la ronda 0 se consulta una vez (FR-061).
  - «Reintentar» suma una ronda; mientras se comprueba el acceso (`paused`) la cadena no empieza y lo que estuviera en curso se cancela (FR-071). Si la comprobación vuelve a fallar, la ronda nueva se consulta y las secciones conservan lo que mostraban con «Actualizando…» (FR-064); si sale bien, la pantalla se desmonta y la persona entra sin esperar (FR-065).
  - El paso del tiempo, el regreso a la pestaña y las recomprobaciones que la persona no pide no cambian la ronda: no se repite nada (SC-015, SC-021).
- **Precisión aplicada a la spec** (FR-071, SC-015 y SC-021, aprobada el 2026-10-24): si una recomprobación que la persona no pidió (cada 5 min o al volver a la pestaña) empieza con un paso de la cadena en curso, ese paso se cancela (nada mientras se comprueba) y se completa cuando la comprobación vuelve a fallar, porque la cancelación revierte la consulta a «sin datos»; no cuenta como una consulta nueva y un paso que ya terminó no se repite.
- **«Sin acceso»** no cambia: no tiene la sección ni consulta nada (FR-055, feature 006 FR-012).

## D10. La comprobación directa

- **Destinos**, en este orden (FR-068): maily-system-api («maily-system-api», cliente `subscriptions`), mailySoft-usuarios («mailySoft-usuarios», cliente `users`) y los de `healthServices`, con su `name`. Los dos primeros nombres salen de `es.ts` (FR-074).
- **Ejecución**: un solo paso (`healthKeys.directCheck(scope)`) cuya función lanza en paralelo `probe(LIVE_PATH)` y `probe(READY_PATH)` de cada destino, con 5 s cada una, sin reintentos, y devuelve todas las filas juntas cuando terminan todas (FR-068, FR-070). Nunca rechaza: cada falla es el estado de su fila. Una sola en curso por ámbito (D6, D9).
- **Decisión de cada fila** (`decideDirectStatus`, puro, FR-069):

| Vida (`/health/live`) | Disponibilidad (`/health/ready`) | Fila |
|---|---|---|
| 2xx con `{"status":"ok"}` | 2xx con `status` `ok` y `checks` | «Operativo» |
| 2xx con `{"status":"ok"}` | 503 con `{"status":"unavailable","checks":[…]}` | «Degradado», con la explicación de cada chequeo en error: `database` → «Su base de datos no responde.» (o «Le falta configuración, por ejemplo la conexión a la base de datos.» con `not_configured`); otro nombre → «Falló uno de sus chequeos.»; sin repetir; si ninguno está en error, «Está en línea, pero no está listo para atender.» |
| 2xx con `{"status":"ok"}` | cualquier otra respuesta o falla | «Degradado», con «Está en línea, pero no está listo para atender.» |
| red, CORS, tiempo agotado, no 2xx o cuerpo fuera del contrato (p. ej., HTML) | cualquiera | «No responde» |

- **Lo que no hace** (FR-070): no marca ningún otro componente, no deduce la base de datos, no calcula estado general ni cuenta. El texto «Sin información» agrupa lo demás. Ningún texto de la respuesta llega a la pantalla.
- **CORS**: un bloqueo de CORS o de la CSP es, para el navegador, un error de red: «No responde», sin otro aviso (FR-069). Por eso D19 verifica CORS en cada ambiente.

## D11. Los estados se derivan de las consultas

- **Decisión**: funciones puras en `health/hooks`, probadas con unitarias, reducen las consultas a lo que se pinta ([data-model.md](data-model.md#10-estados-de-la-página)):
  - `toHealthPageView(resultado, ciclo)`: `loading`, `failed` (sin datos y con error, con `authorizationUnavailable` si fue 503), `forbidden` y `ready` (datos, `updatedAt`, `isUpdating`, `refreshFailed` y `authorizationUnavailable`).
  - `toPlatformStatusView(paso)`: `hidden`, `loading`, `ready` (con `isRefreshing`), `empty` y `failed`. Si la última consulta falló, se muestra el fallo aunque hubiera datos (decisión (v) de la spec).
  - `toDirectCheckView(paso)`: `hidden`, `loading` y `ready` (filas, con `isRefreshing`).
- **TanStack**: tras un fallo con datos, el paso sigue en `error` con los datos conservados hasta que una consulta sale bien, así que el aviso de FR-030 queda montado y no se anuncia otra vez en cada ciclo (como la 007, D8).
- **Sin `useState` para datos del servidor** (constitución III): solo es estado de UI qué detalles están desplegados (D12) y qué anuncios ya se hicieron (D14).

## D12. Presentación

- **Encabezado**: `h1` «Salud de servicios»; debajo, «Actualizado hace …» con «Actualizando…», el botón «Actualizar» (con icono `refresh`) y el enlace «Componentes monitoreados» (FR-005). «Actualizar» no se deshabilita mientras hay un ciclo: una pulsación se une al que está en curso (US2-6) y el foco se queda en el botón (FR-026).
- **Estado general** (FR-010): un bloque con icono, texto y color y «N de M operativos» (componentes `up` del total recibido).
- **Avisos**: base de datos detenida o caída (FR-017, con la línea de regreso de D13) y registro no disponible (FR-018), con `Alert` de MUI y `role="note"` en lugar de su `role="alert"` por defecto: no son fallos y FR-049 no admite anunciarlos.
- **Componentes** (FR-011, FR-012): un `h2` «Componentes» y una lista (`ul`) con un elemento por componente, en el orden recibido y sin paginar; cada uno con su nombre como `h3` y una lista de descripción con tipo, estado, latencia («1,284 ms», `formatCount` de es-MX), última comprobación (`formatDateTime` con segundos), versión, commit corto (los 7 primeros caracteres, completo si tiene menos), fecha de build y entorno. Una columna a 320 px y nombres que se ajustan (`overflowWrap: 'anywhere'`).
- **Detalle** (FR-015): un botón «Detalle» con nombre accesible «Detalle de {nombre}», `aria-expanded` y `aria-controls`, y un `Collapse` de MUI con los chequeos (nombre en español si el contrato lo define: `database` → «Base de datos»), su estado en texto y su latencia, y la explicación del error (FR-016) o «Sin detalles adicionales.». Lo desplegado se guarda por `code` en el estado de la página, así sigue abierto tras cada ciclo.
- **Estados con icono, texto y color** (FR-013, FR-070): `Badge` con estos tonos, como pidió el solicitante, e iconos nuevos en `iconRegistry` (verificados en lucide-react 1.61.0):

| Estado | Texto | Tono | Icono (registro → lucide) |
|---|---|---|---|
| `up` | Operativo | `success` | `status-up` → `CircleCheck` |
| `degraded` | Degradado | `warning` | `status-degraded` → `TriangleAlert` |
| `down` | Caído | `danger` | `status-down` → `CircleX` |
| `stopped` | Detenida por horario | `neutral` | `status-stopped` → `Clock` |
| `unknown` y cualquier otro | Desconocido | `neutral` | `status-unknown` → `CircleHelp` |
| Comprobación directa: no responde | No responde | `danger` | `status-unreachable` → `Unplug` |

  El estado general usa los mismos iconos (`ok` → `status-up`). La sección se registra con `health` → `Activity` y «Actualizar» con `refresh` → `RefreshCw`. «Detenida por horario» y «Desconocido» comparten tono pero no icono.
- **Bloque «Backoffice»** (FR-044): un `h2` y una lista de descripción con versión, commit corto y fecha de build (D18); se ve en la carga, con datos y con fallo, y no en el estado sin permiso.
- **URL del registro**: siempre texto, nunca enlace (FR-007).

## D13. El reloj de la página y la línea de regreso

- **Reloj**: `useNow()` en `health/hooks`, sobre `useSyncExternalStore` y un almacén que hace un tic por segundo mientras haya suscriptores y la pestaña esté visible (y uno al volver). El render lee la hora del almacén, nunca `Date.now()` (constitución I, `react-hooks/purity`). Lo usan «Actualizado hace» y la línea de regreso; los temporizadores simulados de Vitest lo controlan.
- **«Actualizado hace»** (`formatElapsed`, FR-027): desde el `dataUpdatedAt` del agregador (la hora del navegador al llegar la respuesta): «hace X s» por debajo de un minuto, «hace X min» por debajo de una hora y, desde ahí, la fecha y la hora con `formatDateTime`. Nunca negativo: un desfase se trata como 0 s.
- **Línea de regreso** (`formatReturnLine(nextStartAt, now, { timeZone })`, FR-059): con `Intl.DateTimeFormat('es', { weekday, day, month, hour, minute, hourCycle: 'h23', timeZone })` y `formatToParts`, para escribir «el lunes 2 de noviembre a las 8:00» sin la coma que pone el formato largo. «a la» cuando la hora es la 1 (1:00 a 1:59); «a las» en las demás, también a las 0 y a las 13. Antes de `next_start_at`: «Vuelve a estar disponible el …»; desde ese instante, «Su encendido estaba programado para el …», y el cambio llega solo con el reloj. Nunca tiempo restante. `timeZone` vale la del navegador; las pruebas pasan `America/Mexico_City` y `Pacific/Auckland`, porque Vitest fija `TZ=UTC`.
- **Solo la base de datos** `stopped` muestra la línea; un `next_start_at` en otro componente o estado se ignora (FR-059).

## D14. Accesibilidad y anuncios

- **Estructura** (FR-049, FR-063, FR-075): `h1` por pantalla; `h2` para «Componentes», «Backoffice», «Estado de la plataforma» y «Comprobación directa» (un nivel por debajo del `h1` en las dos pantallas, también en la de fallo, cuyo `h1` es el título de `ErrorState`); `h3` por componente. Cada componente y cada fila de las secciones se identifica por su nombre y lleva su estado en texto.
- **Lo que se anuncia**:
  - el fallo de FR-030 (`RefreshFailedAlert` o `ErrorState`, `role="alert"`) una vez, al aparecer;
  - el estado sin permiso, una vez (`Alert` con `role="alert"`, como el aviso de la 007);
  - cada sección, de forma cortés, en su propia región `LiveStatus` (siempre montada y vacía hasta que hay algo que decir): cuando su paso termina por primera vez desde que apareció, y tras cada «Reintentar» o «Actualizar» de la persona. La página lleva un contador de pedidos de la persona; en la pantalla de fallo hace ese papel `round`. Las repeticiones automáticas no escriben en la región (FR-063, FR-075, decisión (ad)).
  - Lo anunciado es el texto de la sección: su encabezado, el estado general, el aviso de la base de datos con su línea y cada componente o fila con su estado.
- **Lo que no se anuncia**: «Actualizado hace», «Actualizando…», los datos nuevos de cada ciclo y los avisos de base de datos y de registro (texto normal, sin región viva); el indicador gráfico de «Actualizando…» es `aria-hidden`.
- **Orden**: el aviso del fallo es asertivo y llega primero; las secciones son corteses y esperan a que termine (FR-063, FR-075).
- **Foco**: al entrar, al `h1`; las actualizaciones no lo mueven; los diálogos lo gestionan con `ConfirmDialog`. axe en cada estado de SC-003, SC-016 y SC-022, en las dos pantallas.
- **Contraste**: los tonos de `Badge` ya cumplen en los dos temas (features 008 y 009); jsdom no calcula colores, así que el contraste se revisa en el navegador ([quickstart.md](quickstart.md)).

## D15. Administración del registro: listado paginado en el navegador

- **Listado** (FR-034): una sola consulta del registro completo (`healthKeys.components()`), cortada en memoria con `pageOf` y mostrada en el Data Grid con `paginationMode="server"` y `rowCount`, como Suscripciones (003 D6). El grid nunca recibe más filas que el tamaño de página. Página y tamaño en los parámetros de la URL (`componentsLocationSchema`, con 10, 25 y 50 y 10 por defecto; una página que no existe se corrige con `replace` cuando llegó la lista). Orden: el del servicio (`sort_order` y `code`), sin reordenar.
- **Desvío de la constitución IV** (DEBE paginar en el servidor): system-api 005 entrega la lista completa sin paginar y declara para este catálogo la excepción, con un máximo esperado de 50 componentes (su FR-023). Se registra en Complexity Tracking como en la 003. `pageOf` pasa a `shared/lib` porque ya lo usan dos listados, como la 003 movió `atMost`.
- **Columnas**: nombre (enlace al detalle), código, tipo, URL base (texto), habilitado («Habilitado» o «Deshabilitado») y orden. Localización en español del Data Grid (FR-050).
- **Vacío** (US3-2): «Todavía no hay componentes registrados.» y la explicación de que maily-system-api y la base de datos se monitorean siempre; esa explicación también se ve sobre el listado con datos (FR-043).
- **Detalle** (FR-035): todos los datos, con las fechas en `formatDateTime`, y las acciones que permitan las capacidades.
- **Formulario compartido** (FR-036 a FR-038), con React Hook Form y `componentFormSchema`:
  - alta: tipo (Microservicio o Frontend); un microservicio propone `/health/live`, `/health/ready` e `/info`; un frontend pide su ruta de salud (`live_path`) y una ruta de información opcional, sin ruta de disponibilidad, con la advertencia de FR-036;
  - edición: el código y el tipo se muestran como información fija y no se envían;
  - reglas en el navegador: nombre de 1 a 100 sin contar espacios de los extremos; código de 2 a 50, slug (minúsculas, dígitos y guiones, empieza con letra, sin guion final ni dos guiones seguidos); URL `http(s)` con dominio, sin usuario, contraseña, parámetros (ni un `?` vacío) ni fragmento, hasta 255; rutas que empiezan con una sola `/`, sin `\`, `?`, `#`, `%`, espacios, ni segmentos `.` o `..`, hasta 200 (el patrón del OpenAPI de la 005); orden entero de 0 a 9999 (vacío vale 0); habilitado marcado por defecto. La unicidad del código y los dominios permitidos los decide el servicio (FR-038).
- **Envíos**: alta con todos los campos (`ready_path: null` y, sin ruta de información, `info_path: null` en un frontend); edición con solo lo que cambió y ninguna petición si no cambió nada, como la 003 (D9): un `PATCH` vacío sería un 422 del servicio.
- **Eliminación** (FR-040): `ConfirmDialog` que nombra el componente y explica que dejará de monitorearse y de aparecer en «Salud de servicios».
- **Caché**: el alta invalida el listado; la edición fija el detalle e invalida el listado; la eliminación quita el detalle e invalida el listado. No se invalida el resultado del agregador: la página consulta al entrar y el cambio se ve cuando vence la caché del agregador (FR-042).

## D16. Errores del registro: la forma del 422 y su mapeo

La forma exacta quedó para el plan (restricción 2 de la spec). Es el formato uniforme de maily-system-api, leído en su código (`src/dtos/errors.py`, `src/error_handlers.py`) y en su spec 005 (FR-030):

```json
{
  "code": "validation_error",
  "message": "<texto en español>",
  "errors": [{ "field": "base_url", "message": "<texto en español>" }]
}
```

- `field` es el nombre del campo de la API en snake_case (`code`, `name`, `kind`, `base_url`, `live_path`, `ready_path`, `info_path`, `enabled` y `sort_order`), `component_id` para el identificador de la ruta o `body` para el cuerpo entero (JSON inválido o una modificación sin datos). `errors` solo aparece en `validation_error`. El host fuera de `HEALTH_ALLOWED_HOSTS` es un elemento con `field: "base_url"`, cuyo mensaje no repite la dirección.
- **Mapeo** (`describeMonitoredComponentError`, prueba primero):

| Respuesta | Resultado en pantalla |
|---|---|
| 422 con `base_url` | Junto a la URL base: «Esta dirección no se puede monitorear. Su dominio debe agregarse a la lista permitida del servicio de salud.» (host no permitido o forma rechazada por el servicio: US3-7) |
| 422 con `code`, `name`, `live_path`, `ready_path`, `info_path`, `sort_order`, `enabled` o `kind` | Junto a su campo, el texto de formato de ese campo (el mismo de la validación del navegador) |
| 422 con `body`, `component_id`, un campo desconocido o sin `errors` | Error general del formulario, genérico |
| 409 `monitored_component_code_already_exists` | «Ya existe un componente con este código.» junto al código (también para los códigos reservados) |
| 404 `monitored_component_not_found` | «Este componente ya no existe.» y vuelta al listado actualizado (detalle, edición y eliminación) |
| 403 | El aviso habitual de falta de permiso; en el listado y el detalle, el estado sin permiso |
| 500 `internal_error`, 503, red o tiempo agotado | Mensaje genérico; en lecturas, con «Reintentar» (y la posible causa de FR-030 si es 503) |

- Nunca se muestra el `message` del servicio ni los de sus campos (FR-039). El formulario conserva lo escrito y la acción se deshabilita mientras está en curso (FR-039).
- **Confirmado con el plan de system-api 005** (su `contracts/error-catalog.md`, 2026-10-24): el rechazo del host llega como `validation_error` con `field: "base_url"`, con el mismo cuerpo que la validación de FastAPI, y la combinación resultante de un `PATCH` también ([contracts/monitored-components.md](contracts/monitored-components.md#confirmado-con-el-plan-de-system-api-005)).

## D17. Configuración: el intervalo y los servicios de la comprobación directa

- **`VITE_HEALTH_REFRESH_SECONDS`** (FR-046 a FR-048), con el patrón de `VITE_DASHBOARD_REFRESH_MINUTES`: `emptyToUndefined`, solo dígitos (`/^\d+$/`), entero de 10 a 300 y 30 por defecto. Inválidos: «9», «301», «30.5», «+30», «-30», «treinta», « 30 » y «   ». Válidos: «10», «030» y «300». La regla, en `messages.config.rules.healthRefreshSeconds`, sin repetir el valor.
- **`VITE_HEALTH_DIRECT_SERVICES`** (FR-072, FR-073): texto JSON que `env.ts` lee dentro de un `z.preprocess` con `try/catch` (un JSON inválido es un fallo de la regla, no una excepción). Vacía, no definida o `[]` vale `[]`; solo espacios es inválida. Esquema: lista de hasta 20 `z.strictObject({ code, name, url })`, con `code` de 2 a 50 en el formato del código del registro, `name` de 1 a 100 sin contar los espacios de los extremos (se guarda recortado) y `url` con `isApiBase` (la regla de las URL base de las APIs: ruta del mismo origen o URL absoluta, `https` en producción, sin barra final, credenciales, parámetros ni fragmento). Un `superRefine` rechaza códigos repetidos y los de los dos fijos (`maily-system-api` y `mailysoft-usuarios`). La regla, en `messages.config.rules.healthDirectServices`; `parseEnv` ya informa una vez por variable, con el nombre y sin el valor.
- **Cómo llegan**: `AppSettingsProvider` gana `healthRefreshMs` (segundos × 1000) y `backofficeBuild` (D18); `HttpClientsProvider` crea los clientes anónimos (D4). `HealthRoute` lee los ajustes y los pasa a la página por props (constitución I).
- **Documentación**: `.env.example` (comentadas, con el ejemplo de mailySoft-pacientes), la tabla del README, `specs/001-auth-session-profile/contracts/environment.md` y [contracts/environment.md](contracts/environment.md); `src/vite-env.d.ts` declara las dos. Las dos se fijan al compilar: cambiarlas exige compilar y desplegar.

## D18. La identificación del build del Backoffice

- **Versión, una sola fuente** (FR-045): `package.json` gana `"version"` (hoy no tiene); será `1.0.0`, confirmada por el responsable el 2026-10-24. `vite.config.ts` la lee y la inyecta con `define` como `__APP_VERSION__`.
- **Commit y fecha**: `vite.config.ts` inyecta `__APP_COMMIT_SHA__` y `__APP_BUILD_DATE__` desde las variables de compilación `APP_COMMIT_SHA` y `APP_BUILD_DATE`, los mismos nombres que usan los tres servicios. No son `VITE_*` a propósito: un valor inválido de una `VITE_*` impide arrancar, y aquí FR-045 pide lo contrario. Si faltan, se inyecta una cadena vacía; el Backoffice no las rellena solo (por ejemplo, con la hora de compilación), porque entonces nunca habría un build «sin fecha» (US4-2).
- **Validación**: `parseBuildInfo` en `src/app/config/buildInfo.ts`, con Zod y sin fallar nunca: versión semver, commit de 7 a 64 caracteres hexadecimales y fecha ISO 8601 con zona; lo que falte o no cumpla vale `null` («No disponible»). `AppSettingsProvider` lo calcula una vez y `HealthRoute` lo pasa a la página. Se prueba con valores pasados a la función, no con `define`.
- **README**: cómo inyectarlas al compilar, por ejemplo `APP_COMMIT_SHA=$(git rev-parse HEAD) APP_BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) npm run build`, y que un build sin ellas compila y arranca (SC-011). `src/vite-env.d.ts` declara las tres constantes.
- **Por qué no es configuración** (constitución, «Configuración y secretos»): la versión, el commit y la fecha no cambian el comportamiento del Backoffice, solo lo identifican; se validan con Zod al arrancar y se documentan en `.env.example` y en el README, pero FR-045 prohíbe que impidan arrancar. Si la revisión los leyera como configuración, la salida es una aclaración PATCH (1.6.1) de esa sección, no un desvío en Complexity Tracking.

## D19. CSP, CORS y el despliegue

- **El token nunca sale de su origen**: el estado público y los sondeos van sin credencial (D3); el agregador y el registro, con el token, solo al origen de `VITE_SUBSCRIPTIONS_API_URL`. Ninguna dirección del registro se consulta ni se enlaza.
- **CSP** (FR-077): maily-system-api y mailySoft-usuarios ya están en `connect-src` (o se sirven por el mismo origen): no cambia nada por ellos. Cada origen **absoluto** de `VITE_HEALTH_DIRECT_SERVICES` debe agregarse a `connect-src` del despliegue; una ruta del mismo origen no necesita nada. El README lo dice en «Despliegue».
- **CORS** (FR-077, SC-024): cada servicio de la comprobación directa debe responder `Access-Control-Allow-Origin` con el origen del Backoffice en `/health/live` y `/health/ready`, y maily-system-api, también en `/health/status`, sin credenciales. Como las consultas son simples (D3), no hace falta responder `OPTIONS`.
- **Verificación por ambiente** (SC-024, restricción 5): un script sin dependencias, `scripts/check-health-cors.mjs` (`npm run check:health-cors -- --origin <origen> <bases…>`), pide cada ruta con la cabecera `Origin` y comprueba la respuesta y su `Access-Control-Allow-Origin`; se ejecuta en desarrollo, pruebas y producción antes de dar el ambiente por listo y cada vez que cambien dominios o configuración ([quickstart.md](quickstart.md)). No corre en CI, porque necesita los servicios reales. La CSP se revisa leyendo la cabecera servida.
- **Desarrollo y mailySoft-pacientes** (restricción 5): `vite.config.ts` agrega `/proxy/patients` **solo si** se define `PATIENTS_API_PROXY_TARGET`, como los otros dos intermediarios; sin ella, se usa la URL del servicio con su `CORS_ALLOWED_ORIGINS` incluyendo `http://localhost:5173`. Las dos formas quedan en el README.
- **La ruta `/health` del Backoffice**: el hosting debe servir `index.html` también en `/health` y `/health/components…` (el *fallback* de la SPA). Si el servidor del Backoffice reservara `/health` para su propia *probe*, una recarga de la página no llegaría a la aplicación; se anota en «Despliegue» del README.

## D20. Tamaño del paquete y carga diferida

- **Diferido** (FR-052, SC-005): las cinco páginas, con `React.lazy` desde `health/index.ts`; el Data Grid entra con el fragmento del listado, como en Usuarios y Suscripciones; y la sección de la pantalla de fallo es otro fragmento (`AccessCheckFallback`), con sus marcadores de carga y de fallo en la entrada (D9).
- **Lo que entra en la ruta de entrada**: los textos (`es.ts`, un solo módulo que la entrada ya importa), los iconos nuevos del registro, la validación de las dos variables y del build, las rutas y la entrada del menú, `getHealthCapabilities`, los cambios del cliente HTTP, los ajustes, `AccessCheckFailedScreen` con sus marcadores y `useForgetHealthData`. Estimación: unos 4 KB gzip (2,5 de textos, 1 de iconos y el resto de código); se mide.
- **Guardas nuevas en `scripts/check-entry-size.mjs`**: falla si la entrada contiene `'/api/v1/monitored-components'` o `'/health/status'` (literales que solo existen en la capa `api` de `health`, siempre diferida), y si ningún fragmento diferido los contiene (la guarda quedó obsoleta), como las guardas del Data Grid y de Token.
- **Hallazgo: `main` ya excede el presupuesto**. El CI de `main` en `c7a7c72` falla en `npm run size` con **361,5 KB gzip** (límite: 300 KB; run 40111108669 del 2026-10-24), y falla así desde `5106786`, el primer push tras el merge de la 014 (361,4 KB; en `a7cb755` el CI ya había fallado antes, en la cobertura). La causa: `src/features/roles/index.ts` exporta `RolesPage` de forma estática y `routes.tsx` importa `RolesRoute`, así que Roles y permisos (con `TextField` y sus diálogos) está en la entrada. La 013 corrigió lo mismo para Módulos en `6de221e`.
- **Margen esperado**: según el mensaje de `6de221e`, tras diferir Módulos la entrada quedó en **298,1 KB** (una medición de solo lectura del `dist` de la carpeta principal, compilado el 2026-10-23 a las 16:08, da 297,8 KB). Con Roles diferido, la línea base quedaría en unos 299 o 300 KB por sus textos y su política: el margen para la 016 sería de 0 a 2 KB, menos que los 4 KB que añade.
- **Consecuencia**: SC-005 no se puede cumplir sin una decisión previa. Se propone: (1) corregir la carga de Roles aparte, ya, porque `main` está en rojo (hecho el 2026-10-24 en `d3ae7f8` y `6389891`); (2) medir la línea base en esta rama; (3) si el margen no alcanza, una enmienda del presupuesto con la línea base medida, como prevé la constitución («ajustable mediante enmienda tras medir la línea base»), o recuperar margen con una mejora aparte. La enmienda 1.6.0 de FR-054, ya aplicada, no toca el presupuesto. Lo decide el responsable ([plan.md](plan.md#lo-que-necesita-aprobación)).

## D21. Los datos en memoria y cuándo se descartan

- **Último resultado correcto** (FR-029): `healthKeys.result()` con `gcTime: Infinity`, como el Panel: sobrevive a salir de la página y se borra al cerrar la sesión por cualquier motivo, porque `useLogout`, `useSessionExpiry` y `useSessionEndedListener` ya hacen `queryClient.clear()` (SC-010). No se usa el almacenamiento del navegador.
- **Al perder `health:read`** (FR-029, FR-032): `RequirePermission` saca a la persona de las rutas, así que quien descarta los datos vive fuera de ellas: `AppLayout` llama a `useForgetHealthData(!canReadHealth)` (exportado por `health`), que quita `healthKeys.all` de la caché en un efecto, como `useForgetDashboardSummary` (007 D7).
- **Las secciones de respaldo** no se guardan entre apariciones (FR-064, FR-070): sus pasos se quitan de la caché al desaparecer y al salir de la pantalla (D6, D9).
- **Varias pestañas y recargas**: cada pestaña tiene su caché; al recargar se pierde todo y la página se comporta como en la primera visita (casos límite de la spec).

## D22. Simuladores y estrategia de pruebas

- **Simuladores (MSW)**, con las piezas compartidas de la 003 (`requestLog`, `failures`) y la autorización del simulador de usuarios:
  - `src/test/handlers/healthMonitoring/`: el agregador, el estado público y el registro de maily-system-api, sobre `SUBSCRIPTIONS_API_BASE_URL`. El registro guarda estado (alta, edición, baja lógica, código libre al eliminar, 409, 422 por campo con la forma de D16 y host no permitido, 404) y cada operación pide su permiso `health:*`, leído en vivo; el agregador arma su resultado con los integrados y los registrados habilitados, y ofrece `setResult`, `setRegistryUnavailable` y los fallos (`failNext`, `failAll`, `defer`, 503 `authorization_unavailable` y 500 `internal_error`).
  - `src/test/handlers/healthProbes/`: `/health/live` y `/health/ready` de maily-system-api, de mailySoft-usuarios (`USERS_API_BASE_URL`) y de un servicio configurado con una URL absoluta de otro origen (`https://pacientes.example.test`), con los modos operativo, 503 del contrato (con `database`, con `not_configured` y con un chequeo desconocido), 200 con HTML, red (`HttpResponse.error()`, que es como el navegador ve un bloqueo de CORS), sin respuesta y diferido.
  - El registro de solicitudes guarda `authorization` y `credentials`, para afirmar que las consultas anónimas no llevan credencial ni cookies (FR-056, FR-076).
- **Semilla de permisos**: como en la 007, el Administrator del simulador **no** recibe `health:*` por defecto; las pruebas de la feature los conceden con `directory.grant`.
- **Fábricas** en `src/test/factories.ts`: `healthResultDto`, `healthComponentDto`, `healthCheckDto`, `publicStatusDto` y `monitoredComponentDto`.
- **Unitarias, con prueba primero**: esquemas y mapeos (valores desconocidos, «No disponible», contrato roto); `getHealthCapabilities`; `isRefreshDue` y `startsFallbackChain`; `decideDirectStatus`; `formatElapsed`; `formatReturnLine` (antes y después, «a la 1», las 0 y las 13, Ciudad de México y Auckland con horario de verano); `describeMonitoredComponentError`; `parseEnv` con las dos variables; `parseBuildInfo`; `pageOf`.
- **API**: rutas, token solo al origen de la base, consultas anónimas sin `Authorization` ni cookies y sin pedir el token, tiempos límite, cancelación, `probe` con 503 y con HTML, y cada rechazo del registro.
- **Hooks**, con temporizadores simulados y la visibilidad como en la 007 (`visibilityState` espiado, `visibilitychange` sobre `window` y `focusManager.setFocused(undefined)` al terminar): entrada, intervalo desde el fin de la cadena, pestaña oculta, regreso antes y después del intervalo, «Actualizar» repetido sin consultas superpuestas, cancelación al salir, orden de la cadena, repetición en el ciclo, secciones que desaparecen, 403 y 401; y en la pantalla de fallo, rondas, pausa mientras se comprueba, cancelación con «Reintentar» y ninguna repetición sola.
- **Componentes**, con axe en cada estado de SC-003, SC-016 y SC-022 y consultas por rol o etiqueta.
- **Integración** (`src/app/router/health/*.integration.test.tsx`, con `renderApp`): navegación, título y foco; con y sin permiso y 0 peticiones sin él; 403 sin el aviso global duplicado; 503 con la causa; cierre de sesión que borra los datos; cierre por inactividad con los ciclos en marcha; la pantalla de fallo con sus secciones y sin consultas mientras se comprueba el acceso; el registro con 409, 422 y 404.
- **E2E** (`e2e/health.spec.ts`): se omite sin `E2E_*` y sin system-api 005 y usuarios 016 desplegados; recorre la página, el registro (crear y eliminar un componente de prueba) y la pantalla a 320 px. CORS no se prueba con MSW: lo cubre D19.
- **Cobertura**: los archivos de `api`, `schemas`, `policy` y `hooks` de `health`, y lo nuevo de `shared/api` y `shared/lib`, cuentan para el 80 % (constitución VII).

## D23. Dependencias

- **Ninguna nueva**: MUI (`Collapse`, `Alert`, `Chip` por `Badge`, `Radio`, `Checkbox`), MUI X Data Grid, TanStack Query (`queryOptions`, `useSyncExternalStore` es de React), React Hook Form, Zod y los iconos de lucide-react ya instalados.

## D24. Relación con las features 001, 006 y 007

- **001 y 006**: la pantalla «No se pudo comprobar el acceso» solo gana un hueco para las secciones (D9) y `useOperatorAccess` solo expone `isChecking`. No cambian cuándo ni cómo se comprueba el acceso, el límite de 30 s, «Reintentar», «Cerrar sesión», la regla por tipo de rol, «Sin acceso» ni las redirecciones (FR-065). Sus pruebas siguen pasando; las nuevas afirman que mientras se comprueba el acceso no hay ninguna consulta de la cadena (SC-015, SC-021, feature 006 SC-003).
- **007**: el Panel no cambia. Esta feature copia su patrón de actualización y su tratamiento del 403, y comparte con él el cliente `subscriptions`.
- **Orden de integración**: en ambientes reales necesita system-api 005 y usuarios 016 desplegados; la comprobación directa necesita además el CORS de cada servicio (pacientes 008 para ver mailySoft-pacientes). Con MSW se puede implementar y probar todo sin ellos.
