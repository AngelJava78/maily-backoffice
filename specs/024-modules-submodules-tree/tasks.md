---

description: "Task list for feature 024 — módulos y submódulos en árbol jerárquico"
---

# Tasks: Módulos y submódulos en árbol jerárquico

**Input**: Design documents from `/specs/024-modules-submodules-tree/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/modules-service-changes.md](contracts/modules-service-changes.md), [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md), [quickstart.md](quickstart.md)

**Tests**: la constitución (VII) exige las pruebas en el mismo PR y esta feature añade reglas de negocio nuevas en funciones puras (árbol, padres elegibles, cuerpos, errores). Las tareas de prueba van **antes** de su implementación y deben fallar primero.

**Organization**: las tareas se agrupan por historia de usuario, en el orden de prioridad del spec (US1 P1, US2 P2, US3 P3, US4 P3). US2 y US3 tocan los mismos archivos (`ModuleEditPanel.tsx`, `ModuleDangerZone.tsx`, `moduleErrors.ts`, `es.ts` y el simulador), así que **se implementan en ese orden, no en paralelo**. Dentro de una fase, `[P]` marca las tareas de archivos distintos.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3, US4)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz del repositorio (`src/`, `e2e/`), sin cambios de estructura (plan.md). La lógica vive en `src/features/modules/` (`schemas`, `policy`, `api`, `hooks`, `components`); el simulador de la API, en `src/test/handlers/modulesCatalog/`.

**Convenciones que se aplican a toda tarea de este archivo** (para no repetirlas):

- **Textos**: siempre desde `messages.modules` de `src/shared/messages/es.ts`; nunca literales en JSX. Código, archivos y mensajes de commit en inglés; documentación en español.
- **Datos de prueba**: una jerarquía se arma con `catalogModule({ parentModuleId })` (simulador) y `moduleDto({ parent_module })` (fábrica de `src/test/factories.ts`). **No se toca la semilla** (`seed.ts`): sus 23 módulos siguen dando «23 módulos activos».
- **Ejecutar pruebas** (máquina con poca memoria): `npm test -- <rutas> --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`, **una corrida a la vez**, solo de las rutas afectadas. La cobertura completa tarda ~30 min: solo en T061.
- **Reglas del código**: sin `any`, `as` ni `@ts-ignore`; sin `useMemo`/`useCallback` (React Compiler en uso: se deriva en el render); sin `useEffect` para derivar estado; ningún archivo de componente por encima de 250 líneas; componentes de MUI con `sx`, sin CSS global; el icono de expandir es `Icon name="arrow-drop-down"` (ya existe).
- **La API manda**: la interfaz solo adelanta reglas para no ofrecer lo que se rechazará; nunca se muestra el `message` del servicio, solo su `code` traducido (constitución IV).
- **Commits**: Conventional Commits en inglés, uno por tarea o grupo lógico (p. ej. `feat(modules): build the modules tree from the catalog`). Nada se sube a `main` sin la aprobación de la persona responsable.

---

## Phase 1: Setup

- [X] T001 Confirmar la línea base antes de tocar nada: desde la raíz, `npm run typecheck` y `npm test -- src/features/modules src/app/router/modules src/test/handlers --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000` en verde, y que no hace falta ninguna dependencia, variable de entorno ni cambio en `.env.example` (plan.md, Technical Context). Confirmar también que `git status` solo muestra las carpetas `specs/024…`, `specs/025…` y `specs/026…` sin seguimiento.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: que el modelo de dominio conozca al padre y que el simulador y las fábricas lo entreguen, **sin cambiar el comportamiento** de la pantalla (todo sigue de primer nivel), más las dos funciones puras de jerarquía que usan US2 y US3. Así el diff de cada historia es legible y la suite queda en verde entre un paso y otro (research D2, D14, D15).

**⚠️ CRITICAL**: ninguna historia empieza antes de que esta fase termine.

- [X] T002 [P] Ampliar `src/features/modules/schemas/systemModule.test.ts` (debe fallar primero) para el campo nuevo de [data-model.md](data-model.md) §1: `parent_module: null` → `parentModule: null`; `parent_module: { id: 6, key: 'patients', name: 'Pacientes' }` → `parentModule` con esos tres campos; **la clave `parent_module` ausente es una respuesta inválida** («Obligatorio y anulable»: obligatorio, sin `.optional()`); `parent_module.id` es un «entero positivo» (0, negativo, decimal y texto se rechazan); `key` y `name` son texto. Añadir `parent_module: null` a los DTO que ya arma ese archivo.
- [X] T003 [P] Crear `src/features/modules/policy/moduleHierarchy.test.ts` (debe fallar primero) con [data-model.md](data-model.md) §3: **`eligibleParents(modules, { typeId, excludeModuleId })`** — de la lista dada devuelve solo los módulos «de primer nivel (`parentModule === null`), del tipo pedido, con clave no protegida y distintos de `excludeModuleId`, ordenados por `sortOrder` y nombre», como `ParentModuleRef` `{ id, key, name }`; casos: submódulos fuera, otro tipo fuera, `users`/`roles`/`permissions`/`modules` fuera, el propio módulo fuera, empate de orden resuelto por nombre; lista vacía. **`submoduleCountOf(modules, moduleId)`** — cuántos módulos de la lista tienen `parentModule.id === moduleId` (0 si ninguno o si el id no existe).
- [X] T004 En `src/features/modules/schemas/systemModule.ts` (hace pasar T002): añadir y exportar `ParentModuleRef` (`{ id: entero positivo, key: texto, name: texto }`) y, en `systemModuleSchema`, `parent_module` = esa referencia anulable y **obligatoria**, convertida a `parentModule: ParentModuleRef | null`. El resto del esquema, `PROTECTED_MODULE_KEYS` e `isProtectedModule` no cambian.
- [X] T005 Hacer que el simulador y las fábricas entreguen el campo (sin esto, T004 deja en rojo todo lo que lee módulos): en `src/test/handlers/modulesCatalog/model.ts`, `CatalogModule` gana `parentModuleId: number | null` (por omisión `null` en `catalogModule()`) y `toModuleDto` devuelve `parent_module: null` o `{ id, key, name }` del padre (buscado en el mismo mapa de módulos); en `src/test/factories.ts`, el tipo `ModuleDto` gana `parent_module: { id: number; key: string; name: string } | null` y `moduleDto()` lo deja en `null` por omisión. Añadir a `src/test/handlers/modulesCatalog/model.test.ts` los casos del DTO (primer nivel → `null`; submódulo → referencia al padre).
- [X] T006 [P] Crear `src/features/modules/policy/moduleHierarchy.ts` (hace pasar T003) con `eligibleParents` y `submoduleCountOf` según [data-model.md](data-model.md) §3; importa `isProtectedModule` y los tipos de `../schemas/systemModule`. Funciones puras, sin React.
- [X] T007 **Checkpoint**: `npm run typecheck` y `npm test -- src/features/modules src/features/roles src/features/subscriptions src/app/router/modules src/test/handlers --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000` en verde. Si alguna prueba arma un DTO de módulo a mano y falla por la clave faltante, añadirle `parent_module: null` (no cambiar nada más). `roles` y `subscriptions` deben pasar **sin tocarse** (FR-019: sus esquemas descartan el campo nuevo).

**Checkpoint**: modelo y datos de prueba listos; la pantalla se comporta exactamente como antes; suite en verde.

---

## Phase 3: User Story 1 - Ver los submódulos anidados bajo su módulo (Priority: P1) 🎯 MVP

**Goal**: la lista de «Módulos» muestra cada submódulo inmediatamente debajo de su padre, con un nivel de sangría, dentro del grupo de su tipo; cada padre se contrae y se expande (empieza expandido) e indica cuántos submódulos tiene; los contadores distinguen módulos de submódulos; la búsqueda y los filtros conservan la jerarquía; y un submódulo cuyo padre no forma parte de la vista aparece bajo una fila de contexto.

**Independent Test**: con un catálogo que tenga un módulo con varios submódulos, otro sin ninguno y módulos de ambos tipos, abrir «Módulos» y comprobar que cada submódulo aparece bajo su padre en el grupo de su tipo, que contraer y expandir el padre oculta y muestra sus submódulos, y que un módulo sin submódulos se ve como antes.

### Tests for User Story 1 (escribir primero; deben fallar)

- [X] T008 [P] [US1] Crear `src/features/modules/policy/buildModuleTree.test.ts` con los casos de [data-model.md](data-model.md) §3 (`buildModuleTree` y `flattenModuleTree`), cada uno atado a su escenario del spec: (1) «Pacientes» con cuatro submódulos → los cuatro como `submodule` bajo él, ninguno como raíz (US1-1); (2) dos grupos, Sistema primero, un submódulo dentro del grupo de su padre, y un grupo sin filas no aparece (US1-4); (3) raíces y hermanos por `sortOrder` y luego nombre, con `localeCompare` en español (US1-5, FR-005); (4) `moduleCount` = filas `module` y `submoduleCount` = filas `submodule` por grupo, **las filas `context` no cuentan** (FR-007); (5) `childCount` = submódulos del módulo en la lista cargada; (6) búsqueda sin espacios sobrantes y sin distinguir mayúsculas sobre `name` y `key`: el padre que coincide va con todos sus submódulos; el padre que no coincide pero tiene un submódulo que sí → fila `context` con motivo `search` y solo ese submódulo; un submódulo que coincide con su padre fuera de la lista → fila `context` con motivo `otherView` armada con su `parentModule` y solo los submódulos que coinciden; sin coincidencias, nada (FR-008); (7) el filtro de tipo nunca separa a un submódulo de su padre; (8) sin búsqueda, las raíces con padre ausente llevan su fila `context` `otherView` (FR-009), ordenada entre las raíces por el menor `sortOrder` de sus submódulos a la vista; (9) datos inesperados: un submódulo cuyo padre es a su vez submódulo se coloca bajo su padre directo a profundidad 2, y un ciclo A↔B no lanza y deja ambos al final como de primer nivel; (10) `flattenModuleTree`: devuelve la lista plana con `depth`; omite a los descendientes de un id contraído; **ignora lo contraído cuando `searching` es verdadero**; una fila `context` nunca se contrae. Absorber aquí todos los casos de `src/features/modules/policy/filterModules.test.ts` (tipo `all`/`system`/`clinic`, búsqueda por nombre y por clave).
- [X] T009 [P] [US1] Crear `src/features/modules/hooks/useCollapsedModules.test.tsx` (con `renderHook`): empieza vacío (todo expandido); `toggle(id)` contrae y vuelve a expandir; `expand(id)` quita al id sin afectar a los demás y no falla si no estaba; el estado no se persiste (un hook nuevo vuelve a empezar vacío) — research D6.
- [X] T010 [P] [US1] Ampliar `src/test/handlers/modulesCatalog/model.test.ts` con la regla de disponibilidad de la lista de [contracts/modules-service-changes.md](contracts/modules-service-changes.md) §2: `listModules({ statusId: 1 })` **no** devuelve un submódulo cuyo padre no está Activo; `listModules({ statusId: 2 })` incluye un submódulo solo si él mismo está Bloqueado (aunque su padre esté Activo o Bloqueado); un módulo de primer nivel no se ve afectado; el orden sigue siendo `sortOrder` y nombre.
- [X] T011 [P] [US1] Crear `src/features/modules/components/ModuleNameCell.test.tsx` según [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md) §2 y §3: un módulo con `childCount > 0` muestra un `button` de nombre accesible «{n} submódulo(s) de {Módulo}» (singular con 1) con `aria-expanded` y el texto visible «{n} submódulo(s)» **contenido en su nombre** (WCAG 2.5.3); Enter y Espacio lo alternan y llaman a `onToggle` una vez; sin submódulos no hay botón pero sí un hueco; con `searching` no hay botón y queda solo el texto «{n} submódulos»; un submódulo antepone un texto solo para lector de pantalla «Submódulo de {Padre}»; la marca «Base» sigue saliendo para las claves protegidas.
- [X] T012 [P] [US1] Crear `src/features/modules/components/ModuleTreeRows.test.tsx`: una fila `module`/`submodule` conserva lo de hoy (orden, nombre, clave, «Base», tipo, chips de permisos en el orden Ver, Crear, Modificar, Eliminar, y el botón «Editar» solo con `canEdit`); una fila `context` es atenuada, no tiene botón ni chips y muestra el aviso de cada motivo («Está en «Activos»» / «Está en «Bloqueados»» según la vista, y «Su submódulo coincide con la búsqueda»); todas las filas están dentro de una `table` con rol `row`.
- [X] T013 [P] [US1] Actualizar `src/features/modules/components/ModulesTable.test.tsx` para la nueva forma de la tabla (recibe `groups`, `collapsed`, `onToggle`, `searching`, `status`): encabezados de grupo con los conteos de módulos y submódulos («· 9 módulos y 4 submódulos» y «· 9 módulos» sin submódulos), un grupo sin filas no se pinta, contraer oculta las filas hijas, con `searching` se pintan todas. Conservar los casos de los grupos y columnas de hoy.
- [X] T014 [US1] Ampliar `src/features/modules/components/ModulesPage.test.tsx` (usa el simulador): los submódulos aparecen bajo su padre; contraer y expandir con el teclado; el contador de la lista distingue módulos de submódulos («23 módulos y 2 submódulos activos»; sin submódulos, «23 módulos activos»); buscar el nombre de un submódulo muestra a su padre atenuado y sin botón de contraer, y limpiar la búsqueda recupera lo contraído; el filtro de tipo no separa a un submódulo de su padre; en «Bloqueados» un submódulo bloqueado con padre Activo sale bajo una fila de contexto «Está en «Activos»», se puede editar y no cuenta; axe sin violaciones con el árbol expandido y con filas de contexto.
- [X] T015 [P] [US1] Crear `src/app/router/modules/submodulesTree.integration.test.tsx` (misma forma que `modulesList.integration.test.tsx`): recorrido de US1 completo sobre la ruta `/modules` con el simulador — árbol inicial, contraer/expandir, padre bloqueado (el padre y sus submódulos Activos salen de «Activos»; los Bloqueados quedan en «Bloqueados» bajo su contexto; al desbloquear el padre todo vuelve), filtros y búsqueda.

### Implementation for User Story 1

- [X] T016 [US1] En `src/test/handlers/modulesCatalog/model.ts`, hacer que `listModules` aplique la regla de disponibilidad (hace pasar T010): un submódulo cuyo padre no está Activo no sale entre los Activos, y entre los Bloqueados solo si él mismo lo está; nada más cambia (lo lee `reads.ts` sin tocarse).
- [X] T017 [US1] Crear `src/features/modules/policy/buildModuleTree.ts` (hace pasar T008) con `buildModuleTree(modules, { type, search })` y `flattenModuleTree(nodes, { collapsed, searching })` y los tipos `ModuleTreeGroup`, `ModuleTreeNode` y `ModuleTreeRow` **tal como los define [data-model.md](data-model.md) §3**; recursivo con protección de ciclos; sin React. **Eliminar** `src/features/modules/policy/filterModules.ts` y `filterModules.test.ts` (sus casos ya están en T008) y buscar con Grep que nada más los importe.
- [X] T018 [P] [US1] Crear `src/features/modules/hooks/useCollapsedModules.ts` (hace pasar T009): `useState<ReadonlySet<number>>` vacío; devuelve `{ collapsed, toggle, expand }`; sin `useCallback`, sin persistencia (research D6).
- [X] T019 [US1] En `src/shared/messages/es.ts`, bloque `modules`: (a) `count.active(modules, submodules)` y `count.blocked(modules, submodules)`: «{m} módulo(s)» y, si `submodules > 0`, « y {s} submódulo(s)», y al final «activo(s)»/«bloqueado(s)» concordando con el último sustantivo (1 → singular): «23 módulos activos», «1 módulo bloqueado», «23 módulos y 5 submódulos activos»; (b) `groups.system(m, s)` y `groups.clinic(m, s)` con el mismo formato («Clínica, aplicación para clínicas · 9 módulos y 4 submódulos»; sin la segunda parte si `s` es 0); (c) un bloque nuevo `tree` con `submodulesButton(n)` («{n} submódulo(s)»), `submodulesOf(n, name)` («{n} submódulo(s) de {name}»), `submoduleOf(parentName)` («Submódulo de {parentName}»), `contextOtherView(view)` («Está en «Activos»»/«Está en «Bloqueados»» según la vista) y `contextSearch` («Su submódulo coincide con la búsqueda»). Cambiar en `src/app/router/modules/blockModule.integration.test.tsx` la única aserción afectada: «1 módulos bloqueados» → «1 módulo bloqueado».
- [X] T020 [US1] Crear `src/features/modules/components/ModuleNameCell.tsx` (hace pasar T011) según [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md) §2 a §4: relleno izquierdo de un nivel por profundidad (la mitad a 320 px, con un breakpoint de `sx`); `IconButton` pequeño con `aria-expanded` y `aria-label` de `tree.submodulesOf`, con `Icon name="arrow-drop-down" decorative` girado −90° si está contraído y, junto a él, el texto visible de `tree.submodulesButton`; un hueco del mismo ancho si no hay submódulos; con `searching`, solo el texto de la cantidad; el texto para lector de pantalla `tree.submoduleOf` con el estilo «solo lectura de pantalla» que ya usa el proyecto (mirar `src/shared/ui/LiveStatus.tsx`; si no hay uno exportable, escribirlo en `sx`); nombre en negrita, marca «Base» (`isProtectedModule`) y clave monoespaciada como hoy.
- [X] T021 [US1] Crear `src/features/modules/components/ModuleTreeRows.tsx` (hace pasar T012): recibe la lista plana de `flattenModuleTree` y pinta cada fila — módulo y submódulo con las mismas celdas que hoy (usando `ModuleNameCell`); contexto atenuado con el color de texto secundario del tema (no el de «deshabilitado», que no cumple el contraste AA) y cursiva, con nombre, clave y su aviso, y celdas vacías. `key` por id del módulo (`context-{id}` en las de contexto). El tipo de un módulo se escribe igual que hoy.
- [X] T022 [US1] Reescribir `src/features/modules/components/ModulesTable.tsx` (hace pasar T013): recibe `groups: readonly ModuleTreeGroup[]`, `canEdit`, `onEdit`, `collapsed`, `onToggle`, `searching` y `status`; por grupo, el encabezado con `text.groups.*(moduleCount, submoduleCount)` y las filas de `flattenModuleTree(...)` pasadas a `ModuleTreeRows`; mismas 5 columnas y mismo `aria-label`; ≤ 250 líneas.
- [X] T023 [US1] Cablear `src/features/modules/components/ModulesPage.tsx` (hace pasar T014 y T015): `buildModuleTree(query.data ?? [], { type: location.type, search: location.search })` en lugar de `filterModules` (y quitar su `useMemo`); `useCollapsedModules()`; el mensaje de vacío cuando los grupos no tienen filas; el contador con `text.count.active/blocked(modules, submodules)` sumando los grupos; pasar a la tabla `collapsed`, `onToggle`, `searching={location.search !== ''}` y `status={location.status}`. `nextSortOrder` y los paneles no cambian todavía.
- [X] T024 [US1] **Checkpoint**: `npm test -- src/features/modules src/app/router/modules src/test/handlers --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`, `npm run typecheck` y `npm run lint` en verde. En particular, los escenarios de módulos de primer nivel de 013, 021 y 022 siguen dando el mismo resultado (SC-007).

**Checkpoint**: la lista en árbol funciona de solo lectura, con contraer, búsqueda, filtros y contexto. Es el MVP.

---

## Phase 4: User Story 2 - Elegir, cambiar o quitar el módulo padre (Priority: P2)

**Goal**: al crear o editar un módulo, la persona elige su padre (o «Ninguno»), lo cambia o lo quita, y al guardar el módulo aparece en su nueva posición, con su nuevo padre expandido; las opciones solo son padres válidos; el campo se bloquea cuando corresponde; y cada rechazo del servicio se muestra en español junto al campo, sin perder lo escrito.

**Independent Test**: crear un módulo de Clínica eligiendo como padre «Pacientes» y verlo anidado; editarlo para cambiarle el padre y luego quitárselo; comprobar que cada cambio se ve en el árbol sin recargar la página.

### Tests for User Story 2 (escribir primero; deben fallar)

- [X] T025 [P] [US2] Ampliar `src/features/modules/schemas/moduleForm.test.ts` con [data-model.md](data-model.md) §2: `initialModuleFormValues.parentModuleId === ''`; `toFormValues(module)` da `''` sin padre y `String(module.parentModule.id)` con él; `toCreateModuleBody` agrega `parent_module_id` (número) **solo si el formulario tiene un padre elegido**; `toUpdateModuleBody` agrega `parent_module_id` solo si cambió respecto de `initial.parentModule?.id`, con el número nuevo o **`null` para quitarlo**, y devuelve `null` (nada que enviar) si no cambió ningún campo; un cambio solo de padre ya cuenta; `key` y `type_id` nunca viajan en una modificación.
- [X] T026 [P] [US2] Ampliar `src/features/modules/api/moduleErrors.test.ts` con la tabla de [contracts/modules-service-changes.md](contracts/modules-service-changes.md) §4 (solo creación y edición): `module_parent_not_found`, `module_parent_is_submodule`, `module_parent_type_mismatch`, `module_parent_self_reference` y `module_has_submodules` (en `update`) → `kind: 'field'` con el campo `parentModuleId` y su texto propio; `module_protected` en `create`/`update` → error en el padre (con `block` y `delete` sigue dando el aviso de siempre); `validation_error` con `parent_module_id` → campo `parentModuleId`; el `message` del servicio no aparece nunca en el resultado.
- [X] T027 [US2] Ampliar `src/test/handlers/modulesCatalog/model.test.ts` con las reglas de creación y modificación de [contracts/modules-service-changes.md](contracts/modules-service-changes.md) y del catálogo de errores de la API, en su **orden de precedencia**: crear con `parent_module_id`: 404 `module_parent_not_found` (no existe o está Eliminado) → 409 `module_protected` (el padre es protegido) → 409 `module_parent_is_submodule` → 409 `module_parent_type_mismatch` → conflictos de clave y nombre → creado con `parent_module`; modificar: 404 `module_not_found` → 404 `module_parent_not_found` → 409 `module_parent_self_reference` → 409 `module_protected` (el módulo es protegido y recibiría un padre; el padre es protegido) → `module_parent_is_submodule` → `module_parent_type_mismatch` → `module_has_submodules` (el módulo tiene submódulos y recibiría un padre) → `module_name_already_exists`; `parent_module_id: null` quita el padre y solo comprueba el 404 del módulo; un padre Bloqueado se admite; una solicitud rechazada no cambia ningún campo; `parent_module_id` no entero → 422 con el campo `parent_module_id`.
- [X] T028 [P] [US2] Crear `src/features/modules/hooks/useParentModuleOptions.test.tsx` (con el simulador, como `useModulesLocation.test.tsx`): devuelve las opciones de `eligibleParents` sobre la consulta de **Activos**; cambia con el `typeId`; excluye `excludeModuleId`; informa `isLoading` y `isError`; estando la pantalla en «Bloqueados» sigue ofreciendo padres activos.
- [X] T029 [P] [US2] Crear `src/features/modules/components/ModuleParentField.test.tsx` según [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md) §5: etiqueta «Módulo padre»; primera opción «Ninguno (módulo de primer nivel)» con valor vacío; elegir una opción actualiza el valor; el padre actual se agrega como opción si no figura entre las ofrecidas (p. ej. Bloqueado); deshabilitado con su explicación «Este módulo tiene submódulos, así que no puede tener un módulo padre.» o «Los módulos base de administración no tienen módulo padre.»; cargando («Cargando módulos…») y error («No se pudieron cargar los módulos padre.») deshabilitan solo este campo; muestra el error del servicio debajo; operable con teclado; axe sin violaciones.
- [X] T030 [US2] Ampliar `src/features/modules/components/ModuleCreatePanel.test.tsx`: el campo aparece con «Ninguno» elegido; las opciones son solo padres del tipo elegido (primer nivel, activos, no módulos base); **cambiar el tipo limpia un padre elegido** y actualiza las opciones; el cuerpo enviado lleva `parent_module_id` solo si hay padre; un 409/404 del padre aparece en el campo, el formulario conserva lo escrito y el foco va al campo; tras crear con padre se llama a `onParentAssigned(id)`.
- [X] T031 [US2] Ampliar `src/features/modules/components/ModuleEditPanel.test.tsx`: asignar un padre a un módulo de primer nivel, cambiarlo y quitarlo (cuerpo con el número y con `null`); el campo deshabilitado con submódulos a la vista y en los cuatro módulos base; el padre Bloqueado actual se ve como valor; cada rechazo del servicio (`module_parent_not_found`, `module_parent_is_submodule`, `module_parent_type_mismatch`, `module_has_submodules`, `module_protected`) aparece en el campo y no pierde lo escrito; tras guardar con un padre nuevo se llama a `onParentAssigned(id)`; las pruebas que ya existen (clave y tipo fijos, acciones, descartar) siguen pasando con `ModuleFixedInfo`.
- [X] T032 [P] [US2] Ampliar `src/app/router/modules/createModule.integration.test.tsx` con el alta de un submódulo de punta a punta (US2-1 a US2-3): elegir el tipo, elegir el padre, crear y ver el módulo anidado bajo su padre ya expandido; cambiar el tipo limpia el padre; un padre eliminado por otra sesión da el error en el campo y refresca la lista.
- [X] T033 [P] [US2] Ampliar `src/app/router/modules/editModule.integration.test.tsx` con US2-4 a US2-9: convertir un módulo en submódulo (aparece bajo el padre, expandido), cambiar de padre, quitarlo (pasa a primer nivel en su grupo); campo deshabilitado con submódulos y en módulos base; padre Bloqueado como valor actual; rechazos del servicio por campo.

### Implementation for User Story 2

- [X] T034 [US2] En el simulador (hace pasar T027): `src/test/handlers/modulesCatalog/model.ts` (`ModuleInput` y `ModuleChanges` ganan `parent_module_id`; `createModule` y `updateModule` aplican las reglas y el orden de T027 y guardan `parentModuleId`), `src/test/handlers/modulesCatalog/validation.ts` (`parent_module_id` debe ser un entero positivo o `null`; si no, error de campo `parent_module_id`; un campo `parent_module` en la solicitud se rechaza) y `src/test/handlers/modulesCatalog/create.ts` / `update.ts` (pasan el campo del cuerpo al modelo).
- [X] T035 [US2] En `src/features/modules/schemas/moduleForm.ts` (hace pasar T025): `parentModuleId: z.string()` en `moduleFormSchema` (sin validación local: `''` = ninguno), `CreateModuleBody.parent_module_id?: number`, `UpdateModuleBody.parent_module_id?: number | null`, y las tres funciones (`toFormValues`, `toCreateModuleBody`, `toUpdateModuleBody`) según T025; `initialModuleFormValues.parentModuleId = ''`.
- [X] T036 [US2] En `src/features/modules/api/moduleErrors.ts` (hace pasar T026): `ModuleFormField` gana `'parentModuleId'`, `FORM_FIELDS` mapea `parent_module_id` → `parentModuleId`, y `describeModuleError` traduce los códigos de [contracts/modules-service-changes.md](contracts/modules-service-changes.md) §4 para `create` y `update` (el código decide; nunca el `message` del servicio); en `src/shared/messages/es.ts` añadir en `modules.errors` y `modules.errors.fields` los textos de esa tabla (`parentNotFound`, `parentIsSubmodule`, `parentTypeMismatch`, `parentSelfReference`, `parentProtected`, `hasSubmodulesAsChild` y `parent` para la validación), y los de `modules.form.fields`: `parent` («Módulo padre»), `parentNone` («Ninguno (módulo de primer nivel)»), `parentHelp` («Opcional. Un submódulo es del mismo tipo que su módulo padre.»), `parentLoading`, `parentLoadError`, `parentLockedWithChildren` y `parentLockedBase` (textos exactos de [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md) §5); en `src/features/modules/components/applyModuleRefusal.ts`, `parentModuleId` en el orden de los campos de la pantalla.
- [X] T037 [P] [US2] Crear `src/features/modules/hooks/useParentModuleOptions.ts` (hace pasar T028): `useParentModuleOptions({ typeId, excludeModuleId })` usa `useModulesCatalog(MODULE_STATUS.ACTIVE)` y `eligibleParents`, y devuelve `{ options, isLoading, isError }`. Tipos explícitos en el retorno (constitución II).
- [X] T038 [US2] Crear `src/features/modules/components/ModuleParentField.tsx` (hace pasar T029): `TextField select` con `Controller` de React Hook Form sobre `parentModuleId`, con las opciones y los estados de T029; recibe `control`, `options`, `status` (`'loading' | 'error' | 'ready'`), `currentParent`, `lockedReason` y el error; el valor de cada opción es el id como texto.
- [X] T039 [US2] **Extraer antes de añadir**: crear `src/features/modules/components/ModuleFixedInfo.tsx` con el bloque de clave y tipo fijos que hoy está en `ModuleEditPanel.tsx` (las dos columnas «Clave» y «Tipo» y el texto «La clave y el tipo no cambian nunca.»), y usarlo desde el panel sin cambiar el comportamiento; `ModuleEditPanel.test.tsx` debe seguir pasando (el panel tiene 244 de 250 líneas: research D10).
- [X] T040 [US2] En `src/features/modules/components/ModuleEditPanel.tsx` (hace pasar T031): gana las props `submoduleCount: number` y `onParentAssigned?: (parentModuleId: number) => void`; renderiza `ModuleParentField` debajo del orden y antes de las acciones, con las opciones de `useParentModuleOptions({ typeId: module.typeId, excludeModuleId: module.id })`, el padre actual (`module.parentModule`), y deshabilitado con `lockedReason` cuando `module.parentModule === null && (submoduleCount > 0 || isProtectedModule(module.key))` (research D9); tras un guardado con un padre nuevo llama a `onParentAssigned`. Verificar que el archivo queda por debajo de 250 líneas.
- [X] T041 [US2] En `src/features/modules/components/ModuleCreatePanel.tsx` (hace pasar T030): renderiza `ModuleParentField` con las opciones del tipo elegido (`useWatch` de `type`); **al cambiar el tipo, si hay un padre elegido, lo limpia** (`setValue('parentModuleId', '')`); gana la prop `onParentAssigned?` y la llama tras crear con padre.
- [X] T042 [P] [US2] En `src/features/modules/hooks/useCreateModule.ts` y `useUpdateModule.ts`: invalidar `moduleKeys.all` en `onSettled` en lugar de `onSuccess` (research D13), para que un rechazo por cambios simultáneos refresque la lista; ajustar su comentario.
- [X] T043 [US2] En `src/features/modules/components/ModulesPage.tsx` (hace pasar T032 y T033): calcular `submoduleCountOf(query.data ?? [], editing.id)` y pasarlo a `ModuleEditPanel` junto con `onParentAssigned={expand}` (de `useCollapsedModules`); pasar `onParentAssigned={expand}` también a `ModuleCreatePanel`. Verificar que el archivo queda por debajo de 250 líneas.
- [X] T044 [US2] **Checkpoint**: `npm test -- src/features/modules src/app/router/modules src/test/handlers --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`, `npm run typecheck` y `npm run lint` en verde.

**Checkpoint**: se puede crear un submódulo, asignar, cambiar y quitar el padre, con los rechazos del servicio explicados en el campo.

---

## Phase 5: User Story 3 - Bloquear, desbloquear y eliminar un módulo con submódulos (Priority: P3)

**Goal**: la zona de bloqueo de un módulo con submódulos activos avisa cuántos quedarán sin disponibilidad; bloquear y desbloquear se reflejan en la lista; y «Eliminar módulo» no está disponible mientras haya submódulos a la vista (con el rechazo del servicio cubriendo los que no se ven).

**Independent Test**: con un módulo que tiene submódulos, ver el aviso al bloquearlo, comprobar que sus submódulos dejan de verse entre los activos y vuelven al desbloquearlo, e intentar eliminarlo.

### Tests for User Story 3 (escribir primero; deben fallar)

- [ ] T045 [US3] Ampliar `src/features/modules/components/ModuleEditPanel.test.tsx` (las pruebas de la zona de bloqueo viven ahí): con `submoduleCount = n > 0` y el módulo Activo, un texto dice cuántos submódulos quedarán sin disponibilidad («Si lo bloqueas, {n} submódulo(s) dejarán de estar disponibles hasta que lo desbloquees; conservan su propio estatus.»); con `n > 0` no hay botón «Eliminar módulo» y aparece «Este módulo tiene submódulos. Para eliminarlo, primero elimina sus submódulos o cámbialos de padre.»; con `n = 0` la zona es la de siempre; los módulos base conservan su aviso.
- [ ] T046 [P] [US3] Ampliar `src/test/handlers/modulesCatalog/model.test.ts` con la regla de eliminación: `deleteModule` de un módulo con submódulos no eliminados (Activos o Bloqueados) → 409 `module_has_submodules`, y **no** si todos están Eliminados; el orden de comprobación es el del catálogo de errores (`module_protected` antes de comprobar que existe, luego 404 `module_not_found`, luego `module_has_submodules`); un módulo sin submódulos se elimina como antes.
- [ ] T047 [P] [US3] Ampliar `src/app/router/modules/blockModule.integration.test.tsx` con US3-1, US3-2 y US3-5: aviso con la cantidad en la zona de bloqueo; bloquear al padre saca a sus submódulos de «Activos» y desbloquearlo los devuelve; bloquear o eliminar un submódulo no cambia a su padre y, si era el único, el padre pierde el botón de contraer.
- [ ] T048 [P] [US3] Ampliar `src/app/router/modules/deleteModule.integration.test.tsx` con US3-3 y US3-4: un padre con submódulos a la vista no ofrece eliminar; el servicio rechaza eliminar un padre cuyos submódulos no se ven (Bloqueados, o recién asignados por otra sesión) y la pantalla muestra el mismo mensaje y no elimina nada.
- [ ] T049 [US3] Ampliar `src/features/modules/api/moduleErrors.test.ts` (mismo archivo que T026: después de él): `module_has_submodules` en `delete` → mensaje general «Este módulo tiene submódulos y no se puede eliminar: primero elimínalos o cámbialos de padre.» (no un error de campo); en `block` y `unblock` no aplica.

### Implementation for User Story 3

- [ ] T050 [US3] En `src/test/handlers/modulesCatalog/model.ts` (hace pasar T046): `deleteModule` rechaza con 409 `module_has_submodules` (mensaje de la API: «El módulo «{key}» tiene submódulos y no se puede eliminar: primero hay que eliminarlos o cambiarlos de padre.») en el orden de T046.
- [ ] T051 [US3] En `src/features/modules/api/moduleErrors.ts` (hace pasar T049): `module_has_submodules` con la operación `delete` → resultado general (añadir la clase `'conflict'` a `ModuleErrorOutcome`) con su texto de `src/shared/messages/es.ts` (`modules.errors.hasSubmodules`); en `src/features/modules/hooks/useDeleteModule.ts`, invalidar en `onSettled` (research D13).
- [ ] T052 [US3] En `src/features/modules/components/ModuleDangerZone.tsx` (hace pasar T045, T047 y T048): gana la prop `submoduleCount: number`; con el módulo Activo y `submoduleCount > 0`, el texto de aviso de `modules.blockSection.submodulesNotice(n)` bajo la ayuda del bloqueo; con `submoduleCount > 0`, en lugar del botón «Eliminar módulo» el texto `modules.blockSection.deleteBlockedBySubmodules` (textos de [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md) §6, en `es.ts`); el aviso de error de la eliminación usa el resultado de T051. En `ModuleEditPanel.tsx`, pasarle `submoduleCount`. Verificar ≤ 250 líneas en ambos archivos.
- [ ] T053 [US3] **Checkpoint**: `npm test -- src/features/modules src/app/router/modules src/test/handlers --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`, `npm run typecheck` y `npm run lint` en verde.

**Checkpoint**: bloquear, desbloquear y eliminar módulos con submódulos tiene avisos claros y reglas coherentes con el servicio.

---

## Phase 6: User Story 4 - Usar el árbol con teclado, lector de pantalla y pantallas angostas (Priority: P3)

**Goal**: cualquier persona puede leer la jerarquía y contraer, expandir y editar módulos y submódulos con teclado o lector de pantalla, y la lista sigue legible en pantallas angostas sin desplazamiento horizontal de la página. La estructura accesible (botón nativo, `aria-expanded`, nombre que contiene el texto visible, «Submódulo de {Padre}») ya se construyó en US1; esta fase la verifica y corrige.

**Independent Test**: recorrer la lista solo con el teclado y con un lector de pantalla; reducir el ancho de la ventana al mínimo admitido.

- [ ] T054 [P] [US4] En `src/features/modules/components/ModulesPage.test.tsx`, pruebas de teclado (US4-1, FR-017) con `user-event`: Tab llega al botón de contraer de cada padre y al botón «Editar» de cada fila, en orden visual; Enter y Espacio contraen y expanden; el foco **no se mueve** al alternar; con una búsqueda activa no hay botón de contraer y Tab sigue llegando a todos los «Editar».
- [ ] T055 [P] [US4] En `src/features/modules/components/ModulesPage.test.tsx`, pruebas de lo que anuncia un lector de pantalla (US4-2, FR-017): el botón de un padre tiene nombre «3 submódulos de Pacientes» y `aria-expanded` correcto en ambos estados; cada submódulo expone «Submódulo de Pacientes» antes de su nombre; una fila de contexto se lee con su aviso; axe sin violaciones en cuatro estados (expandido, contraído, búsqueda con contexto, vista «Bloqueados» con contexto), también en tema oscuro si el arnés de pruebas lo permite.
- [ ] T056 [US4] Verificar la presentación real (US4-3, FR-017) con un arnés desechable en Chromium (no se versiona; como en la feature 023): ancho de 1440, 1024, 768, 375 y 320 px, en tema claro y oscuro, con el catálogo de ejemplo de [quickstart.md](quickstart.md) §3 — sin desplazamiento horizontal de la **página**, sangría legible (a 320 px, la mitad), texto de la fila de contexto con contraste AA en ambos temas, y el botón de contraer con el foco visible. Corregir en `ModuleNameCell.tsx` y `ModuleTreeRows.tsx` lo que aparezca y, si es una regla de diseño (un ancho mínimo, un salto de línea), anotarla en [contracts/modules-tree-ui.md](contracts/modules-tree-ui.md) §4.
- [ ] T057 [US4] **Checkpoint**: `npm test -- src/features/modules src/app/router/modules --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000` en verde, sin violaciones de axe.

**Checkpoint**: la jerarquía es operable con teclado, lector de pantalla y pantallas angostas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T058 [P] Ampliar `e2e/modules.spec.ts` con un escenario (el del [quickstart.md](quickstart.md) §2): crear un módulo de prueba como submódulo de otro, verlo anidado bajo su padre y limpiar (eliminar primero el submódulo y después el padre). Debe omitirse sola sin las cuentas de Auth0 de prueba, como el resto de la suite. **No se ejecuta aquí** (no hay cuentas): anotar en el cierre que quedó sin correr.
- [ ] T059 Revisión de higiene: con Grep, que nada importe `filterModules`; que ningún archivo de `src/features/modules/components/` supere 250 líneas (`ModuleEditPanel.tsx`, `ModulesPage.tsx`, `ModulesTable.tsx`, `ModuleDangerZone.tsx`); que el código nuevo no use `useMemo`, `useCallback`, `any`, `as` ni `console.*`; y que no queden literales de texto en JSX ni `TODO` sin issue.
- [ ] T060 Verificar la documentación: `.env.example` y `README.md` **sin cambios** (sin variables nuevas), y el contrato [contracts/modules-service-changes.md](contracts/modules-service-changes.md) y el de interfaz coinciden con lo implementado (textos de `es.ts`, nombres accesibles, orden de los códigos de error); si algo difirió al implementar, corregir el contrato.
- [ ] T061 Puertas de CI completas, en este orden y de una en una: `npm run typecheck`, `npm run lint` (0 advertencias), `npm run format:check`, `npm run test:coverage -- --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000` (umbral del 80 % en `api`/`schemas`/`policy`/`hooks`; ~30 min), `npm run build` y la verificación del tamaño del bundle (presupuesto de 320 KB gzip; la ruta de Módulos ya es diferida y no se añadieron dependencias), `npm audit --omit=dev`. Si alguna prueba falla, aislarla con `--maxWorkers=1` antes de dar por rota la feature (hay pruebas con tiempos ajustados, ver las notas de ejecución del proyecto).
- [ ] T062 Recorrido manual completo de [quickstart.md](quickstart.md) §4 (V1 a V28) con la API de usuarios en su versión **5.4.0** (commit `2e17ecb` de `mailySoft-usuarios`, migración `0012_module_submodules` aplicada) corriendo en el puerto 8000, `npm run dev` y una cuenta con todos los permisos de módulos; incluye V28 (Roles y Suscripciones no cambian). **Lo hace una persona**: necesita la API y la sesión real. Anotar el resultado y los hallazgos aquí.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sin dependencias.
- **Foundational (T002–T007)**: depende de Setup. **Bloquea todas las historias**.
- **US1 (T008–T024)**: depende de Foundational. Es el MVP.
- **US2 (T025–T044)**: depende de Foundational y, para el cableado de la página, de US1 (`useCollapsedModules` y `ModulesPage`).
- **US3 (T045–T053)**: depende de US2 (`ModuleEditPanel`, `moduleErrors.ts`, `es.ts` y el simulador son los mismos archivos).
- **US4 (T054–T057)**: depende de US1 (la estructura accesible ya está) y conviene hacerla al final para verificar también US2 y US3.
- **Polish (T058–T062)**: depende de las historias que se vayan a entregar.

### Dentro de cada historia

- Las pruebas se escriben primero y deben fallar; después la lógica pura (`policy`, `schemas`, `api`), después los hooks, después los componentes, y por último el cableado de la página.
- Archivos compartidos entre tareas de una misma fase (`es.ts`, `model.ts`, `model.test.ts`, `ModulesPage.test.tsx`, `ModuleEditPanel.test.tsx`, `moduleErrors.test.ts`): **en el orden de los números**, aunque otras tareas de la fase sean `[P]`.
- El checkpoint de cada historia se cierra antes de empezar la siguiente.

### Parallel Opportunities

- **Foundational**: T002 y T003 (pruebas) juntas; T006 puede ir con T004 y T005.
- **US1, pruebas**: T008, T009, T010, T011, T012, T013 y T015 son de archivos distintos; T014 espera a T013 si se quiere ver primero la tabla.
- **US1, implementación**: T018 puede ir con T016 y T017; T020 y T021 son de archivos distintos pero T022 las necesita.
- **US2, pruebas**: T025, T026, T028, T029, T032 y T033 juntas; T027, T030 y T031 por separado (archivos que otras tareas también tocan).
- **US2, implementación**: T037 y T042 son independientes de la lógica de formulario; T038 necesita T037 y T036.

```text
# Ejemplo — pruebas de US1 en paralelo (archivos distintos):
Task: "T008 buildModuleTree.test.ts"      Task: "T009 useCollapsedModules.test.tsx"
Task: "T011 ModuleNameCell.test.tsx"      Task: "T012 ModuleTreeRows.test.tsx"
Task: "T015 submodulesTree.integration.test.tsx"

# Después, en este orden (dependen uno del otro):
T017 (buildModuleTree.ts) → T020/T021 (celda y filas) → T022 (tabla) → T023 (página)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Fase 1: Setup.
2. Completar Fase 2: Foundational (modelo, simulador y funciones de jerarquía; la pantalla no cambia).
3. Completar Fase 3: User Story 1 (la lista en árbol, de solo lectura).
4. **DETENERSE y VALIDAR**: abrir «Módulos» con un catálogo que ya tenga submódulos (creados desde otro cliente de la API o con el simulador) y comprobar el árbol, contraer, búsqueda y contexto. Es el MVP: se ve la jerarquía, aunque todavía no se administra desde el Backoffice.

### Entrega incremental

1. Setup + Foundational → modelo listo, suite en verde, pantalla intacta.
2. US1 → el árbol (MVP).
3. US2 → crear y reubicar submódulos desde el Backoffice.
4. US3 → avisos y restricciones de bloqueo y eliminación.
5. US4 → teclado, lector de pantalla y pantallas angostas verificados.
6. Polish → puertas de CI y validación manual con la API real.

### Estrategia con varias personas

Con más de una persona: tras Foundational, las pruebas de cada fase `[P]` se reparten por archivo. Las implementaciones de US2 y US3 comparten archivos, así que van de una persona por vez; US4 puede empezar su verificación (T054, T055) en cuanto US1 esté lista. Si la feature 025 se trabaja a la par, cada una en su propio git worktree (cada carpeta con su `.specify/feature.json` y su `npm ci`).

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre sí.
- La etiqueta `[Story]` liga cada tarea con su historia del spec para trazabilidad.
- Las tareas de prueba van **antes** de su implementación y deben fallar primero; ver los checkpoints para saber qué debe estar en verde en cada punto.
- Confirmar el comportamiento de MUI contra el código instalado (`node_modules/@mui/material/TextField`, `IconButton`) si algo no cuadra; el `select` de `TextField` usa un `Select` con menú, no un `<select>` nativo.
- Si al implementar el simulador (T016, T034, T050) el catálogo de errores de la API (`mailySoft-usuarios/specs/017-module-submodules/contracts/error-catalog.md` §4) difiere de lo escrito aquí, **manda el catálogo de la API**.
- Hacer commit tras cada tarea o grupo lógico; no subir nada a `main` sin aprobación.
- Evitar: tareas vagas, conflictos de archivo entre tareas `[P]` y dependencias entre historias que rompan su prueba independiente.
