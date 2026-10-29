---

description: "Task list template for feature implementation"
---

# Tasks: Catálogo dinámico de módulos de clínica en alta y edición de suscripciones

**Input**: Design documents from `/specs/021-dynamic-clinic-modules/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md). Sin `contracts/`: el endpoint ya está documentado en [../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md) (research D1); esta feature es un segundo consumidor, no un contrato nuevo.

**Tests**: incluidas. La constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first para lógica pura (esquemas, políticas, hooks, la capa `api`). Dentro de cada fase, la prueba de cada pieza nueva se escribe ANTES que su implementación y DEBE fallar al principio.

**Organization**: tareas agrupadas por historia de usuario de `spec.md` (US1=P1 «el alta ofrece los módulos de clínica realmente activos», US2=P2 «la edición también usa el catálogo vigente»), en orden de prioridad, tras una fase Foundational que ambas historias comparten (research: `ModulesField`/`SubscriptionFormFields` y toda la capa de datos nueva son comunes al alta y a la edición).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1, US2); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único existente en la raíz del repositorio (`C:\Maily\code\maily-backoffice`): `src/`. Solo se toca `src/features/subscriptions`, un archivo de `src/shared/messages/es.ts`, un simulador nuevo en `src/test/handlers/` y las pruebas de integración de `src/app/router/subscriptions/`. Ninguna ruta, navegación ni capacidad nueva (plan.md, Project Structure). `src/features/subscriptions/schemas/clinicModuleCatalog.ts`, `SubscriptionsComparisonTable.tsx`, `SubscriptionDetailFields.tsx` y `src/test/handlers/subscriptionsCatalog/model.ts` **no se tocan** (research D3): siguen siendo la fuente del Comparativo, el detalle y el simulador de la propia API de Suscripciones. Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en `es.ts`. Sin aserciones `as`, sin `any`, sin `console.*`.

---

## Phase 1: Setup

- [X] T001 Confirmar que no hace falta ninguna dependencia, variable de entorno ni archivo de ignorados nuevo (plan.md, Technical Context: mismas dependencias ya en uso — Zod, TanStack Query, MUI; el endpoint ya usa el cliente `users` ya configurado). Sin cambios de código; esta tarea es una verificación.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Comparten esta fase US1 y US2**: el catálogo de módulos (esquema, API, hook, keys), la función `resolveModuleSelection`, el simulador MSW, los textos nuevos y los dos componentes compartidos por el alta y la edición (`ModulesField`, `SubscriptionFormFields`). Ninguna historia puede darse por terminada sin esta fase.

- [X] T002 [P] Crear `src/features/subscriptions/schemas/clinicModule.test.ts` (data-model.md, «ClinicModule»): `clinicModuleSchema` parsea un DTO real (`key`, `name`, `description` string o `null`, `sort_order`) a `{ key, name, description, sortOrder }`; rechaza una `key` que no cumple `^[a-z][a-z0-9_]*$`; descarta del resultado los campos del DTO que el esquema no declara (`id`, `created_at`, `status`, `type`, `active_permissions_count`), aunque estén presentes en la entrada; `clinicModulesSchema` parsea un arreglo. Debe fallar (el archivo de implementación no existe todavía).
- [X] T003 Implementar (tras T002) `src/features/subscriptions/schemas/clinicModule.ts`: `clinicModuleSchema`, `clinicModulesSchema`, `type ClinicModule`, y `export const REQUIRED_MODULE_KEY = 'patients'` (data-model.md: no se reexporta de `clinicModuleCatalog.ts`, es una constante propia con el mismo valor literal, research D3). Hace pasar T002.
- [X] T004 [P] Crear `src/features/subscriptions/api/clinicModulesApi.test.ts` (mismo patrón que `src/features/roles/api/modulesApi.test.ts`): registrar un handler inline con `server.use(http.get(usersUrl('/api/v1/modules'), ...))`, llamar a `listClinicModules(client)` y afirmar que la query string enviada es exactamente `?type_id=2&status_id=1` y que el DTO se convierte a camelCase. Debe fallar.
- [X] T005 Implementar (tras T004) `src/features/subscriptions/api/clinicModulesApi.ts`: `export const CLINIC_MODULES_PATH = '/api/v1/modules'` y `listClinicModules(client, { signal })`, con `query: { type_id: 2, status_id: 1 }` (data-model.md). Hace pasar T004.
- [X] T006 [P] Crear `src/features/subscriptions/hooks/clinicModuleKeys.test.ts`: `clinicModuleKeys.all` es `['subscriptionsClinicModulesCatalog']`; `clinicModuleKeys.catalog()` es `['subscriptionsClinicModulesCatalog', 'catalog']`; su prefijo es distinto del de `rolesModulesCatalog` (research D2, cachés independientes aunque pidan el mismo endpoint real). Debe fallar.
- [X] T007 Implementar (tras T006) `src/features/subscriptions/hooks/clinicModuleKeys.ts` (data-model.md). Hace pasar T006.
- [X] T008 Agregar a `src/shared/messages/es.ts`, bloque `subscriptions.modules`: cambiar `marked: (count: number) => \`Marcados: ${count} de 9\`` por `marked: (count: number, total: number) => \`Marcados: ${count} de ${total}\`` (research D8: el 9 estaba escrito fijo, no derivado de ningún arreglo); agregar `loadError: { title: 'No se pudieron cargar los módulos', message: 'Sin la lista de módulos no se puede guardar la suscripción. Puedes reintentar.' }` y `empty: 'No hay módulos de clínica disponibles: no se puede guardar la suscripción.'` (mismo patrón que `users.form.rolesLoadError`/`rolesEmpty`, research D9). `subscriptions.modules.catalog`/`.requires` **no se tocan** (siguen vivos para el Comparativo y el detalle, research D3). Sin prueba propia; la consumen T017 y T019.
- [X] T009 Crear `src/test/handlers/subscriptionModulesCatalog.ts` (data-model.md; research D10; sin prueba propia, es infraestructura de prueba): `DEFAULT_CLINIC_MODULES`, construido a partir de `CLINIC_MODULE_ORDER` y `messages.subscriptions.modules.catalog` (los mismos nueve módulos ya existentes, con `sort_order` de 10 en 10 en ese mismo orden); `createClinicModulesCatalogMock(initial = DEFAULT_CLINIC_MODULES)`, que registra `GET /api/v1/modules` en `USERS_API_BASE_URL` con comportamiento configurable (`normal`/`failWith(status, code)`/`hang`/`recover`) y `requests` grabadas, mismo patrón que `createUsersServiceMock` (`src/test/handlers/usersService.ts`).
- [X] T010 [P] Crear `src/features/subscriptions/hooks/useClinicModulesCatalog.test.tsx` (tras T009): con `createWrapper()` y `createClinicModulesCatalogMock()`, confirmar que el hook pasa de `isPending` a los datos en camelCase; que un `failWith(500, ...)` del mock deja `isError`. Debe fallar.
- [X] T011 Implementar (tras T003, T005, T007, T010) `src/features/subscriptions/hooks/useClinicModulesCatalog.ts`: `useClinicModulesCatalog()`, `queryKey: clinicModuleKeys.catalog()`, `queryFn: ({ signal }) => listClinicModules(users, { signal })`, `staleTime` de 5 minutos (mismo valor que `useRolesCatalog`/`useModulesCatalog` de `roles`), sin `enabled` (ambas pantallas siempre lo necesitan). Hace pasar T010.
- [X] T012 [P] Crear `src/features/subscriptions/policy/clinicModuleSelection.test.ts` (data-model.md, «resolveModuleSelection»): quita del conjunto una key que no está en el catálogo (FR-009); agrega `patients` al resultado aunque no estuviera en `selected`, si el catálogo la trae (FR-007); NO la agrega si el catálogo no la trae (edge case del spec); es pura (no muta `selected`); con el catálogo vacío, el resultado es vacío. Debe fallar.
- [X] T013 Implementar (tras T003, T012) `src/features/subscriptions/policy/clinicModuleSelection.ts`: `resolveModuleSelection(selected, catalog)` (data-model.md). Hace pasar T012.
- [X] T014 Borrar `src/features/subscriptions/policy/moduleSelection.ts` y `src/features/subscriptions/policy/moduleSelection.test.ts` (research D3, D4: la cascada de dependencias se retira; su único consumidor era `ModulesField.tsx`, que se reescribe en T018; ningún otro archivo del repositorio los importa).
- [X] T015 [P] Ampliar `src/features/subscriptions/schemas/subscriptionForm.test.ts`: `moduleKeysSchema`/`SubscriptionFormValues.moduleKeys` aceptan un `ReadonlySet<string>` cualquiera, no solo las nueve keys de `ClinicModuleKey`; `toFormValues` ya NO filtra `subscription.moduleKeys` contra `CLINIC_MODULE_ORDER` (una key fuera de esas nueve, antes descartada, ahora se conserva en el `Set` resultante — research D7: el filtrado contra el catálogo vigente se hace en otro lugar, `resolveModuleSelection`, no aquí). `toCreateSubscriptionBody`/`toUpdateSubscriptionBody` conservan su comportamiento ya probado (research D11: sin cambio de firma). Debe fallar.
- [X] T016 Implementar (tras T015) en `src/features/subscriptions/schemas/subscriptionForm.ts`: `moduleKeysSchema = z.custom<ReadonlySet<string>>((value) => value instanceof Set)`; quitar el import de `CLINIC_MODULE_ORDER`/`ClinicModuleKey` de `./clinicModuleCatalog`; en `toFormValues`, quitar la variable `knownKeys` y el `.filter(...)`, dejando `moduleKeys: new Set(subscription.moduleKeys)`. Hace pasar T015.
- [X] T017 [P] Reescribir `src/features/subscriptions/components/ModulesField.test.tsx` (data-model.md, «ModulesField»; tras T008, T009): props nuevos `modules`, `loading`, `loadFailed`, `onRetry`, además de `control`/`errors`. Casos: `loading=true` muestra un `CircularProgress` con `aria-label={messages.common.loading}`, no la lista; `loadFailed=true` muestra `ErrorState` con el título/mensaje de `modules.loadError` y un botón que llama a `onRetry`; `loading=false` y `modules=[]` muestra un `Alert severity="warning"` con `modules.empty`; con `modules` no vacío, una casilla por módulo, en el orden recibido (sin reordenar), con `module.name`/`module.description`; la casilla del módulo con key `patients` aparece siempre marcada y deshabilitada, incluso si `patients` NO estaba en el `Set` inicial que recibe el harness (Assumptions del spec); las demás casillas se marcan/desmarcan libremente, sin afectar a ninguna otra (ya no hay texto «Requiere X»); el contador usa `text.marked(count, total)` con el tamaño real de `modules`, nunca un «de 9» fijo; `axe` sin violaciones en los cuatro estados (cargando, error, vacío, con datos). Debe fallar.
- [X] T018 Reescribir (tras T013, T016, T017) `src/features/subscriptions/components/ModulesField.tsx` (data-model.md): nuevos props; `loadFailed`/vacío/cargando como en T017; lista de casillas sobre `modules` (no `CLINIC_MODULE_ORDER`); `checked={resolveModuleSelection(selected, modules).has(module.key)}`, `disabled={module.key === REQUIRED_MODULE_KEY}`; `onChange` de una casilla no requerida arma `new Set(selected)` con la key agregada o quitada (ya no llama a `withModuleChecked`); contador con `resolveModuleSelection(selected, modules).size` y `modules.length`. Hace pasar T017.
- [X] T019 [P] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.test.tsx` (tras T008, T009): el harness pasa un prop nuevo `clinicModules={{ modules: [...], loading: false, loadFailed: false, onRetry: vi.fn() }}` con datos fijos (sin MSW); la aserción ya existente sobre Pacientes siempre marcado se confirma con ese catálogo de prueba. El resto de las aserciones (nombre, descripción, precios, autoconsumo, tipo, límites) no cambia. Debe fallar en lo nuevo.
- [X] T020 Implementar (tras T018, T019) en `src/features/subscriptions/components/SubscriptionFormFields.tsx`: agregar el prop `clinicModules: { modules: readonly ClinicModule[]; loading: boolean; loadFailed: boolean; onRetry: () => void }`, desestructurarlo y pasarlo a `<ModulesField control={control} errors={errors} modules={clinicModules.modules} loading={clinicModules.loading} loadFailed={clinicModules.loadFailed} onRetry={clinicModules.onRetry} />`. Hace pasar T019.

**Checkpoint**: `ModulesField`/`SubscriptionFormFields` ya funcionan de punta a punta con cualquier catálogo que se les pase (carga, error, vacío, Pacientes forzado, sin dependencias); todavía no están conectados a ninguna pantalla real.

---

## Phase 3: User Story 1 - El alta de una suscripción ofrece los módulos de clínica realmente activos (Priority: P1) 🎯 MVP

**Goal**: `/subscriptions/new` pide el catálogo vigente de módulos de clínica activos, lo muestra en su sección de módulos y en la Vista previa, y envía al guardar exactamente las keys que quedaron marcadas (FR-001, FR-003 a FR-008, FR-010 a FR-012).

**Independent Test**: abrir el alta, comprobar que los módulos mostrados coinciden con el catálogo vigente en su orden, que Pacientes no se puede desmarcar, que la Vista previa refleja lo mismo que las casillas, y que guardar envía exactamente las keys marcadas (quickstart Z1-Z3, Z7 alta, Z8).

### Tests for User Story 1 ⚠️

- [X] T021 [P] [US1] Reescribir `src/features/subscriptions/components/SubscriptionPreviewPanel.test.tsx` (data-model.md, «SubscriptionPreviewPanel»; research D6): el harness pasa un prop nuevo `modules: readonly ClinicModule[]` con datos fijos, en vez de depender de `messages.subscriptions.modules.catalog`; la sección «Módulos incluidos» de la vista previa lista los módulos cuyo key está en `resolveModuleSelection(values.moduleKeys, modules)`, con `module.name` (no `text.modules.catalog[key].name`); Pacientes aparece siempre en la lista de incluidos aunque no esté en `values.moduleKeys` del harness, si `modules` lo trae. Debe fallar.
- [X] T022 [US1] Implementar (tras T013, T021) en `src/features/subscriptions/components/SubscriptionPreviewPanel.tsx`: agregar el prop `modules: readonly ClinicModule[]`; sustituir el `for (const key of CLINIC_MODULE_ORDER)` por una separación de incluidos/excluidos sobre `modules`, usando `resolveModuleSelection(values.moduleKeys, modules)`; usar `module.name` en vez de `text.modules.catalog[key].name`. Hace pasar T021.
- [X] T023 [P] [US1] Ampliar `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx` (tras T009): registrar `createClinicModulesCatalogMock()` junto al mock ya existente en `start()`. Casos nuevos: mientras el catálogo de módulos carga, «Guardar» está deshabilitado; si falla (`failWith`), se ve el estado de error con reintento y «Guardar» sigue deshabilitado hasta reintentar con éxito; si el catálogo resuelve vacío, se ve el aviso de vacío y «Guardar» sigue deshabilitado; con el catálogo por omisión (los nueve módulos de siempre), la prueba ya existente que busca la casilla «Recordatorios» (línea con `messages.subscriptions.modules.catalog.reminders.name`) sigue pasando sin reescritura, solo con el mock nuevo registrado (research D10). Debe fallar en lo nuevo.
- [X] T024 [US1] Implementar (tras T011, T013, T020, T022, T023) en `src/features/subscriptions/components/SubscriptionCreatePage.tsx`: `const modulesCatalog = useClinicModulesCatalog();`; `const modulesCatalogUsable = modulesCatalog.data !== undefined && modulesCatalog.data.length > 0;`; en `save`, antes de `create.mutateAsync`, armar `const resolved: SubscriptionFormValues = { ...values, moduleKeys: resolveModuleSelection(values.moduleKeys, modulesCatalog.data ?? []) };` y usar `resolved`; `<FormFrame ... saveDisabled={!modulesCatalogUsable}>`; pasar `clinicModules={{ modules: modulesCatalog.data ?? [], loading: modulesCatalog.isPending, loadFailed: modulesCatalog.isError && modulesCatalog.data === undefined, onRetry: () => { void modulesCatalog.refetch(); } }}` a `SubscriptionFormFields` y `modules={modulesCatalog.data ?? []}` a `SubscriptionPreviewPanel`. Hace pasar T023.
- [X] T025 [US1] Ampliar `src/app/router/subscriptions/createSubscription.integration.test.tsx`: registrar `createClinicModulesCatalogMock()` junto al resto de los mocks del recorrido, para que el alta cargue de punta a punta por el router.
- [ ] T026 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z1, Z2, Z3, Z7 (alta) y Z8 de [quickstart.md](quickstart.md).

**Checkpoint**: el alta de una suscripción (`/subscriptions/new`) funciona de punta a punta con el catálogo dinámico, incluida la Vista previa.

---

## Phase 4: User Story 2 - La edición de una suscripción existente también usa el catálogo vigente de módulos (Priority: P2)

**Goal**: `/subscriptions/{id}/edit` pide el catálogo vigente en paralelo con la propia suscripción, muestra marcados los módulos que la suscripción ya tenía y que siguen activos, no ofrece los que ya no lo están, y Pacientes sigue sin poder desmarcarse (FR-002, FR-003 a FR-009).

**Independent Test**: abrir la edición de una suscripción con módulos ya guardados, comprobar que los que siguen activos aparecen marcados y los que ya no lo están no aparecen como opción, que Pacientes no se puede desmarcar, y que guardar sin tocar nada deja caer cualquier módulo obsoleto (quickstart Z4, Z5, Z7 edición, Z9).

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Ampliar `src/features/subscriptions/components/SubscriptionEditPage.test.tsx` (tras T009): registrar `createClinicModulesCatalogMock()`. Casos nuevos: una suscripción cuyo `module_keys` guardado incluye una key que el mock ya no ofrece como activa no la muestra como opción marcable, y al guardar sin volver a incluirla, la solicitud enviada ya no la trae (FR-009); una suscripción cuyo `module_keys` guardado NO incluye `patients` la muestra igual marcada (Assumptions del spec) y la solicitud de guardado la incluye aunque el operador no toque nada; mientras el catálogo de módulos carga o falla, «Guardar» está deshabilitado, igual que en el alta; las aserciones ya existentes que buscan casillas por nombre (`messages.subscriptions.modules.catalog.patients.name`, `.reminders.name`) siguen pasando con el catálogo por omisión del mock nuevo, sin reescribirse. Debe fallar en lo nuevo.
- [X] T028 [US2] Implementar (tras T011, T013, T020, T024, T027) en `src/features/subscriptions/components/SubscriptionEditPage.tsx`: en `SubscriptionEditPage` (el componente de arriba), agregar `const modulesCatalog = useClinicModulesCatalog();` junto a `useSubscription(subscriptionId)` (en paralelo, research D7) y pasarlo como prop a `EditSubscriptionForm`; en `EditSubscriptionForm`, recibir `modulesCatalog: UseQueryResult<ClinicModule[]>` como prop; `toFormValues(initial)` sin cambios (research D7: sigue sin filtrar contra el catálogo); en `save`, antes de `toUpdateSubscriptionBody`, resolver `values.moduleKeys` igual que en el alta (T024) y usar el valor resuelto; `saveDisabled` y el prop `clinicModules` de `SubscriptionFormFields` armados igual que en `SubscriptionCreatePage`. Hace pasar T027.
- [X] T029 [US2] Ampliar `src/app/router/subscriptions/editSubscription.integration.test.tsx`: registrar `createClinicModulesCatalogMock()` junto al resto de los mocks, para que la edición cargue de punta a punta por el router; confirmar que la aserción ya existente sobre la casilla «Recordatorios» (línea con `messages.subscriptions.modules.catalog.reminders.name`) sigue pasando con el mock nuevo registrado.
- [ ] T030 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z4, Z5, Z7 (edición) y Z9 de [quickstart.md](quickstart.md).

**Checkpoint**: la edición de una suscripción (`/subscriptions/{id}/edit`) funciona de punta a punta con el catálogo dinámico, incluido el caso de un módulo que ya no está activo.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T031 Revisar `e2e/subscriptions.spec.ts` (research D12): confirmar que ningún escenario busca una casilla de módulo por nombre (el único paso que toca «lo que incluye» una suscripción, V9, es sobre «Otras funcionalidades», un campo distinto) y que, por lo tanto, no necesita cambios. Confirmado por búsqueda: cero referencias a `modules.catalog`/checkbox en el archivo; sin cambios.
- [X] T032 Ejecutar `npm run typecheck`, `npm run lint` y `npm run format:check`; corregir lo que señalen. Los tres en verde, sin advertencias.
- [X] T033 Ejecutar `npm run build` y `npm run size`; confirmar que el bundle sigue dentro del presupuesto de 320 KB gzip. Build exitoso; bundle 307.7 KB de 320 KB (margen de 12.3 KB).
- [X] T034 Ejecutar `npm run test:coverage`; confirmar que `schemas/clinicModule.ts`, `api/clinicModulesApi.ts`, `hooks/clinicModuleKeys.ts`, `hooks/useClinicModulesCatalog.ts` y `policy/clinicModuleSelection.ts` quedan con cobertura ≥80 % de líneas (constitución VII), y que el resto de la suite sigue en verde. Los cinco archivos nuevos de lógica pura: **100 % de líneas/statements/funciones, 100 % de ramas** (15/15 pruebas, corrida acotada y liviana). El resto de la suite se verificó en corridas más chicas y confiables en vez de una sola corrida de los 383 archivos con cobertura: esta máquina, con varias apps pesadas ya en marcha (varias instancias de VS Code, WSL, Postman, DBeaver, Excel), no sostiene esa corrida completa sin que aparezcan timeouts genéricos de 15-30 s repartidos en archivos no relacionados con esta feature (incluida `features/modules`, que esta feature no toca); cada archivo marcado así se re-ejecutó solo o en un lote chico y pasó limpio (`ModulesField` 11/11, `SubscriptionFormFields` 17/17, `SubscriptionPreviewPanel` 10/10, `SubscriptionCreatePage` 33/33 dos veces, `SubscriptionEditPage` 31/31, `createSubscription.integration` 12/12, `editSubscription.integration` 11/11, `credential.integration` y `deleteSubscription.integration` en verde, y los tres archivos de `features/modules` marcados como fallidos, 8/8 en verde al aislarlos). Quedan sin tocar los 2 fallos preexistentes y ajenos a esta feature en `src/app/config/env.test.ts`, ya documentados al cerrar la feature 019.
- [ ] T035 Punto de control final: validar manualmente Z6 (catálogo vacío, requiere bloquear temporalmente los módulos de clínica desde `/modules`) y Z9 (accesibilidad con lector de pantalla y teclado) de [quickstart.md](quickstart.md); confirmar que las demás tareas quedaron marcadas `[X]`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea US1 y US2 por completo (ambas comparten `ModulesField`, `SubscriptionFormFields`, el catálogo, la política y el simulador).
- **US1 (Phase 3)**: depende de Foundational. No depende de US2.
- **US2 (Phase 4)**: depende de Foundational. No depende de US1 (comparte archivos de Foundational con ella, pero ningún archivo propio).
- **Polish (Phase 5)**: depende de que US1 y US2 estén completas.

### Dentro de Foundational

Orden estricto por archivo: T002→T003 (esquema) → T004→T005 (api) en paralelo con T006→T007 (keys) → T008 (mensajes) y T009 (simulador MSW) en paralelo entre sí, ambos antes de T010 → T010→T011 (hook) → T012→T013 (política) → T014 (borrado) → T015→T016 (`subscriptionForm.ts`) → T017→T018 (`ModulesField`, depende de T008, T009, T013) → T019→T020 (`SubscriptionFormFields`, depende de T018).

### Parallel Example: Foundational

```text
# En paralelo, al iniciar Foundational:
Task: "Crear schemas/clinicModule.test.ts"
Task: "Crear hooks/clinicModuleKeys.test.ts"

# Más tarde, en paralelo entre sí (ambas antes del hook, T010):
Task: "Agregar a es.ts: modules.marked/.loadError/.empty"
Task: "Crear src/test/handlers/subscriptionModulesCatalog.ts"
```

### Parallel Example: US1 y US2

Una vez cerrado el Checkpoint de Foundational, US1 y US2 se pueden trabajar en paralelo (no comparten
ningún archivo propio): `SubscriptionCreatePage.tsx`/`SubscriptionPreviewPanel.tsx` (US1) y
`SubscriptionEditPage.tsx` (US2) son archivos distintos.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (crítica — bloquea ambas historias).
3. Completar Phase 3: User Story 1 (el alta).
4. **Detenerse y validar**: Z1 a Z3, Z7 (alta), Z8 de quickstart.md.
5. El alta de suscripciones ya ofrece el catálogo dinámico de punta a punta: es el MVP de esta feature.

### Entrega incremental

1. Setup + Foundational → infraestructura lista, sin pantalla conectada todavía.
2. + User Story 1 → el alta funciona de punta a punta (MVP).
3. + User Story 2 → la edición funciona de punta a punta, incluido el caso del módulo obsoleto.
4. + Polish → calidad verificada (tipos, lint, formato, build, bundle, cobertura) y validación manual completa.
