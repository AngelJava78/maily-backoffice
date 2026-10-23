---

description: "Task list template for feature implementation"
---

# Tasks: Módulos — administración de módulos del sistema y sus acciones

**Input**: Design documents from `/specs/013-manage-modules/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/modules-service.md](./contracts/modules-service.md), [contracts/app-routes.md](./contracts/app-routes.md), [quickstart.md](./quickstart.md).

**Tests**: incluidas. La constitución (principio VII) exige pruebas automatizadas en el mismo PR y
test-first para lógica pura; dentro de cada fase, la prueba de cada pieza nueva de `schemas/`,
`policy/` y `api/` se escribe ANTES que su implementación y DEBE fallar al principio (mismo criterio
que 003, 009, 010, 011 y 012). La API de módulos y permisos se simula a nivel de red con MSW, con
estado, en `src/test/handlers/modulesCatalog/`; nunca se usa un mock de `fetch` ni del cliente HTTP.

**Organization**: tareas agrupadas por historia de usuario de `spec.md` (US1=P1 "consultar", US2=P1
"crear", US3=P2 "modificar", US4=P2 "bloquear y desbloquear", US5=P2 "eliminar"), en orden de
prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1-US5); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único existente, el worktree de esta feature
(`C:\Maily\code\maily-backoffice-013-manage-modules`): `src/`, `e2e/`. Solo se toca la feature nueva
`src/features/modules`, su simulador de pruebas (`src/test/handlers/modulesCatalog/`), y se amplían
`src/features/auth` (capacidades y `SECTION_RESOURCES`), `src/app/navigation/sections.ts`,
`src/app/router/routes.tsx`, `src/shared/ui/iconRegistry.ts` y `src/shared/messages/es.ts`. Ninguna
otra feature (`users`, `subscriptions`) cambia sus propias reglas. Código, nombres de archivo y
mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en
`es.ts`. Sin aserciones `as` (salvo `as const`), sin `any`, sin `console.*`; componentes `.tsx` de
250 líneas como máximo.

---

## Phase 1: Setup

**Purpose**: línea base antes de agregar una feature nueva. Sin dependencias que instalar (mismo
stack ya vigente) y sin variable de entorno nueva (research D2): no hace falta tocar
`vite.config.ts`, `.env.example` ni `HttpClientsProvider`.

- [ ] T001 Medir la línea base real del bundle: `npm run build && npm run size` en la raíz del
  repo; registrar el KB gzip obtenido, para compararlo en el Polish final (T0XX, ver más abajo).

**Checkpoint**: línea base de bundle registrada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: los catálogos fijos, el modelo de datos, el cruce módulo↔acciones, el formulario, la
ubicación en la URL, el catálogo de errores, las capacidades, los textos, la navegación/permisos y
el simulador de pruebas que **todas** las historias necesitan.

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

### Catálogos fijos y modelo del módulo

- [ ] T002 [P] Escribir `src/features/modules/schemas/moduleActionCatalog.test.ts` (debe fallar
  primero; data-model.md, "Catálogos fijos"). `MODULE_ACTION_ORDER` es la tupla exacta `['read',
  'write', 'update', 'delete']`. `MODULE_ACTION_ID` da `{ read: 1, write: 2, update: 3, delete: 4 }`.
  `REQUIRED_ACTION_KEY` es `'read'`. `MODULE_TYPE` da `{ SYSTEM: 1, CLINIC: 2 }`. `MODULE_STATUS` da
  `{ ACTIVE: 1, BLOCKED: 2 }` (nunca se define `3 Eliminado`, no se usa en esta pantalla).
- [ ] T003 Implementar (tras T002) `src/features/modules/schemas/moduleActionCatalog.ts`: las
  constantes `as const` y los tipos `ModuleActionKey`, `ModuleTypeId`, `ModuleStatusId` de T002.
  Hace pasar T002.
- [ ] T004 [P] Escribir `src/features/modules/schemas/systemModule.test.ts` (debe fallar primero;
  data-model.md, `SystemModule`). `systemModuleSchema` transforma el DTO de `GET /modules`
  (`id, key, name, description, sort_order, created_at, status: {id,name}, type: {id,name},
  active_permissions_count`) a `{ id, key, name, description, sortOrder, createdAt, statusId,
  typeId, activePermissionsCount }`; `key` cumple `^[a-z][a-z0-9_]*$` con máximo 50 caracteres;
  `name` de 1 a 100; `description` opcional, `null` o hasta 500 caracteres. `PROTECTED_MODULE_KEYS`
  es exactamente `['users', 'roles', 'permissions', 'modules']`. `isProtectedModule('users')` da
  `true`; `isProtectedModule('inventory')` da `false`.
- [ ] T005 Implementar (tras T003, T004) `src/features/modules/schemas/systemModule.ts` con las
  reglas de T004. Hace pasar T004.
- [ ] T006 [P] Escribir `src/features/modules/schemas/attachModuleActions.test.ts` (debe fallar
  primero; research D3). `attachModuleActions(modules, permissions)` agrega a cada módulo su
  `actions: ReadonlySet<ModuleActionKey>` y su `permissionIdByAction: ReadonlyMap<ModuleActionKey,
  number>`, cruzando por `permission.module?.key === module.key` y `permission.action?.key` contra
  `MODULE_ACTION_ORDER`.
  - Un permiso con `module`/`action` nulos (permiso heredado sin módulo, ver el data-model.md de
    `mailySoft-usuarios`) no se asocia a ningún módulo.
  - Un permiso cuyo `module.key` no corresponde a ningún módulo de la lista se ignora.
  - Un módulo sin ningún permiso coincidente da `actions` vacío y `permissionIdByAction` vacío.
  - No muta los arreglos recibidos.
- [ ] T007 Implementar (tras T003, T005, T006) `src/features/modules/schemas/attachModuleActions.ts`.
  Hace pasar T006.

### Formulario y política de selección de acciones

- [ ] T008 [P] Escribir `src/features/modules/schemas/moduleForm.test.ts` (debe fallar primero;
  data-model.md, "Formulario"). `CreateModuleFormValues`: `type` (uno de `MODULE_TYPE`,
  obligatorio), `key` (`^[a-z][a-z0-9_]*$`, 1-50, obligatorio), `name` (recortado, 1-100,
  obligatorio), `description` (opcional, hasta 500), `sortOrder` (entero opcional), `actions`
  (`ReadonlySet<ModuleActionKey>`, siempre incluye `'read'`). `UpdateModuleFormValues`: igual sin
  `type` ni `key`. `toCreateModuleBody(values)` da `{ key, name, type_id, description?, sort_order?
  }`. `toFormValues(module)` llena `actions` desde `module.actions`. `toUpdateModuleBody(initial,
  values)` compara `name`/`description`/`sortOrder` y da solo lo distinto, o `null` si nada cambió;
  nunca incluye `key` ni `type_id`. `getChangedActions(initial, next)` da `{ toAdd:
  ModuleActionKey[], toRemove: ModuleActionKey[] }` comparando dos `ReadonlySet<ModuleActionKey>`.
- [ ] T009 Implementar (tras T003, T005, T008) `src/features/modules/schemas/moduleForm.ts` con las
  reglas de T008; valores iniciales del alta: `type: MODULE_TYPE.CLINIC`, `key: ''`, `name: ''`,
  `description: ''`, `sortOrder: undefined`, `actions: new Set(MODULE_ACTION_ORDER)` (las 4
  marcadas, FR-012). Hace pasar T008.
- [ ] T010 [P] Escribir `src/features/modules/policy/moduleActionSelection.test.ts` (debe fallar
  primero; FR-018). `withActionChecked(selected, 'read', false)` no quita `'read'` (permanece
  marcada: no se puede desmarcar). `withActionChecked(selected, 'write', true)` agrega `'write'` sin
  tocar las demás. `withActionChecked(selected, 'write', false)` la quita. No muta el
  `ReadonlySet` recibido; el resultado es un `ReadonlySet` nuevo.
- [ ] T011 Implementar (tras T003, T010) `src/features/modules/policy/moduleActionSelection.ts`.
  Hace pasar T010.

### Ubicación en la URL

- [ ] T012 [P] Escribir `src/features/modules/schemas/modulesLocation.test.ts` (debe fallar primero;
  data-model.md, `ModulesLocation`). `parseModulesSearchParams` lee `type_id` (`'1'`→Sistema,
  `'2'`→Clínica, ausente u otro valor→Todos), `status_id` (`'2'`→Bloqueados, cualquier otro valor o
  ausente→Activos), `q` (texto, `''` si ausente), y el panel: `edit=123`→`{kind:'edit',
  moduleId:123}`, `new=1`→`{kind:'create'}`, ninguno de los dos→`{kind:'none'}`; con los dos
  presentes a la vez, `edit` tiene prioridad. `toModulesSearchParams(location)` omite cada parámetro
  que esté en su valor por omisión (Todos, Activos, búsqueda vacía, panel `none`).
- [ ] T013 Implementar (tras T012) `src/features/modules/schemas/modulesLocation.ts` con las reglas
  de T012. Hace pasar T012.
- [ ] T014 [P] Escribir `src/features/modules/hooks/useModulesLocation.test.tsx` (tras T013).
  `location` refleja los parámetros de la URL. `setType`/`setStatus`/`setSearch` actualizan la URL
  conservando los demás parámetros vigentes. `openEdit(id)` escribe `edit=id` y quita `new` si
  estaba; `openCreate()` escribe `new=1` y quita `edit`; `closePanel()` quita los dos. Una dirección
  con valores no válidos se reemplaza por su forma normal sin agregar una entrada al historial
  (mismo criterio que `useSubscriptionsLocation`).
- [ ] T015 Implementar (tras T013, T014) `src/features/modules/hooks/useModulesLocation.ts`, mismo
  patrón que `useSubscriptionsLocation.ts`. Hace pasar T014.

### Catálogo de errores y capacidades

- [ ] T016 [P] Escribir `src/features/modules/api/moduleErrors.test.ts` (debe fallar primero;
  contracts/modules-service.md, tabla de errores). `describeModuleError(error, operation)` da:
  `module_key_already_exists` → `{kind:'field', fields:{key:...}}`; `module_name_already_exists` →
  `{kind:'field', fields:{name:...}}`; `module_not_found` y `permission_not_found` →
  `{kind:'notFound'}`; `module_protected` → `{kind:'protected'}`; `module_already_blocked` y
  `module_already_active` → `{kind:'statusUnchanged'}`; `validation_error` → usa
  `error.fieldErrors` para dar un error de campo si reconoce el campo (`key`, `name`, `description`,
  `sort_order`, `type_id`), si no, `{kind:'form'}`; `permission_name_already_exists` →
  `{kind:'retryable'}`; `error.status === 403` o `error.code === 'permission_denied'` →
  `{kind:'forbidden'}`; `error.isRetryable` (red/5xx) → `{kind:'retryable'}`; cualquier otro →
  `{kind:'unexpected'}`. Un error que no es `ApiError` también da `{kind:'unexpected'}`.
- [ ] T017 Implementar (tras T016) `src/features/modules/api/moduleErrors.ts`, mismo patrón que
  `subscriptionErrors.ts`. Hace pasar T016.
- [ ] T018 [P] Escribir `src/features/auth/policy/moduleCapabilities.test.ts` (debe fallar primero).
  `getModuleCapabilities(access)` da `canCreate` desde `modules:write`, `canEdit`/`canBlock`/
  `canUnblock` los tres desde `modules:update`, `canDelete` desde `modules:delete`; sin
  `modules:read`, los cuatro dan `false` (lo exige `can()` internamente).
- [ ] T019 Implementar (tras T018) `src/features/auth/policy/moduleCapabilities.ts`; exportar
  `getModuleCapabilities` y el tipo `ModuleCapabilities` (definido en
  `src/features/modules/index.ts` e importado aquí, igual que `SubscriptionCapabilities`) desde
  `src/features/auth/index.ts`. Hace pasar T018.

### Textos, navegación, permisos y simulador de pruebas

- [ ] T020 Agregar a `src/shared/messages/es.ts` el bloque `messages.modules` completo
  (contracts/app-routes.md, "Textos de la pantalla") y `nav.sections.modules: 'Módulos'` (no
  requiere prueba propia; lo consumen las pruebas de componentes de las historias).
- [ ] T021 Ampliar `src/features/auth/policy/permissions.ts`: agregar `'modules'` como **primer**
  elemento de `SECTION_RESOURCES`.
- [ ] T022 Ampliar `src/features/auth/policy/permissions.test.ts`: `SECTION_RESOURCES` incluye
  `'modules'`; `hasAnythingToSee` da `true` con solo `modules:read`. Hace pasar la ampliación de
  T021.
- [ ] T023 [P] Ampliar `src/shared/ui/iconRegistry.ts`: agregar `modules: Blocks` (de
  `lucide-react`, research D12).
- [ ] T024 Ampliar `src/app/navigation/sections.ts`: agregar `{ id: 'modules', path: '/modules',
  labelKey: 'modules', resource: 'modules', icon: 'modules' }` como **primer** elemento del arreglo
  `sections` (antes de `'users'`).
- [ ] T025 Ampliar `src/app/navigation/sections.test.ts`: la prueba de registro (ya existente) pasa a
  esperar `['modules', 'users', 'subscriptions', 'token']` en ese orden.
- [ ] T026 [P] Ampliar `src/test/factories.ts`: agregar `moduleDto(overrides)` (valores por defecto:
  `{ id, key: 'inventory', name: 'Inventario', description: null, sort_order: 160, created_at:
  '2026-10-22T00:00:00Z', status: { id: 1, name: 'Activo' }, type: { id: 2, name: 'Clínica' },
  active_permissions_count: 0 }`) y `permissionDto(overrides)` (`{ id, name: 'inventory:read',
  description: null, created_at: '2026-10-22T00:00:00Z', status: { id: 1, name: 'Activo' }, module:
  { id, key: 'inventory', name: 'Inventario', type: { id: 2, name: 'Clínica' } }, action: { id: 1,
  key: 'read', name: 'Ver' } }`).
- [ ] T027 [P] Escribir `src/test/handlers/modulesCatalog/model.test.ts` (debe fallar primero;
  contracts/modules-service.md, research D13).
  - `createModule`: rechaza `key` duplicada entre los módulos no eliminados (`409
    module_key_already_exists`) y `name` duplicado sin distinguir mayúsculas (`409
    module_name_already_exists`), sin crear nada; `key` que no cumple `^[a-z][a-z0-9_]*$` da `422`;
    sin `sort_order`, asigna el mayor `sort_order` entre **todos** los módulos no eliminados (sin
    importar el tipo) más 10 (research D13).
  - `updateModule`: una solicitud que incluya `key` o `type_id` se rechaza por completo (`422`), sin
    modificar nada; por lo demás solo cambia `name`/`description`/`sort_order`.
  - `blockModule`/`unblockModule`: rechazan los cuatro módulos protegidos (`409 module_protected`);
    bloquear uno ya bloqueado o desbloquear uno ya activo da `409
    module_already_blocked`/`module_already_active`.
  - `deleteModule`: rechaza los cuatro protegidos; por lo demás siempre se permite (eliminación
    lógica) aunque tenga permisos activos, y en la misma operación elimina lógicamente sus permisos.
  - `createPermission(name)`: rechaza un nombre ya usado por un permiso no eliminado (`409
    permission_name_already_exists`).
  - `deletePermission(id)`: eliminación lógica; libera el nombre; `404 permission_not_found` si ya
    no existe o no está activo.
  - `listModules` admite `status_id` (1 por omisión, 2); `listPermissions` no pagina y no admite
    filtros.
- [ ] T028 Implementar (tras T003, T005, T027) `src/test/handlers/modulesCatalog/model.ts` con las
  reglas de T027, importando `MODULE_ACTION_ORDER`/`MODULE_ACTION_ID`/`MODULE_TYPE` de
  `src/features/modules/schemas/moduleActionCatalog` (no una copia, mismo criterio que la 012 con su
  catálogo de módulos de clínica). Estado inicial: los 23 módulos reales de las páginas 11 a 14 del
  mockup (8 de Sistema, 15 de Clínica) con sus acciones exactas, construidos con `moduleDto`/
  `permissionDto` de T026. Hace pasar T027.
- [ ] T029 Implementar (tras T028) `src/test/handlers/modulesCatalog/validation.ts`: validación de
  los campos de creación/modificación de un módulo y de creación de un permiso, con los mensajes de
  [contracts/modules-service.md](contracts/modules-service.md).
- [ ] T030 Implementar (tras T028, T029) `src/test/handlers/modulesCatalog/handlers.ts`: handlers de
  MSW para `GET`/`POST`/`PATCH /api/v1/modules`, `POST .../block`, `POST .../unblock`, `DELETE
  /api/v1/modules/{id}`, `GET`/`POST /api/v1/permissions`, `DELETE /api/v1/permissions/{id}`, con
  las respuestas y los códigos de error reales del contrato.
- [ ] T031 Registrar los handlers de `modulesCatalog` junto a los demás simuladores con estado (el
  mismo lugar donde ya se registran `subscriptionsCatalog` y `usersService`).

### Lectura de módulos (cruzada con sus acciones)

- [ ] T032 [P] Escribir `src/features/modules/api/modulesApi.list.test.ts` (debe fallar primero;
  tras T030, T031). `listModules(client, { statusId, signal })` hace `GET /api/v1/modules` (con
  `status_id` solo si se pasa) y `GET /api/v1/permissions`, cruza el resultado con
  `attachModuleActions` (T007) y da `SystemModule[]` en el mismo orden que ya da la API (sin
  reordenar en el cliente).
- [ ] T033 Implementar (tras T007, T032) `src/features/modules/api/modulesApi.ts` con `listModules`.
  Hace pasar T032.
- [ ] T034 Punto de control de la fase: `npm run typecheck`, `npm run lint` y `npm run test` pasan
  con todo lo anterior, en particular `src/features/modules/{schemas,policy,api}/`,
  `src/features/auth/policy/moduleCapabilities.ts` y `src/test/handlers/modulesCatalog/`.

**Checkpoint**: catálogos, modelo de datos, formulario, ubicación en la URL, errores, capacidades,
navegación/permisos y simulador listos — las historias pueden empezar.

---

## Phase 3: User Story 1 - Consultar el catálogo de módulos (Priority: P1) 🎯 MVP

**Goal**: quien administra el Backoffice ve, en una sola pantalla, los módulos de Sistema y de
Clínica agrupados, con sus acciones correctas, y puede filtrar por tipo y por estatus y buscar por
nombre o clave.

**Independent Test**: con el catálogo real (23 módulos), abrir `/modules` y comprobar que aparecen
agrupados con sus acciones correctas, y que los filtros y la búsqueda acotan la lista como se espera
(quickstart W1 a W5).

### Tests for User Story 1 ⚠️

> Escribir estas pruebas primero y comprobar que fallan antes de implementar.

- [ ] T035 [P] [US1] Escribir `src/features/modules/components/ModulesFilters.test.tsx`: grupo de
  botones accesible "Tipo" (Todos/Sistema/Clínica) y "Estatus" (Activos/Bloqueados), cada uno con su
  valor controlado y su `onChange`; campo de texto "Buscar" con su etiqueta asociada y su `onChange`
  (con un pequeño *debounce* o directo, a decidir en la implementación); sin violaciones de axe.
- [ ] T036 [P] [US1] Escribir `src/features/modules/components/ModulesTable.test.tsx`, con una lista
  de ejemplo (variedad de Sistema y de Clínica, con distintas combinaciones de acciones, incluidos
  los cuatro módulos protegidos).
  - Dos secciones con encabezado y conteo correctos: "Sistema, pantallas del Backoffice · N
    módulos" primero, "Clínica, aplicación para clínicas · N módulos" después.
  - Cada fila: Orden, nombre del módulo con su clave debajo (monoespaciada), Tipo, los chips de
    Ver/Crear/Modificar/Eliminar que tenga (solo los presentes, en ese orden) y un botón Editar.
  - Los cuatro módulos protegidos llevan la etiqueta "Base" junto al nombre.
  - Sin módulos, no se renderiza (el estado vacío lo decide quien la usa).
  - Sin violaciones de axe.
- [ ] T037 [US1] Escribir `src/features/modules/components/ModulesPage.test.tsx` (tras T035, T036,
  T033, T020): con el simulador MSW real,
  - al abrir, se ven las dos secciones con el catálogo completo y el contador "23 módulos activos";
  - cambiar el filtro Tipo a Sistema deja solo esa sección y **no genera ninguna solicitud nueva**
    (reutiliza el catálogo ya cargado, research D6);
  - cambiar el filtro Estatus a Bloqueados **sí genera una solicitud nueva** (`GET` con
    `status_id=2`);
  - escribir «agenda» en Buscar deja solo "Agenda y citas";
  - un error de red al cargar muestra el estado de error con la opción de reintentar, conservando
    los filtros elegidos;
  - sin violaciones de axe.
- [ ] T038 [US1] Escribir `src/app/router/modules/modulesList.integration.test.tsx` (tras T037):
  con el catálogo real de 23 módulos sembrado por el simulador, abrir `/modules` y comprobar W1 a W4
  de [quickstart.md](quickstart.md).
- [ ] T039 [US1] Escribir `src/app/layouts/useRouteAccessibility.modules.test.tsx` (mismo patrón
  que `useRouteAccessibility.subscriptions.test.tsx`/`.token.test.tsx`, ya existentes): sin
  `modules:read`, "Módulos" no aparece en el menú principal y entrar a `/modules` directamente
  muestra "sin permisos" sin cerrar la sesión (quickstart W5).

### Implementation for User Story 1

- [ ] T040 [P] [US1] Implementar `src/features/modules/components/ModulesFilters.tsx` (tras T035,
  T020). Hace pasar T035.
- [ ] T041 [P] [US1] Implementar `src/features/modules/components/ModulesTable.tsx` (tras T036,
  T005, T020; research D7, `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell` de MUI, no
  `DataGrid`). Hace pasar T036.
- [ ] T042 [US1] Implementar `src/features/modules/components/ModulesPage.tsx` (tras T037, T015,
  T033, T040, T041): usa `useModulesLocation`, TanStack Query (`modulesKeys.list(statusId)`) con
  `listModules`, `ModulesFilters` y `ModulesTable`; estados de carga, vacío, error (con reintentar)
  y éxito; el panel de la derecha, por ahora, solo existe vacío (research D10; su contenido de
  Editar/Nuevo módulo llega en US2/US3). Hace pasar T037.
- [ ] T043 [US1] Ampliar `src/app/router/routes.tsx` (tras T042): agregar la ruta `/modules` con
  `<RequirePermission resource="modules"><Outlet /></RequirePermission>`, el componente de
  `ModulesPage` cargado con `React.lazy`, `handle.titleKey: 'modules'`, mismo patrón que `/users` y
  `/subscriptions`. Hace pasar T038 y T039.
- [ ] T044 [US1] Crear `src/features/modules/index.ts`: exporta `ModulesPage` y el tipo
  `ModuleCapabilities` (usado por T019).
- [ ] T045 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente W1 a W5
  de [quickstart.md](quickstart.md).

**Checkpoint**: la pantalla de Módulos consulta, filtra y busca de punta a punta (MVP de lectura).

---

## Phase 4: User Story 2 - Crear un módulo (Priority: P1)

**Goal**: el operador da de alta un módulo nuevo con su tipo, su nombre, su clave y las acciones que
tiene, viendo de inmediato el resultado en el listado.

**Independent Test**: crear el módulo "Inventario" (Clínica, `inventory`) con dos de sus cuatro
acciones y comprobar que aparece en el grupo de Clínica con exactamente esas dos (quickstart W6 a
W9).

### Tests for User Story 2 ⚠️

- [ ] T046 [P] [US2] Ampliar `src/features/modules/api/modulesApi.create.test.ts` (tras T033):
  `createModule(client, body)` hace `POST /api/v1/modules` con el cuerpo exacto de
  `toCreateModuleBody`; `createModuleAction(client, moduleKey, action)` hace `POST
  /api/v1/permissions` con `{ name: "<moduleKey>:<action>" }`.
- [ ] T047 [P] [US2] Escribir `src/features/modules/components/ModuleFormFields.test.tsx` (tras
  T009, T011, T020): campos Nombre (obligatorio), Descripción (opcional, contador si aplica), Orden
  (numérico opcional, con el texto de ayuda dinámico "queda al final (N)"); grupo "Acciones del
  módulo" con las cuatro casillas Ver/Crear/Modificar/Eliminar, Ver siempre marcada y sin poder
  desmarcarse (deshabilitada o que revierte el intento); cada casilla muestra debajo el nombre del
  permiso (`<key>:<accion>`, con una `key` de ejemplo pasada por props); errores asociados con
  `aria-describedby`; sin violaciones de axe.
- [ ] T048 [P] [US2] Escribir `src/features/modules/components/ModuleCreatePanel.test.tsx` (tras
  T047): Tipo como dos tarjetas (Sistema/Clínica) con su texto de ayuda; Clave con su formato y su
  ayuda; `ModuleFormFields` con las cuatro acciones marcadas por omisión; al guardar con éxito llama
  `createModule` y después `createModuleAction` por cada acción marcada, **en secuencia**; si
  `createModule` falla, no se llama a ninguna `createModuleAction` y el error se asocia al campo que
  corresponda (p. ej. Clave duplicada); si `createModule` tiene éxito pero una `createModuleAction`
  falla, se informa con precisión cuáles acciones se guardaron y cuál no, y el panel pasa a mostrar
  **Editar** ese módulo ya creado (research D11).
- [ ] T049 [US2] Ampliar `src/features/modules/components/ModulesPage.test.tsx` (tras T048): el
  botón "+ Nuevo módulo" (visible solo con `canCreate`) abre `ModuleCreatePanel` (`?new=1`); crear un
  módulo lo agrega de inmediato al listado sin recargar toda la pantalla.
- [ ] T050 [US2] Escribir `src/app/router/modules/createModule.integration.test.tsx` (tras T049):
  el recorrido completo de W6 a W9 del quickstart.

### Implementation for User Story 2

- [ ] T051 [P] [US2] Ampliar `src/features/modules/api/modulesApi.ts` (tras T046, T033):
  `createModule`, `createModuleAction`. Hace pasar T046.
- [ ] T052 [P] [US2] Implementar `src/features/modules/components/ModuleFormFields.tsx` (tras T047,
  T009, T011, T020). Hace pasar T047.
- [ ] T053 [US2] Implementar `src/features/modules/components/ModuleCreatePanel.tsx` (tras T048,
  T051, T052, T009): orquesta `createModule` y, en secuencia, `createModuleAction` por cada acción
  marcada (research D11); usa React Hook Form con el resolver de `moduleForm.ts`. Hace pasar T048.
- [ ] T054 [US2] Ampliar `src/features/modules/components/ModulesPage.tsx` (tras T049, T042, T053):
  agregar el botón "+ Nuevo módulo" (gated por `capabilities.canCreate`) que abre el panel de alta
  (`useModulesLocation().openCreate()`); renderizar `ModuleCreatePanel` cuando
  `location.panel.kind === 'create'`. Hace pasar T049.
- [ ] T055 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente W6 a W9
  de [quickstart.md](quickstart.md).

**Checkpoint**: el alta de un módulo, con sus acciones, funciona de punta a punta.

---

## Phase 5: User Story 3 - Modificar un módulo (Priority: P2)

**Goal**: el operador corrige el nombre, la descripción, el orden o las acciones de un módulo
existente, con la garantía de que su clave y su tipo nunca cambian.

**Independent Test**: editar "Agenda y citas", cambiar su descripción y desmarcar "Eliminar" (con
confirmación), guardar y comprobar que el listado refleja el cambio y que su clave y su tipo siguen
igual (quickstart W10 a W13).

### Tests for User Story 3 ⚠️

- [ ] T056 [P] [US3] Ampliar `src/features/modules/api/modulesApi.update.test.ts` (tras T033):
  `updateModule(client, id, body)` hace `PATCH /api/v1/modules/{id}` solo con los campos presentes
  en `body`; `deleteModuleAction(client, permissionId)` hace `DELETE
  /api/v1/permissions/{permissionId}` y, si la API responde `404 permission_not_found`, lo resuelve
  como éxito (ya se cumplió lo que se pedía; [contracts/modules-service.md](contracts/modules-service.md)).
- [ ] T057 [P] [US3] Escribir `src/features/modules/components/ModuleEditPanel.test.tsx` (tras
  T052, T009): Clave y Tipo se muestran como información fija (no campos editables), con el texto
  "La clave y el tipo no cambian nunca"; `ModuleFormFields` abre con los valores actuales
  (`toFormValues`); marcar una acción que no tenía la dispara de inmediato en el formulario sin
  pedir nada; desmarcar una que sí tenía pide confirmar explícitamente, nombrando el módulo y la
  acción, antes de habilitar Guardar (cancelar la confirmación no cambia nada); guardar aplica
  `PATCH` solo si cambió nombre/descripción/orden y, por separado, crea o elimina solo las acciones
  que cambiaron, en secuencia; "Descartar cambios" vuelve a los valores actuales sin guardar; con el
  módulo base `users`, el nombre, la descripción y el orden se pueden cambiar igual que cualquier
  otro.
- [ ] T058 [US3] Ampliar `src/features/modules/components/ModulesPage.test.tsx` (tras T057): pulsar
  Editar en una fila abre `ModuleEditPanel` con los datos de esa fila (`?edit=<id>`, sin una
  solicitud nueva: reutiliza el módulo ya cargado por la lista, research D10).
- [ ] T059 [US3] Escribir `src/app/router/modules/editModule.integration.test.tsx` (tras T058): el
  recorrido completo de W10 a W13 del quickstart.

### Implementation for User Story 3

- [ ] T060 [P] [US3] Ampliar `src/features/modules/api/modulesApi.ts` (tras T056, T033):
  `updateModule`, `deleteModuleAction`. Hace pasar T056.
- [ ] T061 [US3] Implementar `src/features/modules/components/ModuleEditPanel.tsx` (tras T057,
  T060, T052, T009): reutiliza `ModuleFormFields`; el diálogo de confirmación al desmarcar una
  acción (research D9); aplica `updateModule` y, en secuencia, `createModuleAction`/
  `deleteModuleAction` por cada acción que cambió. Hace pasar T057.
- [ ] T062 [US3] Ampliar `src/features/modules/components/ModulesPage.tsx` (tras T058, T054, T061):
  el botón Editar de cada fila (gated por `capabilities.canEdit`) abre el panel con
  `useModulesLocation().openEdit(id)`; renderizar `ModuleEditPanel` cuando `location.panel.kind ===
  'edit'`, tomando el módulo ya presente en la caché de la consulta de la lista. Hace pasar T058.
- [ ] T063 [US3] Punto de control de la historia: ejecutar las pruebas y validar manualmente W10 a
  W13 de [quickstart.md](quickstart.md).

**Checkpoint**: consultar, crear y modificar un módulo funcionan juntos de punta a punta.

---

## Phase 6: User Story 4 - Bloquear y desbloquear un módulo (Priority: P2)

**Goal**: el operador retira temporalmente un módulo —y el acceso de sus acciones— sin perder su
información, y puede revertirlo.

**Independent Test**: bloquear `inventory`, comprobar que pasa al filtro Bloqueados y que sus
acciones dejan de figurar como permisos activos; desbloquearlo y comprobar que todo vuelve
(quickstart W14).

### Tests for User Story 4 ⚠️

- [ ] T064 [P] [US4] Ampliar `src/features/modules/api/modulesApi.block.test.ts` (tras T033):
  `blockModule(client, id)` hace `POST /api/v1/modules/{id}/block`; `unblockModule(client, id)` hace
  `POST /api/v1/modules/{id}/unblock`.
- [ ] T065 [US4] Ampliar `src/features/modules/components/ModuleEditPanel.test.tsx` (tras T061): la
  sección "Bloquear o eliminar" con su texto de ayuda es visible solo con `canBlock`/`canUnblock`;
  muestra "Bloquear módulo" si el módulo está Activo y "Desbloquear módulo" si está Bloqueado; para
  los cuatro módulos protegidos, esa acción no está disponible, con una explicación; bloquear un
  módulo ya bloqueado por otra persona un instante antes muestra el aviso del `409` sin romper la
  pantalla.
- [ ] T066 [US4] Escribir `src/app/router/modules/blockModule.integration.test.tsx` (tras T065):
  el recorrido de W14 del quickstart (bloquear, ver el cambio de filtro, desbloquear) y la parte de
  W15 relativa a bloquear un módulo protegido.

### Implementation for User Story 4

- [ ] T067 [P] [US4] Ampliar `src/features/modules/api/modulesApi.ts` (tras T064, T033):
  `blockModule`, `unblockModule`. Hace pasar T064.
- [ ] T068 [US4] Ampliar `src/features/modules/components/ModuleEditPanel.tsx` (tras T065, T067,
  T061): agregar la sección "Bloquear o eliminar" con el botón Bloquear/Desbloquear según el estatus
  del módulo, oculto para los protegidos. Hace pasar T065.
- [ ] T069 [US4] Punto de control de la historia: ejecutar las pruebas y validar manualmente W14 de
  [quickstart.md](quickstart.md).

**Checkpoint**: bloquear y desbloquear funcionan junto con las historias anteriores.

---

## Phase 7: User Story 5 - Eliminar un módulo (Priority: P2)

**Goal**: el operador da de baja un módulo de forma definitiva, aunque alguna de sus acciones ya
esté asignada a un role.

**Independent Test**: eliminar `inventory` (con alguna acción ya asignada a un role) y comprobar que
desaparece de toda lista y consulta, y que después se puede crear un módulo nuevo con la misma clave
(quickstart W16).

### Tests for User Story 5 ⚠️

- [ ] T070 [P] [US5] Ampliar `src/features/modules/api/modulesApi.delete.test.ts` (tras T033):
  `deleteModule(client, id)` hace `DELETE /api/v1/modules/{id}`.
- [ ] T071 [US5] Ampliar `src/features/modules/components/ModuleEditPanel.test.tsx` (tras T068):
  "Eliminar módulo" (gated por `canDelete`) pide confirmación explícita que nombra el módulo antes
  de eliminar; para los cuatro módulos protegidos esa acción no está disponible, con una
  explicación; tras eliminar, el panel se cierra y la fila desaparece de la lista.
- [ ] T072 [US5] Escribir `src/app/router/modules/deleteModule.integration.test.tsx` (tras T071):
  la parte de W15 relativa a eliminar un módulo protegido, y W16 completo.

### Implementation for User Story 5

- [ ] T073 [P] [US5] Ampliar `src/features/modules/api/modulesApi.ts` (tras T070, T033):
  `deleteModule`. Hace pasar T070.
- [ ] T074 [US5] Ampliar `src/features/modules/components/ModuleEditPanel.tsx` (tras T071, T073,
  T068): agregar "Eliminar módulo" con su diálogo de confirmación (constitución VI), oculto para los
  protegidos. Hace pasar T071.
- [ ] T075 [US5] Punto de control de la historia: ejecutar las pruebas y validar manualmente W15 y
  W16 de [quickstart.md](quickstart.md).

**Checkpoint**: las cinco historias funcionan juntas de punta a punta: consultar, crear, modificar,
bloquear/desbloquear y eliminar un módulo.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: verificaciones finales que cruzan las cinco historias.

- [ ] T076 [P] Escribir `e2e/modules.spec.ts` (mismo patrón que `e2e/subscriptions.spec.ts`): un
  recorrido crítico completo (consultar, crear, editar, bloquear/desbloquear, eliminar) contra un
  entorno de pruebas real, cuando exista.
- [ ] T077 [P] Revisar accesibilidad manual del listado agrupado y de los tres estados del panel
  (vacío, Editar, Nuevo módulo) a 1024 px y a 320 px, solo con teclado (quickstart W17).
- [ ] T078 Medir de nuevo el bundle (`npm run build && npm run size`) y comparar con la línea base de
  T001; si crece por encima del presupuesto de 300 KB gzip, revisar qué parte debe cargarse de forma
  más perezosa.
- [ ] T079 Ejecutar de punta a punta los escenarios W1 a W17 de [quickstart.md](quickstart.md) (los
  automatizados ya corren en CI; esta pasada es manual, como el cierre de la 003, la 011 y la 012).
- [ ] T080 Punto de control final: `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run test:coverage` (umbral de 80 % en `api`, `policy`, `schemas` y `hooks`) y `npm run build`
  pasan todos.

**Checkpoint**: feature completa, medida y validada contra el quickstart.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** las cinco historias: los catálogos
  fijos, `SystemModule`, el cruce con permisos, el formulario, la ubicación en la URL, los errores,
  las capacidades, la navegación/permisos y el simulador los usan todas.
- **User Stories (Phase 3-7)**: todas dependen de Foundational.
  - US1 no depende de US2, US3, US4 ni US5 (es de solo lectura).
  - US2, US3, US4 y US5 comparten `ModuleFormFields` (creada en US2) y, desde US3, `ModuleEditPanel`
    (creado en US3, ampliado por US4 y US5): por eso se implementan en ese orden, aunque US2 y US3
    tienen prioridades distintas (P1 y P2) y US4/US5 son ambas P2.
- **Polish (Phase 8)**: depende de las cinco historias.

### Dentro de cada historia

- Tests antes que la implementación que los hace pasar (marcado "Hace pasar TXXX" en cada tarea de
  implementación).
- Piezas puras (`schemas/`, `policy/`) antes que los componentes que las usan.
- `ModuleFormFields` (US2) antes que `ModuleCreatePanel` (US2) y que `ModuleEditPanel` (US3), que la
  componen.

### Parallel Opportunities

- Dentro de Foundational: T002, T004, T006, T008, T010, T012, T016, T018 (pruebas de piezas sin
  dependencias entre sí) en paralelo; T023 y T026 también, en paralelo con el resto.
- Dentro de US1: T035 y T036 en paralelo.
- Dentro de US2: T046, T047 y T048 en paralelo (archivos distintos).
- Dentro de US3, US4 y US5: la prueba de `api/` (T056/T064/T070) en paralelo con la del componente
  correspondiente cuando no comparten archivo.

---

## Parallel Example: Foundational

```bash
Task: "Escribir src/features/modules/schemas/moduleActionCatalog.test.ts (T002)"
Task: "Escribir src/features/modules/schemas/systemModule.test.ts (T004)"
Task: "Escribir src/features/modules/schemas/moduleForm.test.ts (T008)"
Task: "Escribir src/features/modules/policy/moduleActionSelection.test.ts (T010)"
Task: "Escribir src/features/modules/schemas/modulesLocation.test.ts (T012)"
Task: "Escribir src/features/modules/api/moduleErrors.test.ts (T016)"
Task: "Escribir src/features/auth/policy/moduleCapabilities.test.ts (T018)"
```

## Parallel Example: User Story 2 (alta)

```bash
Task: "Ampliar src/features/modules/api/modulesApi.create.test.ts (T046)"
Task: "Escribir src/features/modules/components/ModuleFormFields.test.tsx (T047)"
Task: "Escribir src/features/modules/components/ModuleCreatePanel.test.tsx (T048)"
```

---

## Implementation Strategy

### MVP First (historias 1 y 2, las dos P1)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (BLOQUEA todo).
3. Completar Phase 3: US1 (consultar, filtrar y buscar).
4. **PARAR y VALIDAR**: quickstart W1 a W5.
5. Completar Phase 4: US2 (crear un módulo con sus acciones).
6. **PARAR y VALIDAR**: quickstart W6 a W9.

### Incremental Delivery

1. Setup + Foundational → base lista (catálogos fijos, cruce módulo↔acciones, navegación y
   simulador, todo de una vez).
2. US1 → la pantalla ya aporta valor por sí sola (consultar lo que ya existe).
3. US2 → primera entrega completa de alta y consulta; PR pequeño y enfocado, como pide la
   constitución.
4. US3 → cierra el patrón de Listar/Mostrar/Crear/Modificar para esta feature.
5. US4 → bloquear y desbloquear, una comodidad de administración diaria.
6. US5 → eliminar, la operación irreversible y menos frecuente, al final.
7. Polish → E2E, accesibilidad, medición final y quickstart completo.

### Parallel Team Strategy

1. El equipo completa Setup y Foundational junto (es, en su mayoría, un solo cambio coherente:
   dividirlo entre varias personas por archivo, no por historia).
2. Con Foundational lista: una persona hace US1 (T035-T045); otra prepara en paralelo
   `ModuleFormFields` y `ModuleCreatePanel` de US2 (T047-T048, T052-T053), que no dependen de US1, y
   los termina de integrar (T054) en cuanto US1 entrega `ModulesPage` (T042).
3. US3 espera a que `ModuleFormFields` (US2, T052) esté completo; US4 y US5 esperan a que
   `ModuleEditPanel` (US3, T061) esté completo, porque las tres amplían el mismo componente.

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí.
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad.
- Verificar que las pruebas fallan antes de implementar.
- El simulador de pruebas (`src/test/handlers/modulesCatalog/`) importa el catálogo fijo de acciones
  y tipos del propio código de producción (T028, research D4): si el contrato de la API cambiara,
  esas pruebas y `moduleActionCatalog.ts` cambian primero.
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés).
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su
  independencia (salvo la ya documentada de US3/US4/US5 sobre `ModuleFormFields`/`ModuleEditPanel`
  de US2/US3).
