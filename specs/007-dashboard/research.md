# Research: Panel de Maily (Resumen de Solo Lectura)

**Feature**: `007-dashboard` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Decisiones de la Fase 0. Cada una sale de leer el código de `main` (`bb255fc`, con la feature 003 ya integrada), el contrato del servicio (`maily-system-api`, spec `003-platform-dashboard`) y el código de TanStack Query 5.104.4 que tiene instalado el proyecto. No queda ningún NEEDS CLARIFICATION.

## D1. Dónde vive el código: una feature `dashboard` y la página `home` que la compone

- **Decisión**: una feature nueva, `src/features/dashboard`, con la capa `api`, los esquemas, los hooks, las reglas puras (`policy`) y los componentes del resumen de la plataforma. No importa `features/auth`: recibe el intervalo por props y solo se monta cuando la persona tiene el permiso, igual que la 003 recibe sus capacidades desde `app`. Se añade a `forbidAuthImports` en `eslint.config.js`. La página raíz sigue en `src/features/home/HomePage.tsx`: compone el encabezado «Panel», el saludo, los avisos de permisos (lee `auth`, como hoy) y `DashboardSummary`, que importa del `index.ts` de `dashboard`.
- **Razón**: el resumen es un dominio propio (datos del servicio de la plataforma) y la página principal es la composición de la sesión (saludo y permisos). Separarlos mantiene `dashboard` sin dependencias de `auth` y deja la página en 250 líneas o menos (constitución I).
- **Alternativas descartadas**: (a) renombrar `features/home` a `features/dashboard` y meterlo todo ahí: mezcla el dominio con la sesión y obliga a abrir la excepción de `auth` a la feature de datos; (b) poner el resumen en `features/subscriptions` porque comparte servicio: es otro recurso y otro permiso.
- **Claves y rutas**: las claves `messages.nav.home`, `messages.titles.home` y el `titleKey: 'home'` de la ruta se conservan, porque nombran la ruta raíz y no el texto; cambian sus valores a «Panel» (D12).

## D2. El permiso `dashboard:read` y el aviso de "sin permisos asignados"

- **Decisión**:
  - `dashboard` entra en `PERMISSION_RESOURCES`, pero **no** en `SECTION_RESOURCES`: el Panel no es una sección con entrada propia, está siempre en la navegación (FR-002). La lectura se decide con `can(access, { resource: 'dashboard', action: 'read' })` (constitución V).
  - `hasAnySectionPermission` se reemplaza por `hasAnythingToSee(access)`: es verdadera si la persona puede leer alguna sección o herramienta, o los indicadores. Así quien solo tiene `dashboard:read` no ve el aviso de "sin permisos asignados" (FR-012). Hoy solo la usa `HomePage`.
  - Prueba primero en `permissions.test.ts` (constitución VII).
- **Razón**: el aviso actual existe para quien no tiene nada que hacer en el backoffice; con el Panel, ver los indicadores ya es algo que hacer. El nombre anterior dejaría de decir la verdad.
- **FR-013**: se cumple por construcción. Los permisos salen de `useGrantedAccess()`, que expone lo que decide `evaluateAccess`; cuando la feature 006 cambie qué roles cuentan (solo los de tipo Sistema), el Panel lo hereda sin cambios (D17).

## D3. Cliente y operación: el cliente `subscriptions` y `GET /api/v1/dashboard` sin `limit`

- **Decisión**: `getDashboard(client, { signal })` en `features/dashboard/api/dashboardApi.ts`, con `DASHBOARD_PATH = '/api/v1/dashboard'` y sin parámetros (FR-006). Usa `useHttpClients().subscriptions`, el cliente que la 003 creó para `maily-system-api` con `VITE_SUBSCRIPTIONS_API_URL` (obligatoria desde la 003). En desarrollo, la petición sale a `/proxy/subscriptions/api/v1/dashboard` y el proxy de Vite la manda a `SUBSCRIPTIONS_API_PROXY_TARGET` (por defecto `http://127.0.0.1:8010`).
- **Razón**: es el mismo servicio (los dos routers están montados en la misma aplicación FastAPI) y la constitución pide un único cliente por servicio, con el token solo para su host (IV). Sin `limit` rige el valor por defecto del servicio (`DASHBOARD_RECENT_CLINICS_LIMIT`: 3, 5 o 10, y 5 si no se configura), y el 422 nunca debería ocurrir.
- **Nombre del cliente**: se conserva `subscriptions`; renombrarlo a `system` tocaría la 003 sin necesidad. Un comentario en `HttpClientsContext` deja dicho que ese cliente es el de `maily-system-api` (suscripciones y Panel).
- **Alternativa descartada**: un cliente nuevo con la misma URL: duplicaría la configuración y la renovación del token.

## D4. Esquema Zod y modelo de dominio

- **Decisión**: `schemas/dashboardSummary.ts` valida el DTO y lo transforma al modelo de dominio en camelCase (constitución II), como `subscriptionSchema`:
  - los seis conteos: `z.number().int().min(0).nullable()`;
  - `recent_clinics`: `z.array(recentClinicSchema).max(10).nullable()`;
  - cada clínica: `id` de texto no vacío (no se muestra y sirve de clave), `name` de texto no vacío, `created_at` con `z.iso.datetime({ offset: true })` (el servicio envía `...Z`, sin fracción, pero el contrato solo dice `date-time`) y `status` con `{ id: entero, name: texto no vacío }`.
  - Los siete campos son obligatorios: si falta uno, la respuesta incumple el contrato (`ApiError` de tipo `contract`) y el Panel la trata como un fallo (FR-027).
- **Razón**: «no disponible» (`null`) y «no hay datos» (`0` o `[]`) son estados distintos que el esquema conserva hasta la pantalla (FR-007, FR-008). Una respuesta a medias nunca se muestra.
- **Sin reglas de negocio**: no se comprueba que activas más en prueba quepan en el total ni que los usuarios sean al menos los doctores (caso límite de la spec; constitución IV).
- **Tipos desde el OpenAPI (DEBERÍA)**: se escriben a mano, como en la 002 y la 003 (Complexity Tracking). El `/openapi.json` publicado expresa la nulabilidad con `anyOf` y su ejemplo del 403 nombra `subscriptions:write`. El contrato que se consume queda en [contracts/dashboard-service.md](contracts/dashboard-service.md).

## D5. La consulta y sus reglas de actualización, con opciones explícitas

Las reglas de FR-016 a FR-022 se escriben como opciones explícitas de `useQuery` en `hooks/useDashboardSummary.ts`, sin depender de los valores globales de `createQueryClient`. Se comprobó cómo se comportan en el código de `@tanstack/query-core` 5.104.4 (`queryObserver.js`, `query.js`, `focusManager.js`):

| Opción | Valor | Requisito | Comportamiento comprobado |
|---|---|---|---|
| `queryKey` | `dashboardKeys.summary()` | III | Factoría `dashboardKeys` (`['dashboard', 'summary']`). |
| `queryFn` | `({ signal }) => …` con la señal | IV, FR-021 | Al salir del Panel, el último observador se va y la consulta en curso se aborta (porque la función usa la señal) y su estado se revierte. |
| `refetchOnMount` | `'always'` | FR-018 | Cada entrada consulta, aunque no haya pasado el intervalo; si ya hay una en curso, `fetch` sin `cancelRefetch` devuelve la misma promesa. |
| `refetchInterval` | `(query) => esSinPermiso(query) ? false : intervalMs` | FR-016, FR-020, FR-015 | `onQueryUpdate` → `#updateTimers` reinicia el `setInterval` en **cada** cambio de estado de la consulta. La cuenta empieza de nuevo cuando la consulta termina, salga bien o mal: si se entra a las 10:02, la siguiente es a las 10:07. |
| `refetchIntervalInBackground` | `false` | FR-017 | Con la pestaña oculta, el intervalo sigue contando pero no consulta (`focusManager.isFocused()` es `visibilityState !== 'hidden'`). |
| `refetchOnWindowFocus` | `(query) => !esSinPermiso(query) && isRefreshDue(query.state.dataUpdatedAt, Date.now(), intervalMs)` | FR-019 | El foco de TanStack es el `visibilitychange` de `window`. La función se evalúa en ese evento, no en el render. `isRefreshDue` es verdadera si nunca hubo una actualización correcta (`dataUpdatedAt` 0) o si ya pasó el intervalo desde la última. |
| `staleTime` | `30_000` | — | El valor que pidió el solicitante, escrito en la consulta. No decide nada del Panel: la entrada usa `'always'` y el regreso a la pestaña usa la función anterior, porque una vigencia de 30 s haría consultar al volver a los 30 s y no al cumplirse el intervalo. |
| `gcTime` | `Infinity` | FR-022 | **Se aparta del valor por defecto que pidió el solicitante.** Con el valor por defecto (5 min), la consulta sin observadores se borra a los 5 minutos y quien vuelve al Panel tras 10 minutos fuera vería la carga en vez de sus datos. Con `Infinity` vive mientras dura la sesión: `useLogout`, `useSessionExpiry` y `useSessionEndedListener` ya hacen `queryClient.clear()`. |
| `refetchOnReconnect` | `false` | FR-016, FR-017 | Las únicas consultas automáticas son las del intervalo, la entrada y el regreso a la pestaña. |
| `retry` / `retryDelay` | `shouldRetryQuery` / `retryDelay` | IV | Hasta 2 reintentos con espera, solo ante red, tiempo agotado o 5xx; un 403 o un 401 no se reintentan. |
| `networkMode` | `'always'` | IV y VI | Como el resto: sin conexión, la consulta falla en lugar de quedar en pausa. |

- **"Una sola en curso" (FR-021)**: TanStack reutiliza la consulta en curso para la entrada, el intervalo y el foco. Al salir se cancela. Nunca hay dos a la vez.
- **Pureza del render**: `Date.now()` solo se llama dentro de la función de `refetchOnWindowFocus`, que TanStack ejecuta en el evento de visibilidad. La regla `react-hooks/purity` y la constitución I prohíben llamarlo en el render.
- **Alternativas descartadas**:
  - (a) `staleTime` igual al intervalo y `refetchOnWindowFocus: true`: cumple FR-019, pero cambia el valor que pidió el solicitante sin necesidad.
  - (b) Un temporizador propio con `useEffect`: duplicaría lo que TanStack ya hace bien y añadiría estado.
  - (c) No pasar la señal, para que al volver se esperara la misma consulta: incumpliría "toda llamada DEBE ser cancelable" (constitución IV). La spec se precisó (FR-021 y el escenario 9 de la User Story 3).

## D6. El rechazo por permiso (403) es un resultado «sin permiso», no un error

- **Decisión**: la función de la consulta captura el `ApiError` con estado 403 y resuelve `{ kind: 'forbidden' }` en lugar de lanzarlo. Los demás errores se lanzan. Lo que guarda la caché es `DashboardResult = { kind: 'summary'; summary } | { kind: 'forbidden' }`.
- **Efectos**:
  - El resultado «sin permiso» **reemplaza** al resumen anterior: los datos se descartan (FR-015).
  - `refetchInterval` y `refetchOnWindowFocus` devuelven `false` mientras dure, así que no se consulta más en esa visita. Al volver a entrar, `refetchOnMount: 'always'` consulta de nuevo (caso límite de la spec).
  - Como no hay error, el `onError` de la `QueryCache` no se dispara. **El manejador global `onForbidden` no muestra «No tienes permiso para realizar esta acción.»**, que hablaría de una acción y duplicaría el aviso del Panel. Es la comprobación que pedía el solicitante: el manejador global no encaja con este aviso y se evita así, sin tocarlo.
  - La sesión sigue abierta, y la recomprobación periódica del acceso (cada 5 min y al volver a la pestaña) actualiza los permisos, como pide la spec.
- **Alternativas descartadas**:
  - (a) Dejar el error y omitir el aviso global para esta consulta con `meta`: obliga a cambiar el manejador global y deja los datos anteriores en la caché, donde un fallo posterior los volvería a mostrar.
  - (b) Forzar en el acto una recomprobación del acceso con `useRefreshOperatorAccess`: el solicitante pidió que la actualizara la recomprobación periódica.

## D7. Perder u obtener el permiso durante la sesión (FR-014)

- **Decisión**: `HomePage` monta `DashboardSummary` solo si `can(…'dashboard'…)`. Cuando el permiso desaparece, `DashboardSummary` se desmonta: la consulta deja de tener observadores, no consulta más y la que estuviera en curso se cancela. Además, `useForgetDashboardSummary(!canRead)` (exportado por `dashboard`) quita el resumen de la caché con `removeQueries`, en un efecto. Cuando el permiso vuelve, `DashboardSummary` se monta sin datos: muestra la carga y consulta.
- **Razón del efecto**: sincroniza la caché, un almacén externo al componente, con un cambio de permisos que llega de la recomprobación y no de un evento de la persona. Es el uso de `useEffect` que admite la constitución I. `removeQueries` ya se usa para lo mismo en `useDeleteSubscription` y `useChangeUserStatus`.
- **Alternativa descartada**: dejar los datos en la caché al perder el permiso. Al recuperarlo se verían unos datos que la persona no podía ver mientras no tenía el permiso.

## D8. Los estados de la pantalla se derivan de la consulta

- **Decisión**: una función pura `toDashboardView(query)` en `hooks/useDashboardSummary.ts` reduce el estado de la consulta a lo que se pinta ([data-model.md](data-model.md#estados-de-la-pantalla)):
  - `loading`: sin datos y consultando;
  - `failed`: sin datos y con error;
  - `forbidden`;
  - `ready`, con el resumen, `updatedAt` (`dataUpdatedAt`), `isUpdating` (`isFetching`) y `refreshFailed` (hay datos y la última consulta falló).
- **Razón**: deja la lógica de estados probada con unitarias y dentro de la cobertura de `hooks` (constitución VII). Los componentes solo pintan el estado, sin copiar nada a `useState` (constitución III).
- **TanStack**: tras un fallo con datos, el estado es `error` con los datos conservados. Al empezar la siguiente consulta sigue en `error` hasta que una sale bien. Por eso el aviso de fallo permanece durante el ciclo siguiente y no se vuelve a crear ni a anunciar (FR-034).

## D9. Presentación y formatos

- **Conteos**: `formatCount(n)` nuevo en `shared/lib`, con `Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })`, que da 1,284 y 12,840 (aclaración de la spec). `null` → «No disponible» y `0` → «0».
- **Fecha de alta de cada clínica**: `formatDateTime(createdAt)`, el formato del resto del backoffice («15 oct 2026, 10:20» en la zona del navegador).
- **Última actualización**: `formatDateTime` gana la opción `{ seconds: true }` (`timeStyle: 'medium'`), que da «Actualizado: 20 oct 2026, 10:07:32». Se escribe a partir de `dataUpdatedAt`, la hora del navegador al recibir la última respuesta correcta.
  - La fecha va siempre, porque decidir si la actualización fue "hoy" exigiría leer la hora actual durante el render, algo que prohíben la constitución I y `react-hooks/purity`.
  - Los segundos hacen visible que la hora cambió aunque se vuelva dentro del mismo minuto (SC-005).
  - Se precisó FR-009.
- **Estatus de la clínica**: el `name` que envía el servicio, tal cual («Activa», «En prueba», «Suspendida»), sin traducir por `id` (caso límite de la spec).
- **Indicadores**: una lista de descripción (`dl`, con `dt` para la etiqueta y `dd` para el valor) en una cuadrícula de MUI que pasa de tres columnas a una por debajo de 600 px.
- **Clínicas recientes**: una `Table` de MUI (no el Data Grid, que es para listados paginados de recursos) con encabezados Nombre, Estatus y Fecha de alta, nombrada por el encabezado «Clínicas recientes» (`aria-labelledby`). Los nombres largos se ajustan con `overflowWrap: 'anywhere'` y la tabla no desborda a 320 px. No tiene enlaces ni acciones (FR-005).
- **Paginación (constitución IV)**: no aplica. Son como mucho 10 elementos que el contrato acota, dentro de un resumen; no es el listado de un recurso.

## D10. Accesibilidad

- **Encabezados**: `h1` «Panel», que recibe el foco al entrar con `useFocusOnMount` y `useRouteAccessibility` (FR-033). El saludo pasa a ser un párrafo debajo. Hay un `h2` «Indicadores de la plataforma» y otro `h2` «Clínicas recientes».
- **Nombres accesibles** (FR-032): cada `dt` y su `dd` se leen juntos («Doctores, No disponible»); la tabla tiene encabezados de columna.
- **Sin anuncios en cada ciclo** (FR-029, FR-033): la hora y la señal «Actualizando…» son texto normal, fuera de cualquier región viva. El indicador gráfico de la señal es `aria-hidden`.
- **Avisos que sí se anuncian** (FR-034): el mensaje de error de la primera carga (`ErrorState`) y el aviso de que no se pudieron actualizar (`RefreshFailedAlert`) son `Alert` de MUI, con `role="alert"`. Se anuncian al aparecer y no se repiten mientras siguen montados (D8).
  - `RefreshFailedAlert` pasa a admitir `onRetry` opcional: sin él no hay botón.
  - `ErrorState` ya lo admite.
- **Carga de la primera visita**: `PageLoader` (`role="status"`, «Cargando»), como el resto de las pantallas. Es una carga, no un ciclo.
- **Verificación**: axe en cada estado (carga, datos, no disponibles, lista vacía, sin permiso, fallo de primera carga y fallo con datos) y la prueba de diseño adaptable a 320 px en E2E.

## D11. Configuración del intervalo y cómo llega al Panel

- **Validación** en `app/config/env.ts`. `VITE_DASHBOARD_REFRESH_MINUTES` pasa por `emptyToUndefined`, de modo que vacía cuenta como no definida, igual que las demás. Luego tiene que ser texto de solo dígitos (`/^\d+$/`), que se convierte a número con un entero de 1 a 60 obligatorio, y vale 5 si no está definida.
  - Inválidos: «0», «61», «2.5», «cinco», «+5», « 5 » y «   ».
  - Válidos: «1», «05» y «60».
  - El error se informa con el texto de `messages.config.rules.refreshMinutes`, sin repetir el valor (FR-029). En `AppEnv` queda como `number`.
- **Cómo llega**:
  - `AppRuntime` envuelve la aplicación en `AppSettingsProvider` (nuevo, en `app/providers`) con `{ dashboardRefreshMs }`, calculado una vez a partir de `AppEnv`.
  - La ruta índice usa `HomeRoute` (nuevo, en `app/router`), que lee `useAppSettings()` y pasa `dashboardRefreshMs` a `HomePage`, que se sigue cargando de forma diferida.
  - Las features no conocen `app` y reciben el valor por props (constitución I).
- **Por qué un Context**: las rutas se crean una vez, en un módulo (`router.ts`). La configuración ya validada solo llega a la aplicación como prop de `App`, y un Context es la vía para que una ruta lea un dato transversal que no cambia (constitución III). Leer `import.meta.env` en la feature se saltaría la validación (constitución II).
- **Alternativa descartada**: construir las rutas con la configuración (`createAppRoutes(env)`): obligaría a cambiar el router singleton y los arneses de prueba que usan `appRoutes`.
- **Variable de compilación**: Vite la escribe en el paquete al compilar; cambiarla exige volver a compilar y desplegar (FR-030). Se documenta en `.env.example`, en la tabla del README y en `specs/001-auth-session-profile/contracts/environment.md`, que es donde viven las reglas de las variables. `src/vite-env.d.ts` declara el tipo.

## D12. «Inicio» pasa a ser «Panel»

- **Textos**: `messages.nav.home` y `messages.titles.home` pasan a «Panel»; se añade `messages.home.title` «Panel», el `h1`. El enlace «Ir al inicio» de la página no encontrada no cambia (supuesto de la spec).
- **Pruebas que cambian porque el `h1` deja de ser el saludo**:
  - `HomePage.test.tsx`, `app/authFlow.integration.test.tsx` y `app/router/accessFlow.test.tsx`;
  - los E2E `e2e/access.spec.ts`, `e2e/session.spec.ts` y `e2e/responsive.spec.ts`, que buscan `heading level 1 /^Hola, /`.

  Pasan a buscar el `h1` «Panel» y, cuando importa la persona, el texto del saludo. `AppLayout.test.tsx` y `useDocumentTitle.test.tsx` ya leen la clave o un literal propio y no cambian.
- **Documentación**: una nota en `specs/001-auth-session-profile/spec.md` y en su `contracts/app-routes.md` (ruta `/`) que diga que la página principal se llama «Panel» desde la feature 007 (FR-036).

## D13. Simulador del servicio y fábricas para las pruebas

- **Decisión**: `src/test/handlers/platformDashboard/` con `createPlatformDashboardMock({ directory, initial })`, construido como el de suscripciones.
  - Registra `GET ${SUBSCRIPTIONS_API_BASE_URL}/api/v1/dashboard`, con la base `http://localhost:5173/proxy/subscriptions`.
  - Reutiliza `shared/requestLog.ts` (`requestsTo`, `aborted`), `shared/failures.ts` (`failNext`, `failAll` y `defer`, con 500 `internal_error` y 503 `authorization_unavailable` por defecto) y la autorización del simulador de usuarios (`requirePermission('dashboard:read')`, leído en vivo).
  - Ofrece funciones para cambiar los datos: `setSummary(overrides)`, `setUnavailable(...fields)` y `setRecentClinics([])`.
  - Su estado inicial son los datos ficticios de la fase 1 del servicio: 12, 8, 3, 37, 1284 y 52, y las cinco clínicas más recientes, empezando por Clínica Santa Aurora.
- **Semilla de permisos**: el Administrator del simulador de usuarios **no** recibe `dashboard:read` por defecto. Así es como estará en producción hasta que se asigne, y las pruebas actuales que llegan a `/` no hacen una llamada sin simular, porque MSW falla ante cualquier petición sin manejador. Las pruebas del Panel lo dan con `directory.grant('Administrator', 'dashboard:read')`.
- **Fábricas** en `src/test/factories.ts`:
  - `dashboardDto(overrides)`, con `DashboardDto = z.input<typeof dashboardSummarySchema>`;
  - `recentClinicDto(overrides)`;
  - `operatorAccess` sigue sin `dashboard:read`, y las pruebas lo añaden.
- **Errores que no cubren los controles**: los de red se simulan con `server.use(http.get(url, () => HttpResponse.error()))`, como en `httpClient.test.ts`. El 401 se provoca con un token inválido o con un manejador propio, porque las fallas se inyectan después de la autenticación.

## D14. Estrategia de pruebas

- **Unitarias, con prueba primero** (constitución VII):
  - el esquema y el mapeo: `null` frente a 0 frente a `[]`, campos que faltan, negativos, decimales, más de 10 clínicas y fecha inválida;
  - `isRefreshDue`, `toDashboardView`, `hasAnythingToSee` y `formatCount`;
  - `formatDateTime` con `seconds`;
  - `parseEnv` con la variable nueva (valores válidos, inválidos, vacía y ausente).
- **API**: `dashboardApi.test.ts`, sobre la plantilla de `subscriptionsApi.read.test.ts`. Comprueba la ruta sin `limit`, el token, la violación de contrato, la cancelación y el 403 tal como llega.
- **Hook** (`useDashboardSummary.test.tsx`), con `createWrapper`, `createQueryClient()` y temporizadores simulados, como `useOperatorAccess.recheck.test.tsx`:
  - consulta al montar;
  - consulta a los 5 min y no antes;
  - la cuenta se reinicia tras una consulta al entrar;
  - no consulta con la pestaña oculta;
  - al volver a la pestaña, consulta solo si ya pasó el intervalo;
  - un fallo conserva los datos y se reintenta en el ciclo siguiente;
  - el 403 da `forbidden` y deja de consultar, sin llamar a `onForbidden`;
  - al desmontar se aborta la consulta (`aborted`);
  - los datos siguen en la caché a los 10 min sin observadores (`gcTime`);
  - nunca hay dos consultas en curso.
  - Para la visibilidad: `vi.spyOn(document, 'visibilityState', 'get')` y `window.dispatchEvent(new Event('visibilitychange'))`. El evento se envía a `window`, o a `document` con `bubbles: true`, porque `focusManager` escucha en `window`. Tras cada prueba se restablece con `focusManager.setFocused(undefined)`.
- **Componentes**:
  - `DashboardSummary.test.tsx`: cada estado, «No disponible», «Sin clínicas registradas», formatos es-MX, la señal de actualización, los avisos con `role="alert"` y axe;
  - `HomePage.test.tsx`: el encabezado «Panel» con el foco, el saludo, los tres casos de aviso de FR-011 y FR-012, y que sin permiso no se hace ninguna petición.
- **Integración**, en `src/app/router/dashboard/*.integration.test.tsx` con `renderApp`, el simulador de usuarios y el del Panel:
  - navegación, título y `h1` «Panel»;
  - con y sin permiso, y 0 peticiones sin él (`requestsTo`);
  - entrar y volver: los datos anteriores, «Actualizando…» y la hora nueva;
  - perder y recuperar el permiso con la recomprobación (`directory.revoke` o `grant` y avanzar 5 min);
  - 403 sin aviso global duplicado;
  - fallos con y sin datos previos;
  - cerrar sesión borra los datos;
  - la pestaña oculta y el reinicio del intervalo con el reloj simulado;
  - las consultas automáticas no impiden el cierre por inactividad.
- **Configuración**: `env.test.ts` y un caso de `ConfigErrorScreen` con la variable inválida.
- **E2E**: D15.
- **Cobertura**: los archivos nuevos de `api`, `schemas`, `hooks` y `policy` de `dashboard` y `shared/lib` cuentan para el 80 %. Los componentes quedan fuera, como en el resto.

## D15. Prueba de extremo a extremo

- **Decisión**: `e2e/dashboard.spec.ts`. Se omite sin `E2E_AUTH0_USER_A1` ni `E2E_AUTH0_PASSWORD_A1`, y requiere que el role de A1 tenga `dashboard:read` en la API de usuarios del entorno de pruebas. Recorre:
  - el inicio de sesión y el Panel con los seis indicadores y las clínicas recientes del servicio real (datos ficticios de la fase 1);
  - la navegación a «Usuarios» y de vuelta, comprobando que la hora de actualización cambia;
  - con `page.clock.install()` y `page.clock.fastForward('05:01')`, una consulta automática contada con `page.route('**/api/v1/dashboard', …)`, el patrón de `e2e/session.spec.ts` V9.
- Además, `responsive.spec.ts` comprueba el Panel a 1024 y a 320 px, sin desplazamiento horizontal. Los E2E no corren en CI (como hoy) y se ejecutan con la guía de [quickstart.md](quickstart.md).

## D16. Dependencias y tamaño del paquete

- **Ninguna dependencia nueva**: MUI (`Table`, `Grid`, `Alert`, `CircularProgress`), TanStack Query, Zod y el cliente HTTP ya están.
- **La ruta de entrada no crece**: `HomePage` ya es un chunk diferido y `dashboard` entra en él. `HomeRoute` y `AppSettingsProvider` son unas pocas líneas en `app`. El presupuesto de 300 KB gzip se sigue comprobando con `npm run size`.

## D17. Relación con la feature 006

- **Decisión**: la 007 no depende del código de la 006. Lee los permisos con `useGrantedAccess()`, y qué roles cuentan lo decide `evaluateAccess`, que es lo que cambiará la 006 para contar solo los roles activos de tipo Sistema (`type.id = 1`). FR-013 se cumple hoy con la regla vigente y mañana con la de la 006, sin tocar el Panel.
- **Consecuencia**: el orden de integración lo decide el responsable. Hasta que llegue la 006, un `dashboard:read` de un role que da acceso por nombre también cuenta, como cualquier otro permiso del backoffice. Las pruebas de FR-013 ("un `dashboard:read` de un role que no da acceso no cuenta") se escriben sobre `evaluateAccess` y siguen valiendo con la 006.
