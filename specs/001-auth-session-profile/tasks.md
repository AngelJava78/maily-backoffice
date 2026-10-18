# Tasks: Acceso, Sesión y Perfil del Usuario

**Input**: Design documents from `/specs/001-auth-session-profile/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md y `.specify/memory/constitution.md`

**Tests**: Incluidas. La plantilla las marca como opcionales, pero la constitución (VII) exige pruebas automatizadas con cada feature y pruebas primero en la lógica pura. Dentro de cada fase, las pruebas se escriben ANTES de la implementación y DEBEN fallar al principio. Se usan Vitest, React Testing Library y MSW (el servicio de usuarios se simula a nivel de red, nunca con un mock de `fetch` ni del cliente HTTP) y un doble centralizado de Auth0 (`Auth0Context.Provider`).

**Organization**: Tareas agrupadas por historia de usuario para poder implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1 a US5); solo en las fases de historias
- Cada descripción incluye las rutas exactas de los archivos

## Path Conventions

- **Single project** en la raíz del repositorio (plan.md): `src/`, `e2e/`, `scripts/`, `.github/`
- Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español
- Alias `@/` → `src/`. Dependencias permitidas: `app → features → shared`; una feature solo importa a otra por su `index.ts` (se hace cumplir con ESLint en T006)

## Prerrequisitos manuales (fuera de las tareas)

Estas acciones las hace una persona; sin ellas no se puede validar de punta a punta, pero las pruebas automatizadas no las necesitan.

- Crear en Auth0 la aplicación SPA y la API según [contracts/auth0-configuration.md](contracts/auth0-configuration.md) y completar `.env.local` (a partir de `.env.example`, T008).
- Levantar el servicio de usuarios y preparar los datos de prueba (cuentas A1 a A9) según los pasos 1 y 2 de [quickstart.md](quickstart.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto y herramientas de calidad (research D1 a D3, D16 y D17)

- [ ] T001 Crear `package.json` y `.nvmrc` en la raíz: `.nvmrc` con el contenido `24`; `package.json` con `"name": "maily-backoffice"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=24.15.0" }`, los scripts `dev` (`vite`), `build` (`tsc -b && vite build`), `preview` (`vite preview`), `typecheck` (`tsc -b`), `lint` (`eslint . --max-warnings 0`), `format` (`prettier --write .`), `format:check` (`prettier --check .`), `test` (`vitest run`), `test:watch` (`vitest`), `test:coverage` (`vitest run --coverage`), `test:e2e` (`playwright test`) y `size` (`node scripts/check-entry-size.mjs`), y `"overrides": { "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }` para el peer de ESLint 10 (research D3)
- [ ] T002 Instalar las dependencias de ejecución con versiones exactas en `package.json` y generar `package-lock.json`: `npm install --save-exact react@19.3.1 react-dom@19.3.1 react-router@8.4.0 @tanstack/react-query@5.104.4 @auth0/auth0-react@2.28.2 @mui/material@9.5.0 @mui/icons-material@9.5.0 @emotion/react@11.14.0 @emotion/styled@11.14.1 zod@4.6.7 react-idle-timer@5.7.3`. NO instalar `@mui/x-data-grid`, `react-hook-form` ni `@hookform/resolvers` (llegan con la feature 002)
- [ ] T003 Instalar las dependencias de desarrollo con versiones exactas en `package.json`: `npm install --save-dev --save-exact vite@8.3.4 @vitejs/plugin-react@6.1.2 typescript@6.0.3 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@24 vitest@5.0.5 @vitest/coverage-v8@5.0.5 jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/dom@10 @testing-library/user-event@14.6.8 @testing-library/jest-dom@7.0.1 msw@3.0.3 vitest-axe@0.1.0 axe-core@4.14.0 @playwright/test@1.64.1 eslint@10.13.0 @eslint/js@10.0.1 typescript-eslint@8.71.2 eslint-plugin-react-hooks@7.1.1 eslint-plugin-jsx-a11y@6.10.2 eslint-plugin-boundaries@7.2.0 globals@17.13.0 prettier@3.9.10`. `axe-core` es MPL-2.0: excepción justificada en Complexity Tracking del plan. Si falla por peers NO usar `--legacy-peer-deps`: revisar el `overrides` de T001; respaldo: ESLint 9.39.5 (research D3)
- [ ] T004 [P] Crear `tsconfig.json` (`"files": []` y referencias a los otros dos), `tsconfig.app.json` (incluye `src`; `"target": "ES2023"`, `"lib": ["ES2023", "DOM", "DOM.Iterable"]`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"noFallthroughCasesInSwitch": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"verbatimModuleSyntax": true`, `"isolatedModules": true`, `"noEmit": true`, `"skipLibCheck": true`, `"types": ["vite/client"]`, `"paths": { "@/*": ["./src/*"] }`) y `tsconfig.node.json` (incluye `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `scripts` y `e2e`, con `"types": ["node"]`). Constitución II: `strict` y `noUncheckedIndexedAccess` son obligatorios
- [ ] T005 [P] Crear `vite.config.ts` con `defineConfig` de `vitest/config` y `loadEnv(mode, process.cwd(), '')`: plugin `react()`, alias `'@'` → `src`, `server: { port: 5173, strictPort: true, proxy: { '/proxy/users': { target: <USERS_API_PROXY_TARGET o 'http://127.0.0.1:8000'>, changeOrigin: true, rewrite: (path) => path.replace(/^\/proxy\/users/, '') } } }` y el bloque `test`: `environment: 'jsdom'`, `environmentOptions: { jsdom: { url: 'http://localhost:5173' } }`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`, `restoreMocks: true`, `coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/features/*/api/**', 'src/features/*/policy/**', 'src/features/*/schemas/**', 'src/features/*/hooks/**', 'src/shared/api/**', 'src/shared/lib/**'], exclude: ['**/*.test.{ts,tsx}', '**/index.ts'], thresholds: { lines: 80 } }` (constitución VII; research D15 y contracts/environment.md)
- [ ] T006 [P] Crear `eslint.config.js` (configuración plana, ESM) que ignore `dist`, `coverage`, `playwright-report` y `test-results`, use `globals` de navegador para `src` y de Node para `scripts`, `vite.config.ts`, `playwright.config.ts` y `eslint.config.js`, y active: `@eslint/js` recomendado; `typescript-eslint` `strictTypeChecked` y `stylisticTypeChecked` con `parserOptions.projectService: true`; `eslint-plugin-react-hooks` (configuración plana recomendada, como error); `eslint-plugin-jsx-a11y` (configuración plana recomendada); `@typescript-eslint/no-explicit-any: 'error'`; `@typescript-eslint/ban-ts-comment` con `'ts-expect-error': 'allow-with-description'` y `minimumDescriptionLength: 10`; `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]` (sin excepciones, tampoco en pruebas: allí se usan fábricas tipadas, `satisfies`, `vi.fn<...>()` y esquemas Zod en lugar de `as`; `as const` está permitido); `no-console: 'error'` (desactivada solo en `src/shared/lib/logger.ts` y en `scripts/**`); `no-restricted-globals` para `localStorage` (prohibido en todo el código) y `fetch` (permitido solo en `src/shared/api/httpClient.ts`, pruebas y `e2e/`); `sessionStorage` permitido solo en `src/features/auth/session/returnPathStorage.ts`, en las pruebas (`**/*.test.{ts,tsx}`) y en `src/test/**`, como `fetch`; `no-restricted-syntax` para el atributo JSX `dangerouslySetInnerHTML` y para los componentes de clase de React, con los selectores `:matches(ClassDeclaration, ClassExpression)[superClass.name=/^(Component|PureComponent)$/]` y `:matches(ClassDeclaration, ClassExpression)[superClass.property.name=/^(Component|PureComponent)$/]` (este cubre `React.Component`), desactivada solo en `src/shared/ui/ErrorBoundary.tsx`; así no se prohíben las clases que no son componentes, como `ApiError extends Error` (T025); `max-lines` de 250 para `src/**/*.tsx` sin pruebas; y `eslint-plugin-boundaries` con elementos `app` (`src/app/**`), `feature` (`src/features/*`, capturando el nombre) y `shared` (`src/shared/**`), ignorando `**/*.test.{ts,tsx}`, `src/test/**` y `e2e/**`: `app` puede importar `app`, `feature` y `shared`; una `feature` solo `shared` y otra feature únicamente por su `index.ts`; `shared` solo `shared`. Seguir la documentación de la versión 7 del plugin para la sintaxis exacta
- [ ] T007 [P] Crear `.prettierrc` (`{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }`) y `.prettierignore` (`dist`, `coverage`, `package-lock.json`, `specs`, `.specify`, `.claude`, `playwright-report`, `test-results`)
- [ ] T008 [P] Crear `.env.example` con el contenido de [contracts/environment.md](contracts/environment.md): `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_USERS_API_URL=/proxy/users`, `VITE_CLINICS_API_URL` y `VITE_SUBSCRIPTIONS_API_URL` comentadas, `VITE_FEATURE_POSTMAN_TOKEN=false` y `USERS_API_PROXY_TARGET` comentada (solo desarrollo, la lee `vite.config.ts`). Sin secretos
- [ ] T009 [P] Crear `index.html` en la raíz con `<html lang="es">`, `<title>MailySoft Backoffice</title>`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<div id="root"></div>` y `<script type="module" src="/src/main.tsx"></script>`
- [ ] T010 [P] Crear `scripts/check-entry-size.mjs` (Node, sin dependencias): lee `dist/index.html`, extrae los `<script type="module" src>` y los `<link rel="modulepreload" href>` (el JS de la ruta de entrada), calcula el tamaño gzip de cada archivo con `node:zlib` y muestra una tabla con el total; termina con código 1 si el total supera 300 KB (constitución, Rendimiento y observabilidad; research D16)
- [ ] T011 [P] Crear `.github/workflows/ci.yml` (en `push` y `pull_request`, `permissions: contents: read`): `actions/checkout`, `actions/setup-node` con `node-version-file: .nvmrc` y `cache: npm`, y los pasos `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:coverage`, `npm run build`, `npm run size` y `npm audit --omit=dev --audit-level=high` (constitución, Puertas de CI). Sin paso de E2E hasta que exista un entorno de Auth0 de pruebas
- [ ] T012 [P] Crear `.github/dependabot.yml` con actualización semanal de `npm` y de `github-actions`, agrupando las actualizaciones menores y de parche (constitución: DEBERÍA automatizarse)
- [ ] T013 [P] Añadir a `.gitignore` las entradas `playwright-report/`, `test-results/` y `blob-report/` (`.env*` ya está ignorado salvo `.env.example`)
- [ ] T014 [P] Crear `src/vite-env.d.ts` con `/// <reference types="vite/client" />` y `interface ImportMetaEnv` con las variables `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`, `VITE_USERS_API_URL`, `VITE_CLINICS_API_URL`, `VITE_SUBSCRIPTIONS_API_URL` y `VITE_FEATURE_POSTMAN_TOKEN` (todas `readonly string | undefined`)
- [ ] T015 Verificar el andamiaje: ejecutar `npm run typecheck`, `npm run lint` y `npm run format:check` sobre el proyecto casi vacío y corregir cualquier problema de configuración en `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc` y `src/vite-env.d.ts` (T001 a T014)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura y lógica pura que TODAS las historias necesitan: configuración validada, utilidades, cliente HTTP, UI base, esquemas y clientes del servicio de usuarios, política de acceso e infraestructura de pruebas

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta terminar esta fase

Las pruebas de esta fase (T018 a T051) definen sus datos y sus manejadores MSW dentro de su propio archivo: `src/test/factories.ts` y los manejadores compartidos (T053 y T054) se crean al final de la fase y los usan las pruebas de las historias.

- [ ] T016 [P] Crear `src/test/setup.ts` y `src/test/server.ts`: `server.ts` exporta `server = setupServer()` (`setupServer` de `msw/node`, sin manejadores por defecto); `setup.ts` registra `@testing-library/jest-dom/vitest`, extiende `expect` con los matchers de `vitest-axe`, y en `beforeAll` ejecuta `server.listen({ onUnhandledRequest: 'error' })`, en `afterEach` `cleanup()`, `server.resetHandlers()` y `sessionStorage.clear()`, y en `afterAll` `server.close()`. Si jsdom no expone `BroadcastChannel`, asignar el de `node:worker_threads` a `globalThis` con `Object.assign` (sin aserciones `as`)
- [ ] T017 [P] Crear `src/features/auth/config/session.ts` con las constantes de sesión (data-model.md): `IDLE_TIMEOUT_MS = 900_000` (15 min, FR-020), `IDLE_PROMPT_BEFORE_MS = 60_000` (1 min, FR-020), `ACCESS_RECHECK_INTERVAL_MS = 300_000` (5 min, FR-019) y `ACCESS_CHECK_ATTEMPT_TIMEOUT_MS = 8_000` (presupuesto de cada intento de la determinación del acceso: 3 intentos × 8 000 ms + esperas de 1 000 y 2 000 ms = 27 000 ms, por debajo del máximo de 30 s; FR-005, SC-011), con un comentario por constante que cite su requisito
- [ ] T018 [P] Escribir `src/app/config/env.test.ts` (debe fallar primero) para `parseEnv(source, { isProduction })`: `VITE_AUTH0_DOMAIN` "Nombre de dominio sin esquema." (rechaza `https://x.auth0.com`); `VITE_AUTH0_CLIENT_ID` "Texto no vacío."; `VITE_AUTH0_AUDIENCE` "Texto no vacío (identificador de la API de Auth0)."; `VITE_USERS_API_URL` "Ruta que empieza con `/` o URL `http(s)`; en builds de producción una URL absoluta DEBE ser `https`. Sin `/` final." (acepta `/proxy/users` y `http://127.0.0.1:8000`; rechaza `https://x/` con barra final y `http://x` con `isProduction: true`); `VITE_CLINICS_API_URL` y `VITE_SUBSCRIPTIONS_API_URL` opcionales con la misma regla; `VITE_FEATURE_POSTMAN_TOKEN` "`true` o `false`; por defecto `false`". El resultado de error lista las variables inválidas con mensajes en español
- [ ] T019 Implementar `src/app/config/env.ts` (tras T018): esquema Zod con las reglas de T018, `parseEnv(source, { isProduction })` que devuelve `{ ok: true, env }` o `{ ok: false, errors: string[] }` (sin lanzar) y el tipo `AppEnv` inferido con `z.infer`; sin efectos al importar (nada se evalúa hasta que `main.tsx` llame a `parseEnv`)
- [ ] T020 [P] Escribir `src/shared/lib/safeReturnPath.test.ts` (debe fallar primero) para `toSafeInternalPath(value: unknown)`: acepta rutas internas (`/profile`, `/users?page=2`) y devuelve `/` para `undefined`, vacío, URLs absolutas (`https://evil.com`), `//evil.com`, `javascript:`, barras invertidas y valores sin `/` inicial; y para `sanitizeReturnPathForStorage({ pathname, search })`: conserva `pathname` y solo los parámetros `page` y `page_size` (enteros ≥ 1) y `sort` (texto de hasta 64 caracteres con letras, dígitos, `_`, `-` y `.`); descarta cualquier otro y cualquier valor que no cumpla, en especial texto libre, y devuelve `/` si el resultado no es una ruta interna segura. Los parámetros de URL y los valores externos son una frontera (constitución II): ambas funciones validan con esquemas Zod (`safeParse`, sin lanzar) y tratan como no válido todo lo que no sea texto (`null`, números u objetos dan `/`)
- [ ] T021 Implementar `src/shared/lib/safeReturnPath.ts` (tras T020) con los esquemas Zod de la ruta interna y de los parámetros permitidos, `toSafeInternalPath` y `sanitizeReturnPathForStorage`; usan `safeParse`, no lanzan y no usan aserciones `as`
- [ ] T022 [P] Escribir `src/shared/lib/logger.test.ts` (debe fallar primero): `logger.debug|info|warn|error(message, context?)` redacta del contexto las claves `token`, `access_token`, `id_token`, `refresh_token`, `authorization`, `password`, `email`, `name`, `picture` y `sub` (valor `'[redacted]'`, también en objetos anidados) antes de emitir (constitución V: sin tokens ni datos personales en logs)
- [ ] T023 Implementar `src/shared/lib/logger.ts` (tras T022): único lugar donde se usa `console.*` (con la excepción de ESLint de T006); `debug` solo en desarrollo
- [ ] T024 [P] Escribir `src/shared/api/ApiError.test.ts` (debe fallar primero): `ApiError.fromResponse(status, body)` con el cuerpo `{ "code": "<codigo_en_ingles>", "message": "<texto_en_español>" }` y `errors: [{ field, message }]` opcional (contracts/users-service.md); tolera cuerpos que no son JSON (`code: 'unknown_error'`); `isRetryable` es `true` para red, tiempo agotado y estado ≥ 500, y `false` para 4xx y fallos de contrato; `kind` ∈ `network`, `timeout`, `http`, `contract`; existe `SessionExpiredError`
- [ ] T025 Implementar `src/shared/api/ApiError.ts` (tras T024): esquema Zod del cuerpo de error, clase `ApiError` (`status`, `code`, `message`, `fieldErrors`, `kind`, `isRetryable`) y clase `SessionExpiredError`
- [ ] T026 [P] Escribir `src/shared/api/retry.test.ts` (debe fallar primero): `shouldRetryQuery(failureCount, error)` es `true` solo si `failureCount < 2` y el error es un `ApiError` con `isRetryable`; `retryDelay(attempt)` es exponencial con tope de 4 000 ms (1 000, 2 000, 4 000); las mutaciones no se reintentan (`MUTATION_RETRY = false`) (constitución IV: GET con máximo 2 reintentos solo ante red o 5xx)
- [ ] T027 Implementar `src/shared/api/retry.ts` (tras T026)
- [ ] T028 Escribir `src/shared/api/timeout.test.ts` y `src/shared/api/httpClient.test.ts` con MSW (deben fallar primero). `timeout.test.ts`: `runWithTimeout(signal, ms, run)` pasa a `run` una señal que se aborta con razón `TimeoutError` a los `ms` (reloj simulado) o cuando se aborta la del llamador (con la razón de este), y limpia el temporizador al terminar. `httpClient.test.ts`, para `createHttpClient({ baseUrl, getAccessToken, onSessionExpired, timeoutMs = 30_000 })`: respuesta válida validada con un esquema Zod; esquema que no cumple → `ApiError` de tipo `contract`; 404 con cuerpo de error → `ApiError` con su `code` y `message`; el encabezado `Authorization: Bearer` solo se envía a hosts de la base configurada (un host distinto no lo recibe); `401` → un único reintento con `getAccessToken({ cacheMode: 'off' })` y, si vuelve a fallar, `onSessionExpired` y `SessionExpiredError`; si `getAccessToken` lanza `SessionExpiredError` → `onSessionExpired`; tiempo límite de 30 s con reloj simulado → `ApiError` `timeout`; cancelación con `AbortSignal` del llamador → `AbortError`; un aborto con razón `TimeoutError` (como el de `runWithTimeout`) → `ApiError` `timeout`, que es reintentable (constitución IV; research D12)
- [ ] T029 Implementar `src/shared/api/timeout.ts` (`runWithTimeout`, hecho con `AbortController` y `setTimeout` y no con `AbortSignal.timeout`, porque el reloj simulado de las pruebas solo controla lo primero; el aborto usa un `DOMException` de nombre `TimeoutError`; si el entorno de pruebas no trae `AbortSignal.any`, combinar las señales con un `AbortController`) y `src/shared/api/httpClient.ts` (tras T028 y T025): fábrica `createHttpClient` con `request` y `get`; único archivo del proyecto donde se usa `fetch`; resuelve las bases relativas contra `window.location.origin`; aplica el tiempo límite con `runWithTimeout`, combinado con la señal del llamador, y clasifica como `timeout` el aborto con razón `TimeoutError`; envía `Accept: application/json`; define los tipos `HttpClient` y `GetTokenOptions` (`{ cacheMode?: 'on' | 'off' }`) sin importar nada de Auth0
- [ ] T030 Crear `src/shared/api/httpClientsContext.tsx` (tras T029): `HttpClients` (`{ users: HttpClient }`), `HttpClientsContext` y el hook `useHttpClients()` (lanza un error claro si falta el proveedor); el proveedor concreto vive en `src/app/providers` (US1)
- [ ] T031 [P] Crear `src/shared/messages/es.ts`, único módulo de textos de interfaz (constitución VI), con `export const messages = { ... } as const` y estas claves y textos: `common` (`appName` 'MailySoft Backoffice', `retry` 'Reintentar', `logout` 'Cerrar sesión', `loading` 'Cargando', `continue` 'Continuar', `account(email)` `Cuenta: ${email}`); `access` (`title` 'Acceso al Backoffice', `description` 'Identifícate con tu cuenta corporativa para continuar.', `loginButton` 'Iniciar sesión', `notices.idle` 'Tu sesión se cerró por inactividad. Vuelve a identificarte para continuar.', `notices.expired` 'Tu sesión venció. Vuelve a identificarte para continuar.', `notices.cancelled` 'Cancelaste el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.', `notices.idpError` 'No pudimos completar el inicio de sesión. Inténtalo de nuevo.'); `callback.progress` 'Completando el acceso…'; `denied` (`title` 'Acceso denegado', `reasons.notRegistered` 'Tu cuenta no está registrada en MailySoft.', `reasons.inactiveAccount` 'Tu cuenta no está activa.', `reasons.noAuthorizedRole` 'No tienes un role con acceso al Backoffice.'); `checkFailed` (`title` 'No se pudo comprobar tu acceso', `message` 'Ocurrió un problema al verificar tu cuenta. Puedes reintentar o cerrar sesión.'); `home` (`greeting(name)` `Hola, ${name}`, `noPermissionsTitle` 'Sin permisos asignados', `noPermissionsNotice` 'Tu role todavía no tiene permisos asignados. Pide a un administrador que los configure.', `permissionsChanged` 'Tus permisos cambiaron y la sección en la que estabas ya no está disponible.'); `nav` (`label` 'Navegación principal', `skipLink` 'Saltar al contenido', `home` 'Inicio', `profile` 'Perfil', `sections.users` 'Usuarios', `sections.subscriptionTypes` 'Tipos de suscripción', `sections.clinics` 'Clínicas'); `idleDialog` (`title` 'Tu sesión está por cerrarse', `body(seconds)` `Por inactividad, tu sesión se cerrará en ${seconds} segundos.`, `continue` 'Continuar'); `profile` (`title` 'Mi perfil', `name` 'Nombre', `paternalLastName` 'Apellido paterno', `maternalLastName` 'Apellido materno', `email` 'Correo electrónico', `roles` 'Roles', `noRoles` 'Sin roles activos', `emptyValue` '—'); `notFound` (`title` 'Página no encontrada', `message` 'La dirección que abriste no existe.', `backHome` 'Ir al inicio'); `forbidden.action` 'No tienes permiso para realizar esta acción.'; `errors` (`network` 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.', `unexpected` 'Ocurrió un error inesperado. Inténtalo de nuevo.', `routeTitle` 'Algo salió mal'); `config` (`title` 'Configuración inválida', `message` 'La aplicación no puede iniciar por un problema de configuración. Avisa al equipo de desarrollo.'); `titles` (`access` 'Acceso', `home` 'Inicio', `profile` 'Mi perfil', `notFound` 'Página no encontrada')
- [ ] T032 Crear (tras T023) `src/shared/ui/ErrorBoundary.tsx` y `src/shared/ui/ErrorBoundary.test.tsx`: único componente de clase del proyecto (constitución I); props `children` y `fallback`; en `componentDidCatch` registra con `logger.error` (sin datos del usuario); la prueba verifica que muestra el `fallback` y registra el error
- [ ] T033 Crear (tras T031) `src/shared/ui/PageLoader.tsx` y `src/shared/ui/ErrorState.tsx` con sus pruebas `PageLoader.test.tsx` y `ErrorState.test.tsx`: `PageLoader` usa `CircularProgress` de MUI con `role="status"` y la etiqueta `messages.common.loading`; `ErrorState` recibe `title`, `message`, `onRetry?` y `secondaryAction?`, muestra `Alert` de MUI y el botón `messages.common.retry`; ambas sin violaciones de axe
- [ ] T034 [P] Crear `src/shared/ui/Notifications.tsx` y `src/shared/ui/Notifications.test.tsx`: `NotificationsProvider` y `useNotify()` (devuelve una función `notify({ severity, message })` con identidad estable) sobre `Snackbar` y `Alert` de MUI con `aria-live`; la prueba verifica que se muestra el mensaje y se cierra
- [ ] T035 [P] Crear `src/shared/ui/useFocusOnMount.ts` y `src/shared/ui/useFocusOnMount.test.tsx`: hook que mueve el foco a un elemento (`tabIndex={-1}`) al montarse (sincronización con el DOM, uso permitido de efecto)
- [ ] T036 [P] Crear `src/app/theme/theme.ts`: `createTheme` de MUI con paleta, tipografía y espaciado centralizados y la localización `esES` de `@mui/material/locale` (constitución VI); sin CSS global ad hoc
- [ ] T037 [P] Escribir `src/features/roles/schemas/role.test.ts` y `src/features/roles/schemas/permission.test.ts` (deben fallar primero) con las reglas de data-model.md. `Role`: `id` "entero ≥ 1", `name` "texto", `description` "texto o nulo", `status` "`{ id, name }`", `createdAt` "fecha y hora" (DTO `created_at`, ISO 8601 con zona horaria). `Permission`: `id` "entero ≥ 1", `name` con patrón `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$`, `status` "`{ id, name }`"; `parsePermissionKey('users:read')` devuelve `{ resource: 'users', action: 'read' }`. Se verifica el mapeo `snake_case` → `camelCase` y el rechazo de datos inválidos
- [ ] T038 Implementar `src/features/roles/schemas/role.ts` y `src/features/roles/schemas/permission.ts` (tras T037): esquemas Zod con transformación del DTO al modelo de dominio, tipos inferidos `Role` y `Permission` y `parsePermissionKey`
- [ ] T039 [P] Escribir `src/features/roles/api/rolePermissionsApi.test.ts` con MSW (debe fallar primero): `listRolePermissions(client, roleId, { signal })` hace `GET /api/v1/roles/{role_id}/permissions`, devuelve `Permission[]` validados, una lista vacía es válida y `404 role_not_found` llega como `ApiError` con ese `code` (contracts/users-service.md, C3)
- [ ] T040 Implementar `src/features/roles/api/rolePermissionsApi.ts` y `src/features/roles/index.ts` (tras T038 y T039): el `index.ts` exporta los esquemas, los tipos, `parsePermissionKey` y `listRolePermissions`
- [ ] T041 [P] Escribir `src/features/users/schemas/user.test.ts` (debe fallar primero) con las reglas de data-model.md. `PlatformUser`: `id` "entero ≥ 1", `auth0Id` "texto no vacío", `email` "En minúsculas (lo garantiza el servicio)", `firstName` "texto no vacío", `paternalLastName` "texto no vacío", `maternalLastName` "texto o nulo", `status` "`{ id: entero, name: texto }`" ("Se decide por `id`, nunca por `name`"), `createdAt` y `updatedAt` "fecha y hora con zona" (ISO 8601); derivado `displayName` = `firstName` + `paternalLastName`. `UserStatus`: `ACTIVE` = 1, `BLOCKED` = 2, `DELETED` = 3, "cualquier otro id" tratado como no activo
- [ ] T042 Implementar `src/features/users/schemas/user.ts` y `src/features/users/schemas/userStatus.ts` (tras T041 y T038): esquema Zod con transformación `snake_case` → `camelCase`, tipo `PlatformUser`, `displayName` y las constantes de estatus
- [ ] T043 [P] Escribir `src/features/users/api/usersApi.test.ts` con MSW (debe fallar primero): `getUserByAuth0Id(client, auth0Id, { signal })` hace `GET /api/v1/users/by-auth0-id?auth0_id=<sub>` codificando `|` en la consulta y devuelve el usuario con cualquier estatus; `404 user_not_found` llega como `ApiError`; `listUserRoles(client, userId, { signal })` hace `GET /api/v1/users/{user_id}/roles` y devuelve `Role[]`; `409 user_blocked` y `409 user_deleted` llegan como `ApiError` (contracts/users-service.md, C1 y C2)
- [ ] T044 Implementar `src/features/users/api/usersApi.ts` y `src/features/users/index.ts` (tras T042 y T043): el `index.ts` exporta los esquemas, `PlatformUser`, `USER_STATUS`, `getUserByAuth0Id` y `listUserRoles`; importa `Role` desde `@/features/roles`
- [ ] T045 [P] Escribir `src/features/auth/policy/authorizedRoles.test.ts` (debe fallar primero): `isAuthorizedRoleName(name)` es `true` para `Administrator`, `Developer`, `Marketing` y `Billing` sin distinguir mayúsculas ni espacios (`' marketing '`) y `false` para `Owner`, `Support`, `Doctor`, `Nurse` y `Receptionist`
- [ ] T046 Implementar `src/features/auth/policy/authorizedRoles.ts` (tras T045): constante `AUTHORIZED_ROLE_NAMES` (`Administrator`, `Developer`, `Marketing`, `Billing`) con un comentario que indique que el tipo de rol (de sistema o de usuario) la sustituirá, y `isAuthorizedRoleName`. Único módulo donde aparecen nombres de role (constitución V)
- [ ] T047 [P] Escribir `src/features/auth/policy/permissions.test.ts` (debe fallar primero): `can(access, { resource, action })` con `resource` ∈ `users`, `subscriptions`, `tenants` y `action` ∈ `read`, `write`, `update`, `delete`; "Ver una sección exige `read`; sin `read` no se ofrece ninguna otra acción de esa sección" (con `users:write` sin `users:read`, `can` es `false` para todas las acciones); `hasAnySectionPermission(access)` es `true` si hay `read` en alguno de los tres recursos conocidos (independiente del registro de navegación, FR-018); correspondencia de la interfaz: ver = `read`, crear = `write`, modificar = `update`, eliminar = `delete`
- [ ] T048 Implementar `src/features/auth/policy/permissions.ts` (tras T047): tipos `PermissionResource` y `PermissionAction`, `SECTION_RESOURCES`, `can` y `hasAnySectionPermission`
- [ ] T049 [P] Escribir `src/features/auth/policy/evaluateAccess.test.ts` (debe fallar primero) para `evaluateAccess({ user, roles, permissionsByRoleId })` (`user` puede ser `null`): `null` → `{ kind: 'denied', reason: 'not_registered' }`; estatus con `id` 2, 3 u otro distinto de 1 → `denied` `inactive_account`; sin roles autorizados (por ejemplo solo `Owner`) → `denied` `no_authorized_role`; usuario con `status.id` 1 y al menos un role autorizado → `granted` con `OperatorAccess` (`user`, `roles`, `authorizedRoles`, `permissions: ReadonlySet<string>`); `permissions` = unión (sin duplicados) de los permisos de los roles autorizados únicamente (los de `Owner` no cuentan); un conjunto vacío es válido (FR-018)
- [ ] T050 Implementar `src/features/auth/policy/types.ts` (`OperatorAccess`, `AccessDecision` con `kind` `granted` o `denied` y `reason` ∈ `not_registered`, `inactive_account`, `no_authorized_role`) y `src/features/auth/policy/evaluateAccess.ts` (tras T049, T042 y T046)
- [ ] T051 [P] Escribir `src/app/providers/createQueryClient.test.ts` (debe fallar primero): `createQueryClient({ onForbidden })` configura `retry: shouldRetryQuery`, `retryDelay`, `staleTime` de 30 000 ms y mutaciones sin reintento; un `ApiError` con `status` 403 en una consulta o en una mutación llama a `onForbidden` y no cierra la sesión (FR-014); otros errores no lo llaman
- [ ] T052 Implementar `src/app/providers/createQueryClient.ts` (tras T051 y T027) con `QueryClient`, `QueryCache` y `MutationCache` y el callback `onError` que detecta el 403
- [ ] T053 Crear (tras T038, T042 y T050) `src/test/factories.ts` con fábricas tipadas para DTO y dominio: `userDto`, `roleDto`, `permissionDto` (`snake_case`, como responde el servicio, con `status: { id: 1, name: 'Activo' }` por defecto) y `operatorAccess` (dominio) con sobreescritura parcial
- [ ] T054 Crear `src/test/handlers/usersService.ts` (tras T053): `createUsersServiceMock(initialState)` con estado mutable (usuarios por `auth0_id`, roles por usuario, permisos por role) y manejadores MSW (`http` y `HttpResponse` de `msw/http`) para C1, C2 y C3 de contracts/users-service.md con sus errores (`user_not_found`, `user_blocked`, `user_deleted`, `role_not_found`, `internal_error`), base `http://localhost:5173/proxy/users`; permite simular respuestas lentas (promesas diferidas) para verificar el paralelismo
- [ ] T055 [P] Crear `src/test/auth0Double.ts`: `createAuth0Double(overrides)` devuelve un valor de `Auth0ContextInterface` basado en `initialContext` (exportado por `@auth0/auth0-react`) con `isLoading`, `isAuthenticated`, `user` y `error` configurables y `loginWithRedirect`, `logout`, `getAccessTokenSilently` y `getIdTokenClaims` como `vi.fn()` tipados (por ejemplo, `vi.fn<Auth0ContextInterface['logout']>()`), sin aserciones `as`
- [ ] T056 Crear `src/test/renderWithProviders.tsx` (tras T036, T034, T052, T030, T054 y T055): `renderWithProviders(ui | routes, options)` y `createWrapper(options)` para `renderHook`, que envuelven en `Auth0Context.Provider` (con el doble), `QueryClientProvider` (cliente nuevo por prueba con `retry: false`, o el que se pase en la opción `queryClient`), `ThemeProvider`, `NotificationsProvider`, `HttpClientsContext.Provider` (cliente hacia la base de pruebas con `getAccessToken` simulado) y `createMemoryRouter` con `initialEntries`; devuelve `{ user, router, queryClient, auth0 }` con `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` cuando se usan temporizadores simulados

**Checkpoint**: Fundación lista: `npm run test` pasa con las pruebas de esta fase y las historias pueden empezar

---

## Phase 3: User Story 1 - Iniciar sesión y entrar al backoffice (Priority: P1) 🎯 MVP

**Goal**: Una persona sin sesión se identifica con Auth0, el sistema resuelve su acceso (usuario por identificador de Auth0, roles activos y permisos de los roles autorizados) y entra a la página principal con su nombre, el cierre de sesión y las secciones que sus permisos permiten.

**Independent Test**: Con una cuenta de prueba con role autorizado y permisos asignados, abrir el backoffice, iniciar sesión y comprobar que se llega a la página principal con el nombre del operador y la navegación (quickstart V1 a V6).

### Tests for User Story 1 ⚠️

> **NOTA: escribir estas pruebas PRIMERO y comprobar que FALLAN antes de implementar**

- [ ] T057 [P] [US1] Escribir `src/features/auth/hooks/useOperatorAccess.test.tsx` con MSW y `renderHook`: usuario activo con roles `Marketing` y `Owner` → `granted` con los permisos solo de `Marketing` (US1-7); el orden de llamadas es usuario → roles → permisos de cada role autorizado y las llamadas de permisos salen en paralelo (ambas solicitudes llegan antes de que alguna responda; SC-001); sin permisos → `granted` con conjunto vacío (US1-6); `user_not_found` → `denied` `not_registered`; estatus 2 o 3 → `denied` `inactive_account` sin pedir roles; solo `Owner` → `denied` `no_authorized_role`; `role_not_found` en permisos descarta ese role; error 500 sin datos previos → `failed` tras 2 reintentos (con `retryDelay` 0); con el `QueryClient` de `createQueryClient` y reloj simulado, un servicio que nunca responde (respuesta de MSW sin resolver) deja el estado en `resolving` mientras se agotan 3 intentos de `ACCESS_CHECK_ATTEMPT_TIMEOUT_MS` con las esperas reales de 1 000 y 2 000 ms y pasa a `failed` a los 27 000 ms, nunca después de 30 000 ms (FR-005, SC-011); cancelar la consulta (`queryClient.cancelQueries`) con una respuesta diferida de MSW aborta las solicitudes en curso (constitución IV: llamadas cancelables); con sesión pero sin `sub` (o vacío) devuelve `failed` sin hacer solicitudes (reclamaciones validadas con Zod, constitución II); `accountEmail` es el correo del token o `null` si no lo trae; sin sesión (`isAuthenticated` falso) no hace solicitudes
- [ ] T058 [P] [US1] Escribir `src/app/router/ProtectedRoute.test.tsx`: sin sesión redirige a `/access` con el estado `returnTo` = ruta y búsqueda pedidas (US1-1 y US1-3); mientras Auth0 inicializa o el acceso se resuelve muestra `PageLoader` y no renderiza nada protegido (FR-006); con acceso concedido renderiza el `Outlet`
- [ ] T059 [P] [US1] Escribir `src/features/auth/components/AccessPage.test.tsx`: muestra el título y el botón `messages.access.loginButton`; al pulsarlo llama a `loginWithRedirect({ appState: { returnTo } })` con `returnTo` tomado del estado del router y saneado con `toSafeInternalPath` (por defecto `/`); no hay campos de contraseña ni de texto (FR-002); con sesión y acceso concedido redirige a `/` (US1-4); muestra el aviso de `messages.access.notices` según `location.state.notice` (`cancelled`, `idpError`, `expired`, `idle`); sin violaciones de axe
- [ ] T060 [P] [US1] Escribir `src/features/auth/components/CallbackPage.test.tsx`: muestra `messages.callback.progress` mientras `isLoading`; con el error de Auth0 `access_denied` redirige a `/access` con `notice: 'cancelled'`; con cualquier otro error, `notice: 'idpError'` (FR-015); nunca muestra contenido protegido
- [ ] T061 [P] [US1] Escribir `src/features/auth/hooks/useOperatorIdentity.test.tsx`: `displayName` = `firstName` + `paternalLastName` del usuario de MailySoft; `initials` = primeras letras de las dos primeras palabras en mayúscula; `firstName`, `paternalLastName`, `maternalLastName` (`null` cuando no tiene), `email` y roles activos salen del acceso resuelto: aunque el doble de Auth0 traiga `name`, `email` o `picture` distintos, se ignoran (aclaraciones 11 y 12; data-model.md, D14); el correo del token solo lo usan las pantallas de acceso denegado y de comprobación fallida (T066)
- [ ] T062 [P] [US1] Escribir `src/app/navigation/sections.test.ts`: `getVisibleSections(access, sections)` devuelve solo las secciones cuyo `resource` tiene `read` según `can`; un registro vacío devuelve `[]` (FR-009)
- [ ] T063 [P] [US1] Escribir `src/features/home/HomePage.test.tsx`: muestra `messages.home.greeting(displayName)`; el aviso `messages.home.noPermissionsNotice` aparece si y solo si `hasAnySectionPermission(access)` es falso (FR-018, US1-6); no aparece con `tenants:read`; sin violaciones de axe
- [ ] T064 [P] [US1] Escribir `src/app/layouts/AppLayout.test.tsx`: el encabezado muestra el nombre del operador y el botón `messages.common.logout`; la navegación lista solo las secciones visibles (inyectando secciones de ejemplo); existen el enlace `messages.nav.skipLink` y las regiones `banner`, `navigation` y `main`; sin violaciones de axe (US1-5)
- [ ] T065 [P] [US1] Escribir `src/app/router/accessFlow.test.tsx` (integración con `createMemoryRouter`, MSW y el doble de Auth0): sin sesión, abrir `/` muestra la pantalla de acceso; al cambiar el doble a autenticado con una cuenta con role autorizado se llega a `/` y se ve el saludo con el nombre; nada protegido se renderiza antes de que el acceso esté concedido
- [ ] T139 [P] [US1] Escribir `src/app/router/RouteErrorBoundary.test.tsx` (debe fallar primero; constitución: Error Boundaries global y por ruta): (a) con un router de prueba cuyo layout tiene un encabezado y una ruta hija que lanza un error al renderizar, se muestra el `ErrorState` con `messages.errors.routeTitle` y `messages.errors.unexpected`, el encabezado sigue visible y `logger.error` recibe el error sin datos personales; (b) recorre `appRoutes` y comprueba que la ruta raíz y cada ruta de página (con `path` o `index`) definen `ErrorBoundary: RouteErrorBoundary`; el fallback no tiene violaciones de axe
- [ ] T141 [P] [US1] Escribir `src/app/navigation/sections.roles.test.ts` (debe fallar primero; SC-007, FR-017, quickstart V16): con secciones de ejemplo (Usuarios → `users`, Tipos de suscripción → `subscriptions`, Clínicas → `tenants`) y `evaluateAccess` con las fábricas de T053, la matriz del paso 2 del quickstart: Administrator (`users:*`, `subscriptions:*`, `tenants:*`) ve las tres secciones y las 12 acciones; Marketing (`tenants:read`) ve solo Clínicas y solo `read`; Billing (`subscriptions:*`) ve solo Tipos de suscripción y sus cuatro acciones; Developer (sin permisos) no ve secciones y `hasAnySectionPermission` es falso; Marketing más Owner (con permisos propios en el doble) se comporta como solo Marketing; `users:write` sin `users:read` no muestra la sección ni ninguna acción. En cada caso, las secciones de `getVisibleSections` y el conjunto de pares `recurso:acción` con `can` verdadero coinciden exactamente con los permisos de los roles autorizados

### Implementation for User Story 1

- [ ] T066 [US1] Implementar `src/features/auth/schemas/operatorClaims.ts` (esquema Zod con `sub` texto no vacío y `email` texto opcional: las reclamaciones del token son una frontera, constitución II), `src/features/auth/hooks/accessKeys.ts` (fábrica `accessKeys.operator(sub)`) y `src/features/auth/hooks/useOperatorAccess.ts`: una `useQuery` con clave `accessKeys.operator(sub)` habilitada solo si `isAuthenticated` y `operatorClaimsSchema.safeParse(user)` tiene éxito (con sesión y reclamaciones inválidas devuelve `failed` sin hacer solicitudes); `queryFn` recibe el `signal` de la consulta y en cada intento ejecuta toda la cadena dentro de `runWithTimeout(signal, ACCESS_CHECK_ATTEMPT_TIMEOUT_MS, ...)` (T029), pasando la señal resultante a todas las llamadas, de modo que son cancelables (constitución IV) y el fallo aparece a los 27 s o antes contando los reintentos, nunca después de 30 s (FR-005, SC-011); la cadena es `getUserByAuth0Id` (un 404 `user_not_found` equivale a usuario `null`) → si `status.id` ≠ `USER_STATUS.ACTIVE` no pide roles → `listUserRoles` (un 409 se trata como cuenta no activa) → `listRolePermissions` de cada role autorizado en paralelo con `Promise.all` (un 404 `role_not_found` descarta ese role) → `evaluateAccess`; opciones `refetchInterval: ACCESS_RECHECK_INTERVAL_MS`, `refetchOnWindowFocus: 'always'`, `refetchIntervalInBackground: false`, `staleTime: ACCESS_RECHECK_INTERVAL_MS`; el hook se llama siempre (sin llamadas condicionales) y devuelve un estado de la guarda `resolving`, `failed` (sin datos y con error, con `refetch`), `denied` (con `reason`) o `granted` (con `access`), más `accountEmail` (el correo validado del token o `null`) para las pantallas de acceso denegado y de comprobación fallida; con datos previos y un error de recomprobación conserva el último estado. Hace pasar T057
- [ ] T067 [US1] Implementar (tras T066) `src/features/auth/hooks/useOperatorIdentity.ts`, que se calcula solo con el usuario de MailySoft del acceso resuelto y devuelve `{ displayName, firstName, paternalLastName, maternalLastName, email, initials, roles }` (`maternalLastName` es `string | null`); no lee el `user` de Auth0 (el servicio de usuarios no guarda imagen, así que no hay `pictureUrl`). Hace pasar T061
- [ ] T068 [P] [US1] Implementar `src/features/auth/hooks/useLogout.ts` mínimo y `src/features/auth/components/LogoutButton.tsx`: `useLogout()` devuelve `logout()` que ejecuta `queryClient.clear()` y luego `logout({ logoutParams: { returnTo: `${window.location.origin}/access` } })` del SDK (US3 lo amplía con el aviso entre pestañas y US4 con el motivo de inactividad); `LogoutButton` es un `Button` de MUI con `messages.common.logout`
- [ ] T069 [US1] Implementar `src/features/auth/components/AccessPage.tsx` (tras T066): título, descripción y botón `loginButton` (`loginWithRedirect({ appState: { returnTo } })`); `returnTo` del estado del router saneado; avisos validados con Zod (`z.enum(['idle', 'expired', 'cancelled', 'idpError'])`) y mostrados con `Alert`; redirige a `/` si hay sesión con acceso concedido; usa `useFocusOnMount` en el `h1`. Hace pasar T059
- [ ] T070 [P] [US1] Implementar `src/features/auth/components/CallbackPage.tsx`: indicador de progreso y, ante `error` del contexto de Auth0, `Navigate` a `/access` con `state: { notice }` (`access_denied` → `cancelled`, otro → `idpError`) y `replace`. Hace pasar T060
- [ ] T071 [US1] Implementar (tras T066 y T067) `src/features/home/HomePage.tsx` y `src/features/home/index.ts`: saludo con `displayName`, `Alert` de `noPermissionsNotice` solo si no hay permisos (usa `hasAnySectionPermission`) y `useFocusOnMount` en el `h1`; no lista secciones (la navegación vive en el layout). Hace pasar T063
- [ ] T072 [P] [US1] Implementar `src/app/navigation/sections.ts`: tipo `SectionDefinition` (`id`, `path`, `labelKey`, `resource`), `sections: SectionDefinition[] = []` (vacío: solo las implementadas, FR-009) y `getVisibleSections`. Hace pasar T062 y T141
- [ ] T073 [US1] Crear `src/features/auth/index.ts` con la API pública: `AccessPage`, `CallbackPage`, `LogoutButton`, `useOperatorAccess`, `useOperatorIdentity`, `useLogout`, `can`, `hasAnySectionPermission`, `SECTION_RESOURCES` y los tipos `OperatorAccess`, `AccessDecision`, `PermissionResource` y `PermissionAction` (las siguientes historias añaden sus exportaciones)
- [ ] T074 [US1] Implementar `src/app/layouts/AppLayout.tsx`, `src/app/layouts/PublicLayout.tsx` y `src/app/layouts/useRouteAccessibility.ts` (tras T067, T068, T072 y T035): `useRouteAccessibility` fija `document.title` = `<título> — MailySoft Backoffice` desde `handle.titleKey` de la ruta y mueve el foco al encabezado principal tras cada cambio de ruta; `AppLayout` tiene enlace para saltar al contenido, `header` con el nombre del operador y `LogoutButton`, `nav` con `getVisibleSections`, y `main` con `Suspense` (fallback `PageLoader`) y `Outlet`; `PublicLayout` envuelve las pantallas públicas. Diseño adaptable (FR-022, SC-010, research D20): contenedor de MUI con ancho máximo y márgenes fluidos, sin anchos fijos ni `overflow-x`; la `Toolbar` del encabezado y la `nav` usan `flexWrap: 'wrap'` con `gap` para reacomodarse hasta 320 px; los textos largos (como el nombre del operador) se parten con `overflowWrap: 'anywhere'` en lugar de cortarse; el cierre de sesión (y el enlace al perfil que añade T128) permanecen visibles en el encabezado a cualquier ancho (SC-005); las pantallas públicas centran su contenido con `width: 100%` y `maxWidth`. Hace pasar T064
- [ ] T075 [US1] Implementar `src/app/router/ProtectedRoute.tsx` (tras T066): llama siempre a `useAuth0` y `useOperatorAccess`; `isLoading` → `PageLoader`; sin sesión → `Navigate` a `/access` con `replace` y `state: { returnTo: location.pathname + location.search }` (T121 añade `notice: 'expired'` cuando la sesión venció); `resolving` → `PageLoader`; `denied` y `failed` → `ErrorState` genérico con cierre de sesión (cierre seguro; US2 lo sustituye por las pantallas específicas); `granted` → `Outlet`. Hace pasar T058
- [ ] T076 [P] [US1] Implementar `src/app/router/RouteErrorBoundary.tsx` (función): usa `useRouteError` e `isRouteErrorResponse` de `react-router`, registra con `logger.error` y muestra `ErrorState` con `messages.errors.routeTitle` y `messages.errors.unexpected`. Hace pasar T139
- [ ] T077 [US1] Implementar `src/app/router/routes.tsx` (tras T069, T070, T071, T074, T075 y T076): exporta `appRoutes` con `ErrorBoundary: RouteErrorBoundary` en la ruta raíz (errores de layouts y proveedores) y también en cada ruta de página (`/access`, `/callback` y el índice `/`; las rutas que añaden T119, T128 y T131 llevan el mismo), de modo que el error de una página se muestra dentro del layout con el encabezado y el cierre de sesión todavía visibles (constitución: Error Boundaries global y por ruta); rutas públicas `/access` y `/callback` bajo `PublicLayout` (`handle.titleKey`); ruta de layout protegida (`Component: ProtectedRoute`) con hijo `AppLayout` y el índice `/` (`HomePage` cargada con `React.lazy(() => import('@/features/home').then((m) => ({ default: m.HomePage })))`). Constitución: división por ruta con `React.lazy` y `Suspense`; se importa solo por el `index.ts` de la feature. Hace pasar T139
- [ ] T078 [US1] Crear `src/app/router/router.ts` (tras T077): `export const router = createBrowserRouter(appRoutes)` (de `react-router`)
- [ ] T079 [P] [US1] Implementar `src/app/providers/AppAuth0Provider.tsx`: `Auth0Provider` con `domain`, `clientId`, `authorizationParams: { audience, redirect_uri: `${window.location.origin}/callback`, scope: 'openid email offline_access' }`, `cacheLocation: 'memory'`, `useRefreshTokens: true`, `useRefreshTokensFallback: true`, `legacySameSiteCookie: false` y `onRedirectCallback: (appState) => router.navigate(toSafeInternalPath(appState?.returnTo), { replace: true })` (contracts/auth0-configuration.md); el alcance incluye `email` solo para mostrar la cuenta en las pantallas de acceso denegado y de comprobación fallida (aclaración 13) y no incluye `profile`, porque el nombre y los demás datos salen del servicio de usuarios (aclaración 11); recibe `env` y `router` por props
- [ ] T080 [P] [US1] Implementar `src/app/providers/HttpClientsProvider.tsx`: crea con `useState(() => ...)` el cliente `users` con `createHttpClient({ baseUrl: env.VITE_USERS_API_URL, getAccessToken, onSessionExpired })`, donde `getAccessToken` delega en `getAccessTokenSilently` de `useAuth0()` (pasando `cacheMode`) y `onSessionExpired` solo registra por ahora con `logger.warn` (US4 lo conecta); lo provee con `HttpClientsContext`
- [ ] T081 [US1] Implementar `src/app/providers/AppProviders.tsx`, `src/app/ConfigErrorScreen.tsx` y `src/app/App.tsx` (tras T079, T080, T052, T034, T036 y T032): `AppProviders({ env, router })` compone `ErrorBoundary` → `ThemeProvider` y `CssBaseline` → `NotificationsProvider` → `AppAuth0Provider` → `QueryClientProvider` (cliente de `createQueryClient`, sin `onForbidden` todavía) → `HttpClientsProvider` → `RouterProvider` de `react-router/dom`; `ConfigErrorScreen` muestra `messages.config` y la lista de variables inválidas; `App.tsx` recibe `env` y `router`
- [ ] T082 [US1] Implementar `src/main.tsx` (tras T081, T078 y T019): llama a `parseEnv(import.meta.env, { isProduction: import.meta.env.PROD })`; si falla, renderiza `ConfigErrorScreen`; si no, renderiza `App` con `env` y `router` en `StrictMode` con `createRoot`
- [ ] T083 [US1] Punto de control de la historia: ejecutar `npm run test` (debe pasar `src/app/router/accessFlow.test.tsx`, T065), `npm run typecheck`, `npm run lint` y validar manualmente V1 a V6 de [quickstart.md](quickstart.md); corregir lo que falle

**Checkpoint**: La historia 1 funciona y se prueba sola: login, acceso resuelto, página principal con navegación por permisos

---

## Phase 4: User Story 2 - Bloquear el acceso a cuentas no autorizadas (Priority: P1)

**Goal**: Quien se identifica pero no está registrado, tiene la cuenta bloqueada o eliminada, o no tiene un role autorizado ve "acceso denegado" con el motivo y el correo de su cuenta, y puede cerrar sesión; si el acceso se retira con la sesión abierta, se pierde en un máximo de 5 minutos o al volver a la pestaña.

**Independent Test**: Con las cuentas A1 y A6 a A9 del quickstart, comprobar que A9, A7, A8 y A6 ven acceso denegado sin datos protegidos y A1 entra; con A1 dentro, bloquear su cuenta y comprobar que en un máximo de 5 minutos deja de ver contenido protegido (quickstart V7 a V9).

### Tests for User Story 2 ⚠️

- [ ] T084 [P] [US2] Escribir `src/features/auth/components/AccessDeniedPage.test.tsx`: para cada motivo (`not_registered`, `inactive_account`, `no_authorized_role`) muestra `messages.denied.title` y el texto de `messages.denied.reasons`; muestra `messages.common.account(email)` con el correo recibido (y omite esa línea si no hay correo); el botón `messages.common.logout` ejecuta el cierre de sesión; no muestra nombre ni enlace al perfil ni contenido protegido; sin violaciones de axe (US2-1 a US2-3)
- [ ] T085 [P] [US2] Escribir `src/features/auth/components/AccessCheckFailedPage.test.tsx`: muestra `messages.checkFailed` y `messages.common.account(email)` con el correo recibido (y omite esa línea si no hay correo); "Reintentar" llama a `refetch` y "Cerrar sesión" ejecuta el cierre; no muestra nombre ni enlace al perfil; sin violaciones de axe (US2-5, FR-005)
- [ ] T086 [P] [US2] Escribir `src/app/router/ProtectedRoute.denied.test.tsx` con MSW: con cuenta no registrada, bloqueada, eliminada y solo `Owner`, abrir directamente `/` o `/profile` muestra el acceso denegado correspondiente, con el correo de la cuenta, y no el contenido (US2-4); con el servicio caído (500) y sin datos previos muestra `AccessCheckFailedPage` tras agotar los reintentos y, al restablecerse el servicio, "Reintentar" concede el acceso; con el `QueryClient` de `createQueryClient`, reloj simulado y el servicio colgado (una respuesta de MSW que nunca llega), muestra solo el indicador de progreso hasta los 27 000 ms y entonces `AccessCheckFailedPage`, nunca después de 30 000 ms (FR-005, SC-011)
- [ ] T087 [P] [US2] Escribir `src/features/auth/hooks/useOperatorAccess.recheck.test.tsx` con reloj simulado: tras `ACCESS_RECHECK_INTERVAL_MS` (300 000 ms) se repite la comprobación; un evento de foco (`focusManager`) la repite de inmediato aunque los datos sean recientes (`'always'`); al bloquear al usuario en el mock, la siguiente comprobación pasa a `denied` `inactive_account` y, al desbloquearlo, vuelve a `granted` sin volver a identificarse (US2-7); al quitar un permiso, `access.permissions` se actualiza (US2-8); si una recomprobación falla (500 o red) se conserva el último estado concedido (caso límite)
- [ ] T088 [P] [US2] Escribir `src/features/auth/policy/RequirePermission.test.tsx`: con `read` del recurso renderiza los hijos; sin él navega a `/` y muestra una notificación con `messages.home.permissionsChanged` (US2-8, FR-021); reacciona cuando el permiso se retira durante la sesión
- [ ] T089 [P] [US2] Escribir `src/app/providers/forbidden.test.tsx`: una consulta que falla con `ApiError` 403 muestra la notificación `messages.forbidden.action` y no llama a `logout` de Auth0 (FR-014, US2-6)

### Implementation for User Story 2

- [ ] T090 [P] [US2] Implementar `src/features/auth/components/AccessDeniedPage.tsx`: `main` con `h1` (`useFocusOnMount`), el motivo con `Alert`, la línea `messages.common.account(email)` cuando hay correo (prop `email`) y `LogoutButton`; sin nombre ni enlace al perfil (FR-008). Hace pasar T084
- [ ] T091 [P] [US2] Implementar `src/features/auth/components/AccessCheckFailedPage.tsx` con `ErrorState` (`checkFailed`), la línea `messages.common.account(email)` cuando hay correo (prop `email`), "Reintentar" (`refetch`) y `LogoutButton`; sin nombre ni enlace al perfil (FR-008). Hace pasar T085
- [ ] T092 [US2] Actualizar `src/app/router/ProtectedRoute.tsx` (tras T090 y T091): `denied` renderiza `AccessDeniedPage` con el `reason` y el `accountEmail` y `failed` renderiza `AccessCheckFailedPage` con `refetch` y el `accountEmail`, reemplazando el `ErrorState` genérico de T075; sigue sin renderizar nada protegido. Hace pasar T086
- [ ] T093 [P] [US2] Implementar `src/features/auth/policy/RequirePermission.tsx`: comprueba `can(access, { resource, action: 'read' })`; si no corresponde, `Navigate` a `/` con `replace` y `notify({ severity: 'info', message: messages.home.permissionsChanged })`. Hace pasar T088
- [ ] T094 [US2] Actualizar `src/app/providers/AppProviders.tsx` (tras T089): pasar `onForbidden` a `createQueryClient` con la función de `useNotify()` mostrando `messages.forbidden.action`. Hace pasar T089
- [ ] T095 [US2] Actualizar `src/features/auth/index.ts` para exportar `AccessDeniedPage`, `AccessCheckFailedPage` y `RequirePermission`, y ajustar `useOperatorAccess` si hace falta. Hace pasar T087
- [ ] T096 [US2] Punto de control de la historia: ejecutar las pruebas de US1 y US2 y validar manualmente V7, V8, V9 y V18 de [quickstart.md](quickstart.md)

**Checkpoint**: Las historias 1 y 2 (P1) forman el MVP seguro: se entra solo con acceso concedido y se pierde al retirarse

---

## Phase 5: User Story 3 - Cerrar sesión (Priority: P2)

**Goal**: El operador cierra su sesión desde cualquier pantalla; termina también en Auth0, los datos dejan de ser accesibles (también con el botón Atrás) y las demás pestañas pasan a la pantalla de acceso.

**Independent Test**: Con una sesión activa, cerrar sesión y comprobar que se muestra la pantalla de acceso, que Atrás no revela datos y que volver a entrar exige credenciales; con dos pestañas, cerrar en una y ver la otra pasar a la pantalla de acceso (quickstart V10 y V11).

### Tests for User Story 3 ⚠️

- [ ] T097 [P] [US3] Escribir `src/shared/lib/sessionChannel.test.ts`: `createSessionChannel()` sobre `BroadcastChannel('mailysoft-backoffice-session')`; dos instancias se comunican (`post` y `subscribe`); el mensaje `{ type: 'session-ended', reason: 'logout' | 'idle' }` se valida con Zod y los mensajes mal formados se ignoran; `subscribe` devuelve la función de baja; `close()` libera el canal; sin `BroadcastChannel` disponible se comporta como no-op sin lanzar
- [ ] T098 [P] [US3] Escribir `src/features/auth/hooks/useLogout.test.tsx`: `logout()` publica `session-ended` con motivo `logout`, vacía la caché de TanStack Query (`queryClient.clear()`) y llama a `logout` de Auth0 con `returnTo` = `${origin}/access`, en ese orden (US3-1, US3-3, FR-010)
- [ ] T099 [P] [US3] Escribir `src/features/auth/hooks/useSessionEndedListener.test.tsx`: al recibir `session-ended` por el canal, vacía la caché, llama a `logout({ openUrl: false })` y navega a `/access` (a `/access/idle` si el motivo es `idle`) sin mostrar datos nuevos (US3-4)
- [ ] T100 [P] [US3] Escribir `src/features/auth/hooks/useReloadOnBfcacheRestore.test.tsx`: un evento `pageshow` con `persisted: true` llama a `window.location.reload()` y con `persisted: false` no (FR-011, US3-2)
- [ ] T101 [P] [US3] Escribir `src/app/layouts/AppLayout.logout.test.tsx` (integración con MSW y el doble de Auth0): pulsar "Cerrar sesión" en el encabezado llama a `logout` con `returnTo` `/access` y vacía la caché; con dos renders que comparten el canal, el segundo navega a `/access` cuando el primero cierra sesión

### Implementation for User Story 3

- [ ] T102 [US3] Implementar `src/shared/lib/sessionChannel.ts` con la constante `SESSION_CHANNEL_NAME` y el esquema Zod del mensaje. Hace pasar T097
- [ ] T103 [US3] Actualizar `src/features/auth/hooks/useLogout.ts` (tras T102): `logout(reason = 'logout')` (con `reason` igual a `'logout'` o `'idle'`, el tipo del mensaje de `sessionChannel`) publica `session-ended` con ese motivo por el canal antes de vaciar la caché y de llamar a Auth0 con `returnTo` = `${origin}/access`; el comportamiento propio de `'idle'` lo añade T118. Hace pasar T098
- [ ] T104 [US3] Implementar (tras T102) `src/features/auth/hooks/useSessionEndedListener.ts` (se suscribe al canal y se da de baja al desmontar) y `src/features/auth/hooks/useReloadOnBfcacheRestore.ts` (escucha `pageshow` en `window`). Hacen pasar T099 y T100
- [ ] T105 [US3] Montar `useSessionEndedListener` en `src/app/layouts/AppLayout.tsx` y `useReloadOnBfcacheRestore` en `src/app/App.tsx`. Hace pasar T101
- [ ] T106 [US3] Actualizar `src/features/auth/index.ts` para exportar `useSessionEndedListener` y `useReloadOnBfcacheRestore`
- [ ] T107 [US3] Punto de control de la historia: ejecutar las pruebas y validar manualmente V10 y V11 de [quickstart.md](quickstart.md)

**Checkpoint**: La historia 3 funciona sola: cierre completo, Atrás sin datos y sincronización entre pestañas

---

## Phase 6: User Story 4 - Recuperarse de una sesión vencida o cerrada por inactividad (Priority: P2)

**Goal**: Si la sesión vence o se cumplen 15 minutos sin actividad (con aviso a los 14), el sistema lleva a identificarse de nuevo y, al terminar, devuelve a la pantalla donde estaba.

**Independent Test**: Con una sesión activa en `/profile`, dejarla 14 minutos sin actividad (aviso), elegir "Continuar" y repetir sin responder: a los 15 minutos se cierra la sesión, se muestra `/access/idle` con el motivo y, al identificarse, se vuelve a `/profile` (quickstart V12 y V15).

### Tests for User Story 4 ⚠️

- [ ] T108 [P] [US4] Escribir `src/features/auth/session/returnPathStorage.test.ts`: `saveReturnPath(location)` guarda en `sessionStorage` (clave `mailysoft-backoffice:return-path`) el resultado de `sanitizeReturnPathForStorage` (solo `pathname` y `page`, `page_size`, `sort`); `consumeReturnPath()` lo devuelve y lo borra (lectura única); valores ausentes, corruptos o que no pasan `toSafeInternalPath` (esquema Zod: lo leído de `sessionStorage` es una frontera, constitución II) devuelven `/`
- [ ] T109 [P] [US4] Escribir `src/features/auth/session/tokenErrors.test.ts`: `mapAuth0TokenError(error)` convierte `login_required`, `consent_required`, `invalid_grant`, `MissingRefreshTokenError` y `TimeoutError` en `SessionExpiredError` y deja pasar cualquier otro error sin cambios (contracts/auth0-configuration.md)
- [ ] T110 [P] [US4] Escribir `src/features/auth/hooks/useSessionLifecycle.test.tsx` con reloj simulado y `react-idle-timer` real: a los 14 minutos sin actividad se abre el aviso (`isPrompted`); "Continuar" reinicia el conteo; a los 15 minutos sin actividad llama a `logout('idle')` (US4-3 a US4-5, SC-008); `mousedown`, `keydown` y `touchstart` cuentan como actividad y `mousemove` o `wheel` no; un cambio de ruta cuenta como actividad; deshabilitado sin sesión; las recomprobaciones automáticas del acceso (T087) no reinician el temporizador; con un espía sobre `useIdleTimer` se comprueba que recibe `crossTab: true`, `syncTimers`, `stopOnIdle: true`, `promptBeforeIdle: IDLE_PROMPT_BEFORE_MS` y `timeout: IDLE_TIMEOUT_MS`
- [ ] T111 [P] [US4] Escribir `src/features/auth/components/IdleWarningDialog.test.tsx`: muestra `messages.idleDialog.body(seconds)` con la cuenta atrás (60, 59, …); "Continuar" activa el temporizador; "Cerrar sesión" ejecuta el cierre; tiene `role="alertdialog"`, atrapa el foco y es operable con teclado; sin violaciones de axe
- [ ] T112 [P] [US4] Escribir `src/features/auth/hooks/useLogout.idle.test.tsx`: `logout('idle')` guarda la ruta actual saneada con `saveReturnPath` antes de cerrar y llama a Auth0 con `returnTo` = `${origin}/access/idle`; el cierre voluntario no guarda nada (research D11)
- [ ] T113 [P] [US4] Escribir `src/features/auth/components/AccessPage.idle.test.tsx`: en `/access/idle` muestra `messages.access.notices.idle`; "Iniciar sesión" usa como `returnTo` la ruta guardada (lectura única) o `/` si no hay (US4-2)
- [ ] T114 [P] [US4] Escribir `src/features/auth/hooks/useSessionExpiry.test.tsx` (integración con `createMemoryRouter`, la guarda real y un doble de Auth0 cuyo `logout` pone `isAuthenticated` en falso): con la sesión en una ruta protegida, el manejador de sesión vencida deja la sesión local cerrada, la caché vacía y la aplicación en `/access` con `state: { notice: 'expired', returnTo: <ruta y búsqueda de antes> }`, tanto si `logout` resuelve de inmediato como si lo hace de forma diferida (el aviso no se pierde porque solo la guarda redirige); las llamadas repetidas del manejador se ejecutan una sola vez; un `location.state` ajeno o inválido no produce el aviso (US4-1, US4-2, FR-013)

### Implementation for User Story 4

- [ ] T115 [P] [US4] Implementar `src/features/auth/session/returnPathStorage.ts`: único archivo con `sessionStorage` (excepción registrada en Complexity Tracking del plan), con `saveReturnPath` y `consumeReturnPath` (esta valida lo leído con `toSafeInternalPath`, basado en Zod). Hace pasar T108
- [ ] T116 [P] [US4] Implementar `src/features/auth/session/tokenErrors.ts` con `mapAuth0TokenError`. Hace pasar T109
- [ ] T117 [US4] Implementar `src/features/auth/hooks/useSessionLifecycle.ts`, `src/features/auth/components/IdleWarningDialog.tsx` y `src/features/auth/components/SessionLifecycle.tsx` (tras T115 y T103): `useIdleTimer({ timeout: IDLE_TIMEOUT_MS, promptBeforeIdle: IDLE_PROMPT_BEFORE_MS, events: ['mousedown', 'keydown', 'touchstart'], crossTab: true, syncTimers: 200, stopOnIdle: true, disabled: !isAuthenticated, onPrompt, onActive, onIdle: () => logout('idle') })`; un efecto que llama a `activate()` en cada cambio de ubicación del router (sincronización con un sistema externo); `IdleWarningDialog` (MUI `Dialog` con `fullWidth` y `maxWidth="xs"` para que quepa hasta 320 px, FR-022, y con cuenta atrás por intervalo) con "Continuar" y "Cerrar sesión"; `SessionLifecycle` une hook y diálogo. Verificar las opciones en la documentación de `react-idle-timer`. Hace pasar T110 y T111
- [ ] T118 [US4] Actualizar `src/features/auth/hooks/useLogout.ts` (tras T115 y T103): con `'idle'` guarda la ruta con `saveReturnPath` y usa `returnTo` = `${origin}/access/idle` (el motivo ya viaja en el mensaje del canal desde T103). Hace pasar T112
- [ ] T119 [US4] Actualizar `src/features/auth/components/AccessPage.tsx` y `src/app/router/routes.tsx` (tras T115): la ruta pública `/access/idle` (`handle.titleKey` de acceso y `ErrorBoundary: RouteErrorBoundary`) renderiza `AccessPage` con el aviso de inactividad y su `returnTo` sale de `consumeReturnPath()`. Hace pasar T113
- [ ] T120 [US4] Implementar `src/features/auth/session/expiredState.ts` (esquema Zod del estado de ubicación `{ sessionExpired: true }`, con `markSessionExpired()` y `readSessionExpired(state: unknown)`, que usa `safeParse` y no lanza) y `src/features/auth/hooks/useSessionExpiry.ts` (tras T116): `useSessionExpiry(router)` devuelve el manejador de sesión vencida, idempotente (ignora las llamadas mientras se ejecuta), que sigue este orden: (1) `await router.navigate(router.state.location, { replace: true, state: markSessionExpired() })` para anotar el aviso en la ubicación actual, (2) `await logout({ openUrl: false })` y (3) `queryClient.clear()`. No navega a `/access`: de eso se encarga solo la guarda (T121), para que no compitan dos redirecciones. Hace pasar T114
- [ ] T121 [US4] Actualizar `src/app/providers/HttpClientsProvider.tsx`, `src/app/providers/AppProviders.tsx` y `src/app/router/ProtectedRoute.tsx` (tras T116 y T120): envolver `getAccessToken` con `mapAuth0TokenError`, conectar `onSessionExpired` a `useSessionExpiry(router)` y hacer que la guarda, sin sesión, redirija a `/access` con `state: { returnTo, notice: 'expired' }` cuando `readSessionExpired(location.state)` sea verdadero. Hace pasar T114
- [ ] T122 [US4] Montar `SessionLifecycle` en `src/app/layouts/AppLayout.tsx` (tras T117)
- [ ] T123 [US4] Actualizar `src/features/auth/index.ts` para exportar `SessionLifecycle`, `useSessionExpiry`, `readSessionExpired` y `mapAuth0TokenError`
- [ ] T124 [US4] Punto de control de la historia: ejecutar las pruebas y validar manualmente V12 y V15 de [quickstart.md](quickstart.md)

**Checkpoint**: La historia 4 funciona sola: aviso, cierre por inactividad, retorno y manejo de la sesión vencida

---

## Phase 7: User Story 5 - Consultar mi perfil (Priority: P3)

**Goal**: El operador abre su perfil (solo lectura) y ve su nombre, apellidos, correo, iniciales y roles activos.

**Independent Test**: Con una sesión activa, abrir el perfil y comparar los datos con los de la cuenta de prueba, sin opciones de edición (quickstart V13).

### Tests for User Story 5 ⚠️

- [ ] T125 [P] [US5] Escribir `src/features/profile/ProfilePage.test.tsx`: muestra, como datos separados y con su etiqueta, el nombre, el apellido paterno, el apellido materno (`messages.profile.emptyValue` cuando es nulo) y el correo del usuario de MailySoft, las iniciales en el avatar (decorativo, sin `img`) y la lista de roles activos (o `messages.profile.noRoles`); no hay campos de edición ni botón "Editar" (US5-2); sin violaciones de axe
- [ ] T126 [P] [US5] Escribir `src/app/layouts/AppLayout.profile.test.tsx`: el encabezado incluye el enlace `messages.nav.profile` hacia `/profile` visible en cualquier pantalla autenticada, de modo que perfil y cierre de sesión se alcanzan con una sola interacción (SC-005, FR-008)

### Implementation for User Story 5

- [ ] T127 [P] [US5] Implementar `src/features/profile/ProfilePage.tsx` y `src/features/profile/index.ts`: usa `useOperatorIdentity`; `Avatar` de MUI con `initials` (decorativo, `aria-hidden`; el servicio de usuarios no guarda imagen); datos de solo lectura con su etiqueta (`messages.profile.name`, `paternalLastName`, `maternalLastName` con `emptyValue` si es nulo, y `email`); lista de roles; `useFocusOnMount` en el `h1`. Hace pasar T125
- [ ] T128 [US5] Registrar la ruta `/profile` en `src/app/router/routes.tsx` (hijo de `AppLayout`, `ProfilePage` con `React.lazy` desde `@/features/profile`, `handle.titleKey` de perfil y `ErrorBoundary: RouteErrorBoundary`) y añadir el enlace `messages.nav.profile` al encabezado de `src/app/layouts/AppLayout.tsx` (tras T127). Hace pasar T126
- [ ] T129 [US5] Punto de control de la historia: ejecutar las pruebas y validar manualmente V13 de [quickstart.md](quickstart.md)

**Checkpoint**: Las cinco historias funcionan; queda el trabajo transversal

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras que afectan a varias historias y puertas de calidad finales

- [ ] T130 [P] Escribir y crear `src/app/pages/NotFoundPage.test.tsx` y `src/app/pages/NotFoundPage.tsx`: muestra `messages.notFound.title`, `messages.notFound.message` y un enlace `messages.notFound.backHome` hacia `/` (FR-016); `useFocusOnMount` en el `h1`; sin violaciones de axe
- [ ] T131 Registrar la ruta comodín `*` en `src/app/router/routes.tsx` (tras T130, con `ErrorBoundary: RouteErrorBoundary`), dentro del layout protegido: sin sesión la guarda redirige antes a `/access` (FR-001) y, con acceso, muestra `NotFoundPage` (`React.lazy`); añadir una prueba en `src/app/router/accessFlow.test.tsx` para `/no-existe` con y sin sesión
- [ ] T132 [P] Crear `playwright.config.ts` y `e2e/fixtures/accounts.ts`: `baseURL` `http://localhost:5173`, `webServer` con `npm run dev`, un proyecto `chromium`; `accounts.ts` lee desde las variables de entorno `E2E_AUTH0_USER_A1` a `E2E_AUTH0_USER_A9` (y sus contraseñas `E2E_AUTH0_PASSWORD_*`) las cuentas del quickstart; los E2E se omiten con `test.skip` si faltan (constitución VII: solo con entorno de Auth0 de pruebas). Ejecutar `npx playwright install chromium`
- [ ] T133 Crear (tras T132) `e2e/access.spec.ts` (omitido sin `E2E_*`): V1 a V3 (acceso sin sesión, login con A1, retorno a la dirección pedida), V7 (cuentas A9, A7, A8 y A6 denegadas) y V10 (cierre de sesión, Atrás y reidentificación) de [quickstart.md](quickstart.md), más una medición de SC-001 (la página principal aparece en menos de 5 000 ms tras la identificación)
- [ ] T134 Crear (tras T132) `e2e/session.spec.ts` (omitido sin `E2E_*`) con `page.clock` de Playwright: V9 (recomprobación a los 5 minutos tras bloquear la cuenta), V11 (cierre en una pestaña y la otra pasa a `/access`) y V12 (aviso a los 14 minutos, "Continuar", cierre a los 15 con `/access/idle` y retorno a la pantalla anterior)
- [ ] T140 Crear (tras T132) `e2e/responsive.spec.ts` (omitido sin `E2E_*`; FR-022, SC-010, quickstart V17): para cada pantalla (acceso sin sesión, acceso denegado con A9, inicio, perfil y `/no-existe` con A1) y con la ventana a 1024×768 y a 320×640, comprueba que `document.documentElement.scrollWidth` no supera `clientWidth` (sin desplazamiento horizontal) y que "Perfil" y "Cerrar sesión" son visibles en el encabezado de las pantallas con acceso concedido (SC-005)
- [ ] T135 [P] Actualizar `README.md` (en español): descripción del proyecto, requisitos (Node 24, npm 11, Auth0, servicio de usuarios), instalación y variables de entorno (`.env.example`), scripts de `package.json`, estructura de carpetas, enlaces a `specs/` y a la constitución, y notas de despliegue (HTTPS, `Cache-Control: no-store` para `index.html`, CSP, CORS o proxy inverso; contracts/environment.md)
- [ ] T136 Ejecutar todas las puertas de calidad y corregir lo que falle: `npm run typecheck`, `npm run lint` (sin advertencias), `npm run format:check`, `npm run test:coverage` (mínimo 80 % de líneas sobre las capas incluidas en `vite.config.ts`), `npm run build` y `npm run size` (JS de la ruta de entrada ≤ 300 KB gzip); registrar en `README.md` la línea base de tamaño medida
- [ ] T137 [P] Comprobaciones de seguridad (constitución V): confirmar con búsquedas en `src/` que no hay `console.` fuera de `src/shared/lib/logger.ts`, `localStorage`, `dangerouslySetInnerHTML`, `any` explícito, aserciones `as` (salvo `as const`) ni secretos, y que, fuera de las pruebas, `sessionStorage` solo aparece en `src/features/auth/session/returnPathStorage.ts`; ejecutar `npm audit --omit=dev --audit-level=high`
- [ ] T138 Ejecutar la guía de validación completa de [quickstart.md](quickstart.md) (V1 a V18 con las cuentas A1 a A9) y corregir las discrepancias con la spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; T001 a T003 van en orden (mismo `package.json`) y T004 a T014 se pueden hacer en paralelo después; T015 verifica todo
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias; dentro de la fase, cada prueba precede a su implementación y la infraestructura de pruebas (T056) cierra la fase
- **User Stories (Phase 3 a 7)**: dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran entregar

### User Story Dependencies

- **US1 (P1)**: tras Foundational; sin dependencias de otras historias
- **US2 (P1)**: depende de US1 (guarda, `useOperatorAccess`, layout); reemplaza el estado genérico de `ProtectedRoute`
- **US3 (P2)**: depende de US1 (`useLogout`, `AppLayout`)
- **US4 (P2)**: depende de US3 (`sessionChannel` y `useLogout` ampliado) y de US1
- **US5 (P3)**: depende de US1 (`AppLayout`, `useOperatorIdentity`); es independiente de US2 a US4

### Within Each User Story

- Las pruebas se escriben primero y deben fallar antes de implementar
- Esquemas y utilidades antes de hooks; hooks antes de componentes; componentes antes de rutas y proveedores
- Cada historia termina con su punto de control antes de pasar a la siguiente

### Archivos compartidos (evitar tareas en paralelo sobre ellos)

| Archivo | Tareas que lo modifican (en este orden) |
|---|---|
| `src/app/layouts/AppLayout.tsx` | T074, T105, T122, T128 |
| `src/app/router/routes.tsx` | T077, T119, T128, T131 |
| `src/features/auth/hooks/useLogout.ts` | T068, T103, T118 |
| `src/app/router/ProtectedRoute.tsx` | T075, T092, T121 |
| `src/features/auth/index.ts` | T073, T095, T106, T123 |
| `src/app/providers/AppProviders.tsx` | T081, T094, T121 |
| `src/app/providers/HttpClientsProvider.tsx` | T080, T121 |
| `src/app/App.tsx` | T081, T105 |
| `src/features/auth/components/AccessPage.tsx` | T069, T119 |

### Parallel Opportunities

- Setup: T004 a T014 en paralelo tras T003
- Foundational: las pruebas de unidades distintas (T018, T020, T022, T024, T026, T037, T041, T045, T047, T049, T051) son paralelas entre sí; también T016, T017, T031, T034 a T036 y T055
- Cada historia: todas sus pruebas marcadas [P] pueden escribirse a la vez
- Tras US1, US2, US3 y US5 pueden avanzar en paralelo con personas distintas si se coordinan los archivos compartidos de la tabla anterior (US4 espera a US3)

---

## Parallel Example: User Story 1

```bash
# Escribir juntas las pruebas de la historia 1 (archivos distintos):
Task: "T057 useOperatorAccess.test.tsx en src/features/auth/hooks/"
Task: "T058 ProtectedRoute.test.tsx en src/app/router/"
Task: "T059 AccessPage.test.tsx en src/features/auth/components/"
Task: "T060 CallbackPage.test.tsx en src/features/auth/components/"
Task: "T061 useOperatorIdentity.test.tsx en src/features/auth/hooks/"
Task: "T062 sections.test.ts en src/app/navigation/"
Task: "T063 HomePage.test.tsx en src/features/home/"
Task: "T064 AppLayout.test.tsx en src/app/layouts/"
Task: "T139 RouteErrorBoundary.test.tsx en src/app/router/"
Task: "T141 sections.roles.test.ts en src/app/navigation/"

# Después, implementar en paralelo lo que no comparte archivos:
Task: "T068 useLogout.ts y LogoutButton.tsx"
Task: "T070 CallbackPage.tsx"
Task: "T072 sections.ts"
```

---

## Implementation Strategy

### MVP First (Historias 1 y 2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (BLOQUEA todo)
3. Completar Phase 3: US1
4. Completar Phase 4: US2 (en este producto el MVP son US1 y US2 juntas: "sin esta barrera no es seguro liberar ninguna otra funcionalidad")
5. **PARAR y VALIDAR**: quickstart V1 a V9 con las cuentas A1 a A9
6. Desplegar o demostrar si procede

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 + US2 → acceso seguro (MVP)
3. US3 → cierre de sesión completo; luego US4 → inactividad y sesión vencida; luego US5 → perfil
4. Polish → 404, E2E preparados, README, puertas de calidad finales
5. Cada historia añade valor sin romper las anteriores; PRs pequeños y enfocados (constitución): como mínimo un PR por fase y por historia

### Parallel Team Strategy

1. El equipo completa Setup y Foundational junto
2. Con Foundational lista: una persona hace US1 y US2 (MVP); otra puede preparar US5; US3 y US4 siguen a US1 (coordinar los archivos compartidos)

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad
- Verificar que las pruebas fallan antes de implementar
- T139, T140 y T141 se añadieron después del análisis y de las aclaraciones de la spec; conservan su numeración para no alterar las referencias y se ejecutan en la fase donde aparecen
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés)
- Las versiones mayores recientes (React Router 8, MUI 9, MSW 3, Vitest 5, TypeScript 6) cambian APIs respecto a versiones anteriores: contrastar con su documentación antes de codificar lo no verificado en research.md
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia
