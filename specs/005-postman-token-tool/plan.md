# Implementation Plan: Token de Acceso para Postman (Herramienta Temporal)

**Branch**: `005-postman-token-tool` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-postman-token-tool/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Página «Token» para las personas cuyo role tiene el permiso `token:read` (se espera que solo Administrator y Developer): al abrirla no muestra ningún token, solo sus espacios y el botón «Generar»; al pulsarlo obtiene un access token nuevo del propio SDK de Auth0, lo muestra oculto con las acciones «Mostrar», «Ocultar» y «Copiar», indica su fecha y hora de expiración y si sigue vigente (cambia a «Expirado» sola), y el botón pasa a «Refrescar», que repite el proceso. Es la herramienta que permite probar las APIs de MailySoft desde Postman con la identidad y los permisos de quien la usa. El permiso es además el único interruptor: no hay bandera por entorno.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Interruptor y política**: `token:read` decide quién la ve y si existe; el recurso `token` se añade a los del módulo de políticas y no hay variable de entorno (D1, D2). **Esto contradice hoy el principio V de la constitución, que debe enmendarse antes de implementar** (puerta de calidad, abajo).
2. **Ruta y navegación**: `/tools/postman-token` con `RequirePermission`, entrada «Token» en la navegación, título propio y pantalla perezosa que ni se pide sin permiso (D3, D4, [contracts/app-routes.md](contracts/app-routes.md)).
3. **Obtención del token**: `getAccessTokenSilently({ cacheMode: 'off' })` en cada pulsación, para que «Refrescar» entregue siempre uno nuevo; la expiración sale del claim `exp` validado con Zod y falla cerrado si no se puede leer (D5, D6, [contracts/auth0-token-request.md](contracts/auth0-token-request.md)).
4. **Estado**: un reductor local con transiciones puras, sin TanStack Query, y la caducidad en vivo con un solo temporizador (D7, D8, [data-model.md](data-model.md)).
5. **Pantalla**: el token oculto no está en el DOM, se copia sin revelarlo, la advertencia está siempre, y los fallos muestran un mensaje propio con «Reintentar» (más «Iniciar sesión de nuevo» si la sesión terminó) sin perder el token en pantalla (D9, D10, D12).
6. **Privacidad**: el token solo vive en el estado de la pantalla y se descarta al salir, recargar, cerrar sesión o perder el permiso (D11).
7. **Limpieza y alineación**: retirar `VITE_FEATURE_POSTMAN_TOKEN` del código, la configuración y la documentación de la 001, y crear `token:read` en el servicio de usuarios (D13, D16, [contracts/users-service.md](contracts/users-service.md)).
8. **Calidad**: lógica pura con prueba primero, hooks con reloj falso y doble de Auth0, componentes e integración con la aplicación completa, axe, E2E preparado y entrada de 300 KB o menos (D14, D15).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 LTS: sin cambios respecto a la 001 y la 002.

**Primary Dependencies**: las de la 001 y la 002; **ninguna nueva**. Se usan `@auth0/auth0-react` 2.28.2 (`getAccessTokenSilently` con `cacheMode`, opción comprobada en `@auth0/auth0-spa-js` 2.28.4), `@mui/material` y `@mui/icons-material` 9.5.0, `zod` 4.6.7 y `react-router` 8.4.0.

**Storage**: N/A. El token vive únicamente en el estado de la pantalla: nada en el almacenamiento del navegador, la URL, la caché de consultas ni los registros (D7, D11).

**Testing**: la infraestructura de la 001 y la 002 (Vitest 5.0.5 con jsdom, Testing Library, user-event, MSW 3.0.3 con el simulador del servicio de usuarios, vitest-axe, Playwright 1.64.1) más un ayudante `fakeAccessToken` y relojes falsos (D14). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas`, `hooks` y `shared/api|lib`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, diseñada desde 1024 px y reacomodable hasta 320 px sin desplazamiento horizontal de la página: sin cambios.

**Project Type**: Aplicación web de solo frontend, proyecto único en la raíz del repositorio: sin cambios.

**Performance Goals**: generar y copiar en menos de 30 s y con solo dos acciones (SC-001); una sola solicitud a Auth0 por pulsación, con el indicador de progreso al instante, y ninguna a las APIs de MailySoft; el paso a «Expirado» ocurre en el instante de expiración con la pestaña visible; JS de la ruta de entrada de 300 KB gzip o menos (hoy 273,6 KB) con la pantalla en un chunk perezoso.

**Constraints**: el token nunca se persiste ni se registra; el SDK no permite cancelar la solicitud y `setTimeout` no admite más de 2^31−1 ms (D8); el render no puede leer el reloj (constitución I); el permiso `token:read` no existe todavía en la API de usuarios (D16); la bandera por entorno desaparece (D1); interfaz en español y accesible (WCAG 2.1 AA).

**Scale/Scope**: herramienta interna y temporal para unas pocas personas (los roles Administrator y Developer); 1 ruta, 1 pantalla (4 componentes), 3 hooks, 1 módulo de `api` y 1 cambio de política.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.0.0 (sin enmiendas desde su ratificación). «Antes» es el estado al iniciar la investigación (⚠️ = dependía de un dato por verificar; ❌ = incumple una regla); «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; efectos solo con sistemas externos | Solo funciones y Hooks; el único efecto programa un temporizador y un listener de visibilidad (sistemas externos); la validez se deriva en el render con un reloj guardado en el estado, que solo se lee en devoluciones de llamada (D8) | ✅ | ✅ |
| I. Estructura por features con límites en ESLint | `features/postman-token` con `api/components/hooks/schemas` e `index.ts`; importa `auth` por su `index.ts` (sin ciclo: `auth` no la conoce) y `app` la carga de forma dinámica (D4) | ⚠️ | ✅ |
| I. Sin abstracciones ni memoización especulativas; componentes ≤ 250 líneas | Sin stores ni Context nuevos; cuatro componentes pequeños y tres hooks; sin `useMemo` ni `useCallback` | ✅ | ✅ |
| II. TypeScript estricto y Zod en las fronteras (incluidos los claims de tokens) | `accessTokenClaimsSchema` (solo `exp`); sin `as`; la decodificación es una función pura (D6) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; estado de UI local | El token no es estado de servidor: vive en un `useReducer` y se descarta al desmontar; se evita la caché de mutaciones, que lo retendría (D7) | ⚠️ | ✅ |
| III. Vaciar la caché al cerrar sesión; no persistirla | Ya implementado en la 001; la herramienta no usa la caché ni ningún almacenamiento (D11) | ✅ | ✅ |
| IV. Cliente HTTP único | La herramienta no llama a ninguna API de MailySoft (el token se usa en Postman); la renovación es del SDK | ✅ | ✅ |
| IV. Fechas ISO 8601 con formato solo en presentación | `expiresAt` en ISO 8601 UTC; `formatDateTime` con `Intl` (D6) | ✅ | ✅ |
| IV. Errores uniformes, sin mensajes crudos | Fallos clasificados por `kind` con textos propios; nunca el mensaje del SDK (D10) | ✅ | ✅ |
| V. Tokens en memoria; sin persistir ni registrar; sin secretos | Solo en el estado del hook; ESLint ya prohíbe `localStorage`, `sessionStorage` y `console`; el `logger` solo recibe `kind` (D11) | ✅ | ✅ |
| V. Si la renovación silenciosa falla, DEBE redirigirse a login conservando la ruta de retorno | La persona pidió el token: se muestra el mensaje y «Iniciar sesión de nuevo» redirige conservando la ruta (FR-019 y caso límite 2); lo demás sigue como en la 001 (D10) | ⚠️ | ⚠️ desvío justificado (Complexity Tracking) |
| V. Autorización en un único módulo de políticas; sin comparar roles ni permisos sueltos | `can(access, { resource: 'token', action: 'read' })` mediante `RequirePermission` y el registro de navegación; ningún componente compara nombres (D2) | ✅ | ✅ |
| V. Herramienta temporal: módulo aislado `features/postman-token`; ningún otro módulo depende de él | Módulo aislado; solo `app` lo referencia (ruta, navegación y título) | ✅ | ✅ |
| V. Herramienta temporal: **bandera `VITE_FEATURE_POSTMAN_TOKEN` apagada por defecto y activada por entorno; con la bandera apagada, ni la ruta ni el módulo se registran ni cargan** | La spec (aclaración del 2026-10-19) la sustituye por el permiso `token:read`: sin bandera; la ruta existe, pero el módulo no se carga hasta pasar la guarda y está apagada por defecto porque nadie tiene el permiso (D1) | ❌ | ⚠️ desvío justificado; **requiere enmienda** (Complexity Tracking) |
| V. «Generar» = access token del SDK con el `audience`; sin firmar tokens, sin client credentials, sin secretos | `getAccessTokenSilently({ cacheMode: 'off' })` con la configuración del proveedor (D5) | ✅ | ✅ |
| V. Token enmascarado por defecto, con mostrar, ocultar y copiar, su expiración y una advertencia; vive solo en el estado del componente | D9, D7 y D12 | ✅ | ✅ |
| VI. MUI con theme central; textos en español en un único módulo | `Paper`, `Alert`, `Chip`, `Button` y `TextField` de MUI; bloque `messages.token` en `es.ts` (D12) | ✅ | ✅ |
| VI. Estados de carga, vacío, error y éxito; las mutaciones notifican | Tabla de estados de [contracts/app-routes.md](contracts/app-routes.md); aviso al copiar | ✅ | ✅ |
| VI. Las acciones de alto impacto piden confirmación | «Refrescar» no es destructivo (el token anterior no se revoca): sin diálogo | ✅ | ✅ |
| VI. WCAG 2.1 AA, operable por teclado, diseño adaptable | `h1` con foco, texto visible igual al nombre accesible, `role="status"` para los anuncios, la vigencia en texto, una columna desde 320 px; axe en las pruebas (D12) | ⚠️ | ✅ |
| VII. Pruebas en el mismo PR; lógica pura primero; MSW y doble de Auth0; deterministas | Relojes falsos, `fakeAccessToken` y `grant`/`revoke` en el simulador (D14) | ✅ | ✅ |
| VII. Cobertura de 80 % en las capas definidas; E2E cuando exista entorno | Las carpetas nuevas cuentan para el umbral; `e2e/token.spec.ts` se omite sin cuentas | ✅ | ✅ |
| Stack: dependencias mínimas, licencias permisivas | Ninguna dependencia nueva | ✅ | ✅ |
| Configuración: variables `VITE_*` validadas y documentadas | Se **elimina** `VITE_FEATURE_POSTMAN_TOKEN` (parte del mismo desvío) del esquema, `.env.example` y `README.md`; ninguna variable nueva (D13) | ⚠️ | ⚠️ misma enmienda |
| Rendimiento: `React.lazy`, 300 KB, `logger` y boundaries | Pantalla perezosa que no se pide hasta pasar la guarda; sin dependencias; `npm run size` (D15) | ✅ | ✅ |
| Flujo: spec y plan antes del código; rama de feature; documentación en español | Spec clarificada y plan hechos; la rama `005-postman-token-tool` no existe todavía en git (ver abajo) | ⚠️ | ⚠️ acción previa |

**Resultado**: sin violaciones sin justificar. Hay **un desvío de un DEBE de la constitución V** (la bandera por entorno), decidido por el responsable del proyecto y justificado en Complexity Tracking; como es permanente mientras exista la herramienta, la gobernanza exige convertirlo en enmienda. Hay además un matiz menor sobre la renovación fallida, también justificado.

### Acciones previas a implementar

1. **Enmendar la constitución** con `/speckit-constitution` (principio V y «Configuración y secretos»; texto propuesto y versión MINOR 1.1.0 en [research.md](research.md) D1). **Bloquea `/speckit-implement`**: sin ella `/speckit-analyze` marcaría el conflicto como crítico.
2. **Crear la rama `005-postman-token-tool`**: hoy los cambios de la spec y de este plan están sin confirmar en `002-manage-users`.
3. **Crear y asignar `token:read` en el servicio de usuarios** ([contracts/users-service.md](contracts/users-service.md)). No bloquea el desarrollo (las pruebas usan el simulador), pero sin él la herramienta no la ve nadie al validar de punta a punta.
4. **Alinear la documentación de la 001** (D13), en las tareas de esta feature.

## Project Structure

### Documentation (this feature)

```text
specs/005-postman-token-tool/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── app-routes.md
│   ├── auth0-token-request.md
│   └── users-service.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Solo lo que añade o cambia la 005; el resto de la estructura es la de la 001 ([../001-auth-session-profile/plan.md](../001-auth-session-profile/plan.md)) y la 002.

```text
src/
├── app/
│   ├── config/env.ts                    # − VITE_FEATURE_POSTMAN_TOKEN y su ayudante `flag` (+ env.test.ts)
│   ├── navigation/sections.ts           # registra la sección Token (id token, /tools/postman-token, recurso token)
│   ├── router/routes.tsx                # ruta /tools/postman-token con RequirePermission y la pantalla perezosa
│   └── layouts/useRouteAccessibility.ts # clave de título nueva (token)
├── features/
│   ├── auth/policy/permissions.ts       # SECTION_RESOURCES + 'token' (y su comentario)
│   └── postman-token/
│       ├── api/                         # requestAccessToken, decodeAccessToken, tokenFailure (TokenRequestError, classifyTokenError)
│       ├── components/                  # TokenPage, TokenValue, TokenExpiry, TokenFailureAlert
│       ├── hooks/                       # tokenReducer, useAccessToken, useExpiryTimer, useCopyToken
│       ├── schemas/                     # accessToken (accessTokenClaimsSchema e IssuedToken)
│       └── index.ts                     # TokenPage; solo lo importa `app`, de forma dinámica
├── shared/
│   └── messages/es.ts                   # bloque token, nav.sections.token y titles.token; − config.rules.flag
├── test/
│   ├── accessToken.ts                   # fakeAccessToken({ exp }): JWT de tres partes para las pruebas
│   └── renderApp.tsx                    # − VITE_FEATURE_POSTMAN_TOKEN del entorno de prueba
└── vite-env.d.ts                        # − VITE_FEATURE_POSTMAN_TOKEN
e2e/token.spec.ts                        # recorrido crítico (se omite sin variables E2E_*)
.env.example, README.md                  # − VITE_FEATURE_POSTMAN_TOKEN
```

Pruebas existentes que se actualizan: `src/features/auth/policy/permissions.test.ts` y `src/app/navigation/sections.roles.test.ts` (ya no son tres recursos de sección), `src/app/config/env.test.ts` y `src/app/providers/HttpClientsProvider.test.tsx` (sin la variable). Documentación de la 001 que se alinea: `spec.md`, `contracts/app-routes.md`, `contracts/environment.md` y `data-model.md` (D13).

**Structure Decision**: se mantiene el proyecto único y la regla `app → features → shared`. `features/postman-token` es autosuficiente salvo dos funciones de `auth` que importa por su `index.ts` (no hay ciclo); la capa `app` solo la referencia en la ruta, el registro de navegación y los títulos. El permiso se decide con el módulo de políticas existente (`can`), no con una bandera. Las pruebas van junto al código y el ayudante del token en `src/test/`.

### Cobertura de requisitos

| Requisito | Diseño | Verificación |
|---|---|---|
| FR-001, FR-002, FR-004 | Recurso `token` en `SECTION_RESOURCES`; `getVisibleSections`; `RequirePermission` (D2, D3) | Unitarias (`can`, `getVisibleSections`) e integración; V1 |
| FR-003 | La guarda de la 001 no renderiza nada hasta resolver el acceso; sin permiso no hay solicitud | Integración; V2 |
| FR-005 | `RequirePermission` redirige a `/` con el aviso y no renderiza la pantalla (D3) | Integración; V2 |
| FR-006, SC-009 | Sin variable de entorno; el permiso es el único interruptor (D1, D13) | Unitarias (`env.test.ts` sin la variable); V10 |
| FR-007, FR-008 | Token del SDK a nombre de la persona; ningún control para otras identidades ni credenciales de aplicación | Hooks con el doble de Auth0; componentes; V5 |
| FR-009 | `TokenPage` en estado inicial; ninguna solicitud al abrir | Componentes (el doble no se llama); V3 |
| FR-010 | `useAccessToken` y `TokenValue`: oculto por defecto, el valor ausente del DOM (D9) | Hooks y componentes; V4 |
| FR-011 | `useCopyToken` copia el valor real sin revelarlo; avisa si falla | Componentes (éxito y fallo con portapapeles falso); V5, V11 |
| FR-012 | `TokenExpiry`: `formatDateTime` y `Chip` de vigencia | Componentes; V4 |
| FR-013, SC-007 | Reloj `now` del reductor y `useExpiryTimer` (D8): «Expirado» sin recargar y sin «Copiar» | Reductor, hooks con reloj falso y componentes; V8 |
| FR-014 | `primaryAction` derivado de `token === null` | Componentes; V4 |
| FR-015, SC-008 | `cacheMode: 'off'` (D5); `tokenReducer` reemplaza el token y lo oculta | Hooks y componentes; V6 |
| FR-016 | Botón con `loading` y guarda en el reductor | Hooks (doble clic = una llamada); V4 |
| FR-017 | `Alert` con `role="note"` siempre presente | Componentes y axe; V3, V14 |
| FR-018, SC-005 | Estado local; sin almacenamiento; `useReloadOnBfcacheRestore` (D11) | Integración (salir y volver, permiso retirado); V7, V9 |
| FR-019 | `classifyTokenError` y `TokenFailureAlert`; el reductor conserva el token | Unitarias y componentes; V12, V13 |
| FR-020, SC-006 | Módulo aislado; los cambios fuera de él son pequeños (D13) | Suite completa; V10 |
| SC-001, SC-002 | Dos acciones; token válido del SDK | Manual (V5) |
| SC-003, SC-004 | Guarda por permiso | Integración; V1, V2 |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Bandera por entorno sustituida por el permiso `token:read` (constitución V, «Herramienta temporal» y «Configuración y secretos»: DEBE existir `VITE_FEATURE_POSTMAN_TOKEN`, apagada por defecto y activada por entorno; con ella apagada, ni la ruta ni el módulo se registran ni cargan) | El responsable del proyecto decidió (aclaración del 2026-10-19) que la herramienta se active y desactive solo con datos, asignando o quitando `token:read` en la API de usuarios, sin depender de desarrollo, QA o producción y sin desplegar (FR-006, SC-009) | Mantener la bandera además del permiso: dos interruptores que pueden contradecirse y una decisión ignorada. Dejar solo la bandera: es lo que la spec reemplazó. Mitigación: módulo aislado y sin dependientes; la pantalla es un chunk que no se pide hasta pasar `RequirePermission`; apagada por defecto (el permiso no existe); retirarla es quitar el permiso y borrar el módulo, la ruta y la entrada. **Al ser permanente, se resuelve con una enmienda de la constitución (propuesta en [research.md](research.md) D1) antes de implementar.** |
| Fallo de renovación del token en la pantalla Token: se muestra el mensaje con «Reintentar» e «Iniciar sesión de nuevo» en lugar de redirigir de inmediato a login (constitución V: DEBE redirigirse a login conservando la ruta de retorno) | La spec (caso límite 2 y FR-019) pide un mensaje con reintento o nuevo inicio de sesión y conservar el token en pantalla si falla «Refrescar»; una redirección automática lo descartaría | Redirigir siempre: pierde el token en pantalla y el reintento de un fallo pasajero (un `TimeoutError` del SDK también se clasifica como sesión terminada). Mitigación: «Iniciar sesión de nuevo» usa el cierre de sesión de la 001 y conserva la ruta de retorno; las renovaciones en segundo plano y los `401` siguen redirigiendo solos. |
