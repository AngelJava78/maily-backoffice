---

description: "Task list for feature 023 — permisos de un role como lista con botones de alternancia"
---

# Tasks: Permisos de un role como lista con botones de alternancia

**Input**: Design documents from `/specs/023-permissions-toggle-list/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/permissions-list-ui.md](contracts/permissions-list-ui.md), [quickstart.md](quickstart.md)

**Tests**: esta feature cambia el control con el que se edita una regla de seguridad (permisos) y la constitución (VII) exige las pruebas en el mismo PR; además hay ≈ 8 archivos de pruebas que hoy consultan `role="checkbox"`. Las tareas de prueba están incluidas y van **antes** de la implementación de su historia (migración mecánica: se conservan los nombres accesibles y cambian el rol y la aserción, ver [contracts/permissions-list-ui.md](contracts/permissions-list-ui.md) §4).

**Organization**: las tareas se agrupan por historia de usuario, en el orden de prioridad del spec (US1 P1, US2 P1, US3 P2, US4 P3). Las cuatro tocan los mismos dos componentes (`PermissionsListItem`, `PermissionsList`), así que **se implementan en orden, no en paralelo** (ver Dependencies).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3, US4)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz del repositorio (`src/`, `e2e/`), sin cambios de estructura (plan.md). Los componentes viven en `src/features/roles/components/`.

**Convenciones que se aplican a toda tarea de este archivo** (para no repetirlas):

- **Orden y nombres de acción**: `ACTION_KEYS` = Ver, Crear, Modificar, Eliminar (`read`, `write`, `update`, `delete`), de `src/features/roles/schemas/permissionMatrix.ts`. Los botones solo existen para las acciones con celda en `row.cells`; **ni un hueco ni un botón inactivo** para las que el módulo no tiene (FR-002, invariante I3).
- **Nombre accesible**: `{Acción} de {Módulo}` (p. ej. `Ver de Pacientes`) y `Todo el módulo de {Módulo}`; el texto visible es solo `Ver`, `Crear`, … y `Todo el módulo`. Etiquetas desde `messages.roles.detail.actions` (nunca literales en JSX).
- **Estado**: `selected` por botón → `aria-pressed`; en pruebas se consulta con `getByRole('button', { name, pressed })` o `toHaveAttribute('aria-pressed', 'true' | 'false')`.
- **Sin cambios**: no se modifica ninguna función pura ni hook (`schemas/permissionMatrix.ts`, `hooks/useEditablePermissionMatrix.ts`, `useSaveRoleDetail.ts`); `onToggle(moduleId, actionKey, checked)` y `onToggleAll(moduleId, checked)` conservan su firma, con `checked` = el valor **nuevo** (`!granted`).

---

## Phase 1: Setup

- [X] T001 Confirmar la línea base antes de tocar nada: desde la raíz, `npm run typecheck` y `npm test -- src/features/roles src/app/router/roles` en verde, y que no hace falta ninguna dependencia, variable de entorno ni cambio en `.env.example` (plan.md, Technical Context: `ToggleButton`/`ToggleButtonGroup`/`List` de MUI 9.5.0 y el icono `included` ya existen). Sin cambios de código; esta tarea es una verificación.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: dejar los nombres definitivos **sin cambiar el comportamiento** (el detalle sigue pintando la tabla), para que el diff del cambio real (US1) sea legible y la suite siga en verde entre un paso y otro (research D1, D7).

**⚠️ CRITICAL**: ninguna historia empieza antes de que esta fase termine.

- [X] T002 Renombrar con `git mv`, en `src/features/roles/components/`: `PermissionsMatrix.tsx` → `PermissionsList.tsx`, `PermissionsMatrix.test.tsx` → `PermissionsList.test.tsx`, `PermissionsMatrixRow.tsx` → `PermissionsListItem.tsx`, `PermissionsMatrixRow.test.tsx` → `PermissionsListItem.test.tsx`. Renombrar los componentes exportados (`PermissionsList`, `PermissionsListItem`), sus interfaces de props (`PermissionsListProps`, `PermissionsListItemProps`) y los títulos de `describe` en las pruebas, y actualizar el import (línea 26) y el uso (línea 226) en `src/features/roles/components/RoleDetailPanel.tsx`. **No** renombrar `schemas/permissionMatrix.ts` ni `useEditablePermissionMatrix` (siguen siendo una matriz, research D1). Sin cambio de comportamiento.
- [X] T003 En `src/shared/messages/es.ts`, renombrar `roles.detail.columns` → `roles.detail.actions` (claves `read`, `write`, `update`, `delete`, `allModule`; **conservar `module` por ahora**, aún lo usa la cabecera de la tabla y se retira en T008) y actualizar sus dos únicas referencias: `const columns = messages.roles.detail.columns` en `PermissionsListItem.tsx` y `text.columns` en `PermissionsList.tsx` (research D7). Verificar con `npm run typecheck` y `npm test -- src/features/roles` en verde (depende de T002: mismos archivos).

**Checkpoint**: nombres definitivos, tabla todavía intacta, suite en verde.

---

## Phase 3: User Story 1 - Ver los permisos de un role como una lista de módulos con botones (Priority: P1) 🎯 MVP

**Goal**: el detalle de un role muestra sus permisos como una lista —un elemento por módulo— con un botón de alternancia por cada acción disponible, pulsado si está concedida, con la marca ✓ y no operable cuando no se puede editar; en lugar de la tabla de casillas.

**Independent Test**: con un role que tiene permisos en varios módulos, abrir su detalle y comprobar que cada módulo es un elemento de lista con solo sus acciones, que el estado de cada botón coincide con lo concedido y con el contador «X de Y permisos», que un role de Clínica con módulos de Sistema muestra los encabezados de grupo, y que sin permiso de edición los botones se ven pero no cambian.

> US1 y US2 se entregan juntas (la lista reemplaza a la tabla que hoy permite editar). Entre T011 y T018 los botones aún **no responden al clic**, así que los casos de **edición** heredados (los listados en T014–T017) siguen en rojo a propósito hasta la Fase 4; los casos de **esta** fase son los que deben pasar en el Checkpoint.

### Tests for User Story 1 ⚠️

> **NOTE: escribir/migrar estas pruebas PRIMERO; deben fallar antes de implementar**

- [X] T004 [P] [US1] Reescribir los casos de **presentación** de `src/features/roles/components/PermissionsListItem.test.tsx`: quitar el arnés de `Table`/`TableBody` y renderizar `<List><PermissionsListItem row={…} pending={…} onToggle={vi.fn()} onToggleAll={vi.fn()} /></List>` (ya no hay prop `columns`). Casos: el módulo es un `listitem` que contiene su nombre (`Pacientes`, ya no `rowheader`); con las cuatro acciones, los botones son `Ver de Pacientes`, `Crear de Pacientes`, `Modificar de Pacientes`, `Eliminar de Pacientes` **en ese orden**; con solo `read` hay un único botón (sin Crear/Modificar/Eliminar, ni activos ni inactivos); `aria-pressed` es `true` solo en las acciones con `granted: true`; cada botón tiene un `svg` decorativo (`aria-hidden="true"`) como marca, visible (`toBeVisible()`) solo en los pulsados y presente —con `visibility: hidden`, para reservar el hueco— en los no pulsados (si jsdom no resuelve el estilo de emotion, aserción con `getComputedStyle(svg).visibility`); un módulo sin ninguna celda muestra solo el nombre y ningún botón; con `pending` todos los botones están `toBeDisabled()` y los pulsados conservan `aria-pressed="true"` y su marca (FR-008). **Retirar** los casos de interacción heredados (Crear→Ver, despulsar Ver, «Todo el módulo»): se reescriben en US2 (T012) y US3 (T019). Debe fallar.
- [X] T005 [P] [US1] Reescribir los casos de **presentación** de `src/features/roles/components/PermissionsList.test.tsx` con el nuevo contrato (`label` obligatorio): `getByRole('list', { name: label })`; descrita por el texto de ayuda (`toHaveAccessibleDescription(messages.roles.detail.matrixHelper)`) y ese texto está en el documento a la vista; un módulo por elemento en el orden recibido (identificarlos por su texto, no contando `listitem`: los encabezados de grupo también son `li`); no existe ni `table` ni `columnheader`; con matriz mezclada (Clínica + Sistema) aparecen `Módulos de Clínica` y `Módulos de Sistema` en orden (encabezado → sus módulos → siguiente encabezado), y con un solo tipo no aparece ningún `/^Módulos de /` (FR-005 de 015); `matrix={[]}` muestra `Este tipo todavía no tiene módulos en el catálogo.` y **no** renderiza `list`. **Retirar** de este archivo los casos «cabeceras de columna», «omite una columna», «celda vacía» (ya no hay columnas) y los dos de interacción («toggling a cell…», «reports which moduleId changed…»), que vuelven en T013/T020. Debe fallar.
- [X] T006 [P] [US1] Migrar los casos de **lectura** de `src/features/roles/components/RoleDetailPanel.test.tsx`: línea 41 → `getByRole('button', { name: 'Ver de Roles', pressed: true })`; línea 134 (catálogo de permisos fallido: no hay botones y sí `text.matrixError`, ahora «No se pudo cargar la lista de permisos.») → `queryByRole('button', { name: 'Ver de Roles' })`; línea 144 (sin `canEdit`) → el botón está `toBeDisabled()`; caso nuevo: la lista se llama `Permisos de {role} por módulo y acción` (`text.matrixTitle`). Los casos de edición (líneas 78, 86, 97, 104) se migran en T014. Debe fallar.
- [X] T007 [P] [US1] Migrar en `src/app/router/roles/viewAndEditPermissions.integration.test.tsx` el caso «US1-2» (líneas 57–73): `Ver de Recordatorios` y `Crear de Pacientes` existen como `button`, `Crear de Recordatorios` no existe (Recordatorios solo tiene Ver y Modificar), y se conserva `permissionsCount(0, 26)`; actualizar el comentario de la línea 67 («checkbox» → «botón»). Los demás casos de ese archivo se migran en US2/US3. Debe fallar.

### Implementation for User Story 1

- [X] T008 [P] [US1] En `src/shared/messages/es.ts` (research D7, FR-014): reformular `roles.detail.matrixHelper` a «Activa lo que puede hacer en cada módulo. Para crear, modificar o eliminar también necesita Ver.» (sin «marca» ni casillas); `roles.detail.matrixError` a «No se pudo cargar la lista de permisos.»; `roles.form.copyFromHelper` a «Opcional. Llena la lista de permisos con los de otro role; después la puedes ajustar.»; y **retirar** `roles.detail.actions.module` **una vez que T010 ya no lo use** (hasta entonces la tabla antigua de `PermissionsList.tsx` lo sigue leyendo y `npm run typecheck` fallaría). Antes de dar por buena la edición, buscar con `rg "Llena la tabla|tabla de permisos|Marca lo que"` en `src` y `e2e` y actualizar cualquier prueba que cite los textos antiguos. **No** tocar `modules.validation.createUpdateDeleteRequireRead` (es de la feature de Módulos, FR-015).
- [X] T009 [P] [US1] Implementar `src/features/roles/components/PermissionsListItem.tsx` (research D2, D4, D6): props `{ row, pending, onToggle, onToggleAll }` (sin `columns`). Raíz: `ListItem` de MUI (`li`) como contenedor flex con `flexWrap: 'wrap'`, `alignItems: 'center'` y `columnGap`/`rowGap` de la escala del tema. Dentro: el nombre del módulo (`flex: '1 1 220px'`, `minWidth: 0`, `overflowWrap: 'anywhere'`, para que los botones de distintas filas arranquen alineados en escritorio) y, **solo si el módulo tiene al menos una acción**, un `ToggleButtonGroup size="small" disabled={pending}` (sin `exclusive`, sin `value` ni `onChange`) con un `ToggleButton` por acción presente, en el orden de `ACTION_KEYS`: `value={key}`, `selected={cell.granted}`, `aria-label` = «{Acción} de {Módulo}» (de `actions[key]` y `row.module.name`). El contenido de cada botón es una marca `<Icon name="included" size="sm" decorative />` dentro de un `span` con `visibility: granted ? 'visible' : 'hidden'` (reserva el hueco: el botón no cambia de ancho al alternar) seguida de `actions[key]`. Extraer ese contenido a un pequeño componente interno del mismo archivo (lo reutiliza T022). **Sin `onClick` todavía** (US2) ni botón «Todo el módulo» (US3). Sin `useMemo`/`useCallback`/`useEffect`.
- [X] T010 [US1] Implementar `src/features/roles/components/PermissionsList.tsx` (research D5): props `{ matrix, label, pending, onToggle, onToggleAll }`. Vacía → `<EmptyState message={text.emptyModules} />` sin lista. Si no, `const helperId = useId()`; un `Typography variant="body2" color="text.secondary" id={helperId}` con `text.matrixHelper` y debajo `<List aria-label={label} aria-describedby={helperId}>` con un `PermissionsListItem` por fila (`key={row.module.id}`), reenviando `onToggle(row.module.id, key, checked)` y `onToggleAll(row.module.id, checked)`. Conservar el cálculo `groupedByType` (más de un `row.module.type.id`) y, al empezar un tipo nuevo, un `ListSubheader disableSticky` con `text.moduleGroupHeader(row.module.type.name)` (`Fragment` con `key`). **Retirar** todo lo de la tabla: imports de `Table*`, el cálculo de `columns` y el `TableContainer` (depende de T008 y T009).
- [X] T011 [US1] En `src/features/roles/components/RoleDetailPanel.tsx`, pasar a `PermissionsList` la prop nueva `label={text.matrixTitle(role.name)}` (junto a `matrix`, `pending`, `onToggle`, `onToggleAll`) y confirmar con `wc -l` que el archivo sigue en ≤ 250 líneas (hoy 243; si lo supera, extraer el bloque «título + lista» a un componente pequeño, research D9). Sin otro cambio en el panel.

**Checkpoint**: `npm test -- src/features/roles/components/PermissionsListItem src/features/roles/components/PermissionsList.test src/features/roles/components/RoleDetailPanel src/app/router/roles/viewAndEditPermissions` — pasan los casos de lectura de T004–T007; los de edición heredados siguen en rojo hasta T018. La lista ya es visible en `npm run dev`.

---

## Phase 4: User Story 2 - Conceder y retirar permisos con los botones (Priority: P1)

**Goal**: pulsar y despulsar los botones cambia lo que el role puede hacer, con la misma regla de «Ver» y el mismo guardar/descartar/aviso de siempre.

**Independent Test**: con un role editable, pulsar y despulsar acciones de varios módulos, comprobar el contador, guardar y volver a abrir el role (persiste); repetir y descartar (todo vuelve al último guardado).

### Tests for User Story 2 ⚠️

> **NOTE: migrar estas pruebas PRIMERO; deben fallar hasta T018**

- [X] T012 [P] [US2] Reañadir en `src/features/roles/components/PermissionsListItem.test.tsx` los casos de interacción con un `Harness` con estado que aplique `withPermissionToggled` (el mismo del archivo actual): pulsar `Crear` con `Ver` sin pulsar deja **ambos** con `aria-pressed="true"`; despulsar `Ver` con las cuatro pulsadas deja **las cuatro** en `false`; despulsar `Crear` deja solo `Crear` en `false` (US2-2, US2-3); cada clic llama a `onToggle(actionKey, !granted)` (una sola vez, con el valor nuevo); con `pending` un clic no llama a `onToggle`.
- [X] T013 [P] [US2] Reañadir en `src/features/roles/components/PermissionsList.test.tsx`: pulsar `Crear de Pacientes` actualiza la matriz por los callbacks y deja `Ver de Pacientes` pulsado también (regla de Ver); y `onToggle` se llama con `(PATIENTS.id, 'write', true)` (el módulo y la acción correctos).
- [X] T014 [P] [US2] Migrar los casos de **edición** de `src/features/roles/components/RoleDetailPanel.test.tsx`: líneas 78/86 (pulsar `Ver de Roles` habilita «Guardar cambios»; tras guardar `permissionsCount(1, 16)`, el botón sigue `pressed: true` y «Guardar cambios» queda deshabilitado) y 97/104 (rol de Clínica que concede y guarda un permiso de módulo de Sistema). Caso nuevo (US2-4): pulsar `Ver de Roles` y volver a pulsarlo deja «Guardar cambios» y «Descartar cambios» **deshabilitados** (sin cambio pendiente).
- [X] T015 [P] [US2] Migrar en `src/app/router/roles/viewAndEditPermissions.integration.test.tsx` los casos de edición, cambiando `getByRole('checkbox', …)` por `getByRole('button', …)` y `toBeChecked()`/`not.toBeChecked()` por `toHaveAttribute('aria-pressed', 'true'|'false')`: «US1-3, US1-4» (líneas 75–90: pulsar `Modificar de Recordatorios` pulsa también `Ver…`; despulsar `Ver…` despulsa `Modificar…`), «US1-7» (líneas 130–144, `Ver de Usuarios`) y «US1-8» (líneas 146–174, `Ver de Usuarios` pulsado tras el error de nombre repetido). En «US1-6» (líneas 105–128) **sustituir el mecanismo** `Todo el módulo de Recordatorios` por pulsar `Modificar de Recordatorios` (concede Ver + Modificar: sigue siendo `permissionsCount(2, 26)`), para que este caso no dependa de US3; en la relectura tras guardar, `Ver de Recordatorios` con `aria-pressed="true"`.
- [X] T016 [P] [US2] Migrar en `src/app/router/roles/duplicateRole.integration.test.tsx` la línea 68 (`getByRole('checkbox', { name: 'Ver de Usuarios' })` → `getByRole('button', …)`) y actualizar el comentario de la línea 67 («Unchecking» → «Pressing/unpressing»); se conservan `permissionsCount(12, 16)` y la comprobación de que el original no cambia (US4-2 de 014).
- [X] T017 [P] [US2] Migrar en `e2e/roles.spec.ts` el caso «W3 to W7» (líneas 44–54): `const toggle = page.getByRole('button', { name: 'Ver de Roles' })`; `const wasPressed = (await toggle.getAttribute('aria-pressed')) === 'true'`; tras cada clic y «Guardar cambios», `await expect(toggle).toHaveAttribute('aria-pressed', String(!wasPressed))` y, al restaurar, `String(wasPressed)`. Mismo flujo y mismos textos; el entorno real queda como se encontró. Sin las cuentas `E2E_AUTH0_USER_A1`/`_PASSWORD_A1` la suite se omite sola.

### Implementation for User Story 2

- [X] T018 [US2] En `src/features/roles/components/PermissionsListItem.tsx`, conectar cada botón de acción: `onClick={() => { onToggle(key, !cell.granted); }}` (el valor nuevo es `!cell.granted`; la cascada de Ver ya la resuelve `withPermissionToggled` aguas arriba, research D2/D8). Nada más: sin estado local, sin tocar `pending` (ya deshabilita el grupo). Verificar que pasan T012–T016.

**Checkpoint**: `npm test -- src/features/roles src/app/router/roles` — en verde **salvo** los casos de «Todo el módulo» (T019–T021, aún sin implementar). US1 + US2 ya forman el MVP editable: la lista reemplaza por completo a la tabla.

---

## Phase 5: User Story 3 - Conceder o retirar de una vez todas las acciones de un módulo (Priority: P2)

**Goal**: cada elemento ofrece un botón «Todo el módulo» que pulsa o despulsa de una vez todas las acciones disponibles de ese módulo, y solo esas.

**Independent Test**: en un módulo con varias acciones, pulsar «Todo el módulo» (todas pulsadas), pulsarlo de nuevo (todas sin pulsar), y comprobar que con algunas pulsadas se ve sin pulsar y que se pulsa solo al completar la última.

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] En `src/features/roles/components/PermissionsListItem.test.tsx` añadir los casos de «Todo el módulo» (`Todo el módulo de Pacientes`): pulsarlo con alguna acción sin pulsar llama a `onToggleAll(true)` y, con el `Harness`, deja **todas** las acciones disponibles pulsadas y ninguna más; con todas pulsadas, `onToggleAll(false)` las deja sin pulsar; con algunas pulsadas se ve `aria-pressed="false"` y, al pulsar la última que faltaba, pasa a `aria-pressed="true"` por sí solo (US3-3); no existe en un módulo sin ninguna acción; con `pending` está `toBeDisabled()` y conserva su marca si está pulsado. **Actualizar** los casos de T004 que cuentan botones: con una sola acción (`read`) ahora hay **dos** (`Ver…` y `Todo el módulo…`) y los cuatro botones de acción siguen en su orden seguidos de «Todo el módulo».
- [X] T020 [P] [US3] Reañadir en `src/features/roles/components/PermissionsList.test.tsx` el caso «reports which moduleId changed when a whole-row toggle happens»: pulsar `Todo el módulo de Pacientes` llama a `onToggleAll(PATIENTS.id, true)`.
- [X] T021 [P] [US3] Migrar en `src/app/router/roles/viewAndEditPermissions.integration.test.tsx` el caso «US1-5» (líneas 92–103): pulsar `Todo el módulo de Recordatorios` deja `Ver de Recordatorios` y `Modificar de Recordatorios` con `aria-pressed="true"` (y **no** aparece `Crear de Recordatorios`) y el contador en `permissionsCount(2, 26)`.

### Implementation for User Story 3

- [X] T022 [US3] En `src/features/roles/components/PermissionsListItem.tsx`, añadir **a la derecha del grupo y fuera de él** (research D3) un `ToggleButton size="small"` suelto, solo si el módulo tiene al menos una acción: `value="all"`, `selected={allGranted}` (hay acciones y **todas** están `granted`, igual que el `allGranted` de la casilla actual), `onClick={() => { onToggleAll(!allGranted); }}`, `disabled={pending}`, `aria-label` = «Todo el módulo de {Módulo}» (de `actions.allModule` y `row.module.name`), `sx={{ ml: 'auto' }}` para empujarlo al borde, y el mismo contenido interno con marca ✓ de T009. No cuenta para el contador «X de Y» (FR-004). Verificar que pasan T019–T021.

**Checkpoint**: `npm test -- src/features/roles src/app/router/roles` completo en verde. Las historias US1, US2 y US3 funcionan.

---

## Phase 6: User Story 4 - Teclado, lector de pantalla y pantallas angostas (Priority: P3)

**Goal**: la lista se lee y se cambia con teclado y lector de pantalla, y se reacomoda en ventanas angostas sin desplazamiento horizontal.

**Independent Test**: recorrerla solo con teclado (Tab entra al grupo de cada módulo, ←/→ mueven entre acciones, Espacio/Enter alterna, Tab pasa a «Todo el módulo») y con un lector de pantalla; reducir la ventana a 320 px.

### Tests for User Story 4 ⚠️

- [X] T023 [P] [US4] Actualizar la prueba de teclado de `src/features/roles/components/RolesPage.test.tsx` (líneas 187–211, «reaches the tabs, the role list and the permission table by keyboard alone»): retirar `isCheckbox`; tras el campo de nombre, `tabUntil` hasta un elemento con `aria-pressed` (`el?.getAttribute('aria-pressed') !== null`; con el tabindex móvil de MUI el foco entra al grupo en su botón activo), guardar su `aria-pressed`, pulsar Espacio y comprobar que cambió; renombrar el caso a «…the permission list by keyboard alone». Mantener intacta la prueba de `axe` («has no violations with a role selected», línea 163): ahora recorre la lista de botones y debe seguir sin violaciones (SC-006).
- [X] T024 [P] [US4] Añadir a `src/features/roles/components/PermissionsListItem.test.tsx`: con el foco en un botón del grupo, `ArrowRight` mueve el foco al siguiente botón de **ese** módulo (tabindex móvil) y `Enter` lo alterna igual que Espacio; `Todo el módulo` es una parada de Tab propia, fuera del grupo (Tab desde el grupo cae en él); la marca no añade texto al nombre accesible (el nombre sigue siendo `{Acción} de {Módulo}`, que **contiene** el texto visible, FR-011).

### Implementation for User Story 4

- [X] T025 [US4] Afinar la disposición en `src/features/roles/components/PermissionsListItem.tsx` y `PermissionsList.tsx` con el sistema de estilos de MUI (`sx` con la escala del tema, sin CSS global ni valores sueltos; research D6): en ancho pequeño el nombre ocupa su propia línea y los botones pasan debajo, «Todo el módulo» sigue al grupo (o a la línea siguiente) sin salirse del contenedor; ningún texto cortado; nombres de módulo largos se parten en varias líneas sin tapar ni desplazar los botones; sin desplazamiento horizontal de la página de 1024 a 320 px. Los botones usan `size="small"` (misma forma, tamaño y tipografía que los de `ModulesFilters`, FR-012). Verificar que T023 y T024 pasan.
- [ ] T026 [US4] Verificación manual en `npm run dev` de [quickstart.md](quickstart.md) V14–V17 (teclado, lector de pantalla, 320 px y modo oscuro, y que alternar un botón no desplaza a sus vecinos). Anotar cualquier hallazgo y corregirlo en T025 antes de cerrar la fase.
  - **Hecho (Chromium real, arnés aislado con el tema de la app y la misma estructura de `RolesPage`, ya borrado):** V16 a 320, 375, 768, 1024 y 1440 px en claro y a 320/1024 px en oscuro, sin desbordamiento horizontal de la página ni de ningún botón; V17 (alternar un botón no cambia el ancho de ninguno; solo 1 px de desplazamiento entre dos botones pulsados contiguos, por la superposición de bordes del propio grupo de MUI); aspecto deshabilitado (FR-008). **Hallazgo corregido en T025:** a 320/375 px el grupo con las marcas medía 344 px y desbordaba la página.
  - **Hecho además, V14 en Chromium real (mismo arnés aislado, ya borrado):** Tab entra al grupo de un módulo con una sola parada; ←/→ mueven entre sus acciones; Enter y Espacio alternan (pulsar Crear deja Ver pulsado); «Todo el módulo» es una parada propia; Tab recorre módulo a módulo y sale de la lista. El árbol de accesibilidad que ve el navegador es `list` con nombre → `listitem` → `group` → `button` con estado `pressed` y nombre «{Acción} de {Módulo}». El foco se ve como la ondulación circular por defecto de MUI (sin contorno), la misma que el resto de botones de la app; es sutil sobre fondo claro (observación, no defecto de esta feature).
  - **Pendiente de una persona (no verificable desde aquí):** V14 con la sesión real de la app (login de Auth0) y V15 con un lector de pantalla real (NVDA, JAWS o VoiceOver).

**Checkpoint**: las cuatro historias funcionan y se comprueban de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: comprobar que no queda rastro de la tabla y pasar las puertas de calidad de la constitución antes del PR.

- [X] T027 Buscar restos con `rg "PermissionsMatrix\b|PermissionsMatrixRow|getByRole\('checkbox'|roles\.detail\.columns|detail\.columns|Llena la tabla" src e2e` y confirmar que no queda ninguno (los nombres `permissionMatrix.ts` y `useEditablePermissionMatrix` **se conservan** a propósito, research D1). Confirmar también que ninguna prueba de roles consulta ya `role="checkbox"` para permisos.
- [ ] T028 Puertas de CI, todas en verde y sin advertencias: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:coverage` (umbral del 80 % en `api`/`schemas`/`policy`/`hooks`, que esta feature no modifica). No usar `any`, `as`, `@ts-ignore`, `console.*` ni `TODO` sin issue.
  - **Estado: NO todo en verde, por causas ajenas a esta feature (no se marca como hecha).**
    - ✅ `npm run typecheck` y `npm run lint` (0 advertencias) en todo el repo.
    - ✅ `npm run format:check`: fallaba en `src/features/modules/schemas/moduleActionCatalog.test.ts`, que **ya incumplía Prettier en `main`** (es lo que ponía en rojo el CI de `main` en `af6ed1c`, en el paso `format:check`). Se corrigió en un commit aparte, solo de formato (un `import` partido en varias líneas).
    - ❌ `npm run test:coverage`: **4392 pasan, 12 fallan, ninguno en roles.** 2 son `src/app/config/env.test.ts` (la prueba espera `VITE_HEALTH_REFRESH_SECONDS` = 30 y `env.ts` define `DEFAULT_HEALTH_REFRESH_SECONDS = 60`; fallan igual en aislado y no se tocó `src/app/config`: fallo preexistente de `main`). **Se deja sin corregir a propósito:** el valor 60 lo introdujo el commit `0144a75 feat: messages updates` (que cambió otras cosas de salud) sin tocar la spec 016 (FR-046: 30 s), `.env.example`, el mensaje de error de configuración ni otras 3 pruebas, que dicen 30; no se sabe si fue decisión o descuido, y es una decisión de producto de otra feature. Los otros 10 son de Suscripciones, con timeouts de ~30 s por prueba que **cambian de una ejecución a otra** (en aislado bajaron de 10 a 1, y era otra prueba distinta): temporización de una máquina con 7,8 GB y < 1 GB libres; esta rama no toca `features/subscriptions`.
    - ⚠️ El umbral de cobertura (80 % de líneas en `api`/`policy`/`schemas`/`hooks`/`shared`) **no se evaluó**: Vitest omite el reporte si hay pruebas en rojo. No debería verse afectado: esta rama solo cambia `components/`, `shared/messages/es.ts` y pruebas, ninguno dentro de `coverage.include`. Lo evaluará CI.
    - Las pruebas de **roles** (componentes, integración, `RolesPage` con axe y teclado) pasan en la corrida completa.
- [X] T029 `npm run build && npm run size` (presupuesto de 320 KB gzip en la ruta de entrada): el bundle no debe crecer (la ruta de Roles es diferida y `ToggleButton`/`List` ya están en el bundle); anotar el resultado en la descripción del PR.
  - **Resultado:** `npm run build` correcto; `npm run size` → **307,3 KB de 320,0 KB** (el aviso de chunks > 500 kB ya existía).
- [ ] T030 `npm run test:e2e -- e2e/roles.spec.ts` si se dispone de las cuentas de prueba de Auth0 (`E2E_AUTH0_USER_A1`/`_PASSWORD_A1`); sin ellas la suite se omite y se deja constancia en el PR.
  - **Estado: NO ejecutada.** No hay `E2E_AUTH0_USER_A1`/`E2E_AUTH0_PASSWORD_A1` en el entorno ni en `.env.local`, así que la suite se omite sola. El cambio de `e2e/roles.spec.ts` (T017) pasó lint, typecheck y formato, pero **no se ha ejecutado contra un entorno real**.
- [ ] T031 Ejecutar completo [quickstart.md](quickstart.md) §3 (V1–V18) en `npm run dev` con una cuenta que pueda editar roles y otra que solo pueda verlos, y confirmar SC-001 (localizar un permiso en < 10 s en un role de 20 módulos) y SC-007 (los botones se ven como los de «Tipo»/«Estatus» de Módulos, y el pulsado solo difiere por la marca ✓). Si todo pasa, marcar el spec como implementado (`Status` en `spec.md`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **bloquea** todas las historias (T002 antes de T003: tocan los mismos archivos).
- **Historias (Phase 3–6)**: dependen de Foundational y, a diferencia de otras features, **no son independientes en código** porque comparten `PermissionsListItem.tsx` y `PermissionsList.tsx`:
  - **US1 → US2 → US3 → US4**, en orden. US2 necesita el elemento de US1 para cablear el clic; US3 añade el botón suelto al mismo archivo; US4 afina el estilo de los mismos dos archivos y revisa el teclado de todo lo anterior.
  - Cada historia se **prueba** de forma independiente (su Checkpoint), pero se **implementa** después de la anterior.
- **Polish (Phase 7)**: depende de que las cuatro historias estén completas.

### Dependencias dentro de cada historia

- US1: T004–T007 (pruebas) antes de T008–T011; T008 y T009 en paralelo; T010 depende de T008 y T009; T011 depende de T010.
- US2: T012–T017 (pruebas) antes de T018.
- US3: T019–T021 (pruebas) antes de T022.
- US4: T023–T024 (pruebas) antes de T025; T026 después de T025.

### Parallel Opportunities

- Las tareas `[P]` de una misma fase tocan archivos distintos y pueden ir en paralelo: T004–T007 (cuatro archivos de prueba), T008 con T009, T012–T017 (seis archivos), T019–T021 (tres) y T023–T024 (dos).
- **No** hay paralelismo entre historias: comparten los dos componentes (ver arriba). El paralelismo útil está dentro de cada fase de pruebas.

---

## Parallel Example: User Story 1

```bash
# Las cuatro pruebas de US1, en paralelo (cuatro archivos distintos):
Task: "T004 PermissionsListItem.test.tsx — presentación"
Task: "T005 PermissionsList.test.tsx — lista, grupos, vacío"
Task: "T006 RoleDetailPanel.test.tsx — casos de lectura"
Task: "T007 viewAndEditPermissions.integration.test.tsx — US1-2"

# Después, textos y elemento, en paralelo (es.ts y PermissionsListItem.tsx):
Task: "T008 es.ts — ayuda, error, copyFromHelper, retirar actions.module"
Task: "T009 PermissionsListItem.tsx — grupo de botones con marca"
# …y T010 (PermissionsList.tsx) y T011 (RoleDetailPanel.tsx) en ese orden.
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

El spec indica que US1 y US2 se entregan juntas: la lista reemplaza a la tabla que hoy permite editar, así que un MVP solo con US1 dejaría a las personas sin poder editar permisos.

1. Completar Fase 1: Setup.
2. Completar Fase 2: Foundational (renombres sin cambio de comportamiento).
3. Completar Fase 3: User Story 1 (lista de botones con estado, de solo lectura).
4. Completar Fase 4: User Story 2 (los botones responden al clic).
5. **DETENERSE y VALIDAR**: probar la edición de punta a punta (Checkpoint de la Fase 4). Es el MVP.
6. Desplegar/mostrar si está listo.

### Entrega incremental

1. Setup + Foundational → base lista, suite en verde, tabla intacta.
2. US1 + US2 → MVP editable con botones.
3. US3 → «Todo el módulo» como botón (se puede mostrar sin él, pero la feature 014 lo exige: FR-006).
4. US4 → teclado, lector de pantalla y pantallas angostas verificados.
5. Polish → puertas de CI y validación manual completa.

### Estrategia con varias personas

Con más de una persona: las pruebas de cada fase (`[P]`) se reparten por archivo; la implementación de los dos componentes es de una sola persona por vez, porque las cuatro historias comparten archivos. Una segunda persona puede, en paralelo, preparar la migración del e2e (T017) y la verificación manual (T026, T031).

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre sí.
- La etiqueta `[Story]` liga cada tarea con su historia del spec para trazabilidad.
- Las tareas de prueba van **antes** de su implementación y deben fallar primero; los casos heredados que quedan en rojo entre fases están señalados en los Checkpoints.
- Confirmar el comportamiento de MUI contra el código instalado (`node_modules/@mui/material/ToggleButton*`) si algo no cuadra: el grupo usa tabindex móvil y `selected` por botón gana a lo que reparte el grupo (research, hallazgos 3 y 5).
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés, p. ej. `refactor(roles): rename the permissions matrix components`, `feat(roles): show a role's permissions as a toggle-button list (023)`).
- Evitar: tareas vagas, conflictos de archivo entre tareas `[P]`, y dependencias entre historias que rompan su prueba independiente.
