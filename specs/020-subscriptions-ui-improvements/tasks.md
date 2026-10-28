---

description: "Task list template for feature implementation"
---

# Tasks: Reorganización visual del formulario, el listado y el comparativo de suscripciones

**Input**: Design documents from `/specs/020-subscriptions-ui-improvements/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md). Sin `contracts/`: esta feature no agrega, cambia ni repite ninguna llamada a la API (research D8); los contratos de las features 003/012/018/019 siguen vigentes sin cambio.

**Tests**: incluidas. La constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first para lógica pura; la spec deja las pruebas para `/speckit-implement` (Assumptions). Dentro de cada historia, la prueba de cada pieza nueva se escribe ANTES que su implementación y DEBE fallar al principio. Esta feature no toca el simulador de pruebas MSW (`src/test/handlers/subscriptionsCatalog/`): no hay contrato nuevo que simular (research D8), así que todas las pruebas son de esquemas puros, hooks y componentes, contra el catálogo de prueba ya sembrado.

**Organization**: tareas agrupadas por historia de usuario de `spec.md` (US1=P1 "límites agrupados en el formulario", US2=P2 "listado con tipo/clínicas/consultorios/precio anual, ordenado", US3=P3 "Comparativo filtrado por tipo", US4=P4 "límite de clínicas e iconos en el Comparativo"), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1, US2, US3, US4); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único existente en la raíz del repositorio (`C:\Maily\code\maily-backoffice`): `src/`. Solo se toca `src/features/subscriptions` (que sigue sin importar `@/features/auth`), dos archivos de `src/shared` (`ui/iconRegistry.ts`, `messages/es.ts`) y las pruebas de integración de `src/app/router/subscriptions/`. Ninguna ruta, navegación, capacidad ni dato nuevo de la API (plan.md, Project Structure; spec.md, Fuera de alcance). Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en `es.ts`. Sin aserciones `as`, sin `any`, sin `console.*`.

---

## Phase 1: Setup

No aplica: sin dependencias nuevas (`DataGrid`, `ToggleButtonGroup`/`ToggleButton` y `lucide-react` ya están en uso, research), sin variables de entorno, rutas ni carpetas nuevas en `app` (plan.md, Project Structure).

---

## Phase 2: Foundational (Blocking Prerequisites)

No aplica: a diferencia de otras features, ninguna pieza es prerrequisito de las cuatro historias a la vez (research D8: ningún esquema de dominio cambia). US1 es enteramente independiente (toca solo el formulario). US2 y US3 comparten tres archivos (`schemas/subscriptionsLocation.ts`, `schemas/subscriptionsSort.ts`, `hooks/useSubscriptionsLocation.ts`), pero cada uno aporta valor completo por sí solo; US3 los **amplía** en vez de crearlos, así que se secuencia después de US2 (igual criterio que ya usó la 019 entre historias que comparten archivo, sin que eso exija una fase propia). US4 no comparte ningún archivo de implementación con US2 ni con US3.

---

## Phase 3: User Story 1 - Los límites de la clínica se ven agrupados en el alta y la edición (Priority: P1) 🎯 MVP

**Goal**: el límite de clínicas se muestra al final del formulario, agrupado con los demás límites de la clínica, bajo un título «Límites» con la misma apariencia que «Módulos incluidos». Ningún comportamiento de negocio cambia (FR-003).

**Independent Test**: abrir el alta y comprobar que el límite de clínicas aparece junto con Consultorios, Doctores, Asistentes y Pacientes nuevos al año, bajo el título «Límites»; abrir la edición y comprobar lo mismo (quickstart Z1-Z3).

### Tests for User Story 1 ⚠️

> Escribir esta prueba primero y comprobar que falla antes de implementar.

- [X] T001 [P] [US1] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.test.tsx` (data-model.md, «SubscriptionFormFields»): afirmar que existe una sola sección con un título «Límites» (`messages.subscriptions.form.fields.limits`), con el mismo rol/variante de tipografía que el título «Módulos incluidos»; que esa sección contiene, en orden, el límite de clínicas (`ClinicsLimitField`, por su label accesible `text.fields.clinicsLimit`) seguido de Consultorios, Doctores, Asistentes y Pacientes nuevos al año; y que el límite de clínicas ya no aparece inmediatamente después del control de tipo de suscripción (antes de Nombre).

### Implementation for User Story 1

- [X] T002 [US1] Agregar a `src/shared/messages/es.ts`, bloque `subscriptions.form.fields`: `limits: 'Límites'` (sin prueba propia; la consume T001).
- [X] T003 [US1] Implementar (tras T001, T002) en `src/features/subscriptions/components/SubscriptionFormFields.tsx`: mover `<ClinicsLimitField>` al `Stack` que ya envuelve `ClinicLimitsFields`, como su primer elemento (antes de Consultorios); agregar `<Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold' }}>{text.fields.limits}</Typography>` justo antes de ese `Stack`, mismo patrón que ya usa el título de `ModulesField`. No cambia ninguna prop ni comportamiento de `ClinicsLimitField` ni de `ClinicLimitsFields` (FR-003). Hace pasar T001.
- [X] T004 [US1] Revisar (tras T003) `SubscriptionCreatePage.test.tsx`, `SubscriptionEditPage.test.tsx` y los integration tests `src/app/router/subscriptions/createSubscription.integration.test.tsx`/`editSubscription.integration.test.tsx`: confirmar que siguen pasando (consultan el campo por su label accesible, no por posición en el DOM) o ajustarlos si alguno depende del orden anterior del formulario.
- [ ] T005 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z1 a Z3 de [quickstart.md](quickstart.md).

**Checkpoint**: el formulario de alta y edición agrupa los límites de la clínica bajo «Límites», de punta a punta.

---

## Phase 4: User Story 2 - El listado de suscripciones muestra tipo, clínicas, consultorios y precio anual (Priority: P2)

**Goal**: el listado muestra las columnas Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual y Estatus, en ese orden; ordenado de menor a mayor precio mensual al abrirse, y reordenable por cualquier columna, con el orden vigente en la URL.

**Independent Test**: abrir el listado y comprobar las siete columnas en orden con datos correctos; comprobar el orden ascendente por precio mensual al abrir; hacer clic en «Precio anual» y comprobar que reordena por ese campo (quickstart Z4-Z5).

### Tests for User Story 2 ⚠️

- [X] T006 [P] [US2] Ampliar `src/features/subscriptions/schemas/subscriptionsLocation.test.ts` (data-model.md, «SubscriptionsLocation»): `parseSubscriptionsSearchParams`/`toSubscriptionsSearchParams` para el campo `sort`: ausente o con un campo inválido → `{ field: 'monthlyPrice', direction: 'asc' }`, que se omite de la URL; `sort=name` → `{ field: 'name', direction: 'asc' }`; `sort=-name` → `{ field: 'name', direction: 'desc' }`, que sí se escribe en la URL; los siete campos de `SubscriptionsSortField` (`name`, `subscriptionType`, `clinicsCount`, `consultingRoomsLimit`, `monthlyPrice`, `annualPrice`, `status`) son válidos.
- [X] T007 [US2] Implementar (tras T006) en `subscriptionsLocation.ts`: agregar `SubscriptionsSortField`, `SubscriptionsSort`, `DEFAULT_SORT = { field: 'monthlyPrice', direction: 'asc' }` y el campo `sort` a `SubscriptionsLocation`, con el parseo/serialización de T006. Hace pasar T006.
- [X] T008 [P] [US2] Crear `src/features/subscriptions/schemas/subscriptionsSort.test.ts` (data-model.md, «sortSubscriptions»; research D7, D10): `sortSubscriptions(subscriptions, sort)` ordena ascendente y descendente por cada uno de los siete campos; `monthlyPrice`/`annualPrice` ordenan por el valor exacto en centavos (`toCents`, p. ej. "999.99" antes que "1000.00"), nunca alfabéticamente por el texto; el ordenamiento es estable (un empate conserva el orden relativo de entrada); una suscripción con `clinicsCount` nulo no rompe el ordenamiento por ese campo.
- [X] T009 [US2] Implementar (tras T008) `src/features/subscriptions/schemas/subscriptionsSort.ts` con `sortSubscriptions`, usando `toCents` de `schemas/price.ts` para `monthlyPrice`/`annualPrice` (research D7). Hace pasar T008.
- [X] T010 [US2] Ampliar (tras T007) `src/features/subscriptions/hooks/useSubscriptionsLocation.test.tsx`: `setSort` escribe el nuevo `sort` en la URL y regresa la página a 1 (research D9, mismo criterio que `setPageSize`).
- [X] T011 [US2] Implementar (tras T010) en `useSubscriptionsLocation.ts`: agregar `setSort`. Hace pasar T010.
- [X] T012 [P] [US2] Agregar a `es.ts`, bloque `subscriptions.list.columns`: `subscriptionType: 'Tipo'`, `consultingRoomsLimit: 'Consultorios'`, `annualPrice: 'Precio anual'` (sin prueba propia).
- [X] T013 [US2] Reescribir (tras T012) `src/features/subscriptions/components/SubscriptionsGrid.test.tsx` (data-model.md, «SubscriptionsGrid»): el orden de encabezados de columna es Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual, Estatus (FR-004); cada columna nueva muestra el dato correcto para una suscripción Individual y una Empresarial (Tipo: el nombre del tipo; Consultorios: el número; Precio anual: con el mismo formato que Precio mensual); Clínicas sigue mostrando «No disponible» cuando es `null`. Sustituir la prueba `'neither sorts nor has a menu of columns: the order is fixed'` por pruebas que confirman el ordenamiento: la grilla se abre con el `sortModel` que le pasa su prop `sort`; un clic en un encabezado dispara `onSortChange` con esa columna en ascendente, un segundo clic en descendente, nunca un tercer estado «sin orden».
- [X] T014 [US2] Implementar (tras T009, T013) en `SubscriptionsGrid.tsx`: agregar las columnas `subscriptionType`, `consultingRoomsLimit` y `annualPrice`, en el orden de FR-004; separar `valueGetter` (valor crudo: `toCents` para `monthlyPrice`/`annualPrice`, research D7/D10) de `valueFormatter` (texto de presentación, p. ej. `text.price.perMonth(formatMxn(...))`) en esas dos columnas más `clinicsCount`/`consultingRoomsLimit`, con `type: 'number'`; quitar `disableColumnSorting`; agregar `sortingMode="server"`, `sortingOrder={['asc', 'desc']}` y las props nuevas `sort`/`onSortChange`, mapeadas a `sortModel`/`onSortModelChange`. Hace pasar T013.
- [X] T015 [P] [US2] Ampliar (tras T007, T011) `src/features/subscriptions/components/SubscriptionsListPage.test.tsx`: `listPanel()` ordena `query.data` por `location.sort` antes de paginar (comprobar con un `sort` distinto del valor por defecto en la URL de prueba); al abrir sin parámetro `sort`, las filas aparecen ordenadas ascendente por precio mensual.
- [X] T016 [US2] Implementar (tras T014, T015) en `SubscriptionsListPage.tsx`: `listPanel()` llama a `sortSubscriptions(query.data ?? [], location.sort)` antes de `pageOf`; pasa `sort={location.sort}` y `onSortChange={setSort}` a `SubscriptionsGrid`. Hace pasar T015.
- [X] T017 [US2] Ampliar (tras T016) `src/app/router/subscriptions/subscriptionsList.integration.test.tsx`: recorrido de quickstart Z4 (las siete columnas, en orden, con datos correctos de una Individual y una Empresarial del catálogo de prueba) y Z5 (orden ascendente por precio mensual al abrir; reordenar por «Precio anual» con un clic en su encabezado).
- [ ] T018 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z4 y Z5 de [quickstart.md](quickstart.md).

**Checkpoint**: el listado muestra las siete columnas en orden, ordenado y reordenable, con el orden vigente en la URL, de punta a punta.

---

## Phase 5: User Story 3 - El Comparativo se filtra también por tipo de suscripción (Priority: P3)

**Goal**: el Comparativo gana un control para filtrar por tipo (Individual/Empresarial), ubicado antes de «Mensual y Anual»; los planes mostrados quedan ordenados de menor a mayor precio del ciclo vigente.

**Independent Test**: abrir el Comparativo, comprobar que el filtro de tipo aparece antes del ciclo; filtrar por Individual y por Empresarial y comprobar que solo se ven planes de ese tipo, ordenados por precio; cambiar el ciclo y comprobar que se reordenan (quickstart Z6-Z9).

**Nota de dependencia**: esta historia amplía `subscriptionsLocation.ts`, `subscriptionsSort.ts` y `useSubscriptionsLocation.ts`, que US2 ya creó/amplió (T007, T009, T011): sus tareas van después de esas, aunque su propia lógica (filtrar por tipo, ordenar por el ciclo) no depende de que el ordenamiento del listado (US2) esté terminado.

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] Ampliar (tras T007) `subscriptionsLocation.test.ts`: el campo `comparisonType` del parámetro `type_id`: ausente o con cualquier valor que no sea `'2'` → `SUBSCRIPTION_TYPE.INDIVIDUAL`, que se omite de la URL; `type_id=2` → `SUBSCRIPTION_TYPE.ENTERPRISE`, que sí se escribe en la URL.
- [X] T020 [US3] Implementar (tras T019) en `subscriptionsLocation.ts`: agregar `comparisonType: SubscriptionTypeId` (reutiliza el tipo de `subscriptionTypeCatalog.ts`) a `SubscriptionsLocation`, con el parseo/serialización de T019. Hace pasar T019.
- [X] T021 [P] [US3] Ampliar (tras T009) `subscriptionsSort.test.ts`: `sortByCyclePrice(subscriptions, cycle)` ordena siempre ascendente, por `monthlyPrice` cuando `cycle === 'monthly'` o por `annualPrice` cuando `cycle === 'annual'`, con `toCents` (research D7).
- [X] T022 [US3] Implementar (tras T021) en `subscriptionsSort.ts`: agregar `sortByCyclePrice`. Hace pasar T021.
- [X] T023 [P] [US3] Ampliar (tras T020) `useSubscriptionsLocation.test.tsx`: `setComparisonType` escribe el nuevo `type_id` en la URL; no toca `page` ni `pageSize` (el Comparativo no pagina).
- [X] T024 [US3] Implementar (tras T023) en `useSubscriptionsLocation.ts`: agregar `setComparisonType`. Hace pasar T023.
- [X] T025 [P] [US3] Crear `src/features/subscriptions/components/ComparisonTypeFilter.test.tsx` (data-model.md, «ComparisonTypeFilter»): un `ToggleButtonGroup` exclusivo con dos opciones, «Individual» y «Empresarial» (mismo texto que `messages.subscriptions.types.catalog`); un clic en la opción no activa llama a `onChange` con el `SubscriptionTypeId` correspondiente; un clic en la opción ya activa NO llama a `onChange` (mismo guard `if (next !== null)` que `PriceCycleToggle`). Sin violaciones de axe; operable con teclado (Tab + flechas + Espacio/Enter).
- [X] T026 [US3] Implementar (tras T025) `src/features/subscriptions/components/ComparisonTypeFilter.tsx`, mismo patrón que `PriceCycleToggle.tsx` (research D3, data-model.md). Hace pasar T025.
- [X] T027 [US3] Agregar a `es.ts`, bloque `subscriptions.comparison`: `emptyForType: (typeName: string) => \`No hay suscripciones de tipo ${typeName} para comparar.\`` (sin prueba propia).
- [X] T028 [US3] Ampliar (tras T020, T022, T024, T026, T027) `SubscriptionsListPage.test.tsx`: `comparisonPanel()` muestra `ComparisonTypeFilter` antes de `PriceCycleToggle` (FR-007); filtra `query.data` por `location.comparisonType` antes de pasarlo a `SubscriptionsComparisonTable`; ordena el resultado con `sortByCyclePrice(filtered, cycle)`; cuando el filtro no deja ninguna suscripción, muestra `text.comparison.emptyForType(...)` en vez de la tabla; cambiar el filtro no toca la selección vigente de `cycle`.
- [X] T029 [US3] Implementar (tras T028) en `SubscriptionsListPage.tsx`: `comparisonPanel()` filtra `query.data` por `location.comparisonType` y ordena con `sortByCyclePrice`, como en T028; agrega `<ComparisonTypeFilter value={location.comparisonType} onChange={setComparisonType} />` antes de `<PriceCycleToggle>`, dentro del mismo `Stack`; muestra el aviso vacío cuando corresponde. Hace pasar T028.
- [X] T030 [US3] Ampliar (tras T029) `subscriptionsList.integration.test.tsx`: recorrido de quickstart Z6 (el filtro de tipo aparece antes que «Mensual y Anual»), Z7 (filtrar por Individual y por Empresarial, cambiar el ciclo, ver el reordenamiento) y Z8 (cambiar el filtro varias veces no recarga la página ni toca el ciclo vigente).
- [ ] T031 [US3] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z6 a Z8 de [quickstart.md](quickstart.md) (Z9, el caso sin ningún plan de un tipo, queda cubierto por T028/T030 si el catálogo de prueba no tiene ese caso a mano).

**Checkpoint**: el Comparativo se filtra por tipo, en el orden de controles pedido, y reordena por el ciclo vigente, de punta a punta.

---

## Phase 6: User Story 4 - El Comparativo muestra el límite de clínicas y usa iconos para los módulos (Priority: P4)

**Goal**: la sección «Límites de la clínica» del Comparativo incluye el límite de clínicas de cada plan; la sección «Módulos» muestra un icono de inclusión/no inclusión en vez del texto «Incluido»/«No incluido».

**Independent Test**: abrir el Comparativo y comprobar la fila «Límite de clínicas»; comprobar que Módulos muestra iconos, no texto, con su nombre accesible (quickstart Z10-Z11).

### Tests for User Story 4 ⚠️

- [X] T032 [US4] Ampliar `src/features/subscriptions/components/SubscriptionsComparisonTable.test.tsx` (data-model.md, «SubscriptionsComparisonTable»; research D4, D5, D6): (a) la sección «Límites de la clínica» incluye, como primera fila, «Límite de clínicas» (`comparison.sections.clinicsLimit`), con el número guardado o «No disponible» (`text.clinics.notAvailable`) cuando `clinicsLimit` es `null`, antes de Consultorios/Doctores/Asistentes/Pacientes nuevos al año; (b) cada celda de la sección «Módulos» ya no contiene el texto «Incluido»/«No incluido»; en su lugar, un icono con `role="img"` y `aria-label` igual a ese mismo texto, según corresponda. Sin violaciones de axe.

### Implementation for User Story 4

- [X] T033 [P] [US4] Agregar a `es.ts`, bloque `subscriptions.comparison.sections`: `clinicsLimit: 'Límite de clínicas'` (sin prueba propia; la consume T032).
- [X] T034 [P] [US4] Ampliar `src/shared/ui/iconRegistry.ts`: agregar `included: Check` y `'not-included': X` (de `lucide-react`), junto a los iconos ya registrados (research D6); sin prueba propia (la ejercitan `Icon`, ya genérico, y T032).
- [X] T035 [US4] Implementar (tras T032, T033, T034) en `SubscriptionsComparisonTable.tsx`: agregar la fila «Límite de clínicas» (research D4); reemplazar el texto de cada celda de Módulos por `<Icon name={included ? 'included' : 'not-included'} color={included ? 'exito' : 'peligro'} accessibleName={included ? comparison.moduleIncluded : comparison.moduleNotIncluded} />` (research D5). Hace pasar T032.
- [X] T036 [US4] Ampliar (tras T035) `subscriptionsList.integration.test.tsx`: recorrido de quickstart Z10 (límite de clínicas en «Límites de la clínica», con y sin valor guardado) y Z11 (iconos en vez de texto en Módulos).
- [ ] T037 [US4] Punto de control de la historia: ejecutar las pruebas y validar manualmente Z10 a Z12 de [quickstart.md](quickstart.md) (Z12 cruza accesibilidad con US2/US3).

**Checkpoint**: las cuatro historias funcionan juntas de punta a punta.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: verificaciones finales que cruzan las cuatro historias.

- [ ] T038 [P] Revisar accesibilidad manual del filtro de tipo, el ordenamiento del listado y los iconos de Módulos (habilitados, con teclado y con un lector de pantalla) a 1024 px y a 320 px (quickstart Z12).
- [ ] T039 Ejecutar de punta a punta los escenarios Z1 a Z12 de [quickstart.md](quickstart.md) (los automatizados ya corren en CI; esta pasada es manual).
- [X] T040 Verificar que `SubscriptionsComparisonTable.tsx` sigue dentro del límite de 250 líneas de la constitución tras los cambios de US4 (plan.md, Structure Decision); si lo supera, extraer sub-componentes (p. ej. `ComparisonLimitsSection`/`ComparisonModulesSection`) sin cambiar ningún requisito de esta feature.
- [X] T041 Punto de control final: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:coverage` (umbral de 80 % en `api`, `schemas` y `shared/api|lib`) y `npm run build` pasan todos; revisar el presupuesto de bundle (320 KB gzip) tras agregar `ComparisonTypeFilter` y las columnas nuevas del listado. Cobertura global 98.79 % de líneas (supera el umbral); bundle 307.6 KB de 320 KB. Dos fallos preexistentes y ajenos a esta feature en `src/app/config/env.test.ts` (ya documentados en el cierre de la feature 019) bloquean una salida 100 % limpia de `npm run test`/`test:coverage`; el resto de las 4351 pruebas pasa (4349/4351).

**Checkpoint**: feature completa, validada contra el quickstart.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no aplica.
- **Foundational (Phase 2)**: no aplica.
- **User Stories (Phase 3-6)**: sin una fase bloqueante previa (research D8: ningún esquema de dominio cambia).
  - US1 no depende de ninguna otra historia ni comparte archivo de implementación con ellas (solo `es.ts`, con claves distintas).
  - US2 no depende de ninguna otra historia.
  - US3 depende de que US2 haya creado/ampliado `subscriptionsLocation.ts`, `subscriptionsSort.ts` y `useSubscriptionsLocation.ts` (T007, T009, T011), porque los amplía en vez de crearlos; su propia lógica (filtrar por tipo, ordenar por el ciclo) no depende de que el ordenamiento del listado (T014-T018) esté implementado.
  - US4 no depende de US2 ni de US3 (no comparte ningún archivo de implementación con ellas); solo comparte `SubscriptionsComparisonTable.test.tsx`/`.tsx` consigo misma.
- **Polish (Phase 7)**: depende de las cuatro historias.

### Dentro de cada historia

- Tests antes que la implementación que los hace pasar (marcado «Hace pasar TXXX» en cada tarea de implementación).
- Los textos nuevos de `es.ts` antes que la implementación que los consume.

### Parallel Opportunities

- Las cuatro historias pueden empezar en paralelo si hay equipo para ello, salvo US3, que espera a que US2 cree los tres archivos compartidos (ver arriba).
- Dentro de US2: T006 y T008 (pruebas de piezas sin dependencias entre sí) en paralelo; T012 en paralelo con el resto una vez escrito; T015 en paralelo con T013/T014 (archivos distintos).
- Dentro de US3: T019, T021, T025 en paralelo (archivos distintos, sin dependencia entre sí).
- Dentro de US4: T033 y T034 en paralelo (archivos distintos, ambos sin prueba propia).

---

## Parallel Example: User Story 2

```bash
Task: "Ampliar src/features/subscriptions/schemas/subscriptionsLocation.test.ts con el campo sort (T006)"
Task: "Crear src/features/subscriptions/schemas/subscriptionsSort.test.ts (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 sola)

1. Completar Phase 1: Setup (no aplica).
2. Completar Phase 2: Foundational (no aplica).
3. Completar Phase 3: US1 (el formulario agrupa los límites bajo «Límites»; cambio de apariencia, autocontenido).
4. **PARAR y VALIDAR**: quickstart Z1 a Z3.

### Incremental Delivery

1. US1 → valor por sí sola, sin tocar listado ni Comparativo.
2. US2 → el listado muestra y ordena las siete columnas; valor por sí sola, sin el filtro del Comparativo.
3. US3 → el Comparativo se filtra por tipo, sobre lo que US2 ya dejó en `subscriptionsLocation.ts`/`subscriptionsSort.ts`.
4. US4 → el Comparativo muestra el límite de clínicas y los iconos de Módulos; independiente de US3 a nivel de código, aunque ambas mejoran la misma pantalla.
5. Polish → accesibilidad y quickstart completo.

### Parallel Team Strategy

1. Una persona hace US1 (T001-T005), enteramente aparte.
2. Otra persona hace US2 (T006-T018).
3. Una tercera puede empezar US4 (T032-T037) en paralelo con US2, porque no comparte archivos de implementación con ella.
4. US3 (T019-T031) espera a que US2 termine T007, T009 y T011 (los tres archivos que amplía).

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí.
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad.
- Verificar que las pruebas fallan antes de implementar.
- Esta feature no agrega, cambia ni repite ninguna llamada a la API de suscripciones (research D8): no hay simulador MSW que ampliar.
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés).
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia (salvo la ya documentada entre US2 y US3).
