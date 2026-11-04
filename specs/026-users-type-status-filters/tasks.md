---

description: "Task list for feature 026 — lista de usuarios con filtros de Tipo y Estatus"
---

# Tasks: Lista de usuarios con filtros de Tipo y Estatus

**Input**: Design documents from `/specs/026-users-type-status-filters/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/users-list-service.md](contracts/users-list-service.md), [contracts/users-list-ui.md](contracts/users-list-ui.md), [quickstart.md](quickstart.md)

**Tests**: la constitución (VII) exige las pruebas en el mismo PR, test-first en la lógica pura (esquemas, dirección, funciones de texto) y cobertura ≥ 80 % en `api`/`schemas`/`hooks`. Las tareas de prueba están incluidas y van **antes** de la implementación de su historia.

**Organization**: por historia de usuario, en el orden de prioridad del spec (US1 P1, US2 P1, US3 P2, US4 P3). US1 a US4 tocan `UsersListPage.tsx`, `UsersList.tsx` y `UsersGrid.tsx`, así que **se implementan en orden**; dentro de una fase, `[P]` marca archivos distintos sin dependencias pendientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1 … US4)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz (`src/`, `e2e/`). La feature vive en `src/features/users/`; el simulador en `src/test/handlers/usersDirectory/`; las integraciones en `src/app/router/users/`.

**Convenciones que se aplican a toda tarea de este archivo**:

- **Contrato**: API de usuarios **5.5.0** ([contracts/users-list-service.md](contracts/users-list-service.md)): `GET /api/v1/users` con `status_id` (1 | 2) y `role_type_id` (1 | 2, opcional); cada elemento trae `role_types: [{ id, name }]`, **obligatorio**, «sin repetidos y ordenados por `id`», `[]` si no hay roles Activos.
- **Dirección**: `type_id` ∈ {`1`, `2`} (ausente = Todos), `status_id` ∈ {`2`} (ausente = Activos), `page` (entero ≥ 1), `page_size` ∈ {10, 25, 50}, `email` (modo búsqueda); en el código `'all' | 'system' | 'clinic'` y `'active' | 'blocked'` (data-model §3). Lo que es por omisión no se escribe.
- **Textos**: siempre desde `messages.users` de `src/shared/messages/es.ts`, con los textos exactos de [contracts/users-list-ui.md](contracts/users-list-ui.md); nunca literales en JSX. Código, archivos y commits en inglés; documentación en español.
- **No tocar** `src/features/modules`, `src/features/roles`, `src/test/handlers/modulesCatalog` ni `specs/024-*`.
- **Pruebas en esta máquina**: `npm test -- <rutas> --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`. Simulador MSW, sin mockear `fetch`.

---

## Phase 1: Setup

- [X] T001 Confirmar la línea base: `npm ci` si falta `node_modules`, y `npm run typecheck` y `npm test -- src/features/users src/app/router/users src/test/handlers/usersDirectory` en verde antes de tocar nada (anotar fallos previos, como intermitencias conocidas); sin dependencias, variables de entorno ni cambios en `.env.example` (plan.md, Technical Context).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el contrato 5.5.0 en el cliente (esquema, petición, simulador), el estado de la dirección con los dos filtros, la clave de consulta, los textos y la extracción de `UsersList`, que usan todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar antes de esta fase.

- [X] T002 [P] Crear `src/features/users/schemas/userListItem.test.ts` (test-first, data-model §1): un `UserRead` con `role_types: [{ id: 2, name: 'Clínica' }]` se convierte en el `PlatformUser` de siempre más `roleTypes`; `role_types: []` es válido; **sin `role_types` se rechaza** (research D2); un elemento de `role_types` exige `id` entero y `name` texto no vacío; `photo_url` y otros campos desconocidos se descartan. En `src/features/users/schemas/userPage.test.ts`, que `items` se lea como `UserListItem` y que una página cuyos elementos no traen `role_types` se rechace.
- [X] T003 Hacer pasar T002: en `src/features/users/schemas/user.ts` exportar `platformUserDtoSchema` (el `z.object` de `UserRead`) y `toPlatformUser(dto)`, y definir `platformUserSchema = platformUserDtoSchema.transform(toPlatformUser)` sin cambiar su comportamiento; crear `src/features/users/schemas/userListItem.ts` con `roleTypeSchema` (`{ id: z.number().int(), name: z.string().min(1) }`), `userListItemSchema = platformUserDtoSchema.extend({ role_types: z.array(roleTypeSchema) })` transformado a `{ ...toPlatformUser(dto), roleTypes: dto.role_types }`, y los tipos `RoleType` y `UserListItem` (research D6); en `src/features/users/schemas/userPage.ts`, `items: z.array(userListItemSchema)` y el comentario sin «solo activos» (`total`/`pages` cuentan lo que cumple los filtros).
- [X] T004 Fábricas (después de T003): en `src/test/factories.ts`, `userListItemDto(overrides)` = `userDto()` + `role_types: []`; `userPageDto` usa `[userListItemDto()]` por omisión y `userPageDtoOf` recibe elementos de lista (añade `role_types: []` a los que no lo traigan). Corregir los usos en `src/features/users/api/usersApi.read.test.ts` y en el resto que `npm run typecheck` señale.
- [X] T005 [P] Reescribir `src/features/users/schemas/usersLocation.test.ts` (test-first, data-model §3): `parseUsersSearchParams` sin parámetros → `{ mode: 'list', page: 1, pageSize: 10, type: 'all', status: 'active' }`; `type_id=1|2` → `system|clinic`; `status_id=2` → `blocked`; `type_id` 0, 3, `abc` o vacío → `all`; `status_id` 1, 3 o `abc` → `active`; con `email` → `{ mode: 'search', email, type, status }` (lee también los filtros); `toUsersSearchParams` omite lo que es por omisión con orden fijo (`type_id`, `status_id`, `page`, `page_size` en lista; `email`, `type_id`, `status_id` en búsqueda) y la ida y vuelta es canónica; `?page=3&page_size=25` ya es canónico (FR-010). Además, `emptyUsersMessage(type, status)` devuelve los seis textos de contracts/users-list-ui.md («No hay usuarios activos», «No hay usuarios activos de Sistema», «… de Clínica», «No hay usuarios bloqueados», «No hay usuarios bloqueados de Sistema», «… de Clínica»).
- [X] T006 Hacer pasar T005 en `src/features/users/schemas/usersLocation.ts`: tipos `UsersTypeFilter` (`'all' | 'system' | 'clinic'`) y `UsersStatusFilter` (`'active' | 'blocked'`); `UsersLocation` con `type` y `status` en ambos modos; esquemas Zod con `catch` al valor por omisión; `ROLE_TYPE_ID_OF_USERS_FILTER` (`system` → 1, `clinic` → 2) y `STATUS_ID_OF_USERS_FILTER` (`active` → `USER_STATUS.ACTIVE`, `blocked` → `USER_STATUS.BLOCKED`, de `userStatus.ts`); `emptyUsersMessage(type, status)` con los textos de T007 (research D3, D10, D13). Depende de T007.
- [X] T007 [P] En `src/shared/messages/es.ts`, bloque `users`: `filters` (`typeLabel` «Tipo», `type.all/system/clinic` «Todos»/«Sistema»/«Clínica», `statusLabel` «Estatus», `status.active/blocked` «Activos»/«Bloqueados», los mismos valores que `roles.filters`); en `list`: `columns.type` «Tipo», `noType` «—», `typeJoin(a, b)` «`${a} y ${b}`», `emptyActiveOfType(type)` «No hay usuarios activos de ${type}», `emptyBlocked` «No hay usuarios bloqueados» y `emptyBlockedOfType(type)` «No hay usuarios bloqueados de ${type}»; `list.empty` («No hay usuarios activos») se queda igual.
- [X] T008 [P] En `src/features/users/hooks/userKeys.ts`, `UserListParams` = `{ page, pageSize, type: UsersTypeFilter, status: UsersStatusFilter }` (la clave sigue bajo `userKeys.lists()`); en `src/features/users/hooks/userKeys.test.ts`, que dos combinaciones de filtros den claves distintas y ambas empiecen por `userKeys.lists()` (research D5).
- [X] T009 En `src/features/users/api/usersApi.ts` (después de T004, que toca la misma prueba), `listUsers(client, { page, pageSize, statusId, roleTypeId, signal })` con `statusId: 1 | 2` y `roleTypeId?: 1 | 2`: la consulta lleva `page`, `page_size` y `status_id` **siempre** y `role_type_id` solo si se da (research D1); comentario «U1 (API 5.5.0)». Casos en `src/features/users/api/usersApi.read.test.ts` con MSW: los parámetros enviados en cada combinación y la respuesta convertida en `UserListItem` con `roleTypes`.
- [X] T010 [P] Simulador (research D11, data-model §6): en `src/test/handlers/usersDirectory/model.ts`, `listUsers(page, pageSize, { statusId, roleTypeId })` sustituye a `listActiveUsers`: usuarios con ese estatus (nunca Eliminados), con `roleTypeId` solo los que tienen al menos un role **Activo** de ese tipo, orden por nombre de siempre, totales sobre lo filtrado y `role_types` = tipos distintos de sus roles Activos, ordenados por `id`, con el nombre del catálogo; en `src/test/handlers/usersDirectory/reads.ts`, `GET /api/v1/users` lee `status_id` (`readInteger`, `fallback` 1, `min` 1, `max` 2) y `role_type_id` (ausente → sin filtro; si viene, entero de 1 a 2), con 422 `validation_error` y `issue('status_id')`/`issue('role_type_id')` en otro caso. Casos en `src/test/handlers/usersDirectory/model.test.ts` y `reads.test.ts` con los datos de ejemplo de la spec 018 de la API (Ana…Jorge): las seis combinaciones, un usuario con dos roles del mismo tipo una sola vez, uno con ambos tipos en los dos filtros, roles Bloqueados/Eliminados que no cuentan, Eliminados nunca, y los 422 con `status_id=3` y `role_type_id=0|abc`.
- [X] T011 `useUsersPage(params)` en `src/features/users/hooks/useUsersPage.ts` (después de T006, T008 y T009): traduce `status` y `type` con los mapas de T006 y llama a `listUsers` con `statusId` y `roleTypeId` (nada con `all`); comentario sin «active users». Casos en `src/features/users/hooks/useUsersPage.test.tsx`: la petición de cada combinación.
- [X] T012 `useUsersLocation` en `src/features/users/hooks/useUsersLocation.ts` (después de T006), data-model §3 «Transiciones»: `location` con `type` y `status`; `setType(type)` y `setStatus(status)` — en modo lista, página 1 con el mismo `pageSize` y el otro filtro (FR-008); en modo búsqueda, salen de la búsqueda a modo lista, página 1, tamaño por omisión y ambos filtros (research D4); `setPage`/`setPageSize` conservan los filtros; `searchEmail` y `clearSearch` conservan los filtros (FR-011); la canonización con `replace` sigue igual. Casos en `src/features/users/hooks/useUsersLocation.test.tsx` para cada transición.
- [X] T013 Extraer `UsersList` de `src/features/users/components/UsersListPage.tsx` a `src/features/users/components/UsersList.tsx` **sin cambiar el comportamiento** (research D13), con las props de hoy más `type` y `status`, que pasa a `useUsersPage`; `UsersListPage` le da `location.type` y `location.status`. Las pruebas de `UsersListPage.test.tsx` siguen en verde sin cambios.

**Checkpoint**: `npm run typecheck` en verde y las pruebas de `src/features/users`, `src/app/router/users` y `src/test/handlers/usersDirectory` pasan; la pantalla todavía no muestra filtros (Todos + Activos implícitos).

---

## Phase 3: User Story 1 - Filtrar los usuarios por Tipo con botones (Priority: P1) 🎯 MVP

**Goal**: los grupos «Tipo» y «Estatus» aparecen junto al buscador con Todos y Activos pulsados; Sistema y Clínica filtran; cada fila dice su tipo.

**Independent Test**: abrir `/users` → «Todos» y «Activos» pulsados y columna «Tipo»; «Sistema» y «Clínica» filtran con su total; el usuario sin roles Activos dice «—» y solo sale con «Todos» (quickstart pasos 1–2).

### Tests for User Story 1

- [X] T014 [P] [US1] En `src/features/users/schemas/userListItem.test.ts`, `describeUserType(roleTypes)` (data-model §1, research D7): `[]` → «—»; solo id 1 → «Sistema»; solo id 2 → «Clínica»; ids 1 y 2 → «Sistema y Clínica»; un id desconocido (`{ id: 3, name: 'Externo' }`) usa su `name`, y `[1, 3]` → «Sistema y Externo»; decide por `id`, nunca por `name` de 1 o 2.
- [X] T015 [P] [US1] Crear `src/features/users/components/UsersFilters.test.tsx`: dos grupos con nombre accesible «Tipo» y «Estatus»; botones en orden (Todos, Sistema, Clínica; Activos, Bloqueados); `aria-pressed` del valor recibido; `onTypeChange`/`onStatusChange` al pulsar otro botón y **ninguna** llamada al pulsar el ya pulsado (FR-003); sin violaciones de axe.
- [X] T016 [P] [US1] En `src/features/users/components/UsersGrid.test.tsx`: columna «Tipo» entre «Correo electrónico» y «Fecha de alta», con «Sistema», «Clínica», «Sistema y Clínica» y «—» según `roleTypes`; el vacío muestra el `emptyMessage` recibido y su acción.
- [X] T017 [P] [US1] En `src/features/users/components/UsersListPage.test.tsx`: los grupos se ven con «Todos» y «Activos» pulsados (FR-004, US1-1); pulsar «Sistema» escribe `?type_id=1` y pide `status_id=1&role_type_id=1`; «Todos» quita `type_id`; vacío con tipo → «No hay usuarios activos de Sistema» con «Crear usuario» si `canCreate`; filtros, buscador y título visibles en carga, vacío y error (FR-013).

### Implementation for User Story 1

- [X] T018 [US1] `describeUserType(roleTypes)` en `src/features/users/schemas/userListItem.ts` (hace pasar T014) con `messages.users.filters.type` y `messages.users.list.noType`/`typeJoin`.
- [X] T019 [P] [US1] Crear `src/features/users/components/UsersFilters.tsx` (hace pasar T015) con la misma estructura, props y estilos que `RolesFilters` de `src/features/roles/components/RolesFilters.tsx` **sin importarlo** (research D9): `Stack` con `flexWrap`, etiqueta `Typography variant="body2" color="text.secondary"` encima, `ToggleButtonGroup exclusive size="small"` con `aria-label`, ignorando el `null` de MUI; tipos de `usersLocation.ts`, textos de `messages.users.filters`.
- [X] T020 [US1] En `src/features/users/components/UsersGrid.tsx` (hace pasar T016): `users: readonly UserListItem[]`; columna «Tipo» (`messages.users.list.columns.type`, `valueGetter` con `describeUserType`, `minWidth` acorde) entre correo y fecha (research D8); prop `emptyMessage: string` que sustituye al texto fijo del `NoRowsOverlay`; comentario de `total` sin «Active users».
- [X] T021 [US1] En `src/features/users/components/UsersList.tsx` y `src/features/users/components/UsersListPage.tsx` (hacen pasar T017): `UsersListPage` pone `UsersFilters` en su propia fila justo encima de `UserSearchForm` (al implementar se descartó la fila compartida: ver Notes) (FR-001, FR-017) y conecta `setType`/`setStatus`; `UsersList` pasa a `UsersGrid` `emptyMessage = emptyUsersMessage(type, status)` y `emptyAction` **solo con `status === 'active'`** (US2-5); comentarios de los componentes sin «active users».
- [X] T022 [US1] Crear `src/app/router/users/filterUsers.integration.test.tsx` con el simulador sembrado con usuarios de ambos tipos: «Todos» lista a los activos de ambos tipos con su tipo; «Sistema» y «Clínica» filtran con su total y sus páginas; el usuario con roles Activos de ambos tipos sale en los dos y dice «Sistema y Clínica»; el usuario sin roles Activos (sin roles, o solo con roles Bloqueados/Eliminados) dice «—» y no sale al filtrar por tipo (US1-1 a US1-6).

**Checkpoint**: US1 funciona y se prueba sola (quickstart pasos 1–2).

---

## Phase 4: User Story 2 - Filtrar los usuarios por Estatus y ver los bloqueados (Priority: P1)

**Goal**: «Bloqueados» lista a los usuarios bloqueados (combinable con Tipo), marcados en la fila, y desde la tabla se llega a su detalle para desbloquearlos.

**Independent Test**: pulsar «Bloqueados» → solo bloqueados con el chip «Bloqueado», combinable con cada Tipo; abrir uno, desbloquearlo y volver: ya no está en Bloqueados y sí en Activos, con los mismos filtros (quickstart pasos 3, 4 y 6).

### Tests for User Story 2

- [X] T023 [P] [US2] En `src/features/users/components/UsersGrid.test.tsx`: un usuario bloqueado lleva el `StatusChip` «Bloqueado» después del enlace de su nombre, y uno activo no lleva chip; el enlace sigue llevando a `/users/:id` con `state.listSearch`.
- [X] T024 [P] [US2] En `src/features/users/components/UsersListPage.test.tsx`: pulsar «Bloqueados» escribe `?status_id=2` y pide `status_id=2`; los vacíos de Bloqueados («No hay usuarios bloqueados», «… de Sistema», «… de Clínica») **sin** «Crear usuario» en el vacío (US2-5) pero con el botón de la cabecera si `canCreate` (US3-8); un error de carga muestra reintentar sin ocultar filtros, buscador ni título (US2-6).
- [X] T025 [US2] En `src/app/router/users/filterUsers.integration.test.tsx`: «Bloqueados» muestra solo bloqueados (nunca Eliminados ni activos); combinado con Sistema y con Clínica, cada fila cumple ambos filtros (US2-1, US2-2); abrir un bloqueado desde la tabla, «Desbloquear», «Volver al listado»: la dirección conserva los filtros y el usuario ya no está en Bloqueados y sí en Activos (US2-4, SC-007).

### Implementation for User Story 2

- [X] T026 [US2] En `src/features/users/components/UsersGrid.tsx` (hace pasar T023): la celda del nombre muestra el enlace y, si `!isActiveStatus(row.status.id)` (`schemas/userStatus.ts`), el `StatusChip` de `src/features/users/components/StatusChip.tsx` detrás, en una fila que no corte el texto (research D8); el `valueGetter` sigue siendo el nombre completo.

**Checkpoint**: US1 y US2 funcionan juntas (quickstart pasos 1–6).

---

## Phase 5: User Story 3 - Que los filtros, la paginación y el buscador sean coherentes (Priority: P2)

**Goal**: filtros, página y tamaño viven en la dirección; los enlaces anteriores siguen sirviendo; la búsqueda por correo no se ve afectada; el tipo está al día tras cambiar roles.

**Independent Test**: elegir filtros, página y tamaño, abrir un usuario y volver, y recargar; cambiar un filtro en la página 3; buscar un bloqueado con «Activos»; limpiar (quickstart pasos 5, 7–13).

### Tests for User Story 3

- [X] T027 [P] [US3] En `src/features/users/hooks/useUsersPage.test.tsx`: al volver a montarse con la página ya en caché, la pide de nuevo (`refetchOnMount: 'always'`) y muestra la guardada mientras llega (research D5).
- [X] T028 [P] [US3] En `src/features/users/hooks/refreshUser.test.ts`: `refreshAfterRoleChange` invalida `userKeys.lists()` además de `userKeys.roles(userId)`, con éxito y con un error que no deja al usuario desactualizado (research D5).
- [X] T029 [US3] En `src/app/router/users/usersList.integration.test.tsx`: recargar o volver del detalle conserva filtros, página y tamaño (US3-1); cambiar un filtro en la página 3 vuelve a la 1 con el mismo tamaño (US3-2, FR-008); `?page=2&page_size=25` abre la página 2 de activos de ambos tipos (US3-3); `?type_id=9&status_id=3&page=abc` abre Todos + Activos y la dirección queda `/users` sin error (US3-4); con «Activos», buscar el correo de un bloqueado lo encuentra y la dirección conserva `type_id`/`status_id` (US3-5); «Limpiar» vuelve a la tabla con los mismos filtros (US3-6); pulsar un filtro durante una búsqueda la termina y muestra la tabla filtrada en la página 1 (research D4); una página que deja de existir con filtros se corrige a la última (US3-7); «Crear usuario» está con cualquier combinación (US3-8).
- [X] T030 [US3] En `src/app/router/users/manageRoles.integration.test.tsx`: tras quitar a un usuario su único role desde el detalle y volver a la lista, su tipo es «—» y ya no aparece al filtrar por el tipo que tenía (edge case de roles, research D5).

### Implementation for User Story 3

- [X] T031 [US3] En `src/features/users/hooks/useUsersPage.ts` (hace pasar T027): `refetchOnMount: 'always'`, conservando `placeholderData: keepPreviousData`, con un comentario que explique por qué (cambios de roles hechos en otra pantalla, research D5).
- [X] T032 [US3] En `src/features/users/hooks/refreshUser.ts` (hace pasar T028 y T030): `refreshAfterRoleChange` invalida también `userKeys.lists()` y su comentario lo explica (la lista muestra el tipo, que depende de los roles; constitución III).

**Checkpoint**: US1 a US3 funcionan juntas (quickstart pasos 1–13).

---

## Phase 6: User Story 4 - Usar los filtros con teclado, lector de pantalla y en pantallas angostas (Priority: P3)

**Goal**: los grupos se operan con teclado y lector de pantalla, cada cambio se anuncia sin mover el foco y la pantalla se reacomoda a 320 px.

**Independent Test**: cambiar ambos filtros solo con teclado y con lector de pantalla; reducir la ventana a 320 px (quickstart pasos 14–15).

### Tests for User Story 4

- [X] T033 [P] [US4] En `src/features/users/components/UsersListPage.test.tsx`: con el teclado, Tab entra al grupo «Tipo», la flecha derecha mueve el foco a «Sistema» y Espacio lo elige (FR-016); tras cambiar un filtro, el `LiveStatus` dice «Mostrando 1 a N de T usuarios.» o, si queda vacía, el texto del vacío, y el foco sigue en el botón pulsado (FR-014, US4-3); axe sin violaciones con filtros, la columna Tipo y un bloqueado con chip (SC-008).
- [X] T034 [P] [US4] En `e2e/responsive.spec.ts`, en la prueba de la lista de usuarios: a 320 px los grupos «Tipo» y «Estatus» y el buscador se ven sin desplazamiento horizontal de la página (FR-017, US4-4).

### Implementation for User Story 4

- [X] T035 [US4] En `src/features/users/components/UsersList.tsx` (hace pasar T033): el `LiveStatus` anuncia `emptyUsersMessage(type, status)` cuando la página cargada está vacía (antes, nada), y «Mostrando X a Y de Z usuarios.» como hoy (research D10).

**Checkpoint**: las cuatro historias funcionan juntas (quickstart §2 completo).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T036 En `e2e/users.spec.ts`, una prueba nueva en «readings (A1)»: pulsar «Sistema», «Clínica» y «Bloqueados» (la dirección y la tabla cambian; cada fila de Bloqueados lleva «Bloqueado»), abrir un usuario desde un filtro y volver con los mismos filtros; ajustar V1–V3 si el texto «1–10 de N» o la cuenta de enlaces cambiaran. Se ejecuta solo con `E2E_AUTH0_USER_A1`/`_PASSWORD_A1` y una API 5.5.0.
- [X] T037 Buscar con Grep restos de la lista «solo de activos»: `listActiveUsers`, «active users» o «usuarios activos» en comentarios de `src/features/users` (`usersApi.ts`, `useUsersPage.ts`, `UsersGrid.tsx`, `UsersList.tsx`, `UsersListPage.tsx`, `userPage.ts`) y en `src/test/handlers/usersDirectory/reads.ts`; corregir los que ya no son ciertos.
- [X] T038 Puertas de calidad (quickstart §1): `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test -- src/features/users src/app/router/users src/test/handlers/usersDirectory --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`, `npm run build` y `npm run size`.
- [X] T039 Verificar que los contratos ([contracts/users-list-ui.md](contracts/users-list-ui.md), [contracts/users-list-service.md](contracts/users-list-service.md)) coinciden con lo implementado (textos de `es.ts`, nombres accesibles, parámetros de la dirección y de la API) y corregir el contrato si algo difirió.
- [ ] T040 Recorrido manual del [quickstart.md](quickstart.md) §2 (pasos 1–15) contra una API de usuarios 5.5.0 real con una persona (requiere sesión de Auth0; no automatizable aquí).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias. T003 depende de T002; T004 de T003; T009 de T004 (comparten `usersApi.read.test.ts`); T006 de T005 y T007; T010 de T003 y T004; T011 de T006, T008 y T009; T012 de T006; T013 de T011 y T012.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP. T018 depende de T014; T020 de T018; T021 de T019 y T020; T022 de T021.
- **US2 (Phase 4)**: depende de US1 (mismos `UsersGrid.tsx`, `UsersListPage.test.tsx` y `filterUsers.integration.test.tsx`).
- **US3 (Phase 5)**: depende de US2 solo por `UsersListPage`; su estado de dirección ya está en Foundational (T012).
- **US4 (Phase 6)**: depende de US3 (`UsersList.tsx`, `UsersListPage.test.tsx`).
- **Polish (Phase 7)**: al final.

### Parallel Opportunities

- Foundational: T002, T005, T007 y T008 en paralelo (archivos distintos); tras T004, T009 y T010 en paralelo; después, T011 y T012.
- US1: T014, T015, T016 y T017 (pruebas) en paralelo; T019 en paralelo con T018 y T020.
- US2: T023 y T024 en paralelo.
- US3: T027 y T028 en paralelo; T031 y T032 en paralelo.
- US4: T033 y T034 en paralelo.

### Parallel Example: Foundational

```text
T002 userListItem.test.ts + userPage.test.ts
T005 usersLocation.test.ts
T007 es.ts (bloque users)
T008 userKeys.ts + userKeys.test.ts
```

### Parallel Example: User Story 1

```text
T014 userListItem.test.ts (describeUserType)
T015 UsersFilters.test.tsx
T016 UsersGrid.test.tsx
T017 UsersListPage.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational.
2. US1: grupos visibles, filtro de Tipo y columna Tipo. Validar con quickstart pasos 1–2. Como los dos grupos se ven desde US1 y `setStatus` ya existe (T012), «Bloqueados» ya filtra; US2 añade el chip, los vacíos sin invitación y sus pruebas.

### Incremental Delivery

1. + US2: Bloqueados marcados en la fila y el recorrido de desbloqueo (pasos 3–6).
2. + US3: dirección, enlaces antiguos, búsqueda con filtros y tipo al día tras cambiar roles (pasos 7–13).
3. + US4: teclado, anuncios y 320 px (pasos 14–15).
4. Polish: e2e, puertas de calidad y contratos.

## Notes

- **Estado de la implementación (2026-11-03)**: T001–T039 hechas en la rama `claude/026-users-type-status-filters-dd6978` (con `main` en `131ca49` integrado). Puertas de calidad (T038): `typecheck`, `lint` (0 avisos), `format:check` y `build` en verde; `size` 308,5 KB de 320 KB; suite completa 407 archivos y 4853 pruebas en verde (las de Usuarios, rutas y simulador: 73 archivos, 1128 pruebas). La prueba e2e de T036 y la ampliación de `responsive.spec.ts` (T034) están escritas pero **no se ejecutaron** (no hay cuentas `E2E_AUTH0_USER_A1` aquí). T040 (recorrido manual contra la API 5.5.0 real) sigue pendiente, y la disposición de la pantalla no se revisó a ojo (requiere sesión de Auth0).
- **Recorrido en navegador con simuladores (2026-11-03, sobre `main` en `f5738e5`)**: la aplicación real en Chromium (Playwright), con el simulador de la API de usuarios en un service worker de MSW y una sesión de Auth0 simulada, sin la API real. Pasos 1–15 del [quickstart.md](quickstart.md) §2: **18/18 comprobaciones correctas** y ninguna corrección necesaria. Cubre filtros y dirección, Bloqueados con «Bloqueado» junto al nombre, combinaciones, vuelta a la página 1, desbloquear desde el detalle y volver con los mismos filtros, vacío sin «Crear usuario», recarga, enlaces anteriores, valores no válidos, búsqueda con filtros, quitar el único role, teclado (Tab, flechas, Espacio, foco visible, anuncio «Mostrando 1 a 3 de 3 usuarios.»), 320 px sin desplazamiento horizontal en claro y oscuro, tema oscuro en escritorio y consola sin errores. **No sustituye a T040**: falta repetirlo contra una API de usuarios 5.5.0 real con una sesión de Auth0, y correr el e2e (T034, T036) con las cuentas de prueba.
- **Hallazgos de la implementación (2026-11-03)**:
  - `src/features/users/schemas/userDetailState.ts` solo aceptaba `page`, `page_size` y `email` como dirección de vuelta a la lista y descartaba el resto: al volver del detalle (y de crear o editar) se perdían los filtros. Ahora acepta también `type_id` y `status_id`, con su prueba (lo detectó T025; FR-012).
  - Los filtros van en su propia fila encima del buscador, no en la misma fila: el texto de ayuda del campo de correo impide alinearlos (T021; contrato actualizado).
  - El texto del vacío llega al `NoRowsOverlay` por `slotProps`, así que `src/shared/ui/dataGridAugmentation.d.ts` gana `message?: string`.

- La API desplegada en el entorno donde se pruebe debe ser la **5.5.0** (spec 018 de `mailySoft-usuarios`, `4fe6935`); con una anterior, la tabla muestra el error de carga a propósito (research D2).
- Archivos que pueden chocar con otras features en curso al integrar: `src/shared/messages/es.ts` (bloque `users` aquí; `modules` en la 024) y `src/test/factories.ts`.
- Seguimiento fuera de esta feature: extraer el par de grupos Tipo/Estatus a `shared/ui` para Módulos, Roles y Usuarios cuando la 024 esté integrada (research D9).
