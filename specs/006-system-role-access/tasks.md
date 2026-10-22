# Tasks: Acceso al Backoffice Solo con Rol de Sistema

**Input**: Design documents from `/specs/006-system-role-access/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md y `.specify/memory/constitution.md` (v1.3.0)

**Tests**: Incluidas. La plantilla las marca como opcionales, pero la constitución (VII) exige pruebas automatizadas en el mismo PR y pruebas primero en la lógica pura y en las políticas de autorización, y la spec las pide expresamente (SC-009: "El 100 % de los casos de la regla... tienen pruebas automatizadas"). Dentro de cada fase, las pruebas se escriben ANTES de la implementación y DEBEN fallar al principio.

Se usan Vitest, React Testing Library, user-event y MSW. Hay dos simuladores del servicio de usuarios ya existentes (`src/test/handlers/usersService.ts`, simple, y `src/test/handlers/usersDirectory/`, con el modelo completo); ninguno se sustituye, los dos ganan el campo `type`. Nunca se simula `fetch` ni el cliente HTTP. Auth0 se simula con el doble centralizado (`src/test/auth0Double.ts`), y las pruebas de integración usan `renderWithProviders`/`appRoutes` (la aplicación completa).

**Organization**: Tareas agrupadas por historia de usuario para poder implementar y probar cada una por separado. Las tres historias P1 (US1 a US3) comparten la misma regla y las mismas pantallas, así que US1 y US3 son, sobre todo, verificación de lo que construyen la fase Foundational y US2 — se señala en cada caso qué es código nuevo y qué es solo la prueba que fija esa garantía.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1 a US5); solo en las fases de historias
- Cada descripción incluye las rutas exactas de los archivos

## Path Conventions

- **Proyecto único** en la raíz del repositorio (plan.md): `src/`, `e2e/`. Ninguna feature nueva: todo vive en `features/auth` y en `app/router`.
- **Idiomas**: código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español (`src/shared/messages/es.ts`).
- **Importaciones**: alias `@/` → `src/`; dependencias `app → features → shared`. `features/auth` NO puede importar `app/providers` (regla de `eslint-plugin-boundaries`, `default: 'disallow'`): la URL de FR-015 llega por props desde `AccessDeniedRoute`, nunca por un hook propio de la feature (research D6). No hace falta tocar `forbidAuthImports` en `eslint.config.js`: no se crea ninguna feature nueva.
- **`src/test/**` está fuera de los límites de `eslint-plugin-boundaries`** (`boundaries/ignore`): los simuladores pueden definir sus propias constantes de tipo sin importar `roleTypes.ts`, como ya hacen con los estatus (`model.ts` no importa `userStatus.ts`).
- **Reglas de ESLint**: sin aserciones `as` (salvo `as const`), sin `any`, sin `console.*`; componentes `.tsx` de 250 líneas como máximo; sin `Date.now()`/`window` en el render (`react-hooks/purity`, constitución I).
- **Cobertura**: los archivos de `policy`, `schemas` y `hooks` que cambian ya cuentan para el umbral de 80 % de líneas (`vite.config.ts`); no se añade ninguna carpeta nueva fuera de él.
- **Patrón de reloj simulado** (para la recomprobación periódica, igual que `useOperatorAccess.recheck.test.tsx`): crear el simulador, `vi.useFakeTimers()`, renderizar, avanzar con `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })`, y en `afterEach`, `vi.useRealTimers()`.
- **`toMatchObject` en los simuladores**: las aserciones existentes sobre la respuesta de `/authorization/me` (p. ej. `src/test/handlers/usersDirectory/me.test.ts`) usan `toMatchObject`, que ignora los campos no mencionados: añadir `type` a cada rol no las rompe y no hace falta tocar ese archivo.

## Prerrequisitos manuales (fuera de las tareas)

Ninguno nuevo. Las cuentas de prueba de la feature 001 (A1 Administrator, A6 ahora "solo un rol de Clínica", A7 bloqueada, A8 eliminada, A9 sin usuario en MailySoft) ya cubren lo que esta feature necesita validar a mano o por E2E (quickstart.md). No hay que crear ni asignar ningún permiso nuevo, ni tocar `mailySoft-usuarios` ni la configuración de Auth0 (SC-011).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: La variable de entorno nueva y opcional del enlace "Ir a MailySoft" (FR-015), validada al arrancar y disponible en los arneses de prueba, antes de que ninguna historia la necesite. Ninguna dependencia nueva.

- [X] T001 [P] Ampliar `src/app/config/env.test.ts`, que debe fallar primero (data-model.md, `AppEnv`).
  - Describir `VITE_MAILYSOFT_APP_URL`: **ausente o vacía** → `result.env` incluye `VITE_MAILYSOFT_APP_URL: undefined` y el build sigue siendo válido (como `VITE_CLINICS_API_URL`).
  - **Válidos** (desarrollo, `isProduction: false`): `'https://clinicas.mailysoft.example'`, `'http://127.0.0.1:4000'`, y, a diferencia de `VITE_CLINICS_API_URL`, una URL **con barra final** (`'https://clinicas.mailysoft.example/'`) y una con ruta, query o fragmento (`'https://clinicas.mailysoft.example/entrar?ref=backoffice#top'`): todas aceptadas tal cual, sin recortar la barra.
  - **Inválidos** (cualquier entorno): `'no es una url'`, `'ftp://clinicas.mailysoft.example'`, `' https://x.com'` (espacio), `'https:/\\x.com'` (contiene `\`), dan `VITE_MAILYSOFT_APP_URL: ${messages.config.rules.mailySoftAppUrl}` sin repetir el valor recibido.
  - **Solo en producción** (`isProduction: true`): `'http://clinicas.mailysoft.example'` (sin `https`) es inválido con el mismo mensaje; en desarrollo esa misma URL es válida.
- [X] T002 Implementar, tras T001, que debe pasar sin romper otras pruebas.
  - En `src/shared/messages/es.ts`, dentro de `config.rules`: `mailySoftAppUrl: 'URL http(s) completa; en builds de producción debe ser https.'`.
  - En `src/app/config/env.ts`: función `isExternalAppUrl(value, isProduction)` — rechaza espacios y `\`; intenta `new URL(value)`; acepta si el protocolo es `https:`, o `http:` fuera de producción, y `hostname !== ''`. A diferencia de `isApiBase`, **no** rechaza la barra final ni exige mismo origen o ausencia de query/hash.
  - `VITE_MAILYSOFT_APP_URL: z.preprocess(emptyToUndefined, z.string({error: rules.mailySoftAppUrl}).refine((v) => isExternalAppUrl(v, isProduction), {error: rules.mailySoftAppUrl}).optional())`, siguiendo el mismo patrón que `optionalApiBase`.
  - En `AppEnv` (inferido) queda `VITE_MAILYSOFT_APP_URL: string | undefined`.
  - En `src/vite-env.d.ts`: `readonly VITE_MAILYSOFT_APP_URL: string | undefined`.
- [X] T003 [P] Ampliar `src/app/providers/AppSettingsProvider.test.tsx`, que debe fallar primero (data-model.md, `AppSettings`).
  - Con `VITE_MAILYSOFT_APP_URL: 'https://clinicas.mailysoft.example'`, `useAppSettings().mailySoftAppUrl` es exactamente esa cadena (sin transformar).
  - Sin la variable (`VITE_MAILYSOFT_APP_URL: undefined`), `useAppSettings().mailySoftAppUrl` es `undefined`.
- [X] T004 Implementar en `src/app/providers/AppSettingsProvider.tsx` (tras T003): `AppSettings.mailySoftAppUrl: string | undefined`; el tipo del prop `env` pasa a `Pick<AppEnv, 'VITE_DASHBOARD_REFRESH_MINUTES' | 'VITE_MAILYSOFT_APP_URL'>`; en el `useState` inicial, `mailySoftAppUrl: env.VITE_MAILYSOFT_APP_URL` (sin conversión, a diferencia de `dashboardRefreshMs`).
- [X] T005 [P] Dar el valor a los arneses que construyen un `AppEnv` completo, tras T002: `src/test/renderApp.tsx` (su `env` por defecto) y el `env` de `src/app/providers/HttpClientsProvider.test.tsx`, ambos con `VITE_MAILYSOFT_APP_URL: undefined` (el caso "sin configurar" es el que no cambia ningún comportamiento existente).
- [X] T006 Añadir a `.env.example`, comentada como las demás opcionales: `# VITE_MAILYSOFT_APP_URL=` con una línea de comentario que explique que es la URL de la aplicación de MailySoft para clínicas y que, sin ella, el enlace "Ir a MailySoft" de «Sin acceso» no aparece.
- [X] T007 Verificar que nada se rompió con T001 a T006: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run test`.

**Checkpoint**: la variable de entorno existe, está validada y disponible en toda la aplicación y en los arneses de prueba; nada más depende todavía de ella.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: La regla de acceso por tipo de rol y su infraestructura — el esquema, la política, los tipos y el simulador de pruebas — antes de que ninguna historia pueda verificarse. Ninguna historia puede empezar hasta terminar esta fase.

**⚠️ CRITICAL**: estas tareas tocan los mismos archivos que luego usan todas las historias; deben hacerse en orden, no en paralelo con ellas.

### Esquema: el tipo de rol en la respuesta de `/authorization/me` (contracts/users-service-me.md)

- [X] T008 Ampliar `src/features/auth/schemas/myAccess.test.ts`, que debe fallar primero.
  - Añadir `type: { id: 1, name: 'Sistema' }` (o `{ id: 2, name: 'Clínica' }` donde corresponda) a **todos** los roles de `validDto` y de los demás casos existentes del archivo, para que sigan siendo válidos con el esquema nuevo.
  - Nuevos casos de rechazo (junto a los de `it.each(['a role without permissions', ...])`): un rol sin `type`; un rol con `type: { id: 0, name: 'Sistema' }` (fuera de rango); un rol con `type: { id: 1.5, name: 'Sistema' }` (no entero); un rol con `type: { name: 'Sistema' }` (sin `id`); un rol con `type: { id: 1, name: '' }` (nombre vacío).
  - Nuevo caso de aceptación: un rol con `type: { id: 2, name: 'Clínica' }` se acepta igual que uno de tipo 1 (el esquema no decide el acceso, solo valida la forma).
- [X] T009 Implementar en `src/features/auth/schemas/myAccess.ts` (tras T008): `const roleTypeSchema = z.object({ id: z.number().int().min(1), name: z.string().min(1) })`; añadir `type: roleTypeSchema` a `accessRoleSchema`, entre `name` y `permissions`. No se modela `password_change_required` (se descarta en silencio; data-model.md).

### Política: el tipo de rol sustituye al nombre (research D1, D2)

- [X] T010 [P] Crear `src/features/auth/policy/roleTypes.test.ts`, que debe fallar primero.
  - `ROLE_TYPE.SYSTEM === 1` y `ROLE_TYPE.CLINIC === 2`.
  - `isSystemRoleType(1)` es `true`; `isSystemRoleType(2)`, `isSystemRoleType(0)` y `isSystemRoleType(99)` (un tipo desconocido) son `false`.
- [X] T011 Crear `src/features/auth/policy/roleTypes.ts` (tras T010): `export const ROLE_TYPE = { SYSTEM: 1, CLINIC: 2 } as const;` y `export function isSystemRoleType(typeId: number): boolean { return typeId === ROLE_TYPE.SYSTEM; }`, con el comentario de FR-002 (nunca por nombre).
- [X] T012 Eliminar `src/features/auth/policy/authorizedRoles.ts` y `src/features/auth/policy/authorizedRoles.test.ts` (sustituidos por T010-T011). Comprobar que nada más los importa (`grep -rn "authorizedRoles" src`).

### Tipos: sin motivo de "sin acceso" (research D2, data-model.md)

- [X] T013 Modificar `src/features/auth/policy/types.ts`: quitar `AccessDeniedReason`; `AccessDecision` pasa a `{ kind: 'granted'; access: OperatorAccess } | { kind: 'denied' }` (sin campo `reason`). El comentario de `authorizedRoles` en `OperatorAccess.authorizedRoles` cambia a "Los roles de tipo Sistema: solo sus permisos cuentan dentro del Backoffice."

### `evaluateAccess`: decide por `type.id` (research D2)

- [X] T014 Reescribir `src/features/auth/policy/evaluateAccess.test.ts`, que debe fallar primero (sustituye por completo al archivo actual, que comparaba por nombre).
  - **Denegado, sin distinguir motivo** (todas `toEqual({ kind: 'denied' })`): `user: null`; usuario con `status.id` 2, 3 o 99 aunque tenga roles de tipo Sistema; usuario Activo sin roles; usuario Activo con roles, todos de tipo Clínica (`type.id: 2`); un rol de tipo desconocido (`type.id: 99`).
  - **Concedido**: un rol de tipo Sistema (`type.id: 1`) con cualquier nombre, incluido uno fuera de la lista antigua (p. ej. `'Support'`); un rol de tipo Sistema llamado `'System'` (el nombre no decide); un rol de tipo Clínica llamado `'Sistema'` **no** da acceso (el nombre del tipo tampoco decide); una persona con un rol de tipo Sistema y otro de tipo Clínica entra, y `access.authorizedRoles`/`access.permissions` solo incluyen los del rol de tipo Sistema.
  - Mantener, adaptados a `type.id`, los casos existentes de "cuenta la unión de permisos de varios roles autorizados sin duplicados" y "permisos vacíos cuando el role no tiene ninguno".
  - Mantener el caso de la 007 ("el permiso del Panel"): `dashboard:read` en un rol de tipo Clínica no cuenta; en uno de tipo Sistema, sí.
- [X] T015 Reescribir `src/features/auth/policy/evaluateAccess.ts` (tras T014): mismo cuerpo que hoy (usuario nulo o no Activo → denegado; sin roles autorizados → denegado; si no, concedido con `authorizedRoles`/`permissions`), pero el filtro pasa de `isAuthorizedRoleName(role.name)` a `isSystemRoleType(role.type.id)`, y ambos `return` de "denegado" dejan de llevar `reason`. Import de `isSystemRoleType` en vez de `isAuthorizedRoleName`.

### `useOperatorAccess`: el estado sin motivo (research D2)

- [X] T016 Ampliar `src/features/auth/hooks/useOperatorAccess.test.tsx`, que debe fallar primero: en los dos casos que hoy comprueban `toMatchObject({ status: 'denied', reason: '...' })` (cuenta no registrada, estatus 2/3), quitar `reason` de la aserción (solo `{ status: 'denied' }`); añadir `expect(result.current).not.toHaveProperty('reason')` en uno de ellos. Donde se construye `owner = roleDto({ id: 5, name: 'Owner', permissions: ['clinics:read'] })` para representar un rol que no da acceso, añadir `type: { id: 2, name: 'Clínica' }` explícito (research D8: el valor por defecto nuevo de `roleDto` es Sistema).
- [X] T017 Modificar `src/features/auth/hooks/useOperatorAccess.ts` (tras T016): `OperatorAccessState`'s rama `'denied'` pierde `reason`; la línea `return decision.kind === 'granted' ? {...} : { status: 'denied', reason: decision.reason, accountEmail }` pierde `reason: decision.reason`.
- [X] T018 [P] Ampliar `src/features/auth/hooks/useOperatorAccess.recheck.test.tsx`: en "withdraws the access when the user gets blocked...", quitar `reason: 'inactive_account'` de la aserción `toMatchObject`.

### Simulador de pruebas: el tipo de rol por defecto (research D8)

- [X] T019 [P] Modificar `src/test/factories.ts`:
  - `roleDto(overrides)`: el valor por defecto gana `type: { id: 1, name: 'Sistema' }` (antes de aplicar `overrides`), junto a `id: 4, name: 'Marketing', permissions: ['tenants:read']`.
  - `operatorAccess(overrides)`: el objeto `administrator` inline gana `type: { id: 1, name: 'Sistema' }` (si no, deja de compilar: `AccessRole` exige `type`).
- [X] T020 Modificar `src/test/handlers/usersDirectory/model.ts`:
  - Constantes locales (junto a `ACTIVE`/`BLOCKED`/`DELETED`, mismo estilo: no importan de `features/auth`): `const SYSTEM_TYPE = 1; const CLINIC_TYPE = 2; const TYPE_NAMES = new Map([[SYSTEM_TYPE, 'Sistema'], [CLINIC_TYPE, 'Clínica']]);`.
  - `DirectoryRole` gana `readonly typeId: number`.
  - `directoryRole(overrides)`: valor por defecto `typeId: SYSTEM_TYPE`.
  - `accessOf(auth0Id)`: cada `RoleDto` del arreglo `accessRoles` gana `type: { id: role.typeId, name: TYPE_NAMES.get(role.typeId) ?? 'Desconocido' }`.
  - No tocar `toRoleRecordDto` ni `RoleRecordDto` (catálogo de roles de la Spec 2, fuera de alcance).
- [X] T021 Modificar `src/test/handlers/usersDirectory/seed.ts`: en `defaultDirectory()`, añadir `typeId: 2` explícito solo a `Owner` (id 3) y a `Doctor` (id 6); los demás (Administrator, Developer, Marketing, Billing, Support) quedan con el valor por defecto (Sistema), que ahora coincide con la clasificación real (Assumptions de la spec) — **Support pasa a dar acceso**, sin más cambios.
- [X] T022 Ejecutar `src/test/handlers/usersDirectory/me.test.ts`, `model.test.ts`, `reads.test.ts` y `roleAssignment.test.ts`: deben seguir pasando sin cambios (usan `toMatchObject`, que ignora el campo `type` nuevo). Si alguno falla, es una señal de que depende de `toEqual` en algo que ahora trae `type`; corregirlo ahí, no revertir T020.

### Barrido obligatorio tras el cambio de valor por defecto

- [X] T023 Ejecutar `npm run test` completo y revisar cada fallo nuevo causado por T019-T021. Para cada prueba que construye un rol pensado como "no da acceso" usando solo un nombre fuera de la lista antigua (p. ej. `roleDto({ name: 'Owner', ... })`, `directoryRole({ name: 'Doctor', ... })`) sin fijar `type`/`typeId`, añadir `type: { id: 2, name: 'Clínica' }` (o `typeId: 2`) explícito. Revisar en particular (ya identificados por nombre en el plan): `src/app/router/ProtectedRoute.denied.test.tsx`, `src/app/navigation/sections.roles.test.ts`, `src/app/layouts/AppLayout.logout.test.tsx`, `src/features/auth/components/AccessPage.test.tsx`, `src/features/auth/hooks/useSessionLifecycle.test.tsx`, `src/app/authFlow.integration.test.tsx`, `src/features/users/hooks/useRolesCatalog.test.tsx`. No marcar esta tarea como terminada hasta que `npm run test` pase entero.
- [X] T024 Verificación de la fase: `npm run typecheck`, `npm run lint` y `npm run test:coverage` (umbral de 80 % en `policy`, `schemas`, `hooks`) sobre todo lo de Foundational.

**Checkpoint**: la regla decide por `type.id`, sin motivo de denegación, y el simulador de pruebas representa el tipo de rol correctamente. Ninguna historia tiene aún su propia pantalla ni sus propias rutas nuevas.

---

## Phase 3: User Story 1 - Entrar al Backoffice con un rol de Sistema (Priority: P1) 🎯 MVP

**Goal**: Quien tiene al menos un rol de Sistema activo entra con normalidad, sin importar su nombre ni si tiene además roles de Clínica. La regla ya existe desde Foundational (T015); esta fase prueba, de punta a punta con las rutas reales, que el comportamiento observable es el correcto — es la primera vez que se verifica a ese nivel, no solo con la función pura.

**Independent Test**: con respuestas simuladas, iniciar sesión con solo roles de Sistema, con uno de Sistema y uno de Clínica, con un rol de Sistema cuyo nombre no estaba en la lista antigua (Support), y con nombres de tipo intercambiados; en todos los casos se entra al Backoffice (spec, Independent Test de la US1).

### Pruebas de integración para User Story 1

- [X] T025 [P] [US1] Ampliar `src/app/router/accessFlow.test.tsx`, que debe fallar primero: con una cuenta cuyo único rol es `roleDto({ name: 'Support', permissions: [] })` (tipo Sistema por defecto), al iniciar sesión se llega al Panel (`messages.home.title`), no a «Sin acceso».
- [X] T026 [P] [US1] Ampliar `src/features/auth/hooks/useOperatorAccess.test.tsx`: un caso con `roleDto({ name: 'Marketing', type: { id: 1, name: 'System' } })` (el tipo Sistema con otro nombre) da `status: 'granted'`; un caso con dos roles, uno `type: {id:1}` y otro `type: {id:2, name:'Sistema'}` (un tipo Clínica llamado «Sistema»), da `access.authorizedRoles` con un solo elemento (el de `type.id === 1`) y `access.permissions` solo con los suyos.

**Checkpoint**: entrar con un rol de Sistema, con cualquier nombre o con nombres de tipo intercambiados, está probado de punta a punta. Ningún código nuevo en esta fase: era correcto desde que terminó Foundational.

---

## Phase 4: User Story 2 - Ver «Sin acceso» cuando no se tiene un rol de Sistema (Priority: P1)

**Goal**: Quien no tiene un rol de Sistema (ni roles, solo de Clínica, no registrado, no Activo) ve la página «Sin acceso» en `/access-denied`, con su título, su mensaje único, el correo con el que inició sesión, «Cerrar sesión» y el enlace opcional "Ir a MailySoft"; nunca ve el menú, el encabezado ni ninguna pantalla interna, escriba la dirección que escriba.

**Independent Test**: con respuestas simuladas (solo roles de Clínica, sin roles, sin usuario, usuario Bloqueado), iniciar sesión y comprobar que se llega a «Sin acceso» con el título, el mensaje, el correo y las acciones, sin menú ni encabezado; después, escribir direcciones internas y comprobar que siempre se vuelve a «Sin acceso» (spec, Independent Test de la US2).

### Textos (research D7)

- [X] T027 [US2] Modificar `src/shared/messages/es.ts`: sustituir `denied: { title, reasons: {...} } }` por:
  ```ts
  denied: {
    title: 'No tienes acceso al Backoffice',
    message: 'Tu usuario no tiene un rol de sistema asignado. Si crees que es un error, contacta al administrador.',
    signedInAs: (email: string) => `Iniciaste sesión como ${email}`,
    goToMailySoft: 'Ir a MailySoft',
  },
  ```
  No tocar `messages.common.account` (lo sigue usando `AccessCheckFailedPage`, intacta).

### Pruebas para User Story 2 (OPTIONAL - only if tests requested) ⚠️ — pedidas por la spec y la constitución

- [X] T028 [P] [US2] Reescribir `src/features/auth/components/AccessDeniedPage.test.tsx`, que debe fallar primero (sustituye el archivo actual, que probaba `reason`/`REASONS`).
  - Con `email="cuenta@ejemplo.com"` y sin `mailySoftAppUrl`: el `h1` (`messages.denied.title`) tiene el foco; `role="alert"` contiene `messages.denied.message`; el texto `messages.denied.signedInAs('cuenta@ejemplo.com')` está presente; **no** hay ningún `role="link"` con el nombre `messages.denied.goToMailySoft`.
  - Con `mailySoftAppUrl="https://clinicas.mailysoft.example"`: hay un enlace `messages.denied.goToMailySoft` con `href="https://clinicas.mailysoft.example"`.
  - Con `email={null}`: no aparece ninguna línea que empiece con "Iniciaste sesión como".
  - "lets the person log out": pulsar «Cerrar sesión» llama a `auth0.logout` con `logoutParams: { returnTo: ... /access }` (se conserva del archivo actual).
  - "shows no name, no link to the profile and nothing protected": sin `role="navigation"`, sin `role="banner"`; con `mailySoftAppUrl` definido hay exactamente un `role="link"` (el de "Ir a MailySoft"), ninguno más; `role="main"` presente.
  - Accesibilidad: `axe(container)` sin violaciones, con y sin `mailySoftAppUrl`.
- [X] T029 [US2] Implementar en `src/features/auth/components/AccessDeniedPage.tsx` (tras T028): props `{ email: string | null; mailySoftAppUrl: string | undefined }` (se quita `reason`); se elimina `REASON_TEXT`; el `Alert` muestra `messages.denied.message` siempre; debajo de `LogoutButton`, un `MUI Link` con `href={mailySoftAppUrl}` y el texto `messages.denied.goToMailySoft`, solo si `mailySoftAppUrl !== undefined`; la línea de cuenta usa `messages.denied.signedInAs(email)`.
- [X] T030 [P] [US2] Crear `src/app/router/AccessDeniedRoute.test.tsx`, que debe fallar primero (de las cuatro ramas, esta fase cubre `denied` y `granted`; las de `resolving` y `failed` las añaden US3 y US4 sobre el mismo archivo).
  - Sin sesión (`isAuthenticated: false`): `Navigate` a `/access` con `state: { returnTo: '/access-denied' }`.
  - Con sesión y acceso denegado: renderiza `AccessDeniedPage` con el `email` de `accountEmail` y el `mailySoftAppUrl` de `useAppSettings()`.
  - Con sesión y acceso concedido: `Navigate` a `/` (`replace`).
- [X] T031 [US2] Crear `src/app/router/AccessDeniedRoute.tsx` (tras T030), con las cuatro ramas completas (research D4): `isLoading` → `PageLoader`; sin sesión → `Navigate` a `/access` con `returnTo`; con sesión, monta `SessionWatchers` y despacha según `useOperatorAccess()`: `resolving` → `PageLoader`; `failed` → `AccessCheckFailedPage`; `granted` → `Navigate` a `/`; `denied` → `AccessDeniedPage` con `email` y `mailySoftAppUrl` (de `useAppSettings()`).
- [X] T032 [US2] Modificar `src/app/router/routes.tsx`: añadir, como hijo de nivel superior del árbol (hermano del objeto de `PublicLayout` y del de `ProtectedRoute`, no hijo de ninguno — research D5), `{ path: '/access-denied', Component: AccessDeniedRoute, ErrorBoundary: RouteErrorBoundary }`, sin `handle` (nadie invoca `useRouteAccessibility` en esta rama).
- [X] T033 [P] [US2] Reescribir `src/app/router/ProtectedRoute.denied.test.tsx`, que debe fallar primero: para cada `DENIED_CASE` (sin registrar, bloqueada, eliminada, solo un rol de tipo Clínica — renombrar `owner` a un rol con `type: {id:2, name:'Clínica'}` explícito), al abrir `/` o `/profile`, el router termina en `/access-denied` (`router.state.location.pathname`), no se ve `Protected home/profile`, y no hace falta comprobar contenido aquí (lo prueba T028 sobre la página en aislado).
- [X] T034 [US2] Modificar `src/app/router/ProtectedRoute.tsx` (tras T033): la rama `'denied'` de `ProtectedContent` pasa de `<AccessDeniedPage reason={access.reason} email={access.accountEmail} />` a `<Navigate to="/access-denied" replace />`; se quita la importación de `AccessDeniedPage`.
- [X] T035 [P] [US2] Ampliar `src/app/router/accessFlow.test.tsx`: (a) con una cuenta sin usuario en MailySoft, al iniciar sesión el router termina en `/access-denied` y se ve `messages.denied.title`; (b) con una cuenta con acceso, abrir `/access-denied` directamente (sesión ya concedida) redirige a `/`; (c) sin sesión, abrir `/access-denied` redirige a `/access` con `state: { returnTo: '/access-denied' }`; (d) con sesión y sin acceso, escribir una dirección inexistente (p. ej. `/no-existe`) también termina en `/access-denied`, nunca en «Página no encontrada».
- [X] T036 [P] [US2] Reescribir el bloque `DENIED` de `e2e/access.spec.ts`: un solo mensaje esperado (`messages.denied.message`, no `messages.denied.reasons.*`) para A6, A7, A8 y A9; añadir `await expect(page).toHaveURL(/\/access-denied$/)`. Actualizar el comentario de A6 en `e2e/fixtures/accounts.ts` ("Owner only (not authorized)" → "solo un rol de Clínica").

**Checkpoint**: «Sin acceso» existe en `/access-denied`, con su contenido completo y sus redirecciones de entrada y de salida con acceso. La rama `resolving` y la rama `failed` de `AccessDeniedRoute` ya están implementadas (T031) pero sus propias pruebas llegan en US3 y US4.

---

## Phase 5: User Story 3 - No ver nada interno mientras se comprueba el acceso (Priority: P1)

**Goal**: Mientras se comprueba el acceso (al volver del login, al recargar, al abrir otra pestaña, al entrar directamente por una URL, o en una recomprobación periódica), solo se ve un indicador de carga, nunca una pantalla interna ni una llamada a otra API. Para las rutas protegidas esto ya lo garantiza la feature 001 sin cambios; lo nuevo que esta fase prueba es que `/access-denied` (T031, de US2) respeta la misma regla, y que una recomprobación que retira el acceso termina en `/access-denied` y no en un render a medias.

**Independent Test**: con la consulta de acceso simulada y retrasada, abrir el Backoffice por varias direcciones internas, recargar y abrir otra pestaña; durante la espera solo se ve el indicador de carga y no se hace ninguna otra consulta (spec, Independent Test de la US3).

### Pruebas para User Story 3

- [X] T037 [P] [US3] Ampliar `src/app/router/AccessDeniedRoute.test.tsx` (sobre el archivo de T030): con la respuesta de `/authorization/me` diferida (`usersService.defer()`), al abrir `/access-denied` con sesión se ve solo `PageLoader` (`role="status"`, `messages.common.loading`) y no se renderiza `AccessDeniedPage` ni `AccessCheckFailedPage`; al liberar la respuesta con acceso denegado, aparece el contenido.
- [X] T038 [US3] Ampliar `src/app/router/accessFlow.test.tsx` con una prueba de reloj simulado (patrón de `useOperatorAccess.recheck.test.tsx`): una persona con acceso concedido, en el Panel; se le retira su único rol de Sistema en el simulador; al cumplirse el intervalo de recomprobación (`ACCESS_RECHECK_INTERVAL_MS`) o al volver a la pestaña, el router navega a `/access-denied` y se ve su contenido — no una pantalla a medias ni el Panel desactualizado.
- [X] T039 [US3] Confirmar (ampliando la prueba de T037 o con una nueva en el mismo archivo) que, mientras `/access-denied` está resolviendo, el número de peticiones a cualquier API de MailySoft que no sea `/authorization/me` es 0 (SC-003): basta con que no se monte ningún otro componente que pida datos, ya garantizado por no renderizar `AccessDeniedPage` todavía; dejarlo como aserción explícita, no implícita.

**Checkpoint**: la ausencia de contenido interno mientras se comprueba el acceso está probada tanto para las rutas protegidas (ya lo estaba) como para `/access-denied` (nuevo), y la recomprobación periódica lleva a «Sin acceso» cuando corresponde. Ningún código nuevo: ya existía desde Foundational/US2.

---

## Phase 6: User Story 4 - Recuperarse cuando no se puede comprobar el acceso (Priority: P2)

**Goal**: Si la consulta de acceso falla por red, tiempo agotado, error del servidor o una respuesta con formato inválido, se ve una página de error con «Reintentar», nunca «Sin acceso» ni acceso concedido. Un 403 o un 404 de la consulta (que la API real no envía hoy) se tratan como «sin acceso», sin el aviso global de «sin permiso» y sin consumir los reintentos pensados para fallos de red (research D3) — esto sí es código nuevo, a diferencia de US1 y US3.

**Independent Test**: con la consulta simulada respondiendo un error de red, un error del servidor, una respuesta con formato inválido, una sesión no válida, una falta de permiso y un «no encontrado», comprobar en cada caso la pantalla que se muestra y que «Reintentar» vuelve a comprobar (spec, Independent Test de la US4).

### Pruebas para User Story 4

- [X] T040 [P] [US4] Ampliar `src/features/auth/hooks/useOperatorAccess.test.tsx`, que debe fallar primero: con `usersService.failWith(403)`, el resultado es `{ status: 'denied' }` (no `'failed'`) tras una sola petición (sin los 3 intentos de los fallos 5xx); igual con `failWith(404)`.
- [X] T041 [US4] Modificar `src/features/auth/hooks/useOperatorAccess.ts` (tras T040): nueva función (no exportada) que envuelve `getMyAccess` + `evaluateAccess` y, si el error es `instanceof ApiError` con `status` 403 o 404, devuelve `{ kind: 'denied' }` en vez de relanzar (research D3); cualquier otro error se relanza sin cambios. El `queryFn` de la query pasa a usar esta función.
- [X] T042 [P] [US4] Añadir a `src/app/router/accessFlow.test.tsx` (o a una prueba de integración equivalente con `renderWithProviders`): con `usersService.failWith(403)` en la consulta de acceso, tras iniciar sesión se ve `/access-denied` y **no** aparece en pantalla `messages.forbidden.action` ("No tienes permiso para realizar esta acción.").
- [X] T043 [P] [US4] Ampliar `src/app/router/AccessDeniedRoute.test.tsx` (sobre T030/T037): con la consulta fallando por red o 500 (sin datos previos), se ve `AccessCheckFailedPage` (`messages.checkFailed.title`, botón «Reintentar», el correo si lo hay) en vez de `AccessDeniedPage`; al pulsar «Reintentar» y la plataforma ya responder con acceso denegado, aparece el contenido de «Sin acceso».
- [X] T044 [US4] Ampliar `src/features/auth/policy/evaluateAccess.test.ts` o `myAccess.test.ts` con el caso de formato inválido ya cubierto por T008 (un rol sin `type` rompe el esquema): confirmar con una prueba de integración (`accessFlow.test.tsx` o `AccessDeniedRoute.test.tsx`) que una respuesta de `/authorization/me` con un rol sin `type` termina en la pantalla de error con «Reintentar», nunca en acceso concedido ni en «Sin acceso».

**Checkpoint**: los fallos de red/servidor/formato llevan al error con Reintentar desde cualquier punto de entrada (rutas protegidas o `/access-denied`), y un 403/404 de la consulta de acceso se trata como «sin acceso» sin duplicar avisos.

---

## Phase 7: User Story 5 - Cerrar sesión desde «Sin acceso» y entrar con otra cuenta (Priority: P2)

**Goal**: Desde «Sin acceso», cerrar sesión termina la sesión también en el proveedor de identidad, de modo que se puede entrar después con otra cuenta sin volver automáticamente a «Sin acceso» con la anterior. Ningún código nuevo: reutiliza `useLogout`/`LogoutButton` tal cual (FR-016); esta fase es enteramente de verificación.

**Independent Test**: iniciar sesión con una cuenta sin rol de Sistema, elegir «Cerrar sesión» en «Sin acceso», comprobar que el proveedor de identidad pide de nuevo las credenciales y entrar con una cuenta que sí tiene un rol de Sistema (spec, Independent Test de la US5).

### Pruebas para User Story 5

- [X] T045 [P] [US5] Añadir a `src/app/router/accessFlow.test.tsx`: con una cuenta sin rol de Sistema en `/access-denied`, pulsar «Cerrar sesión» invoca `auth0.logout`; simular después una sesión nueva con otra cuenta (otro `sub`, con un rol de Sistema) y confirmar que el Panel se muestra con los datos de esa cuenta, no con los de la anterior (no queda ningún resto de la decisión de acceso previa en la caché de TanStack Query — ya lo garantiza `queryClient.clear()` de `useLogout`, feature 001).
- [X] T046 [US5] Añadir a `e2e/access.spec.ts` (requiere `E2E_AUTH0_USER_A6`/`A1`): iniciar sesión con A6, en `/access-denied` pulsar «Cerrar sesión», comprobar que `/access` pide usuario y contraseña de nuevo (no entra solo), e iniciar sesión con A1 hasta ver el Panel.

**Checkpoint**: las cinco historias de usuario están implementadas y probadas de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentación (FR-026) y verificación final de punta a punta.

- [X] T047 [P] Modificar `README.md`: la viñeta "Acceso" deja de nombrar roles (Administrator, Developer, Marketing, Billing) y describe la regla por tipo de rol de Sistema; añadir `006-system-role-access` a la línea "Estado" (de paso, añadir también `007-dashboard`, que ya está implementada y no aparecía).
- [X] T048 [P] Añadir una nota breve en `specs/001-auth-session-profile/spec.md` (FR-004, FR-017, Key Entities, Assumptions) y en `specs/001-auth-session-profile/contracts/users-service.md`: la lista de roles autorizados por nombre la sustituye la feature 006 por el tipo de rol; para el contrato vigente de `/authorization/me`, ver `specs/006-system-role-access/contracts/users-service-me.md`.
- [ ] T049 Ejecutar la guía completa de [quickstart.md](quickstart.md): los 12 escenarios manuales (V1 a V12) y las comprobaciones automatizadas de su sección 3.
- [X] T050 `npm run build` y `npm run size`: confirmar que la ruta de entrada sigue dentro del presupuesto de 300 KB gzip (constitución, Rendimiento).
- [X] T051 Verificación final completa: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:coverage` y `npm run test:e2e` (se omite sin las variables `E2E_AUTH0_USER_*`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato.
- **Foundational (Phase 2)**: depende de Setup (T019 necesita el tipo `AppEnv` estable, aunque no toca la variable nueva directamente) — **BLOQUEA** todas las historias.
- **User Stories (Phase 3 a 7)**: todas dependen de Foundational. US1 (T025-T026) y US3 (T037-T039) no dependen de US2 para su PROPIA verificación conceptual, pero T037 y T043 editan el mismo archivo que crea T030 de US2 (`AccessDeniedRoute.test.tsx`) y T031 solo existe tras US2: en la práctica, **hacer US2 antes de US3 y antes de US4** (el orden del documento). US5 depende de que exista `/access-denied` (US2).
- **Polish (Phase 8)**: depende de que todas las historias deseadas estén completas.

### Dentro de cada fase

- Esquema → política → tipos → `evaluateAccess` → `useOperatorAccess` → simulador → barrido (Foundational, en ese orden: cada paso depende del anterior).
- Pruebas antes de implementación en cada pareja (T008→T009, T010→T011, T014→T015, T016→T017, T028→T029, T030→T031, T033→T034, T040→T041).
- `AccessDeniedRoute.test.tsx`/`.tsx` se crean en US2 (T030-T031) y se **amplían** en US3 (T037, T039) y en US4 (T043): no son archivos nuevos en esas fases, son las mismas pruebas que crecen.

### Parallel Opportunities

- Setup: T001, T003 en paralelo (archivos de prueba distintos); T005 en paralelo con T003/T004 una vez exista T002.
- Foundational: T010 puede ir en paralelo con T008 (archivos distintos); T018 y T019 en paralelo entre sí tras T017.
- US1 completa (T025, T026) puede hacerse en paralelo con el principio de US2, porque no toca ningún archivo de US2 — pero como no depende de nada de US2, normalmente conviene hacerla primero y rápido (es el MVP).
- Dentro de US2: T028 y T030 en paralelo (archivos distintos); T033, T035 y T036 en paralelo entre sí tras T032/T034.

---

## Parallel Example: Foundational

```bash
# Dos módulos de política independientes, archivos distintos:
Task: "Crear src/features/auth/policy/roleTypes.test.ts, que debe fallar primero"
Task: "Ampliar src/features/auth/schemas/myAccess.test.ts, que debe fallar primero"
```

---

## Implementation Strategy

### MVP First (Setup + Foundational + User Story 1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational) — la regla por tipo de rol ya decide correctamente.
2. Completar Phase 3 (US1) — probado de punta a punta que entrar con un rol de Sistema funciona, con cualquier nombre.
3. **DETENERSE y VALIDAR**: en este punto, quien tiene un rol de Sistema entra correctamente; quien no, sigue viendo el "acceso denegado" inline de la feature 001 (todavía no se ha tocado `ProtectedRoute`), así que el MVP es seguro de desplegar aunque falten US2 a US5.

### Entrega incremental

1. Setup + Foundational + US1 → la regla nueva funciona para quien tiene acceso (MVP).
2. + US2 → «Sin acceso» con su propia dirección, contenido y redirecciones.
3. + US3 → verificado que nunca hay una pantalla interna a medias, tampoco en la recomprobación periódica.
4. + US4 → fallos de red/servidor/formato y 403/404 cubiertos.
5. + US5 → cerrar sesión y cambiar de cuenta desde «Sin acceso», verificado de punta a punta.
6. Polish → documentación y verificación final.

## Notes

- [P] tasks = archivos distintos, sin dependencias entre ellas.
- [Story] marca a qué historia pertenece cada tarea, para poder entregarlas por separado.
- Verificar que cada prueba falla antes de implementar lo que la hace pasar.
- Hacer commit tras cada tarea o grupo lógico de tareas.
- Detenerse en cada punto de control para validar la historia de forma independiente.
- No tocar `mailySoft-usuarios` ni la configuración de Auth0 (SC-011); no tocar `RequirePermission`/`can`/`hasAnythingToSee`, `AccessCheckFailedPage` ni `messages.common.account` (los reutiliza esta feature sin cambios); no tocar `src/features/users/schemas/role.ts` ni `rolesApi.ts` (catálogo de roles, Spec 2, fuera de alcance).
