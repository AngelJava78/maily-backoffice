---

description: "Task list template for feature implementation"
---

# Tasks: Módulos de suscripción según el catálogo de la API y acción «Ver» editable

**Input**: Design documents from `/specs/022-modules-catalog-view-action/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [quickstart.md](quickstart.md)

**Tests**: esta feature corrige dos comportamientos defectuosos y retira una regla de negocio (constitución VII: test-first obligatorio al corregir bugs y en lógica pura); las tareas de prueba están incluidas y van antes de su implementación correspondiente.

**Organization**: las tareas se agrupan por historia de usuario, en el orden de prioridad del spec (US1 P1, US2 P2, US3 P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz del repositorio (`src/`, `e2e/`), sin cambios de estructura (plan.md).

---

## Phase 1: Setup

- [X] T001 Confirmar que no hace falta ninguna dependencia, variable de entorno ni archivo de ignorados nuevo (plan.md, Technical Context: mismas dependencias ya en uso; ningún endpoint nuevo). Sin cambios de código; esta tarea es una verificación.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: confirmar que la infraestructura compartida que esta feature reutiliza —toda ya construida en la 021— sigue vigente y no necesita ningún cambio antes de empezar las historias.

- [X] T002 Verificar, sin modificarlos, que siguen vigentes y sin cambios: `src/features/subscriptions/schemas/clinicModule.ts` (`ClinicModule`, `REQUIRED_MODULE_KEY`), `src/features/subscriptions/hooks/useClinicModulesCatalog.ts`, `src/features/subscriptions/hooks/clinicModuleKeys.ts`, `src/features/subscriptions/policy/clinicModuleSelection.ts` (`resolveModuleSelection`). Ninguna historia necesita crear infraestructura compartida nueva (research D2): US1 y US3 reutilizan lo anterior; US2 es independiente, dentro de `features/modules`.

**Checkpoint**: nada bloquea el inicio de las tres historias; pueden avanzar en paralelo (research D1), salvo el orden interno de US1 antes de US3 dentro de `subscriptions` (ver Dependencies).

---

## Phase 3: User Story 1 - Ver los módulos reales de una suscripción en su detalle y en el comparativo (Priority: P1) 🎯 MVP

**Goal**: el detalle de una suscripción y la tabla comparativa muestran el catálogo vigente de módulos de clínica (el mismo que ya usa el formulario desde la 021), no la lista fija de nueve keys viejos.

**Independent Test**: abrir el detalle de una suscripción con módulos del catálogo vigente y comprobar que aparecen todos por su nombre correcto; abrir el comparativo y comprobar que tiene una fila por cada módulo activo del catálogo.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estas pruebas PRIMERO; deben fallar antes de implementar**

- [X] T003 [US1] Agregar a `src/shared/messages/es.ts` el texto para un `key` guardado que ya no está en el catálogo (FR-006), p. ej. `subscriptions.detail.moduleUnavailable: (key: string) => \`${key} (no disponible)\``. Sin prueba propia; lo consume T004.
- [X] T004 [P] [US1] Reescribir `src/features/subscriptions/components/SubscriptionDetailFields.test.tsx` (tras T003; data-model.md): el harness pasa props nuevos `modules`, `loading`, `loadFailed`, `onRetry` (ya no depende de `messages.subscriptions.modules.catalog`). Casos: `loading=true` muestra `CircularProgress`; `loadFailed=true` muestra `ErrorState` con los textos de `subscriptions.modules.loadError` y un botón que llama a `onRetry`; `modules=[]` muestra `subscriptions.modules.empty`; con `modules` no vacío, lista los `module_keys` de la suscripción en el orden de `modules` (por `sort_order`, no por un orden fijo); un `module_keys` con un `key` ausente de `modules` lo agrega al final de los incluidos como `\`${key} (no disponible)\`` (FR-006); la línea "No incluye" solo nombra keys de `modules` que la suscripción no tiene, nunca un key "(no disponible)"; sin línea "No incluye" cuando se incluyen todos los módulos del catálogo recibido; `axe` sin violaciones en los cuatro estados. Debe fallar.
- [X] T005 [P] [US1] Reescribir `src/features/subscriptions/components/SubscriptionsComparisonTable.test.tsx` (data-model.md): el harness pasa props nuevos `modules`, `modulesLoading`, `modulesLoadFailed`, `onModulesRetry` (ya no depende de `CLINIC_MODULE_ORDER`). Casos: `modulesLoading=true` o `modulesLoadFailed=true` muestran, en lugar de las filas de módulo, una sola fila con `colSpan` de todas las columnas, con el indicador de carga o `ErrorState`+reintento; con `modules` no vacío, una fila por módulo en el orden recibido, con `module.name`, marcando incluido/no incluido según `subscription.moduleKeys.includes(module.key)`; `axe` sin violaciones. Debe fallar.
- [X] T006 [P] [US1] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.test.tsx`: registrar `createClinicModulesCatalogMock()` en el arranque de cada prueba. Casos nuevos: mientras el catálogo de módulos carga o falla, el resto del detalle (nombre, precio, estatus) se ve igual que hoy, y solo la sección de módulos muestra su propio estado de carga/error; el botón de reintentar de esa sección llama de nuevo a la consulta del catálogo. Debe fallar en lo nuevo.
- [X] T007 [P] [US1] Ampliar `src/app/router/subscriptions/subscriptionsList.integration.test.tsx`: registrar `createClinicModulesCatalogMock()` en `start()` (o equivalente), para que la pestaña Comparativo cargue de punta a punta por el router; las aserciones ya existentes sobre el Comparativo siguen pasando una vez migrado. Debe fallar en lo nuevo.

### Implementation for User Story 1

- [X] T008 [US1] Reescribir (tras T004) `src/features/subscriptions/components/SubscriptionDetailFields.tsx` (data-model.md): props nuevos; el sub-componente `Modules` gana los cuatro estados de T004; deja de importar `CLINIC_MODULE_ORDER`/`ClinicModuleKey` de `../schemas/clinicModuleCatalog`, importa `type ClinicModule` de `../schemas/clinicModule`. Hace pasar T004.
- [X] T009 [US1] Implementar (tras T006, T008) en `src/features/subscriptions/components/SubscriptionDetailPage.tsx`: agregar `const modulesCatalog = useClinicModulesCatalog();` junto a `useSubscription` (en paralelo, research D2); pasar `modules={modulesCatalog.data ?? []}`, `loading={modulesCatalog.isPending}`, `loadFailed={modulesCatalog.isError && modulesCatalog.data === undefined}`, `onRetry={() => { void modulesCatalog.refetch(); }}` a `SubscriptionDetailFields`. Hace pasar T006.
- [X] T010 [US1] Reescribir (tras T005) `src/features/subscriptions/components/SubscriptionsComparisonTable.tsx` (data-model.md): props nuevos; la fila de carga/error con `colSpan`; itera `modules` en vez de `CLINIC_MODULE_ORDER`; deja de importar `CLINIC_MODULE_ORDER`. Hace pasar T005.
- [X] T011 [US1] Implementar (tras T007, T010) en `src/features/subscriptions/components/SubscriptionsListPage.tsx`: agregar `const modulesCatalog = useClinicModulesCatalog();` (llamado siempre, sin condicionarlo a la pestaña activa, research D2); pasar `modules`, `modulesLoading`, `modulesLoadFailed`, `onModulesRetry` a `SubscriptionsComparisonTable`. Hace pasar T007.
- [ ] T012 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z1, Z2, Z3, Z4 y Z6 de [quickstart.md](quickstart.md).

**Checkpoint**: el detalle y el comparativo muestran el catálogo vigente, de punta a punta; ningún componente de producción de `subscriptions` importa ya `clinicModuleCatalog.ts` (lo confirma T035).

---

## Phase 4: User Story 2 - Marcar y desmarcar la acción «Ver» al crear o editar un módulo (Priority: P2)

**Goal**: la casilla «Ver» de los paneles de alta y edición de un módulo deja de estar siempre marcada y deshabilitada; se comporta como las otras tres acciones, con una regla nueva (Crear/Modificar/Eliminar la requieren).

**Independent Test**: abrir la edición de un módulo sin ningún permiso, marcar «Ver» y guardar, y comprobar que el permiso se creó y que el módulo puede guardarse también sin marcar ninguna acción.

### Tests for User Story 2 ⚠️

> **NOTE: Escribir estas pruebas PRIMERO; deben fallar antes de implementar**

- [X] T013 [US2] En `src/shared/messages/es.ts`: borrar `modules.validation.actionsReadRequired`; agregar `modules.validation.createUpdateDeleteRequireRead: 'Para usar Crear, Modificar o Eliminar, marca también Ver.'` (FR-015). Sin prueba propia; lo consumen T014 y T016.
- [X] T014 [P] [US2] Reescribir `src/features/modules/components/ModuleFormFields.test.tsx` (tras T013): quitar el caso "shows «Ver» checked and disabled from being unchecked"; agregar un caso donde «Ver» se marca y desmarca libremente, igual que las otras tres (ningún `disabled` en ninguna de las cuatro); agregar un caso donde, con un prop `errors` que tiene `actions: { message: '...' }`, ese mensaje aparece en un `FormHelperText` bajo el `FormGroup` de acciones. Debe fallar.
- [X] T015 [P] [US2] Reescribir `src/features/modules/policy/moduleActionSelection.test.ts`: quitar el caso "never unchecks 'read' (FR-018)"; agregar uno que confirme que `withActionChecked(selected, 'read', false)` SÍ la quita, igual que cualquier otra acción; mantener los casos de agregar/quitar sin tocar las demás, de no mutar `selected`, y de devolver siempre un `Set` nuevo. Debe fallar.
- [X] T016 [P] [US2] Reescribir `src/features/modules/schemas/moduleForm.test.ts` (tras T013): el caso que hoy espera que `actions: new Set()` falle la validación pasa a esperar que **pase** (FR-016); agregar casos: `actions: new Set(['write'])` (o `['update']`/`['delete']`) sin `'read'` falla con el mensaje de `validation.createUpdateDeleteRequireRead`; `actions: new Set(['read'])` sola pasa; `actions: new Set(['read', 'write', 'update', 'delete'])` pasa. Debe fallar.
- [X] T017 [P] [US2] Ampliar `src/app/router/modules/createModule.integration.test.tsx`: caso nuevo para Z11 de quickstart.md — en "Nuevo módulo", las cuatro acciones empiezan marcadas; desmarcar «Ver» sin desmarcar las otras tres y guardar muestra el mensaje de FR-015 y no crea el módulo. Debe fallar.
- [X] T018 [P] [US2] Ampliar `src/app/router/modules/editModule.integration.test.tsx`: casos nuevos para Z7-Z10 de quickstart.md — en un módulo sin ningún permiso, marcar «Ver» y guardar crea `<key>:read` y deja `active_permissions_count: 1`; el mismo módulo se guarda cambiando solo el nombre, sin marcar ninguna acción; en un módulo con las cuatro marcadas, desmarcar «Ver» dejando «Crear» marcado muestra el mensaje de FR-015 y no guarda; desmarcar las cuatro una por una pide la misma confirmación que ya se pide hoy por cada una, y al aceptarlas todas y guardar, se eliminan los cuatro permisos. Debe fallar.

### Implementation for User Story 2

- [X] T019 [US2] Implementar (tras T015) en `src/features/modules/schemas/moduleActionCatalog.ts`: borrar `REQUIRED_ACTION_KEY` y su comentario; en `src/features/modules/policy/moduleActionSelection.ts`: simplificar `withActionChecked` a un toggle plano (agrega o quita, sin caso especial para `read`), quitando el import de `REQUIRED_ACTION_KEY`. Hace pasar T015.
- [X] T020 [US2] Implementar (tras T013, T016) en `src/features/modules/schemas/moduleForm.ts`: borrar `hasRequiredAction`; agregar `createUpdateDeleteRequireRead(actions)` que exige `'read'` solo si `actions` tiene `'write'`, `'update'` o `'delete'`; cambiar el `refine` de `actions` para usar esa función con el mensaje de `validation.createUpdateDeleteRequireRead`. Hace pasar T016.
- [X] T021 [US2] Implementar (tras T014, T019, T020) en `src/features/modules/components/ModuleFormFields.tsx`: quitar `disabled={action === REQUIRED_ACTION_KEY}` de la casilla (las cuatro quedan siempre habilitadas); quitar el import de `REQUIRED_ACTION_KEY`; agregar, bajo el `FormGroup` de acciones, `{errors.actions?.message !== undefined && <FormHelperText error>{errors.actions.message}</FormHelperText>}`. Hace pasar T014.
- [X] T022 [US2] Verificar (tras T019, T020, T021) que `createModule.integration.test.tsx` y `editModule.integration.test.tsx` pasan. Hace pasar T017, T018.
- [ ] T023 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z7, Z8, Z9, Z10 y Z11 de [quickstart.md](quickstart.md).

**Checkpoint**: la acción «Ver» se comporta como cualquier otra en los dos paneles, con la nueva regla de FR-015 vigente; `features/subscriptions` no se tocó en esta historia.

---

## Phase 5: User Story 3 - Guardar una suscripción con cualquier combinación de módulos, sin reglas de dependencia (Priority: P3)

**Goal**: retirar del código y de los simuladores de prueba toda referencia a dependencias entre módulos de clínica y al catálogo fijo de nueve, dejando `patients` como la única key con tratamiento especial.

**Independent Test**: en el alta de una suscripción, marcar un módulo que antes exigía otro (p. ej. Recordatorios sin Agenda y citas) y comprobar que se guarda sin ningún error.

### Tests for User Story 3 ⚠️

> **NOTE: Escribir estas pruebas PRIMERO; deben fallar antes de implementar donde corresponda**

- [X] T024 [P] [US3] En `src/features/subscriptions/api/subscriptionErrors.test.ts`: quitar la fila `[409, 'subscription_module_prerequisite_missing']` del `it.each` (FR-010; queda solo `[422, 'subscription_module_not_found']`); agregar un caso que confirme que ese código 409, si llegara a ocurrir, cae en `{ kind: 'unexpected', message: messages.errors.unexpected }` (Assumptions del spec). Debe fallar en el caso nuevo.
- [X] T025 [P] [US3] En `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx`, prueba "shows a refusal of the modules next to the modules section...": cambiar el código simulado de `subscription_module_prerequisite_missing`/409 a `subscription_module_not_found`/422 (mismo escenario; el segundo código conserva manejo especial tras FR-010).
- [X] T026 [P] [US3] En `src/test/handlers/subscriptionsCatalog/create.test.ts`: cambiar `module_keys: ['patients', 'scheduling']` (≈línea 92) por `['patients', 'reports']` (ambos existen en el catálogo de 18 de FR-011, sin relación de dependencia); borrar el test "refuses a dependent module without its prerequisite, with its own code" (≈líneas 108-119; FR-008); renombrar "refuses a module key outside the fixed catalog of nine..." a "...outside the active catalog..." (mismo comportamiento, con la key inválida `'facturacion'`).
- [X] T027 [P] [US3] En `src/test/handlers/subscriptionsCatalog/model.test.ts`: borrar el bloque `it.each` "refuses "%s" without its prerequisite "%s"" (≈líneas 203-231: usa keys que ni siquiera siguen en el catálogo de 18); en "replaces the whole set of module_keys, always keeping patients" (≈líneas 426-432), cambiar `module_keys: ['scheduling']` por `['reports']`; reemplazar "refuses an updated module_keys that is missing a prerequisite" (≈líneas 434-441) por un caso que confirme que `model.update(1, { module_keys: ['reminders'] })` ahora se guarda con 200, sin exigir ningún otro módulo. Debe fallar en este último caso.
- [X] T028 [P] [US3] En `src/test/handlers/subscriptionsCatalog/update.test.ts`, prueba "replaces the whole set of module_keys, with the same catalog and dependency rules as create" (≈líneas 46-57): quitar la aserción de 409 para `module_keys: ['reminders']` solo y confirmar que ahora se guarda con 200, con `patients` y `reminders` en el resultado; quitar la combinación `['scheduling', 'reminders']` (ya no hace falta ninguna combinación para que `reminders` sea válido); renombrar la prueba a algo como "...with the same catalog as create, no dependency required". Debe fallar.

### Implementation for User Story 3

- [X] T029 [US3] Reescribir `src/test/handlers/subscriptionModulesCatalog.ts` (data-model.md): `DEFAULT_CLINIC_MODULES` pasa de derivarse de `CLINIC_MODULE_ORDER`/`messages.subscriptions.modules.catalog` a un arreglo literal con los 18 módulos de FR-011 (`overview`, `schedule`, `appointments`, `patients`, `prescriptions`, `vital_signs`, `patient_diagnoses`, `templates`, `clinics`, `consulting_rooms`, `staff`, `finance`, `billing`, `expenses`, `incomes`, `services`, `reports`, `reminders`), con `sort_order` de 10 en 10 en ese orden. El resto del archivo no cambia de forma.
- [X] T030 [US3] En `src/test/handlers/subscriptionsCatalog/model.ts` (tras T027, T028): cambiar el import de `REQUIRED_MODULE_KEY` a `@/features/subscriptions/schemas/clinicModule`; `KNOWN_MODULE_KEYS` pasa de `new Set(CLINIC_MODULE_ORDER)` a un `Set` literal con los mismos 18 keys de T029 (research D6: lista propia, no importada de T029); borrar el bloque `for (const [dependent, prerequisite] of Object.entries(MODULE_PREREQUISITE)) { ... }` y el import de `MODULE_PREREQUISITE`/`CLINIC_MODULE_ORDER`. Hace pasar T027, T028.
- [X] T031 [US3] En `src/features/subscriptions/api/subscriptionErrors.ts` (tras T024, T025): borrar `case 'subscription_module_prerequisite_missing':` del `switch` de `describeSubscriptionError` (queda solo `case 'subscription_module_not_found':`, con el mismo cuerpo). Hace pasar T024, T025.
- [X] T032 [US3] En `src/shared/messages/es.ts`: `subscriptions.errors.fields.moduleKeys` pierde la cláusula "o le falta su módulo requisito" (queda "Revisa los módulos incluidos: alguno no es válido."); borrar `subscriptions.modules.catalog` y `subscriptions.modules.requires` (FR-003, FR-008: sin consumidores desde T008/T010 de US1).
- [X] T033 [US3] Cambiar el import de `REQUIRED_MODULE_KEY` en `src/features/subscriptions/components/OtherFeaturesField.test.tsx`, `src/features/subscriptions/hooks/useCreateSubscription.test.tsx`, `src/features/subscriptions/components/SubscriptionTypeField.test.tsx`, `src/features/subscriptions/components/ClinicsLimitField.test.tsx`, `src/features/subscriptions/components/ClinicLimitsFields.test.tsx` y `src/features/subscriptions/components/SelfServiceAndTrialFields.test.tsx`: de `../schemas/clinicModuleCatalog` a `../schemas/clinicModule` (research D4; mismo valor literal, `'patients'`).
- [X] T034 [US3] Borrar `src/features/subscriptions/schemas/clinicModuleCatalog.ts` y `src/features/subscriptions/schemas/clinicModuleCatalog.test.ts` (research D4: sin consumidores tras T008, T010, T030, T033).
- [X] T035 [US3] Punto de control de la historia: ejecutado. Búsqueda de texto confirmada: cero referencias a `CLINIC_MODULE_ORDER` y `MODULE_PREREQUISITE` en todo `src/`; `clinicModuleCatalog` solo aparece como palabra dentro de un comentario histórico en `subscriptionModulesCatalog.ts` (ningún import); `subscription_module_prerequisite_missing` solo aparece en la prueba de `subscriptionErrors.test.ts` que confirma, a propósito, que ya no tiene manejo especial. Ningún archivo de producción de `features/subscriptions` (fuera de `.test.ts(x)`) referencia una key de módulo concreta distinta de `patients`. Pruebas en verde: `subscriptionErrors.test.ts`, `SubscriptionCreatePage.test.tsx` (33/33 en corridas aisladas; algunos timeouts de 30s en corridas junto a otros archivos, no reproducibles al aislar la prueba — carga de la máquina, ver T039), `SubscriptionEditPage.test.tsx` (31/31), `create.test.ts`/`model.test.ts`/`update.test.ts` de `subscriptionsCatalog`, y los 6 archivos de import corregido. Z5 de quickstart.md queda para el punto de control final (T040), junto con el resto de la validación manual en navegador.

**Checkpoint**: ninguna regla de dependencia entre módulos sigue viva, ni en producción ni en las pruebas; `clinicModuleCatalog.ts` ya no existe.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T036 [P] Revisar `e2e/subscriptions.spec.ts` y `e2e/modules.spec.ts` (research D8): confirmado por búsqueda de texto — cero referencias a los nombres en español del catálogo viejo (`Agenda y citas`, `Expediente clínico`, etc.) ni a `REQUIRED_ACTION_KEY`/`actionsReadRequired`; sin cambios.
- [X] T037 Ejecutar `npm run typecheck`, `npm run lint` y `npm run format:check`; corregir lo que señalen. `tsc --noEmit` limpio desde el inicio. `eslint` señaló 5 `no-non-null-assertion` en dos archivos nuevos de esta feature (`SubscriptionsComparisonTable.test.tsx`, `editModule.integration.test.tsx`); corregidos con guardas `if (x === undefined) throw ...` en vez de `!`. `prettier --check` señaló 3 archivos sin formatear; corregidos con `prettier --write`. Los tres comandos terminan en verde.
- [X] T038 Ejecutar `npm run build` y `npm run size`; confirmar que el bundle sigue dentro del presupuesto de 320 KB gzip. El primer intento de build reveló un archivo no contemplado en el plan, `src/features/modules/schemas/moduleActionCatalog.test.ts`, que todavía importaba `REQUIRED_ACTION_KEY` (una prueba dedicada, "never lets read be unchecked", que no apareció en la búsqueda original porque no usa el patrón `../schemas/moduleActionCatalog` desde otro directorio); corregido quitando esa prueba y el import. Build exitoso tras la corrección; bundle **307.4 KB de 320 KB** (margen de 12.6 KB, ligeramente mejor que antes de esta feature por el código y los textos fijos que se retiraron).
- [X] T039 Ejecutar `npm run test:coverage`; confirmar que `src/features/modules/schemas/moduleForm.ts` y `src/features/modules/policy/moduleActionSelection.ts` (los archivos de `schemas`/`policy` que cambian de comportamiento en esta feature) mantienen ≥80 % de cobertura de líneas, y que el resto de la suite sigue en verde. `moduleActionSelection.ts`: **100 %** líneas/ramas/funciones (6/6 pruebas). `moduleForm.ts`: **96.66 % líneas, 87.09 % ramas, 100 % funciones**; la única rama sin cubrir (línea 127, `toUpdateModuleBody` con `sortOrder` cambiado) es código de la feature 013 que esta feature no modificó y queda muy por encima del umbral del 80 %, así que no se amplía esa prueba fuera de alcance. El resto de los archivos tocados se verificó en lotes aislados, todos en verde: `subscriptionsCatalog` (195/195), los 6 archivos de import corregido + `subscriptionErrors.test.ts` (73/73), `SubscriptionDetailFields`/`SubscriptionDetailPage`/`subscriptionsList.integration` (39/39 de una corrida previa), `SubscriptionsComparisonTable`/`editModule.integration` (15/15 tras la corrección de lint), `ModuleFormFields`/`moduleActionSelection`/`moduleForm` (43/43), `createModule.integration`/`editModule.integration` (13/13 antes del ajuste de lint), `SubscriptionCreatePage.test.tsx` y `SubscriptionEditPage.test.tsx` verificados en corridas aisladas y acotadas (33/33 y 31/31) tras varios *timeouts* de 30 s no reproducibles al aislar cada prueba en corridas junto a decenas de otros archivos — la misma inestabilidad por carga de la máquina ya documentada al cerrar la feature 021 (confirmada aquí también con `tasklist`: varias instancias de VS Code, Postman, DBeaver, Excel y varios `node.exe` de cientos de MB corriendo a la vez), no una regresión de este código.
- [ ] T040 Punto de control final: validar manualmente cualquier escenario de [quickstart.md](quickstart.md) que ningún punto de control anterior haya cubierto (en particular, accesibilidad por teclado y lector de pantalla en los paneles de Módulos); confirmar que el resto de las tareas quedaron marcadas `[X]`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; es solo una verificación, no bloquea nada en la práctica (research D2).
- **Historias de usuario (Phase 3-5)**: dependen de Foundational.
  - **US1** y **US2** son completamente independientes entre sí y pueden avanzar en paralelo.
  - **US3** depende de que **US1 termine primero dentro de `features/subscriptions`** (research D1): T034 borra `clinicModuleCatalog.ts`, y eso solo es seguro una vez que T008/T010 (US1) dejaron de importarlo. US3 no depende de US2 en absoluto (son features distintas).
- **Polish (Phase 6)**: depende de que las tres historias estén completas.

### Dependencias dentro de cada historia

- US1: T003 (texto) antes de T004; T004/T005/T006/T007 (pruebas) antes de su implementación correspondiente (T008-T011); T008 antes de T009; T010 antes de T011.
- US2: T013 (texto) antes de T014/T016; pruebas (T014-T018) antes de implementación (T019-T022); T019/T020 antes de T021.
- US3: pruebas (T024-T028) antes de implementación (T029-T034); T027/T028 antes de T030; T024/T025 antes de T031; T030/T033 antes de T034 (nada debe seguir importando el archivo que T034 borra).

### Parallel Opportunities

- Todas las tareas `[P]` de una misma fase pueden ejecutarse en paralelo entre sí.
- Una vez completada la Fase 2, **US1 y US2 pueden avanzar en paralelo por completo** (equipos o turnos distintos); **US3 debe esperar a que US1 termine**.

---

## Parallel Example: US1 y US2 en paralelo

```bash
# Después de Foundational (T002), dos frentes sin ningún archivo en común:
# Frente A (US1, features/subscriptions):
Task: "T003-T007: textos y pruebas del detalle y el comparativo"
# Frente B (US2, features/modules):
Task: "T013-T018: textos y pruebas de la acción «Ver»"

# US3 (US3, features/subscriptions) solo arranca cuando el Frente A llega a su Checkpoint.
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Fase 1: Setup.
2. Completar Fase 2: Foundational (verificación, sin cambios de código).
3. Completar Fase 3: User Story 1.
4. **DETENERSE y VALIDAR**: probar la historia 1 de forma independiente (detalle y comparativo con el catálogo vigente).
5. Desplegar/mostrar si está listo.

### Entrega incremental

1. Setup + Foundational → base lista.
2. Agregar US1 → probar de forma independiente → Desplegar/Mostrar (¡MVP!).
3. Agregar US2 → probar de forma independiente → Desplegar/Mostrar.
4. Agregar US3 (solo después de que US1 esté lista) → probar de forma independiente → Desplegar/Mostrar.
5. Polish al final.

### Estrategia con varias personas

Con más de una persona disponible: una puede tomar US1 mientras otra toma US2 en paralelo, apenas termine Foundational; US3 queda para quien termine antes su frente, pero solo después de que el Checkpoint de US1 esté en verde.
