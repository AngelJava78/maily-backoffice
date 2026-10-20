# Tasks: Panel de Maily (Resumen de Solo Lectura)

**Input**: Design documents from `/specs/007-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md y `.specify/memory/constitution.md` (v1.3.0)

**Tests**: Incluidas. La plantilla las marca como opcionales, pero la constitución (VII) exige pruebas automatizadas en el mismo PR y pruebas primero en la lógica pura, y la spec las pide expresamente: con y sin permiso, campos `null`, lista vacía, fallos con y sin datos previos, 403, entrar y volver al Panel, pestaña oculta, reinicio del intervalo y una prueba E2E. Dentro de cada fase, las pruebas se escriben ANTES de la implementación y DEBEN fallar al principio.

Se usan Vitest, React Testing Library, user-event y MSW. El servicio del Panel se simula a nivel de red con el simulador de `src/test/handlers/platformDashboard/` (T020), que toma los permisos del simulador de usuarios (`createUsersDirectoryMock`); nunca se simula `fetch` ni el cliente HTTP. Auth0 se simula con el doble centralizado, y las pruebas de integración usan `renderApp` (la aplicación completa).

**Organization**: Tareas agrupadas por historia de usuario para poder implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1 a US5); solo en las fases de historias
- Cada descripción incluye las rutas exactas de los archivos

## Path Conventions

- **Proyecto único** en la raíz del repositorio (plan.md): `src/`, `e2e/`.
- **Idiomas**: código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español. Los textos de interfaz viven solo en `src/shared/messages/es.ts`.
- **Importaciones**: alias `@/` → `src/`, y dependencias `app → features → shared`; una feature solo importa a otra por su `index.ts`.
  - **`src/features/dashboard` NO importa `@/features/auth`** (research D1; regla de ESLint de T004).
  - `src/features/home` sí la importa, como hoy, y usa `dashboard` por su `index.ts`.
- **Reglas de ESLint**:
  - sin aserciones `as` (salvo `as const`), sin `any` y sin `console.*`;
  - componentes `.tsx` de 250 líneas como máximo;
  - sin `Date.now()` en el render (`react-hooks/purity`, constitución I).
- **Claves y rutas**: las claves de TanStack Query salen de `dashboardKeys`, y la ruta de la API (`/api/v1/dashboard`) se aísla en `src/features/dashboard/api/`.
- **Cobertura**: los archivos nuevos de `api`, `policy`, `schemas`, `hooks` y `shared/lib` cuentan para el umbral de 80 % de líneas (`vite.config.ts`).
- **Reloj simulado** (patrón de `src/features/auth/hooks/useOperatorAccess.recheck.test.tsx`):
  - crear los simuladores, luego `vi.useFakeTimers()` y después renderizar;
  - avanzar con `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`;
  - en `afterEach`: `vi.useRealTimers()`.
- **Visibilidad**: `vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden' | 'visible')` y luego `window.dispatchEvent(new Event('visibilitychange'))`.
  - Hay que enviarlo a **`window`**, o a `document` con `{ bubbles: true }`, porque el `focusManager` de TanStack escucha en `window`.
  - En `afterEach`: `focusManager.setFocused(undefined)`.
  - Para la recomprobación del acceso puede usarse el ayudante `returnToTab()` de `useOperatorAccess.recheck.test.tsx`.
- **Pruebas de integración** en `src/app/router/dashboard/`:
  - `beforeAll` con `configure({ asyncUtilTimeout: 10_000 })`, e importación previa de `@/features/home` y `@/features/users` con un tiempo límite de 90 s, como en `src/app/router/subscriptions/capabilities.integration.test.tsx`;
  - `describe(…, { timeout: 30_000 })`.

## Prerrequisitos manuales (fuera de las tareas)

Estas acciones las hace una persona. Sin ellas no se puede validar de punta a punta (puntos de control y T086), pero las pruebas automatizadas no las necesitan.

- **API**: levantar `C:\maily\code\maily-system-api` en `http://127.0.0.1:8010`, con `USERS_API_BASE_URL` apuntando al servicio de usuarios real ([quickstart.md](quickstart.md), «Requisitos previos»).
- **Permiso**: crear `dashboard:read` en la base del servicio de usuarios y asignarlo a `Administrator` y `Billing` (quickstart, sección 1). **Hoy no existe.**
- **Configuración**: en `.env.local`, `VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions` (obligatoria desde la 003) y, para validar a mano, `VITE_DASHBOARD_REFRESH_MINUTES=1`.
- **E2E** (T083): las variables `E2E_AUTH0_*` de la 001, con la cuenta A1 cuyo role tenga `dashboard:read`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: La variable `VITE_DASHBOARD_REFRESH_MINUTES` validada al arrancar y disponible en los arneses, y el límite de importaciones de la feature nueva (research D1, D11). No se instala ninguna dependencia (D16).

- [X] T001 Ampliar `src/app/config/env.test.ts`, que debe fallar primero (contracts/environment.md).
  - **Ausente o vacía**: con `validSource` sin la variable, el resultado es `{ ok: true, env: { ...validSource, VITE_CLINICS_API_URL: undefined, VITE_DASHBOARD_REFRESH_MINUTES: 5 } }`, y hay que ajustar la expectativa actual de «accepts the minimal configuration». Con `VITE_DASHBOARD_REFRESH_MINUTES: ''` también da 5.
  - **Válidos**: `'1'` → 1, `'5'` → 5, `'05'` → 5, `'30'` → 30 y `'60'` → 60, como **número**.
  - **Inválidos**: `'0'`, `'61'`, `'999'`, `'2.5'`, `'5.0'`, `'1e1'`, `'cinco'`, `'+5'`, `'-5'`, `' 5'`, `'5 '` y `'   '` dan exactamente `VITE_DASHBOARD_REFRESH_MINUTES: ${messages.config.rules.refreshMinutes}`, y el mensaje nunca contiene el valor recibido.
  - La regla es «Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.»
- [X] T002 Implementar, tras T001, que debe pasar sin romper otras pruebas.
  - En `src/shared/messages/es.ts`, `config.rules.refreshMinutes: 'Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.'`.
  - En `src/app/config/env.ts`, `VITE_DASHBOARD_REFRESH_MINUTES`:
    - pasa por `emptyToUndefined`;
    - luego exige un texto que cumpla `/^\d+$/`, con el error `rules.refreshMinutes`;
    - se convierte a número con `Number`;
    - exige un entero de 1 a 60, con el mismo error;
    - es opcional y vale 5 cuando falta.
    - En `AppEnv` queda como `number`.
  - En `src/vite-env.d.ts`, `readonly VITE_DASHBOARD_REFRESH_MINUTES: string | undefined`.
- [X] T003 [P] Dar el valor a los arneses que construyen un `AppEnv`, tras T002.
  - En `src/test/renderApp.tsx`, `VITE_DASHBOARD_REFRESH_MINUTES: 5` en su `env`, y la opción nueva `env?: Partial<AppEnv>`, que se mezcla sobre ese `env` (la usa T077).
  - En el `env` de `src/app/providers/HttpClientsProvider.test.tsx`, `VITE_DASHBOARD_REFRESH_MINUTES: 5`.
- [X] T004 [P] En `eslint.config.js`, añadir `forbidAuthImports('dashboard', 'research D1 of 007')` junto a los de `users` y `subscriptions`, para que `src/features/dashboard/**` (salvo pruebas) no pueda importar `features/auth`.
- [X] T005 Verificar que nada se rompió con los cambios de `src/app/config/env.ts`, `src/vite-env.d.ts`, `src/test/renderApp.tsx` y `eslint.config.js` (T001 a T004): `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run test`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lo que todas las historias necesitan: los formatos y las piezas comunes, las políticas de permisos, los textos, el esquema y la capa `api` del servicio, el simulador y las fábricas, y la configuración en `app`.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta terminar esta fase

### Piezas comunes (research D9, D10)

- [X] T006 [P] Crear `src/shared/lib/formatCount.test.ts`, que debe fallar primero:
  - `formatCount(0)` → `'0'`, `formatCount(52)` → `'52'`, `formatCount(1284)` → `'1,284'`, `formatCount(12840)` → `'12,840'` y `formatCount(1234567)` → `'1,234,567'`;
  - nunca escribe decimales.
- [X] T007 Implementar `src/shared/lib/formatCount.ts` (tras T006): un `Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })` creado una sola vez, como `MXN` en `formatCurrency.ts`, y un comentario que cite la aclaración de la spec sobre el formato de México.
- [X] T008 [P] Ampliar `src/shared/lib/formatDateTime.test.ts`, que debe fallar primero:
  - `formatDateTime('2026-10-20T10:07:32Z', { seconds: true, timeZone: 'UTC' })` contiene `'20'`, `'oct'`, `'2026'` y `'10:07:32'`;
  - sin `seconds`, el mismo valor contiene `'10:07'` y no `':32'`;
  - el texto que no es una fecha sigue devolviéndose tal cual.
- [X] T009 Implementar en `src/shared/lib/formatDateTime.ts` (tras T008) la opción `seconds?: boolean`: `timeStyle: 'medium'` cuando es verdadera y `'short'` si no. Sin cambiar el resultado de las llamadas actuales.
- [X] T010 [P] Ampliar `src/shared/ui/RefreshFailedAlert.test.tsx`, que debe fallar primero: sin `onRetry`, el aviso sigue siendo `role="alert"` con su mensaje y **no** hay ningún `button`, y pasa axe.
- [X] T011 Hacer opcional `onRetry` en `src/shared/ui/RefreshFailedAlert.tsx` (tras T010): sin él no se pinta la acción. Los usos actuales en `users` y `subscriptions` no cambian.

### Permisos (research D2, D17)

- [X] T012 [P] Ampliar `src/features/auth/policy/permissions.test.ts`, que debe fallar primero.
  - `can(access, { resource: 'dashboard', action: 'read' })` es `true` si y solo si el conjunto tiene `dashboard:read`.
  - `SECTION_RESOURCES` sigue siendo `['users', 'subscriptions', 'tenants', 'token']`, sin `dashboard`.
  - `PERMISSION_RESOURCES` incluye `dashboard`.
  - `hasAnythingToSee(access)`:
    - es `false` sin permisos y con solo `users:write` y `roles:read`;
    - es `true` con cada uno de `users:read`, `subscriptions:read`, `tenants:read`, `token:read` y `dashboard:read` por separado.
  - Sustituir las pruebas de `hasAnySectionPermission`.
- [X] T013 Implementar (tras T012) en `src/features/auth/policy/permissions.ts`.
  - `PERMISSION_RESOURCES = [...SECTION_RESOURCES, 'roles', 'dashboard'] as const`, con un comentario: el Panel no es una sección y está siempre en la navegación.
  - `hasAnythingToSee`: alguna sección o herramienta legible, o `dashboard:read`. Sustituye a `hasAnySectionPermission`, con un comentario que cite FR-012 de la 007.
  - En `src/features/auth/index.ts`, exportar `hasAnythingToSee` en lugar de `hasAnySectionPermission`.
  - En `src/features/home/HomePage.tsx`, cambiar la llamada y mantener el comportamiento actual.
- [X] T014 [P] Ampliar `src/features/auth/policy/evaluateAccess.test.ts` (FR-013; debe pasar sin cambiar el código):
  - un `dashboard:read` que solo tiene un role que no da acceso (por ejemplo `Owner`) **no** aparece en `access.permissions`;
  - el mismo permiso en `Administrator` sí aparece.

### Textos (data-model, «Textos nuevos o cambiados»)

- [X] T015 Añadir a `src/shared/messages/es.ts`. El cambio de `nav.home` y `titles.home` a «Panel» es de la US1 (T042).
  - `home.title: 'Panel'`.
  - El grupo `dashboard`:
    - `indicatorsTitle: 'Indicadores de la plataforma'`;
    - `indicators`: `{ totalClinics: 'Clínicas totales', activeClinics: 'Clínicas activas', trialClinics: 'Clínicas en periodo de prueba', totalDoctors: 'Doctores', totalPatients: 'Pacientes', totalUsers: 'Usuarios' }`;
    - `notAvailable: 'No disponible'`;
    - `recentClinics`: `{ title: 'Clínicas recientes', columns: { name: 'Nombre', status: 'Estatus', createdAt: 'Fecha de alta' }, empty: 'Sin clínicas registradas' }`;
    - `lastUpdated: (when: string) => \`Actualizado: ${when}\``;
    - `updating: 'Actualizando…'`;
    - `loadError`: `{ title: 'No se pudieron cargar los indicadores', message: 'Ocurrió un problema al consultar la plataforma. Se volverá a intentar automáticamente.' }`;
    - `refreshFailed: 'No se pudieron actualizar los indicadores. Se muestran los de la última actualización y se volverá a intentar automáticamente.'`;
    - `noPermission`: `{ title: 'Sin acceso a los indicadores', message: 'No tienes permiso para ver los indicadores de la plataforma.' }`.

### Esquema, simulador y capa `api` (research D3, D4, D13; contracts/dashboard-service.md)

- [X] T016 [P] Crear `src/features/dashboard/schemas/dashboardSummary.test.ts`, que debe fallar primero (data-model, «DTO del servicio → modelo de dominio»).
  - **Resultado del parseo**: la respuesta de la fase 1 da el modelo en camelCase:
    - `totalClinics`, `activeClinics`, `trialClinics`, `totalDoctors`, `totalPatients` y `totalUsers`;
    - `recentClinics: [{ id, name, createdAt, status: { id, name } }]`, en el mismo orden.
  - **`null` y 0**: `null` en cada conteo se conserva como `null`, y `0` como `0`.
  - **La lista**: `recent_clinics: []` da `[]`, `recent_clinics: null` da `null` y no cambia de orden.
  - **Rechazos**:
    - cada conteo debe ser «entero ≥ 0 o `null`; obligatorio», así que fallan `-1`, `2.5`, `'12'` y la clave ausente;
    - `recent_clinics` debe ser un «arreglo de 0 a 10 `RecentClinic` o `null`; obligatorio», así que fallan 11 clínicas y la clave ausente;
    - en cada clínica, `id` y `name` deben ser «texto no vacío» (fallan `''` y la clave ausente);
    - `created_at` se valida con `z.iso.datetime({ offset: true })`, que acepta `2026-10-15T16:20:00Z`, `2026-10-15T16:20:00.123Z` y `2026-10-15T10:20:00-06:00` y rechaza `'2026-10-15'` y `'ayer'`;
    - `status.id` debe ser entero y `status.name`, texto no vacío.
- [X] T017 Implementar `src/features/dashboard/schemas/dashboardSummary.ts` (tras T016).
  - `dashboardSummarySchema` con `.transform` al modelo de dominio, y `recentClinicSchema`.
  - Exportar los tipos `DashboardSummary = z.output<typeof dashboardSummarySchema>`, `RecentClinic` y `DashboardDto = z.input<typeof dashboardSummarySchema>`.
  - Un comentario: `null` es «no disponible» y nunca se convierte en 0; no se validan los invariantes del servicio (research D4).
- [X] T018 [P] Añadir a `src/test/factories.ts` (tras T017), como las demás fábricas, con las sobrescrituras al final:
  - `recentClinicDto(overrides)`: Clínica Santa Aurora, `2026-10-15T16:20:00Z`, `status: { id: 2, name: 'En prueba' }` e `id` `5457da22-336d-49d8-8876-4d7edb5586ae`;
  - `dashboardDto(overrides)`: los datos de la fase 1 de [contracts/dashboard-service.md](contracts/dashboard-service.md#d1--consultar-el-resumen), con 12, 8, 3, 37, 1284, 52 y las cinco clínicas en su orden.
- [X] T019 Crear `src/test/handlers/platformDashboard/seed.ts` (tras T018) con `phaseOneDashboard(): DashboardDto`, los mismos datos de la fase 1, con un comentario que cite `src/integrations/dummy_dashboard_source.py` del servicio.
- [X] T020 Crear `src/test/handlers/platformDashboard/index.ts` (tras T019), siguiendo `src/test/handlers/subscriptionsCatalog/index.ts`. Exporta `createPlatformDashboardMock({ directory, initial = phaseOneDashboard() })`.
  - **El manejador**: registra con `server.use` `http.get(\`${SUBSCRIPTIONS_API_BASE_URL}/api/v1/dashboard\`, …)`, que en orden:
    1. registra la petición con `createRequestLog(SUBSCRIPTIONS_API_BASE_URL)`;
    2. autentica con `createAuthorization` de `../subscriptionsCatalog/authorize` (401 sin token o con uno inválido);
    3. aplica las fallas inyectadas, con `createFailureControls({ defaultCodes: new Map([[500, 'internal_error'], [503, 'authorization_unavailable']]) })`;
    4. comprueba `dashboard:read`, con `requirePermission`, cuando se pasó `directory`; sin `directory`, todo token `Bearer test-token:*` pasa, para las pruebas de hooks y componentes;
    5. responde 200 con el estado actual y `Cache-Control: no-store`.

    Un `CatalogError` se convierte con `toErrorResponse` de `../subscriptionsCatalog/handle`.
  - **Lo que devuelve**:
    - `requests`, `requestCount` y `requestsTo(method, path)`;
    - las fallas: `failNext`, `failAll`, `hang`, `defer` y `recover`; `recover` también quita `authorizationUnavailable`;
    - `authorizationUnavailable()`;
    - para cambiar los datos: `setSummary(overrides: Partial<DashboardDto>)`, `setUnavailable(...fields: (keyof DashboardDto)[])`, que los pone a `null`, y `setRecentClinics(list)`.
- [X] T021 [P] Crear `src/test/handlers/platformDashboard/index.test.ts` (tras T020), con `callSubscriptions` de `src/test/subscriptionsClient.ts`:
  - responde 200 con `Cache-Control: no-store` y el cuerpo de la fase 1;
  - con `directory` y sin `dashboard:read`, da 403 `permission_denied`; tras `directory.grant('Administrator', 'dashboard:read')`, 200;
  - con `authorizationUnavailable()`, 503;
  - `setUnavailable('total_doctors')` da `null` solo en ese campo;
  - `requestsTo('GET', '/api/v1/dashboard')` cuenta.
- [X] T022 [P] Crear `src/features/dashboard/api/dashboardApi.test.ts` (tras T020), que debe fallar primero. Toma como plantilla `src/features/subscriptions/api/subscriptionsApi.read.test.ts` y usa `createSubscriptionsClient()`.
  - **La petición**: `getDashboard(client)` pide `GET /api/v1/dashboard` con `search` vacío (sin `limit`, FR-006) y con `Authorization: Bearer test-token:auth0|admin`.
  - **La respuesta**: devuelve el modelo de dominio.
  - **Errores**:
    - una respuesta fuera de contrato (`server.use` con `recent_clinics` ausente) es un `ApiError` de tipo `contract`;
    - un 403 llega como `ApiError` con `status` 403 y `code` `permission_denied`, sin convertirlo;
    - con una señal abortada, la petición queda `aborted`.
- [X] T023 Implementar `src/features/dashboard/api/dashboardApi.ts` (tras T022), con `export const DASHBOARD_PATH = '/api/v1/dashboard'` y `getDashboard(client: HttpClient, { signal }: { signal?: AbortSignal } = {}): Promise<DashboardSummary>`, con `client.get(DASHBOARD_PATH, { schema: dashboardSummarySchema, signal })`. Un comentario: es el servicio `maily-system-api`, el de suscripciones, y no se envía `limit`.
- [X] T024 [P] Crear `src/features/dashboard/hooks/dashboardKeys.ts` con `dashboardKeys = { all: ['dashboard'] as const, summary: () => [...dashboardKeys.all, 'summary'] as const }`, y `src/features/dashboard/index.ts` (vacío por ahora, con un comentario de lo que expondrá).
- [X] T025 [P] Documentar en `src/shared/api/httpClientsContext.tsx`, con un comentario, que `subscriptions` es el cliente de `maily-system-api` y que lo usan las suscripciones y el Panel (research D3).

### Configuración en `app` (research D11)

- [X] T026 [P] Crear `src/app/providers/AppSettingsProvider.test.tsx`, que debe fallar primero:
  - con `env` de `VITE_DASHBOARD_REFRESH_MINUTES: 5`, `useAppSettings()` da `{ dashboardRefreshMs: 300_000 }`, y con 1, `60_000`;
  - fuera del proveedor, `useAppSettings()` lanza un error claro.
- [X] T027 Implementar `src/app/providers/AppSettingsProvider.tsx` (tras T026):
  - `AppSettingsProvider({ env, children })`, con un valor calculado una sola vez, y `useAppSettings(): AppSettings`;
  - un comentario: es configuración de compilación, el único dato transversal que una ruta necesita de `AppEnv` (constitución III).
  - En `src/app/providers/AppRuntime.tsx`, envolver el árbol con `AppSettingsProvider`.
- [X] T028 Verificar la fase sobre `src/shared`, `src/features/auth/policy`, `src/features/dashboard`, `src/test/handlers/platformDashboard` y `src/app/providers`: `npm run typecheck`, `npm run lint` y `npm run test`. Todas las pruebas nuevas pasan y ninguna anterior se rompió.

**Checkpoint**: base lista. Ya existen el esquema, la API, el simulador, los formatos, las políticas y la configuración en `app`.

---

## Phase 3: User Story 1 - Ver el resumen de la plataforma en el Panel (Priority: P1) 🎯 MVP

**Goal**: La página raíz se llama «Panel» en la navegación, el `h1` y la pestaña. Quien tiene `dashboard:read` ve, debajo del saludo, los seis indicadores con el formato de México («No disponible» para `null`, 0 para 0), las clínicas recientes (nombre, estatus y fecha de alta locales, o «Sin clínicas registradas») y la fecha y hora de la última actualización, sin acciones.

**Independent Test**: Con el simulador del Panel y `dashboard:read` concedido, abrir `/` y comprobar la navegación, el título, el `h1` «Panel», el saludo, los valores 12, 8, 3, 37, 1,284 y 52, las cinco clínicas en orden, «Actualizado: …» con segundos y una sola petición sin `limit`. Repetir con valores `null`, ceros y una lista vacía.

### Tests for User Story 1 ⚠️

> Escribirlas primero y comprobar que FALLAN antes de implementar

- [X] T029 [P] [US1] Crear `src/features/dashboard/components/DashboardIndicators.test.tsx`:
  - pinta una lista de descripción con los seis indicadores en el orden de FR-004 y las etiquetas de `messages.dashboard.indicators`;
  - el `dd` de cada `dt` lleva `formatCount` (`'1,284'`), `0` muestra `'0'` y `null` muestra `messages.dashboard.notAvailable`, sin afectar a los demás;
  - un `null` nunca se pinta como `'0'`;
  - pasa axe.
- [X] T030 [P] [US1] Crear `src/features/dashboard/components/RecentClinicsTable.test.tsx`:
  - la tabla tiene el nombre accesible `messages.dashboard.recentClinics.title` y los encabezados `Nombre`, `Estatus` y `Fecha de alta`;
  - las filas van en el orden recibido, con `name`, `status.name` tal cual y `formatDateTime(createdAt)` (en UTC por `TZ`);
  - no hay `link` ni `button`;
  - `[]` muestra `messages.dashboard.recentClinics.empty` sin tabla, y `null`, `messages.dashboard.notAvailable`, no `empty`;
  - un nombre de 200 caracteres no desborda (`overflowWrap: 'anywhere'`);
  - pasa axe.
- [X] T031 [P] [US1] Crear `src/features/dashboard/components/LastUpdated.test.tsx`: con `updatedAt` = `Date.parse('2026-10-20T10:07:32Z')` muestra `messages.dashboard.lastUpdated(…)` con `'20'`, `'oct'`, `'2026'` y `'10:07:32'`, y el texto no está dentro de una región viva (`role="status"`, `role="alert"` ni `aria-live`).
- [X] T032 [P] [US1] Crear `src/features/dashboard/hooks/useDashboardSummary.test.tsx`, con `createWrapper` de `src/test/renderWithProviders.tsx`, `createQueryClient()` de `src/app/providers/createQueryClient.ts` y `createPlatformDashboardMock()` sin `directory`.
  - **Primera visita**: al montar hace una petición y la vista pasa de `{ status: 'loading' }` a `{ status: 'ready', summary, updatedAt, isUpdating: false, refreshFailed: false }`, con `updatedAt` > 0 y `summary` en camelCase.
  - **Remontar** antes de 30 s hace otra petición (`refetchOnMount: 'always'`, FR-018).
  - **Unitarias de `toDashboardView`**: sin datos y sin error da `loading`, y con un resumen da `ready` con `updatedAt` = `dataUpdatedAt`.
- [X] T033 [P] [US1] Crear `src/features/dashboard/components/DashboardSummary.test.tsx`, con `renderWithProviders` y el simulador:
  - mientras carga se ve `PageLoader`, con `role="status"`;
  - después, el `h2` «Indicadores de la plataforma», el `h2` «Clínicas recientes» con su tabla, y «Actualizado: …»;
  - dentro del resumen no hay ningún `button` ni `link` (FR-010);
  - con `setUnavailable('total_doctors', 'recent_clinics')`, el de doctores y la lista dicen «No disponible»;
  - con `setRecentClinics([])`, «Sin clínicas registradas»;
  - axe en carga y con datos.
- [X] T034 [P] [US1] Reescribir `src/features/home/HomePage.test.tsx`.
  - **Encabezado**: `HomePage` recibe `dashboardRefreshMs={300_000}`. El `h1` es `messages.home.title` («Panel») y tiene el foco. El saludo `messages.home.greeting('Ana Pérez')` es un párrafo, no un encabezado.
  - **Con `dashboard:read`**: con `accessWith('dashboard:read', 'users:read')` y el simulador, se ven los indicadores.
  - **Sin `dashboard:read`**: con `accessWith('users:read')` no se monta el resumen. El aviso propio es de la US2.
  - **El aviso actual**: «Sin permisos asignados» con `accessWith()`, ahora con `hasAnythingToSee`.
  - Pasa axe.
- [X] T035 [P] [US1] Crear `src/app/router/dashboard/panel.integration.test.tsx`, con `renderApp({ url: '/', sub: ADMIN_SUB, signedIn: true })`, `createUsersDirectoryMock()` con `directory.grant('Administrator', 'dashboard:read')` y `createPlatformDashboardMock({ directory })`.
  - **Nombre**: la primera entrada de la navegación es `messages.nav.home` («Panel»), `document.title` es `Panel — MailySoft Backoffice`, el `h1` es «Panel» y no hay ningún texto «Inicio» en la página.
  - **Datos**: se ven 12, 8, 3, 37, `1,284` y 52, y cinco filas en el orden de la fase 1.
  - **La petición**: `requestsTo('GET', '/api/v1/dashboard')` tiene una petición con `search` `''`.

### Implementation for User Story 1

- [X] T036 [US1] Crear `src/features/dashboard/hooks/useDashboardSummary.ts` (hace pasar T032).
  - **Tipos**: `DashboardResult = { kind: 'summary'; summary: DashboardSummary } | { kind: 'forbidden' }` y `DashboardView` (data-model, «Estados de la pantalla»), por ahora con `loading` y `ready`.
  - **`toDashboardView(query)`**: función pura y exportada, sobre `Pick<UseQueryResult<DashboardResult>, 'data' | 'isFetching' | 'isError' | 'dataUpdatedAt'>`.
  - **`useDashboardSummary(refreshIntervalMs: number): DashboardView`**, con `useQuery`:
    - `queryKey: dashboardKeys.summary()`;
    - `queryFn: async ({ signal }) => ({ kind: 'summary', summary: await getDashboard(subscriptions, { signal }) })`, con `subscriptions` de `useHttpClients()`;
    - `refetchOnMount: 'always'`, `staleTime: 30_000`, `retry: shouldRetryQuery`, `retryDelay` y `networkMode: 'always'`.
  - **Comentarios**: cada opción con el requisito que cumple (research D5). `refreshIntervalMs` se usa en la US3.
- [X] T037 [P] [US1] Crear `src/features/dashboard/components/DashboardIndicators.tsx` (hace pasar T029): `Box component="dl"` con `Grid` de MUI (tres columnas desde `sm`, una por debajo), `dt` y `dd` por indicador, `formatCount` y `messages.dashboard.notAvailable`.
- [X] T038 [P] [US1] Crear `src/features/dashboard/components/RecentClinicsTable.tsx` (hace pasar T030):
  - `Table` de MUI con `aria-labelledby` que apunta a su `h2`, encabezados de columna, `status.name` y `formatDateTime(createdAt)`;
  - texto «Sin clínicas registradas» o «No disponible» según el caso;
  - `overflowWrap: 'anywhere'` en el nombre, y sin enlaces.
- [X] T039 [P] [US1] Crear `src/features/dashboard/components/LastUpdated.tsx` (hace pasar T031): `Typography` con `messages.dashboard.lastUpdated(formatDateTime(new Date(updatedAt).toISOString(), { seconds: true }))`.
- [X] T040 [US1] Crear `src/features/dashboard/components/DashboardSummary.tsx` (tras T036 a T039; hace pasar T033).
  - Recibe `refreshIntervalMs: number` y pinta la vista de `useDashboardSummary`:
    - `loading`: `PageLoader`;
    - `ready`: un `section` con `h2` `indicatorsTitle` y `DashboardIndicators`, otro `section` con `h2` `recentClinics.title` y `RecentClinicsTable`, y `LastUpdated`.
  - Exportar `DashboardSummary` en `src/features/dashboard/index.ts`.
- [X] T041 [US1] Actualizar `src/features/home/HomePage.tsx` (hace pasar T034).
  - Props `{ dashboardRefreshMs: number }`.
  - El `h1` es `messages.home.title`, con `useFocusOnMount` y `tabIndex={-1}`. El saludo pasa a `Typography component="p"` debajo.
  - `<DashboardSummary refreshIntervalMs={dashboardRefreshMs} />` solo si `can(access, { resource: 'dashboard', action: 'read' })`.
  - El aviso actual se mantiene con `!hasAnythingToSee(access)`.
  - Actualizar el comentario del componente.
- [X] T042 [US1] En `src/shared/messages/es.ts`, cambiar `nav.home` y `titles.home` a `'Panel'`.
- [X] T043 [US1] Crear `src/app/router/HomeRoute.tsx` (tras T041): define el `lazy` de `HomePage` (lo saca de `routes.tsx`), lee `useAppSettings()` y pinta `<HomePage dashboardRefreshMs={dashboardRefreshMs} />`. En `src/app/router/routes.tsx`, la ruta índice pasa a `Component: HomeRoute`, con el mismo `handle: { titleKey: 'home' }` y `ErrorBoundary`. Hace pasar T035.
- [X] T044 [US1] Adaptar las pruebas que buscan el `h1` con el saludo (research D12):
  - en `src/app/authFlow.integration.test.tsx`, `findByRole('heading', { level: 1, name: messages.home.title })`;
  - en `src/app/router/accessFlow.test.tsx`, el `h1` «Panel» más `findByText(messages.home.greeting('Ana Pérez'))` donde importa la persona.
  - Si alguna prueba integrada aterriza en `/` con una persona que tenga `dashboard:read`, debe registrar `createPlatformDashboardMock`.
- [X] T045 [P] [US1] Adaptar los E2E. En `e2e/access.spec.ts` y `e2e/session.spec.ts`, el ayudante `greeting(page)` pasa a buscar `getByRole('heading', { level: 1, name: messages.home.title })`. En `e2e/responsive.spec.ts`, la prueba de la página principal (línea ~56) busca el mismo `h1` y el texto `/^Hola, /`.
- [X] T046 [P] [US1] Documentar el cambio de nombre (FR-036):
  - en `specs/001-auth-session-profile/spec.md`, una nota al final de Assumptions: «Desde la feature 007, la página principal (`/`) se llama «Panel» en la navegación, en su encabezado y en el título de la pestaña»;
  - en `specs/001-auth-session-profile/contracts/app-routes.md`, la fila de `/` pasa a «Panel (antes "Página principal"; feature 007)», con un enlace a `specs/007-dashboard/contracts/app-routes.md`.
- [X] T047 [US1] Verificar la historia: `npx vitest run src/features/dashboard src/features/home src/app/router/dashboard src/app/authFlow.integration.test.tsx src/app/router/accessFlow.test.tsx` y `npm run lint`.

**Checkpoint**: la US1 funciona y se prueba sola. Ya se ve el Panel con datos para quien tiene el permiso (quickstart V1, V2).

---

## Phase 4: User Story 2 - Ver el Panel sin permiso para los indicadores (Priority: P1)

**Goal**: Sin `dashboard:read` se ve el saludo y el aviso «Sin acceso a los indicadores», y no se consulta nada. Sin ningún permiso se ve solo «Sin permisos asignados». Perder el permiso en la recomprobación retira y descarta los datos; obtenerlo los carga sin salir. Un 403 del servicio muestra el aviso, descarta los datos y no dispara el aviso global de 403.

**Independent Test**: Con el simulador de usuarios y el del Panel, entrar sin `dashboard:read` y comprobar el aviso y 0 peticiones. Repetir sin ningún permiso y con solo `dashboard:read`. Retirar y conceder el permiso durante la sesión y forzar un 403 con datos en pantalla, comprobando el aviso, que no aparece la notificación «No tienes permiso para realizar esta acción.» y que la sesión sigue abierta.

### Tests for User Story 2 ⚠️

- [X] T048 [P] [US2] Ampliar `src/features/home/HomePage.test.tsx`, con `createPlatformDashboardMock()` registrado para contar:
  - con `accessWith('users:read')`: el saludo y el aviso con `messages.dashboard.noPermission.title` y `.message`, y `requestCount` 0;
  - con `accessWith()`: solo «Sin permisos asignados» (`messages.home.noPermissionsTitle`), sin `noPermission`, y 0 peticiones;
  - con `accessWith('dashboard:read')`: los indicadores, sin «Sin permisos asignados»;
  - axe con el aviso.
- [X] T049 [P] [US2] Ampliar `src/features/dashboard/hooks/useDashboardSummary.test.tsx`:
  - con `failNext({ status: 403, code: 'permission_denied' })` en la primera petición, la vista es `{ status: 'forbidden' }`;
  - con `createQueryClient({ onForbidden })`, el espía `onForbidden` **no** se llama;
  - tras un resumen correcto, un 403 posterior (provocado por `refetch` del cliente con `queryClient.refetchQueries`) deja `forbidden` y la caché ya no contiene el resumen anterior (`getQueryData(dashboardKeys.summary())` es `{ kind: 'forbidden' }`);
  - remontar vuelve a consultar.
- [X] T050 [P] [US2] Crear `src/features/dashboard/components/DashboardPermissionNotice.test.tsx` (`Alert` informativo con `noPermission.title` y `.message`; axe) y ampliar `src/features/dashboard/components/DashboardSummary.test.tsx`: con un 403 se pinta `DashboardPermissionNotice` y ningún indicador.
- [X] T051 [P] [US2] Crear `src/features/dashboard/hooks/useForgetDashboardSummary.test.tsx`: con un resumen en la caché, `renderHook(() => useForgetDashboardSummary(true))` lo quita (`getQueryData(dashboardKeys.summary())` es `undefined`); con `false` no lo toca.
- [X] T052 [P] [US2] Crear `src/app/router/dashboard/permissions.integration.test.tsx`, con `renderApp`, `createUsersDirectoryMock()` y `createPlatformDashboardMock({ directory })`.
  - **Sin el permiso**: el Administrator sin `dashboard:read` ve «Sin acceso a los indicadores», y `requestsTo('GET', '/api/v1/dashboard')` tiene 0 peticiones (SC-003).
  - **Lo pierde** (FR-014): con reloj simulado, se concede, se ven los datos, `directory.revoke('Administrator', 'dashboard:read')` y se avanzan 5 min (o `returnToTab()`). Desaparecen los indicadores, aparece el aviso y no hay más peticiones en 10 min.
  - **Lo recupera**: tras `grant` y la recomprobación, aparece `PageLoader` (no los datos viejos) y luego los indicadores, sin navegar.
  - **403 del servicio** (FR-015): con datos en pantalla, `platform.failNext({ status: 403, code: 'permission_denied' })` y un ciclo:
    - aparece el aviso del Panel;
    - **no** aparece `messages.forbidden.action`;
    - la ruta sigue en `/` y no se pidió el cierre de sesión.

### Implementation for User Story 2

- [X] T053 [P] [US2] Crear `src/features/dashboard/components/DashboardPermissionNotice.tsx`, un `Alert severity="info"` con `AlertTitle`, y exportarlo en `src/features/dashboard/index.ts` (hace pasar la primera parte de T050).
- [X] T054 [US2] Ampliar `src/features/dashboard/hooks/useDashboardSummary.ts` (hace pasar T049 y el resto de T050).
  - La `queryFn` captura `error instanceof ApiError && error.status === 403` y resuelve `{ kind: 'forbidden' }`; cualquier otro error se relanza.
  - Exportar `isForbiddenResult(data)`.
  - `toDashboardView` da `{ status: 'forbidden' }`.
  - Un comentario cita research D6: así no se dispara el `onForbidden` global y los datos anteriores se descartan.
  - `DashboardSummary.tsx` pinta `DashboardPermissionNotice` en ese estado.
- [X] T055 [US2] Crear `src/features/dashboard/hooks/useForgetDashboardSummary.ts` (hace pasar T051): `useForgetDashboardSummary(forget: boolean): void`, con un `useEffect` que, cuando `forget` es verdadero, llama a `queryClient.removeQueries({ queryKey: dashboardKeys.all })`. Lleva un comentario con research D7: sincroniza la caché con un cambio de permisos. Exportarlo en `src/features/dashboard/index.ts`.
- [X] T056 [US2] Completar `src/features/home/HomePage.tsx` (hace pasar T048 y T052).
  - `canRead = can(access, { resource: 'dashboard', action: 'read' })`.
  - Llamar a `useForgetDashboardSummary(!canRead)`.
  - Pintar según el caso:
    - con `canRead`, `DashboardSummary`;
    - si no, y con `hasAnythingToSee(access)`, `DashboardPermissionNotice`;
    - si no, solo el aviso actual de "sin permisos asignados" (data-model, «Página principal»).
- [X] T057 [US2] Verificar la historia: `npx vitest run src/features/dashboard src/features/home src/app/router/dashboard src/features/auth/policy` y `npm run lint`.

**Checkpoint**: US1 y US2 funcionan y se prueban por separado. El Panel es correcto y seguro para cualquier persona (quickstart V3 a V5, V7, V8, V14).

---

## Phase 5: User Story 3 - Mantener el Panel actualizado sin intervenir (Priority: P2)

**Goal**: Con el Panel abierto y la pestaña visible, una consulta cada intervalo, contado desde que terminó la anterior. Ninguna con la pestaña oculta ni fuera del Panel. Al volver a la pestaña, solo si pasó el intervalo desde la última actualización correcta. Al entrar, siempre, con los datos anteriores y «Actualizando…». Los datos se conservan toda la sesión y se borran al cerrarla. Nunca hay dos consultas en curso, y salir cancela la que está en curso.

**Independent Test**: Con el reloj simulado y un intervalo de 5 min, seguir la línea de tiempo de [data-model.md](data-model.md#reglas-de-actualización), contando las peticiones del simulador. Navegar a «Usuarios» y volver; alternar 10 veces; cerrar sesión y volver a entrar.

### Tests for User Story 3 ⚠️

- [X] T058 [P] [US3] Crear `src/features/dashboard/policy/refreshRules.test.ts`, que debe fallar primero.
  - **`isRefreshDue(lastSuccessAt, now, intervalMs)`**:
    - `isRefreshDue(0, 1_000, 300_000)` es `true` (nunca hubo una correcta);
    - `isRefreshDue(t, t + 299_999, 300_000)` es `false` e `isRefreshDue(t, t + 300_000, 300_000)`, `true`.
  - **`refreshIntervalFor(data, intervalMs)`**: es `false` para `{ kind: 'forbidden' }` y `intervalMs` para un resumen o para `undefined`.
- [X] T059 [US3] Ampliar `src/features/dashboard/hooks/useDashboardSummary.test.tsx` con el reloj simulado, `createQueryClient()`, el simulador sin `directory` e intervalo de 300 000 ms (pasos de la línea de tiempo del data-model).
  - **El intervalo** (FR-016, FR-020):
    - a los 299 999 ms desde que terminó la primera, 1 petición; a los 300 000 ms, 2;
    - si se remonta a los 120 000 ms (consulta de entrada), la siguiente es a los 120 000 + 300 000 ms y no a los 300 000;
    - tras un fallo (`failNext` con 500 y `retryDelay` del cliente; avanzar los reintentos), la siguiente es un intervalo después de terminar el fallo, sin consultas en bucle.
  - **La pestaña oculta** (FR-017): con `visibilityState` en `hidden` y `visibilitychange` en `window`, en 15 min no hay peticiones nuevas.
  - **Volver a la pestaña** (FR-019):
    - a los 3 min desde la última correcta, ninguna;
    - a los 8 min, una, y la siguiente es 5 min después de esa;
    - si la primera carga falló, volver consulta.
  - **Sin más consultas tras un 403** (FR-015): con `forbidden`, ni el intervalo ni el regreso a la pestaña consultan.
  - **La red**: un `window.dispatchEvent(new Event('online'))` no consulta.
  - **Una sola en curso y cancelación** (FR-021):
    - con `defer()`, desmontar marca la petición en curso como `aborted`;
    - con una en curso, el ciclo o el regreso a la pestaña no lanzan otra (`requestCount` sigue en 1).
  - **La caché** (FR-022): desmontar, avanzar 10 min y remontar da al instante la vista `ready` con los datos anteriores e `isUpdating: true`, y luego la hora nueva.
  - **`isUpdating`**: es `true` mientras hay una consulta con datos previos.
- [X] T060 [P] [US3] Ampliar `src/features/dashboard/components/LastUpdated.test.tsx` con `isUpdating`: con `true` se ve `messages.dashboard.updating` junto a la hora, y el indicador gráfico es `aria-hidden`; con `false` no está. Ninguno de los dos estados crea una región viva (FR-033).
- [X] T061 [P] [US3] Crear `src/app/router/dashboard/refresh.integration.test.tsx`, con `renderApp`, los simuladores con `dashboard:read` concedido y el reloj simulado.
  - **Entrar y volver** (SC-005): con el Panel cargado, ir a «Usuarios» (con `createUsersDirectoryMock` sirviendo la lista) y volver con la navegación. Los valores anteriores se ven al instante, sin `PageLoader`, con «Actualizando…». Tras `release()` de un `defer()`, la hora de «Actualizado: …» cambia.
  - **La pestaña oculta**: en 10 min, 0 peticiones.
  - **Entrar y salir rápido** (SC-007): 10 alternancias Panel/Usuarios con `defer()`. En cada momento hay como mucho una petición del Panel sin `aborted` y sin respuesta.
  - **Cerrar sesión** (SC-009): con «Cerrar sesión» y volver a entrar, aparece `PageLoader`, nunca los valores anteriores, y no hay datos del Panel en `sessionStorage`.
  - **La inactividad** (FR-023): con `renderApp({ env: { VITE_DASHBOARD_REFRESH_MINUTES: 1 } })` y sin interacción, a los 15 min se produce el cierre de sesión por inactividad (patrón de `src/app/authFlow.integration.test.tsx` con `createMocks` de react-idle-timer), aunque el Panel se actualizó cada minuto.

### Implementation for User Story 3

- [X] T062 [US3] Crear `src/features/dashboard/policy/refreshRules.ts` (hace pasar T058) con `isRefreshDue` y `refreshIntervalFor`, funciones puras con comentarios que citan FR-019 y FR-015.
- [X] T063 [US3] Completar las opciones de `src/features/dashboard/hooks/useDashboardSummary.ts` (hace pasar T059; research D5), cada una con un comentario de lo que se comprobó en TanStack 5.104.4:
  - `refetchInterval: (query) => refreshIntervalFor(query.state.data, refreshIntervalMs)`;
  - `refetchIntervalInBackground: false`;
  - `refetchOnWindowFocus: (query) => !isForbiddenResult(query.state.data) && isRefreshDue(query.state.dataUpdatedAt, Date.now(), refreshIntervalMs)`, con `Date.now()` solo dentro de la función;
  - `refetchOnReconnect: false`;
  - `gcTime: Infinity`, con un comentario: los datos viven toda la sesión y `queryClient.clear()` los borra al cerrarla; el valor por defecto los perdería a los 5 min fuera del Panel.
  - `toDashboardView` calcula `isUpdating = isFetching` en `ready`.
- [X] T064 [US3] Completar `src/features/dashboard/components/LastUpdated.tsx` con la prop `isUpdating: boolean`: `messages.dashboard.updating` con un `CircularProgress size={14} aria-hidden`, fuera de cualquier región viva. `DashboardSummary.tsx` pasa `view.isUpdating` (hace pasar T060 y T061).
- [X] T065 [US3] Verificar la historia: `npx vitest run src/features/dashboard src/app/router/dashboard` y `npm run lint`. Comprobar que ningún render llama a `Date.now()` (lo vigila `react-hooks/purity`).

**Checkpoint**: el Panel se mantiene vigente sin consultar de más (quickstart V6, V9 a V11, V15).

---

## Phase 6: User Story 4 - Seguir viendo los datos aunque una actualización falle (Priority: P2)

**Goal**: Si falla una actualización con datos en pantalla, se mantienen con su hora y aparece un aviso anunciado de que no se pudieron actualizar. Si falla la primera carga, un mensaje de error anunciado. No hay botones de reintentar: el siguiente ciclo vuelve a intentarlo y, si sale bien, el aviso desaparece. 503, 500, red, tiempo agotado, 422 y respuestas fuera de contrato son fallos; el 401 sigue el manejo de sesión.

**Independent Test**: Con el simulador, cargar el Panel y hacer fallar el siguiente ciclo (503, 500, red); comprobar los datos, la hora y el aviso; dejar que el siguiente ciclo salga bien. Repetir con la primera carga fallida.

### Tests for User Story 4 ⚠️

- [X] T066 [P] [US4] Ampliar `src/features/dashboard/hooks/useDashboardSummary.test.tsx`.
  - **Unitarias de `toDashboardView`**:
    - sin datos y con error da `{ status: 'failed' }`;
    - con un resumen y error da `ready` con `refreshFailed: true`, el resumen anterior y el `updatedAt` anterior.
  - **Hook**:
    - con `failAll(500)` desde el inicio y los reintentos avanzados, termina en `failed` tras 3 peticiones;
    - con un resumen y luego `authorizationUnavailable()`, un ciclo da `refreshFailed`, con los datos y la hora sin cambiar;
    - tras `recover()`, el ciclo siguiente da `refreshFailed: false` y una hora nueva;
    - una respuesta fuera de contrato (`server.use`) termina en `failed` con **1** sola petición, sin reintentos;
    - un error de red (`HttpResponse.error()`) se reintenta 2 veces.
- [X] T067 [P] [US4] Ampliar `src/features/dashboard/components/DashboardSummary.test.tsx`.
  - **Fallo de la primera carga**: `role="alert"` con `messages.dashboard.loadError.title` y `.message`, sin `button`.
  - **Fallo con datos**: `role="alert"` con `messages.dashboard.refreshFailed` encima de los indicadores, que siguen visibles con su hora, y sin `button`.
  - **Sin volver a anunciarse**: durante el ciclo siguiente, con la petición en `defer()`, el mismo elemento `alert` sigue montado (la misma referencia de nodo), no se crea otro.
  - axe en los dos estados.
- [X] T068 [P] [US4] Crear `src/app/router/dashboard/failures.integration.test.tsx`, con `renderApp`, los simuladores con permiso y el reloj simulado.
  - **Fallo con datos** (SC-006): con el Panel cargado, `platform.authorizationUnavailable()` y un ciclo con sus reintentos. Se ven el aviso, los valores anteriores y la hora anterior, y ningún «Reintentar» en `main`. Tras `recover()` y otro ciclo, desaparece el aviso.
  - **Fallo de la primera carga**: `failAll(500)` antes de entrar da el mensaje de error; tras `recover()` y un ciclo, se ven los indicadores.
  - **Sesión no válida**: un manejador `server.use` que responde 401 dos veces, y el cliente HTTP termina la sesión (pantalla de acceso con la ruta de retorno `/`, como en la 001).

### Implementation for User Story 4

- [X] T069 [US4] Completar `toDashboardView` en `src/features/dashboard/hooks/useDashboardSummary.ts` con los estados `failed` y `refreshFailed` (hace pasar T066). Comentario: tras un fallo, TanStack sigue en `error` hasta que una consulta sale bien, así que el aviso no se vuelve a crear en el ciclo siguiente (research D8).
- [X] T070 [US4] Completar `src/features/dashboard/components/DashboardSummary.tsx` (hace pasar T067 y T068):
  - `failed` → `ErrorState`, sin `onRetry`, con `loadError`;
  - `ready` con `refreshFailed` → `RefreshFailedAlert`, sin `onRetry`, con `messages.dashboard.refreshFailed`, encima del resumen.
  - El archivo sigue en 250 líneas o menos.
- [X] T071 [US4] Verificar la historia: `npx vitest run src/features/dashboard src/app/router/dashboard src/shared/ui` y `npm run lint`.

**Checkpoint**: un fallo nunca vacía el Panel ni engaña sobre la vigencia de los datos (quickstart V12, V13).

---

## Phase 7: User Story 5 - Ajustar la frecuencia de actualización por entorno (Priority: P3)

**Goal**: Quien despliega elige entre 1 y 60 minutos con `VITE_DASHBOARD_REFRESH_MINUTES` (5 por defecto). Un valor inválido impide arrancar y nombra la variable. Queda documentado que es de compilación.

**Independent Test**: Con `renderApp({ env: { VITE_DASHBOARD_REFRESH_MINUTES: 1 } })`, comprobar el ciclo a los 60 s. Con un valor inválido, comprobar `ConfigErrorScreen`. Revisar `.env.example`, el README y `environment.md`.

### Tests for User Story 5 ⚠️

- [X] T072 [P] [US5] Crear `src/app/ConfigErrorScreen.test.tsx`, o ampliarlo si ya existe: con los errores de `parseEnv({ ...valid, VITE_DASHBOARD_REFRESH_MINUTES: '2.5' }, { isProduction: false })` se ve `messages.config.title` y la línea `VITE_DASHBOARD_REFRESH_MINUTES: Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.`, sin el texto `2.5`.
- [X] T073 [P] [US5] Ampliar `src/app/router/dashboard/refresh.integration.test.tsx`: con `renderApp({ env: { VITE_DASHBOARD_REFRESH_MINUTES: 1 } })`, el reloj simulado y el permiso, a los 59 999 ms desde la primera respuesta hay 1 petición y a los 60 000 ms, 2. Con el valor por defecto (5), a los 60 000 ms sigue habiendo 1.

### Implementation for User Story 5

- [X] T074 [P] [US5] En `.env.example`, debajo de `VITE_SUBSCRIPTIONS_API_URL`: `# Minutos entre actualizaciones del Panel (1 a 60; 5 si no se define). Se fija al compilar.` y `# VITE_DASHBOARD_REFRESH_MINUTES=5`.
- [X] T075 [P] [US5] En `README.md`, sección «Variables de entorno», añadir la fila `VITE_DASHBOARD_REFRESH_MINUTES` | No | «Minutos entre actualizaciones del Panel (1 a 60; 5 por defecto). Se fija al compilar: cambiarla exige volver a compilar y desplegar.», y mantener la tabla alineada para Prettier.
- [X] T076 [P] [US5] En `specs/001-auth-session-profile/contracts/environment.md`, añadir la fila de la variable (No | `10` | la regla de [specs/007-dashboard/contracts/environment.md](../../007-dashboard/contracts/environment.md)) y la línea comentada en el bloque del `.env.example` previsto.
- [X] T077 [US5] Verificar la historia: `npx vitest run src/app` y `npm run format:check`. Con `VITE_DASHBOARD_REFRESH_MINUTES=61` en `.env.local`, `npm run dev` muestra «Configuración inválida» con la variable (quickstart V16).

**Checkpoint**: todas las historias funcionan y se prueban por separado.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E, puertas de calidad, validación manual y limpieza antes del PR.

- [X] T078 [P] Crear `e2e/dashboard.spec.ts` (research D15).
  - Empieza con `test.skip(!hasAccounts('A1'), 'Needs E2E_AUTH0_USER_A1 and E2E_AUTH0_PASSWORD_A1')` y copia los ayudantes locales `openAs` y `navigate` de `e2e/subscriptions.spec.ts`. Los textos salen de `../src/shared/messages/es`.
  - **El Panel**: entrar con A1 y ver el `h1` «Panel», los seis indicadores y la tabla de clínicas recientes.
  - **Volver**: navegar a `/users` y volver a `/`, y comprobar que el texto «Actualizado: …» cambia.
  - **La actualización automática**: con `page.clock.install()` antes de `goto`, contar las respuestas de `**/api/v1/dashboard` con `page.on('response')`, `page.clock.fastForward('05:01')`, y esperar una petición más (patrón de `e2e/session.spec.ts` V9).
- [X] T079 [P] Ampliar `e2e/responsive.spec.ts`: en cada tamaño de `SIZES` (1024×768 y 320×640), el Panel con datos no tiene desplazamiento horizontal (`expectNoHorizontalScroll`) y la tabla de clínicas recientes es visible.
- [X] T080 Ejecutar las puertas de CI de `.github/workflows/ci.yml` y corregir lo que falle:
  - `npm run typecheck`, `npm run lint` (sin advertencias) y `npm run format:check`;
  - `npm run test:coverage`, con el 80 % de líneas en las capas que cuentan;
  - `npm run build` y `npm run size` (la entrada en 300 KB gzip o menos; el Data Grid y la herramienta Token siguen diferidos);
  - `npm audit --omit=dev`.
- [X] T081 Anotar en `specs/007-dashboard/plan.md`, en una sección «Notas de implementación» como la de la 003: el tamaño de la entrada antes y después, el del fragmento de `home`, y cualquier desvío del diseño encontrado al implementar.
- [X] T082 Revisar la constitución (V y VII) sobre el código nuevo:
  - ningún `console.*`;
  - ningún dato del Panel en `localStorage` ni `sessionStorage`;
  - ningún texto literal fuera de `src/shared/messages/es.ts`;
  - `src/features/dashboard` no importa `auth`;
  - ningún componente de más de 250 líneas;
  - el render no llama a `Date.now()`.
- [ ] T083 Ejecutar `npx playwright test e2e/dashboard.spec.ts e2e/responsive.spec.ts e2e/access.spec.ts e2e/session.spec.ts` con las cuentas `E2E_*` y `dashboard:read` asignado a A1 (prerrequisitos manuales). Se omiten sin ellas.
- [X] T084 Quitar el comentario «Sync Impact Report» del principio de `.specify/memory/constitution.md`, que la convención pide eliminar antes del commit, y confirmar que el pie dice `**Version**: 1.3.0`.
- [X] T085 [P] Repasar que [quickstart.md](quickstart.md) y [contracts/](contracts/) siguen describiendo lo implementado y corregir lo que no.
- [ ] T086 Validación manual con `specs/007-dashboard/quickstart.md`, escenarios V1 a V17, con la API y el permiso de los prerrequisitos manuales.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de Foundational, y de US1 para `useDashboardSummary`, `DashboardSummary` y la composición de `HomePage`, que amplía.
- **US3 (Phase 5)**: depende de US1, porque completa las opciones de la consulta y `LastUpdated`. Es independiente de US2, salvo `isForbiddenResult` (T054); si US3 va antes que US2, `refreshIntervalFor` y la función de foco se escriben sin el caso `forbidden` y la US2 lo añade.
- **US4 (Phase 6)**: depende de US1. Sus pruebas de ciclo usan el intervalo de US3; sin US3, los fallos se prueban al remontar (entrada).
- **US5 (Phase 7)**: la validación ya está en Setup; esta fase depende de US3 para comprobar el ciclo con el intervalo configurado (T073). La documentación (T074 a T076) puede hacerse en cualquier momento.
- **Polish (Phase 8)**: depende de las historias que se entreguen.

### Within Each User Story

- Las pruebas se escriben primero y deben fallar.
- Esquema → API → hook → componentes → página → ruta.
- Cada historia termina con su verificación y su punto de control.

### Parallel Opportunities

- **Setup**: T003 y T004.
- **Foundational**:
  - en el arranque, las pruebas T006, T008, T010, T012, T014 y T016 (archivos distintos);
  - después de sus pruebas, T007, T009, T011 y T013;
  - T018, T021, T022, T024, T025 y T026 en cuanto se cumplen sus dependencias.
- **US1**: las pruebas T029 a T035; los componentes T037 a T039; T045 y T046 (documentación y E2E).
- **US2**: las pruebas T048 a T052; T053.
- **US3**: T058, T060 y T061.
- **US4**: T066, T067 y T068.
- **US5**: T072 a T076.
- **Polish**: T078, T079 y T085.

---

## Parallel Example: User Story 1

```text
# Pruebas de la US1, juntas:
T029 DashboardIndicators.test.tsx
T030 RecentClinicsTable.test.tsx
T031 LastUpdated.test.tsx
T032 useDashboardSummary.test.tsx
T033 DashboardSummary.test.tsx
T034 HomePage.test.tsx
T035 app/router/dashboard/panel.integration.test.tsx

# Componentes de la US1, juntos (tras sus pruebas):
T037 DashboardIndicators.tsx
T038 RecentClinicsTable.tsx
T039 LastUpdated.tsx
```

## Parallel Example: User Story 3

```text
T058 policy/refreshRules.test.ts
T060 LastUpdated.test.tsx (isUpdating)
T061 app/router/dashboard/refresh.integration.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Fase 1 (Setup) y Fase 2 (Foundational).
2. Fase 3 (US1): el Panel con datos para quien tiene el permiso.
3. **Parar y validar**: quickstart V1 y V2.
4. Antes de publicar, completar también la **US2** (también P1). Sin ella, quien no tiene el permiso no recibe aviso, y un cambio de permisos o un 403 no se reflejan.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → el Panel se ve (MVP de demostración).
3. US2 → el Panel es correcto para todos (mínimo publicable).
4. US3 → el Panel se mantiene vigente.
5. US4 → los fallos no lo vacían.
6. US5 → la frecuencia se documenta y se comprueba por entorno.
7. Polish → E2E, puertas de CI, validación manual y limpieza de la constitución.

### Notes

- `[P]` = archivos distintos y sin dependencias pendientes.
- Comprobar que cada prueba falla antes de implementar.
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés).
- No modificar el manejador global de 403 (`src/app/providers/createQueryClient.ts`, `AppQueryProvider.tsx`): la consulta del Panel nunca le entrega un 403 (research D6).
- El simulador de usuarios no da `dashboard:read` a ningún role por defecto. Cada prueba que lo necesite lo concede con `directory.grant`.
