---

description: "Task list for feature 027 — lista de roles y permisos en tabla, como la de Usuarios"
---

# Tasks: Lista de roles y permisos en tabla, como la de Usuarios

**Input**: Design documents from `/specs/027-roles-grid-list/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/app-routes.md](contracts/app-routes.md), [contracts/roles-ui.md](contracts/roles-ui.md), [quickstart.md](quickstart.md)

**Tests**: la constitución (VII) exige las pruebas en el mismo PR, test-first en la lógica pura (esquemas, funciones puras) y cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks`. Las tareas de prueba están incluidas y van **antes** de la implementación de su historia.

**Organization**: por historia de usuario, en el orden de prioridad del spec (US1 P1, US2 P1, US3 P2, US4 P2, US5 P3). US1 a US5 tocan `RolesPage.tsx`, `RolesTable.tsx` y `RoleDetailPage.tsx` (y sus pruebas), así que **se implementan en orden**; dentro de una fase, `[P]` marca archivos distintos sin dependencias pendientes. US1 y US2 son el MVP **juntas**: con solo la tabla no se puede abrir un role y la sección queda inutilizable (spec, US2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1 … US5)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz (`src/`, `e2e/`). La feature vive en `src/features/roles/`; la ruta nueva, en `src/app/router/roles/`.

**Convenciones que se aplican a toda tarea de este archivo**:

- **Textos**: siempre desde `messages.roles` y `messages.titles` de `src/shared/messages/es.ts`, con los textos exactos de [contracts/roles-ui.md](contracts/roles-ui.md) §3; nunca literales en JSX. Código, archivos y commits en inglés; documentación en español.
- **Dirección de la tabla**: `type` ∈ {`sistema`, `clinica`} (ausente = Todos), `status` ∈ {`bloqueados`} (ausente = Activos), `page` `^[1-9]\d{0,14}$` (ausente = 1), `page_size` ∈ {`10`, `25`, `50`} (ausente = 10); en el código `'all' | 'system' | 'clinic'` y `'active' | 'blocked'` (data-model §2). `:roleId` `^[1-9]\d{0,9}$` (data-model §2).
- **Estado del historial** del detalle: `{ listSearch?: string }`, cadena ≤ 300 caracteres que empieza por `?` y cuyas claves son solo `type`, `status`, `page` y `page_size` (data-model §6).
- **Referencia**: la tabla y el detalle de Usuarios tras la feature 026 (`UsersGrid.tsx`, `UsersList.tsx`, `UsersListPage.tsx`, `useUsersLocation.ts`, `userDetailState.ts`, `UserDetailPage.tsx` y sus pruebas). Se copia su estructura, **no su código**: `features/roles` NO DEBE importar de `features/users` (constitución I).
- **No tocar** `src/features/users`, `src/features/modules`, `src/test/handlers/**` (los simuladores ya aceptan todo lo que hace falta, research D14) ni `specs/024-*`, `025-*`, `026-*`.
- **Pruebas en esta máquina**: `npm test -- <rutas> --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`. Para más de 10 roles en una prueba, añadir `directoryRole({ id, name, typeId })` (de `@/test/handlers/usersDirectory`) a `scenario.directory.roles` **antes** de arrancar los simuladores (la semilla tiene 9).
- **Pruebas de componentes con navegación**: `renderWithProviders` con una lista de rutas (la pantalla en su ruta y un marcador en la ruta de destino) y, para el historial, `router.state.location` y `router.state.historyAction` (`'PUSH'`/`'REPLACE'`); en `renderApp`, además, `trail`.
- **Tamaño**: ningún archivo de componente pasa de 250 líneas (constitución I); `RoleDetailPanel.tsx` tiene 246.

---

## Phase 1: Setup

- [X] T001 Confirmar la línea base: `npm ci` si falta `node_modules`, y `npm run typecheck` y `npm test -- src/features/roles src/app/router/roles src/app/layouts --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000` en verde antes de tocar nada (si falla `RoleDetailPanel` «a Clínica role can grant and save…», es la intermitencia conocida: corre sola y pasa); sin dependencias, variables de entorno ni cambios en `.env.example` (plan.md, Technical Context). Resultado (2026-11-03, en el worktree): `typecheck` en verde y 52 archivos / 410 pruebas en verde en 140 s.
- [X] T002 Decidir con la persona dónde se implementa (rama o worktree `027-roles-grid-list`, no `main`) y **no dejar `specs/027-roles-grid-list/` solo sin versionar en el checkout principal**: en las features 024, 025 y 026 esa copia suelta bloqueó la fusión. No se hace ningún commit sin que la persona lo pida. Hecho: la persona pidió un worktree; se creó `.claude/worktrees/027-roles-grid-list` en la rama `worktree-027-roles-grid-list` (desde `9587e75`) y el spec se copió allí; la copia sin versionar del checkout principal se retira al fusionar, o antes si la persona lo confirma.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: la lógica pura, el estado navegable nuevo, los textos y el desacople del panel, que usan todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar antes de esta fase.

- [X] T003 [P] Reescribir `src/features/roles/schemas/rolePermissionsLocation.test.ts` (test-first) para data-model §2, §3 y §7: (a) `parseRolePermissionsSearchParams`: sin parámetros → `{ type: 'all', status: 'active', page: 1, pageSize: 10 }`; `type=sistema|clinica` → `system|clinic`; `status=bloqueados` → `blocked`; `page` solo si cumple `^[1-9]\d{0,14}$`; `page_size` solo `10`, `25` o `50`; valores no válidos → omisión (`type=x`, `type=all`, `type=SISTEMA`, `status=blocked`, `page=0`, `page=007`, `page=1.5`, `page_size=7`, `page_size=100`); (b) `toRolePermissionsSearchParams` omite los valores por omisión, con orden `type`, `status`, `page`, `page_size`, y parsear + serializar da la forma canónica; (c) `locationSearch(location)` = `''` si todo es omisión y, si no, `?` + los parámetros; (d) `legacyRoleIdOf(params)`: `roleId=7` → `7`; `007`, `abc`, `0`, vacío y más de 10 dígitos → `null`; y `parseRoleId(value)` con la misma regla `^[1-9]\d{0,9}$` (`undefined` → `null`); (e) `rolesOfType` y `typeFilterOfRoleTypeId` (sin cambios); (f) `lastPageOf(total, pageSize)` = `max(1, ceil(total / pageSize))` (0 → 1, 10/10 → 1, 11/10 → 2), `pageOfRoles(roles, page, pageSize)` = `roles.slice((page - 1) * pageSize, page * pageSize)` (una página posterior a la última → `[]`) y `pageOfRole(roles, roleId, pageSize)` = `floor(índice / pageSize) + 1`, o `1` si el role no está; (g) `locationAfterCreate(location, role, activeRoles)`: `status: 'active'`; `type` se conserva si es `all` o el del role, si no pasa al del role; `pageSize` se conserva; `page` = `pageOfRole(rolesOfType(activeRoles, type), role.id, pageSize)` (1 si el role no está en `activeRoles`); (h) `emptyRolesMessage(type, status)` con las cuatro filas de data-model §3. Quitar las pruebas de `detailOf`.
- [X] T004 Reescribir `src/features/roles/schemas/rolePermissionsLocation.ts` (hace pasar T003): exportar `PAGE_SIZE_OPTIONS = [10, 25, 50] as const`, `DEFAULT_PAGE_SIZE = 10`, `PageSize`, `RolesTypeFilter`, `RolesStatusFilter`, `ROLE_TYPE_ID_OF_FILTER` (`system` → 1, `clinic` → 2), `RolePermissionsLocation { type, status, page, pageSize }` (sin `roleId`) y las funciones de T003, con Zod `catch` para los valores no válidos (`page` y `page_size` como en `src/features/users/schemas/usersLocation.ts`, sin importarlo); quitar `detailOf`, `RoleDetailView` y el `roleId` de la ubicación; los valores de la dirección de la 025 (`sistema`, `clinica`, `bloqueados`) siguen solo dentro de este archivo.
- [X] T005 [P] Crear `src/features/roles/hooks/useRolePermissionsLocation.test.tsx` (test-first; patrón de `src/features/users/hooks/useUsersLocation.test.tsx`, con `renderHook` y `createWrapper` de `@/test/renderWithProviders`): `location` y `search` salen de la dirección; `setType` y `setStatus` conservan el otro filtro y el tamaño y ponen `page` en 1 (FR-007); `setPage(3)` escribe `?page=3` y `setPage(2, { replace: true })` no añade entrada al historial; `setPageSize(25)` vuelve a la página 1 y un tamaño fuera de 10/25/50 se vuelve 10 (FR-008); una dirección con valores no válidos se reescribe con `replace` a su forma canónica (FR-018).
- [X] T006 Reescribir `src/features/roles/hooks/useRolePermissionsLocation.ts` (después de T004; hace pasar T005): devuelve `{ location, search, setType, setStatus, setPage, setPageSize }` según data-model §2; conserva la canonización con `replace`; quitar `setRoleId` y `selectCreated`.
- [X] T007 [P] Crear `src/features/roles/hooks/useVisibleRoles.test.tsx` (con `createRolesCatalogMock`, `createUsersDirectoryMock` y `rolesCatalogScenario`): `useVisibleRoles({ type: 'all', status: 'active' })` devuelve los roles activos de ambos tipos por nombre; `type: 'system'` solo los de Sistema; `status: 'blocked'` pide `status_id=2` (`roles.requests`) y devuelve solo los bloqueados (`users.setRoleStatus(id, 2)`); cambiar solo el tipo no repite la petición del estatus.
- [X] T008 Modificar `src/features/roles/hooks/useVisibleRoles.ts` (después de T004; hace pasar T007): recibe `{ type, status }` en lugar de leer la dirección y devuelve `{ query, roles }` (`roles` = `rolesOfType(query.data ?? [], type)`).
- [X] T009 [P] En `src/shared/messages/es.ts` **añadir** los textos de [contracts/roles-ui.md](contracts/roles-ui.md) §3 (lo que se retira va en T018): `titles.roleDetail` «Detalle del role»; en `roles.list`: `gridLabel` «Roles», `columns` (`name` «Nombre», `status` «Estatus», `type` «Tipo», `permissions` «Permisos»), `status` (`active` «Activo», `blocked` «Bloqueado»), `noValue` «—», `pageStatus(from, to, total)` «Mostrando {from} a {to} de {total} roles.», `loadError` (`title` «No se pudieron cargar los roles», `message` «Ocurrió un problema al consultar los roles. Puedes reintentar.») y `permissionsCount(n)` con «1 permiso» para 1 y «n permisos» para el resto; en `roles.detail`: `title` «Detalle del role», `backToList` «Volver al listado», `notFound` (`title` «Este role ya no existe», `message` «Puede que se haya eliminado o bloqueado desde otra sesión. Vuelve al listado para ver los roles que hay.») y `loadError` (`title` «No se pudo cargar el role», `message` «Ocurrió un problema al consultar el role. Puedes reintentar.»).
- [X] T010 [P] En `src/features/roles/components/RoleDetailPanel.tsx` quitar el uso de `useRolePermissionsLocation` (import y `setRoleId`) y añadir la prop opcional `onDeleted?: () => void` (lo que significa eliminar el role abierto lo decide la pantalla que lo muestra), que `useDeleteRoleAction` llama tras eliminar; el archivo debe quedar ≤ 250 líneas (hoy 246). En `src/features/roles/components/RoleDetailPanel.test.tsx`, la prueba «opens the confirmation naming the role, deletes it and clears the selection (FR-015)» pasa a comprobar que se llama a `onDeleted` y ya no la dirección (`router.state.location.search`).

**Checkpoint**: `npm run typecheck` muestra solo los errores de `RolesPage.tsx` y `RolesList.tsx`, que aún usan la ubicación antigua (se arreglan en US1).

---

## Phase 3: User Story 1 - Ver los roles en una tabla como la de Usuarios (Priority: P1) 🎯 MVP (junto con US2)

**Goal**: `/roles` muestra una tabla a todo lo ancho con las columnas Nombre, Estatus, Tipo y «n permisos», el pie «Filas por página» y los filtros de la 025 encima.

**Independent Test**: abrir `/roles` → título con «Nuevo role», «Todos» y «Activos» pulsados y la tabla con los roles activos de ambos tipos, sin lista ni panel; pasar de página, cambiar las filas por página y cada filtro; «Bloqueados» (quickstart V1–V10).

### Tests for User Story 1

- [X] T011 [P] [US1] Crear `src/features/roles/components/RolesGrid.test.tsx` (patrón de `src/features/users/components/UsersGrid.test.tsx`, con `renderWithProviders`): cuatro encabezados en orden «Nombre», «Estatus», «Tipo», «Permisos» y ninguno más (FR-002); por fila, el nombre como enlace con `href` `/roles/{id}`, «Activo» o «Bloqueado» según `status.id` (1/2), «Sistema» o «Clínica» según `type.id` y «n permisos» («1 permiso») tomado del `Map` de contadores, **«—»** si el role no está en el mapa (carga, falla o bloqueado) (FR-003); al pulsar el enlace, `router.state.location.state` es `{ listSearch }` con la prop recibida; el pie dice «Filas por página» y `1–7 de 7`, «Ir a la página siguiente» llama a `onPaginationChange(2, 10)`, las opciones son `10`, `25`, `50` y pedir 25 llama a `onPaginationChange(1, 25)` (FR-004); indica que carga (`loading`); vacío con el mensaje y la acción recibidos, y sin acción si no hay; sin ordenar ni menú de columna: pulsar un encabezado no cambia el orden (FR-005); sin columnas de descripción ni de fecha; axe sin violaciones.
- [X] T012 [P] [US1] Crear `src/features/roles/components/RolesTable.test.tsx` (con MSW, como `RolesPage.test.tsx`): con `type: 'all', status: 'active'` y los 9 roles de la semilla, una fila por role activo con sus «n permisos»; con 12 roles activos la página 1 tiene 10 filas (`1–10 de 12`) y la 2 tiene 2 (`11–12 de 12`), y con `pageSize` 25 hay una sola página; solo se piden los permisos de los roles de la página visible (filtrar `roles.requests` por `path` con la forma `/api/v1/roles/{id}/permissions`: 10, no 12; ninguno con Bloqueados) (research D4, SC-010); con `status: 'blocked'` las filas dicen «Bloqueado» y «—» en Permisos; cargando → indicador de carga de la rejilla; error de la lista → `ErrorState` con `list.loadError` y reintentar, que recupera la tabla (FR-009); vacío por caso con los cuatro textos de `emptyRolesMessage`, con la acción solo en «Activos» (US1-9).
- [X] T013 [P] [US1] Reescribir `src/features/roles/components/RolesPage.test.tsx` solo para la pantalla de la tabla (renderizar con una lista de rutas: `/roles` con `RolesPage` y `/roles/:roleId` con un marcador). Los `describe` de la 025 que no son de la tabla **se mueven, no se pierden**: cambios sin guardar → T041, bloquear y desbloquear → T034 y T035, accesibilidad → T047 y T048. Casos: título «Roles y permisos» y «Nuevo role» a su derecha con `canCreate` y ausente sin él; grupos «Tipo» y «Estatus» con «Todos» y «Activos» pulsados (FR-007); tabla con roles de ambos tipos y ya sin lista, panel ni «Elige un role…» (FR-001, US1-1); pulsar «Sistema» filtra y escribe `?type=sistema`; «Bloqueados» muestra los bloqueados («Bloqueado», «—») y escribe `?status=bloqueados`; cambiar un filtro estando en `?page=2` vuelve a la página 1 y conserva `page_size` (FR-007); «Nuevo role» disponible también con «Bloqueados» (FR-010); abrir y cancelar el diálogo de alta no crea nada; una dirección con valores no válidos se reescribe a su forma canónica.
- [X] T014 [P] [US1] Migrar la parte de la tabla de `src/app/router/roles/filterRoles.integration.test.tsx`: `listedNames()` lee los enlaces de la columna Nombre de `getByRole('grid', { name: text.list.gridLabel })` en vez de la lista; las seis combinaciones Tipo × Estatus de SC-001 dan exactamente los mismos nombres que hoy. Las pruebas de elegir un role bloqueado y de recargar con `roleId` se mueven a T025 (necesitan el detalle).

### Implementation for User Story 1

- [X] T015 [P] [US1] Crear `src/features/roles/components/RolesGrid.tsx` (hace pasar T011; mismo contrato que `UsersGrid.tsx`): props `roles`, `permissionCounts: ReadonlyMap<number, number>`, `total`, `page` (desde 1), `pageSize`, `loading`, `listSearch`, `emptyMessage`, `emptyAction?`, `onPaginationChange(page, pageSize)`. `DataGrid` con `aria-label={messages.roles.list.gridLabel}`, `paginationMode="server"`, `rowCount={total}`, `paginationModel={{ page: page - 1, pageSize }}`, `pageSizeOptions={PAGE_SIZE_OPTIONS}`, `disableColumnSorting`, `disableColumnFilter`, `disableColumnMenu`, `disableRowSelectionOnClick`, `autoHeight`, `sx={GRID_APPEARANCE_STYLES}` (el aspecto de Usuarios: FR-006, SC-004), `slots={{ noRowsOverlay }}` (con la ampliación de `src/shared/ui/dataGridAugmentation.d.ts`) y `slotProps.basePagination` con `GRID_PAGINATION_STYLES`. Columnas de research D10: Nombre (`flex: 1`, `minWidth: 200`, `RouterLink` a `/roles/${row.id}` con `state={{ listSearch }}`), Estatus (`minWidth: 130`, `list.status.active|blocked` según `status.id` 1/2), Tipo (`minWidth: 130`, `filters.type[typeFilterOfRoleTypeId(type.id)]`) y Permisos (`minWidth: 150`, `list.permissionsCount(n)` o `list.noValue`). Importar los estilos de `@/shared/ui/dataGridStyles` y las constantes de `../schemas/rolePermissionsLocation`.
- [X] T016 [US1] Crear `src/features/roles/components/RolesTable.tsx` (hace pasar T012; patrón de `UsersList.tsx`): props `type`, `status`, `page`, `pageSize`, `listSearch`, `emptyAction?`, `setPage`, `setPageSize` (los dos últimos con el tipo del hook); `useVisibleRoles({ type, status })`, `pageOfRoles(roles, page, pageSize)` y `useRolePermissionCounts(status === 'active' ? pageRoles.map((role) => role.id) : [])`; con la consulta en error y sin datos, `ErrorState` con `list.loadError` y reintentar; si no, `RolesGrid` con `total = roles.length`, `loading={query.isFetching}`, `emptyMessage={emptyRolesMessage(type, status)}`, `emptyAction` solo con `status === 'active'` y `onPaginationChange` que llama a `setPage(nextPage)` si el tamaño no cambió o a `setPageSize(nextPageSize)` si cambió. La corrección de una página inexistente es T044 y el anuncio es T049.
- [X] T017 [US1] Reescribir `src/features/roles/components/RolesPage.tsx` (hace pasar T013): pantalla de la tabla con `useFocusOnMount` en el `h1` `messages.roles.title`; fila de encabezado con «Nuevo role» a la derecha (`Stack` con `flexWrap` y `justifyContent: 'space-between'`, como `UsersListPage.tsx`) si `capabilities.canCreate` (botón `variant="contained"` con `Icon name="add"`); `RolesFilters` con `setType` y `setStatus` de `useRolePermissionsLocation`; `RolesTable` con `listSearch={search}` y el mismo botón como `emptyAction`; `RoleFormDialog` con `open={creating}`, cuyo `onCreated` por ahora solo cierra el diálogo (la navegación al role nuevo es T037) y `onCancel` que lo cierra. Quitar `useBlocker`, `ConfirmDialog`, `detailOf`, `lastShownAddress`, `focusTitleNext`, `RoleDetailPanel` y `BlockedRoleDetail`; reescribir el comentario del componente (ya no es maestro-detalle).
- [X] T018 [US1] Eliminar `src/features/roles/components/RolesList.tsx` y `RolesList.test.tsx`; en `src/shared/messages/es.ts` quitar `roles.list.label` y `roles.detail.emptySelection` (ya sin uso) y reescribir el comentario del bloque `roles` («pantalla maestro-detalle» → tabla y detalle en rutas propias); buscar con Grep que nada más importe `RolesList` ni use `list.label` o `emptySelection` fuera de las integraciones que migran T025 y T035. Hecho, salvo que `roles.detail.emptySelection` se mantiene hasta T035 (`deleteRole` y `blockRole` aún lo usan y `typecheck` debe seguir en verde): se quita allí.

**Checkpoint**: `npm run typecheck` en verde. Pasan `npm test -- src/features/roles/schemas src/features/roles/hooks src/features/roles/components/RolesGrid.test.tsx src/features/roles/components/RolesTable.test.tsx src/features/roles/components/RolesPage.test.tsx src/features/roles/components/RoleDetailPanel.test.tsx src/app/router/roles/filterRoles.integration.test.tsx`. Las integraciones `viewAndEditPermissions`, `createRole`, `duplicateRole`, `deleteRole` y `blockRole` abren un detalle y siguen pendientes de migrar (T025 y T035): no las ejecutes todavía. El quickstart V1–V10 se puede recorrer; pulsar un nombre lleva a una dirección sin pantalla hasta US2.

---

## Phase 4: User Story 2 - Abrir un role desde la tabla y volver a la misma lista (Priority: P1)

**Goal**: pulsar el nombre abre el detalle en su propia pantalla (`/roles/:roleId`) con «Volver al listado»; un role bloqueado y uno que no existe se tratan como dice el spec.

**Independent Test**: abrir `/roles/2` (activo), `/roles/{id de un bloqueado}`, `/roles/9999` y `/roles/abc`; pulsar un nombre en la tabla y volver con «Volver al listado» y con Atrás (quickstart V11–V16).

### Tests for User Story 2

- [X] T019 [P] [US2] Crear `src/features/roles/schemas/roleView.test.ts` (test-first): `resolveRoleView({ roleId, active, blocked, shownAsActive })` con cada fila de research D5: la lista de activos carga → `loading`; falla → `error`; el role está entre los activos → `{ kind: 'active', role }` (con `blocked` `undefined`); no está y `shownAsActive` → `notFound`; no está, no se mostró y la lista de bloqueados carga o aún no se pidió → `loading`; la de bloqueados falla → `error`; está en bloqueados → `{ kind: 'blocked', role }` con el role de esa lista; no está en ninguna → `notFound`.
- [X] T020 [P] [US2] Crear `src/features/roles/schemas/roleDetailState.test.ts` (test-first): `parseRoleDetailState` acepta `{ listSearch: '?type=sistema&page=2' }` y `{ listSearch: '?status=bloqueados&page_size=25' }`; descarta `listSearch` si no empieza por `?`, si tiene una clave que no es `type`, `status`, `page` ni `page_size` (`?foo=1`, `?type=sistema&x=1`), si supera los 300 caracteres o si no es una cadena (`123`, `null`, objetos); `listSearch: ''` equivale a ausente (volver a `/roles`); un estado que no es un objeto (`null`, `undefined`, `'x'`) da `{}`; nunca lanza.
- [X] T021 [P] [US2] Crear `src/features/roles/hooks/useRoleView.test.tsx` (con MSW y `createWrapper`): un role activo → `{ kind: 'active', role }` sin pedir la lista de bloqueados (`roles.requests` sin `status_id=2`); un role bloqueado → `loading` y luego `{ kind: 'blocked', role }` con ambas listas pedidas y ninguna petición a `/permissions`; un id que no existe → `notFound`; un role que se mostró activo y luego se bloquea desde fuera (`users.setRoleStatus(id, 2)` y refrescar `roleKeys.lists()`) → `notFound` y no `blocked`; la lista de activos en error → `error` y `retry()` la recupera; al cambiar `roleId` (duplicar) no se arrastra el «ya se mostró como activo» del role anterior.
- [X] T022 [P] [US2] Actualizar `src/features/roles/components/BlockedRoleDetail.test.tsx`: ya no hay `h2` con el nombre (lo es el `h1` de la pantalla); el resto (descripción, «Tipo: …», «Estatus: Bloqueado», la explicación, sin permisos ni acciones, «Desbloquear role» con `canEdit`, axe) sigue igual.
- [X] T023 [P] [US2] Crear `src/features/roles/components/RoleDetailPage.test.tsx` (`renderWithProviders` con las rutas `/roles/:roleId` y `/roles`, y `state` en la entrada inicial): `h1` «Detalle del role» mientras carga y con el nombre del role cuando se conoce (US2-1, FR-011); «Volver al listado» con `href` `/roles` sin estado y `/roles?type=sistema&page=2` con `state: { listSearch: '?type=sistema&page=2' }`, y un estado no válido → `/roles` (FR-013); vista activa: `RoleDetailPanel` con el campo «Nombre» (US2-2); sin `canEdit`, campos y botones de permisos deshabilitados y sin las acciones que no le tocan (US2-4); vista bloqueada: la explicación y «Desbloquear role» con `canEdit`, sin lista de permisos y sin petición a `/permissions` (US2-5, FR-012); `notFound`: `ErrorState` con `detail.notFound.title` y su acción «Volver al listado» a `/roles`, **sin** la barra de «Volver al listado» (un solo enlace con ese nombre) (US2-6, FR-014); error de las listas → `ErrorState` con `detail.loadError` y reintentar, que recupera el detalle.
- [X] T024 [P] [US2] Ampliar `src/app/layouts/useRouteAccessibility.roles.test.tsx`: la ruta `/roles/:roleId` con `handle: { titleKey: 'roleDetail', roleIdParam: 'roleId' }` titula la pestaña «Detalle del role — MailySoft Backoffice» con un id válido y «Página no encontrada» con `/roles/abc`, `/roles/007` y `/roles/0`; ir de `/roles` a `/roles/7` lleva el foco al `h1` y cambiar solo la query no.
- [X] T025 [P] [US2] Integración con `renderApp`: crear `src/app/router/roles/roleDetail.integration.test.tsx` (abrir `/roles/2`: detalle con el nombre como título y sin la tabla; `/roles/{id de un role bloqueado}` con `users.setRoleStatus`: explicación y «Desbloquear role», sin petición a `/permissions`; `/roles/9999`: «Este role ya no existe» con su enlace a `/roles`; `/roles/abc`: «Página no encontrada»; entrar por `/roles?type=sistema`, pulsar un nombre y «Volver al listado» regresa a `/roles?type=sistema`; Atrás con `window.history.back()` hace lo mismo (US2-3, SC-002)); migrar `src/app/router/roles/viewAndEditPermissions.integration.test.tsx` (elegir un role es pulsar su nombre en la tabla y esperar el detalle; `typeFilter` no cambia; SC-003: sus escenarios del detalle de la 023 y la 025 siguen dando el mismo resultado); y llevar aquí lo que T014 dejó pendiente de `filterRoles.integration.test.tsx` (un role bloqueado muestra su explicación sin error y sin petición a sus permisos, y el detalle sobrevive a una recarga con `/roles/{id}`). Hecho; además `/roles/007` y `/roles/0` dan «Página no encontrada», y la prueba «US1-2» de `viewAndEditPermissions` espera el contador «0 de 26 permisos» con `findByText` porque en su propia dirección el nombre se pinta antes que la lista de permisos (necesita también el catálogo). Esa migración quitó la prueba «FR-017 de la 014: avisa al salir de la sección desde el menú principal con cambios sin guardar», que vuelve en T042 (la guarda es T045).

### Implementation for User Story 2

- [X] T026 [P] [US2] Crear `src/features/roles/schemas/roleView.ts` (hace pasar T019) según data-model §5: `RoleView` = `loading` | `error` | `{ kind: 'active'; role: Role }` | `{ kind: 'blocked'; role: Role }` | `notFound`, y `resolveRoleView({ roleId, active, blocked, shownAsActive })`, con `active` y `blocked` como `{ status: 'pending' | 'error' } | { status: 'success'; roles: readonly Role[] }` (`blocked` `undefined` si no se ha pedido), siguiendo la tabla de research D5.
- [X] T027 [P] [US2] Crear `src/features/roles/schemas/roleDetailState.ts` (hace pasar T020) según data-model §6: `parseRoleDetailState(state: unknown): { listSearch?: string }` con Zod; `listSearch`: cadena ≤ 300 caracteres que empieza por `?` y cuyas claves son solo `type`, `status`, `page` y `page_size` (patrón de `src/features/users/schemas/userDetailState.ts`, sin importarlo); lo no válido se descarta y nunca lanza.
- [X] T028 [US2] Crear `src/features/roles/hooks/useRoleView.ts` (después de T026; hace pasar T021): `useRoleView(roleId): { view: RoleView; retry: () => void }` con `useRolesCatalog('active')` y `useRolesCatalog('blocked', { enabled })`, la segunda pedida solo cuando el role no está entre los activos, la lista de activos terminó y no se mostró ya como activo (añadir ese segundo parámetro opcional a `src/features/roles/hooks/useRolesCatalog.ts` sin cambiar sus usos actuales); «ya se mostró como activo» = `useState` del último `roleId` visto activo, ajustado durante el render (`if (activeRole !== undefined && lastActiveRoleId !== roleId) setLastActiveRoleId(roleId)`), nunca con un efecto; `retry` vuelve a pedir la(s) lista(s) que fallaron.
- [X] T029 [US2] En `src/features/roles/components/BlockedRoleDetail.tsx` quitar el `h2` con el nombre (hace pasar T022); la descripción, el tipo, el estatus, la explicación y «Desbloquear role» no cambian; actualizar el comentario del componente.
- [X] T030 [US2] Crear `src/features/roles/components/RoleDetailPage.tsx` (hace pasar T023): props `roleId` y `capabilities`; `useFocusOnMount` en el `h1` (el nombre del role cuando `view` es `active` o `blocked`, `detail.title` en los demás casos); `useLocation` + `parseRoleDetailState` → `listAddress = '/roles' + (listSearch ?? '')`; barra con «Volver al listado» (`Button component={RouterLink}` con `Icon name="arrow-back"`, primer hijo en todos los estados para que no cambie mientras carga, como `UserDetailPage.tsx`) salvo en `notFound`; contenido según `useRoleView(roleId)`: `loading` → `CircularProgress` con `aria-label={messages.common.loading}`, `error` → `ErrorState` (`detail.loadError`, `onRetry={retry}`), `active` → `RoleDetailPanel` (guardando `dirty` en `useState` con `onDirtyChange`; los destinos de las acciones son T038 y la guarda es T045), `blocked` → `BlockedRoleDetail` con `canUnblock={capabilities.canEdit}`, `notFound` → `ErrorState` con `detail.notFound` y `secondaryAction` «Volver al listado» a `/roles`.
- [X] T031 [US2] Registrar la ruta: crear `src/app/router/roles/RoleDetailRoute.tsx` (como `UserDetailRoute.tsx`: `useGrantedAccess()` antes de leer el parámetro; `parseRoleId(useParams().roleId)` → `NotFoundPage` si es `null`, y si no `<RoleDetailPage roleId={…} capabilities={getRoleCapabilities(access)} />`); en `src/app/router/routes.tsx` añadir bajo `/roles`, después del índice, `{ path: ':roleId', Component: RoleDetailRoute, handle: { titleKey: 'roleDetail', roleIdParam: 'roleId' }, ErrorBoundary: RouteErrorBoundary }`; en `src/app/layouts/useRouteAccessibility.ts` añadir `roleIdParam`, la clave `roleDetail` y que un id que no lo es (`parseRoleId` → `null`) titule como `notFound` (hace pasar T024); en `src/features/roles/index.ts` exportar `parseRoleId` y `RoleDetailPage` (con `lazy`, como `RolesPage`) (hace pasar T025).

**Checkpoint**: US1 y US2 juntas (MVP): se abre un role desde la tabla y se vuelve; quickstart V1–V16 con el simulador. Crear, duplicar, bloquear y eliminar todavía no navegan (US3).

---

## Phase 5: User Story 3 - Crear, duplicar, bloquear, desbloquear y eliminar en el nuevo recorrido (Priority: P2)

**Goal**: crear y duplicar llevan al detalle del role nuevo y la tabla a la que se vuelve lo muestra; bloquear, desbloquear y eliminar vuelven a la tabla con sus avisos y el foco en el título.

**Independent Test**: con «Bloqueados» y página 2, crear un role de Sistema; duplicarlo; bloquearlo y desbloquearlo; eliminar otro; provocar un fallo (quickstart V17–V22).

### Tests for User Story 3

- [X] T032 [P] [US3] Crear `src/features/roles/hooks/useRevealRole.test.tsx` (con `createWrapper` y la caché de `roleKeys.list('active')` sembrada con `queryClient.setQueryData`): `reveal(location, role)` da `{ location, search }` según data-model §7: con filtros «Bloqueados» y «Clínica» y un role de Sistema → `status: 'active'`, `type: 'system'` y `search` con `type=sistema`; con «Todos» el tipo se conserva; la página es donde está el role en la lista de su tipo (12 roles, el role número 11 → `page=2`); si la caché no tiene la lista o el role → página 1 (sin `page` en `search`).
- [X] T033 [P] [US3] Ampliar `src/features/roles/components/RolesPage.test.tsx` (crear): con «Bloqueados» y una página posterior a la primera, crear un role de Sistema cierra el diálogo y deja `router.state.location.pathname` en `/roles/{id}` con `state.listSearch` de la tabla que lo muestra; `await router.navigate(-1)` (Atrás) deja la tabla en esa misma dirección, con Estatus «Activos» y la página del role (FR-015, FR-017, SC-007, US3-2, US3-3); con «Todos» el tipo se conserva; cancelar no crea nada.
- [X] T034 [P] [US3] Ampliar `src/features/roles/components/RoleDetailPage.test.tsx` (acciones): «Duplicar» navega con `PUSH` a `/roles/{copiaId}` con `state.listSearch` de la tabla que muestra la copia y el foco queda en el campo «Nombre» (US3-4); «Bloquear role» confirmado → aviso `status.blocked(name)` y `REPLACE` a `/roles` + `listSearch`, con el foco en el `h1` de la tabla (US3-5, FR-016, SC-008); «Desbloquear role» igual con `status.unblocked(name)` (US3-6); «Eliminar role» confirmado vuelve a la tabla (US3-7); «ya estaba» (409) → aviso informativo y vuelta a la tabla; un fallo (500) → aviso de error y la persona se queda en el detalle (US3-8).
- [X] T035 [P] [US3] Migrar al nuevo recorrido las cuatro integraciones de `src/app/router/roles/` (entrar por la tabla, p. ej. `/roles?type=sistema`, y pulsar el nombre, para que viaje `listSearch`): `createRole.integration.test.tsx` (tras crear se abre el detalle del role nuevo —el nombre en su campo y «0 de 16 permisos»—; la prueba «US2-7» pasa a comprobar que el role aparece en la tabla al volver), `duplicateRole.integration.test.tsx` (tras duplicar, `router.state.location.pathname` es `/roles/10` y «Volver al listado» muestra la copia; ya no se comprueba `?roleId=10`), `deleteRole.integration.test.tsx` (tras eliminar se vuelve a `/roles` con los mismos filtros y «Billing» ya no está; ya no hay `roleId` ni `emptySelection`) y `blockRole.integration.test.tsx` (aviso, vuelta a `/roles?type=sistema`, foco en el `h1` «Roles y permisos»; desbloquear desde «Bloqueados» abriendo el role por su enlace; «ya estaba» y error 5xx). Al terminar, quitar `roles.detail.emptySelection` de `src/shared/messages/es.ts` (T018 lo dejó porque `deleteRole` y `blockRole` aún lo usaban). Hecho, y `emptySelection` ya no existe en `src/`. Las pruebas de `duplicateRole` comprueban además que el foco acaba en el campo «Nombre» de la copia (la ruta lo lleva primero al `h1` y el panel después al campo) y las de `blockRole` que acaba en el `h1` de la tabla.

### Implementation for User Story 3

- [X] T036 [US3] Crear `src/features/roles/hooks/useRevealRole.ts` (hace pasar T032): `useRevealRole()` con `useQueryClient()`; devuelve `(location: RolePermissionsLocation, role: { id: number; type: { id: 1 | 2 } }) => { location: RolePermissionsLocation; search: string }` que lee `queryClient.getQueryData<Role[]>(roleKeys.list('active')) ?? []` **en el momento de la llamada** (nunca al renderizar), aplica `locationAfterCreate` y `locationSearch` (research D7).
- [X] T037 [US3] En `src/features/roles/components/RolesPage.tsx` (hace pasar T033): `onCreated(role)` cierra el diálogo, calcula `reveal(location, role)` y, si `next.search` no es la dirección actual, hace `await navigate('/roles' + next.search, { replace: true })`; luego `navigate('/roles/' + role.id, { state: { listSearch: next.search } })`. Esperar el reemplazo evita que dos navegaciones seguidas se interrumpan en el enrutador de datos; llamarlo con `void` desde el manejador.
- [X] T038 [US3] En `src/features/roles/components/RoleDetailPage.tsx` (hace pasar T034 y T035): `onDuplicated(copy)` → `reveal(parseRolePermissionsSearchParams(new URLSearchParams(listSearch ?? '')), copy)` y `navigate('/roles/' + copy.id, { state: { listSearch: next.search } })` (push); `onBlocked`, `onUnblocked` (la prop de `BlockedRoleDetail`) y `onDeleted` → `navigate(listAddress, { replace: true })`. El foco al título lo mueve `useRouteAccessibility` al cambiar el `pathname`: no añadir ningún efecto de foco (research D8). Si el archivo pasa de 250 líneas, extraer un `RoleDetailBody` a su propio archivo. Hecho (el archivo queda en ~130 líneas), con una diferencia: la salida a la tabla navega con `{ replace: true, flushSync: true }`. Al bloquear o eliminar, las listas ya se refrescaron sin el role cuando se llama a `onBlocked`/`onDeleted`, y sin `flushSync` React pintaba «Este role ya no existe» un instante antes de que el enrutador confirmara la tabla (la transición del enrutador llega después de la actualización de la caché); la prueba de `RoleDetailPage` «Eliminar role» lo vigila.

**Checkpoint**: US1–US3 funcionan juntas; quickstart V17–V22.

---

## Phase 6: User Story 4 - Que filtros, página, enlaces antiguos y cambios sin guardar sean coherentes (Priority: P2)

**Goal**: la dirección guarda filtros, página y tamaño; los enlaces antiguos con `roleId` abren el detalle; una página inexistente se corrige; salir del detalle con cambios sin guardar pide confirmación.

**Independent Test**: quickstart V23–V25.

### Tests for User Story 4

- [X] T039 [P] [US4] Ampliar `src/features/roles/components/RolesPage.test.tsx` (enlaces antiguos): `/roles?roleId=7` redirige con `REPLACE` a `/roles/7` sin `listSearch`; `/roles?type=clinica&status=bloqueados&roleId=8` → `/roles/8` con `listSearch` `?type=clinica&status=bloqueados`; `/roles?roleId=007` y `?roleId=abc` se ignoran: se abre la tabla con la dirección canónica y sin error; `?type=clinica` y `?status=bloqueados` siguen abriendo la tabla filtrada sin redirigir (FR-019, US4-4, US4-5).
- [X] T040 [P] [US4] Ampliar `src/features/roles/components/RolesTable.test.tsx` (página inexistente): con 12 roles, `page=9` se corrige a la última página (2) con `replace` (el historial no gana una entrada) y no antes de que carguen los datos; con `page=2` y un role que sale de la lista (bloqueado desde fuera) la página se corrige a la última que exista; sin roles, `page=3` pasa a la 1 (FR-018, US4-3).
- [X] T041 [P] [US4] Ampliar `src/features/roles/components/RoleDetailPage.test.tsx` (guarda): con cambios sin guardar (editar el nombre o pulsar un botón de permiso), «Volver al listado» abre «Tienes cambios sin guardar» con «Quedarme» y «Descartar y continuar»; «Quedarme» conserva la edición y el role abierto; «Descartar y continuar» sale; lo mismo con Atrás (`router.navigate(-1)`) y con el menú de secciones; sin cambios no pregunta; con el role bloqueado no hay guarda; tras eliminar con cambios pendientes no pregunta; «Bloquear role» sigue deshabilitado con cambios (FR-020, SC-006, US4-6).
- [X] T042 [P] [US4] Crear `src/app/router/roles/rolesTable.integration.test.tsx` (`renderApp`; patrón de `src/app/router/users/usersList.integration.test.tsx`, con 12 roles activos añadidos a la semilla): conserva filtros, página y tamaño tras ver un detalle y volver, y tras recargar (US4-1, SC-002); cambiar de filtro estando en la página 2 vuelve a la 1 y conserva `page_size` (US4-2); `?type=xyz&status=otro&page=0&page_size=7` se reescribe a `/roles` (US4-1); `?page=99` se corrige a la última página (US4-3); los enlaces antiguos de T039 abren lo que mostraban (US4-4, US4-5, SC-005); `page_size=25` muestra todos en una página; y, desde el detalle de un role con cambios sin guardar, salir de la sección con el menú principal pregunta antes («Tienes cambios sin guardar»: «Quedarme» conserva la edición, «Descartar y continuar» sale), el caso FR-017 de la 014 que T025 quitó de `viewAndEditPermissions.integration.test.tsx`.

### Implementation for User Story 4

- [X] T043 [US4] En `src/features/roles/components/RolesPage.tsx` (hace pasar T039 y parte de T042): convertir `RolesPage` en una envoltura fina (research D3) que lee `legacyRoleIdOf(searchParams)` con `useSearchParams` **antes** de montar la pantalla de la tabla (que pasa a un componente interno `RolesScreen`, en el mismo archivo si queda ≤ 250 líneas); si es un número, devuelve `<Navigate replace to={'/roles/' + id} />` con `state={{ listSearch }}` solo si `listSearch` no está vacío, donde `listSearch = locationSearch({ ...parseRolePermissionsSearchParams(searchParams), page: 1, pageSize: DEFAULT_PAGE_SIZE })` (solo `type` y `status` de esa dirección); si es `null`, monta `RolesScreen`, cuya canonización quita un `roleId` no válido.
- [X] T044 [US4] En `src/features/roles/components/RolesTable.tsx` (hace pasar T040): página posterior a la última (`datos cargados && page > lastPageOf(total, pageSize)`) → `useEffect` que llama a `setPage(lastPage, { replace: true })` (sincroniza con la dirección, un sistema externo; mismo patrón que `UsersList.tsx`), y mientras tanto la rejilla se pinta en la última página. Hecho con `query.isSuccess && !query.isFetching && page > lastPage`: además de esperar a los datos, no juzga mientras se refrescan, para no corregir con una lista vieja que el refresco va a cambiar.
- [X] T045 [US4] En `src/features/roles/components/RoleDetailPage.tsx` (hace pasar T041): guarda según research D9: `useBlocker(() => dirty && view.kind === 'active' && !leavingAfterDelete.current)` con `leavingAfterDelete = useRef(false)`, activada en el manejador de `onDeleted` justo antes de navegar (la ref se lee al navegar, no al renderizar); `ConfirmDialog` con `detail.unsavedChangesTitle`, `unsavedChangesBody`, `unsavedChangesDiscard` y `unsavedChangesStay` (textos de contracts/roles-ui.md §2.5): `open={blocker.state === 'blocked'}`, `onConfirm` → `blocker.proceed()` y `onCancel` → `blocker.reset()`. Si el archivo pasa de 250 líneas, extraer el `RoleDetailBody` de T038.

**Checkpoint**: US1–US4 funcionan juntas; quickstart V23–V25.

---

## Phase 7: User Story 5 - Usar la tabla con teclado, lector de pantalla y en pantallas angostas (Priority: P3)

**Goal**: la tabla y el detalle se operan con teclado y lector de pantalla, y se reacomodan hasta 320 px sin scroll horizontal de la página.

**Independent Test**: quickstart V26 y V27.

### Tests for User Story 5

- [X] T046 [P] [US5] Ampliar `src/features/roles/components/RolesTable.test.tsx` (anuncios, FR-021): cambiar de página, de tamaño o de filtro anuncia en `role="status"` «Mostrando 1 a 10 de 12 roles.» o «Mostrando 11 a 12 de 12 roles.»; con cero roles anuncia el texto del vacío; mientras carga o corrige la página no anuncia nada; el foco no se mueve (el control usado lo conserva, WCAG 2.4.3).
- [X] T047 [P] [US5] Ampliar `src/features/roles/components/RolesPage.test.tsx`: Tab llega a los grupos de filtros, a «Nuevo role», al primer nombre y a los controles del pie, y Enter en un nombre navega a `/roles/{id}` (US5-1, FR-022, SC-009); la rejilla tiene el nombre accesible `list.gridLabel` y cada fila se lee con sus celdas (US5-2); axe sin violaciones con la tabla, con «Bloqueados» y con el vacío.
- [X] T048 [P] [US5] Ampliar `src/features/roles/components/RoleDetailPage.test.tsx`: al montar, el foco va al `h1`; axe sin violaciones con un role activo, con uno bloqueado y con el aviso de cambios sin guardar abierto (US5-4, FR-022, SC-009).

### Implementation for User Story 5

- [X] T049 [US5] En `src/features/roles/components/RolesTable.tsx` (hace pasar T046): añadir `LiveStatus` (`@/shared/ui/LiveStatus`) con una función `announcement()` como la de `UsersList.tsx`: `list.pageStatus(firstShown, firstShown + rows.length - 1, total)`, el texto del vacío si no hay roles y `''` mientras carga o corrige la página.
- [X] T050 [US5] Responsive (US5-5, FR-023): comprobar en `RolesPage.tsx` y `RolesGrid.tsx` que el encabezado (`flexWrap`), los filtros y el pie (`GRID_PAGINATION_STYLES`) se reacomodan sin scroll horizontal a 320 px, sin añadir estilos que Usuarios no tenga; añadir el caso de Roles a `e2e/responsive.spec.ts` (con `A1`: `/roles` y el detalle de un role, con `expectNoHorizontalScroll`, en los dos tamaños), copiando el de la lista de usuarios.
- [X] T051 [US5] Migrar `e2e/roles.spec.ts` (se omite sin cuentas `A1`, como hoy): elegir un role es pulsar su nombre en la tabla (`page.getByRole('link', { name })`) y esperar `/roles/{id}`; «W3 to W7» abre «Developer» desde la tabla con el filtro «Sistema»; «W8, W9» comprueba que tras crear se abre el detalle (campo «Nombre» y «16 de 16 permisos»); «025» bloquea y desbloquea comprobando el regreso a la tabla y el aviso; «W12, W13» duplica (campo «Nombre» con foco) y elimina desde el detalle, volviendo cada vez a la tabla. No se puede ejecutar aquí sin cuentas.

**Checkpoint**: las cinco historias funcionan juntas; quickstart V26 y V27.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T052 Enmienda MINOR de la constitución a 1.8.0 en `.specify/memory/constitution.md` (research D13): en el Principio VI sustituir la frase de la variante de Roles por el texto de D13 («…una variante: su listado es una tabla paginada en pantalla… su detalle es una ruta propia… su alta es un diálogo…») y poner `**Version**: 1.8.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-11-03`. La aprueba el responsable del proyecto con el PR; si no la aprueba, pasar la paginación en pantalla (IV) y el patrón de Roles (VI) a Complexity Tracking de plan.md. Hecho en el árbol de trabajo, sin confirmar: queda pendiente la aprobación de la persona responsable.
- [X] T053 Buscar con Grep restos del maestro-detalle en `src/` y `e2e/`: `RolesList`, `detailOf`, `RoleDetailView`, `selectCreated`, `setRoleId`, `focusTitleNext`, `lastShownAddress`, `emptySelection`, `list.label` y `roleId=` en direcciones de pruebas (solo debe quedar como enlace antiguo en las pruebas de T039 y T042), y comentarios que digan «maestro-detalle» o «lista a la izquierda» en `src/features/roles` y `src/shared/messages/es.ts`. Hecho: no queda ninguno; `roleId=` solo está en las pruebas de enlaces antiguos (`RolesPage.test.tsx`, `rolesTable.integration.test.tsx`, `rolePermissionsLocation.test.ts`, `roleDetailState.test.ts`, `useRolePermissionsLocation.test.tsx`), y el `setRoleId` de `RoleDetailPanel.test.tsx` se renombró porque era estado local de la prueba.
- [X] T054 Puertas de calidad: `npm run typecheck`, `npm run lint` (0 avisos), `npm run format:check`, `npm test -- src/features/roles src/app/router/roles src/app/layouts --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000` (quickstart §1), `npm run build` y `npm run size` (≤ 320 KB gzip en la ruta de entrada; las dos pantallas de Roles son diferidas); cobertura ≥ 80 % de `schemas` y `hooks` de `src/features/roles`; verificar que ningún archivo de componente pasa de 250 líneas (`RoleDetailPanel.tsx` incluido). Las pruebas existentes de lo que esta feature no cambia (creación de roles, lista de permisos con botones, bloquear, desbloquear y eliminar: FR-024, SC-003) siguen en verde sin más cambios que los de estas tareas. Hecho el 2026-11-03: `typecheck`, `lint` (0 avisos) y `format:check` en verde; `npm test -- src/features/roles src/app/router/roles src/app/layouts` 62 archivos y 621 pruebas, y la suite completa 417 archivos y 5066 pruebas, todas en verde; `build` correcto (los trozos de `RolesPage` y `RoleDetailPage` son diferidos: 5,2 y 7,4 KB gzip) y `size` 309,2 KB frente al límite de 320 KB; cobertura de `src/features/roles`: `schemas` 100 % y `hooks` 95,8 % de líneas; el archivo de componente más largo es `RoleDetailPanel.tsx` con 247 líneas. Dos ajustes que salieron de aquí: las pruebas buscan el texto de vacío dentro de la rejilla (el mismo texto se anuncia en la región `status`) y la salida del detalle navega con `flushSync` (ver T038).
- [X] T055 Verificar que los contratos ([contracts/app-routes.md](contracts/app-routes.md), [contracts/roles-ui.md](contracts/roles-ui.md)) y [data-model.md](data-model.md) coinciden con lo implementado (direcciones, nombres accesibles, textos de `es.ts`, qué navegación usa `replace` o `push`, la forma de `RoleView`) y corregir el contrato si algo difirió. Hecho: se corrigieron tres puntos (el redireccionamiento de un enlace antiguo sin filtros va sin `state`; crear solo reemplaza la entrada si la tabla cambia; la corrección de página espera a que los datos no se estén refrescando) y se añadieron la nota de `flushSync` y la del texto de vacío duplicado en la región de anuncios.
- [ ] T056 Recorrido manual del [quickstart.md](quickstart.md) §2 (V1–V28) contra la API real con una persona (requiere sesión de Auth0; no automatizable aquí), incluido V28: en la pestaña Red, solo las peticiones de permisos de la página visible. V3 es la revisión visual lado a lado con Usuarios, en tema claro y oscuro (FR-006, SC-004).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias. T004 depende de T003; T006 de T004 y T005; T008 de T004 y T007. T009 y T010 son independientes.
- **US1 (Phase 3)**: depende de Foundational. Con US2 forma el MVP.
- **US2 (Phase 4)**: depende de Foundational; sus pruebas de integración (T025) necesitan la tabla de US1.
- **US3 (Phase 5)**: depende de US1 (`RolesPage.tsx`) y US2 (`RoleDetailPage.tsx`).
- **US4 (Phase 6)**: depende de US3 (mismos `RolesPage.tsx`, `RolesTable.tsx` y `RoleDetailPage.tsx`); su lógica pura ya está en Foundational.
- **US5 (Phase 7)**: depende de US4 (mismos archivos).
- **Polish (Phase 8)**: al final; T052 (la enmienda) debe estar aprobada antes de fusionar.

### Within Each User Story

- Las pruebas se escriben **antes** y deben fallar antes de implementar.
- Esquemas y funciones puras → hooks → componentes → ruta y navegación.
- T016 depende de T015; T017 de T016; T030 de T026 a T029; T031 de T030; T037 y T038 dependen de T036 y de T031 (tocan archivos distintos).

### Parallel Opportunities

- Foundational: T003, T005, T007, T009 y T010 en paralelo (archivos distintos); luego T004, T006 y T008 en ese orden.
- US1: T011, T012, T013 y T014 (pruebas) en paralelo; T015 en paralelo con las pruebas ya escritas.
- US2: T019 a T025 (pruebas) en paralelo; T026 y T027 en paralelo.
- US3: T032, T033, T034 y T035 (pruebas) en paralelo.
- US4: T039, T040, T041 y T042 (pruebas) en paralelo.
- US5: T046, T047 y T048 (pruebas) en paralelo.

### Parallel Example: User Story 2

```text
T019 roleView.test.ts
T020 roleDetailState.test.ts
T021 useRoleView.test.tsx
T022 BlockedRoleDetail.test.tsx
T023 RoleDetailPage.test.tsx
T024 useRouteAccessibility.roles.test.tsx
T025 roleDetail.integration.test.tsx (+ viewAndEditPermissions, filterRoles)
```

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Setup + Foundational.
2. US1: la tabla (V1–V10).
3. US2: el detalle y la ruta (V11–V16).
4. **Parar y validar**: abrir un role desde la tabla, editarlo, volver con «Volver al listado» y con Atrás.

### Incremental Delivery

1. + US3: crear, duplicar, bloquear, desbloquear y eliminar en el nuevo recorrido (V17–V22).
2. + US4: dirección, enlaces antiguos, página inexistente y guarda de cambios sin guardar (V23–V25).
3. + US5: anuncios, teclado, lector de pantalla y 320 px (V26, V27).
4. Polish: enmienda de la constitución, restos, puertas de calidad, contratos y recorrido manual.

## Notes

- **Ventanas en rojo, a propósito**: tras Foundational, `typecheck` solo falla en `RolesPage.tsx` y `RolesList.tsx` (US1 lo arregla). Tras US1, las cinco integraciones que abren un detalle siguen sin migrar hasta T025 y T035: ejecuta solo los archivos que indica cada tarea hasta entonces.
- **Referencia visual**: la tabla de Usuarios de ahora (feature 026) ya tiene filtros y una columna de tipo. Roles copia su aspecto y su mecánica (rejilla en modo «servidor», pie, estilos), no sus columnas: las de Roles son las del spec (aclaración 1).
- **`RoleDetailPanel.tsx`** tiene 246 líneas y solo debe perder el hook de la dirección y ganar `onDeleted` (T010); `RoleDetailPage.tsx` y `RolesPage.tsx` se vigilan en T038, T043 y T045.
- **Archivos compartidos con otro trabajo** (posible conflicto al fusionar): `src/shared/messages/es.ts` (el bloque `roles` es de esta feature) y `.specify/memory/constitution.md`.
- Ningún simulador de `src/test/handlers` cambia; las pruebas con más de 10 roles los añaden a la semilla en el propio archivo de prueba.
- **Supuesto del spec aún sin confirmar**: el pie «Filas por página» como el de Usuarios (aunque la API de roles no pagina). Si la persona decidiera quitarlo, cambian T011, T012, T015 y T016, y la enmienda T052 no necesita la excepción de paginación.
