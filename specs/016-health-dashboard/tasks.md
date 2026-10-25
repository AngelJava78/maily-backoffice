---

description: "Lista de tareas de la feature 016-health-dashboard"
---

# Tasks: Salud de Servicios (Estado de los Componentes de Maily)

**Input**: Design documents from `/specs/016-health-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md (D1 a D24), data-model.md, contracts/, quickstart.md y `.specify/memory/constitution.md` (v1.6.0, con el alcance ampliado por FR-054)

**Tests**: Incluidas. La plantilla las marca como opcionales, pero la constitución (VII) exige pruebas automatizadas en el mismo PR y pruebas primero en la lógica pura, y la spec las pide expresamente (FR-053, FR-066 y FR-078): estados de la página, reglas de actualización con reloj controlado, fallos y permisos, el registro con sus rechazos, la versión, las variables, el estado público con zonas horarias y la comprobación directa. Dentro de cada fase, las pruebas se escriben ANTES de la implementación y DEBEN fallar al principio.

Se usan Vitest, React Testing Library, user-event y MSW. maily-system-api se simula a nivel de red con `src/test/handlers/healthMonitoring/` (agregador, registro y estado público) y las rutas de salud de los servicios con `src/test/handlers/healthProbes/`; los permisos salen del simulador de usuarios (`createUsersDirectoryMock`). Nunca se simula `fetch` ni el cliente HTTP. Auth0 se simula con el doble centralizado, y las pruebas de integración usan `renderApp` (la aplicación completa).

**Organization**: Tareas agrupadas por historia de usuario para poder implementar y probar cada una por separado. Las historias van en orden de prioridad: US1 y US2 (P1), US3, US5 y US6 (P2) y US4 (P3); la US6 depende de la US5 (la comprobación directa es el paso siguiente de su cadena).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1 a US6); solo en las fases de historias
- Cada descripción incluye las rutas exactas de los archivos

## Path Conventions

- **Proyecto único** en la raíz del repositorio (plan.md): `src/`, `e2e/`, `scripts/`.
- **Idiomas**: código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español. Los textos de interfaz viven solo en `src/shared/messages/es.ts`.
- **Importaciones**: alias `@/` → `src/`, y dependencias `app → features → shared`; una feature solo importa a otra por su `index.ts`.
  - **`src/features/health` NO importa `@/features/auth`** (research D1; regla de ESLint de T004).
  - `src/features/auth` solo importa de `health` el tipo `HealthCapabilities` (`import type`), como hace con las demás features.
  - La pantalla «No se pudo comprobar el acceso» (en `auth`) no importa `health`: la compone `src/app/router` (research D9).
- **Reglas de ESLint**: sin aserciones `as` (salvo `as const`), sin `any`, sin `console.*`, sin `fetch` fuera de `src/shared/api/httpClient.ts`, componentes `.tsx` de 250 líneas como máximo y sin `Date.now()` en el render (`react-hooks/purity`, constitución I).
- **Claves y rutas**: las claves de TanStack Query salen de `healthKeys` (T027). Las rutas del backend (`/api/v1/health`, `/api/v1/monitored-components`, `/health/status`, `/health/live` y `/health/ready`) se aíslan en `src/features/health/api/`.
- **Cobertura**: los archivos nuevos de `api`, `policy`, `schemas`, `hooks`, `shared/api` y `shared/lib` cuentan para el umbral de 80 % de líneas (`vite.config.ts`).
- **Reloj simulado** (patrón de `src/features/auth/hooks/useOperatorAccess.recheck.test.tsx` y de `src/features/dashboard/hooks/useDashboardSummary.refresh.test.tsx`):
  - crear los simuladores, luego `vi.useFakeTimers()` y después renderizar;
  - avanzar con `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`;
  - para fijar la hora, `vi.setSystemTime(new Date('2026-10-30T10:00:00Z'))`;
  - en `afterEach`: `vi.useRealTimers()`.
- **Visibilidad**: `vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden' | 'visible')` y luego `window.dispatchEvent(new Event('visibilitychange'))`. Hay que enviarlo a **`window`** (o a `document` con `{ bubbles: true }`), porque el `focusManager` de TanStack escucha ahí; en `afterEach`, `focusManager.setFocused(undefined)`.
- **Afirmar que no se pidió nada** (lección de la 007): dar vueltas reales al bucle de eventos sin mover el reloj (`settle`), y retener respuestas con `defer()` del simulador.
- **Zonas horarias**: Vitest fija `TZ=UTC`; las pruebas de otras zonas pasan `timeZone` a `formatReturnLine` (research D13).
- **Pruebas de integración** en `src/app/router/health/`:
  - `beforeAll` con `configure({ asyncUtilTimeout: 10_000 })`, e importación previa de `@/features/health`, `@/features/home` y `@/features/users` con un tiempo límite de 90 s, como en `src/app/router/subscriptions/capabilities.integration.test.tsx`;
  - `describe(…, { timeout: 30_000 })`.

## Prerrequisitos manuales (fuera de las tareas)

Estas acciones las hace una persona. Sin ellas no se puede validar de punta a punta (puntos de control y T158), pero las pruebas automatizadas no las necesitan.

- **La corrección de Roles y permisos** (`RolesPage` diferida): ya está en `main` (`d3ae7f8` y `6389891`, 2026-10-24); T001 parte de ella.
- **Servicios** ([quickstart.md](quickstart.md), secciones 0 y 1): maily-system-api con la 005 en `http://127.0.0.1:8010` (con `HEALTH_ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS=http://localhost:5173`), mailySoft-usuarios con la 016 (módulo «Salud de servicios» y `health:*` asignados al rol de la cuenta de prueba) y, para la comprobación directa, mailySoft-pacientes con la 008 y su `CORS_ALLOWED_ORIGINS`.
- **Configuración** en `.env.local`: `VITE_HEALTH_REFRESH_SECONDS=10` para validar a mano, y `VITE_HEALTH_DIRECT_SERVICES` con mailySoft-pacientes.
- **E2E** (T157): las variables `E2E_AUTH0_*` de la 001, con la cuenta A1 cuyo rol tenga `health:read`, `health:write`, `health:update` y `health:delete`.

---

## Phase 1: Setup (Prerrequisitos y estructura)

**Purpose**: Cerrar la decisión del presupuesto del paquete **antes de cualquier código** (research D20), integrar la enmienda 1.6.0 y preparar la feature nueva. No se instala ninguna dependencia (D23).

**⚠️ CRITICAL**: T001 bloquea todas las fases siguientes.

- [X] T001 **Puerta del presupuesto (research D20)** (hecho el 2026-10-24: línea base de 299,7 KB gzip y enmienda 1.7.0, presupuesto de 320 KB): medir la línea base y decidir, antes de escribir código, con el resultado en `specs/016-health-dashboard/plan.md`.
  1. Comprobar que la corrección de Roles y permisos (`RolesPage` exportada con `React.lazy` en `src/features/roles/index.ts`) está integrada en `main` y traerla a esta rama: con la herramienta `sync_with_base_branch` del app si la sesión corre en un worktree del app, o con `git merge main` si no. Si todavía no está integrada, detenerse y decírselo a la persona.
  2. Ejecutar `npm ci`, `npm run build` y `npm run size`, y anotar el total de la ruta de entrada (KB gzip), con la fecha y el commit, en «Notas de implementación» de `specs/016-health-dashboard/plan.md` (subsección «Tamaño del paquete»).
  3. Calcular el margen: 300 KB menos el total. Compararlo con lo que la 016 suma a la entrada, unos **4 KB** gzip (textos de `es.ts`, iconos, validación de variables, rutas y piezas de `app`; research D20).
  4. Si el margen alcanza, anotar «sin enmienda del presupuesto» y seguir. Si no, presentar a la persona las dos opciones de D20: una enmienda del presupuesto con la línea base medida (con `/speckit-constitution`, como 1.7.0, porque la 1.6.0 ya está integrada) o recuperar margen con un cambio aparte de la entrada. **Esperar su decisión**, aplicarla si es la enmienda y anotarla en el punto 2 de «Lo que necesita aprobación» de `specs/016-health-dashboard/plan.md`, en D20 de `specs/016-health-dashboard/research.md` y en la fila del presupuesto de la Constitution Check (de ⚠️ a ✅).
  - Ninguna tarea de la Fase 2 en adelante empieza antes de cerrar esta.
- [X] T002 Integrar la enmienda 1.6.0 (hecho el 2026-10-24, antes de T001, a pedido de la persona; un ajuste del presupuesto iría en una 1.7.0): quitar el comentario de borrador «Sync Impact Report» del principio de `.specify/memory/constitution.md`, como hizo `cfaad13`, y dejarla lista para un commit propio, `docs: amend constitution to v1.6.0 for the health dashboard`, que va antes del primer commit de código. Hacer el commit solo si la persona lo pide.
- [X] T003 [P] En `package.json`, agregar `"version": "1.0.0"` después de `"private": true` (confirmada el 2026-10-24; research D18) y actualizar el `version` raíz de `package-lock.json` con `npm install --package-lock-only`, sin cambiar ninguna dependencia.
- [X] T004 [P] En `eslint.config.js`, añadir `forbidAuthImports('health', 'research D1 of 016')` junto a los de `users`, `subscriptions` y `dashboard`, con un comentario como el de ellos: `auth` lee el tipo de las capacidades de `health`, y las capacidades y los ajustes llegan a las pantallas desde la aplicación.
- [X] T005 [P] Crear `src/features/health/index.ts` con un comentario de lo que expondrá (research D1): las páginas diferidas, la sección diferida de la pantalla de fallo con sus marcadores, `parseComponentId`, `useForgetHealthData` y los tipos `HealthCapabilities` y `BackofficeBuild`.
- [X] T006 Verificar la fase: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run test`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lo que todas las historias necesitan: el cliente HTTP con consultas anónimas, tiempo por consulta y sondeo; la regla de reintentos; el intervalo; el permiso y las capacidades; los textos, los iconos y la presentación de los estados; las claves; el esquema del resultado del agregador; y el simulador con sus fábricas.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta terminar esta fase.

### Cliente HTTP (research D3, D7)

- [X] T007 [P] Ampliar `src/shared/api/httpClient.test.ts`, que debe fallar primero.
  - **`anonymous: true`** (en `request` y en `get`): la función `getAccessToken` (un espía) no se llama; la petición no lleva `Authorization`; la llamada a `fetch` pide `credentials: 'omit'` (se lee con `watchFetchCalls` de T030, porque MSW no conserva ese modo); un 401 rechaza con `ApiError` de estado 401, sin segundo intento y sin llamar a `onSessionExpired`; y funciona aunque `getAccessToken` rechace con `SessionExpiredError`.
  - **Sin `anonymous`**: todo sigue igual (el token solo al origen de la base; una URL absoluta de otro origen va sin token).
  - **`timeoutMs` por consulta**: con temporizadores simulados y un manejador que nunca responde, `get(path, { schema, timeoutMs: 15_000 })` rechaza con `ApiError` de tipo `timeout` a los 15 s y no antes; sin la opción, el límite sigue siendo de 30 s.
  - **`probe(path, { signal, timeoutMs })`**: 200 con JSON da `{ status: 200, body }`; 503 con JSON da `{ status: 503, body }` sin rechazar; 200 con HTML da `{ status: 200, body: undefined }`; un error de red rechaza con `ApiError` `network`; el tiempo agotado, con `ApiError` `timeout`; nunca lleva `Authorization` y pide `credentials: 'omit'` (con `watchFetchCalls`); con la señal abortada rechaza con el motivo de quien llama; y con la base `/proxy/users` pide `http://localhost:5173/proxy/users/health/live`.
  - **`createAnonymousHttpClient({ baseUrl: 'https://pacientes.example.test' })`**: `get` y `probe` nunca envían `Authorization` ni cookies, y un 401 es un `ApiError`, nunca `SessionExpiredError`.
- [X] T008 Implementar en `src/shared/api/httpClient.ts` (hace pasar T007):
  - `RequestOptions.anonymous?: boolean` y `RequestOptions.timeoutMs?: number`, también en `GetOptions` (`Pick` de `'schema' | 'query' | 'signal' | 'anonymous' | 'timeoutMs'`);
  - con `anonymous`, `exchange` no pide token, usa `fetch(…, { credentials: 'omit' })` y `request` no renueva el token ante un 401;
  - `HttpClient.probe(path, options): Promise<ProbeResult>`, con `ProbeResult = { readonly status: number; readonly body: unknown }`: siempre anónimo, sin validar ni rechazar por el estado HTTP (la red y el tiempo siguen siendo `ApiError`);
  - `createAnonymousHttpClient({ baseUrl, timeoutMs? }): HttpClient`, del mismo módulo, cuyas consultas son todas anónimas;
  - comentarios que citen research D3 (por qué `probe` y por qué las peticiones simples, sin *preflight*). La regla del token no cambia.
  - en `eslint.config.js`, limitar `probe`: pasar los tres selectores actuales de `no-restricted-syntax` a una constante `BASE_RESTRICTED_SYNTAX`; en el bloque de `SOURCE_FILES`, `['error', ...BASE_RESTRICTED_SYNTAX, PROBE_RESTRICTION]`, con `PROBE_RESTRICTION = { selector: "CallExpression[callee.property.name='probe']", message: 'probe() is only for the public health routes of the direct check (research D3 of 016).' }`; y un bloque para `src/features/health/api/directCheckApi.ts`, `src/shared/api/httpClient.ts` y `TEST_FILES` con `['error', ...BASE_RESTRICTED_SYNTAX]`. El `off` de `src/shared/ui/ErrorBoundary.tsx` sigue después de los dos.
- [X] T009 [P] Ampliar `src/shared/api/retry.test.ts`, que debe fallar primero: `retryUpTo(1)` reintenta una vez ante `ApiError.network()`, `ApiError.timeout()` y un `http` 503 (`failureCount` 0 → `true`; 1 → `false`), y nunca ante un 404, un `contract` ni un `Error` cualquiera. `shouldRetryQuery` sigue igual (2 reintentos).
- [X] T010 Implementar `retryUpTo(max: number)` en `src/shared/api/retry.ts` (hace pasar T009), con la misma condición que `shouldRetryQuery` y un comentario que cite la constitución IV; `shouldRetryQuery` puede definirse como `retryUpTo(MAX_QUERY_RETRIES)`.

### Intervalo de actualización (research D17; contracts/environment.md)

- [X] T011 [P] Ampliar `src/app/config/env.test.ts`, que debe fallar primero, para `VITE_HEALTH_REFRESH_SECONDS`.
  - **Ausente o vacía** (`''`): vale 30. Ajustar la expectativa de «accepts the minimal configuration» con `VITE_HEALTH_REFRESH_SECONDS: 30`.
  - **Válidos**: `'10'` → 10, `'030'` → 30 y `'300'` → 300, como **número**.
  - **Inválidos**: `'9'`, `'301'`, `'30.5'`, `'+30'`, `'-30'`, `'3e1'`, `'treinta'`, `' 30'`, `'30 '` y `'   '` dan exactamente `VITE_HEALTH_REFRESH_SECONDS: ${messages.config.rules.healthRefreshSeconds}`, y el mensaje nunca contiene el valor recibido.
- [X] T012 Implementar en `src/shared/messages/es.ts`, `src/app/config/env.ts` y `src/vite-env.d.ts` (hace pasar T011):
  - en `src/shared/messages/es.ts`, `config.rules.healthRefreshSeconds: 'Entero de 10 a 300 (segundos), escrito solo con dígitos; si no se define, 30.'`;
  - en `src/app/config/env.ts`, `VITE_HEALTH_REFRESH_SECONDS` con el patrón de `dashboardRefreshMinutes`: `emptyToUndefined`, texto que cumple `/^\d+$/`, `Number`, entero de 10 a 300 con el error de la regla y 30 por defecto, con el comentario «Fixed when the application is built»;
  - en `src/vite-env.d.ts`, `readonly VITE_HEALTH_REFRESH_SECONDS: string | undefined`.
- [X] T013 [P] Dar el valor a los arneses que construyen un `AppEnv` (tras T012): `VITE_HEALTH_REFRESH_SECONDS: 30` en el `env` de `src/test/renderApp.tsx` y de `src/app/providers/HttpClientsProvider.test.tsx`, y en cualquier otro literal de `AppEnv` (buscar `VITE_DASHBOARD_REFRESH_MINUTES:` en `src/`).
- [X] T014 [P] Ampliar `src/app/providers/AppSettingsProvider.test.tsx`, que debe fallar primero: con `VITE_HEALTH_REFRESH_SECONDS: 30`, `useAppSettings().healthRefreshMs` es `30_000`; con 10, `10_000`.
- [X] T015 Implementar en `src/app/providers/AppSettingsProvider.tsx` (hace pasar T014) `healthRefreshMs` en `AppSettings` y en el `Pick` de `env`, con un comentario que cite FR-046; en `src/test/renderWithProviders.tsx`, el `AppSettingsProvider` del arnés recibe 30 s.

### Permisos y capacidades (research D2)

- [X] T016 [P] Ampliar `src/features/auth/policy/permissions.test.ts`, que debe fallar primero:
  - `SECTION_RESOURCES` es `['modules', 'roles', 'users', 'subscriptions', 'tenants', 'health', 'token']` y `PERMISSION_RESOURCES` incluye `health`;
  - `can(access, { resource: 'health', action: 'read' })` es `true` si y solo si el conjunto tiene `health:read`; `write`, `update` y `delete` además exigen `health:read`;
  - `hasAnythingToSee` es `true` con solo `health:read`.
- [X] T017 Implementar (hace pasar T016) en `src/features/auth/policy/permissions.ts`: `'health'` en `SECTION_RESOURCES` antes de `'token'`, y en el comentario de la constante, «Salud de servicios» (feature 016, `health:read`).
- [X] T018 [P] Crear `src/features/auth/policy/healthCapabilities.test.ts`, que debe fallar primero: sin permisos, o con solo `health:read`, las tres capacidades son `false`; con `health:read` y `health:write`, solo `canCreate`; con `health:update`, `canEdit`; con `health:delete`, `canDelete`; y un `health:write` sin `health:read` no da nada.
- [X] T019 Implementar en `src/features/health/index.ts`, `src/features/auth/policy/healthCapabilities.ts` y `src/features/auth/index.ts` (hace pasar T018):
  - en `src/features/health/index.ts`, `export interface HealthCapabilities { readonly canCreate: boolean; readonly canEdit: boolean; readonly canDelete: boolean }`, con el comentario de `ModuleCapabilities`; (en la US3 pasó a `src/features/health/policy/healthCapabilities.ts`, que `index.ts` reexporta, para que las páginas no importen el `index` de su propia feature);
  - `getHealthCapabilities(access)` en `src/features/auth/policy/healthCapabilities.ts`, con `can()` e `import type { HealthCapabilities } from '@/features/health'`;
  - exportarla en `src/features/auth/index.ts`.

### Textos comunes, iconos y presentación de los estados (data-model §2; research D12)

- [X] T020 Añadir a `src/shared/messages/es.ts` el grupo `health` con los textos comunes, exactamente así:
  - `status`: `{ up: 'Operativo', degraded: 'Degradado', down: 'Caído', stopped: 'Detenida por horario', unknown: 'Desconocido' }`;
  - `overall`: `{ ok: 'Todo operativo', degraded: 'Degradado', down: 'Con componentes caídos', unknown: 'Desconocido', operationalCount: (up: number, total: number) => \`${up} de ${total} operativos\` }`;
  - `kinds`: `{ service: 'Microservicio', database: 'Base de datos', frontend: 'Frontend', unknown: 'Componente' }`;
  - `checks`: `{ ok: 'Correcto', error: 'Con error', unknown: 'Desconocido', names: { database: 'Base de datos' } }`;
  - `errors` (FR-016): `timeout: 'No respondió a tiempo.'`, `connection_error: 'No se pudo conectar.'`, `dns_error: 'No se encontró la dirección del servicio.'`, `host_not_allowed: 'Su dirección no está en la lista permitida; no se comprobó.'`, `unexpected_status: 'Respondió con un código inesperado.'`, `invalid_response: 'Su respuesta no cumple el contrato de salud.'`, `response_too_large: 'Su respuesta fue demasiado grande.'`, `not_ready: 'Está en línea, pero no está listo para atender.'`, `not_configured: 'Le falta configuración, por ejemplo la conexión a la base de datos.'`, `unexpected_error: 'Ocurrió un error inesperado al comprobarlo.'` y `unknownCode: 'Ocurrió un problema al comprobar este componente.'`;
  - `notAvailable: 'No disponible'` y `latency: (ms: string) => \`${ms} ms\``;
  - `nav.sections.health: 'Salud de servicios'` y `titles.health: 'Salud de servicios'`.
- [X] T021 [P] Ampliar `src/shared/ui/Icon.test.tsx`, que debe fallar primero: los nombres nuevos `health`, `refresh`, `status-up`, `status-degraded`, `status-down`, `status-stopped`, `status-unknown` y `status-unreachable` pintan un `svg`, `aria-hidden` cuando son decorativos y con `role="img"` y su nombre cuando no.
- [X] T022 Añadirlos a `src/shared/ui/iconRegistry.ts` (hace pasar T021), con los componentes de lucide-react 1.61.0 verificados en el plan: `health` → `Activity`, `refresh` → `RefreshCw`, `status-up` → `CircleCheck`, `status-degraded` → `TriangleAlert`, `status-down` → `CircleX`, `status-stopped` → `Clock`, `status-unknown` → `CircleHelp` y `status-unreachable` → `Unplug`.
- [X] T023 [P] Crear `src/features/health/policy/statusPresentation.test.ts`, que debe fallar primero.
  - Los mapeos `to*` quedaron en `src/features/health/policy/statusValues.ts`, con su prueba `statusValues.test.ts`, para que los esquemas no dependan de los textos (cambio de la implementación, 2026-10-24); `statusPresentation.ts` reexporta los tipos y añade `checkStatusLabel(status)` para el estado de un chequeo en texto (T041).
  - `toComponentStatus`: `'up'`, `'degraded'`, `'down'`, `'stopped'` y `'unknown'` se conservan; `'maintenance'` y `''` dan `'unknown'`. `toOverallStatus`: `'ok'`, `'degraded'` y `'down'` se conservan; otro valor da `'unknown'`. `toComponentKind`: `'service'`, `'database'` y `'frontend'`; otro, `'unknown'`. `toCheckStatus`: `'ok'` y `'error'`; otro, `'unknown'`.
  - `componentStatusPresentation(status)` devuelve `{ label, tone, icon }` según la tabla de research D12: `up` → Operativo, `success`, `status-up`; `degraded` → Degradado, `warning`, `status-degraded`; `down` → Caído, `danger`, `status-down`; `stopped` → Detenida por horario, `neutral`, `status-stopped`; `unknown` → Desconocido, `neutral`, `status-unknown`. Cada estado tiene un icono distinto.
  - `overallStatusPresentation(status)`: `ok` → Todo operativo, `success`, `status-up`; `degraded` → Degradado, `warning`, `status-degraded`; `down` → Con componentes caídos, `danger`, `status-down`; `unknown` → Desconocido, `neutral`, `status-unknown`.
  - `describeComponentError(code)`: el texto de FR-016 de cada uno de los diez códigos, y `messages.health.errors.unknownCode` para cualquier otro.
  - `checkNameLabel('database')` es «Base de datos»; otro nombre se devuelve tal cual. `kindLabel(kind)` da el texto de `messages.health.kinds`.
- [X] T024 Implementar `src/features/health/policy/statusPresentation.ts` (hace pasar T023): tipos `ComponentStatus`, `OverallStatus`, `ComponentKind`, `CheckStatus` (de `statusValues.ts`) y `StatusPresentation`, y las funciones puras, con los textos de `messages.health`.
- [X] T025 [P] Crear `src/features/health/components/StatusBadge.test.tsx`, que debe fallar primero: con cada `StatusPresentation` pinta el texto del estado y su icono (decorativo, porque el texto ya lo dice), con el tono que corresponde; el estado nunca es solo un color; pasa axe.
- [X] T026 Implementar `src/features/health/components/StatusBadge.tsx` (hace pasar T025): un envoltorio de `Badge` de `src/shared/ui/Badge.tsx` que recibe `presentation: StatusPresentation`.
- [X] T027 [P] Crear `src/features/health/hooks/healthKeys.ts` y su prueba `src/features/health/hooks/healthKeys.test.ts`:
  - `HealthScope = 'page' | 'access'`;
  - `healthKeys = { all: ['health'] as const, cycle: () => [...all, 'cycle'], result: () => [...all, 'result'], platformStatus: (scope) => [...all, 'platform-status', scope], directCheck: (scope) => [...all, 'direct-check', scope], accessChain: (round: number) => [...all, 'access-chain', round], componentsList: () => [...all, 'components', 'list'], componentDetail: (id: string) => [...all, 'components', 'detail', id] }` (data-model §8);
  - la prueba comprueba que todas empiezan por `['health']` y que no se repiten.

### Esquema del resultado del agregador (research D5; data-model §1; contracts/health-aggregator.md)

- [X] T028 [P] Crear `src/features/health/schemas/healthResult.test.ts`, que debe fallar primero.
  - **Parseo**: el ejemplo de [contracts/health-aggregator.md](contracts/health-aggregator.md#a1--consultar-el-resultado) da el modelo en camelCase (`checkedAt`, `registryAvailable`, `latencyMs`, `buildDate`, `nextStartAt`…) y conserva el orden de `components`.
  - **Valores desconocidos** que no invalidan: `status: 'maintenance'` en el resultado y en un componente, `kind: 'queue'`, un chequeo `name: 'cache'` y `error: 'quota_exceeded'`; se conservan como texto y los traducen los mapeos de T024.
  - **«No disponible»** (`null`): `version`, `commit` y `environment` con `'unknown'`, `'UNKNOWN'`, `''`, `'   '`, `null` o ausentes; `build_date` con lo mismo o con `'ayer'`; el `checked_at` del componente ausente, `null` o inválido; `latency_ms` ausente o `null`. Una latencia de 0 sigue siendo 0.
  - **Fallos de contrato**: falta `components`, `registry_available` o `checked_at` del resultado; `checked_at` del resultado inválido; un componente sin `code` o con `name` vacío; `checks` ausente o que no es lista; `latency_ms` negativa (`-1`) o con decimales (`2.5`); `next_start_at` que no es fecha ni `null`; `error` que no es texto ni `null`.
  - **Campos de más**: se descartan.
- [X] T029 Implementar `src/features/health/schemas/healthResult.ts` (hace pasar T028): `healthCheckSchema`, `healthComponentSchema` y `healthResultSchema` con `.transform` al dominio; fechas con `z.iso.datetime({ offset: true })`; los textos «desconocidos» de build normalizados a `null`. Exportar `HealthResult`, `HealthComponent`, `HealthCheck` y `HealthResultDto = z.input<typeof healthResultSchema>`. Un comentario resume la regla «forma estricta, valores tolerantes» y la precisión de FR-014 (research D5).

### Simulador y fábricas (research D22)

- [X] T030 [P] Crear `src/test/fetchCalls.ts` con `watchFetchCalls()`: un espía de `fetch` que deja pasar la llamada (MSW la sigue respondiendo) y devuelve, de cada una, su `url` y el `credentials` que pidió. Cambio del 2026-10-24: MSW reconstruye la petición que intercepta y pierde ese modo (siempre lee `'same-origin'`), así que `src/test/handlers/shared/requestLog.ts` no puede registrarlo y no cambia; las afirmaciones de `credentials: 'omit'` (T007, T101, T108, T133) usan este espía y las de `Authorization`, el registro del simulador.
- [X] T031 [P] Añadir a `src/test/factories.ts` (tras T029), con las sobrescrituras al final, como las demás: `healthCheckDto(overrides)` (`database`, `ok`, 12 ms, `error: null`), `healthComponentDto(overrides)` (un servicio `up` con versión, commit de 40 caracteres, `build_date`, `environment` y un chequeo) y `healthResultDto(overrides)` (estado `ok`, `registry_available: true` y los dos integrados `up`: `maily-system-api` «MailySoft System API» y `database` «Base de datos», con `next_start_at: null`).
- [X] T032 Crear `src/test/handlers/healthMonitoring/` (tras T031), siguiendo `src/test/handlers/platformDashboard/index.ts`:
  - `model.ts`: los componentes registrados en memoria (`id`, `code`, `name`, `kind`, `base_url`, rutas, `enabled`, `sort_order`, fechas y baja lógica) y `resultFrom(registered, overrides)`: los dos integrados y después los registrados habilitados y no eliminados, por `sort_order` y `code`, cada uno `up` (FR-011 de la 005);
  - `index.ts` con `createHealthMonitoringMock({ directory, registered = [] })`, que registra `GET ${SUBSCRIPTIONS_API_BASE_URL}/api/v1/health` y, en orden: registra la petición (`createRequestLog`), autentica (`createAuthorization`, 401), aplica las fallas inyectadas (`createFailureControls` con 500 `internal_error` y 503 `authorization_unavailable` por defecto), exige `health:read` (`requirePermission`) cuando hay `directory` y responde 200 con `Cache-Control: no-store`;
  - devuelve `requests`, `requestsTo(method, path)`, `failNext`, `failAll`, `hang`, `defer`, `recover`, `authorizationUnavailable()`, `setResult(dto)` (fija el resultado), `setComponentStatus(code, status, extra?)` y `setRegistryUnavailable(flag)`. Sin `setResult`, el resultado sale de `resultFrom`. Las US3 y US5 le añaden el registro y el estado público.
- [X] T033 [P] Crear `src/test/handlers/healthMonitoring/index.test.ts` (tras T032), con `callSubscriptions` de `src/test/subscriptionsClient.ts`: 200 con `Cache-Control: no-store` y los dos integrados; con `directory` y sin conceder `health:read`, 403 `permission_denied` (el Administrator **no** tiene `health:*` por defecto); tras `directory.grant('Administrator', 'health:read')`, 200; `authorizationUnavailable()` da 503; `setRegistryUnavailable(true)` da `registry_available: false`; `requestsTo('GET', '/api/v1/health')` cuenta.
- [X] T034 Verificar la fase sobre `src/shared`, `src/app/config`, `src/app/providers`, `src/features/auth/policy`, `src/features/health` y `src/test`: `npm run typecheck`, `npm run lint` y `npm run test`. Todas las pruebas nuevas pasan y ninguna anterior se rompió. (2026-10-24: tipos, lint y formato limpios; 3662 de 3675 pruebas pasan en la suite completa, y los 13 fallos, en 4 archivos de formularios de Módulos y Suscripciones que la fase no toca, pasan al correrlos solos: eran tiempos agotados por carga.)

**Checkpoint**: base lista. Existen el cliente con consultas anónimas, `probe` y tiempo por consulta, el intervalo, el permiso y las capacidades, los textos e iconos comunes, la presentación de los estados, las claves, el esquema del agregador y su simulador.

---

## Phase 3: User Story 1 - Ver la salud de todos los componentes (Priority: P1) 🎯 MVP

**Goal**: Quien tiene `health:read` abre «Salud de servicios» desde el menú y ve el estado general, la cuenta de operativos y cada componente con su tipo, estado, latencia, última comprobación y datos de build («No disponible» si faltan), su detalle desplegable, los avisos de la base de datos y del registro, y los fallos y la falta de permiso con sus textos. Sin el permiso no ve la entrada ni la página y no se consulta nada.

**Independent Test**: Con el simulador del agregador y `health:read` concedido, abrir `/health` y comprobar la entrada del menú (después de Suscripciones y antes de Token), el título de la pestaña, el foco en el `h1` y los datos de cada componente; repetir con un componente degradado y otro caído, con la base detenida por horario, con el registro no disponible, con datos sin versión, con valores desconocidos, con la primera carga fallida, con un 503 y con un 403; y sin el permiso, comprobar que no hay entrada, que `/health` lleva al Panel y que el simulador no recibió ninguna petición.

### Textos de la historia

- [X] T035 [US1] Añadir a `src/shared/messages/es.ts`, en `health`:
  - `page`: `title: 'Salud de servicios'`, `componentsTitle: 'Componentes'`, `empty: 'No hay componentes para mostrar.'`, `noPermission: 'No tienes permiso para ver la salud de los servicios.'`, `loadError: { title: 'No se pudo consultar la salud de los servicios', message: 'Ocurrió un problema al consultar el monitoreo. Puedes reintentar.' }` y `authorizationUnavailable: 'Puede deberse a que mailySoft-usuarios o la base de datos no están disponibles, por ejemplo fuera del horario de encendido.'`;
  - `fields`: `{ kind: 'Tipo', status: 'Estado', latency: 'Latencia', checkedAt: 'Última comprobación', version: 'Versión', commit: 'Commit', buildDate: 'Fecha de build', environment: 'Entorno' }`;
  - `details`: `{ toggle: 'Detalle', toggleLabel: (name: string) => \`Detalle de ${name}\`, checksTitle: 'Chequeos', none: 'Sin detalles adicionales.' }`;
  - `notices`: `databaseStopped: 'La base de datos está detenida por horario: se apaga a propósito fuera de su horario de encendido y, mientras tanto, los servicios que dependen de ella pueden aparecer degradados.'`, `databaseDown: 'La base de datos no responde, así que los servicios que dependen de ella pueden aparecer degradados.'` y `registryUnavailable: 'No se pudo leer el registro de componentes: la lista puede estar incompleta o desactualizada.'`;
  - `returnLine`: `{ future: (date: string, time: string) => …, past: (date: string, time: string) => … }`, que escriben «Vuelve a estar disponible el {date} a la(s) {time}» y «Su encendido estaba programado para el {date} a la(s) {time}», con «a la» cuando la hora empieza por «1:» y «a las» en los demás casos (FR-059).

### Tests for User Story 1 ⚠️

> Escribirlas primero y comprobar que FALLAN antes de implementar

- [X] T036 [P] [US1] Crear `src/features/health/policy/returnLine.test.ts`: con `now = Date.parse('2026-10-31T04:00:00Z')`,
  - `formatReturnLine('2026-11-02T14:00:00Z', now, { timeZone: 'America/Mexico_City' })` es exactamente «Vuelve a estar disponible el lunes 2 de noviembre a las 8:00»;
  - con `Pacific/Auckland` (horario de verano), «Vuelve a estar disponible el martes 3 de noviembre a las 3:00»;
  - con una hora local de 1:30, «… a la 1:30»; de 0:15, «… a las 0:15»; de 13:00, «… a las 13:00»;
  - con `now` igual o posterior al instante, «Su encendido estaba programado para el lunes 2 de noviembre a las 8:00»;
  - nunca escribe un tiempo restante, y la fecha va sin la coma del formato largo.
- [X] T037 [P] [US1] Crear `src/features/health/hooks/useNow.test.tsx`, con temporizadores simulados: el valor avanza cada segundo mientras hay un suscriptor y la pestaña está visible; con `visibilityState` `hidden` deja de avanzar; al volver a `visible` se actualiza en el acto; dos componentes suscritos ven la misma hora.
- [X] T038 [P] [US1] Crear `src/features/health/api/healthApi.test.ts`, con `createSubscriptionsClient()` y el simulador sin `directory`:
  - `getHealthResult(client)` pide `GET /api/v1/health` con `search` vacío y `Authorization: Bearer test-token:auth0|admin`, y devuelve el modelo de dominio;
  - una respuesta fuera de contrato (`server.use` sin `components`) es `ApiError` `contract`;
  - un 403 llega como `ApiError` 403 `permission_denied` y un 503 como `ApiError` 503, sin convertirlos;
  - con temporizadores simulados y `hang()`, rechaza con `ApiError` `timeout` a los 15 s (`AGGREGATOR_TIMEOUT_MS`), no a los 30;
  - con una señal abortada, la petición queda `aborted`.
- [X] T039 [P] [US1] Crear `src/features/health/hooks/useHealthCycle.test.tsx`, con `createWrapper` de `src/test/renderWithProviders.tsx`, `createQueryClient()` y el simulador sin `directory`:
  - al montar hace una petición; la vista pasa de `loading` a `ready`, con el resultado, `updatedAt` > 0 y `isUpdating: false`;
  - remontar hace otra petición (`refetchOnMount: 'always'`, FR-022);
  - un 403 da `forbidden`, sin llamar a `onForbidden` del `QueryCache` (el aviso global) y sin más peticiones mientras sigue montado (FR-031);
  - un 503 sin datos da `failed` con `authorizationUnavailable: true` tras **un** reintento (2 peticiones en total, a 1 s);
  - un contrato roto sin datos da `failed` sin reintento;
  - **unitarias de `toHealthPageView`** (data-model §10): sin datos y consultando → `loading`; sin datos y con error → `failed`; `forbidden` sin consulta en curso → `forbidden`; `forbidden` con una consulta en curso → `loading`; con datos → `ready` con `updatedAt = dataUpdatedAt`; con datos y la última consulta fallida → `ready` con `refreshFailed: true`.
- [X] T040 [P] [US1] Crear `src/features/health/components/OverallStatus.test.tsx`: cada estado general con su texto, su icono y su tono; «4 de 6 operativos» con 4 componentes `up` de 6, y «0 de 3 operativos» con todos caídos; `unknown` dice «Desconocido»; pasa axe.
- [X] T041 [P] [US1] Crear `src/features/health/components/ComponentCard.test.tsx`:
  - el nombre es un `h3`; el tipo, con `kindLabel`; el estado, con `StatusBadge`;
  - la latencia 1284 dice «1,284 ms», 0 dice «0 ms» y `null`, «No disponible»;
  - la última comprobación, con `formatDateTime(checkedAt, { seconds: true })`; versión, commit de 7 caracteres (completo si tiene menos), fecha de build con `formatDateTime` y entorno tal cual; cada `null`, «No disponible», nunca «unknown» ni vacío;
  - el botón con nombre «Detalle de {nombre}» empieza con `aria-expanded="false"` y `aria-controls` apuntando a su región; al pulsarlo (ratón, Intro y Espacio) se despliega: cada chequeo con su nombre («Base de datos» para `database`), su estado en texto y su latencia, y la explicación del error del componente (FR-016), o «Sin detalles adicionales.» sin chequeos ni error; al pulsarlo de nuevo se pliega;
  - un nombre de 200 caracteres se ajusta (`overflowWrap: 'anywhere'`);
  - pasa axe plegado y desplegado.
- [X] T042 [P] [US1] Crear `src/features/health/components/HealthNotices.test.tsx`: con la base `stopped` y `nextStartAt`, el aviso `databaseStopped` y la línea de regreso; con `stopped` y `null`, solo el aviso; con `down`, `databaseDown`; con `up`, nada; con `registryAvailable: false`, `registryUnavailable`. Ningún aviso tiene `role="alert"` (usan `role="note"`); un `nextStartAt` en otro componente no se muestra; pasa axe.
- [X] T043 [P] [US1] Crear `src/features/health/pages/HealthPage.test.tsx`, con `renderWithProviders` y el simulador:
  - mientras carga se ve `PageLoader`; después, el `h1` «Salud de servicios» (con el foco), el estado general con «6 de 6 operativos» para un resultado de seis componentes `up`, y los componentes en el orden recibido;
  - con `components: []`, «No hay componentes para mostrar.», sin error;
  - con un componente desconocido (`status: 'maintenance'`, `kind: 'queue'`, `error: 'quota_exceeded'`), «Desconocido», «Componente» y el texto genérico, y el resto normal;
  - primera carga fallida: `ErrorState` con `role="alert"` y «Reintentar», que vuelve a pedir; con 503, además, la causa posible;
  - 403: solo el `h1` y «No tienes permiso para ver la salud de los servicios.», sin «Actualizar» ni la lista;
  - axe en carga, con datos, con un degradado y uno caído, con la base detenida, con el registro no disponible, con el fallo y sin permiso (SC-003).
- [X] T044 [P] [US1] Crear `src/app/router/health/health.integration.test.tsx`, con `renderApp({ url: '/', sub: ADMIN_SUB, signedIn: true })`, `createUsersDirectoryMock()` con `directory.grant('Administrator', 'health:read')` y `createHealthMonitoringMock({ directory })`:
  - la navegación tiene «Salud de servicios» después de «Suscripciones» y antes de «Token»; al elegirla, la dirección es `/health`, `document.title` es «Salud de servicios — MailySoft Backoffice», el foco está en el `h1` y se ven los componentes;
  - **sin el permiso** (sin `grant`): no hay entrada; con `url: '/health'`, la persona llega al Panel con el aviso de que la sección no está disponible, y `requestsTo('GET', '/api/v1/health')` está vacío;
  - **un `health:read` solo en un rol de Clínica** no cuenta (feature 006): sin entrada y sin peticiones;
  - **403 del servicio**: entrar con el permiso, `directory.revoke('Administrator', 'health:read')` y abrir «Salud de servicios» **antes** de la recomprobación del acceso (que sigue con el permiso en caché): «No tienes permiso para ver la salud de los servicios.», sin «No tienes permiso para realizar esta acción.» (el aviso global), sin más consultas en la visita y con la sesión abierta.

### Implementation for User Story 1

- [X] T045 [P] [US1] Implementar `formatReturnLine(nextStartAt: string, now: number, options?: { timeZone?: string }): string` en `src/features/health/policy/returnLine.ts` (hace pasar T036), con `Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone })` y otro con `{ hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone }`, armados con `formatToParts`, y los textos de `messages.health.returnLine` (research D13).
- [X] T046 [P] [US1] Implementar `useNow(): number` en `src/features/health/hooks/useNow.ts` (hace pasar T037), con `useSyncExternalStore` y un almacén de módulo que arranca un `setInterval` de 1 s con el primer suscriptor, lo detiene con el último, no hace tics con la pestaña oculta y hace uno al volver (`visibilitychange`). Un comentario cita la constitución I: el render lee la hora del almacén, nunca `Date.now()`.
- [X] T047 [US1] Implementar `src/features/health/api/healthApi.ts` (hace pasar T038): `export const HEALTH_RESULT_PATH = '/api/v1/health'`, `export const AGGREGATOR_TIMEOUT_MS = 15_000` y `getHealthResult(client: HttpClient, { signal }: { signal?: AbortSignal } = {}): Promise<HealthResult>`, con `client.get(HEALTH_RESULT_PATH, { schema: healthResultSchema, signal, timeoutMs: AGGREGATOR_TIMEOUT_MS })`. Comentario: es el cliente de `maily-system-api` (research D4, D7).
- [X] T048 [US1] Crear `src/features/health/hooks/healthQueries.ts` con `healthResultQuery(client)`, con `queryOptions`:
  - `queryKey: healthKeys.result()`;
  - `queryFn` que devuelve `{ kind: 'result', result }` y convierte el `ApiError` 403 en `{ kind: 'forbidden' }` (research D8, como D6 de la 007); los demás errores se lanzan;
  - `retry: retryUpTo(1)`, `retryDelay`, `staleTime: 0`, `gcTime: Infinity` y `networkMode: 'always'`;
  - exportar `HealthResultOutcome`.
- [X] T049 [US1] Crear `src/features/health/hooks/useHealthCycle.ts` (hace pasar T039), en esta historia solo con la entrada (cambio de la implementación, 2026-10-24: en la US1 el hook es `useHealthCycle()`, sin `refreshMs`, que llega con el intervalo en la US2 junto con la prop de `HealthPage` y la lectura de `healthRefreshMs` en `HealthRoute`, para no dejar un parámetro sin usar que ESLint rechaza):
  - la consulta del ciclo (`healthKeys.cycle()`) con `queryFn: ({ signal }) => runHealthCycle(…)`, que ejecuta `queryClient.query(healthResultQuery(subscriptions))` (`fetchQuery` está obsoleto en 5.104.4), devuelve `{ kind: 'done' }` o `{ kind: 'forbidden' }` y solo relanza `SessionExpiredError`; `refetchOnMount: 'always'`, `retry: false` y `networkMode: 'always'`;
  - el observador del paso con `useQuery({ ...healthResultQuery(subscriptions), enabled: false })`: las **mismas** opciones, no `skipToken` (Notas para las tareas del plan);
  - `toHealthPageView(resultQuery, cycleQuery)` pura y exportada, con los estados de data-model §10;
  - `useHealthCycle(refreshMs: number): { view: HealthPageView; refresh: () => void }`, con `refresh = () => cycle.refetch({ cancelRefetch: false })`. El intervalo y el regreso a la pestaña llegan en la US2; `refreshMs` queda documentado para entonces.
- [X] T050 [P] [US1] Crear `src/features/health/components/OverallStatus.tsx` (hace pasar T040) con `StatusBadge` y `messages.health.overall.operationalCount`.
- [X] T051 [P] [US1] Crear `src/features/health/components/ComponentCard.tsx` y `src/features/health/components/ComponentDetails.tsx` (hacen pasar T041): una lista de descripción con los datos, el botón «Detalle» controlado por props (`expanded`, `onToggle`) y `Collapse` de MUI con los chequeos y la explicación del error. Cada archivo de 250 líneas o menos.
- [X] T052 [P] [US1] Crear `src/features/health/components/HealthNotices.tsx` (hace pasar T042): los avisos de la base de datos y del registro con `Alert` de MUI y `role="note"`, y la línea de regreso con `formatReturnLine` y `useNow`.
- [X] T053 [US1] Crear `src/features/health/pages/HealthPage.tsx` (hace pasar T043), con `refreshMs` por props, como una composición pequeña que nunca pase de 250 líneas (constitución I):
  - el `h1` con `useFocusOnMount`, y `useHealthCycle(refreshMs)` con un `switch` sobre `view.status`;
  - `src/features/health/components/HealthResultView.tsx`: el estado general (`OverallStatus`), los avisos (`HealthNotices`), el `h2` «Componentes» y la lista de `ComponentCard`, con lo desplegado en `useState<ReadonlySet<string>>` por `code`, que sobrevive a cada actualización;
  - `src/features/health/components/HealthFailureNotice.tsx`: el `ErrorState` de la primera carga con «Reintentar» y la causa del 503, y el aviso de sin permiso;
  - el orden de la pantalla de [contracts/app-routes.md](contracts/app-routes.md#health--salud-de-servicios) (los puntos que existen en esta historia).
- [X] T054 [US1] En `src/features/health/index.ts`, `export const HealthPage = lazy(() => import('./pages/HealthPage').then((module) => ({ default: module.HealthPage })))`, con el comentario del patrón de `subscriptions` (research D1).
- [X] T055 [US1] Crear `src/app/router/health/HealthRoute.tsx`, como `src/app/router/HomeRoute.tsx`: lee `useAppSettings().healthRefreshMs` y pinta `HealthPage`.
- [X] T056 [US1] Conectar la ruta y el menú en `src/app/router/health/healthRoutes.tsx`, `src/app/router/routes.tsx`, `src/app/layouts/useRouteAccessibility.ts` y `src/app/navigation/sections.ts` (hace pasar T044):
  - crear `src/app/router/health/healthRoutes.tsx` con `export const healthRoute: RouteObject`: la ruta `/health` con `element: <RequirePermission resource="health"><Outlet /></RequirePermission>`, `ErrorBoundary: RouteErrorBoundary` y su hijo índice `HealthRoute` con `handle: { titleKey: 'health' }`, con un comentario como el de las demás secciones. Va en un módulo propio porque `routes.tsx` ya tiene unas 214 líneas de código y el límite de ESLint es 250 (constitución I);
  - en `src/app/router/routes.tsx`, importar `healthRoute` y ponerlo después de `/subscriptions` y antes de `/tools/postman-token`;
  - en `src/app/layouts/useRouteAccessibility.ts`, `'health'` en la lista de `titleKey`;
  - en `src/app/navigation/sections.ts`, `{ id: 'health', path: '/health', labelKey: 'health', resource: 'health', icon: 'health' }` entre `subscriptions` y `token`, con un comentario que cite FR-003;
  - actualizar `src/app/navigation/sections.test.ts`, `sections.token.test.ts` y `sections.roles.test.ts`: el orden pasa a incluir `health` antes de `token`, que sigue al final.
- [X] T057 [US1] Verificar la historia: `npm run typecheck`, `npm run lint` y `npm run test`, y a mano con el servicio real si está disponible (quickstart V1, V3 a V5). (2026-10-24: tipos, lint, formato y tamaño limpios, 301,7 KB de 320 KB; 3753 de 3754 pruebas pasan y la que falla, de Roles y permisos, pasa sola: tiempo agotado por carga. La validación a mano queda pendiente: no hay servicio real en este entorno.)

**Checkpoint**: la US1 funciona sola. La página muestra la salud de todo, con sus avisos, fallos y permisos; todavía no se actualiza sola.

---

## Phase 4: User Story 2 - Mantener la página al día sin intervenir (Priority: P1)

**Goal**: La página se actualiza cada `VITE_HEALTH_REFRESH_SECONDS` desde que terminó el ciclo anterior, solo con la pestaña visible; al volver a la pestaña consulta solo si venció el intervalo; nunca hay dos consultas en curso; «Actualizar» consulta en el momento; «Actualizado hace» avanza cada segundo; un fallo conserva los datos con su aviso; las consultas automáticas no mantienen la sesión; los datos viven en memoria durante la sesión y se borran al cerrarla o al perder el permiso.

**Independent Test**: Con un reloj controlado y un intervalo de 30 s: entrar a las 10:00:00 con respuesta a las 10:00:01 y comprobar la siguiente consulta a las 10:00:31; ocultar la pestaña y comprobar que no se consulta; volver antes y después del intervalo; pulsar «Actualizar» varias veces con la respuesta retrasada; salir con una consulta en curso; hacer fallar una actualización con datos; dejar la página 15 min sin actividad; cerrar sesión y volver a entrar; compilar con un intervalo inválido.

### Textos de la historia

- [X] T058 [US2] Añadir a `messages.health.page` de `src/shared/messages/es.ts`: `refresh: 'Actualizar'`, `updating: 'Actualizando…'`, `updatedSecondsAgo: (seconds: number) => \`Actualizado hace ${seconds} s\``, `updatedMinutesAgo: (minutes: number) => \`Actualizado hace ${minutes} min\``, `updatedAt: (when: string) => \`Actualizado: ${when}\`` y `refreshFailed: 'No se pudo actualizar la salud de los servicios. Se muestran los datos de la última actualización correcta.'`.

### Tests for User Story 2 ⚠️

- [X] T059 [P] [US2] Crear `src/features/health/policy/refreshRules.test.ts`:
  - `isRefreshDue(lastSuccessAt, now, intervalMs)`: `true` si nunca hubo una respuesta correcta (0) o si `now − lastSuccessAt ≥ intervalMs`; `false` si no;
  - `formatElapsed(updatedAt, now)`: 12 s → «Actualizado hace 12 s»; 59 s → «… 59 s»; 60 s → «Actualizado hace 1 min»; 59 min 59 s → «… 59 min»; 60 min → «Actualizado: » con `formatDateTime(updatedAt, { seconds: true })`; un `now` anterior a `updatedAt` (reloj desajustado) → «Actualizado hace 0 s».
- [X] T060 [P] [US2] Crear `src/features/health/hooks/useHealthCycle.refresh.test.tsx`, con temporizadores simulados, `vi.setSystemTime` y la visibilidad:
  - **intervalo** (US2-2): entrar a las 10:00:00 con la respuesta retenida hasta las 10:00:01 (`defer()`); la siguiente consulta ocurre a las 10:00:31 y no antes;
  - **pestaña oculta** (US2-3): con `hidden`, no hay ninguna consulta durante varios intervalos;
  - **regreso** (US2-4): última correcta 10:00:01, oculta a las 10:00:10 y visible a las 10:00:20 → ninguna consulta al volver y la siguiente a las 10:00:31; visible a las 10:02:00 → consulta al volver;
  - **«Actualizar»** (US2-5, US2-6): `refresh()` consulta en el momento y la cuenta se reinicia al terminar; 10 llamadas con la respuesta retenida → 1 sola petición;
  - **fallo** (FR-024): una consulta fallida también reinicia la cuenta (con su reintento de 1 s incluido);
  - **salir** (US2-7): desmontar con una consulta en curso la deja `aborted`; al volver a montar se ven los datos con `isUpdating: true` y hay una sola petición;
  - **403**: tras el resultado «sin permiso», ni el intervalo ni el regreso consultan;
  - **caché** (FR-029): sin observadores, el resultado sigue en la caché a los 10 min.
- [X] T061 [P] [US2] Crear `src/features/health/components/LastUpdatedAgo.test.tsx`, con temporizadores simulados: el texto avanza cada segundo («hace 12 s», «hace 13 s»…), pasa a minutos y después a la fecha; no está dentro de una región viva (`role="status"`, `role="alert"` ni `aria-live`); con `isUpdating`, se ve «Actualizando…» y su indicador gráfico es `aria-hidden`.
- [X] T062 [P] [US2] Ampliar `src/features/health/pages/HealthPage.test.tsx`:
  - con datos se ven «Actualizado hace …» y «Actualizar»; al pulsarlo hay una petición, el foco sigue en el botón y se ve «Actualizando…» hasta que llega la respuesta;
  - una actualización fallida con datos: los datos se conservan con su antigüedad y aparece `RefreshFailedAlert` (`role="alert"`) con `refreshFailed`; sigue montado en el ciclo siguiente que también falla (no se crea de nuevo) y desaparece cuando uno sale bien; con 503, con la causa posible;
  - axe con «Actualizando…» y con el aviso de actualización fallida.
- [X] T063 [P] [US2] Crear `src/app/router/health/refresh.integration.test.tsx`, con `renderApp` y los simuladores (permiso concedido):
  - ir a «Usuarios» con una consulta en curso y volver: se ven los datos anteriores con «Actualizando…» y hay una sola consulta nueva;
  - cerrar sesión y volver a entrar: no se ve ningún dato anterior, primero la carga (SC-010);
  - con los ciclos en marcha y sin actividad, la sesión se cierra a los 15 min, como en cualquier otra pantalla (FR-028);
  - una consulta con 401 sigue el manejo de la 001 y, tras identificarse, vuelve a `/health` (FR-033);
  - quitar `health:read` con `directory.revoke` y esperar la recomprobación (5 min): la persona va al Panel con el aviso y la caché ya no tiene `healthKeys.all` (FR-032).
- [X] T064 [P] [US2] Ampliar `src/app/ConfigErrorScreen.test.tsx`: con `VITE_HEALTH_REFRESH_SECONDS` inválida, la pantalla de configuración inválida nombra la variable y su regla, sin repetir el valor (US2-12).

### Implementation for User Story 2

- [X] T065 [P] [US2] Implementar `isRefreshDue` y `formatElapsed` en `src/features/health/policy/refreshRules.ts` (hace pasar T059).
- [X] T066 [US2] Completar las reglas en `src/features/health/hooks/useHealthCycle.ts` (hace pasar T060), con un comentario por opción y el requisito que cumple (research D6):
  - `refetchInterval: (query) => query.state.data?.kind === 'forbidden' ? false : refreshMs`;
  - `refetchIntervalInBackground: false`;
  - `refetchOnWindowFocus: (query) => query.state.data?.kind !== 'forbidden' && isRefreshDue(queryClient.getQueryState(healthKeys.result())?.dataUpdatedAt ?? 0, Date.now(), refreshMs)`;
  - `refetchOnReconnect: false`;
  - en `runHealthCycle`, la señal del ciclo cancela con `queryClient.cancelQueries` los pasos en curso cuando se aborta.
- [X] T067 [P] [US2] Crear `src/features/health/components/LastUpdatedAgo.tsx` (hace pasar T061), con `useNow` y `formatElapsed`, y el indicador «Actualizando…» (`CircularProgress` pequeño `aria-hidden` y el texto).
- [X] T068 [US2] Crear `src/features/health/components/HealthToolbar.tsx` (`LastUpdatedAgo` y el botón «Actualizar», con el icono `refresh`, nunca deshabilitado, que llama a `refresh`), añadir a `src/features/health/components/HealthFailureNotice.tsx` el `RefreshFailedAlert` con `messages.health.page.refreshFailed` y, con 503, la causa, y pintar los dos desde `src/features/health/pages/HealthPage.tsx` (hace pasar T062).
- [X] T069 [US2] Crear `src/features/health/hooks/useForgetHealthData.ts` (`useForgetHealthData(shouldForget: boolean)`, que quita `healthKeys.all` con `removeQueries` en un efecto, como `useForgetDashboardSummary`), exportarlo en `src/features/health/index.ts` y llamarlo en `src/app/layouts/AppLayout.tsx` con `!can(useGrantedAccess(), { resource: 'health', action: 'read' })` (hace pasar la última parte de T063; research D21).
- [X] T070 [US2] Verificar la historia: `npm run typecheck`, `npm run lint` y `npm run test`, y a mano con `VITE_HEALTH_REFRESH_SECONDS=10` y la pestaña Red (quickstart V6, V7). (2026-10-24: tipos, lint y formato limpios y las 3896 pruebas pasan; la validación a mano queda pendiente: no hay servicio real en este entorno.)

**Checkpoint**: las US1 y US2 funcionan. La página está completa como P1: se mantiene al día, conserva los datos ante un fallo y respeta la pestaña oculta y la inactividad.

---

## Phase 5: User Story 3 - Administrar el registro de componentes (Priority: P2)

**Goal**: Desde «Salud de servicios», quien tiene los permisos lista los componentes registrados (paginados en el navegador), ve su detalle, registra uno nuevo con las rutas propuestas, lo modifica (sin cambiar código ni tipo), lo deshabilita y lo elimina con confirmación, con los rechazos del servicio en español y junto a su campo; sin desplegar nada.

**Independent Test**: Con el registro simulado y vacío, registrar «MailySoft Usuarios» como microservicio (comprobando las rutas propuestas) y verlo en el listado y el detalle; intentar un código repetido y un host no permitido; editarlo y deshabilitarlo; eliminarlo con confirmación; repetir con personas que solo tienen `health:read` o uno solo de `health:write`, `health:update` y `health:delete`; y comprobar que el componente aparece en «Salud de servicios» tras el siguiente ciclo.

### Piezas y textos de la historia

- [X] T071 [US3] Mover `pageOf` a `src/shared/lib/pageOf.ts` como función genérica, `pageOf<T>(items: readonly T[], page: number, pageSize: number): Page<T>` con `{ items, total, pages, page, pageWasClamped }`, con su prueba en `src/shared/lib/pageOf.test.ts` (los casos de hoy de `src/features/subscriptions/policy/catalogOrder.test.ts` para `pageOf`), y actualizar `src/features/subscriptions/policy/catalogOrder.ts` y sus usos para importarla de `shared/lib`, sin cambiar el comportamiento (research D15). Las pruebas de Suscripciones siguen pasando.
- [X] T072 [US3] Añadir a `src/shared/messages/es.ts`:
  - `titles`: `healthComponents: 'Componentes monitoreados'`, `healthComponentCreate: 'Nuevo componente'`, `healthComponentDetail: 'Detalle del componente'` y `healthComponentEdit: 'Editar componente'`;
  - `health.registry`: `link: 'Componentes monitoreados'`, `backToHealth: 'Salud de servicios'`, `backToList: 'Volver a Componentes monitoreados'`, `builtInNote: 'maily-system-api y la base de datos se monitorean siempre, sin registrarlos.'`, `empty: 'Todavía no hay componentes registrados.'`, `create: 'Nuevo componente'`, `edit: 'Editar'`, `delete: 'Eliminar'`, `enabled: 'Habilitado'`, `disabled: 'Deshabilitado'`, `kinds: { service: 'Microservicio', frontend: 'Frontend', unknown: 'Componente' }`;
  - `health.registry.columns` y `fields`: nombre, código, tipo, URL base, «Ruta de vida», «Ruta de disponibilidad», «Ruta de información», «Ruta de salud», habilitado, orden, «Fecha de alta» y «Última modificación»;
  - `health.registry.form`: `frontendWarning: 'En un frontend que responde con su página a cualquier dirección, una ruta que no existe parecería sana: comprueba que la ruta de salud exista.'`, `fixedInfo` (el código y el tipo no se pueden cambiar; para cambiarlos se elimina y se registra de nuevo) y los textos de formato: `required: 'Este campo es obligatorio.'`, `name: 'Escribe un nombre de 1 a 100 caracteres.'`, `code: 'Usa de 2 a 50 caracteres: minúsculas, números y guiones, empezando con una letra, sin guion al final ni dos seguidos.'`, `baseUrl: 'Escribe una dirección http:// o https:// con dominio, sin usuario, contraseña, parámetros (?) ni fragmento (#), de hasta 255 caracteres.'`, `path: 'Escribe una ruta que empiece con una sola /, de hasta 200 caracteres, sin espacios, sin los caracteres \\ ? # % y sin segmentos . o ...'` y `sortOrder: 'Escribe un número entero de 0 a 9999.'`;
  - `health.registry.notices`: `created: 'Componente registrado.'`, `updated: 'Componente actualizado.'` y `deleted: 'Componente eliminado.'`;
  - `health.registry.errors`: `codeTaken: 'Ya existe un componente con este código.'`, `hostNotAllowed: 'Esta dirección no se puede monitorear. Su dominio debe agregarse a la lista permitida del servicio de salud.'`, `notFound: 'Este componente ya no existe.'`, `form: 'No se pudo guardar el componente. Revisa los datos e inténtalo de nuevo.'`, `unavailable` (genérico de red y servidor) y `loadError` (título y mensaje del listado y del detalle);
  - `health.registry.deleteDialog`: `title: (name: string) => \`¿Eliminar ${name}?\``, `message: 'Dejará de monitorearse y de aparecer en Salud de servicios.'` y `confirm: 'Eliminar'`.

### Tests for User Story 3 ⚠️

- [X] T073 [P] [US3] Crear `src/features/health/schemas/monitoredComponent.test.ts`: el ejemplo de `MonitoredComponentRead` de [contracts/monitored-components.md](contracts/monitored-components.md#el-componente-registrado-monitoredcomponentread) da el modelo en camelCase; `kind` desconocido → `'unknown'`; `ready_path` e `info_path` `null` se conservan; fallan un `id` que no es UUID, la falta de `code`, `base_url` o `live_path`, `enabled` que no es booleano y fechas inválidas; el listado es un arreglo sin envoltorio y conserva el orden.
- [X] T074 [P] [US3] Crear `src/features/health/schemas/componentForm.test.ts` (data-model §5, citando las reglas literalmente):
  - **nombre**: «obligatorio; de 1 a 100 sin contar espacios de los extremos» (falla `''`, `'   '` y 101 caracteres; `'  A  '` vale `'A'`);
  - **código**: «de 2 a 50; minúsculas, dígitos y guiones; empieza con letra; sin guion final ni dos seguidos» (valen `ab`, `mailysoft-usuarios` y `a1-b2`; fallan `a`, `1abc`, `Abc`, `ab-`, `a--b`, `águila` y 51 caracteres);
  - **URL base**: «`http` o `https`; con dominio; sin usuario, contraseña, parámetros (ni `?`) ni fragmento (ni `#`); hasta 255» (valen `http://mailysoft-usuarios:8000` y `https://usuarios.maily.example/base`; fallan `ftp://x`, `http://`, `http://u:p@x`, `http://x?`, `http://x?a=1`, `http://x#`, `http://x#f` y 256 caracteres);
  - **rutas**: «empieza con una sola `/`; sin `\`, `?`, `#`, `%`, espacios ni segmentos `.` o `..`; hasta 200» (valen `/health/live` y `/healthz/`; fallan `health`, `//x`, `/a/../b`, `/a/./b`, `/a\b`, `/a?b`, `/a#b`, `/a%20b`, `/a b` y 201 caracteres);
  - **por tipo**: un microservicio exige las tres rutas; un frontend exige su ruta de salud y no tiene disponibilidad, y su ruta de información es opcional;
  - **orden**: «opcional; entero de 0 a 9999; vacío vale 0» (fallan `-1`, `10000` y `1.5`);
  - **envíos**: `toCreatePayload(values)` da el cuerpo de R3 (un frontend con `ready_path: null` y, sin información, `info_path: null`); `toUpdatePayload(original, values)` da solo los campos que cambiaron, nunca `code` ni `kind`, y `null` si no cambió nada.
- [X] T075 [P] [US3] Crear `src/features/health/schemas/componentsLocation.test.ts` y `src/features/health/schemas/componentId.test.ts`: la página y el tamaño (10, 25 o 50, 10 por defecto) con las reglas de `subscriptionsLocation` (un texto que no es entero positivo da la página 1); `parseComponentId` acepta un UUID y da `null` con cualquier otro texto.
- [X] T076 [P] [US3] Crear `src/features/health/api/monitoredComponentErrors.test.ts` con la tabla de research D16: 422 con `field: 'base_url'` → `field` con `hostNotAllowed` en `baseUrl`; 422 con `code`, `name`, `live_path`, `ready_path`, `info_path`, `sort_order`, `enabled` o `kind` → `field` con el texto de formato de ese campo; 422 con `body`, `component_id`, un campo desconocido o sin `errors` → `form`; 409 `monitored_component_code_already_exists` → `field` con `codeTaken` en `code`; 404 → `notFound`; 403 → `forbidden`; 500, 503, red y tiempo agotado → `unavailable` (con la marca de 503); otro → `unexpected`. Nunca se usa el `message` del servicio.
- [X] T077 [US3] Ampliar el simulador (tras T032), en `src/test/handlers/healthMonitoring/registry.ts` y su registro en `index.ts`, con las cinco operaciones de `/api/v1/monitored-components` en el orden del servicio ([contracts/monitored-components.md](contracts/monitored-components.md#condiciones-generales)): autenticación, permiso de la operación (`health:read`, `write`, `update` o `delete`), validación (422 `validation_error` con `errors` por campo y la forma de research D16, incluido `base_url` fuera de una lista permitida de prueba `allowedHosts`), existencia (404 `monitored_component_not_found`), combinación resultante (422) y código repetido o reservado (409); alta 201, modificación 200, baja lógica 204 (el código queda libre); el resultado del agregador lo refleja (`resultFrom`). Controles: `setAllowedHosts`, `registered()`, `removeBehindTheScenes(id)` (para el 404 de otra persona) y los de fallas.
- [X] T078 [P] [US3] Crear `src/test/handlers/healthMonitoring/registry.test.ts` (tras T077), con `callSubscriptions`: alta, consulta, listado ordenado por `sort_order` y `code`, modificación parcial, baja y reutilización del código; 403 por operación; 422 por campo y por host; 409; 404; y que un componente habilitado aparece en `GET /api/v1/health` y uno deshabilitado no.
- [X] T079 [P] [US3] Crear `src/features/health/api/monitoredComponentsApi.test.ts` (tras T077): `listMonitoredComponents`, `getMonitoredComponent`, `createMonitoredComponent`, `updateMonitoredComponent` y `deleteMonitoredComponent` piden el método, la ruta y el cuerpo de R1 a R5 con el token; devuelven el modelo; un 422 llega como `ApiError` con `fieldErrors`; un 204 se resuelve sin cuerpo.
- [X] T080 [P] [US3] Crear las pruebas de los hooks del registro en `src/features/health/hooks/useMonitoredComponents.test.tsx` (cada prueba monta sus hooks en un solo `renderHook`: dos árboles del mismo `createWrapper` comparten el router y el primero deja de actualizarse): el listado y el detalle consultan una vez y reintentan 2 veces ante red o 5xx; el alta invalida el listado; la edición fija el detalle e invalida el listado; la eliminación quita el detalle e invalida el listado; un 404 quita el detalle; las mutaciones no se reintentan; `useComponentsLocation` lee y escribe `?page=` y `?pageSize=` y corrige con `replace` una página que no existe cuando ya llegó la lista.
- [X] T081 [P] [US3] Crear `src/features/health/components/ComponentsGrid.test.tsx`: columnas nombre (enlace al detalle), código, tipo, URL base (**texto, nunca enlace**), «Habilitado» o «Deshabilitado» y orden, en el orden recibido; 10 filas por defecto y las opciones 10, 25 y 50; con 30 componentes y tamaño 10, nunca más de 10 filas; el total y los controles de página; localización en español; pasa axe.
- [X] T082 [P] [US3] Crear `src/features/health/components/ComponentFormFields.test.tsx`: en el alta, el tipo Microservicio propone `/health/live`, `/health/ready` e `/info` y «Habilitado» marcado; el tipo Frontend muestra «Ruta de salud» vacía, «Ruta de información» opcional, sin disponibilidad, y la advertencia; en la edición, el código y el tipo se ven como información fija; cada error de formato aparece junto a su campo antes de enviar; pasa axe con errores.
- [X] T083 [P] [US3] Crear `src/features/health/pages/MonitoredComponentsListPage.test.tsx`, `MonitoredComponentDetailPage.test.tsx`, `MonitoredComponentCreatePage.test.tsx` y `MonitoredComponentEditPage.test.tsx` en `src/features/health/pages/`, con `renderWithProviders` y el simulador:
  - **listado**: carga, vacío (con la explicación de los integrados y «Nuevo componente» solo con `canCreate`), con datos (con la nota de los integrados), error con «Reintentar» (y la causa con 503), y sin permiso;
  - **detalle**: carga, datos completos con fechas locales y las acciones según las capacidades, error con «Reintentar», y 404 con «Este componente ya no existe.» y vuelta al listado;
  - **alta y edición**: «Guardar» deshabilitado mientras se envía; éxito con el aviso y vuelta; 409 junto al código; 422 de host junto a la URL; un error de red con el aviso genérico y lo escrito conservado; la edición sin cambios no hace ninguna petición;
  - **eliminación**: `ConfirmDialog` con «¿Eliminar MailySoft Usuarios?» y el mensaje; cancelar no cambia nada y devuelve el foco a «Eliminar»; confirmar elimina, avisa y vuelve al listado;
  - axe en cada estado de SC-003 del registro (listado con datos y vacío, detalle, formulario con errores y diálogo).
- [X] T084 [P] [US3] Crear `src/app/router/health/registry.integration.test.tsx`, con `renderApp`, el simulador de usuarios con `health:*` concedidos y `createHealthMonitoringMock({ directory })` con `allowedHosts`:
  - desde `/health`, «Componentes monitoreados» lleva a `/health/components` (título y foco) y su enlace vuelve;
  - registrar «MailySoft Usuarios» (`mailysoft-usuarios`, microservicio): aviso, fila en el listado y, de vuelta en `/health`, el componente en la lista tras el ciclo;
  - código repetido, host no permitido y formato inválido (sin petición) según US3-6 a US3-8;
  - editar y deshabilitar: «Deshabilitado» en el listado y ausente de `/health` tras el ciclo; habilitarlo lo devuelve;
  - eliminar con confirmación; el código se puede registrar de nuevo;
  - capacidades: con solo `health:read`, sin acciones; sin `health:write`, `/health/components/new` vuelve al listado con «No tienes permiso para realizar esta acción.»; lo mismo con la edición sin `health:update`; sin `health:delete`, sin «Eliminar»;
  - capacidades que cambian (FR-032): con el formulario de edición abierto, `directory.revoke('Administrator', 'health:update')` y la recomprobación (5 min) devuelven al listado con el aviso; un `grant` nuevo hace aparecer su acción sin salir y volver;
  - un componente eliminado por otra persona (`removeBehindTheScenes`): al abrirlo, editarlo o eliminarlo, «Este componente ya no existe.» y el listado actualizado;
  - `/health/components/no-es-un-uuid` se titula «Página no encontrada».

### Implementation for User Story 3

- [X] T085 [P] [US3] Implementar `src/features/health/schemas/monitoredComponent.ts` (hace pasar T073), con `MonitoredComponent` y `MonitoredComponentDto`.
- [X] T086 [P] [US3] Implementar `src/features/health/schemas/componentForm.ts` (hace pasar T074; ninguna regla usa `abort`, porque Zod 4 saltaría entonces la comprobación de las rutas, que también debe avisarse antes de enviar; el formulario muestra el primer error de cada campo): `componentFormSchema` con `superRefine` por tipo, `ComponentFormValues`, `toCreatePayload` y `toUpdatePayload`, con los textos de `messages.health.registry.form`.
- [X] T087 [P] [US3] Implementar `src/features/health/schemas/componentsLocation.ts` y `src/features/health/schemas/componentId.ts` (hacen pasar T075), y exportar `parseComponentId` en `src/features/health/index.ts`.
- [X] T088 [P] [US3] Implementar `describeMonitoredComponentError(error, operation)` en `src/features/health/api/monitoredComponentErrors.ts` (hace pasar T076), con `MonitoredComponentErrorOutcome` de data-model §5.
- [X] T089 [US3] Implementar `src/features/health/api/monitoredComponentsApi.ts` (hace pasar T079), con `MONITORED_COMPONENTS_PATH = '/api/v1/monitored-components'` y las cinco funciones.
- [X] T090 [US3] Crear los hooks en `src/features/health/hooks/` (hacen pasar T080; las consultas quedaron en `useMonitoredComponents.ts`, las tres mutaciones en `useMonitoredComponentMutations.ts` y la dirección en `useComponentsLocation.ts`): `useMonitoredComponents` (listado), `useMonitoredComponent` (detalle), `useCreateMonitoredComponent`, `useUpdateMonitoredComponent`, `useDeleteMonitoredComponent` (con `MUTATION_RETRY` y la matriz de invalidación de data-model §8) y `useComponentsLocation`.
- [X] T091 [P] [US3] Crear `src/features/health/components/ComponentsGrid.tsx` (hace pasar T081; sin acción en el estado vacío, porque axe no admite un enlace dentro de una `grid`: «Nuevo componente» queda junto al título), con el Data Grid como `SubscriptionsGrid` (`paginationMode="server"`, `rowCount`, `pageSizeOptions` y los estilos de `src/shared/ui/dataGridStyles.ts`).
- [X] T092 [P] [US3] Crear `src/features/health/components/ComponentFormFields.tsx`, `src/features/health/components/ComponentDetailFields.tsx`, `src/features/health/components/DeleteComponentAction.tsx` (con `ConfirmDialog`, `mutateAsync` y `useDeferredNotice`, como `DeleteSubscriptionAction`) y `src/features/health/components/applyComponentRefusal.ts` (reparte el resultado de D16 entre los campos y el error general, como `applyRefusal`) (hacen pasar T082 y parte de T083).
- [X] T093 [US3] Crear las cuatro páginas en `src/features/health/pages/` (hacen pasar T083): `MonitoredComponentsListPage.tsx`, `MonitoredComponentDetailPage.tsx`, `MonitoredComponentCreatePage.tsx` y `MonitoredComponentEditPage.tsx`, con `FormFrame`, `useFocusOnMount`, las capacidades por props y los estados de [contracts/app-routes.md](contracts/app-routes.md).
- [X] T094 [US3] Exportar las cuatro páginas con `lazy` en `src/features/health/index.ts`.
- [X] T095 [US3] Crear en `src/app/router/health/` `MonitoredComponentsListRoute`, `MonitoredComponentDetailRoute`, `MonitoredComponentCreateRoute` y `MonitoredComponentEditRoute` (las cuatro en `MonitoredComponentRoutes.tsx`), como las de Suscripciones: `getHealthCapabilities(useGrantedAccess())` y, en el alta y la edición, `RequireCapability` con `canCreate` y `canEdit` hacia `/health/components`.
- [X] T096 [US3] Conectar las rutas en `src/app/router/health/healthRoutes.tsx`, `src/app/layouts/useRouteAccessibility.ts` y `src/features/health/components/HealthToolbar.tsx` (hace pasar T084):
  - en `src/app/router/health/healthRoutes.tsx`, bajo `/health`: `components` (listado), `components/new` (antes de `:componentId`), `components/:componentId` y `components/:componentId/edit`, con `handle.titleKey` (`healthComponents`, `healthComponentCreate`, `healthComponentDetail` y `healthComponentEdit`) y `componentIdParam: 'componentId'` en el detalle y la edición, y `ErrorBoundary: RouteErrorBoundary`. `src/app/router/routes.tsx` no cambia;
  - en `src/app/layouts/useRouteAccessibility.ts`, las cuatro claves y `componentIdParam`, que con un segmento que no es UUID (`parseComponentId` de `@/features/health`) titula «Página no encontrada»;
  - en `src/features/health/components/HealthToolbar.tsx`, el enlace «Componentes monitoreados» a `/health/components` (FR-005), que también se ve en la carga y con fallo.
- [X] T097 [US3] Verificar la historia: `npm run typecheck`, `npm run lint` y `npm run test`, y a mano contra el servicio real si está disponible (quickstart V2, V8). (2026-10-25: tipos, lint, formato y tamaño limpios, 304,1 KB de 320 KB, y las 3996 pruebas pasan; la validación a mano queda pendiente: no hay servicio real en este entorno.)

**Checkpoint**: el registro se administra desde el Backoffice y los cambios se ven en la página sin desplegar nada.

---

## Phase 6: User Story 5 - Ver el estado de la plataforma cuando no se puede comprobar el acceso (Priority: P2)

**Goal**: «No se pudo comprobar el acceso» muestra, además de lo que ya ofrece, la sección «Estado de la plataforma» con el estado público (sin credencial), con la base de datos detenida por horario y cuándo vuelve; se consulta al aparecer y tras cada «Reintentar» que vuelve a fallar, nunca mientras se comprueba el acceso. La misma sección aparece en «Salud de servicios» cuando falla el agregador, como segundo paso de la cadena del ciclo.

**Independent Test**: Con la comprobación del acceso y el estado público simulados: hacer fallar la comprobación y comprobar la sección (de noche con la base detenida y su próximo inicio; con mailySoft-usuarios caído; con maily-system-api sin responder; con una respuesta fuera de esquema; con valores desconocidos; con `next_start_at` nulo), que el resto de la pantalla no cambia, que la consulta va sin credencial y no se hace mientras se comprueba el acceso, y que se repite con «Reintentar» pero no sola; repetirlo en «Salud de servicios» con el agregador fallando; comprobar que «Sin acceso» no la muestra.

### Textos de la historia

- [X] T098 [US5] Añadir a `src/shared/messages/es.ts`, en `health.platform`: `title: 'Estado de la plataforma'`, `loading: 'Consultando el estado de la plataforma…'`, `failed: 'No se pudo obtener el estado de la plataforma.'`, `empty: 'No hay componentes para mostrar.'`, `databaseStopped: 'Base de datos detenida por horario'` y `refreshing: 'Actualizando…'`.

### Tests for User Story 5 ⚠️

- [X] T099 [P] [US5] Crear `src/features/health/schemas/publicStatus.test.ts` (data-model §3): el ejemplo de [contracts/public-status.md](contracts/public-status.md#p1--consultar-el-estado-público) da el modelo; `components: []` es válido; un estado general o de componente desconocido (`maintenance`) y un tipo desconocido no invalidan; fallan la falta de `components`, un `name` vacío, un `code` ausente y un `next_start_at` que no es fecha ni `null`; los campos de más (`version`, `latency_ms`, `checks`, `error`, `registry_available`) se descartan y no existen en el modelo (SC-014).
- [X] T100 [US5] Ampliar el simulador (tras T032), en `src/test/handlers/healthMonitoring/publicStatus.ts` y su registro en `index.ts`: `GET ${SUBSCRIPTIONS_API_BASE_URL}/health/status`, **sin** autenticación ni permiso, que responde 200 con `status`, `checked_at` y los componentes del resultado vigente (solo `code`, `name`, `kind`, `status` y `next_start_at`), con controles de fallas propios (`publicStatus.failNext`, `failAll`, `hang`, `defer`, `recover`), independientes de los del agregador; la petición se registra con su `authorization` (el modo `credentials` lo ve `watchFetchCalls`, T030).
- [X] T101 [P] [US5] Ampliar `src/features/health/api/healthApi.test.ts` (tras T100) para `getPublicStatus(client)`: pide `GET /health/status` en la raíz (no bajo `/api/v1`); **sin** `Authorization`, con `credentials: 'omit'` (con `watchFetchCalls`) y sin llamar a `getAccessToken` (un espía), también cuando `getAccessToken` rechaza; un 401 nunca llama a `onSessionExpired`; agota el tiempo a los 10 s (`PUBLIC_STATUS_TIMEOUT_MS`); un cuerpo fuera de esquema es `ApiError` `contract`.
- [X] T102 [P] [US5] Crear `src/features/health/hooks/fallbackChain.test.ts` y ampliar `src/features/health/policy/refreshRules.test.ts`:
  - `startsFallbackChain(error)` es `true` con `ApiError` `network`, `timeout`, `contract` y `http` 5xx (500, 502, 503), y `false` con 401, 403, 404, 422, `SessionExpiredError` y cualquier otro error (research D8);
  - `runFallbackChain({ queryClient, clients, scope, signal })` ejecuta el paso del estado público con `queryClient.query` y, si responde bien, quita de la caché el paso de la comprobación directa de ese ámbito (la US6 añade el paso siguiente).
- [X] T103 [P] [US5] Crear `src/features/health/hooks/useHealthCycle.chain.test.tsx`, con temporizadores simulados:
  - con el agregador en 503 (y su reintento), el mismo ciclo consulta el estado público una vez, y la cuenta del intervalo empieza cuando termina;
  - con el agregador bien, no se consulta el estado público y su paso se quita de la caché; con 403, tampoco, y se quita; con 401 o un 404, tampoco;
  - en el ciclo siguiente que vuelve a fallar, el paso conserva sus datos con `isFetching` mientras se consulta;
  - al salir de la página se cancelan los pasos en curso y se quitan de la caché (cada aparición empieza en carga, FR-064).
- [X] T104 [P] [US5] Crear `src/features/health/hooks/useAccessCheckFallback.test.tsx`, con temporizadores simulados y la visibilidad:
  - con `round` 0 y `paused` falso, una consulta del estado público;
  - con `paused` verdadero, ninguna; una consulta en curso se cancela al pasar a `paused`;
  - `round` 1 con `paused` verdadero no consulta; al pasar a `paused` falso consulta una vez, y la sección conserva lo anterior con `isRefreshing` hasta la respuesta;
  - el paso del tiempo (10 min), el regreso a la pestaña y una pausa sin cambio de `round` sobre una ronda terminada no consultan (SC-015);
  - una ronda interrumpida por una pausa sin cambio de `round` (una recomprobación que la persona no pidió) se completa al quitar la pausa, con una sola petición más para lo cortado y ninguna para lo que ya había terminado (FR-071);
  - al desmontar, se cancela todo y se quitan los pasos del ámbito `'access'`.
- [X] T105 [P] [US5] Crear `src/features/health/components/PlatformStatusSection.test.tsx`:
  - el `h2` «Estado de la plataforma»; en carga, «Consultando el estado de la plataforma…»; con datos, el estado general en texto y cada componente con su nombre y su `StatusBadge`, en el orden recibido; vacía, «No hay componentes para mostrar.»; fallo, «No se pudo obtener el estado de la plataforma.» (también si había datos: reemplaza lo anterior);
  - con la base `stopped` y `nextStartAt`, «Base de datos detenida por horario» y la línea de regreso; con `null`, solo el aviso; un `nextStartAt` en otro componente no se muestra; con la hora ya pasada, la línea «Su encendido estaba programado…», que cambia sola al llegar la hora (temporizadores simulados);
  - con datos y `isRefreshing`, «Actualizando…»;
  - nunca hay versiones, latencias, chequeos ni errores;
  - **anuncios** (FR-063): su `LiveStatus` escribe el texto de la sección una vez cuando carga por primera vez y otra cuando cambia `announceToken`; una renovación sin cambio de `announceToken` no escribe nada;
  - axe en carga, con datos, con la base detenida con y sin próximo inicio, vacía y con fallo (SC-016).
- [X] T106 [P] [US5] Ampliar `src/features/auth/components/AccessCheckFailedPage.test.tsx` y `src/features/auth/hooks/useOperatorAccess.test.tsx`: la página pinta sus `children` después de la línea de la cuenta, y todo lo demás sigue igual; en `failed`, `isChecking` es `true` mientras se reintenta (la consulta sigue en error) y `false` cuando termina.
- [X] T107 [P] [US5] Crear `src/app/router/AccessCheckFailedScreen.test.tsx` (y `AccessCheckFailedScreen.boundary.test.tsx`, con la sección que falla al pintarse simulada con `vi.mock`): mientras el fragmento diferido carga, el marcador muestra el `h2` y «Consultando el estado de la plataforma…»; si un hijo lanza un error, el `ErrorBoundary` muestra «No se pudo obtener el estado de la plataforma.» y el título, «Reintentar» y «Cerrar sesión» siguen funcionando; «Reintentar» suma una ronda y llama a `refetch`.
- [X] T108 [P] [US5] Crear `src/app/router/health/accessFallback.integration.test.tsx`, con `renderApp`, el simulador de usuarios con su consulta de acceso fallando (503) y el de salud:
  - **US5-1**: con la base `stopped` y `next_start_at` `2026-11-02T14:00:00Z`, la pantalla conserva su título, su mensaje, «Reintentar» y «Cerrar sesión», y muestra la sección con «Degradado», cada componente y la línea de regreso en UTC (la zona de las pruebas);
  - **US5-2 y US5-3**: con mailySoft-usuarios caído y la base `up`, «Con componentes caídos» sin aviso de horario; con el estado público fallando, «No se pudo obtener el estado de la plataforma.»;
  - **sin credencial**: la petición a `/health/status` no lleva `Authorization` y pide `credentials: 'omit'` (con `watchFetchCalls`);
  - **frecuencia** (SC-015): mientras se comprueba el acceso (retenido con `defer`) no hay peticiones a `/health/status`; hay 1 al aparecer; con «Reintentar» que vuelve a fallar, 1 más, y ninguna mientras se comprueba; con la pantalla abierta 10 min, al volver a la pestaña o con la recomprobación de 5 min, 0 más;
  - **«Reintentar» que da acceso**: la persona entra sin esperar al estado público (retenido);
  - **«Sin acceso»**: con una consulta de acceso que responde sin rol de Sistema, `/access-denied` no tiene la sección ni consulta `/health/status`.
- [X] T109 [P] [US5] Ampliar `src/app/router/health/health.integration.test.tsx`: en «Salud de servicios», con el agregador en 503 (sin datos y con datos), la sección aparece junto al mensaje o el aviso, se anuncia una vez y desaparece cuando una consulta al agregador sale bien; con 403 no aparece (US5-11).

### Implementation for User Story 5

- [X] T110 [P] [US5] Implementar `src/features/health/schemas/publicStatus.ts` (hace pasar T099), con `PlatformStatus` y `PlatformComponent`.
- [X] T111 [US5] En `src/features/health/api/healthApi.ts` (hace pasar T101): `PUBLIC_STATUS_PATH = '/health/status'`, `PUBLIC_STATUS_TIMEOUT_MS = 10_000` y `getPublicStatus(client, { signal })` con `anonymous: true` y ese límite, con un comentario que cite FR-056.
- [X] T112 [US5] Implementar `startsFallbackChain` en `src/features/health/policy/refreshRules.ts`, `platformStatusQuery(client, scope)` en `src/features/health/hooks/healthQueries.ts` (`retry: retryUpTo(1)`, `gcTime: Infinity`, `networkMode: 'always'`) y `runFallbackChain` en `src/features/health/hooks/fallbackChain.ts` (hacen pasar T102).
- [X] T113 [US5] Ampliar `runHealthCycle` en `src/features/health/hooks/useHealthCycle.ts` (hace pasar T103): tras un fallo del agregador que cumple `startsFallbackChain`, `runFallbackChain` en el ámbito `'page'`; con el agregador bien o con 403, quitar los pasos del ámbito; al abortarse el ciclo o al desmontar la página, cancelarlos y quitarlos.
- [X] T114 [US5] Crear `src/features/health/hooks/useAccessCheckFallback.ts` (hace pasar T104): `useQuery` con `healthKeys.accessChain(round)`, `enabled: !paused`, `staleTime: Infinity`, `gcTime: 0`, sin intervalo, foco ni reconexión, `retry: false` y `networkMode: 'always'`; un efecto que, al pasar a `paused`, cancela la ronda y los pasos del ámbito `'access'`, y otro que, al desmontar, los cancela y los quita.
- [X] T115 [P] [US5] Crear `src/features/health/components/PlatformStatusSection.tsx` y `src/features/health/components/SectionAnnouncer.tsx` (hacen pasar T105): `toPlatformStatusView` (data-model §11) en `src/features/health/hooks/usePlatformStatusSection.ts`; `SectionAnnouncer` usa `LiveStatus` y escribe el texto cuando el paso termina por primera vez desde que apareció o cuando cambia `announceToken`.
- [X] T116 [US5] Crear `src/features/health/components/FallbackSections.tsx`, que recibe `scope` y `announceToken` y pinta `PlatformStatusSection`, y pintarlo desde `src/features/health/pages/HealthPage.tsx` (ámbito `'page'`) después del fallo de FR-030, en los estados `failed` y `ready` con `refreshFailed`, con un `announceToken` que suma 1 en cada «Actualizar» o «Reintentar» de la persona (hace pasar T109).
- [X] T117 [US5] Crear `src/features/health/components/AccessCheckFallback.tsx` (la sección de la pantalla de fallo: `useAccessCheckFallback` y `FallbackSections` en el ámbito `'access'`, con `announceToken = round`), `src/features/health/components/FallbackPlaceholders.tsx` (los marcadores ligeros de carga y de fallo, con el `h2` y los textos de `messages.health.platform`) y exportarlos en `src/features/health/index.ts`: `AccessCheckFallback` con `lazy` y los dos marcadores de forma estática (research D9, D20).
- [X] T118 [US5] En `src/features/auth/components/AccessCheckFailedPage.tsx`, `children?: ReactNode` pintado después de la línea de la cuenta, con un comentario que cite FR-065 (no conoce lo que recibe); en `src/features/auth/hooks/useOperatorAccess.ts`, `isChecking: boolean` (`query.isFetching`) en el estado `failed` (hacen pasar T106). Nada más cambia en `auth`, salvo una precisión de la implementación (2026-10-25): TanStack Query 5.104.4 devuelve a `pending`, sin error, una consulta sin datos mientras vuelve a pedir, así que «la consulta sigue en error» (research D9) no era cierto y la pantalla de fallo se desmontaba en cada reintento y en cada recomprobación; `useOperatorAccess` sigue en `failed` mientras `errorUpdatedAt > 0` y no hay datos, con `isChecking` verdadero. Las pruebas de la 001 y la 006 pasan sin cambiar lo que afirman.
- [X] T119 [US5] Crear `src/app/router/AccessCheckFailedScreen.tsx` (hace pasar T107): guarda `round`, envuelve `refetch` para sumar una ronda (y pausa la ronda nueva hasta que la comprobación empieza de verdad, porque el estado de la consulta llega un instante después del clic), y pinta `AccessCheckFailedPage` con `ErrorBoundary` (marcador de fallo), `Suspense` (marcador de carga) y `AccessCheckFallback` con `round` y `paused = access.isChecking`; en `src/app/router/ProtectedRoute.tsx`, el caso `failed` pinta `AccessCheckFailedScreen` (hace pasar T108).
- [X] T120 [US5] Verificar la historia: `npm run typecheck`, `npm run lint` y `npm run test`; las pruebas de la 001 y la 006 (`accessFlow.test.tsx`, `authFlow.integration.test.tsx`, `AccessCheckFailedPage.test.tsx`) siguen pasando sin cambiar lo que afirman; a mano, quickstart V10. (2026-10-25: tipos, lint, formato y tamaño limpios, 305,8 KB de 320 KB, y las 4068 pruebas pasan; la validación a mano queda pendiente: no hay servicio real en este entorno.)

**Checkpoint**: quien no puede entrar ve el estado de la plataforma y cuándo vuelve la base de datos; en «Salud de servicios», el fallo del agregador muestra el estado público.

---

## Phase 7: User Story 6 - Saber qué servicios responden cuando el monitoreo central no responde (Priority: P2)

**Goal**: Si tampoco responde el estado público, el navegador comprueba sin credencial `/health/live` y `/health/ready` de maily-system-api, de mailySoft-usuarios y de los servicios de `VITE_HEALTH_DIRECT_SERVICES`, y muestra en «Comprobación directa» cuáles responden («Operativo», «Degradado» con su explicación o «No responde»), sin marcar nada más y con lo demás en «Sin información», en las dos pantallas y con la frecuencia de cada una.

**Independent Test**: Con el agregador, el estado público y las rutas de salud simulados: abrir «Salud de servicios» con maily-system-api sin responder y usuarios y pacientes en marcha, con la disponibilidad de usuarios en 503, con usuarios sin responder, con una página HTML, con un tiempo agotado, con un fallo de red, con datos previos y con la base prefijada del intermediario; comprobar las filas, que ninguna consulta lleva credencial, que la cadena se repite en el ciclo sin superponerse y desaparece al volver el agregador; repetir en la pantalla de fallo; y compilar sin la variable y con valores inválidos.

### Configuración y clientes (research D4, D17)

- [X] T121 [P] [US6] Ampliar `src/app/config/env.test.ts`, que debe fallar primero, para `VITE_HEALTH_DIRECT_SERVICES` ([contracts/environment.md](contracts/environment.md#vite_health_direct_services)):
  - ausente, `''` o `'[]'` → `[]`;
  - válidos: el ejemplo de mailySoft-pacientes con URL `https`, una ruta del mismo origen (`/proxy/patients`) y 20 elementos; un `name` con espacios en los extremos se guarda recortado;
  - inválidos (en un build de producción cuando aplica): `'no es json'`, `'{}'`, `'   '`, un elemento sin `url`, uno con un campo de más, `code` `'Pacientes'`, `'a'` o repetido, `code` `'maily-system-api'` o `'mailysoft-usuarios'`, `name` vacío o de 101 caracteres, `url` `http://…` en producción, con barra final, con `?x=1` o con `#f`, y 21 elementos; todos dan exactamente `VITE_HEALTH_DIRECT_SERVICES: ${messages.config.rules.healthDirectServices}` y el mensaje nunca contiene el valor.
- [X] T122 [US6] Implementar en `src/shared/messages/es.ts`, `src/app/config/env.ts`, `src/vite-env.d.ts` y los arneses (hace pasar T121):
  - en `src/shared/messages/es.ts`, `config.rules.healthDirectServices: 'Lista JSON de hasta 20 objetos { code, name, url }: code con el formato del código de un componente, único y distinto de maily-system-api y mailysoft-usuarios; name de 1 a 100 caracteres; url con las reglas de las URL base de las APIs.'`;
  - en `src/app/config/env.ts`, `VITE_HEALTH_DIRECT_SERVICES`: `z.preprocess` que convierte `''` y ausente en `[]` y lee el JSON con `try/catch` (un JSON inválido es un fallo de la regla), y después `z.array(z.strictObject({ code, name, url })).max(20)` con `code` como el del registro, `name` recortado de 1 a 100 y `url` con `isApiBase(value, isProduction)`, y un `superRefine` contra repetidos y los dos códigos fijos; todos con el error de la regla;
  - en `src/vite-env.d.ts`, `readonly VITE_HEALTH_DIRECT_SERVICES: string | undefined`;
  - en `src/test/renderApp.tsx` y `src/app/providers/HttpClientsProvider.test.tsx`, `VITE_HEALTH_DIRECT_SERVICES: []` en su `env`.
- [X] T123 [P] [US6] Ampliar `src/app/providers/HttpClientsProvider.test.tsx` (tras T122), que debe fallar primero: con dos servicios en `VITE_HEALTH_DIRECT_SERVICES`, `useHttpClients().healthServices` tiene dos `{ code, name, client }` en ese orden, y sus `probe` no piden el token ni envían `Authorization`; sin servicios, `[]`.
- [X] T124 [US6] Implementar (hace pasar T123): en `src/shared/api/httpClientsContext.tsx`, `NamedHttpClient` y `HttpClients.healthServices: readonly NamedHttpClient[]`, con un comentario genérico (clientes anónimos de otros servicios configurados al compilar, solo para sus rutas públicas de salud); en `src/app/providers/HttpClientsProvider.tsx`, `createAnonymousHttpClient` por cada servicio de `env.VITE_HEALTH_DIRECT_SERVICES`, dentro del mismo `useMemo`; en `src/test/renderWithProviders.tsx`, `healthServices: []` por defecto y una opción para pasar los de una prueba.
- [X] T125 [US6] En `vite.config.ts`, el intermediario `/proxy/patients` hacia `PATIENTS_API_PROXY_TARGET` **solo si** la variable está definida, como `/proxy/users` (`changeOrigin` y `rewrite`), con un comentario que cite research D19.

### Textos de la historia

- [X] T126 [US6] Añadir a `src/shared/messages/es.ts`, en `health.direct`: `title: 'Comprobación directa'`, `intro: 'No se pudo consultar el monitoreo central (maily-system-api). Esto es lo que tu navegador pudo comprobar directamente:'`, `names: { systemApi: 'maily-system-api', users: 'mailySoft-usuarios' }`, `status: { operational: 'Operativo', degraded: 'Degradado', unreachable: 'No responde' }`, `explanations: { database: 'Su base de datos no responde.', notConfigured: 'Le falta configuración, por ejemplo la conexión a la base de datos.', unknownCheck: 'Falló uno de sus chequeos.', notReady: 'Está en línea, pero no está listo para atender.' }`, `others: 'Los demás componentes (base de datos, MailySoft y los componentes registrados que no aparecen en esta lista) no se pueden comprobar desde el navegador: Sin información.'`, `loading: 'Comprobando los servicios desde tu navegador…'` y `refreshing: 'Actualizando…'`.

### Tests for User Story 6 ⚠️

- [X] T127 [P] [US6] Crear `src/features/health/schemas/healthV1.test.ts`: `liveBodySchema` acepta `{"status":"ok"}` (con campos de más) y rechaza `{"status":"down"}`, `{}` y `undefined`; `readyBodySchema` acepta los dos cuerpos del contrato v1 con `checks` (nombres y códigos desconocidos incluidos) y rechaza la falta de `checks`, un chequeo sin `name` o sin `latency_ms`, y un `status` desconocido.
- [X] T128 [P] [US6] Crear `src/features/health/policy/directCheckRules.test.ts` con la tabla de [contracts/health-v1-probes.md](contracts/health-v1-probes.md#decisión-de-cada-fila-fr-069): vida bien y disponibilidad bien → `operational`; vida bien y 503 del contrato con `database` en error → `degraded` con «Su base de datos no responde.»; con `not_configured` → «Le falta configuración…»; con un chequeo `cache` en error → «Falló uno de sus chequeos.»; con dos chequeos que dan la misma explicación, una sola vez; sin chequeos en error → «Está en línea, pero no está listo para atender.»; vida bien y disponibilidad que falla de otra forma (200 con `unavailable`, 503 con `ok`, 500, HTML, red, tiempo) → `degraded` con «Está en línea…»; vida que falla (red, tiempo, no 2xx, HTML) → `unreachable`, responda lo que responda la disponibilidad.
- [X] T129 [US6] Crear `src/test/handlers/healthProbes/index.ts` con `createHealthProbesMock({ services })`, que registra `GET {base}/health/live` y `GET {base}/health/ready` para cada base (por defecto `SUBSCRIPTIONS_API_BASE_URL`, `USERS_API_BASE_URL` y `https://pacientes.example.test`), con modos por servicio y por ruta: `up`, `ready503` (con `database` en error, `not_configured` o un chequeo desconocido), `html200`, `networkError` (`HttpResponse.error()`, como ve el navegador un bloqueo de CORS), `hang`, `status(500)` y `defer`; registra cada petición con su `authorization` (el modo `credentials` lo ve `watchFetchCalls`, T030); y su prueba `src/test/handlers/healthProbes/index.test.ts`.
- [X] T130 [P] [US6] Crear `src/features/health/api/directCheckApi.test.ts` (tras T129), con temporizadores simulados:
  - `checkDirectTargets(targets, { signal })` pide en paralelo `/health/live` y `/health/ready` de cada destino, sin `Authorization` y con `credentials: 'omit'` (con `watchFetchCalls`), y devuelve las filas en el orden de los destinos;
  - con un servicio en `hang`, su vida agota a los 5 s y su fila dice `unreachable`; todas las filas llegan juntas como mucho a los 5 s; no hay reintentos (una sola petición por ruta);
  - con la base `/proxy/users`, pide `/proxy/users/health/live` y `/proxy/users/health/ready`;
  - un 200 con HTML da `unreachable`; el 503 del contrato da `degraded` con su explicación.
- [X] T131 [P] [US6] Ampliar `src/features/health/hooks/useHealthCycle.chain.test.tsx` y `src/features/health/hooks/useAccessCheckFallback.test.tsx`:
  - con el agregador y el estado público fallando, el mismo ciclo hace la comprobación directa; con el estado público bien, no, y su paso se quita;
  - en el ciclo siguiente, la comprobación conserva sus filas con `isFetching` mientras se repite; nunca hay dos rondas en curso; con la pestaña oculta no empieza ninguna cadena; la cuenta del intervalo empieza al terminar la comprobación;
  - cuando vuelven el agregador o el estado público, el paso se quita;
  - en la pantalla de fallo, la comprobación se hace tras fallar el estado público, se cancela con «Reintentar» (`paused`) y no se repite sola.
- [X] T132 [P] [US6] Crear `src/features/health/components/DirectCheckSection.test.tsx`: el `h2` «Comprobación directa» del mismo nivel que «Estado de la plataforma»; en carga, «Comprobando los servicios desde tu navegador…»; con filas, el aviso, cada fila con su nombre y su estado (icono y texto, cada estado con un icono distinto) y, en `degraded`, su explicación, y el texto «Sin información»; sin servicios configurados, solo las dos filas fijas; con `isRefreshing`, «Actualizando…»; anuncios como T105; nunca muestra un texto de la respuesta; axe en carga, todos operativos, uno degradado con y sin la explicación de su chequeo, uno que no responde y sin servicios configurados (SC-022).
- [X] T133 [P] [US6] Crear `src/app/router/health/directCheck.integration.test.tsx`, con `renderApp` (`env` con `VITE_HEALTH_DIRECT_SERVICES` de pacientes en `https://pacientes.example.test`), los simuladores de usuarios, de salud y de sondeos:
  - **US6-1**: en «Salud de servicios», con el agregador y el estado público con error de red (maily-system-api detenido) y usuarios y pacientes `up`: el fallo de FR-030, «No se pudo obtener el estado de la plataforma.» y la comprobación con «maily-system-api: No responde», «mailySoft-usuarios: Operativo» y «mailySoft-pacientes: Operativo», en 10 s o menos (SC-019), sin marcar nada más;
  - **US6-2**: en la pantalla de fallo con maily-system-api y usuarios detenidos, las tres filas de la spec y la pantalla intacta (SC-020);
  - **US6-3**: con el agregador en 503 y el estado público bien, 0 peticiones a `/health/live` y `/health/ready`;
  - **US6-7**: con datos de hace 2 minutos, los datos se conservan con su aviso y la comprobación aparece aparte;
  - **US6-10**: cuando el agregador vuelve, desaparecen las dos secciones y el aviso;
  - **US6-12 y US6-13**: ninguna petición de la comprobación lleva `Authorization` ni cookies; sin `VITE_HEALTH_DIRECT_SERVICES`, solo dos filas y ninguna petición a otro origen;
  - **frecuencia** (SC-021): en «Salud de servicios», una ronda por ciclo, 0 con la pestaña oculta y nunca dos iguales en curso; en la pantalla de fallo, una ronda al aparecer y una por cada «Reintentar» con el estado público fallando, 0 automáticas.
- [X] T134 [P] [US6] Ampliar `src/app/ConfigErrorScreen.test.tsx`: con `VITE_HEALTH_DIRECT_SERVICES` inválida, la pantalla nombra la variable y su regla, sin repetir el valor (US6-14).

### Implementation for User Story 6

- [X] T135 [P] [US6] Implementar `src/features/health/schemas/healthV1.ts` (hace pasar T127) y `decideDirectStatus(live, ready)` en `src/features/health/policy/directCheckRules.ts` (hace pasar T128), con `LiveOutcome`, `ReadyOutcome` y `DirectCheckRow` de data-model §4.
- [X] T136 [US6] Implementar `src/features/health/api/directCheckApi.ts` (hace pasar T130): `LIVE_PATH = '/health/live'`, `READY_PATH = '/health/ready'`, `DIRECT_CHECK_TIMEOUT_MS = 5_000`, `directCheckTargets(clients: HttpClients)` (los dos fijos con los nombres de `messages.health.direct.names` y después `healthServices`) y `checkDirectTargets(targets, { signal })` con `probe` en paralelo y la validación de `healthV1`.
- [X] T137 [US6] Ampliar la cadena (hace pasar T131): `directCheckQuery(targets, scope)` en `src/features/health/hooks/healthQueries.ts` (`retry: false`, `gcTime: Infinity`) y, en `runFallbackChain` de `src/features/health/hooks/fallbackChain.ts`, el paso de la comprobación directa cuando falla el estado público.
- [X] T138 [P] [US6] Crear `src/features/health/components/DirectCheckSection.tsx` y `toDirectCheckView` en `src/features/health/hooks/useDirectCheckSection.ts` (hacen pasar T132), con `StatusBadge` (`operational` → Operativo, `success`, `status-up`; `degraded` → Degradado, `warning`, `status-degraded`; `unreachable` → No responde, `danger`, `status-unreachable`) y `SectionAnnouncer`.
- [X] T139 [US6] Pintar `DirectCheckSection` a continuación de `PlatformStatusSection` en `src/features/health/components/FallbackSections.tsx`, que lo lleva a las dos pantallas (hace pasar T133).
- [X] T140 [US6] Crear `scripts/check-health-cors.mjs`, sin dependencias, y el script `"check:health-cors": "node scripts/check-health-cors.mjs"` en `package.json` (research D19, SC-024): recibe `--origin <origen>`, `--status <base de maily-system-api>` y las bases; pide `/health/live` y `/health/ready` de cada base y `/health/status` de la indicada con la cabecera `Origin` (con `node:https`/`node:http` si `fetch` de Node no permite fijarla); falla si una respuesta no es 2xx o 503 del contrato, o si no trae `Access-Control-Allow-Origin` con ese origen; imprime una línea por ruta.
- [X] T141 [US6] Verificar la historia: `npm run typecheck`, `npm run lint` y `npm run test`; a mano, quickstart V11 a V13 y la verificación de la sección 4. (2026-10-25: tipos, lint y pruebas en verde; la parte a mano necesita los servicios desplegados y queda con T158.)

**Checkpoint**: aunque maily-system-api no responda, las dos pantallas dicen qué servicios responden desde el navegador.

---

## Phase 8: User Story 4 - Ver la versión del propio Backoffice (Priority: P3)

**Goal**: «Salud de servicios» muestra un bloque «Backoffice» con la versión, el commit corto y la fecha de build fijados al compilar, «No disponible» si falta alguno, sin depender del agregador y sin impedir nunca compilar ni arrancar.

**Independent Test**: Compilar con la versión, el commit y la fecha inyectados y comprobar el bloque; compilar sin commit ni fecha y comprobar «No disponible» y que el Backoffice arranca; comprobar que el bloque se ve en la carga y con el agregador fallando, y no en el estado sin permiso.

### Tests for User Story 4 ⚠️

- [X] T142 [P] [US4] Crear `src/app/config/buildInfo.test.ts`: `parseBuildInfo({ version: '1.0.0', commit: <40 hexadecimales>, buildDate: '2026-10-24T16:05:00Z' })` da los tres valores; versiones `'1.0'` o `'v1'`, commits de 6 o de 65 caracteres o no hexadecimales, y fechas sin zona (`'2026-10-24T16:05:00'`) o `'ayer'` dan `null` en ese dato; cadenas vacías dan `null`; nunca lanza (research D18).
- [X] T143 [P] [US4] Crear `src/features/health/components/BackofficeBuildBlock.test.tsx`: el `h2` «Backoffice» y una lista de descripción con «Versión», «Commit» (los 7 primeros caracteres) y «Fecha de build» (`formatDateTime`); cada `null`, «No disponible»; pasa axe. Ampliar `src/app/providers/AppSettingsProvider.test.tsx`: `backofficeBuild` llega con lo que da `parseBuildInfo`.
- [X] T144 [P] [US4] Ampliar `src/features/health/pages/HealthPage.test.tsx`: el bloque se ve en la carga, con datos y con fallo (de primera carga y de actualización), y no en el estado sin permiso (FR-044).

### Implementation for User Story 4

- [X] T145 [US4] En `vite.config.ts`, `define` con `__APP_VERSION__` (la `version` de `package.json`, leída con `readFileSync` y `JSON.parse`), `__APP_COMMIT_SHA__` y `__APP_BUILD_DATE__` (de `env.APP_COMMIT_SHA` y `env.APP_BUILD_DATE` de `loadEnv`, o `''`), todos con `JSON.stringify`, y un comentario que cite FR-045; en `src/vite-env.d.ts`, `declare const __APP_VERSION__: string`, `__APP_COMMIT_SHA__` y `__APP_BUILD_DATE__`.
- [X] T146 [US4] Implementar `parseBuildInfo` en `src/app/config/buildInfo.ts` (hace pasar T142), con Zod y sin lanzar nunca; `export interface BackofficeBuild` en `src/features/health/index.ts` (`{ version: string | null; commit: string | null; buildDate: string | null }`); en `src/app/providers/AppSettingsProvider.tsx`, `backofficeBuild: parseBuildInfo({ version: __APP_VERSION__, commit: __APP_COMMIT_SHA__, buildDate: __APP_BUILD_DATE__ })`, calculado una vez.
- [X] T147 [US4] Añadir a `src/shared/messages/es.ts` `health.backoffice`: `{ title: 'Backoffice', version: 'Versión', commit: 'Commit', buildDate: 'Fecha de build' }`, y crear `src/features/health/components/BackofficeBuildBlock.tsx` (hace pasar T143).
- [X] T148 [US4] En `src/app/router/health/HealthRoute.tsx`, pasar `backofficeBuild` de `useAppSettings()` a la página; en `src/features/health/pages/HealthPage.tsx`, pintar el bloque al final en todos los estados salvo `forbidden` (hace pasar T144).
- [X] T149 [US4] Verificar la historia: `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` con y sin `APP_COMMIT_SHA` y `APP_BUILD_DATE` (quickstart V9). (2026-10-25: en verde. Sin las variables, el build lleva la versión 1.0.0 con el commit y la fecha vacíos, que se ven «No disponible»; con ellas lleva el commit y la fecha ISO 8601 en UTC, y la entrada pesa 306,7 KB de 320.)

**Checkpoint**: todas las historias funcionan por separado y juntas.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Guardas del paquete y su medición, documentación, E2E, precisiones de la spec y la validación completa.

- [X] T150 Ampliar `scripts/check-entry-size.mjs` (research D20), con la cabecera de guardas actualizada: falla si el JS de la ruta de entrada contiene `'/api/v1/monitored-components'` o `'/health/status'` (literales que solo existen en la capa `api` de `health`, siempre diferida), y si ningún fragmento diferido los contiene (la guarda quedó obsoleta), como las guardas del Data Grid y de Token.
- [X] T151 Medir con `npm run build` y `npm run size` (2026-10-25: 306,6 KB de 320, la 016 suma 6,9 KB y sus fragmentos diferidos 18,3 KB): el total dentro del presupuesto que fijó T001 y las guardas en verde. Anotar en «Notas de implementación» de `specs/016-health-dashboard/plan.md` el total, lo que sumó la 016 a la entrada y el tamaño de los fragmentos de `health` (página, registro y sección de la pantalla de fallo).
- [X] T152 [P] Actualizar `README.md`: «Estado» y «Qué hace hoy» (la página, el registro, el estado público y la comprobación directa, con sus permisos `health:*`); la tabla de variables (`VITE_HEALTH_REFRESH_SECONDS`, `VITE_HEALTH_DIRECT_SERVICES`, `APP_COMMIT_SHA`, `APP_BUILD_DATE` y `PATIENTS_API_PROXY_TARGET`); «Despliegue» (cada origen de `VITE_HEALTH_DIRECT_SERVICES` en `connect-src`, el CORS de cada servicio en sus rutas de salud, `npm run check:health-cors`, el *fallback* de la SPA en `/health` y `/health/components…`, y cómo inyectar el commit y la fecha al compilar); «Estructura» (`health/`); «Pruebas» (los simuladores nuevos y `e2e/health.spec.ts`); «Línea base de tamaño» con la medición de T151; y el enlace a la spec, el plan, las tareas y la guía de la 016 en «Documentación del proyecto».
- [X] T153 [P] Actualizar `.env.example` con el bloque de [contracts/environment.md](contracts/environment.md#envexample).
- [X] T154 [P] Añadir las filas de `VITE_HEALTH_REFRESH_SECONDS` y `VITE_HEALTH_DIRECT_SERVICES` a `specs/001-auth-session-profile/contracts/environment.md`, con un enlace a [contracts/environment.md](contracts/environment.md), y una nota en `specs/001-auth-session-profile/contracts/app-routes.md` y en `specs/006-system-role-access/spec.md` sobre las secciones que la 016 añade a «No se pudo comprobar el acceso», sin cambiar sus reglas.
- [X] T155 [P] Añadir a `docs/DESIGN.md` la tabla de estados de salud (texto, tono de `Badge` e icono) de research D12, como referencia del sistema de diseño.
- [X] T156 [P] Pasar a `specs/016-health-dashboard/spec.md` las precisiones del diseño que quedan (como hizo la 007): el reloj de 24 h en la línea de regreso (D13), que «Actualizar» no se deshabilita (D12) y que un «sin permiso» guardado de una visita anterior muestra la carga mientras se vuelve a consultar (data-model §10). Las de FR-014 y de la cadena interrumpida ya están en la spec.
- [X] T157 [P] Crear `e2e/health.spec.ts` (research D22; escrita, sin ejecutar en este entorno, que no tiene las cuentas ni los servicios desplegados): se omite sin `E2E_AUTH0_USER_A1` ni `E2E_AUTH0_PASSWORD_A1` y sin system-api 005 y usuarios 016 desplegados; recorre el inicio de sesión, «Salud de servicios» con los integrados, el CRUD del registro (crear «QA 016 <marca de tiempo>» como microservicio, verlo en el detalle, editar su nombre, deshabilitarlo y comprobar «Deshabilitado» en el listado, y eliminarlo, como pide la constitución VII) y, con `page.clock`, una actualización automática contada con `page.route('**/api/v1/health', …)`; y añadir a `e2e/responsive.spec.ts` la página y el listado a 1024 y a 320 px sin desplazamiento horizontal.
- [ ] T158 Ejecutar la validación de `specs/016-health-dashboard/quickstart.md` (V1 a V16, con la medición de SC-001 de V3, y la verificación de CORS y CSP de la sección 4) en los ambientes disponibles, y anotar en el README el resultado de la verificación de CORS por ambiente (SC-024). Organizar, con datos simulados, la revisión con al menos 3 personas que operan el Backoffice (SC-009 y SC-017) y anotar su resultado en «Notas de implementación» de `specs/016-health-dashboard/plan.md`.
- [X] T159 Verificación final, como el CI: `npm run typecheck`, `npm run lint`, `npm run format:check` (o `npm run format`), `npm run test:coverage` (80 % en las capas lógicas), `npm run build`, `npm run size` y `npm audit --omit=dev --audit-level=high`. (2026-10-25: todo en verde. 4167 pruebas en 374 archivos, con una cobertura de 98,75 % de sentencias, 96,17 % de ramas, 98,95 % de funciones y 98,81 % de líneas; la entrada pesa 306,6 KB de 320 y la auditoría da 0 vulnerabilidades. En una primera corrida falló por carga `RoleDetailPanel.test.tsx`, de Roles y fuera de la 016, que pasa sola y en la corrida siguiente. Se quitaron dos avisos de las pruebas de la 016: claves repetidas en `StatusBadge.test.tsx` y rutas de salud sin simular en `fallbackChain.test.ts`.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: **T001 bloquea todo**: sin la decisión del presupuesto no empieza ninguna tarea de código. T002 va después de T001; T003 a T005 pueden ir en paralelo tras T001.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de la US1 (amplía su ciclo y su página).
- **US3 (Phase 5)**: depende de Foundational y, para el enlace de la página (T096) y su prueba de integración de punta a punta, de la US1. Puede avanzar en paralelo con la US2.
- **US5 (Phase 6)**: depende de la US2 (la cadena va dentro del ciclo) para la parte de «Salud de servicios»; la parte de la pantalla de fallo (T104, T106 a T108, T114, T117 a T119) solo necesita Foundational y la US1 (`StatusBadge`, `formatReturnLine` y `useNow`).
- **US6 (Phase 7)**: depende de la US5 (es el paso siguiente de su cadena, en las dos pantallas).
- **US4 (Phase 8)**: depende de la US1 (el bloque va en su página). Puede hacerse en cualquier momento después de ella.
- **Polish (Phase 9)**: depende de todas las historias (las guardas de T150 necesitan los literales de las US3 y US5).

### User Story Dependencies

- **US1 (P1)**: tras Foundational; no depende de otras historias.
- **US2 (P1)**: tras la US1.
- **US3 (P2)**: tras Foundational; integra con la US1 solo por el enlace y por la aparición del componente en la página.
- **US5 (P2)**: tras la US2 en «Salud de servicios»; tras la US1 en la pantalla de fallo.
- **US6 (P2)**: tras la US5.
- **US4 (P3)**: tras la US1.

### Within Each User Story

- Los textos de la historia primero (las pruebas los nombran); después las pruebas, que DEBEN fallar; después la implementación.
- Esquemas y reglas puras → capa `api` → hooks → componentes → páginas → rutas de `app`.
- Cada historia termina con su verificación antes de pasar a la siguiente prioridad.
- Los archivos compartidos entre tareas (`es.ts`, `useHealthCycle.ts`, `HealthPage.tsx`, `routes.tsx`, `index.ts` de `health`) se editan en serie: esas tareas no llevan [P].

### Parallel Opportunities

- **Setup**: T003, T004 y T005, tras T001.
- **Foundational**: las pruebas T007, T009, T011, T014, T016, T018, T021, T023, T025, T027 y T028 en paralelo; luego sus implementaciones, cada una tras su prueba; T030 y T031 en paralelo.
- **Cada historia**: todas sus pruebas marcadas [P] a la vez; las implementaciones [P] (por ejemplo, T045, T046 y T050 a T052 en la US1) en paralelo tras sus pruebas.
- **Entre historias**: con más de una persona, la US3 y la US4 pueden avanzar en paralelo con la US2, y la parte de la pantalla de fallo de la US5, también.

---

## Parallel Example: User Story 1

```text
# Las pruebas de la US1, a la vez (tras T035):
Task: "T036 returnLine.test.ts en src/features/health/policy/"
Task: "T037 useNow.test.tsx en src/features/health/hooks/"
Task: "T038 healthApi.test.ts en src/features/health/api/"
Task: "T039 useHealthCycle.test.tsx en src/features/health/hooks/"
Task: "T040 OverallStatus.test.tsx, T041 ComponentCard.test.tsx y T042 HealthNotices.test.tsx en src/features/health/components/"
Task: "T043 HealthPage.test.tsx en src/features/health/pages/"
Task: "T044 health.integration.test.tsx en src/app/router/health/"

# Después, las piezas independientes:
Task: "T045 formatReturnLine en src/features/health/policy/returnLine.ts"
Task: "T046 useNow en src/features/health/hooks/useNow.ts"
Task: "T050 OverallStatus.tsx, T051 ComponentCard.tsx y ComponentDetails.tsx, T052 HealthNotices.tsx"
```

## Parallel Example: User Story 3

```text
# Las pruebas puras y de API, a la vez (tras T072):
Task: "T073 monitoredComponent.test.ts, T074 componentForm.test.ts y T075 componentsLocation.test.ts y componentId.test.ts en src/features/health/schemas/"
Task: "T076 monitoredComponentErrors.test.ts en src/features/health/api/"

# Tras el simulador (T077):
Task: "T078 registry.test.ts en src/test/handlers/healthMonitoring/"
Task: "T079 monitoredComponentsApi.test.ts en src/features/health/api/"
Task: "T080 useMonitoredComponents.test.tsx en src/features/health/hooks/"
Task: "T081 a T083: grid, formulario y páginas"
Task: "T084 registry.integration.test.tsx en src/app/router/health/"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Fase 1, empezando por la puerta del presupuesto (T001).
2. Fase 2: Foundational (CRÍTICA, bloquea todo).
3. Fase 3: la US1.
4. **Detenerse y validar**: la US1 por sí sola (quickstart V1, V3 a V5).
5. Con la US2 se completa lo que la spec marca como P1: es el mínimo recomendado para integrar.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → página con la salud de todo (MVP).
3. US2 → la página se mantiene al día (P1 completo).
4. US3 → el registro se administra desde el Backoffice; sin ella solo se ven los integrados, porque el registro empieza vacío.
5. US5 → el estado público en la pantalla de fallo y en la página.
6. US6 → la comprobación directa (necesita el CORS de cada servicio en los ambientes reales).
7. US4 → la versión del Backoffice.
8. Polish → guardas, documentación, E2E y validación.

Cada historia se puede probar sola con los simuladores y no rompe las anteriores.

### Notes

- [P] = archivos distintos y sin dependencias de tareas incompletas.
- [Story] relaciona cada tarea con su historia.
- Verificar que las pruebas fallan antes de implementar.
- Commits en inglés con Conventional Commits, por tarea o por grupo lógico, solo cuando la persona lo pida; la enmienda 1.6.0 va en su propio commit, antes del primero de código (T002).
- Detenerse en cada checkpoint para validar la historia.
- Evitar tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia.
