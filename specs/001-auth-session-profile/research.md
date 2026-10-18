# Investigación (Fase 0): Acceso, Sesión y Perfil del Usuario

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Resuelve los puntos abiertos del Technical Context y fija las decisiones de diseño. Versiones, licencias y compatibilidades se consultaron en el registro de npm, en el código publicado de cada paquete y en su documentación el 2026-10-17; el `package-lock.json` fijará las versiones exactas al crear el proyecto. Las versiones mayores recientes (React Router 8, MUI 9, MSW 3, Vitest 5, TypeScript 6) se confirmaron solo en lo que usa este plan: la implementación DEBE contrastar el resto con su documentación antes de codificar.

## D1. Versiones y compatibilidad (verificado)

| Paquete | Versión | Licencia | Notas |
|---|---|---|---|
| Node.js / npm | 24.22.0 LTS (Krypton) / 11.19.1 | n/a | `.nvmrc` = `24`; `engines.node` = `>=24.15.0` (lo exige jsdom 30). Versión instalada en esta máquina. |
| react, react-dom | 19.3.1 | MIT | Compatible con `@auth0/auth0-react` (peer `^19.2.1`). |
| react-router | 8.4.0 | MIT | Paquete único (sin `react-router-dom`); peer `react >=19.2.7`. |
| @tanstack/react-query | 5.104.4 | MIT | |
| @auth0/auth0-react | 2.28.2 | MIT | Exporta `Auth0Context` (doble de pruebas, ver D15). |
| @mui/material, @mui/icons-material | 9.5.0 | MIT | Con `@emotion/react` 11.14.0 y `@emotion/styled` 11.14.1. |
| @mui/x-data-grid | 9.15.0 | MIT | Llega con la feature 002; NO se instala en la 001. El tag `latest` sigue en 8.29.5 (peer solo hasta Material 7): se instala `9.15.0` de forma explícita (peer `@mui/material ^7.3 \|\| ^9`). |
| zod | 4.6.7 | MIT | |
| react-idle-timer | 5.7.3 | MIT | Sin dependencias (ver D9). |
| vite, @vitejs/plugin-react | 8.3.4, 6.1.2 | MIT | El plugin exige `vite ^8`. |
| typescript | ~6.0.3 | Apache-2.0 | No la 7.0.2 (ver D2). |
| vitest, @vitest/coverage-v8 | 5.0.5 | MIT | Con jsdom 30.1.3. |
| @testing-library/react, /dom, /user-event, /jest-dom | 16.3.3, ^10, 14.6.8, 7.0.1 | MIT | RTL y jest-dom exigen `@testing-library/dom` 10. |
| msw | 3.0.3 | MIT | Importaciones `msw/http` y `msw/node` (ver D15). |
| vitest-axe, axe-core | 0.1.0, 4.14.0 | MIT, **MPL-2.0** | axe-core no es permisiva: ver Complexity Tracking. |
| @playwright/test | 1.64.1 | Apache-2.0 | E2E diferido (D15). |
| eslint, @eslint/js | 10.13.0, 10.0.1 | MIT | Con `overrides` para `jsx-a11y` (ver D3). |
| typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, eslint-plugin-boundaries | 8.71.2, 7.1.1, 6.10.2, 7.2.0 | MIT | |
| prettier, globals | 3.9.10, 17.13.0 | MIT | |
| @types/react, @types/react-dom, @types/node | 19.3.0, 19.3.0, ^24 (24.19.2) | MIT | `@types/node` 24 para coincidir con el runtime. |

Decisión de dependencias: la 001 instala solo lo que usa (React, Router, Query, Auth0, MUI núcleo e iconos, Zod, react-idle-timer). React Hook Form + `@hookform/resolvers` 5.9.2 (compatible con Zod 4) y Data Grid llegan con la 002, la primera con formularios y listados.

## D2. TypeScript 6.0.x en lugar de 7.0.2

- **Decisión**: `typescript@~6.0.3`.
- **Razón**: `typescript-eslint` 8.71.2 declara `typescript >=4.8.4 <6.1.0`; TypeScript 7.0.2 es hoy `latest` pero el lint con tipos (exigido por la constitución: sin `any`) no lo soporta todavía (existe un canary 8.71.3-alpha).
- **Alternativas**: TypeScript 7 sin lint con tipos (descartada: debilita la puerta de calidad); esperar. Revisar cuando `typescript-eslint` publique soporte estable.

## D3. ESLint 10 con `overrides` para `jsx-a11y`

- **Decisión**: ESLint 10.13.0, config plana, y en `package.json` un `overrides` que fuerce el peer `eslint` de `eslint-plugin-jsx-a11y` al ESLint raíz.
- **Evidencia**: prueba en un directorio temporal (ESLint 10.13.0 + jsx-a11y 6.10.2 + react-hooks 7.1.1 + typescript-eslint 8.71.2 + TypeScript 6.0.3) sobre un archivo con tres fallos deliberados: se detectaron `rules-of-hooks`, `alt-text`, `click-events-have-key-events` y `no-static-element-interactions`. El rango de peer de `jsx-a11y` solo llega a ESLint 9.
- **Riesgo**: soporte no oficial; CI de lint lo detecta si una versión menor lo rompe. **Respaldo**: ESLint 9.39.5 (tag `maintenance`), con todos los plugins soportados.

## D4. MUI Material 9.5.0 y MUI X Data Grid 9.15.0

- **Decisión**: Material y iconos 9.5.0; Data Grid community 9.15.0 cuando llegue la 002. Localización con `esES` (`@mui/material/locale`; el paquete de Data Grid, en la 002). Estilos solo con el sistema de MUI y un theme central (`src/app/theme/`).
- **Razón**: 9.15.0 declara peer `@mui/material ^7.3 || ^9` y está publicado como estable; la línea 8.x (`latest`) exige Material ≤ 7.
- **Alternativa**: Material 7.3.11 + Data Grid 8.29.5 (también estable); descartada por quedar una versión mayor atrás desde el inicio.

## D5. Enrutado: React Router 8 en modo de datos y división por ruta

- **Verificado en la documentación 8.4.0**: `createBrowserRouter` se importa de `react-router`; `RouterProvider` de `react-router/dom` (la documentación lo recomienda para entornos DOM); las rutas usan `Component` y `ErrorBoundary` (no `errorElement`); el error se lee con `useRouteError` e `isRouteErrorResponse`.
- **Decisión**: `createBrowserRouter` a nivel de módulo (así `onRedirectCallback` de Auth0 puede llamar a `router.navigate`), un `ErrorBoundary` en la ruta raíz (layouts y proveedores) y otro en cada ruta de página, para que el error de una página se muestre dentro del layout sin perder el encabezado ni el cierre de sesión (constitución: global y por ruta); páginas cargadas con `React.lazy` y un único `Suspense` alrededor del `Outlet`, como fija la constitución.
- **Alternativa**: la propiedad `lazy` de las rutas (paraleliza con loaders). Descartada: no hay loaders (los datos van por TanStack Query) y la constitución fija la técnica.

## D6. Auth0: parámetros del SDK y persistencia de sesión

- **Parámetros** (detalle en [contracts/auth0-configuration.md](contracts/auth0-configuration.md)): flujo Authorization Code con PKCE; `cacheLocation: 'memory'` (explícito); `useRefreshTokens: true` con `useRefreshTokensFallback: true`; `legacySameSiteCookie: false`; alcance `openid email offline_access` (de Auth0 se leen el `sub` y el correo, D14); `audience` obligatorio.
- **Defaults verificados en el código del SDK**: `cacheLocation` = `memory`; `useRefreshTokens` = `false`; `useRefreshTokensFallback` = `false`; `useCookiesForTransactions` = `false` (la transacción de login usa `sessionStorage`: dato interno del SDK, no son tokens); `legacySameSiteCookie` = `true`.
- **Comportamiento esperado**: los tokens viven en memoria (constitución V). Con refresh tokens, las renovaciones dentro de una pestaña no usan iframe. Al recargar o abrir otra pestaña la memoria se pierde y, por `useRefreshTokensFallback`, el SDK intenta una autenticación silenciosa con iframe usando la cookie de sesión de Auth0. Si el navegador bloquea cookies de terceros (Safari, Firefox), falla con `login_required`: se muestra la pantalla de acceso y "Iniciar sesión" vuelve sin pedir credenciales (la sesión de Auth0 sigue activa). Es una fricción aceptable y segura.
- **Mitigación recomendada**: dominio personalizado de Auth0 en el mismo sitio que la SPA (la cookie pasa a ser de primera parte). Se decide en el despliegue.
- **Rotación de refresh tokens**: DEBE estar habilitada en la aplicación de Auth0 (requisito de la constitución).
- **Alternativas descartadas**: `cacheLocation: 'localstorage'` (prohibido por la constitución V); sin refresh tokens (válido como respaldo si no se habilita *Allow Offline Access*: el SDK renueva con iframe).
- **Errores a mapear**: `login_required`, `consent_required`, `invalid_grant`, `MissingRefreshTokenError`, `TimeoutError` → sesión vencida (FR-013); `access_denied` (la persona canceló) → mensaje neutro (FR-015).
- **Nota**: `useMrrt` (refresh token multi-recurso) no se usa; se evaluará si las otras APIs requieren otros `audience`.

## D7. Resolución del acceso del operador

Con el control de acceso del servicio de usuarios (su spec 008), las tres operaciones de lectura que usaba el primer diseño (`GET /users/by-auth0-id`, `GET /users/{id}/roles` y `GET /roles/{id}/permissions`) exigen `users:read` y `roles:read`: una persona con otros permisos (Marketing, Billing, Developer) recibiría 403 al consultar su propio acceso, y un usuario bloqueado también, sin poder distinguir «cuenta no activa». Por eso la 001 consume una única operación sobre la propia persona (decisión de producto, aclaración 14): `GET /api/v1/authorization/me`, que exige solo un token válido ([contracts/users-service.md](contracts/users-service.md), M1). Está pendiente de implementar en el servicio: la solicitud para su `/speckit-specify` está en [contracts/users-service-me-request.md](contracts/users-service-me-request.md) y, mientras tanto, la 001 se construye y se prueba contra MSW con ese mismo contrato.

Algoritmo (la respuesta se valida con Zod):

1. `GET /api/v1/authorization/me` con el token de acceso. La respuesta trae `user` (nulo si la persona no está registrada) y `roles`: solo los roles activos de un usuario activo, cada uno con sus permisos activos (`recurso:acción`).
2. `user` nulo → denegado: cuenta no registrada.
3. `user.status.id` ≠ 1 (Activo) → denegado: cuenta no activa (2 Bloqueado, 3 Eliminado, cualquier otro id).
4. Roles autorizados = los que, sin distinguir mayúsculas ni espacios, coinciden con `Administrator`, `Developer`, `Marketing` o `Billing` (constante única en `features/auth/policy`). Si no queda ninguno → denegado: sin role con acceso.
5. Permisos = unión de los permisos de los roles autorizados (los de los demás roles no cuentan). Un conjunto vacío es válido (concedido, sin secciones; FR-018).

- **Fallos**: red, timeout, 5xx o esquema inválido → error (reintento: máximo 2, con retroceso, solo red y 5xx); un 401 lo trata el cliente HTTP (D12). En la primera determinación = estado `failed` (FR-005: se deniega y se ofrece reintentar); en una recomprobación se conserva el último resultado bueno (caso límite de la spec). **Tope de espera** (aclaración 10, SC-011): cada intento ejecuta la llamada dentro de `runWithTimeout` con un presupuesto de 8 s (`ACCESS_CHECK_ATTEMPT_TIMEOUT_MS`) y hay como máximo 3 intentos con esperas de 1 s y 2 s, así que `failed` aparece a los 27 s o antes, por debajo del máximo de 30 s; el plazo propio de la llamada (30 s, D12) queda acotado por el del intento. Alternativas descartadas: un temporizador en la guarda (la consulta seguiría en curso y podría resolverse después de mostrar el fallo) y un solo intento sin reintentos (un fallo transitorio obligaría a reintentar a mano).
- **Identificación del role**: por nombre, en un único módulo, porque la API permite renombrar roles y los identificadores varían por entorno. Cuando exista el tipo de role (aclaración 1) se sustituirá por ese tipo, que el servicio añadiría a cada role de la respuesta.
- **Alternativas descartadas** (aclaración 14): las tres operaciones existentes (exigen permisos que la persona quizá no tiene y no sirven para un usuario bloqueado); `GET /api/v1/authorization/check` por permiso (responde una sola pregunta y no devuelve el usuario, su estatus ni sus roles, así que no distingue un Developer sin permisos de un Owner ni alimenta el perfil); y dar `users:read` y `roles:read` a todos los operadores (mostraría la sección Usuarios a quien no debe y expondría a todos los usuarios).

## D8. Recomprobación periódica (FR-019, FR-021)

- **Decisión**: una única query de TanStack Query `accessKeys.operator(sub)` con `refetchInterval` de 5 minutos y `refetchOnWindowFocus: 'always'` (la comprobación al regresar a la pestaña no depende de la antigüedad de los datos), `refetchIntervalInBackground: false` (una pestaña oculta no muestra contenido; al volver se comprueba) y reintentos acotados (hasta 3 intentos con un presupuesto de 8 s cada uno, D7). Las constantes viven en `src/features/auth/config/session.ts` (las features no pueden importar de `app/`).
- **Efectos**: el resultado alimenta la guarda (concedido / denegado / fallido). Si pasa a denegado se retira el contenido protegido (FR-021); si solo cambian los permisos se actualizan secciones y acciones y `RequirePermission` redirige a la página principal con un aviso si la sección ya no corresponde. Un fallo de red conserva el acceso previo.
- **No es el patrón prohibido**: la constitución IV descarta el sondeo de operaciones largas (202); esto es revalidación de datos de acceso por TanStack Query, no el seguimiento de una operación.

## D9. Inactividad (FR-020)

- **Decisión**: `react-idle-timer` 5.7.3. Configuración: `timeout` = 900 000 ms, `promptBeforeIdle` = 60 000 ms (el aviso sale a los 14 minutos, el cierre a los 15), `events` = `mousedown`, `keydown`, `touchstart` (la spec define actividad como clic, tecla o navegación), `crossTab: true` con `syncTimers` (la actividad en cualquier pestaña cuenta), `stopOnIdle: true` y `disabled` mientras no haya sesión. La navegación entre pantallas llama a `activate()` desde un efecto que escucha la ubicación del router.
- **Evidencia** (código del paquete 5.7.3): sin dependencias; usa `window.BroadcastChannel` cuando existe y solo recurre a un sustituto basado en `localStorage` si el navegador no lo tiene; los navegadores soportados por la constitución sí lo tienen, así que no se escribe en `localStorage`. Los eventos por defecto incluyen `mousemove`, `wheel` y `focus`; por eso se sustituyen.
- **Las comprobaciones automáticas no cuentan como actividad**: la librería solo observa eventos del DOM de la persona.
- **Cierre**: `onIdle` ejecuta el mismo procedimiento que "Cerrar sesión" con motivo `idle` (D10). Es idempotente, así que lo ejecuten una o varias pestañas da igual.
- **Alternativa descartada**: temporizador propio con `BroadcastChannel` (reimplementa sincronización entre pestañas y aviso previo, con más código que probar).

## D10. Cierre de sesión, varias pestañas y botón Atrás (FR-010, FR-011, FR-020)

- **Cierre** (`useLogout`): avisar al resto de pestañas, `queryClient.clear()` y `logout({ logoutParams: { returnTo } })` de Auth0, que termina la sesión también en Auth0. `returnTo` = `/access` (voluntario) o `/access/idle` (inactividad); ambas direcciones se registran en *Allowed Logout URLs*.
- **Otras pestañas**: canal `BroadcastChannel('mailysoft-backoffice-session')` con el mensaje `session-ended` y su motivo. Cada pestaña receptora vacía su caché, llama a `logout({ openUrl: false })` (descarta el estado en memoria del SDK sin redirigir; la sesión de Auth0 ya terminó) y navega a la pantalla de acceso.
- **Botón Atrás**: tras el cierre la memoria se pierde por la navegación completa; si el navegador restaura la página desde la caché de ida y vuelta, un manejador de `pageshow` con `persisted` recarga la página. Como defensa adicional, el despliegue DEBERÍA servir `index.html` con `Cache-Control: no-store`.

## D11. Ruta de retorno tras el cierre por inactividad (excepción de almacenamiento)

- **Necesidad**: FR-020 exige volver a la pantalla donde estaba tras identificarse de nuevo. El cierre de Auth0 es una navegación completa y la memoria se pierde.
- **Decisión**: antes de cerrar por inactividad se guarda en `sessionStorage` (por pestaña) un único valor con el `pathname` y solo los parámetros permitidos (`page`, `page_size`, `sort`); sin texto libre. Se lee y se borra en la primera carga de `/access/idle` y pasa a ser el `returnTo` de "Iniciar sesión". El cierre voluntario no guarda nada. Registrada en Complexity Tracking.
- **Alternativas descartadas**: pasar la ruta en la query de `returnTo` (depende de cómo Auth0 compare las *Allowed Logout URLs*, no verificado); una cookie (mismo problema de almacenamiento); no restaurar (incumple FR-020).
- Para el vencimiento sin cierre de Auth0 (FR-013) no hace falta: la ruta viaja en el estado del router y en `appState` del SDK. El aviso `expired` viaja en el estado de la ubicación actual (`{ sessionExpired: true }`, validado con Zod): el manejador de sesión vencida la anota y cierra la sesión local, y solo la guarda redirige a `/access` convirtiendo esa marca en `notice`, de modo que no compiten dos redirecciones y el aviso no se pierde.

## D12. Cliente HTTP, CORS y desarrollo local

- **Cliente**: una única fábrica `createHttpClient({ baseUrl, getAccessToken, onSessionExpired })` en `src/shared/api` basada en `fetch`: tiempo límite de 30 s combinado con la señal del llamador mediante `runWithTimeout` (`AbortController` y `setTimeout`, no `AbortSignal.timeout`, porque el reloj simulado de las pruebas solo controla el primero; el mismo helper acota los intentos de la resolución del acceso, D7), JSON, normalización a `ApiError` (código y mensaje del cuerpo `{code, message, errors}` más el estado HTTP; un aborto con razón `TimeoutError` es un `ApiError` `timeout`, reintentable), cabecera `Authorization: Bearer` solo si el origen de la URL está entre las bases configuradas, y un único reintento tras `401` renovando el token (`getAccessTokenSilently` con `cacheMode: 'off'`); si falla, `onSessionExpired` (FR-013). Los reintentos de lectura (máximo 2, solo red y 5xx) los aplica TanStack Query con una función `retry` que consulta `ApiError`.
- **El servicio de usuarios exige un token de acceso válido y un permiso en cada operación (su spec 008) y solo habilita CORS si se configura `CORS_ALLOWED_ORIGINS`.** En desarrollo se usa el proxy de Vite (`/proxy/users` → `http://127.0.0.1:8000`) con el puerto fijo 5173, así no hay solicitudes entre orígenes ni *preflight*. En entornos desplegados hace falta un proxy inverso del mismo origen o configurar `CORS_ALLOWED_ORIGINS` en el servicio con el origen del Backoffice: queda como dependencia del despliegue.
- **Tipos desde OpenAPI** (la constitución IV lo recomienda con DEBERÍA): para la única operación que consume la 001 (`me`) se escribe a mano el esquema Zod y se documentan en [contracts/users-service.md](contracts/users-service.md); se reevaluará generarlos (por ejemplo, con `openapi-typescript`) en la 002, cuando crezca el número de operaciones.

## D13. Rutas y guardas

Tabla completa en [contracts/app-routes.md](contracts/app-routes.md). Públicas: `/access`, `/access/idle` y `/callback`. Todo lo demás pasa por una guarda con estados `cargando`, `no identificado`, `fallido`, `denegado` y `concedido`, y por defecto no muestra nada protegido (cierre seguro). Una dirección inexistente sin sesión lleva a la pantalla de acceso (FR-001, escenario 1 de la User Story 1) y, tras identificarse, muestra "página no encontrada" con enlace a la página principal (FR-016).

## D14. Datos del operador: nombre, apellidos, correo e iniciales

Aclaración 11 de la spec: en Auth0 solo viven el correo, la contraseña y el identificador de la cuenta, y todos los demás datos viven en el servicio de usuarios. Por eso el encabezado y el perfil usan únicamente el usuario de MailySoft que ya se obtiene para resolver el acceso (la consulta `me`, D7): en el encabezado, `firstName` + `paternalLastName`; en el perfil (aclaración 12), nombre, apellido paterno, apellido materno (vacío, «—», si no tiene), correo y roles activos. De Auth0 se leen el `sub` (para localizar al usuario) y el correo, este último solo para mostrar la cuenta en las pantallas de acceso denegado y de comprobación fallida, donde quizá no hay usuario de MailySoft (aclaración 13); ambos se validan con Zod (`OperatorClaims`), el alcance es `openid email offline_access` y no se leen `name` ni `picture`. El servicio de usuarios no tiene campo de imagen: el perfil muestra siempre las iniciales (primeras letras de las dos primeras palabras del nombre, en mayúscula) en un `Avatar` decorativo, y si la plataforma incorpora una imagen se añadirá a `PlatformUser`. El servicio localiza al usuario por el `sub` del propio token (único e inmutable), así que la 001 no envía ningún identificador; las búsquedas por identificador o por correo las usará la feature 002 con sus permisos.

- **Alternativa descartada**: usar `name`, `email` y `picture` de Auth0 para el encabezado y el perfil; el nombre puede ser el propio correo y los datos pueden diferir de los de la plataforma.

## D15. Estrategia de pruebas

- **Lógica pura con prueba primero** (constitución VII): `evaluateAccess`, `can`, análisis de permisos, `sanitizeReturnPath`, esquema del entorno, mapeo de `ApiError`.
- **Componentes e integración**: React Testing Library + user-event, consultas por rol y etiqueta; MSW 3 (`http` y `HttpResponse` de `msw/http`, `setupServer` de `msw/node`, `onUnhandledRequest: 'error'`) simula el servicio de usuarios; el doble de Auth0 es un `Auth0Context.Provider` con valor controlable (exportado por el SDK) dentro de `src/test/renderWithProviders.tsx`.
- **Tiempo**: `vi.useFakeTimers()` para 1, 5 y 15 minutos (FR-019, FR-020); en E2E, el reloj de Playwright.
- **Accesibilidad**: `vitest-axe` en acceso, acceso denegado, inicio, perfil y el diálogo de inactividad.
- **Diseño adaptable**: jsdom no calcula el layout, así que se verifica en un navegador real (Playwright a 1024×768 y 320×640, T140) y a mano (quickstart V17).
- **Cobertura**: `coverage.include` con las capas `api`, `policy`, `schemas`, `hooks` y `shared/api|lib` (para que cuenten también los archivos sin prueba) y umbral global de 80 % de líneas sobre esas rutas.
- **E2E (Playwright)**: se dejan configurados y se omiten sin credenciales (`E2E_*`) hasta que exista un entorno de pruebas de Auth0 con las cuentas de [quickstart.md](quickstart.md); la constitución lo permite explícitamente.

## D16. Presupuesto de bundle

Un script propio (`scripts/check-entry-size.mjs`) suma el gzip del JS de la ruta de entrada (el `<script type="module">` y los `modulepreload` de `dist/index.html`) y lo compara con 300 KB; mide solo la ruta de entrada, sin depender de cómo el empaquetador reparta los chunks, y no añade dependencias. Importaciones de MUI por ruta (`@mui/material/Button`, `@mui/icons-material/Logout`) para conservar el tree-shaking; Data Grid, cuando llegue, solo en las pantallas de listado. La línea base se registra tras el primer build.

## D17. CI y mantenimiento

Flujo de GitHub Actions con Node de `.nvmrc` y `npm ci`: `typecheck`, `lint` (sin advertencias), `format:check`, pruebas con cobertura, `build`, `size` y `npm audit --omit=dev --audit-level=high`. `dependabot.yml` semanal (DEBERÍA). El E2E queda fuera del CI hasta tener entorno de pruebas.

## D18. Estructura del proyecto

Proyecto único en la raíz. Rebanadas: `auth` (sesión, guardas, política, inactividad), `users` (esquema de la entidad `PlatformUser`; la 002 lo amplía sin duplicar y añade sus operaciones), `profile` y `home`; `auth` aloja también el cliente de la consulta `me` y su esquema. `roles` no existe en la 001: llega con la feature que administre roles. La dependencia es `auth → users` siempre por su `index.ts`. `app/` aloja proveedores, router, layout, navegación, configuración y tema; `shared/` aloja el cliente HTTP, `logger`, el canal de sesión, los mensajes en español y la UI genérica. Alias `@/` → `src/`. ESLint con `eslint-plugin-boundaries` hace cumplir `app → features → shared`. Detalle en [plan.md](plan.md).

## D19. Dependencias y riesgos externos

| Riesgo o dependencia | Efecto | Responsable / mitigación |
|---|---|---|
| La consulta `me` del servicio de usuarios aún no existe | Sin ella no se puede resolver el acceso contra el servicio real (con las operaciones actuales, solo quien tiene `users:read` y `roles:read`) | Implementarla en el servicio ([solicitud](contracts/users-service-me-request.md)); mientras tanto, MSW |
| Las variables `AUTH0_*` del servicio deben coincidir con las del Backoffice | Con otro dominio o `audience`, el servicio responde 401 `invalid_token` | `AUTH0_DOMAIN` y `AUTH0_AUDIENCE` del servicio iguales a `VITE_AUTH0_DOMAIN` y `VITE_AUTH0_AUDIENCE` |
| Crear un usuario por la API también crea su cuenta en Auth0 y exige contraseña | Las cuentas de prueba que ya existen en Auth0 no se pueden dar de alta por la API | Datos de prueba con SQL ([quickstart.md](quickstart.md), paso 2) |
| CORS del servicio de usuarios opcional (`CORS_ALLOWED_ORIGINS`, vacío por defecto) | Sin configurarlo, el navegador bloquea llamadas entre orígenes | Proxy de Vite en desarrollo; proxy inverso o `CORS_ALLOWED_ORIGINS` en despliegue |
| Aplicación y API de Auth0 sin crear | No hay login | Seguir [contracts/auth0-configuration.md](contracts/auth0-configuration.md) |
| El role `Billing` no existe en los datos iniciales; `Support` existe pero no autoriza | Billing no podría entrar | Crear `Billing` en la plataforma (ver [quickstart.md](quickstart.md)) |
| Ningún role tiene permisos asignados de inicio | Nadie ve secciones | Asignar permisos (script de datos de prueba o la API) antes de validar |
| Autenticación silenciosa con cookies de terceros bloqueadas | Más redirecciones tras recargar | Dominio personalizado de Auth0 (D6) |
| Nombre de role mutable | Un renombrado quita el acceso | Tipo de role en la plataforma (aclaración 1) |
| El servicio de usuarios no guarda imagen del usuario | El perfil muestra siempre las iniciales | Añadir el campo a la plataforma si se quiere mostrar una imagen |
| Servicio de usuarios colgado (ni responde ni da error) | La comprobación de acceso espera hasta 27 s antes de mostrar el fallo | Tope de 8 s por intento (D7); la mejora de un endpoint de permisos efectivos reduciría las llamadas |
| Versiones mayores recientes (RR 8, MUI 9, MSW 3, Vitest 5, TS 6) | Cambios de API respecto a lo conocido | Contrastar documentación al implementar; lockfile y CI |

## D20. Diseño adaptable «escritorio primero» (FR-022, SC-010)

- **Decisión** (aclaración 8): se diseña y prueba desde 1024 px de ancho (computadora y tablet horizontal) y, hasta 320 px, el contenido se reacomoda sin desplazamiento horizontal de la página ni cortes; la experiencia móvil específica queda fuera de alcance. 320 px es la referencia de WCAG 2.1 (criterio 1.4.10, reflujo), que la constitución exige al pedir WCAG 2.1 AA: una ventana de 1280 px con zoom del 400 % equivale a 320 px.
- **Técnica**: diseño fluido con los componentes de MUI (`Container` con ancho máximo, `Stack` y `Box` con `flexWrap: 'wrap'` y `gap`), sin anchos fijos ni `overflow-x`; los textos largos se parten (`overflowWrap: 'anywhere'`) en lugar de truncarse; el cierre de sesión y el perfil permanecen visibles en el encabezado (SC-005), por lo que no hay menú plegable ni cajón de navegación: la `nav` envuelve sus enlaces. Los diálogos usan `fullWidth` con `maxWidth="xs"`. Las tablas de datos de las features 002 a 004 podrán desplazarse dentro de su propio recuadro (WCAG exceptúa las tablas de datos); lo decidirá cada feature.
- **Verificación**: jsdom no calcula el layout, así que se comprueba en un navegador real: Playwright a 1024×768 y 320×640 (`scrollWidth` ≤ `clientWidth`, T140) y a mano (quickstart V17).
- **Alternativa descartada**: cajón de navegación (`Drawer`) con botón de menú bajo 900 px. Añadiría una interacción para llegar al perfil y al cierre de sesión (SC-005) y en la 001 la navegación está vacía; se reevaluará cuando existan las tres secciones.
