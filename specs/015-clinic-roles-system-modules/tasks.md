---

description: "Task list template for feature implementation"
---

# Tasks: Permisos de Módulos de Sistema para Roles de Clínica (Backoffice)

**Input**: Design documents from `/specs/015-clinic-roles-system-modules/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md) (sin `contracts/`: research.md R4 — ningún contrato de API cambia)

**Tests**: incluidas (Principio VII de la constitución: pruebas automatizadas en el mismo PR,
test-first para lógica pura). T001, T005 y T009(spec `014`) son correcciones de pruebas/documentación
que hoy describen la regla simétrica; T007 es una prueba de no-regresión (ya debe pasar antes y
después de T002, no "falla primero") que protege específicamente el riesgo nuevo que introduce R2
(el catálogo de Clínica se pide siempre, incluso para un role de Sistema). Las APIs se simulan con
MSW (`rolesCatalogScenario()`/`richClinicModulesScenario()`, ya existentes — research R5: ninguna
semilla nueva).

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (US1=P1, US2=P2, US3=P1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único existente: `src/` en la raíz del repo (`C:\Maily\code\maily-backoffice`), dentro de
la feature ya existente `src/features/roles` (spec `014`). Ningún archivo ni carpeta nuevos: esta
feature solo modifica archivos que ya existen (plan.md, Project Structure).

---

## Phase 1: Setup

No aplica: sin dependencias nuevas, sin rutas ni carpetas nuevas que inicializar (plan.md, Project
Structure). `npm ci` ya deja todo listo.

## Phase 2: Foundational

No aplica: ninguna historia depende de una pieza compartida nueva. Las tres historias de usuario
modifican, cada una, un archivo distinto (T002 ↔ `useRolePermissionMatrix.ts`; T006 ↔
`PermissionsMatrix.tsx`; T007 es solo una prueba) y ninguna bloquea a las otras dos a nivel de
código — ver "Dependencies & Execution Order" para la única dependencia real (de observación en la
app, no de código) entre US1 y US2.

---

## Phase 3: User Story 1 - Dar de alta personal de clínica con su propia cuenta de usuario (Priority: P1) 🎯 MVP

**Goal**: la matriz de permisos de un role de tipo Clínica incluye también los módulos de tipo
Sistema, y guardar un cambio en una de esas filas funciona igual que cualquier otra (FR-001).

**Independent Test**: abrir el detalle de un role de tipo Clínica, marcar un permiso de un módulo de
tipo Sistema en su matriz y guardar: se acepta sin error y queda marcado.

### Tests for User Story 1 ⚠️

> Deben fallar contra el código actual antes de T002.

- [X] T001 [US1] Actualizar `src/features/roles/hooks/useRolePermissionMatrix.test.ts` (research.md R5): (a) la prueba `'is empty for a type with no modules yet (Clínica, in the real local environment)'` (hoy espera `result.current.matrix` igual a `[]` al llamar `useRolePermissionMatrix(2, new Set())` contra `rolesCatalogScenario()`) se renombra para describir el comportamiento nuevo y cambia su aserción a que el resultado tenga longitud 4, con una fila cuyo `module.key` sea `'users'`; (b) la prueba `'builds a rich Clínica matrix when those modules exist'` (hoy espera `result.current.matrix?.length` igual a 3 contra `richClinicModulesScenario()`) cambia esa aserción a 7, y agrega una comprobación de que exista una fila con `module.key === 'users'` junto a la ya existente de `reminders`.

### Implementation for User Story 1

- [X] T002 [US1] Implementar en `src/features/roles/hooks/useRolePermissionMatrix.ts` (research.md R1/R2; data-model.md): llamar siempre, en cada render, tanto a `useModulesCatalog(1)` como a `useModulesCatalog(2)` (nunca condicionado por `typeId` — `RoleDetailPanel` no se remonta al cambiar de role, así que el número de Hooks no puede depender de su tipo). Cuando `typeId === 2`, llamar a `buildPermissionMatrix` dos veces (una con los módulos de `type_id=2` y `roleTypeId=2`, otra con los de `type_id=1` y `roleTypeId=1`) y concatenar las filas resultantes, Clínica primero y Sistema después, en el único `PermissionMatrix` plano que la función ya devuelve. Cuando `typeId === 1`, usar solo el resultado de `type_id=1`, exactamente como hoy. Combinar `isLoading`/`isError` de las consultas que de verdad importan para ese `typeId`, igual que la función ya combina sus dos consultas actuales. Hace pasar T001. (depende de T001)
- [X] T003 [US1] Agregar una prueba a `src/features/roles/components/RoleDetailPanel.test.tsx`, calcada de `'toggling a permission enables saving, and Guardar cambios persists it (FR-008, FR-010)'` (línea 71) pero con `renderPanel(6)` (role `Owner`, tipo Clínica, 0 permisos en `rolesCatalogScenario()`): hoy esa pantalla no ofrece ninguna casilla (catálogo de Clínica vacío); tras T002 debe mostrar, entre otras, `'Ver de Roles'` (un permiso de un módulo de Sistema). Marcarla, guardar, y esperar `text.permissionsCount(1, 16)` con la casilla marcada y "Guardar cambios" deshabilitado — probando el flujo real de guardado (`useSaveRoleDetail`/`rolePermissionsApi`, sin cambios) de punta a punta para un permiso de Sistema en un role de Clínica. Debe fallar antes de T002. (depende de T002)

**Checkpoint**: un role de Clínica ya puede recibir y guardar permisos de módulos de Sistema.

---

## Phase 4: User Story 2 - La matriz de un role de Clínica distingue el origen de cada módulo (Priority: P2)

**Goal**: cuando la matriz de un role mezcla módulos de Sistema y de Clínica, sus filas se muestran
agrupadas en dos secciones con encabezado; si solo hay un tipo presente, no cambia nada (FR-004,
FR-005).

**Independent Test**: construir una matriz con filas de ambos tipos y renderizar
`PermissionsMatrix`: deben aparecer dos encabezados de grupo, en el orden Clínica-Sistema; una
matriz de un solo tipo (p. ej. la `richMatrix()` que ya usan las pruebas existentes) no muestra
ningún encabezado. No depende del código de T002 (research.md R1/R3): las pruebas de este componente
construyen la matriz a mano, sin pasar por `useRolePermissionMatrix`.

### Tests for User Story 2 ⚠️

> Deben fallar contra el código actual antes de T006.

- [X] T004 [P] [US2] En `src/shared/messages/es.ts`, dentro de `messages.roles.detail`: agregar `moduleGroupHeader: (typeName: string) => \`Módulos de ${typeName}\`` (junto a `columns`/`matrixHelper`), y corregir `matrixHelper` (hoy: `'Marca lo que puede hacer en cada módulo. Para crear, modificar o eliminar también necesita Ver. Solo aparecen los módulos del tipo de este role.'`) quitando la última oración, que deja de ser cierta para un role de Clínica (data-model.md, "Documentación existente a corregir"). Sin dependencia de ninguna otra tarea.
- [X] T005 [US2] Agregar pruebas a `src/features/roles/components/PermissionsMatrix.test.tsx`: (a) construir una matriz con una fila de un módulo de `type: {id:1, name:'Sistema'}` (p. ej. `module({id:1, key:'users', name:'Usuarios', type:{id:1,name:'Sistema'}})`) junto a las filas ya existentes de `PATIENTS`/`REMINDERS` (`type:{id:2,name:'Clínica'}`); renderizarla y comprobar que aparecen, en este orden, un encabezado con el texto `messages.roles.detail.moduleGroupHeader('Clínica')` antes de las filas de Pacientes/Recordatorios, y uno con `messages.roles.detail.moduleGroupHeader('Sistema')` antes de la de Usuarios; (b) renderizar `richMatrix()` (hoy, todas sus filas son de un único tipo) y comprobar que NO aparece ningún texto que empiece con `'Módulos de '` — no regresión de FR-005. Debe fallar antes de T006.

### Implementation for User Story 2

- [X] T006 [US2] Implementar en `src/features/roles/components/PermissionsMatrix.tsx` (data-model.md, "Agrupamiento visual"): si `matrix` tiene más de un `module.type.id` distinto entre sus filas, insertar, antes de la primera fila de cada tramo consecutivo de filas del mismo `module.type.id` (el array ya llega agrupado por tipo gracias a T002), una `TableRow` de encabezado con una sola celda (`colSpan` sobre la columna de módulo, las columnas de acción y "Todo el módulo") con el texto `messages.roles.detail.moduleGroupHeader(row.module.type.name)`. Si todas las filas comparten el mismo `module.type.id` (el único caso antes de esta feature, y siempre el de un role de Sistema), no insertar ningún encabezado — la tabla se ve exactamente igual que hoy. `PermissionsMatrixRow.tsx` no cambia. Hace pasar T005. (depende de T005 y T004, mismo archivo de mensajes)

**Checkpoint**: la matriz de un role de Clínica con módulos de ambos tipos ya distingue cada grupo
visualmente; la de un role de Sistema no cambió.

---

## Phase 5: User Story 3 - Un role de Sistema sigue sin alcanzar módulos de Clínica (Priority: P1)

**Goal**: confirmar que la flexibilización de US1 no abre, por descuido, la matriz de un role de
Sistema a módulos de Clínica (FR-002) — ninguna implementación nueva, solo la prueba que lo
demuestra, precisamente porque R2 (T002) hace que el catálogo de Clínica se pida siempre, incluso
para un role de Sistema.

**Independent Test**: pedir la matriz de un role de Sistema cuando el catálogo de Clínica sí tiene
módulos, y comprobar que ninguno se cuela.

- [X] T007 [US3] Agregar una prueba a `src/features/roles/hooks/useRolePermissionMatrix.test.ts`: llamar `useRolePermissionMatrix(1, new Set())` contra `richClinicModulesScenario()` (que sí tiene 3 módulos de Clínica, a diferencia del escenario base) y comprobar que el resultado sigue teniendo exactamente 4 filas, ninguna con `module.type.id === 2`. No es "falla primero": ya debe pasar en cuanto T002 esté bien implementado (si falla, la rama `typeId === 1` de T002 está mezclando cuando no debe). (depende de T002; no depende de T004-T006)

**Checkpoint**: las tres historias quedan probadas de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T008 [P] Actualizar `specs/014-roles-permisos/spec.md`, FR-006 (research.md R4; FR-003 de [spec.md](spec.md) de esta feature): reemplazar "La tabla de permisos DEBE incluir únicamente los módulos del mismo tipo que el role (un role de Clínica no muestra ni puede recibir permisos de módulos de Sistema, y viceversa)." por la redacción asimétrica (un role de Sistema sigue viendo y recibiendo solo módulos de Sistema; uno de Clínica ve y recibe módulos de Sistema y de Clínica), con una nota de que la spec `015` lo sustituyó.
- [X] T009 [P] Actualizar `specs/014-roles-permisos/data-model.md` (data-model.md de esta feature, "Documentación existente a corregir"): la fila `type` de la tabla `Module` (hoy: "La matriz de un rol solo incluye módulos cuyo `type.id` sea igual al `type.id` del rol (FR-006)."), y la nota de `role_permission_module_type_conflict` en la sección `RolePermission` ("del tipo correcto" pasa a significar "de un tipo permitido para ese role", no "del mismo tipo que el role").
- [X] T010 Punto de control: `npm run lint`, `npm run test -- src/features/roles` y `tsc -b` en verde, sin errores nuevos.
- [ ] T011 Ejecutar manualmente los escenarios W1-W6 de [quickstart.md](quickstart.md) (incluye sembrar el módulo de Clínica de ejemplo en la base de datos real de `mailySoft-usuarios` para W3).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup/Foundational**: no aplica (ver Phase 1/2).
- **US1 (Phase 3)**: sin dependencias de otra historia; T001→T002→T003 en secuencia (mismo archivo T001/T002 lógicamente ligados; T003 depende del comportamiento que T002 introduce).
- **US2 (Phase 4)**: T004 es independiente desde el inicio (archivo de mensajes, sin relación con T001-T003). T005→T006 en secuencia. **No depende del código de T002** (research.md R1/R3: sus pruebas arman la matriz a mano) — sí depende de él para poder *observarse junta* en la aplicación real (sin US1, ningún role de Clínica llega a tener filas de Sistema que agrupar).
- **US3 (Phase 5)**: T007 depende de T002 (prueba el comportamiento que T002 introduce), no de T004-T006.
- **Polish (Phase 6)**: T008/T009 sin dependencia de código, pueden hacerse en cualquier momento; T010/T011 al final, tras completar las historias que se vayan a entregar.

### Parallel Opportunities

- T004 puede hacerse en paralelo con T001-T003 (US1) o con T007 (US3): archivos distintos, sin dependencia.
- T008 y T009 pueden hacerse en paralelo entre sí y con cualquier fase de código: son solo documentación de la spec `014`.
- T001 y T007 comparten archivo (`useRolePermissionMatrix.test.ts`), así que en la práctica se hacen en secuencia (T007 se agrega una vez que T001/T002 ya lo tocaron), aunque ninguna de las dos depende del contenido de la otra.

## Parallel Example: después de T002

```bash
# Con T002 ya implementado, estas dos pueden avanzar a la vez:
Task: "T004 [P] [US2] Agregar moduleGroupHeader y corregir matrixHelper en src/shared/messages/es.ts"
Task: "T007 [US3] Agregar prueba de no-regresión en src/features/roles/hooks/useRolePermissionMatrix.test.ts"
```

## Implementation Strategy

### MVP primero (User Story 1)

1. T001 → T002 → T003. Validar manualmente con W1 de [quickstart.md](quickstart.md).
2. Esto ya resuelve el caso de uso motivador de la spec (dar de alta personal de clínica con su
   propia cuenta de usuario) aunque la matriz de un role de Clínica todavía se vea sin agrupar.

### Entrega incremental

1. US1 (T001-T003) → MVP: el permiso ya se puede conceder y guardar.
2. US2 (T004-T006) → la matriz de un role de Clínica ya distingue sus dos grupos de módulos.
3. US3 (T007) → queda probado que ningún role de Sistema se vio afectado.
4. Polish (T008-T011) → documentación de la spec `014` al día, y toda la suite en verde.

## Notes

- Ningún archivo ni carpeta nuevos (plan.md, Project Structure): todas las tareas modifican archivos
  que ya existen.
- `buildPermissionMatrix` (`schemas/permissionMatrix.ts`) y `useEditablePermissionMatrix` no
  aparecen en ninguna tarea: no cambian (research.md R1).
