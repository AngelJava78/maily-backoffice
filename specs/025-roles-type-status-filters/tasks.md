---

description: "Task list for feature 025 — lista de roles con filtros de Tipo y Estatus, y bloqueo de roles"
---

# Tasks: Lista de roles con filtros de Tipo y Estatus, y bloqueo de roles

**Input**: Design documents from `/specs/025-roles-type-status-filters/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/roles-status-service.md](contracts/roles-status-service.md), [contracts/roles-list-ui.md](contracts/roles-list-ui.md), [quickstart.md](quickstart.md)

**Tests**: la constitución (VII) exige las pruebas en el mismo PR, test-first en la lógica pura (esquemas, mapeadores) y cobertura ≥ 80 % en `api`/`schemas`/`hooks`. Las tareas de prueba están incluidas y van **antes** de la implementación de su historia.

**Organization**: por historia de usuario, en el orden de prioridad del spec (US1 P1, US2 P1, US3 P2, US4 P2, US5 P3). US1 a US4 tocan `RolesPage.tsx` y `RolesList.tsx`, así que **se implementan en orden**; dentro de una fase, `[P]` marca archivos distintos sin dependencias pendientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1 … US5)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz (`src/`, `e2e/`). La feature vive en `src/features/roles/`; el simulador en `src/test/handlers/`.

**Convenciones que se aplican a toda tarea de este archivo**:

- **Textos**: siempre desde `messages.roles` de `src/shared/messages/es.ts`, con los textos exactos de [contracts/roles-list-ui.md](contracts/roles-list-ui.md); nunca literales en JSX. Código, archivos y commits en inglés; documentación en español.
- **Dirección**: `type` ∈ {`sistema`, `clinica`} (ausente = Todos), `status` ∈ {`bloqueados`} (ausente = Activos), `roleId` `^[1-9]\d{0,9}$`; en el código `'all' | 'system' | 'clinic'` y `'active' | 'blocked'` (data-model §2).
- **No tocar** `features/modules`, `src/test/handlers/modulesCatalog`, `src/test/factories.ts` ni `specs/024-*` (la feature 024 se implementa en paralelo).
- **Pruebas en esta máquina**: `npm test -- <rutas> --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`.

---

## Phase 1: Setup

- [X] T001 Confirmar la línea base: `npm ci` si falta `node_modules`, y `npm run typecheck` y `npm test -- src/features/roles src/app/router/roles` en verde antes de tocar nada; sin dependencias, variables de entorno ni cambios en `.env.example` (plan.md, Technical Context).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el estado navegable nuevo, las listas por estatus, el simulador y los textos que usan todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar antes de esta fase.

- [X] T002 [P] Reescribir `src/features/roles/schemas/rolePermissionsLocation.test.ts` (test-first) para el modelo de data-model §2–§4: `parseRolePermissionsSearchParams` (sin parámetros → `{ type: 'all', status: 'active', roleId: null }`; `type=sistema|clinica` → `system|clinic`; `status=bloqueados` → `blocked`; valores no válidos → omisión; `roleId` sin ceros a la izquierda), `toRolePermissionsSearchParams` (omite los valores por omisión, orden `type`, `status`, `roleId`; ida y vuelta canónica), `rolesOfType`, `typeFilterOfRoleTypeId`, `locationAfterCreate` (FR-010: Estatus → Activos; Tipo se conserva si es `all` o el del role, si no pasa al del role) y `detailOf` con cada fila de la tabla de data-model §4.
- [X] T003 Reescribir `src/features/roles/schemas/rolePermissionsLocation.ts` (hace pasar T002): tipos `RolesTypeFilter`, `RolesStatusFilter`, `RolePermissionsLocation { type, status, roleId }` y `RoleDetailView`; `ROLE_TYPE_ID_OF_FILTER` (`system` → 1, `clinic` → 2); funciones de T002, con Zod `catch` para los valores no válidos. Quitar `ROLE_TYPE_TABS`, `DEFAULT_ROLE_TYPE_TAB`, `ROLE_TYPE_ID_OF_TAB` y `tabOfRoleTypeId`.
- [X] T004 [P] En `src/features/roles/hooks/roleKeys.ts` añadir `list: (status: RolesStatusFilter) => [...roleKeys.lists(), status]` y su caso en `src/features/roles/hooks/roleKeys.test.ts`.
- [X] T005 [P] En `src/features/roles/api/rolesApi.ts`, `listRoles(client, { statusId, signal })`: sin `statusId` (o con 1) la petición no lleva parámetros; con 2 lleva `status_id=2` (contracts/roles-status-service.md §1). Casos en `src/features/roles/api/rolesApi.test.ts` con MSW (sin mockear `fetch`).
- [X] T006 `useRolesCatalog(status: RolesStatusFilter = 'active')` en `src/features/roles/hooks/useRolesCatalog.ts` con `roleKeys.list(status)` y `statusId` 2 para `blocked`; en `useCreateRole.ts`, `useDeleteRole.ts` y `useSaveRoleDetail.ts` (misma carpeta) invalidar `roleKeys.lists()` **sin** `exact` para refrescar ambas listas (research D3).
- [X] T007 [P] Simulador (research D10): en `src/test/handlers/usersDirectory/model.ts`, `listRolesWithStatus(statusId)` (roles con ese estatus, por nombre); en `src/test/handlers/usersDirectory/catalog.ts`, `GET /roles` lee `status_id` (ausente → 1; `1`/`2`; cualquier otro valor → 422 `validation_error` con `issue('status_id')`). Casos en `src/test/handlers/usersDirectory/model.test.ts` y `reads.test.ts` (o el archivo de pruebas del catálogo que ya exista).
- [X] T008 [P] En `src/shared/messages/es.ts`, bloque `roles`: quitar `tabs`; añadir `filters` (`typeLabel` «Tipo», `type.all/system/clinic` «Todos»/«Sistema»/«Clínica», `statusLabel` «Estatus», `status.active/blocked` «Activos»/«Bloqueados») y en `list` `label` «Lista de roles», `emptyAll` y `emptyBlocked` (textos de contracts/roles-list-ui.md §3). Actualizar el comentario del bloque (sin «pestañas»). Sustituir `messages.roles.tabs.sistema|clinica` por `messages.roles.filters.type.system|clinic` en `src/features/roles/components/RoleFormDialog.test.tsx`, `src/app/router/roles/createRole.integration.test.tsx` y `e2e/roles.spec.ts` (solo las opciones del tipo en el alta).
- [X] T009 Reescribir `src/features/roles/hooks/useRolePermissionsLocation.ts` (después de T003): devuelve `location`, `setType` y `setStatus` (ambos quitan `roleId`, conservan el otro filtro), `setRoleId` y `selectCreated(role)` (usa `locationAfterCreate`); conserva la canonización con `replace`. Quitar `selectInType`.

**Checkpoint**: `npm run typecheck` muestra solo los errores de los componentes que aún usan las pestañas (se arreglan en US1).

---

## Phase 3: User Story 1 - Filtrar los roles por Tipo con botones (Priority: P1) 🎯 MVP

**Goal**: los botones «Tipo» sustituyen a las pestañas; «Todos» por omisión; cada elemento dice su tipo.

**Independent Test**: abrir `/roles` → «Todos» y «Activos» pulsados, roles de ambos tipos, ninguna pestaña; «Sistema» y «Clínica» filtran (quickstart V1–V3).

### Tests for User Story 1

- [X] T010 [P] [US1] Crear `src/features/roles/components/RolesFilters.test.tsx`: dos grupos con nombre accesible «Tipo» y «Estatus», botones en orden, `aria-pressed` del valor recibido, `onTypeChange`/`onStatusChange` al pulsar otro botón y **ninguna** llamada al pulsar el ya pulsado (FR-003).
- [X] T011 [P] [US1] Migrar `src/features/roles/components/RolesList.test.tsx`: con `/roles` lista roles de ambos tipos y cada elemento muestra «Sistema» o «Clínica»; `?type=sistema` solo los de Sistema con su contador; vacíos `emptyAll`, `emptySistema`, `emptyClinica`; «Nuevo role» con y sin permiso.
- [X] T012 [P] [US1] Migrar `src/features/roles/components/RolesPage.test.tsx`: grupos «Tipo»/«Estatus» con «Todos»/«Activos» pulsados y ninguna pestaña; pulsar «Sistema» filtra y escribe `?type=sistema`; el aviso de cambios sin guardar al cambiar el filtro Tipo (antes, la pestaña); la prueba de teclado llega al grupo Tipo en vez de a la pestaña.

### Implementation for User Story 1

- [X] T013 [P] [US1] Crear `src/features/roles/components/RolesFilters.tsx` (hace pasar T010) con la misma estructura y props de MUI que `ModulesFilters` sin el buscador (research D8): `Stack` con `flexWrap`, etiqueta `body2`/`text.secondary` encima, `ToggleButtonGroup` `exclusive` `size="small"` con `aria-label`, e ignorar el `null` de MUI.
- [X] T014 [US1] Crear `src/features/roles/hooks/useVisibleRoles.ts`: lee `location` y `useRolesCatalog(location.status)` y devuelve `{ query, roles: rolesOfType(query.data ?? [], location.type) }`.
- [X] T015 [US1] Reescribir `src/features/roles/components/RolesList.tsx` (hace pasar T011): usa `useVisibleRoles`; `List` con `aria-label` `list.label`; texto secundario `tipo · descripción · n permisos` (data-model §3, contrato §3); vacío según la tabla del contrato.
- [X] T016 [US1] Modificar `src/features/roles/components/RolesPage.tsx` (hace pasar T012): `RolesFilters` en lugar de `RoleTypeTabs`, con `setType`/`setStatus`; el detalle según `detailOf` con `lastShownRoleId` ajustado en render (research D4); `selectRole` → `selectCreated`. Actualizar el comentario del componente (sin «pestañas»).
- [X] T017 [US1] Eliminar `src/features/roles/components/RoleTypeTabs.tsx` y `RoleTypeTabs.test.tsx`; buscar con Grep que nada más los importe.
- [X] T018 [US1] Migrar `src/app/router/roles/viewAndEditPermissions.integration.test.tsx`: las pestañas pasan a los botones del grupo «Tipo» (`getByRole('button', { name: 'Sistema', pressed })` dentro del grupo «Tipo»); `/roles` abre en Todos.

**Checkpoint**: US1 funciona y se prueba sola; `npm run typecheck` en verde.

---

## Phase 4: User Story 2 - Filtrar por Estatus y ver los bloqueados (Priority: P1)

**Goal**: «Bloqueados» lista los roles bloqueados (sin contador) y su detalle explica por qué no hay permisos.

**Independent Test**: con un role bloqueado, «Bloqueados» lo muestra solo a él; su detalle no tiene permisos ni acciones y no hay petición a sus permisos (quickstart V6, V7).

### Tests for User Story 2

- [X] T019 [P] [US2] Crear `src/features/roles/components/BlockedRoleDetail.test.tsx`: nombre (`h2`), descripción, «Tipo: …», «Estatus: Bloqueado», la explicación (`blocked.explanation`); sin «Guardar cambios», «Duplicar», «Eliminar role» ni lista de permisos; sin descripción no pinta una línea vacía; axe sin violaciones.
- [X] T020 [P] [US2] En `src/features/roles/components/RolesList.test.tsx`: con `?status=bloqueados` solo los bloqueados (bloquear con `users.setRoleStatus(id, 2)`), sin «n permisos» y sin ninguna petición a `/permissions` (`roles.requests`); vacío `emptyBlocked`; error de la lista con reintento.
- [X] T021 [P] [US2] Crear `src/app/router/roles/filterRoles.integration.test.tsx` (con `renderApp` o el patrón de las otras integraciones de la carpeta): combinaciones Tipo × Estatus (FR-005, SC-001), elegir un role bloqueado muestra su detalle sin error (US2-4) y ninguna petición `GET /roles/{id}/permissions` para él (FR-012).

### Implementation for User Story 2

- [X] T022 [US2] En `src/shared/messages/es.ts`, bloque `roles.blocked` (`statusLabel`, `statusValue`, `explanation`; contrato §5).
- [X] T023 [US2] Crear `src/features/roles/components/BlockedRoleDetail.tsx` (hace pasar T019): `Paper` con el `h2`, los datos y un `Alert severity="info"` con la explicación; sin consultas (research D5).
- [X] T024 [US2] En `src/features/roles/components/RolesList.tsx`: `useRolePermissionCounts` recibe `[]` con Bloqueados y el contador no se pinta (hace pasar T020).
- [X] T025 [US2] En `src/features/roles/components/RolesPage.tsx`: `detailOf` → `blocked` pinta `BlockedRoleDetail` con el role de la lista (hace pasar T021).

**Checkpoint**: US1 y US2 funcionan juntas.

---

## Phase 5: User Story 3 - Bloquear y desbloquear un role (Priority: P2)

**Goal**: «Bloquear role» (con confirmación) en el detalle activo y «Desbloquear role» (inmediato) en el bloqueado.

**Independent Test**: bloquear un role → sale de Activos y aparece en Bloqueados con aviso; desbloquearlo → vuelve igual (quickstart V4, V5, V8, V15).

### Tests for User Story 3

- [X] T026 [P] [US3] Simulador: casos de `blockRole`/`unblockRole` en `src/test/handlers/usersDirectory/model.test.ts` (activo → bloqueado; bloqueado → activo con los mismos permisos; 409 `role_already_blocked`/`role_already_active`; 404 para inexistente o eliminado) y de `POST /roles/:id/block|unblock` (permiso `roles:update`) en `src/test/handlers/rolesCatalog/roles.test.ts`.
- [X] T027 [P] [US3] En `src/features/roles/api/rolesApi.test.ts`: `blockRole` y `unblockRole` devuelven el role con su nuevo estatus y propagan el `ApiError` con su código.
- [X] T028 [P] [US3] En `src/features/roles/api/roleErrors.test.ts`: `role_already_blocked` y `role_already_active` → `{ kind: 'alreadyInStatus' }`.
- [X] T029 [P] [US3] Crear `src/features/roles/hooks/useChangeRoleStatus.test.ts` (invalida ambas listas tras bloquear) y `src/features/roles/hooks/useChangeRoleStatusAction.test.ts` (éxito → aviso success y `onChanged`; 409 → aviso info y `onChanged`; 404/5xx → aviso error, sin `onChanged`; `pending` mientras trabaja).
- [X] T030 [P] [US3] Crear `src/features/roles/components/BlockRoleAction.test.tsx`: el botón abre la confirmación con título y cuerpo que nombran el role; Cancelar no llama a la API; Confirmar bloquea y llama a `onBlocked`; deshabilitado con `disabled`; el diálogo no se cierra mientras bloquea.
- [X] T031 [P] [US3] En `src/features/roles/components/RoleDetailActions.test.tsx` y `RoleDetailPanel.test.tsx`: «Bloquear role» entre «Duplicar» y «Eliminar role» solo con `canEdit`, deshabilitado con cambios sin guardar; en `BlockedRoleDetail.test.tsx`, «Desbloquear role» solo con `canEdit`, inmediato y con `onUnblocked`.
- [X] T032 [P] [US3] Crear `src/app/router/roles/blockRole.integration.test.tsx`: bloquear (confirmación → aviso `status.blocked` → el role en Bloqueados), desbloquear (aviso `status.unblocked` → vuelve a Activos con el mismo contador de permisos, SC-006), «ya estaba» (role bloqueado en el modelo antes de confirmar → aviso `status.alreadyBlocked` y la lista se actualiza) y error 5xx (aviso de error, el role sigue abierto); el foco queda en el título tras bloquear.

### Implementation for User Story 3

- [X] T033 [US3] Simulador (hace pasar T026): en `src/test/handlers/usersDirectory/model.ts`, `blockRole(id)` y `unblockRole(id)` con las reglas de contracts/roles-status-service.md §2–§3; en `src/test/handlers/rolesCatalog/roles.ts`, `POST ${roles}/:roleId/block` y `/unblock` con `handle('roles:update', …)` que responden `toRoleRecordDto`.
- [X] T034 [US3] En `src/features/roles/api/rolesApi.ts`, `blockRole` y `unblockRole` (`POST …/{id}/block|unblock`, `schema: roleSchema`) (hace pasar T027); en `src/features/roles/api/roleErrors.ts`, el resultado `alreadyInStatus` (hace pasar T028).
- [X] T035 [US3] En `src/shared/messages/es.ts`, bloque `roles.status` (`block`, `unblock`, `confirmTitle`, `confirmBody`, `confirm`, `cancel`, `blocked`, `unblocked`, `alreadyBlocked`, `alreadyActive`; contrato §4 y §6).
- [X] T036 [US3] Crear `src/features/roles/hooks/useChangeRoleStatus.ts` y `useChangeRoleStatusAction.ts` (hacen pasar T029) según research D6 y data-model §5; invalidación con `atMost(REFRESH_WAIT_MS, …)` como `useDeleteRole`.
- [X] T037 [US3] Extraer la sección de permisos de `src/features/roles/components/RoleDetailPanel.tsx` a `src/features/roles/components/RolePermissionsSection.tsx` sin cambiar nada de lo que se ve (research D9); `RoleDetailPanel.test.tsx` sigue en verde sin tocarlo.
- [X] T038 [US3] Crear `src/features/roles/components/BlockRoleAction.tsx` (hace pasar T030); `RoleDetailActions.tsx` acepta `children` antes de «Eliminar role»; `RoleDetailPanel.tsx` gana `onBlocked` y pinta `BlockRoleAction` con `canEdit`, deshabilitado con `isDirty || save.isPending` (FR-013). Verificar ≤ 250 líneas.
- [X] T039 [US3] En `src/features/roles/components/BlockedRoleDetail.tsx`, «Desbloquear role» con `useChangeRoleStatusAction` y la prop `onUnblocked`; en `RolesPage.tsx`, `onBlocked`/`onUnblocked` cierran el detalle (`setRoleId(null)`) y piden el foco en el título (research D7) (hacen pasar T031 y T032).

**Checkpoint**: US1–US3 funcionan juntas; el quickstart V4–V8 se puede recorrer con el simulador.

---

## Phase 6: User Story 4 - Filtros, selección y creación coherentes (Priority: P2)

**Goal**: la dirección guarda filtros y role; los enlaces antiguos, los valores no válidos, crear y duplicar se comportan como dice el spec.

**Independent Test**: quickstart V9–V14.

### Tests for User Story 4

- [X] T040 [P] [US4] En `src/features/roles/components/RolesPage.test.tsx`: `?type=clinica` y `?type=sistema` abren ese tipo con Activos (FR-009); `?type=xyz&status=otro` se reescribe a `/roles` (US4-3); cambiar Tipo o Estatus con un role abierto lo cierra (FR-007); crear con «Clínica» + «Bloqueados» un role de Sistema deja `?type=sistema&roleId=…` (FR-010); con «Todos» se conserva `type`; `?roleId=` de un role bloqueado con Activos muestra `detail.emptySelection` (FR-011).
- [X] T041 [P] [US4] En `src/app/router/roles/duplicateRole.integration.test.tsx` y `createRole.integration.test.tsx`: el role nuevo queda elegido y visible con el filtro que había (SC-009); las direcciones con `type=sistema` siguen valiendo.

### Implementation for User Story 4

- [X] T042 [US4] Ajustar lo que falle de T040–T041 en `src/features/roles/components/RolesPage.tsx` y `src/features/roles/hooks/useRolePermissionsLocation.ts` (el comportamiento ya viene de T003, T009 y T016).

---

## Phase 7: User Story 5 - Teclado, lector de pantalla y pantallas angostas (Priority: P3)

**Goal**: filtros y acciones operables por teclado, con nombres y estado anunciados y sin scroll horizontal.

**Independent Test**: quickstart V17, V18.

- [X] T043 [P] [US5] En `src/features/roles/components/RolesPage.test.tsx`: Tab entra al grupo «Tipo», flecha derecha mueve al botón siguiente y Espacio lo pulsa (US5-1); axe sin violaciones con «Bloqueados» y un role bloqueado abierto, y con la confirmación de bloqueo abierta.
- [X] T044 [P] [US5] En `src/features/roles/components/BlockRoleAction.test.tsx`: al cancelar, el foco vuelve a «Bloquear role» (US5-3).
- [X] T045 [US5] Migrar `e2e/roles.spec.ts`: las pestañas pasan a los botones del grupo «Tipo»; añadir un recorrido de bloquear y desbloquear un role recién creado (se omite sin cuentas `A1`, como el resto del archivo) y la comprobación de 320 px sin scroll horizontal si `e2e/responsive.spec.ts` ya cubre Roles.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T046 Enmienda PATCH de la constitución a 1.7.1 en `.specify/memory/constitution.md` (Principio VI: «filtrada por tipo y estatus» en lugar de «con pestañas por tipo»), hecha durante `/speckit-plan` (research D11).
- [X] T047 Buscar con Grep restos de las pestañas (`RoleTypeTabs`, `roles.tabs`, `selectInType`, `tabOfRoleTypeId`, `role', { name: … tabs`) en `src/` y `e2e/`, y comentarios que aún digan «pestañas Clínica/Sistema» en `src/features/roles`.
- [X] T048 Puertas de calidad: `npm run typecheck`, `npm run lint`, `npm run format:check`, las pruebas de `src/features/roles`, `src/app/router/roles` y `src/test/handlers` (quickstart §1), `npm run build` y `npm run size`.
- [X] T049 Verificar que los contratos ([contracts/roles-list-ui.md](contracts/roles-list-ui.md), [contracts/roles-status-service.md](contracts/roles-status-service.md)) coinciden con lo implementado (textos de `es.ts`, nombres accesibles, códigos) y corregir el contrato si algo difirió.
- [ ] T050 Recorrido manual del [quickstart.md](quickstart.md) §2 (V1–V19) contra la API real con una persona (requiere sesión de Auth0; no automatizable aquí).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias. T003 depende de T002; T009 de T003; T006 de T004 y T005.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de US1 (mismos `RolesList.tsx` y `RolesPage.tsx`).
- **US3 (Phase 5)**: depende de US2 (`BlockedRoleDetail.tsx`, `RolesPage.tsx`). T037 (extracción) va antes de T038.
- **US4 (Phase 6)**: depende de US3 solo por `RolesPage.tsx`; su lógica ya está en Foundational.
- **US5 (Phase 7)**: depende de US3 (acciones de bloqueo).
- **Polish (Phase 8)**: al final.

### Parallel Opportunities

- Foundational: T002, T004, T005, T007 y T008 en paralelo (archivos distintos).
- US1: T010, T011, T012 (pruebas) en paralelo; T013 en paralelo con T014.
- US3: T026–T032 (pruebas) en paralelo; T033, T034 y T035 en paralelo entre sí.
- US5: T043 y T044 en paralelo.

### Parallel Example: User Story 3

```text
T026 simulador (model.test.ts, roles.test.ts)
T027 rolesApi.test.ts
T028 roleErrors.test.ts
T029 useChangeRoleStatus*.test.ts
T030 BlockRoleAction.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational.
2. US1: filtros de Tipo sin pestañas. Validar con quickstart V1–V3.

### Incremental Delivery

1. + US2: Bloqueados y su detalle (V6, V7).
2. + US3: Bloquear/Desbloquear (V4, V5, V8, V15).
3. + US4: dirección, enlaces antiguos, crear/duplicar (V9–V14).
4. + US5: teclado, lector de pantalla, 320 px (V17, V18).
5. Polish: puertas de calidad y contratos.

## Notes

- **Estado de la implementación (2026-11-03)**: T001–T049 hechas en la rama `claude/025-spec-364f57` (worktree, en paralelo con la 024). Puertas de calidad (T048): `typecheck`, `lint` (0 avisos), `format:check` y `build` en verde; `size` 307,4 KB de 320 KB; pruebas de `src/features/roles`, `src/app/router/roles` y del simulador: 699/700. La que falla, `RoleDetailPanel` «a Clínica role can grant and save…», también falla en `main` (a28195a) al correr el archivo completo y pasa sola: es la intermitencia conocida (espera de 4 s frente al refresco tras guardar), no una regresión. T045: el e2e se migró y se amplió, pero **no se ejecutó** (no hay cuentas `E2E_AUTH0_USER_A1`/`_PASSWORD_A1` aquí). T050 (recorrido manual con una persona y la API real) sigue pendiente.
- Hallazgo de la implementación: el grupo «Tipo» y el campo «Tipo» del alta de role tienen el mismo nombre accesible; las pruebas que abren el alta buscan el campo **dentro del diálogo** (el diálogo es modal, así que para un lector de pantalla no hay ambigüedad).
- Archivos compartidos con la feature 024 (posible conflicto al fusionar): `src/shared/messages/es.ts` (bloque `roles` aquí, `modules` allí) y `.specify/memory/constitution.md`.
- La sección de Usuarios sigue pidiendo `GET /roles` sin parámetros; no cambia.
