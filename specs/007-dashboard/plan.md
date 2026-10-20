# Implementation Plan: Panel de Maily (Resumen de Solo Lectura)

**Branch**: `007-dashboard` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La página principal del Backoffice pasa a llamarse «Panel». Conserva el saludo y, para quien tiene `dashboard:read`, muestra un resumen de solo lectura de la plataforma: seis indicadores (clínicas totales, activas y en periodo de prueba; doctores; pacientes; usuarios) y las clínicas más recientes. Los datos vienen de `GET /api/v1/dashboard` de `maily-system-api`, el mismo servicio que el de suscripciones.

El resumen se actualiza solo cada `VITE_DASHBOARD_REFRESH_MINUTES` minutos (5 por defecto), únicamente con el Panel abierto y la pestaña visible. Al entrar al Panel se consulta siempre. Los datos se conservan en memoria durante la sesión. Un fallo no borra los datos que ya se veían, y se reintenta en el ciclo siguiente, sin botón (constitución 1.3.0). Quien no tiene el permiso ve un aviso y no se hace ninguna consulta.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Sin dependencias nuevas** (D16).
2. **Estructura**: una feature `dashboard` que no importa `auth` (api, esquemas, hooks, reglas puras y componentes). La página `home` la compone con el saludo y los avisos de permisos. `dashboard` pasa a `PERMISSION_RESOURCES` (no a `SECTION_RESOURCES`) y `hasAnythingToSee` sustituye a `hasAnySectionPermission` (D1, D2).
3. **Integración**: el cliente `subscriptions` existente, `GET /api/v1/dashboard` sin `limit` y un esquema Zod que conserva `null` (no disponible) frente a `0` o `[]` (no hay datos) (D3, D4, [contracts/dashboard-service.md](contracts/dashboard-service.md)).
4. **Actualización**: una sola `useQuery` con opciones explícitas, comprobadas en el código de TanStack Query 5.104.4 (D5):
   - `refetchOnMount: 'always'` para la entrada;
   - `refetchInterval` para los ciclos; TanStack reinicia la cuenta en cada cambio de estado, así que cuenta desde que terminó la última consulta;
   - `refetchIntervalInBackground: false` para la pestaña oculta;
   - `refetchOnWindowFocus` con la regla «pasó el intervalo desde la última actualización correcta»;
   - `staleTime` de 30 s, como se pidió;
   - `gcTime: Infinity`, para que los datos vivan toda la sesión (el valor por defecto los borraría a los 5 min fuera del Panel);
   - la señal de cancelación, para que salir del Panel cancele la consulta en curso.
5. **Permisos**:
   - un 403 del servicio se convierte en el resultado `forbidden`: descarta los datos, detiene la actualización durante esa visita y evita el aviso global de 403, que duplicaría el del Panel (D6);
   - perder el permiso en la recomprobación desmonta el resumen y lo quita de la caché (D7).
6. **Pantalla**:
   - estados derivados por una función pura (D8);
   - números con el formato de México;
   - la hora de la última actualización, siempre con la fecha y con segundos;
   - una lista de descripción para los indicadores y una tabla para las clínicas;
   - los avisos de fallo con `role="alert"`, sin anuncios en cada ciclo (D9, D10, [contracts/app-routes.md](contracts/app-routes.md)).
7. **Configuración**: `VITE_DASHBOARD_REFRESH_MINUTES`, que se valida en `env.ts` (entero de 1 a 60, solo dígitos, y 5 si falta o está vacía). Llega a la página por `AppSettingsProvider` y `HomeRoute` en `app` (D11, [contracts/environment.md](contracts/environment.md)).
8. **Calidad**:
   - un simulador del servicio sobre las piezas compartidas de la 003;
   - prueba primero en la lógica pura;
   - pruebas de hook con el reloj simulado y la visibilidad;
   - integración con `renderApp`, axe y un E2E (D13 a D15).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS. Sin cambios respecto a la 003.

**Primary Dependencies**: las de la 003, sin cambios:
- Vite 8.3.4, react-router 8.4.0, @tanstack/react-query 5.104.4 y @auth0/auth0-react 2.28.2;
- @mui/material 9.5.0 (`Table`, `Grid`, `Alert` y `CircularProgress`) y zod 4.6.7.

**Ninguna nueva** (D16).

**Storage**: N/A. El resumen vive en la caché de TanStack Query durante la sesión (`gcTime: Infinity`) y se vacía al cerrarla. No se usa el almacenamiento del navegador (FR-022, constitución III y V).

**Testing**:
- **Herramientas**: la infraestructura existente (Vitest 5.0.5 con jsdom y `TZ=UTC`, Testing Library, user-event, MSW 3.0.3, vitest-axe y Playwright 1.64.1).
- **Simulador nuevo**: el del servicio del Panel, que reutiliza `requestLog`, `failures` y la autorización del simulador de usuarios (D13).
- **Reloj y visibilidad**: temporizadores simulados como en `useOperatorAccess.recheck.test.tsx`. La visibilidad se simula con un espía de `visibilityState` y un `visibilitychange` sobre `window`, porque `focusManager` escucha ahí (D14).
- **Cobertura**: 80 % de líneas en `api`, `schemas`, `hooks`, `policy` y `shared/lib`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 px a 320 px sin desplazamiento horizontal (sin cambios).

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio (sin cambios).

**Performance Goals**:
- **Primera carga** (SC-002): los indicadores en menos de 3 s desde que se abre el Panel, en el 95 % de las visitas con el servicio disponible. Es una sola petición, con un tiempo límite de 30 s y como mucho 2 reintentos.
- **Regreso** (SC-005): los datos anteriores aparecen de inmediato, sin la carga.
- **Ciclos** (SC-004): `floor(60 / intervalo)` consultas automáticas por hora con el Panel a la vista, y ninguna fuera de él.
- **Tamaño**: JS de la ruta de entrada de 300 KB gzip o menos (276,8 KB tras la 003). El Panel va en el fragmento diferido de `home`; en la entrada solo entran los textos, `HomeRoute` y `AppSettingsProvider`.

**Constraints**:
- **El servicio**: exige token y `dashboard:read` en cada petición, y lo decide el API de usuarios. El permiso todavía no existe en esa API. El servicio responde `Cache-Control: no-store` y tiene CORS cerrado por defecto (en desarrollo se usa el proxy de la 003). En la fase 1 los datos son ficticios.
- **Comportamiento**:
  - nunca dos consultas en curso;
  - no consulta con la pestaña oculta ni fuera del Panel;
  - las consultas automáticas no cuentan como actividad para el cierre por inactividad, que solo escucha `mousedown`, `keydown` y `touchstart`;
  - sin botones de actualizar ni de reintentar.
- **Código**: el render es puro, sin `Date.now()` (constitución I, `react-hooks/purity`).
- **Interfaz**: en español, WCAG 2.1 AA.

**Scale/Scope**:
- **Uso**: herramienta interna de decenas de operadores, con una consulta por persona cada 1 a 60 min.
- **Pantalla**: 1 ruta (`/`), 6 indicadores, como mucho 10 clínicas, 1 operación de la API y 1 variable de entorno.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución **v1.3.0** (2026-10-20). «Antes» es el estado al iniciar la investigación (⚠️: dependía de una decisión por tomar; ❌: desvío que hay que justificar); «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; efectos solo con sistemas externos | La hora se escribe a partir de `dataUpdatedAt`. `Date.now()` solo va dentro de la función de `refetchOnWindowFocus`, que se ejecuta en el evento. El único efecto nuevo sincroniza la caché al perder el permiso (D5, D7, D9) | ⚠️ | ✅ |
| I. Estructura por features con límites en ESLint | `dashboard` con `api`, `components`, `hooks`, `policy`, `schemas` e `index.ts`. No importa `auth`: se añade a `forbidAuthImports`. `home` la importa por su `index.ts` y `app` compone `HomeRoute` (D1) | ⚠️ | ✅ |
| I. Sin abstracciones especulativas ni memoización preventiva; componentes de 250 líneas o menos | Un Context nuevo, `AppSettingsProvider`, porque la configuración validada no tiene otra vía hasta una ruta (D11). Se reutilizan `ErrorState`, `RefreshFailedAlert`, `PageLoader` y `formatDateTime`. Hay un componente por pieza (indicadores, clínicas, hora) | ⚠️ | ✅ |
| II. TypeScript estricto y Zod en las fronteras; DTO a dominio en la capa `api`/`schemas` | `dashboardSummarySchema` con `.transform` a camelCase, y la variable de entorno validada en `env.ts`. Sin `as` (D4, D11) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query, sin copiarlo; factorías de claves | `dashboardKeys`. Los estados se derivan de la consulta (`toDashboardView`), sin `useState` (D5, D8) | ✅ | ✅ |
| III. Context solo para lo transversal y poco cambiante | `AppSettingsProvider`: configuración de compilación que no cambia (D11) | ✅ | ✅ |
| III. Vaciar la caché al cerrar sesión; no persistirla | Lo hace la 001 (`clear()` en los tres caminos de cierre). `gcTime: Infinity` dura lo que dura la sesión (D5) | ✅ | ✅ |
| IV. Todo por las APIs; sin reglas de negocio duplicadas | No se validan los invariantes de los conteos: se muestran como llegan (D4) | ✅ | ✅ |
| IV. URL base por entorno y validada; cliente HTTP único; token solo al host; tiempo límite y cancelación | Se reutiliza el cliente `subscriptions` (`VITE_SUBSCRIPTIONS_API_URL`, obligatoria). La consulta pasa la señal, así que salir del Panel la cancela (D3, D5) | ✅ | ✅ |
| IV. Estados explícitos; actualización periódica (nueva en 1.3.0): intervalo definido en el spec, pausada con la pestaña oculta, una sola en curso y sin contar como actividad | FR-016 a FR-023 implementados con las opciones de D5: `refetchIntervalInBackground: false`, la deduplicación de TanStack y el temporizador de inactividad, que no escucha la red | ⚠️ | ✅ |
| IV. Reintentos solo en GET, como mucho 2, con espera, ante red o 5xx | `shouldRetryQuery` y `retryDelay`, explícitos en la consulta (D5) | ✅ | ✅ |
| IV. Errores uniformes: 401 con el manejo de sesión, 403 como "sin permisos" sin cerrar sesión, red y 5xx con mensaje genérico y reintento (automático en pantallas periódicas, 1.3.0); sin mensajes crudos | El 401 lo lleva el cliente HTTP y la 001. El 403 da el resultado `forbidden` con su aviso propio, sin el aviso global duplicado (D6). Red, 5xx y respuestas fuera de contrato dan un aviso de fallo sin botón, con reintento en el ciclo siguiente | ⚠️ | ✅ |
| IV. Paginación en servidor en los listados | No aplica: son como mucho 10 clínicas, acotadas por el contrato, dentro de un resumen; no es el listado de un recurso (D9) | ✅ | ✅ |
| IV. Contratos documentados; tipos derivados del OpenAPI (DEBERÍA) | [contracts/dashboard-service.md](contracts/dashboard-service.md); esquemas Zod a mano, como en la 002 y la 003 (D4) | ⚠️ | ✅ (Complexity Tracking) |
| IV. Fechas ISO 8601; formato solo en presentación con `Intl` | `formatDateTime` (más la opción `seconds`) y `formatCount` con `Intl` (D9) | ✅ | ✅ |
| V. Auth0; tokens en memoria; sin secretos | Sin cambios: el mismo token de la sesión | ✅ | ✅ |
| V. Autorización en un único módulo de políticas; el 403 se maneja | `can(access, { resource: 'dashboard', action: 'read' })` y `hasAnythingToSee`, escritos con prueba primero. El 403 se trata en D6 (D2) | ✅ | ✅ |
| V. Sin tokens ni datos personales en registros | El Panel no registra nada. El servicio no devuelve datos personales y el `id` de la clínica no se muestra (FR-035) | ✅ | ✅ |
| VI. MUI con el tema central; textos en el módulo de mensajes | `Table`, `Grid` y `Alert` de MUI, y los textos en `messages.home` y `messages.dashboard` (data-model) | ✅ | ✅ |
| VI. Estados de carga, vacío, error y éxito; error con reintento, que puede ser automático en pantallas periódicas (1.3.0); un fallo con datos los conserva con su hora y avisa | Tabla de estados de [data-model.md](data-model.md#estados-de-la-pantalla) (D8) | ⚠️ | ✅ |
| VI. WCAG 2.1 AA; axe en las pantallas principales; diseño adaptable | `h1` «Panel» con el foco, `dl` y tabla con encabezados, avisos con `role="alert"` y nada que se anuncie en cada ciclo. axe en cada estado y E2E a 320 px (D10) | ✅ | ✅ |
| VII. Pruebas en el mismo PR; primero en la lógica pura; MSW sin simular `fetch`; doble de Auth0; deterministas | D13 y D14: reloj simulado y simulador de red; ninguna prueba toca la red real | ✅ | ✅ |
| VII. Cobertura de 80 % en las capas definidas; E2E cuando exista entorno | Los archivos nuevos van en carpetas que cuentan; `e2e/dashboard.spec.ts` se omite sin `E2E_*` (D15) | ✅ | ✅ |
| Stack: dependencias mínimas y licencias permisivas | Ninguna dependencia nueva (D16) | ✅ | ✅ |
| Configuración: `VITE_*` validadas al arrancar y documentadas | `VITE_DASHBOARD_REFRESH_MINUTES` en `env.ts`, `.env.example`, el README y `environment.md` de la 001 (D11) | ✅ | ✅ |
| Rendimiento: rutas diferidas; presupuesto de entrada | El Panel va dentro del fragmento diferido de `home` (D16) | ✅ | ✅ |
| Flujo: spec → clarify → plan → tasks → implement; documentación en español | La spec se aclaró en dos sesiones. La constitución se enmendó a 1.3.0 antes de este plan | ✅ | ✅ |

**Resultado**: sin violaciones sin justificar, ni antes ni después del diseño. Lo que la 1.2.1 habría impedido (pantalla sin botón de reintentar, actualización periódica y Panel fuera del alcance del producto) lo admite la enmienda 1.3.0. Queda el desvío de un DEBERÍA (tipos desde el OpenAPI), como en la 002 y la 003, registrado en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-dashboard/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones D1 a D17
├── data-model.md        # Fase 1: DTO → dominio, resultado en caché, estados y reglas de actualización
├── quickstart.md        # Fase 1: guía de validación V1 a V17
├── contracts/
│   ├── dashboard-service.md   # GET /api/v1/dashboard consumido y reacción a cada respuesta
│   ├── app-routes.md          # La ruta / como Panel: contenido, estados, tiempos y foco
│   └── environment.md         # VITE_DASHBOARD_REFRESH_MINUTES
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── config/
│   │   ├── env.ts                         # + VITE_DASHBOARD_REFRESH_MINUTES (número, 1 a 60, 5 por defecto)
│   │   └── env.test.ts                    # + casos de la variable
│   ├── providers/
│   │   ├── AppSettingsProvider.tsx        # NUEVO: { dashboardRefreshMs } desde AppEnv; useAppSettings()
│   │   └── AppRuntime.tsx                 # envuelve con AppSettingsProvider
│   └── router/
│       ├── HomeRoute.tsx                  # NUEVO: lee useAppSettings() y pinta HomePage (lazy)
│       ├── routes.tsx                     # índice → HomeRoute
│       └── dashboard/                     # NUEVO: *.integration.test.tsx del Panel con renderApp
├── features/
│   ├── auth/policy/permissions.ts         # + 'dashboard' en PERMISSION_RESOURCES; hasAnythingToSee
│   ├── home/
│   │   ├── HomePage.tsx                   # h1 «Panel», saludo, avisos y DashboardSummary
│   │   └── HomePage.test.tsx
│   └── dashboard/                         # NUEVA feature (no importa auth)
│       ├── api/dashboardApi.ts            # getDashboard; DASHBOARD_PATH
│       ├── schemas/dashboardSummary.ts    # Zod del DTO → DashboardSummary
│       ├── policy/refreshRules.ts         # isRefreshDue, refreshIntervalFor
│       ├── hooks/
│       │   ├── dashboardKeys.ts
│       │   ├── useDashboardSummary.ts     # la consulta (D5, D6) y toDashboardView (D8)
│       │   └── useForgetDashboardSummary.ts
│       ├── components/
│       │   ├── DashboardSummary.tsx       # estados de la pantalla
│       │   ├── DashboardIndicators.tsx    # dl de los seis indicadores
│       │   ├── RecentClinicsTable.tsx
│       │   ├── LastUpdated.tsx            # «Actualizado: …» y «Actualizando…»
│       │   └── DashboardPermissionNotice.tsx
│       └── index.ts                       # DashboardSummary, DashboardPermissionNotice, useForgetDashboardSummary
├── shared/
│   ├── api/httpClientsContext.tsx         # comentario: `subscriptions` es el cliente de maily-system-api
│   ├── lib/
│   │   ├── formatCount.ts                 # NUEVO: es-MX, sin decimales
│   │   └── formatDateTime.ts              # + opción { seconds }
│   ├── messages/es.ts                     # «Panel», messages.dashboard, config.rules.refreshMinutes
│   └── ui/RefreshFailedAlert.tsx          # onRetry opcional
├── test/
│   ├── factories.ts                       # + dashboardDto, recentClinicDto
│   ├── renderApp.tsx                      # + VITE_DASHBOARD_REFRESH_MINUTES en su AppEnv
│   └── handlers/platformDashboard/        # NUEVO: simulador del servicio (D13)
└── vite-env.d.ts                          # + VITE_DASHBOARD_REFRESH_MINUTES

e2e/
├── dashboard.spec.ts                      # NUEVO (D15)
├── access.spec.ts, session.spec.ts        # h1 «Panel» en lugar del saludo
└── responsive.spec.ts                     # + Panel a 1024 y 320 px

eslint.config.js                           # features/dashboard en forbidAuthImports
.env.example, README.md                    # la variable nueva
specs/001-auth-session-profile/            # nota de «Panel» en spec.md y contracts/app-routes.md; fila en contracts/environment.md
```

**Structure Decision**: proyecto único en la raíz con la estructura por features de la constitución (I). La feature nueva `src/features/dashboard` lleva el dominio del resumen. `src/features/home` sigue siendo la página raíz y compone el resumen con la sesión. En `src/app` quedan la configuración (`AppSettingsProvider`) y la ruta (`HomeRoute`). Las piezas genéricas que se tocan están en `src/shared`.

### Cobertura de requisitos

| Requisito | Diseño | Verificación |
|---|---|---|
| FR-001, SC-001 | `nav.home` y `titles.home` = «Panel»; `h1` `home.title` (D12) | Componentes e integración (navegación, `h1`, `document.title`); V1 |
| FR-002, FR-003 | El Panel sigue siendo la ruta índice, sin guarda de permiso; el saludo, debajo del `h1` | Componentes; V1 |
| FR-004, FR-007 | `DashboardIndicators` con `formatCount` (es-MX) y «No disponible» para `null` | Unitarias (`formatCount`, esquema) y componentes; V2 |
| FR-005, FR-008, FR-035 | `RecentClinicsTable` con nombre, `status.name` y `formatDateTime`, sin enlaces; `[]` da «Sin clínicas registradas» y `null`, «No disponible» | Componentes; V2 |
| FR-006 | `getDashboard` sin parámetros | API (la URL registrada sin `limit`); V2 |
| FR-009 | `LastUpdated`: `dataUpdatedAt` con fecha y segundos, y «Actualizando…» con `isFetching` | Componentes e integración; V10 |
| FR-010 | Sin acciones, enlaces ni botones en `DashboardSummary` | Componentes (no hay `button` ni `link` en el resumen); V2 |
| FR-011, FR-012, SC-003 | `HomePage` con `can(…'dashboard'…)` y `hasAnythingToSee`; sin el permiso no monta el resumen | Unitarias (políticas), componentes e integración (0 peticiones); V3 a V5 |
| FR-013 | Los permisos de `useGrantedAccess()` según `evaluateAccess` (D17) | Unitarias de `evaluateAccess` (un permiso de un role sin acceso no cuenta) |
| FR-014 | Se desmonta el resumen y se llama a `useForgetDashboardSummary` (D7) | Integración con `revoke` o `grant` y la recomprobación; V7, V8 |
| FR-015 | El resultado `forbidden` (D6) | Hook (sin `onForbidden`, sin más consultas) e integración (sin la notificación global); V14 |
| FR-016, FR-020, SC-004 | `refetchInterval`, que TanStack reinicia en cada cambio de estado (D5) | Hook con el reloj simulado (10:02 → 10:07; tras un fallo, otro intervalo); V6 |
| FR-017 | `refetchIntervalInBackground: false`; fuera del Panel no hay observador | Hook (pestaña oculta) e integración (otra sección); V9 |
| FR-018, SC-005 | `refetchOnMount: 'always'` y `gcTime: Infinity` | Hook (consulta al montar y datos a los 10 min) e integración (entrar y volver); V10 |
| FR-019 | `refetchOnWindowFocus` con `isRefreshDue` | Unitarias (`isRefreshDue`) y hook (volver antes y después del intervalo); V9 |
| FR-021, SC-007 | La deduplicación de TanStack y la señal (cancelar al salir) | Hook (`aborted`, nunca dos en curso) e integración (10 entradas y salidas); V11 |
| FR-022, SC-009 | `gcTime: Infinity`, el `clear()` de la 001 y nada en el almacenamiento del navegador | Integración (cerrar sesión y volver a entrar); V15 |
| FR-023 | El temporizador de inactividad solo escucha las acciones de la persona | Integración (el cierre por inactividad llega con el Panel actualizándose) |
| FR-024 a FR-026, SC-006 | `toDashboardView` (`refreshFailed`, `failed`), `RefreshFailedAlert` y `ErrorState` sin botón; el reintento llega con el ciclo | Unitarias (`toDashboardView`), hook e integración (fallos con y sin datos previos); V12, V13 |
| FR-027 | El cliente HTTP (401, red, tiempo agotado, contrato) y la consulta (503, 500, 422) | API e integración con el simulador; V12, V13 |
| FR-028 a FR-030, SC-008 | `env.ts`, `ConfigErrorScreen`, `.env.example`, el README y `environment.md` | Unitarias (`parseEnv`); V16 |
| FR-031 | El cliente `subscriptions` (token solo a su origen) | API (cabecera y host); V2 |
| FR-032 a FR-034, SC-010 | D10 | Componentes con axe en cada estado y consultas por role; V17 |
| FR-036 | Notas en la spec y en `app-routes.md` de la 001 | Revisión |
| SC-002 | Una sola petición en el fragmento diferido de `home` | `npm run size` y medición manual; V2 |

## Complexity Tracking

> Solo el desvío de un DEBERÍA de la constitución, como en las features 002 y 003.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Esquema Zod escrito a mano en lugar de derivarlo del OpenAPI del servicio (constitución IV: los tipos y esquemas DEBERÍAN derivarse) | Zod es la fuente única de cada entidad (constitución II). El `/openapi.json` publicado expresa la nulabilidad con `anyOf` y trae un ejemplo de 403 equivocado. Es una sola operación con una forma sencilla | Generar tipos de TypeScript: sería una segunda fuente de verdad junto a Zod. Generar el esquema Zod desde el OpenAPI: añade una dependencia y un paso que necesita el servicio o su repositorio en CI. Mitigación: validación en la frontera, un simulador fiel al contrato y las diferencias anotadas en [contracts/dashboard-service.md](contracts/dashboard-service.md) (D4). |

## Notas para las tareas

- **Diferencias con las indicaciones técnicas del solicitante** (research D5):
  - `staleTime` de 30 s se mantiene, pero no decide el regreso a la pestaña: lo decide `refetchOnWindowFocus` con la regla del intervalo, porque con 30 s se consultaría al volver tras 30 s.
  - `gcTime` **no** usa el valor por defecto sino `Infinity`: con el valor por defecto (5 min), los datos se perderían al estar fuera del Panel más de 5 minutos, en contra de FR-022.
- **Manejador global del 403**: no se modifica. La consulta del Panel nunca le entrega un 403 porque lo convierte en el resultado `forbidden` (D6). Una prueba de integración confirma que no aparece «No tienes permiso para realizar esta acción.».
- **Pruebas existentes que cambian** porque el `h1` deja de ser el saludo (D12): `HomePage.test.tsx`, `authFlow.integration.test.tsx`, `accessFlow.test.tsx` y los E2E `access`, `session` y `responsive`.
- **Arneses con `AppEnv`**: `renderApp.tsx`, `HttpClientsProvider.test.tsx` y `env.test.ts` reciben `VITE_DASHBOARD_REFRESH_MINUTES: 5`.
- **Pruebas de visibilidad**: hay que enviar `visibilitychange` a `window`, o a `document` con `bubbles: true`. Las pruebas actuales lo envían a `document` sin `bubbles`, y TanStack no lo ve. Después, restablecer con `focusManager.setFocused(undefined)`.
- **Feature 006**: no bloquea la implementación (D17). Antes de validar SC-003 en un entorno real, `dashboard:read` debe existir y estar asignado en la API de usuarios ([quickstart.md](quickstart.md), sección 1).
- **Precisiones del diseño en la spec**: FR-009 (fecha siempre y segundos), FR-021, el escenario 9 de la User Story 3 y dos casos límite (salir del Panel cancela la consulta en curso).

## Notas de implementación

Decisiones tomadas durante `/speckit-implement` (2026-10-20) que afinan lo planeado sin cambiar los requisitos.

### Tamaño del paquete

- **Ruta de entrada** (`npm run size`, 2026-10-20): **277,4 KB gzip** (límite de 300 KB; era 276,8 KB tras la 003). La 007 suma 0,6 KB: los textos, la regla de la variable, `HomeRoute` y `AppSettingsProvider`.
- **Fragmento de `home`**: 3,3 KB gzip, con el resumen del Panel, sus componentes y el esquema; la tabla de MUI añade un fragmento de 1,3 KB (`TableCell`, que comparte con el Data Grid). `CircularProgress` ya estaba en la entrada (`PageLoader`). El Data Grid y la herramienta Token siguen en sus fragmentos diferidos: las guardas de `npm run size` pasan.

### Piezas comunes y cambios en lo existente

- **Simulador de autorización de la 003**: `createAuthorization` admite `directory` opcional. Sin él, todo token de prueba tiene todos los permisos, pero `authorizationUnavailable()` sigue dando 503; así el simulador del Panel sirve a las pruebas de hooks y componentes sin el simulador de usuarios (T020).
- **`renderWithProviders`** envuelve el árbol en `AppSettingsProvider` con 5 minutos: `accessFlow.test.tsx` pinta `appRoutes` sin `AppRuntime`, y la ruta índice (`HomeRoute`) lee la configuración.
- **`sections.roles.test.ts`** (de la 002) usaba `hasAnySectionPermission`; pasa a `hasAnythingToSee`, con las mismas expectativas.
- **E2E**: el ayudante `greeting` de `access.spec.ts` y `session.spec.ts` se llama ahora `panelHeading`, porque el `h1` ya no saluda (T045).

### Pantalla

- **Indicadores** (T037): la cuadrícula se escribe con `display: 'grid'` en `sx`, como las demás listas de definición del Backoffice, en lugar del componente `Grid` de MUI; el resultado es el pedido (tres columnas desde `sm`, una por debajo).
- **Clínicas recientes** (T038, T040): `RecentClinicsTable` lleva su propio `section` con el `h2`, para que la tabla tenga nombre por `aria-labelledby` también en su prueba aislada; `DashboardSummary` pinta el `section` de los indicadores. El DOM es el planeado.
- **Aviso sin permiso**: `DashboardPermissionNotice` es un `Alert` de MUI y, como «Sin permisos asignados», tiene `role="alert"`: se anuncia una vez al aparecer. Se corrigieron [data-model.md](data-model.md) y [contracts/app-routes.md](contracts/app-routes.md), que no decían nada.

### Consulta

- **Orden de las historias**: la US1 ya usó el intervalo como un número en `refetchInterval`, porque `noUnusedParameters` no deja el parámetro sin usar hasta la US3, que lo cambió por `refreshIntervalFor`.
- **`refetchOnReconnect: false`** queda explícito aunque TanStack 5.104.4 ya lo pone en `false` con `networkMode: 'always'` (`defaultQueryOptions`); la prueba de la red pasaba antes de escribirlo.
- **401** (T068): lo resuelve el cliente HTTP compartido; la prueba de la sesión no válida pasó sin cambios de código.
- **Pruebas con el reloj simulado** en `useDashboardSummary.refresh.test.tsx` (la línea de tiempo de la US3 y los fallos con ciclos y reintentos de la US4), como `useOperatorAccess.recheck.test.tsx`; las unitarias de `toDashboardView` siguen en `useDashboardSummary.test.tsx`.

### Lo aprendido

- **La base exacta del intervalo** es `dataUpdatedAt` (o `errorUpdatedAt` tras un fallo): TanStack rearma el temporizador en el mismo `dispatch` que fija esa hora.
- **Una consulta entera** (la petición a MSW, la respuesta y `setData`) termina dentro de un `advanceTimersByTimeAsync`: las pruebas comprueban lo que recibió el simulador, no `isFetching`.
- **El foco y la conexión** llegan a las consultas tras un `await` (`resumePausedMutations`): para afirmar que no se pidió nada hay que dar vueltas reales al bucle de eventos sin mover el reloj (`settle` y `settleUntil`).
- **Medir desde la primera respuesta en integración**: se retiene con `defer()`, se libera en un instante conocido y se espera sin mover el reloj.
- **Validar V16 a mano desde Git Bash**: Bash convierte `/proxy/subscriptions` en una ruta de Windows al pasar variables a `npm run dev`; se usa PowerShell o `.env.local`.
