# Implementation Plan: Acceso al Backoffice Solo con Rol de Sistema

**Branch**: `006-system-role-access` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-system-role-access/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Sustituye la regla de acceso de la feature 001 (una lista fija de nombres de rol: Administrator, Developer, Marketing, Billing) por el **tipo de rol** que la plataforma de usuarios ya informa en `GET /api/v1/authorization/me` desde su spec `011-role-types`: solo entra al Backoffice quien tiene al menos un rol activo de tipo 1 (Sistema), reconocido por `type.id`, nunca por nombre. Quien no cumple la regla ve una página propia, «Sin acceso» (`/access-denied`), con un único mensaje, el correo con el que inició sesión, «Cerrar sesión» (que también cierra la sesión en Auth0) y un enlace opcional a la aplicación de MailySoft para clínicas. La página tiene su propia dirección: una persona sin acceso que escriba cualquier ruta interna es llevada ahí, y una con acceso que abra esa dirección va al Panel.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Sin dependencias nuevas.** El cambio es, sobre todo, una re-cablead de reglas y rutas ya existentes (feature 001).
2. **Regla**: `evaluateAccess` (única función reutilizable, FR-004) decide con `isSystemRoleType(role.type.id)` (`auth/policy/roleTypes.ts`, que sustituye a `authorizedRoles.ts`) en vez de `isAuthorizedRoleName`. Se simplifica: `AccessDecision.denied` deja de llevar un motivo, porque ya solo hay un mensaje (D2).
3. **Errores del servicio**: un 403 o un 404 de `/me` (que la API real nunca envía hoy, pero que esta feature exige tratar como protección) se resuelven dentro de la consulta como `{kind:'denied'}`, no como un rechazo: así no entran en los reintentos de 5xx ni disparan el aviso global de «sin permiso» (D3).
4. **Ruta nueva**: `/access-denied`, de nivel superior, sin layout compartido (como hoy `/access` y `/callback`), con su propia guarda `AccessDeniedRoute`, que repite las dos comprobaciones de Auth0 de `ProtectedRoute` (precedente: `AccessPage` ya lo hace así) y lee la misma caché de `useOperatorAccess()` para decidir lo contrario que ella: muestra el contenido cuando se deniega, redirige a `/` cuando se concede (D4, D5).
5. **Enlace «Ir a MailySoft»**: variable de entorno nueva y opcional, `VITE_MAILYSOFT_APP_URL`, que llega a la página por props desde `AppSettingsProvider` a través de la nueva ruta — las features no pueden leer la configuración por sí mismas (mismo patrón que `VITE_DASHBOARD_REFRESH_MINUTES` de la 007) (D6).
6. **Mensajes**: una sección `denied` nueva y más simple; `messages.common.account` no se toca (lo sigue usando la pantalla de comprobación fallida, que esta feature no modifica) (D7).
7. **Pruebas**: el simulador del servicio de usuarios gana `type` en cada rol, con Sistema como valor por defecto para no invertir en silencio el resultado de las pruebas de integración ya existentes de usuarios, suscripciones, token y Panel (D8, con su riesgo documentado).
8. **Documentación del contrato consumido**: se escribe la versión vigente de `/authorization/me` ([contracts/users-service-me.md](contracts/users-service-me.md)), porque la de la 001 la describe como una propuesta todavía pendiente (D9).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 LTS. Sin cambios.

**Primary Dependencies**: las existentes, sin cambios: react-router 8.4.0, @tanstack/react-query 5.104.4, @auth0/auth0-react 2.28.2, @mui/material 9.5.0, zod 4.6.7.

**Ninguna nueva.**

**Storage**: N/A. Sin cambios respecto a la 001 (tokens en memoria; nada de esta feature se persiste en el navegador).

**Testing**: la infraestructura existente (Vitest 5.0.5, Testing Library, user-event, MSW 3.0.3, vitest-axe, Playwright 1.64.1). Se extienden dos simuladores ya existentes (`test/handlers/usersService.ts` y `test/handlers/usersDirectory/`, ambos construidos sobre el mismo tipo `RoleDto` de `test/factories.ts`) para que cada rol lleve `type`.

**Target Platform**: SPA de solo frontend, sin cambios (de escritorio y tablet horizontal, 1024 a 320 px, igual que la 001).

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz. Sin cambios.

**Performance Goals**: iguales a la 001 (SC-004: menos de 5 s desde que termina de identificarse hasta ver su destino, en el 95 % de los inicios de sesión). Un presupuesto de JS de entrada de 300 KB gzip o menos (constitución); esta feature añade una pantalla pequeña y una ruta más (`AccessDeniedRoute` + `AccessDeniedPage`), que entran al bundle de entrada igual que `AccessPage`/`CallbackPage` hoy (no son candidatas a carga diferida: forman parte del camino crítico de inicio de sesión).

**Constraints**:
- La API de usuarios **no se modifica** (SC-011): el contrato de `/authorization/me` ya incluye `type` por rol (spec `011-role-types` de `mailySoft-usuarios`) y ya existe en la rama principal de ese repositorio.
- La configuración de Auth0 **no se modifica** (SC-011): «Cerrar sesión» sigue volviendo a `/access`, ya registrada como URL de cierre de sesión.
- `features/auth` no puede importar `app/providers` (regla de `eslint-plugin-boundaries`); la URL del enlace llega por props, no por un hook propio de la feature.
- El código es en inglés, la documentación en español (igual que siempre); la interfaz, en español y accesible (WCAG 2.1 AA).

**Scale/Scope**: una ruta nueva (`/access-denied`), un módulo de política que sustituye a otro, una variable de entorno nueva y opcional. Sin nuevas entidades de datos propias (todo lo que usa ya existe en `PlatformUser`/`AccessRole`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.3.0 (2026-10-20). La investigación (research.md) se hizo como parte de este plan: no quedó ninguna duda abierta, así que no hay columna "Antes" distinta de "Después".

| Regla | Cómo se cumple | Cumple |
|---|---|---|
| I. Render puro; efectos solo con sistemas externos | Ningún componente nuevo lee `Date.now()`/`window` al renderizar; `AccessDeniedRoute` solo deriva de `useAuth0()`/`useOperatorAccess()`/`useAppSettings()` | ✅ |
| I. Estructura por features con límites en ESLint | `AccessDeniedRoute.tsx` vive en `app/router` (no en una feature); `roleTypes.ts` sustituye a `authorizedRoles.ts` dentro de `features/auth/policy`, sin crear ninguna feature nueva | ✅ |
| I. Sin abstracciones especulativas | No se crea un hook compartido para las 2 líneas que `ProtectedRoute` y `AccessDeniedRoute` repiten (research D4): mismo precedente que `AccessPage`, que ya guarda su propio `isLoading`/`isAuthenticated` | ✅ |
| I. Componentes pequeños, de una sola responsabilidad | `AccessDeniedRoute` (guarda) y `AccessDeniedPage` (contenido) se mantienen separados, como `ProtectedRoute`/`AppLayout` | ✅ |
| II. TypeScript estricto; Zod en la frontera | `accessRoleSchema` exige `type: {id,name}`; un rol sin tipo es un fallo de contrato, no un valor inventado (data-model.md) | ✅ |
| III. Estado de servidor en TanStack Query, sin copiarlo | `AccessDeniedRoute` lee la misma `queryKey` de `useOperatorAccess()` que `ProtectedRoute`; ninguna petición nueva, ningún estado copiado a Context o `useState` | ✅ |
| IV. Errores uniformes: 401 con el manejo de sesión; 403 sin cerrarla; red/5xx reintentables | El 401 no cambia (cliente HTTP). El 403/404 de **esta** consulta se resuelve como «sin acceso» dentro de la query (no como el 403 genérico de "sin permiso para una acción", que es de otra naturaleza: aquí no hay acción que repetir) (research D3) | ✅ |
| IV. Contratos documentados | [contracts/users-service-me.md](contracts/users-service-me.md) (vigente) y [contracts/app-routes.md](contracts/app-routes.md) | ✅ |
| IV. URL base por entorno, validada; token solo al host configurado | `VITE_MAILYSOFT_APP_URL` no es una base de API: es un enlace de salida, nunca recibe el token (ver Constraints); se valida igual (https fuera de desarrollo) pero con una regla propia (research D6) | ✅ |
| V. Autorización en un único módulo de políticas | `roleTypes.ts` es el único lugar que compara `type.id`; `evaluateAccess` es la única función que decide el acceso, sin duplicarse | ✅ |
| V. Rutas protegidas; cierre seguro (fail closed) | `/access-denied` no muestra su contenido hasta que `useOperatorAccess()` resuelve `denied`: antes de eso, carga o el error con Reintentar, nunca el mensaje de "sin acceso" a ciegas (FR-021) | ✅ |
| V. Logout cierra también Auth0; sin esto, ciclo de bloqueo | Sin cambios: `useLogout`/`LogoutButton`, reutilizados tal cual (FR-016) | ✅ |
| VI. MUI con el theme central; mensajes en el módulo único | `AccessDeniedPage` sigue usando `Container`/`Stack`/`Typography`/`Alert`/`Link` de MUI; textos nuevos en `messages.denied` | ✅ |
| VI. WCAG 2.1 AA; axe en las pantallas principales | Foco en el título al llegar (sin cambios de mecánica); axe en `AccessDeniedPage.test.tsx` (ya existe, se mantiene) | ✅ |
| VII. Test-first en lógica pura; MSW sin mockear `fetch`; doble de Auth0 | `evaluateAccess`/`roleTypes` son funciones puras con sus pruebas unitarias; los dos simuladores existentes (MSW) ganan `type`, nunca se mockea el cliente HTTP | ✅ |
| VII. Cobertura 80 % en `api`, `policy`, `schemas`, `hooks` | Los archivos que cambian ya están dentro de esas carpetas; no se añade ninguna carpeta nueva fuera de la cobertura exigida | ✅ |
| Configuración: variables `VITE_*` validadas y documentadas | `VITE_MAILYSOFT_APP_URL` en `env.ts`, `vite-env.d.ts`, `.env.example`, el README y este plan | ✅ |
| Flujo: rama de feature desde la principal, documentación en español | `006-system-role-access` (ya sigue la convención `NNN-nombre`: la rama se renombró para alinearse con el directorio de la spec, ver spec.md) | ✅ |

**Resultado**: sin violaciones de la constitución, ni antes ni después del diseño. No hace falta Complexity Tracking (sección vacía más abajo, según la plantilla).

## Project Structure

### Documentation (this feature)

```text
specs/006-system-role-access/
├── plan.md                        # Este archivo
├── research.md                    # Fase 0: D1 a D9
├── data-model.md                  # Fase 1: esquemas, tipos y configuración que cambian
├── quickstart.md                  # Fase 1: guía de validación V1 a V12
├── contracts/
│   ├── users-service-me.md        # GET /api/v1/authorization/me, versión vigente
│   └── app-routes.md              # /access-denied, su guarda y el cambio en la de ProtectedRoute
├── checklists/
│   └── requirements.md
└── tasks.md                       # Fase 2 (/speckit-tasks; no la crea este comando)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── config/
│   │   ├── env.ts                           # + VITE_MAILYSOFT_APP_URL (opcional, URL absoluta http(s))
│   │   └── env.test.ts                      # + casos de la variable nueva
│   ├── providers/
│   │   ├── AppSettingsProvider.tsx           # + mailySoftAppUrl en AppSettings
│   │   └── AppSettingsProvider.test.tsx      # + caso de mailySoftAppUrl
│   └── router/
│       ├── AccessDeniedRoute.tsx             # NUEVO: guarda de /access-denied (D4, D5)
│       ├── AccessDeniedRoute.test.tsx        # NUEVO
│       ├── ProtectedRoute.tsx                # rama 'denied' pasa a <Navigate to="/access-denied"/>
│       ├── ProtectedRoute.test.tsx           # sin cambios de fondo (no cubre 'denied')
│       ├── ProtectedRoute.denied.test.tsx    # ahora comprueba la redirección, no el contenido
│       ├── accessFlow.test.tsx               # + los casos de /access-denied con las rutas reales
│       └── routes.tsx                        # + ruta de nivel superior '/access-denied'
├── features/
│   └── auth/
│       ├── components/
│       │   ├── AccessDeniedPage.tsx          # contenido nuevo: FR-013 a FR-015; props: email, mailySoftAppUrl
│       │   └── AccessDeniedPage.test.tsx     # reescrita: un mensaje, el enlace, sin reason
│       ├── hooks/
│       │   ├── useOperatorAccess.ts          # + resolución de 403/404 como 'denied' (D3); sin reason
│       │   ├── useOperatorAccess.test.tsx    # + casos de 403/404; sin aserciones de reason
│       │   └── useOperatorAccess.recheck.test.tsx   # sin aserciones de reason
│       ├── policy/
│       │   ├── roleTypes.ts                  # NUEVO, sustituye a authorizedRoles.ts (D1)
│       │   ├── roleTypes.test.ts             # NUEVO, sustituye a authorizedRoles.test.ts
│       │   ├── evaluateAccess.ts             # decide por role.type.id (D2)
│       │   ├── evaluateAccess.test.ts        # reescrita: casos de tipo, sin reason
│       │   └── types.ts                      # AccessDecision.denied sin reason; se quita AccessDeniedReason
│       ├── schemas/
│       │   ├── myAccess.ts                   # accessRoleSchema + type (data-model.md)
│       │   └── myAccess.test.ts              # + casos de type (ausente, con id inválido)
│       └── index.ts                          # export roleTypes en vez de authorizedRoles, si algo externo lo necesitara
├── shared/
│   └── messages/
│       └── es.ts                             # messages.denied reescrito; + config.rules.mailySoftAppUrl
├── test/
│   ├── factories.ts                          # roleDto() + type por defecto Sistema (D8)
│   ├── handlers/
│   │   ├── usersService.ts                   # sin cambios de código (RoleDto ya trae type por la factoría)
│   │   └── usersDirectory/
│   │       ├── model.ts                      # DirectoryRole.typeId; accessOf() emite type (D8)
│   │       └── seed.ts                       # defaultDirectory(): typeId real por role (D8, D11)
│   └── renderWithProviders.tsx                # su AppEnv de prueba incluye VITE_MAILYSOFT_APP_URL (o su default)
└── vite-env.d.ts                              # + VITE_MAILYSOFT_APP_URL

e2e/
├── access.spec.ts                 # el bloque de cuentas denegadas: una sola alerta, URL /access-denied
└── fixtures/accounts.ts           # comentario de A6 actualizado (solo rol de Clínica, no "Owner sin autorizar")

.env.example, README.md            # la variable nueva; "Acceso" y "Estado" ya no mencionan nombres de rol
specs/001-auth-session-profile/    # nota: la regla por nombre la sustituye la 006 (FR-026)
```

**Structure Decision**: proyecto único en la raíz, sin cambios de la estructura por features (constitución I). No se crea ninguna feature nueva: todo el cambio vive en `features/auth` (la política y las pantallas de acceso) y en `app/router` (la ruta nueva y la guarda existente), con el patrón ya establecido por la feature 007 para la configuración que una ruta lee y entrega por props a su página.

### Cobertura de requisitos

| Requisito | Diseño | Verificación |
|---|---|---|
| FR-001, FR-004, FR-006 | `evaluateAccess` decide con `isSystemRoleType` y agrupa `authorizedRoles`/`permissions` igual que hoy (data-model.md) | Unitarias (`evaluateAccess.test.ts`); V1 |
| FR-002 | `roleTypes.ts`: constante `ROLE_TYPE`, comparación solo por `id` | Unitarias (`roleTypes.test.ts`, nombres intercambiados) |
| FR-003 | Comprobación explícita de `isActiveStatus` dentro de `evaluateAccess`, antes de mirar los roles | Unitarias; V4 |
| FR-005 | `evaluateAccess` no vuelve a filtrar `me.roles`: los usa tal cual llegan | Unitarias (rol ya filtrado por la API) |
| FR-007, FR-008 | Sin cambios respecto a la 001 (`ProtectedRoute`/`useOperatorAccess`); `AccessDeniedRoute` repite la misma espera (D4) | Integración (`accessFlow.test.tsx`); V5 |
| FR-009 | `ACCESS_RECHECK_INTERVAL_MS` sin cambios; la regla nueva se aplica en cada recomprobación | `useOperatorAccess.recheck.test.tsx` |
| FR-010 | `password_change_required` no se modela en el esquema (se descarta en silencio); prueba de contrato que confirma que su presencia no cambia la decisión | `myAccess.test.ts` |
| FR-011, FR-012, FR-017 | Ruta `/access-denied` sin layout; `AccessDeniedPage` con su propio `main`, foco y título (D5) | Componentes (`AccessDeniedPage.test.tsx`, axe); V2, V12 |
| FR-013, FR-014 | `AccessDeniedPage` con el mensaje único y `messages.denied.signedInAs`; `email` viene de `accountEmail` | Componentes; V2, V3 |
| FR-015 | `mailySoftAppUrl` opcional, por props desde `AppSettingsProvider` (D6) | Componentes (con y sin URL); V4 (quickstart) |
| FR-016 | `LogoutButton` reutilizado sin cambios | Componentes (ya cubierto, se mantiene); V10 |
| FR-018 a FR-021 | `ProtectedRoute` → `Navigate` a `/access-denied`; `AccessDeniedRoute` → `Navigate` a `/` o a `/access` según corresponda (D4) | Integración (`accessFlow.test.tsx`, `AccessDeniedRoute.test.tsx`); V6 a V9 |
| FR-022 | Sin cambios (cliente HTTP) | Heredado de la 001 |
| FR-023 | `resolveAccess` captura `ApiError` 403/404 y devuelve `{kind:'denied'}` (D3) | `useOperatorAccess.test.tsx` (nuevo caso); ningún caso E2E (la API real no lo produce) |
| FR-024, FR-025 | Sin cambios de mecanismo (`AccessCheckFailedPage`, reintentos); ahora también la usa `AccessDeniedRoute` | Integración; V11 |
| FR-026 | README y feature 001 actualizados (este plan, Project Structure) | Revisión |
| SC-001 a SC-004, SC-006 a SC-009 | Cubiertas por el diseño de arriba (regla, redirecciones, error) | Integración y E2E (`e2e/access.spec.ts`) |
| SC-005 | Logout completo + Auth0 pide credenciales de nuevo (sin cambios de código) | E2E (V10 de la guía) |
| SC-010 | axe en `AccessDeniedPage.test.tsx`; ancho de 1024 a 320 px (sin layout propio que lo rompa) | Componentes; E2E `responsive.spec.ts` si se añade el caso |
| SC-011 | Ningún archivo de `mailySoft-usuarios` ni de configuración de Auth0 en el diff de esta feature | Revisión del PR |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified** — no aplica: el Constitution Check no encontró ninguna.

## Notas para las tareas

- **Orden sugerido**: (1) esquema y política (`myAccess.ts`, `roleTypes.ts`, `evaluateAccess.ts`, `types.ts`) con sus pruebas unitarias; (2) `useOperatorAccess.ts` y su resolución de 403/404; (3) simuladores de prueba (`factories.ts`, `usersDirectory/model.ts`, `usersDirectory/seed.ts`) — hacerlo **antes** de tocar cualquier prueba de integración, porque el valor por defecto nuevo (D8) puede cambiar el resultado de pruebas que hoy no mencionan `type`; (4) mensajes y `AccessDeniedPage`; (5) `env.ts`/`AppSettingsProvider`/`vite-env.d.ts`/`.env.example`; (6) `AccessDeniedRoute` y `routes.tsx`; (7) `ProtectedRoute` (la rama que cambia); (8) pruebas de integración y E2E; (9) README y la nota en la 001.
- **Barrido obligatorio de `roleDto`/`directoryRole`**: tras el paso (3), ejecutar la suite completa y revisar cualquier prueba que construya un rol pensado como "no autorizado" por un nombre fuera de la lista antigua (Owner, Doctor, o cualquier nombre inventado) sin fijar su tipo: con el nuevo valor por defecto (Sistema), esas pruebas pasarían a dar acceso si no se les añade `type`/`typeId` de Clínica explícito (research D8). Candidatos ya identificados por los nombres que usan: `ProtectedRoute.denied.test.tsx` (`owner`), `useOperatorAccess.test.ts(x)` (`owner`), `evaluateAccess.test.ts` (`Owner`, `Doctor`), `accessFlow.test.tsx` si construye alguno similar.
- **`e2e/access.spec.ts`**: el array `DENIED` que itera A6/A7/A8/A9 con un mensaje por cuenta se reduce a un único mensaje (`messages.denied.message`) y gana la aserción de `page).toHaveURL(/\/access-denied$/)`.
- **No tocar**: `mailySoft-usuarios` (solo lectura), la configuración de Auth0, `RequirePermission`/`can`/`hasAnythingToSee` (ya leen `access.permissions`, que ya solo cuenta los roles de Sistema sin cambiar su propio código), `AccessCheckFailedPage` y `messages.common.account` (los reutiliza `AccessDeniedRoute` tal cual).
