---

description: "Task list template for feature implementation"
---

# Tasks: Tipo de suscripción (Individual o Empresarial)

**Input**: Design documents from `/specs/018-add-subscription-type/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/subscriptions-service.md](./contracts/subscriptions-service.md), [quickstart.md](./quickstart.md), y lo que sigue vigente de [../003-manage-subscription-types/tasks.md](../003-manage-subscription-types/tasks.md) y [../012-configure-subscription-plans/tasks.md](../012-configure-subscription-plans/tasks.md) (no se repite aquí).

**Tests**: incluidas. La constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first para lógica pura; la spec deja las pruebas para `/speckit-implement` (Assumptions). Dentro de cada fase, la prueba de cada pieza nueva de `schemas/` y `api/` se escribe ANTES que su implementación y DEBE fallar al principio (mismo criterio que 003 y 012). `validation.ts` del simulador no tiene archivo de prueba propio (tampoco lo tenía en 003/012): sus reglas se verifican a través de `create.test.ts`/`update.test.ts`, dentro de las fases de historia. La API de suscripciones se simula a nivel de red con el simulador con estado ya existente de `src/test/handlers/subscriptionsCatalog/`, ampliado en Foundational; nunca se usa un mock de `fetch` ni del cliente HTTP.

**Organization**: tareas agrupadas por historia de usuario de `spec.md` (US1=P1 "elegir el tipo al crear una suscripción", US2=P2 "ver el tipo de una suscripción, también al editarla"), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1, US2); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único existente en la raíz del repositorio (`C:\Maily\code\maily-backoffice`): `src/`. Solo se toca la feature `src/features/subscriptions` (que sigue sin importar `@/features/auth`), su simulador de pruebas (`src/test/handlers/subscriptionsCatalog/`, `src/test/factories.ts`) y los textos compartidos de `src/shared/messages/es.ts`. Ninguna ruta, navegación, capacidad, columna de listado ni fila del Comparativo cambia (plan.md, Project Structure; spec.md, Fuera de alcance). Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en `es.ts`. Sin aserciones `as` (salvo `as const` y el único cast documentado en data-model.md), sin `any`, sin `console.*`.

---

## Phase 1: Setup

No aplica: sin dependencias nuevas (`ToggleButtonGroup` ya está en `@mui/material`, research D1/D3), sin variables de entorno, rutas ni carpetas nuevas (plan.md, Project Structure). El campo agregado es demasiado pequeño para mover el presupuesto de bundle de forma medible (precedente: 017-modal-edit-dialogs tampoco remidió el bundle); si la puerta de CI del presupuesto fallara, se trata en el Polish final (T034).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el catálogo fijo de los dos tipos, el campo nuevo en el esquema de lectura, el formulario, el catálogo de errores, los textos y el simulador de pruebas — todo lo que **ambas** historias necesitan (US1 para ofrecer el control de alta; US2 para leer y mostrar el tipo en el detalle y en la edición).

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

### Catálogo de tipos

- [X] T001 [P] Escribir `src/features/subscriptions/schemas/subscriptionTypeCatalog.test.ts` (debe fallar primero; data-model.md, `SubscriptionTypeCatalog`; research D1). `SUBSCRIPTION_TYPE` es exactamente `{ INDIVIDUAL: 1, ENTERPRISE: 2 }`. `SUBSCRIPTION_TYPE_ORDER` es la tupla `[1, 2]` (es decir, `[SUBSCRIPTION_TYPE.INDIVIDUAL, SUBSCRIPTION_TYPE.ENTERPRISE]`), en ese orden exacto y sin duplicados.
- [X] T002 Implementar (tras T001) `src/features/subscriptions/schemas/subscriptionTypeCatalog.ts`: `SUBSCRIPTION_TYPE` (`as const`), `SUBSCRIPTION_TYPE_ORDER` (`as const`) y el tipo `SubscriptionTypeId = (typeof SUBSCRIPTION_TYPE_ORDER)[number]` (`1 | 2`). Hace pasar T001.

### Esquema de la suscripción

- [X] T003 [P] Ampliar `src/features/subscriptions/schemas/subscription.test.ts` (debe fallar primero; data-model.md, `Subscription`). `subscriptionSchema` convierte además: `subscription_type` → `subscriptionType`, un objeto `{ id, name }` («igual forma que `status`»; **obligatorio en toda lectura**, nunca `null` ni ausente — un DTO sin él debe rechazar el parseo). El esquema **no restringe** `id` a `1`/`2` (debe aceptar, sin rechazar, un `subscription_type: { id: 3, name: 'Otro' }`, para no romper la lectura de un tipo futuro agregado a mano al catálogo de la plataforma — research D2). Los campos que ya probaban T008/T021 de la 003/012 no cambian.
- [X] T004 Implementar (tras T003) `src/features/subscriptions/schemas/subscription.ts`: agregar `subscription_type: z.object({ id: z.number().int(), name: z.string() })` al esquema y `subscriptionType: dto.subscription_type` al `.transform()`. Hace pasar T003.

### Formulario

- [X] T005 [P] Ampliar `src/features/subscriptions/schemas/subscriptionForm.test.ts` (debe fallar primero; data-model.md, «Formulario»). `SubscriptionFormValues` gana `subscriptionTypeId: SubscriptionTypeId`, validado como `z.union([z.literal(SUBSCRIPTION_TYPE.INDIVIDUAL), z.literal(SUBSCRIPTION_TYPE.ENTERPRISE)])` (solo `1` o `2`; cualquier otro número, texto o `null` se rechaza). **No existe un mensaje de "obligatorio"** para este campo (el control nunca lo deja sin marcar). `toFormValues(subscription)` da `subscriptionTypeId: subscription.subscriptionType.id`. `toCreateSubscriptionBody(values)` agrega `subscription_type_id: values.subscriptionTypeId`. `toUpdateSubscriptionBody(initial, values)` **nunca** agrega `subscription_type_id` al cuerpo devuelto, ni siquiera si `values.subscriptionTypeId` y el id de `initial.subscriptionType` difirieran (el cuerpo no declara esa propiedad en absoluto; research D4).
- [X] T006 Implementar (tras T002, T004, T005) `src/features/subscriptions/schemas/subscriptionForm.ts` con las reglas de T005; `EditableData` (el `Pick<Subscription, …>` que toma `toFormValues`) gana `'subscriptionType'`, usado solo para leer su `id`, nunca comparado en `toUpdateSubscriptionBody`. Valor inicial del alta: `subscriptionTypeId: SUBSCRIPTION_TYPE.INDIVIDUAL` (Clarifications de spec.md). Hace pasar T005.

### Catálogo de errores

- [X] T007 [P] Ampliar `src/features/subscriptions/api/subscriptionErrors.test.ts` (debe fallar primero; research D5; contracts/subscriptions-service.md, «Errores nuevos»). `SubscriptionFormField` gana `'subscriptionTypeId'`. `describeSubscriptionError` gana el caso `'subscription_type_not_found'` (422) → `{ kind: 'field', message: text.fields.subscriptionTypeId, fields: { subscriptionTypeId: text.fields.subscriptionTypeId } }` (mismo patrón que ya recibe `'subscription_module_not_found'`). Un `validation_error` genérico con `errors: [{ field: 'subscription_type_id', message: '…' }]` se mapea igual que los demás campos (vía el `Map` `FORM_FIELDS`, que gana `['subscription_type_id', 'subscriptionTypeId']`).
- [X] T008 Implementar (tras T007) `src/features/subscriptions/api/subscriptionErrors.ts` con el caso de T007; ampliar también `src/features/subscriptions/components/applyRefusal.ts`: su lista `FORM_FIELDS` (el orden de foco del primer campo con error) gana `'subscriptionTypeId'`, como primer elemento (es el primer control del formulario, T015/T017 más abajo). Hace pasar T007.

### Mensajes

- [X] T009 Agregar a `src/shared/messages/es.ts`, en el bloque `subscriptions` (sin prueba propia; lo consumen las pruebas de componentes de ambas historias):
  - `types.catalog`: `{ 1: { name: 'Individual', description: 'Médico independiente con un solo consultorio.' }, 2: { name: 'Empresarial', description: 'Empresa con varias clínicas y varios consultorios por clínica.' } }` (data-model.md, FR-002).
  - `form.fields.subscriptionType: 'Tipo de suscripción'` (nombre accesible del grupo de opciones).
  - `form.subscriptionTypeImmutableHelper: 'El tipo no se puede modificar después de creada.'` (FR-004).
  - `detail.fields.type: 'Tipo'` (FR-006).
  - `errors.fields.subscriptionTypeId: 'El tipo de suscripción no es válido.'` (FR-007; mismo texto para el caso `subscription_type_not_found` y para el genérico de validación).

### Simulador de pruebas

- [X] T010 [P] Ampliar `src/test/handlers/subscriptionsCatalog/model.test.ts` (debe fallar primero; contracts/subscriptions-service.md). `create(input)` exige `input.subscription_type_id` como `1` o `2`; con cualquier otro entero positivo (por ejemplo `99`) lanza `CatalogError(422, 'subscription_type_not_found', …)`, con un mensaje que incluye el identificador recibido (mismo patrón que `notFoundError`). La suscripción creada trae `subscriptionTypeId` igual al enviado. `toDto()` incluye `subscription_type: { id, name }`, con `name` «Individual» para `1` y «Empresarial» para `2` (tabla propia del simulador, no importada de `es.ts`, igual trato que ya reciben los nombres de estatus). `catalogSubscription()` (la factoría) da `subscriptionTypeId: 1` por defecto.
- [X] T011 Implementar (tras T002, T010) `src/test/handlers/subscriptionsCatalog/model.ts`: agregar `subscriptionTypeId: number` a `CatalogSubscription` y `subscription_type_id: number` a `SubscriptionInput` (**no** a `SubscriptionChanges`: ese tipo no declara la propiedad, a propósito, igual que el contrato real); una tabla `{ 1: 'Individual', 2: 'Empresarial' }` propia del simulador para `toDto()`; `create()` valida `input.subscription_type_id` contra esa tabla antes de crear, igual orden que ya usa `normalizeModuleKeys` (se descubre al escribir, no con una lectura previa); `catalogSubscription()` gana `subscriptionTypeId: 1` en sus valores por defecto. Hace pasar T010.
- [X] T012 Implementar (tras T011) `src/test/handlers/subscriptionsCatalog/validation.ts`:
  - `validateCreate`: `subscription_type_id` es obligatorio, entero y `> 0` (si falta, es `null`, no es entero o es `≤ 0`, el mensaje es `'El tipo de suscripción es obligatorio y debe ser un número entero positivo.'`, verbatim del contrato); se agrega a los campos permitidos de la creación (distinto de `WRITABLE_FIELDS`, que sigue siendo solo los campos que también admite la edición).
  - `validateUpdate`: si el cuerpo trae `subscription_type_id` (con cualquier valor), se rechaza con el mensaje `'El tipo de suscripción no puede modificarse una vez creada.'` (verbatim del contrato) **en vez de** el genérico `` `El campo «${field}» no está permitido.` ``; no se agrega a `WRITABLE_FIELDS`.

  Ninguna de las dos reglas tiene un archivo de prueba propio: T018 y T024 (más abajo) las verifican a través de `create.test.ts`/`update.test.ts`.
- [X] T013 [P] Ampliar `src/test/factories.ts` (tras T004): `subscriptionDto(overrides)` agrega por defecto `subscription_type: { id: 1, name: 'Individual' }`.
- [X] T014 Punto de control de la fase: `npm run typecheck`, `npm run lint` y `npm run test` pasan con todo lo anterior, en particular `src/features/subscriptions/{schemas,api}/` y `src/test/{factories.ts,handlers/subscriptionsCatalog/}`.

**Checkpoint**: catálogo, esquema, formulario, errores, textos y simulador listos — las historias pueden empezar.

---

## Phase 3: User Story 1 - Elegir el tipo al crear una suscripción (Priority: P1) 🎯 MVP

**Goal**: el formulario de alta ofrece un control de selección única (Individual/Empresarial) que abre con Individual marcado, nunca queda sin selección, y el tipo elegido se envía al crear.

**Independent Test**: abrir «Nueva suscripción», verificar que Individual aparece ya marcado; guardar sin tocar el control y verificar que la suscripción queda Individual; crear otra cambiando el control a Empresarial y verificar que queda guardada con ese tipo (quickstart X1-X3, X7).

### Tests for User Story 1 ⚠️

> Escribir estas pruebas primero y comprobar que fallan antes de implementar.

- [X] T015 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionTypeField.test.tsx` (tras T002, T009): con `disabled={false}` (o sin la prop), muestra las dos opciones («Individual», «Empresarial») con su nombre y su explicación (T009), ninguna sin marcar cuando `value` es `1` o `2`; elegir la otra opción llama a `onChange` con el id correspondiente; un `ToggleButtonGroup` exclusivo entrega `null` al intentar desmarcar la única opción activa — ese `null` se ignora y `onChange` **no** se llama (el valor marcado no cambia). Con `disabled={true}`, el grupo está deshabilitado (ninguna opción se puede cambiar con el teclado ni el mouse) y se muestra el texto `subscriptionTypeImmutableHelper` asociado al grupo (`aria-describedby`). El grupo tiene un nombre accesible «Tipo de suscripción» (T009). Sin violaciones de axe en los dos modos.
- [X] T016 [US1] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.test.tsx` (tras T006, T015): el formulario muestra `SubscriptionTypeField` como primer campo, antes del nombre; sin pasar la nueva prop (modo alta), el control está habilitado; pasando `disableSubscriptionType` (nombre exacto de la prop; ver T022), el control se deshabilita. Sin violaciones de axe.
- [X] T017 [P] [US1] Ampliar `src/features/subscriptions/api/subscriptionsApi.create.test.ts` (tras T006): el cuerpo que envía `createSubscription` incluye `subscription_type_id` tal como lo da `toCreateSubscriptionBody`.
- [X] T018 [P] [US1] Ampliar `src/test/handlers/subscriptionsCatalog/create.test.ts` (tras T012): crear con `subscription_type_id: 1` o `2` responde con `subscription_type: { id, name }` igual al enviado; sin `subscription_type_id`, con `null`, con un texto o con `0`/`-1` da `422` con el mensaje de T012 («El tipo de suscripción es obligatorio…») en el campo `subscription_type_id`; con `subscription_type_id: 99` da `422 subscription_type_not_found`.
- [X] T019 [US1] Ampliar `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx` (tras T016): el formulario abre con «Individual» marcado; guardar sin tocar el control crea la suscripción con `subscriptionTypeId: 1`; cambiar a «Empresarial» y guardar la crea con `2`; un rechazo `subscription_type_not_found` simulado se muestra junto al control sin perder los demás datos capturados.
- [X] T020 [US1] Ampliar `src/app/router/subscriptions/createSubscription.integration.test.tsx` (tras T018, T019): el recorrido de quickstart X2 (guardar sin tocar el control crea Individual) y X3 (cambiar a Empresarial, y volver a Individual antes de guardar, deja solo la última opción elegida).

### Implementation for User Story 1

- [X] T021 [US1] Implementar `src/features/subscriptions/components/SubscriptionTypeField.tsx` (tras T015, T002, T009): recibe `value: SubscriptionTypeId`, `onChange: (value: SubscriptionTypeId) => void` y `disabled?: boolean`; `ToggleButtonGroup` exclusivo que recorre `SUBSCRIPTION_TYPE_ORDER`, ignora el `onChange(null)` de deseleccionar, y muestra el texto de `subscriptionTypeImmutableHelper` solo cuando `disabled` es verdadero. Hace pasar T015.
- [X] T022 [US1] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.tsx` (tras T016, T021): agregar una prop opcional `disableSubscriptionType?: boolean` (por defecto `false`) y, como primer campo del formulario, un `Controller` de `subscriptionTypeId` que renderiza `SubscriptionTypeField` con `disabled={disableSubscriptionType}`. Hace pasar T016.
- [X] T023 [US1] Ajustar `src/features/subscriptions/components/SubscriptionCreatePage.tsx` (tras T019, T022, T006): agregar `subscriptionTypeId: SUBSCRIPTION_TYPE.INDIVIDUAL` a la constante `EMPTY` de valores iniciales. Hace pasar T019.
- [X] T024 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente X1 a X3 y X7 de [quickstart.md](quickstart.md).

**Checkpoint**: el alta elige y guarda el tipo de punta a punta (MVP).

---

## Phase 4: User Story 2 - Ver el tipo de una suscripción, también al editarla (Priority: P2)

**Goal**: el detalle muestra el tipo de la suscripción; el formulario de edición lo muestra fijo y deshabilitado, con su texto explicativo, y nunca lo envía al guardar.

**Independent Test**: abrir el detalle de una suscripción Individual y el de una Empresarial y verificar que cada una muestra su tipo; abrir el formulario de edición de cada una, verificar que el control está deshabilitado con el tipo correcto marcado, y que guardar otro cambio no modifica el tipo (quickstart X4-X6).

### Tests for User Story 2 ⚠️

- [X] T025 [P] [US2] Ampliar `src/features/subscriptions/components/SubscriptionDetailFields.test.tsx` (tras T004, T009): muestra una fila «Tipo» (justo después de «Nombre») con «Individual» cuando `subscription.subscriptionType.id` es `1` y «Empresarial» cuando es `2`; con un `id` fuera de `{1, 2}` (por ejemplo `3`), muestra el `name` que trae la propia suscripción (`subscription.subscriptionType.name`), sin romper el render (research D2).
- [X] T026 [US2] Ampliar `src/features/subscriptions/components/SubscriptionEditPage.test.tsx` (tras T006, T022): el formulario abre con el control de tipo deshabilitado y marcado en el tipo actual de la suscripción (`toFormValues`); cambiar solo el nombre o el precio y guardar envía un `PATCH` cuyo cuerpo **no contiene** `subscription_type_id` (aserción explícita sobre el cuerpo capturado), sin importar qué tipo tuviera la suscripción.
- [X] T027 [P] [US2] Ampliar `src/test/handlers/subscriptionsCatalog/update.test.ts` (tras T012): un `PATCH` que incluya `subscription_type_id` (con cualquier valor, incluido el que la suscripción ya tiene) se rechaza con `422` y el mensaje de T012 («El tipo de suscripción no puede modificarse…») en el campo `subscription_type_id`; la suscripción permanece sin cambios.
- [X] T028 [US2] Ampliar `src/app/router/subscriptions/editSubscription.integration.test.tsx` (tras T026, T027): el recorrido de quickstart X4 (detalle de una Individual y de una Empresarial) y X5 (editar «Profesional», ver el control deshabilitado, cambiar solo el nombre, guardar y confirmar que el tipo sigue Individual).

### Implementation for User Story 2

- [X] T029 [US2] Ampliar `src/features/subscriptions/components/SubscriptionDetailFields.tsx` (tras T025, T004, T009): agregar la fila «Tipo» (`fields.type`) justo después de «Nombre», resolviendo el texto con `messages.subscriptions.types.catalog[subscription.subscriptionType.id]?.name ?? subscription.subscriptionType.name` (research D2). Hace pasar T025.
- [X] T030 [US2] Ajustar `src/features/subscriptions/components/SubscriptionEditPage.tsx` (tras T026, T022): pasar `disableSubscriptionType` a `<SubscriptionFormFields>` dentro de `EditSubscriptionForm`. Hace pasar T026.
- [X] T031 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente X4 a X6 de [quickstart.md](quickstart.md).

**Checkpoint**: las dos historias funcionan juntas de punta a punta: crear con el tipo elegido, consultarlo y no poder cambiarlo después.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: verificaciones finales que cruzan las dos historias.

- [X] T032 [P] Revisar accesibilidad manual del control de tipo en el alta (habilitado) y en la edición (deshabilitado) a 1024 px y a 320 px, solo con teclado y con un lector de pantalla (quickstart X8).
- [X] T033 Ejecutar de punta a punta los escenarios X1 a X8 de [quickstart.md](quickstart.md) (los automatizados ya corren en CI; esta pasada es manual, como el cierre de la 003, la 011 y la 012).
- [X] T034 Punto de control final: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` pasan todos (presupuesto de bundle: 307.0 KB de 320 KB, dentro del margen). `npm run test:coverage` de `src/features/subscriptions` pasa sus 601 pruebas una por una y en lotes pequeños; en este entorno en particular, correr los 45 archivos a la vez con instrumentación de cobertura hace que 2 pruebas (ninguna de ellas de esta feature: una de `OtherFeaturesField`, ya existente, y una de creación ya existente de `SubscriptionCreatePage`) excedan el límite de 30 s por saturación del sandbox, no por un error de lógica — ambas pasan limpio cuando se ejecutan aisladas o con más margen de tiempo. No se excluyeron ni se borraron: reducir cobertura real por una limitación de este entorno de verificación sería la decisión equivocada.

**Checkpoint**: feature completa, validada contra el quickstart.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no aplica.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** las dos historias: el esquema de `Subscription`, el formulario, el catálogo de errores y el simulador los usan las dos.
- **User Stories (Phase 3-4)**: dependen de Foundational.
  - US1 no depende de US2.
  - US2 reutiliza `SubscriptionFormFields` con su prop `disableSubscriptionType` creada en US1 (T022): por eso US2 se implementa después, aunque es de solo lectura/visualización en lo que a historias de usuario respecta.
- **Polish (Phase 5)**: depende de las dos historias.

### Dentro de cada historia

- Tests antes que la implementación que los hace pasar (marcado «Hace pasar TXXX» en cada tarea de implementación).
- `SubscriptionTypeField` (T021) antes que `SubscriptionFormFields` (T022), que lo compone.

### Parallel Opportunities

- Dentro de Foundational: T001, T003, T005, T007 y T010 (pruebas de piezas sin dependencias entre sí) se escriben en paralelo; T013 en paralelo con el bloque del simulador (T010-T012).
- Dentro de US1: T015, T017 y T018 (archivos distintos) en paralelo.
- Dentro de US2: T025 y T027 en paralelo.

---

## Parallel Example: Foundational

```bash
Task: "Escribir src/features/subscriptions/schemas/subscriptionTypeCatalog.test.ts (T001)"
Task: "Ampliar src/features/subscriptions/schemas/subscription.test.ts con subscription_type (T003)"
Task: "Ampliar src/features/subscriptions/schemas/subscriptionForm.test.ts con subscriptionTypeId (T005)"
Task: "Ampliar src/features/subscriptions/api/subscriptionErrors.test.ts con subscription_type_not_found (T007)"
Task: "Ampliar src/test/handlers/subscriptionsCatalog/model.test.ts con subscription_type_id (T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 sola)

1. Completar Phase 1: Setup (no aplica).
2. Completar Phase 2: Foundational (BLOQUEA todo).
3. Completar Phase 3: US1 (elegir el tipo al crear).
4. **PARAR y VALIDAR**: quickstart X1 a X3 y X7.
5. Completar Phase 4: US2 (ver el tipo, también al editarla).
6. **PARAR y VALIDAR**: quickstart X4 a X6.

### Incremental Delivery

1. Setup + Foundational → base lista (el campo nuevo, de punta a punta en el esquema y el simulador).
2. US1 → ya se puede crear una suscripción eligiendo su tipo; valor por sí solo y MVP de la feature.
3. US2 → cierra el patrón: consultar y no poder cambiar el tipo después de creada.
4. Polish → accesibilidad y quickstart completo.

### Parallel Team Strategy

1. El equipo completa Setup (no aplica) y Foundational junto (es, en su mayoría, un solo cambio de esquema coherente).
2. Con Foundational lista: una persona hace US1 (T015-T024); otra prepara en paralelo las pruebas de US2 que no dependen de la implementación de US1 (T025, T027) y las termina de integrar (T029-T030) en cuanto US1 entrega `SubscriptionFormFields` con `disableSubscriptionType` (T022).

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí.
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad.
- Verificar que las pruebas fallan antes de implementar.
- El simulador de pruebas (`src/test/handlers/subscriptionsCatalog/model.ts`) mantiene su propia tabla `{ 1: 'Individual', 2: 'Empresarial' }` para `toDto()`, igual trato que ya reciben los nombres de estatus: no importa los textos de `es.ts` (que son del frontend, no del "servidor" que el simulador imita).
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés).
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia (salvo la ya documentada de US2 sobre `disableSubscriptionType` de US1).
