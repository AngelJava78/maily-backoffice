# Implementation Plan: Acceso, Sesión y Perfil del Usuario

**Branch**: `001-auth-session-profile` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-auth-session-profile/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Primera feature del Backoffice y base de las demás: crea el proyecto (SPA con React y TypeScript sobre Vite) e implementa el acceso con Auth0 (Authorization Code con PKCE, tokens solo en memoria), la autorización del operador a partir del servicio de usuarios (consulta del servicio sobre la propia persona: usuario, roles activos y sus permisos, de los que cuentan los de los roles autorizados Administrator, Developer, Marketing y Billing), la navegación y las acciones según permisos, el perfil de solo lectura, el cierre de sesión (también en otras pestañas), la recomprobación del acceso cada 5 minutos y al volver a la pestaña, y el cierre por 15 minutos de inactividad con aviso previo.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Fundación del proyecto**: scaffold con Vite, TypeScript estricto, ESLint y Prettier, CI, validación del entorno con Zod, tema MUI, módulo de mensajes en español, `logger`, cliente HTTP único y proxy de desarrollo.
2. **Autenticación y rutas**: `Auth0Provider` (PKCE, memoria, refresh tokens con respaldo por iframe), router de datos de React Router 8, rutas públicas (`/access`, `/access/idle`, `/callback`) y una guarda que no muestra nada protegido hasta conceder el acceso.
3. **Resolución de acceso**: una sola consulta al servicio de usuarios sobre la propia persona (`GET /api/v1/authorization/me`: usuario, roles activos y sus permisos) en una query de TanStack Query, evaluada por una función pura y consultada solo mediante `can()`. La consulta está pendiente de implementar en el servicio (solicitud en [contracts/users-service-me-request.md](contracts/users-service-me-request.md)); mientras tanto se prueba con MSW.
4. **Pantallas**: layout con navegación por permisos, página principal, perfil, acceso denegado, comprobación fallida y página no encontrada.
5. **Ciclo de vida de la sesión**: recomprobación periódica, cierre por inactividad (`react-idle-timer`), cierre voluntario con aviso entre pestañas y retorno a la pantalla de origen.
6. **Calidad**: pruebas de lógica pura, componentes e integración con MSW y un doble de Auth0, accesibilidad con axe, presupuesto de bundle y E2E preparado para cuando exista un entorno de pruebas de Auth0.

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 LTS (`.nvmrc` = `24`, instalado 24.22.0). Versiones verificadas el 2026-10-17 (D1 de la investigación).

**Primary Dependencies**: Vite 8.3.4, react-router 8.4.0, @tanstack/react-query 5.104.4, @auth0/auth0-react 2.28.2, @mui/material y @mui/icons-material 9.5.0 (con Emotion), zod 4.6.7, react-idle-timer 5.7.3. Data Grid 9.15.0 y React Hook Form llegan con la feature 002.

**Storage**: N/A. Sin persistencia de datos propios: los tokens viven en memoria. El SDK de Auth0 guarda por sí mismo la transacción de login en `sessionStorage` y una cookie indicadora de sesión (no son tokens). La única escritura propia es la ruta de retorno tras un cierre por inactividad (ver Complexity Tracking).

**Testing**: Vitest 5.0.5 con jsdom, React Testing Library, user-event, jest-dom, MSW 3.0.3, vitest-axe; Playwright 1.64.1 para E2E (omitido sin entorno de Auth0 de pruebas). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas`, `hooks` y `shared/api|lib`.

**Target Platform**: SPA estática en navegadores de escritorio actuales (las dos últimas versiones estables de Chrome, Edge, Firefox y Safari), diseñada y probada desde 1024 px de ancho; hasta 320 px el contenido se reacomoda sin desplazamiento horizontal y no hay experiencia móvil específica (FR-022, D20); desarrollo en Windows con Node 24.

**Project Type**: Aplicación web de solo frontend, proyecto único en la raíz del repositorio (los servicios viven en otros repositorios).

**Performance Goals**: página principal en menos de 5 s desde que termina la identificación en el 95 % de los casos (SC-001), con una sola llamada de acceso; si el servicio de usuarios no responde, el aviso de fallo aparece en 27 s como máximo (3 intentos de 8 s con esperas de 1 y 2 s; tope de 30 s, SC-011); JS de la ruta de entrada de 300 KB gzip o menos; recomprobación sin bloquear la interfaz.

**Constraints**: tokens solo en memoria y sin secretos en el cliente; el servicio de usuarios exige un token de acceso válido y un permiso en cada operación (salvo la consulta `me`, que solo pide token y está pendiente de implementar) y su CORS es opcional (proxy de Vite en desarrollo); 15 minutos de inactividad con aviso a los 14; recomprobación cada 5 minutos y al regresar a la pestaña; determinación del acceso con tope de 30 s hasta mostrar el fallo; interfaz en español, accesible (WCAG 2.1 AA) y fluida de 1024 a 320 px; de Auth0 solo se leen el `sub` y, para las pantallas de acceso denegado y de comprobación fallida, el correo (el resto de los datos viene del servicio de usuarios); sin `console.*` ni datos personales en logs.

**Scale/Scope**: herramienta interna de decenas de operadores; 7 pantallas (acceso, acceso con aviso de inactividad, callback, principal, perfil, acceso denegado o comprobación fallida, no encontrada) y un diálogo de aviso de inactividad.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.0.0. "Antes" es el estado al iniciar la investigación (⚠️ = dependía de un dato por verificar); "Después", tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Solo componentes de función y un único Error Boundary de clase | `shared/ui/ErrorBoundary` (clase, reutilizable) para proveedores y raíz; las rutas usan la propiedad `ErrorBoundary` de React Router con funciones (D5), en la ruta raíz y en cada ruta de página (T139) | ✅ | ✅ |
| I. Render puro; efectos solo con sistemas externos | Efectos limitados a: temporizador de inactividad y ubicación, canal entre pestañas, `pageshow`, foco y título por ruta | ✅ | ✅ |
| I. Estructura por features con límites en ESLint | `app`, `features/{auth,users,profile,home}`, `shared`; `eslint-plugin-boundaries` (D18) | ✅ | ✅ |
| I. Sin abstracciones ni memoización especulativas | Sin stores globales; Context solo para tema, notificaciones, Query, Auth0 y clientes HTTP | ✅ | ✅ |
| II. TypeScript estricto y Zod en las fronteras | Esquemas Zod para entorno, respuestas del servicio, reclamaciones del token (`sub` y correo), rutas de retorno y parámetros de URL; DTO a dominio en `api` ([data-model.md](data-model.md)) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; vaciar caché al cerrar sesión | Query `accessKeys.operator(sub)`; `queryClient.clear()` en el cierre; caché sin persistir (D8, D10) | ✅ | ✅ |
| IV. Cliente HTTP único, bases por entorno, token solo a hosts configurados | `createHttpClient` en `shared/api`; URLs por `VITE_*`; reintentos de lectura ≤ 2 (D12) | ✅ | ✅ |
| IV. Contratos documentados; tipos desde OpenAPI (DEBERÍA) | [contracts/users-service.md](contracts/users-service.md); esquemas Zod a mano para 3 lecturas, reevaluar en la 002 (D12) | ⚠️ | ✅ |
| IV. Sin sondeo de operaciones largas | No hay 202 ni seguimiento de operaciones; la recomprobación es revalidación de datos (D8) | ✅ | ✅ |
| V. SPA con PKCE, sin secretos, tokens en memoria, rotación | Parámetros y ajustes de Auth0 en [contracts/auth0-configuration.md](contracts/auth0-configuration.md) (D6) | ⚠️ | ✅ |
| V. Logout cierra también Auth0 y limpia estado; fallo de renovación vuelve a login con ruta | D10 y D11; avisos en [contracts/app-routes.md](contracts/app-routes.md) | ⚠️ | ✅ (excepción en Complexity Tracking) |
| V. Rutas protegidas, cierre seguro; autorización en un único módulo | Guarda por estados; `can()` y `AUTHORIZED_ROLE_NAMES` solo en `features/auth/policy` (D7, D13) | ✅ | ✅ |
| V. Sin datos personales ni tokens en logs; HTTPS fuera de desarrollo | `logger` único; validación del entorno exige `https` en producción | ✅ | ✅ |
| VI. MUI con theme central, mensajes en español en un módulo, WCAG 2.1 AA | `app/theme`, `shared/messages/es.ts`, pruebas con axe, foco y título por ruta; diseño adaptable «escritorio primero» (FR-022, D20) | ✅ | ✅ |
| VI. Estados de carga, vacío, error y éxito | Guarda de rutas y pantallas de [contracts/app-routes.md](contracts/app-routes.md) | ✅ | ✅ |
| VII. Pruebas con el mismo PR, primero en lógica pura, MSW y doble de Auth0 | D15; `Auth0Context.Provider` como doble centralizado | ✅ | ✅ |
| VII. Cobertura de 80 % en capas definidas; E2E cuando exista entorno | `coverage.include` por capas; E2E omitido sin `E2E_*` (D15) | ✅ | ✅ |
| Stack: dependencias mínimas y licencias permisivas | Solo se instala lo que usa la 001; `axe-core` es MPL-2.0 | ⚠️ | ✅ (justificada) |
| Configuración: variables `VITE_*` validadas con Zod y `.env.example` | [contracts/environment.md](contracts/environment.md) | ✅ | ✅ |
| Rendimiento: `React.lazy` con `Suspense`, presupuesto de 300 KB, `logger` y boundaries | D5, D16; boundaries global y por ruta | ✅ | ✅ |
| Flujo: spec y plan antes del código, puertas de CI, idioma | CI en D17; documentación en español y código en inglés | ✅ | ✅ |

**Resultado**: sin violaciones sin justificar antes ni después del diseño. Dos entradas en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-session-profile/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── app-routes.md
│   ├── auth0-configuration.md
│   ├── environment.md
│   ├── users-service.md
│   └── users-service-me-request.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.nvmrc  .env.example  .prettierrc
eslint.config.js  index.html  package.json  vite.config.ts  playwright.config.ts
tsconfig.json  tsconfig.app.json  tsconfig.node.json
scripts/check-entry-size.mjs   # mide el JS de la ruta de entrada (presupuesto de 300 KB gzip)
.github/
├── workflows/ci.yml
└── dependabot.yml
src/
├── main.tsx
├── app/
│   ├── App.tsx              # y ConfigErrorScreen.tsx (error de configuración al arrancar)
│   ├── providers/           # Auth0Provider, QueryClientProvider, ThemeProvider, notificaciones, clientes HTTP
│   ├── router/              # routes.tsx, router.ts, ProtectedRoute, RouteErrorBoundary
│   ├── layouts/             # AppLayout: encabezado, navegación, Outlet
│   ├── navigation/          # sections.ts: registro de secciones implementadas
│   ├── config/              # env.ts (Zod)
│   ├── theme/               # theme.ts
│   └── pages/               # NotFoundPage
├── features/
│   ├── auth/
│   │   ├── api/             # authorizationApi: consulta `me` del servicio de usuarios
│   │   ├── components/      # AccessPage, CallbackPage, AccessDeniedPage, AccessCheckFailedPage, IdleWarningDialog, SessionLifecycle, LogoutButton
│   │   ├── config/          # session.ts: constantes de sesión (15 min, 1 min y 5 min)
│   │   ├── hooks/           # useOperatorAccess, useOperatorIdentity, useLogout, useSessionLifecycle, useSessionExpiry, useSessionEndedListener
│   │   ├── policy/          # authorizedRoles, evaluateAccess, can, RequirePermission
│   │   ├── schemas/         # operatorClaims (`sub` y correo del token), myAccess (respuesta de `me`)
│   │   ├── session/         # returnPathStorage, tokenErrors, expiredState
│   │   └── index.ts
│   ├── users/               # schemas/ (PlatformUser, UserStatus), index.ts
│   ├── profile/             # ProfilePage, index.ts
│   └── home/                # HomePage, index.ts
├── shared/
│   ├── api/                 # httpClient, timeout, ApiError, retry, httpClientsContext
│   ├── lib/                 # logger, sessionChannel, safeReturnPath
│   ├── messages/            # es.ts: único módulo de textos
│   └── ui/                  # ErrorBoundary, PageLoader, ErrorState, Notifications, useFocusOnMount
└── test/                    # setup, servidor MSW, manejadores, renderWithProviders, doble de Auth0, factorías
e2e/                         # specs de Playwright (se omiten sin variables E2E_*)
```

**Structure Decision**: proyecto único en la raíz, sin monorepo ni carpeta `frontend/`, porque el repositorio contiene solo la SPA y los servicios viven en otros repositorios (constitución, Alcance). La estructura por features con `shared/` y `app/` y las dependencias `app → features → shared` siguen la constitución I. Las pruebas unitarias y de componentes van junto al código (`*.test.ts(x)`) y la infraestructura común en `src/test/`; los E2E, en `e2e/`.

### Cobertura de requisitos

| Requisito | Diseño | Verificación |
|---|---|---|
| FR-001 | Guarda `ProtectedRoute`; solo `/access`, `/access/idle` y `/callback` son públicas | Componentes; V1 |
| FR-002 | Inicio de sesión por redirección a Auth0 (PKCE); la app no tiene campos de contraseña | Componente; V2 |
| FR-003, FR-004 | `useOperatorAccess` (una llamada `me`, D7) y `evaluateAccess` con motivos; las pantallas de acceso denegado y de comprobación fallida muestran el correo de la cuenta (D14) | Unitarias de la función pura; MSW; V7 |
| FR-005, FR-006 | Estado `failed` con `AccessCheckFailedPage`; indicador mientras se resuelve; cada intento tiene un presupuesto de 8 s y hay como máximo 3, así que el fallo aparece a los 27 s o antes | MSW con 500 y con una respuesta que no llega, reloj simulado; V8, V18 |
| FR-007 | `appState.returnTo` y `onRedirectCallback` | Componente; V2 |
| FR-008, FR-009 | `AppLayout` (solo pantallas con acceso concedido) y `app/navigation/sections.ts` filtrado con `can()` | Componentes con secciones de ejemplo; V4 |
| FR-010, FR-011 | `useLogout`, `sessionChannel`, `pageshow`, caché vaciada | Unitarias y componentes; V10, V11 |
| FR-012 | `ProfilePage` de solo lectura con los datos del usuario de MailySoft (nombre, apellido paterno, apellido materno, correo, iniciales y roles; sin imagen: D14) | Componente; V13 |
| FR-013 | `tokenErrors` convierte `login_required` y afines en `SessionExpiredError`; `useSessionExpiry` anota el aviso en la ubicación y cierra la sesión local; la guarda redirige a `/access` con `notice: 'expired'` y `returnTo` | Integración con doble de Auth0; V15 |
| FR-014 | `ApiError` 403 se traduce en notificación sin cerrar sesión | Unitaria y componente |
| FR-015 | Avisos `cancelled` e `idpError` en `/access` | Componente |
| FR-016 | `NotFoundPage` | Componente; V14 |
| FR-017, FR-018 | `can()` y `SectionDefinition`; el aviso se evalúa sobre `users`, `subscriptions` y `tenants` | Unitarias; V5, V16 |
| FR-019, FR-021 | `refetchInterval` de 5 min y foco `always`; la guarda reacciona al cambio | Reloj simulado; V9 |
| FR-020 | `react-idle-timer` con aviso a los 14 min y cierre a los 15 | Reloj simulado; V12 |
| SC-001 | Una sola llamada de acceso | Prueba de integración (conteo de solicitudes); medición en E2E |
| SC-002, SC-003, SC-004 | Denegado sin contenido; cierre y Atrás; retorno tras vencimiento | Componentes; E2E cuando exista entorno |
| SC-005 | Cerrar sesión y perfil en el encabezado | Componente |
| SC-006 | Mensaje y acción de continuidad en cada fallo | Componentes |
| SC-007, SC-009 | Permisos de cada role y retiro de acceso en recomprobación | Pruebas con secciones de ejemplo, la matriz de roles del quickstart (T141) y reloj simulado |
| SC-008 | Cierre a los 15 min con aviso previo | Reloj simulado |
| FR-022, SC-010 | Diseño fluido (contenedor con ancho máximo, `flexWrap`, `overflowWrap`) sin anchos fijos, de 1024 a 320 px (D20) | Playwright a 1024×768 y 320×640 (T140); V17 |
| SC-011 | Presupuesto de 8 s por intento y como máximo 3 intentos (`runWithTimeout`) | Reloj simulado (T057, T086); V18 |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dependencia de desarrollo `axe-core` (MPL-2.0), que no es una licencia permisiva de la lista (MIT, Apache-2.0, BSD, ISC) | La constitución VI exige verificaciones automáticas con axe en las pruebas de las pantallas principales | No hay un motor de accesibilidad permisivo equivalente: `vitest-axe`, `jest-axe` y herramientas como Lighthouse se apoyan en axe-core. Es solo de pruebas, no se incluye en el bundle ni se distribuye, y no se modifica (las obligaciones de MPL aplican a archivos modificados que se distribuyen). |
| Uso de `sessionStorage` (la constitución V solo permite guardar preferencias de UI no sensibles) para la ruta de retorno tras un cierre por inactividad | FR-020 exige volver a la pantalla donde estaba tras identificarse de nuevo, y el cierre de Auth0 es una navegación completa que borra la memoria | Estado en memoria: se pierde en la redirección. Ruta en la query de `returnTo`: depende de cómo Auth0 compare las URL de cierre permitidas (no verificado). No restaurar: incumple FR-020. Mitigación: solo `pathname` y parámetros permitidos (`page`, `page_size`, `sort`), sin texto libre, por pestaña, leído y borrado una sola vez; el cierre voluntario no guarda nada. |
