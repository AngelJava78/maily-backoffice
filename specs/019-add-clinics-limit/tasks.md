---

description: "Task list template for feature implementation"
---

# Tasks: Límite de clínicas por tipo y ajustes visuales del formulario de suscripción

**Input**: Design documents from `/specs/019-add-clinics-limit/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/subscriptions-service.md](./contracts/subscriptions-service.md), [quickstart.md](./quickstart.md), y lo que sigue vigente de [../018-add-subscription-type/tasks.md](../018-add-subscription-type/tasks.md) (no se repite aquí).

**Tests**: incluidas. La constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first para lógica pura; la spec deja las pruebas para `/speckit-implement` (Assumptions). Dentro de cada fase, la prueba de cada pieza nueva de `schemas/` y `api/` se escribe ANTES que su implementación y DEBE fallar al principio (mismo criterio que 018). El contrato de `clinics_limit` en la API real está **predicho, no confirmado** (contracts/subscriptions-service.md): el simulador de pruebas (`src/test/handlers/subscriptionsCatalog/`) reproduce esa predicción, así que sus pruebas documentan el comportamiento esperado de hoy, no una garantía de la API real todavía.

**Organization**: tareas agrupadas por historia de usuario de `spec.md` (US1=P1 "límite de clínicas según el tipo", US2=P2 "tipo como interruptor", US3=P3 "autoconsumo activado por defecto"), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1, US2, US3); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único existente en la raíz del repositorio (`C:\Maily\code\maily-backoffice`): `src/`. Solo se toca la feature `src/features/subscriptions` (que sigue sin importar `@/features/auth`), su simulador de pruebas (`src/test/handlers/subscriptionsCatalog/`, `src/test/factories.ts`) y los textos compartidos de `src/shared/messages/es.ts`. Ninguna ruta, navegación, capacidad, columna de listado ni fila del Comparativo cambia (plan.md, Project Structure; spec.md, Fuera de alcance). Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en `es.ts`. Sin aserciones `as`, sin `any`, sin `console.*`.

---

## Phase 1: Setup

No aplica: sin dependencias nuevas (`Switch`, `FormControlLabel` y `TextField` ya están en `@mui/material`, research D1), sin variables de entorno, rutas ni carpetas nuevas (plan.md, Project Structure).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el campo `clinicsLimit` en el esquema de lectura, en el formulario (con su regla cruzada con el tipo) y en el simulador — todo lo que las tres historias necesitan (US1 lo muestra y lo valida; US2 lo reinicia a 1 desde el interruptor de tipo; US3 no lo toca pero comparte el mismo formulario y el mismo simulador).

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

### Esquema de la suscripción

- [X] T001 [P] Ampliar `src/features/subscriptions/schemas/subscription.test.ts` (debe fallar primero; data-model.md, `Subscription`). `subscriptionSchema` convierte además: `clinics_limit` → `clinicsLimit`, un entero plano (no anidado, a diferencia de `subscriptionType`); falta o `null` se convierte en `null` (nunca en `0`), mismo trato que ya recibe `clinics_count` → `clinicsCount`.
- [X] T002 Implementar (tras T001) `src/features/subscriptions/schemas/subscription.ts`: agregar `clinics_limit: z.number().int().nullable().optional()` al esquema y `clinicsLimit: dto.clinics_limit ?? null` al `.transform()`. Hace pasar T001.

### Formulario

- [X] T003 [P] Ampliar `src/features/subscriptions/schemas/subscriptionForm.test.ts` (debe fallar primero; data-model.md, «Formulario»). `SubscriptionFormValues` gana `clinicsLimit: string`:
  - A nivel de campo: solo dígitos, de 1 a 7 caracteres (mismo patrón que los otros cuatro límites).
  - A nivel del formulario completo (`.superRefine()`, research D5): si `subscriptionTypeId === SUBSCRIPTION_TYPE.INDIVIDUAL`, el valor numérico DEBE ser exactamente `1` (si no, error en `clinicsLimit` con `text.clinicsLimitMustBeOneForIndividual`); si no, DEBE ser un entero de `1` a `100` (si no, error con `text.clinicsLimitInvalid`).
  - `toFormValues(subscription)` da `clinicsLimit: String(subscription.clinicsLimit ?? 1)` (un valor `null` abre en `'1'`, nunca vacío — Clarifications).
  - `toCreateSubscriptionBody(values)` agrega `clinics_limit: Number(values.clinicsLimit)` (siempre, obligatorio).
  - `toUpdateSubscriptionBody(initial, values)` **no agrega `clinics_limit` en absoluto** si `initial.subscriptionType.id === SUBSCRIPTION_TYPE.INDIVIDUAL` (inmutable en ese caso, igual trato que el tipo, research D4); si no, lo agrega solo si `Number(values.clinicsLimit) !== initial.clinicsLimit`.
- [X] T004 Implementar (tras T002, T003) `src/features/subscriptions/schemas/subscriptionForm.ts` con las reglas de T003. `EditableData` gana `'clinicsLimit'`. Hace pasar T003.

### Catálogo de errores

- [X] T005 [P] Ampliar `src/features/subscriptions/api/subscriptionErrors.test.ts` (debe fallar primero; contracts/subscriptions-service.md, «Predicción de mensajes»). `SubscriptionFormField` gana `'clinicsLimit'`. Un `validation_error` genérico con `errors: [{ field: 'clinics_limit', message: '…' }]` se mapea al campo `clinicsLimit` con el texto propio (`text.fields.clinicsLimit`), igual que los demás campos — **sin un `case` nuevo en `describeSubscriptionError`**: a diferencia de `subscription_type_not_found` (018), la predicción de `clinics_limit` no usa un código de nivel superior propio (contracts/subscriptions-service.md): las tres situaciones (falta o fuera de rango, no es 1 en una Individual, se intenta modificar en una Individual) viajan como `validation_error` con el campo `clinics_limit`, así que basta con agregar la entrada al `Map` `FORM_FIELDS`.
- [X] T006 Implementar (tras T005) en `src/features/subscriptions/api/subscriptionErrors.ts`: agregar `['clinics_limit', 'clinicsLimit']` al `Map` `FORM_FIELDS`. Ampliar también `src/features/subscriptions/components/applyRefusal.ts`: su lista `FORM_FIELDS` (orden de foco) gana `'clinicsLimit'`, junto a `'subscriptionTypeId'` (es el segundo control del formulario, justo después del tipo). Hace pasar T005.

### Mensajes

- [X] T007 Agregar a `src/shared/messages/es.ts`, en el bloque `subscriptions` (sin prueba propia; lo consumen las pruebas de componentes de las historias):
  - `form.fields.clinicsLimit: 'Límite de clínicas'`.
  - `form.clinicsLimitHelper: 'De 1 a 100 clínicas.'` (cuando está habilitado, tipo distinto de Individual).
  - `form.clinicsLimitFixedHelper: 'Siempre 1 para las suscripciones Individual.'` (cuando está deshabilitado).
  - `validation.clinicsLimitInvalid: 'Escribe un número entero de 1 a 100.'`.
  - `validation.clinicsLimitMustBeOneForIndividual: 'Para una suscripción Individual, el límite de clínicas debe ser 1.'`.
  - `detail.fields.clinicsLimit: 'Límite de clínicas'`.
  - `errors.fields.clinicsLimit: 'Revisa el límite de clínicas: 1 para una suscripción Individual (fijo), de 1 a 100 para las demás.'`.

### Simulador de pruebas

- [X] T008 [P] Ampliar `src/test/handlers/subscriptionsCatalog/model.test.ts` (debe fallar primero; contracts/subscriptions-service.md, predicción). `create(input)`:
  - Con `subscription_type_id` Individual (`1`) y `clinics_limit` distinto de `1` (por ejemplo `2`), lanza `CatalogError(422, 'validation_error', …, [{ field: 'clinics_limit', message: 'El límite de clínicas de una suscripción Individual debe ser exactamente 1.' }])` (predicción D4).
  - Con `subscription_type_id` Empresarial (`2`) y `clinics_limit` fuera de 1 a 100 (por ejemplo `0` o `101`), lanza el mismo tipo de error con el mensaje `'El límite de clínicas debe ser un número entero de 1 a 100.'`.
  - Con valores válidos para cada tipo (Individual con `1`; Empresarial con un valor de 1 a 100), la suscripción se crea con ese `clinicsLimit`, reflejado en `toDto().clinics_limit`.

  `update(id, changes)`:
  - Sobre una suscripción vigente Individual, si `changes.clinics_limit !== undefined` (con cualquier valor, incluido `1`), lanza el mismo tipo de error con el mensaje `'El límite de clínicas no se puede modificar en una suscripción Individual.'`, sin cambiar ningún dato.
  - Sobre una suscripción vigente que no sea Individual, un `clinics_limit` de 1 a 100 se aplica con normalidad; fuera de ese rango, se rechaza con el mensaje de rango de arriba.

  `catalogSubscription()` (la factoría) da `clinicsLimit: 1` por defecto.
- [X] T009 Implementar (tras T008) `src/test/handlers/subscriptionsCatalog/model.ts`: agregar `clinicsLimit: number` a `CatalogSubscription` (por defecto `1`) y a `toDto()` (`clinics_limit`); `SubscriptionInput` gana `clinics_limit: number` (obligatorio); `SubscriptionChanges` gana `clinics_limit?: number` (a diferencia de `subscription_type_id`, si forma parte de este tipo). `create()` valida, tras las comprobaciones ya existentes, la regla cruzada de T008. `update()` valida, antes de aplicar cambios, la inmutabilidad y el rango de T008. Hace pasar T008.
- [X] T010 Implementar (tras T009) `src/test/handlers/subscriptionsCatalog/validation.ts`: agregar `clinics_limit` a los campos de forma permitidos tanto en `validateCreate` como en `validateUpdate` (a diferencia de `subscription_type_id`, que solo se permite al crear); su comprobación de forma (obligatorio al crear, entero de 1 a 100) sigue el mismo patrón que `limitError`, con sus propios límites (no los de 0 a 1 000 000 de los otros cuatro).
- [X] T011 [P] Ampliar `src/test/factories.ts` (tras T002): `subscriptionDto(overrides)` agrega por defecto `clinics_limit: 1`.
- [ ] T012 Punto de control de la fase: `npm run typecheck`, `npm run lint` y `npm run test` pasan con todo lo anterior, en particular `src/features/subscriptions/{schemas,api}/` y `src/test/{factories.ts,handlers/subscriptionsCatalog/}`.

**Checkpoint**: esquema, formulario, errores, textos y simulador listos — las historias pueden empezar.

---

## Phase 3: User Story 1 - Limitar el número de clínicas según el tipo de suscripción (Priority: P1) 🎯 MVP

**Goal**: el límite de clínicas se muestra y se valida según el tipo vigente: fijo en 1 y deshabilitado para Individual; editable de 1 a 100, con 1 como valor inicial, para Empresarial. Se ve en el detalle de cualquier suscripción.

**Independent Test**: crear una Individual y verificar que su límite muestra 1 y no se puede tocar; crear una Empresarial con 25 y verificar que se guarda; intentar 0, 101 o vacío para una Empresarial y verificar que se rechaza en los tres casos (quickstart Y2, Y4, Y5, Y7-Y9).

### Tests for User Story 1 ⚠️

> Escribir estas pruebas primero y comprobar que fallan antes de implementar.

- [X] T013 [P] [US1] Escribir `src/features/subscriptions/components/ClinicsLimitField.test.tsx` (tras T004, T007): con `subscriptionTypeId` en Individual (vía un `Harness` con `useForm` y `useWatch`), el campo muestra `'1'`, está deshabilitado y su texto de ayuda es `clinicsLimitFixedHelper`; con `subscriptionTypeId` en Empresarial, el campo está habilitado, con `clinicsLimitHelper`, acepta cambiar su valor y muestra el error de `errors.clinicsLimit` cuando corresponde. Sin violaciones de axe en los dos modos.
- [X] T014 [US1] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.test.tsx` (tras T004, T013): el formulario muestra `ClinicsLimitField` junto a `SubscriptionTypeField` (antes de nombre/descripción); con el tipo en Individual (el valor con el que abre el alta), el límite de clínicas se ve deshabilitado y en `'1'`.
- [X] T015 [P] [US1] Ampliar `src/features/subscriptions/components/SubscriptionDetailFields.test.tsx` (tras T002, T007): muestra una fila «Límite de clínicas» (junto a «Tipo») con el número cuando `subscription.clinicsLimit` no es `null`, y con `messages.subscriptions.clinics.notAvailable` («No disponible») cuando es `null`.
- [X] T016 [P] [US1] Ampliar `src/test/handlers/subscriptionsCatalog/create.test.ts` (tras T010): crear con tipo Individual y `clinics_limit: 1` responde `201` con `clinics_limit: 1`; con tipo Individual y `clinics_limit` distinto de 1, da `422` con el mensaje de T008 en el campo `clinics_limit`; con tipo Empresarial y un valor de 1 a 100, responde `201` con ese valor; con tipo Empresarial y 0, 101 o sin enviar el campo, da `422` en `clinics_limit`.
- [X] T017 [P] [US1] Ampliar `src/test/handlers/subscriptionsCatalog/update.test.ts` (tras T010): sobre una suscripción Individual, un `PATCH` que incluya `clinics_limit` (con cualquier valor, incluido 1) se rechaza con el mensaje de inmutabilidad de T008 en ese campo, sin cambiar nada; sobre una suscripción Empresarial, un `PATCH` con `clinics_limit` de 1 a 100 se aplica; fuera de ese rango, se rechaza.
- [X] T018 [US1] Ampliar `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx` (tras T014): el límite de clínicas abre en 1, deshabilitado (tipo Individual por defecto); con un tipo Empresarial ya elegido (ver US2 para cómo se elige), escribir 25 y guardar crea la suscripción con `clinics_limit: 25`; con 0, 101 o vacío para Empresarial, ver el error junto al campo y que no se crea nada.
- [X] T019 [US1] Ampliar `src/features/subscriptions/components/SubscriptionEditPage.test.tsx` (tras T014): editar una suscripción Individual muestra el límite de clínicas deshabilitado en 1; guardar otro cambio nunca incluye `clinics_limit` en el `PATCH`. Editar una suscripción Empresarial muestra el límite habilitado con su valor actual; cambiarlo a un valor de 1 a 100 y guardar lo incluye en el `PATCH`.
- [X] T020 [US1] Ampliar `src/app/router/subscriptions/createSubscription.integration.test.tsx` (tras T016, T018): el recorrido de quickstart Y4 (Empresarial con límite 25, se crea) y Y5 (0, 101 y vacío para Empresarial, se rechaza en los tres casos).
- [X] T021 [US1] Ampliar `src/app/router/subscriptions/editSubscription.integration.test.tsx` (tras T017, T019): el recorrido de quickstart Y7 (detalle de una Individual y de una Empresarial con límite distinto), Y8 (editar la Empresarial, cambiar su límite, guardar) y Y9 (editar la Individual, cambiar solo el nombre, confirmar que `clinics_limit` nunca se envía).

### Implementation for User Story 1

- [X] T022 [US1] Implementar `src/features/subscriptions/components/ClinicsLimitField.tsx` (tras T013, T004, T007): `TextField` registrado como los otros cuatro límites (`register('clinicsLimit')`), que lee `subscriptionTypeId` con `useWatch({ control, name: 'subscriptionTypeId' })` (research D3) para decidir `disabled` y el texto de ayuda (`clinicsLimitHelper`/`clinicsLimitFixedHelper`). Hace pasar T013.
- [X] T023 [US1] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.tsx` (tras T014, T022): agregar `ClinicsLimitField` justo después de `SubscriptionTypeField`. Hace pasar T014.
- [X] T024 [US1] Ampliar `src/features/subscriptions/components/SubscriptionDetailFields.tsx` (tras T015, T002, T007): agregar la fila «Límite de clínicas» (`fields.clinicsLimit`) justo después de «Tipo», mostrando `subscription.clinicsLimit ?? messages.subscriptions.clinics.notAvailable`. Hace pasar T015.
- [X] T025 [US1] Ajustar `src/features/subscriptions/components/SubscriptionCreatePage.tsx` (tras T018, T023, T004): agregar `clinicsLimit: '1'` a la constante `EMPTY`. Hace pasar T018 (en combinación con US2 para poder elegir Empresarial; ver nota de dependencia más abajo).
- [ ] T026 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente Y2, Y7, Y8 y Y9 de [quickstart.md](quickstart.md) (Y4 y Y5 requieren poder elegir Empresarial; se validan junto con US2, T031).

**Checkpoint**: el límite de clínicas se muestra, se valida y se guarda según el tipo, de punta a punta.

---

## Phase 4: User Story 2 - El tipo de suscripción se elige con un interruptor, como Autoconsumo (Priority: P2)

**Goal**: el control de tipo pasa de dos tarjetas a un interruptor de una sola línea, igual en apariencia a Autoconsumo; al cambiarlo en el alta, el límite de clínicas (US1) se reinicia a 1 en el mismo evento.

**Independent Test**: abrir el alta y comprobar que el tipo se ve y se opera como un interruptor, con Individual por defecto; activarlo y comprobar que pasa a Empresarial y que el límite de clínicas queda en 1, editable; abrir una edición y comprobar que se ve igual pero deshabilitado (quickstart Y1, Y3, Y6).

**Nota de dependencia**: esta historia depende de que `clinicsLimit` ya exista en el formulario (Foundational, T004), pero no de que `ClinicsLimitField` (US1) esté implementado: el `onChange` del interruptor escribe directamente en el campo del formulario (`setValue`), verificable con `getValues`/`watch` aunque el campo todavía no se viera en pantalla. Como el orden de las fases ya pone a US1 antes, para cuando esta historia se prueba de punta a punta (T029) el campo ya es visible.

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Ampliar `src/features/subscriptions/components/SubscriptionTypeField.test.tsx` (tras T004; debe fallar primero): el control se muestra como un `Switch` (no dos `ToggleButton`), apagado por defecto (Individual), con el nombre y la explicación de Individual junto a él; al activarlo, pasa a Empresarial (el nombre y la explicación cambian); al desactivarlo, vuelve a Individual. Además, al activarlo o desactivarlo, el formulario que lo envuelve queda con `clinicsLimit` en `'1'` (comprobado leyendo el valor del formulario del `Harness`, research D6). Sin violaciones de axe, habilitado y deshabilitado; operable con teclado (Tab + Espacio).
- [X] T028 [US2] Ampliar `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx` (tras T025, T027): el tipo se ve como un interruptor (no dos tarjetas); activarlo muestra Empresarial con el límite de clínicas en 1, editable; escribir 30 y volver a desactivar el interruptor deja el límite en 1, deshabilitado; volver a activarlo lo deja en 1 otra vez (no 30).
- [X] T029 [US2] Ampliar `src/app/router/subscriptions/createSubscription.integration.test.tsx` (tras T020, T027, T028): el recorrido de quickstart Y1 (interruptor apagado, Autoconsumo activado — ver US3 para esto último), Y3 (activarlo muestra Empresarial con el límite en 1, editable) y Y6 (ir y volver entre tipos deja siempre 1 en el límite, nunca el valor escrito antes).

### Implementation for User Story 2

- [X] T030 [US2] Reescribir el interior de `src/features/subscriptions/components/SubscriptionTypeField.tsx` (tras T027): sustituir `ToggleButtonGroup`/`ToggleButton` por `FormControlLabel`/`Switch` (research D1), mismo patrón que `SelfServiceAndTrialFields.tsx`; `checked = value === SUBSCRIPTION_TYPE.ENTERPRISE`; su `onChange` llama `setValue('subscriptionTypeId', next)` y `setValue('clinicsLimit', '1', { shouldValidate: true })` en el mismo evento (research D6). El `fieldset`/`legend`/`aria-describedby` de la inmutabilidad en edición (018) no cambian. Hace pasar T027.
- [ ] T031 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente Y1, Y3, Y4, Y5 y Y6 de [quickstart.md](quickstart.md) (cierra también lo pendiente de US1, T026).

**Checkpoint**: elegir el tipo con el interruptor deja el límite de clínicas siempre en un valor válido, de punta a punta.

---

## Phase 5: User Story 3 - Autoconsumo activado por defecto en el alta (Priority: P3)

**Goal**: el formulario de alta abre con «Autoconsumo» activado, en vez de desactivado.

**Independent Test**: abrir el alta y comprobar que Autoconsumo aparece activado; guardar sin tocarlo y comprobar que se crea activado; desactivarlo y comprobar que se crea desactivado; comprobar que la edición de una suscripción existente sigue mostrando su valor real (quickstart Y10).

### Tests for User Story 3 ⚠️

- [X] T032 [US3] Ampliar `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx` (tras T028; debe fallar primero): el interruptor de Autoconsumo aparece activado al abrir el alta; guardar sin tocarlo crea la suscripción con `self_service: true`; desactivarlo antes de guardar la crea con `self_service: false`.

### Implementation for User Story 3

- [X] T033 [US3] Ajustar `src/features/subscriptions/components/SubscriptionCreatePage.tsx` (tras T032): cambiar `EMPTY.selfService` de `false` a `true` (research D2). Hace pasar T032. (La edición ya muestra el valor real de la suscripción vía `toFormValues`, sin cambios.)
- [ ] T034 [US3] Punto de control de la historia: ejecutar las pruebas y validar manualmente Y10 de [quickstart.md](quickstart.md).

**Checkpoint**: las tres historias funcionan juntas de punta a punta.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: verificaciones finales que cruzan las tres historias.

- [ ] T035 [P] Revisar accesibilidad manual del interruptor de tipo y del límite de clínicas (habilitado y deshabilitado) a 1024 px y a 320 px, solo con teclado y con un lector de pantalla (quickstart Y11).
- [ ] T036 Ejecutar de punta a punta los escenarios Y1 a Y11 de [quickstart.md](quickstart.md) (los automatizados ya corren en CI; esta pasada es manual, como el cierre de la 018).
- [ ] T037 Punto de control final: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:coverage` (umbral de 80 % en `api`, `schemas` y `shared/api|lib`) y `npm run build` pasan todos; si el build muestra el presupuesto de bundle por encima del margen vigente, revisarlo antes de cerrar (Setup).

**Checkpoint**: feature completa, validada contra el quickstart. Antes de cerrar, recordar que el contrato de `clinics_limit` sigue siendo una predicción (research D4): si `maily-system-api` fusiona `007-add-clinics-limit` con un contrato distinto antes de desplegar esta feature, revisar `contracts/subscriptions-service.md` y ajustar el simulador y los mensajes antes de dar por cerrada la implementación.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no aplica.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** las tres historias: el esquema de `Subscription`, el formulario (con `clinicsLimit` y su regla cruzada), el catálogo de errores y el simulador los usan las tres.
- **User Stories (Phase 3-5)**: dependen de Foundational.
  - US1 no depende de US2 ni de US3 para su propia lógica (el campo y su regla existen desde Foundational), pero su validación manual completa de Y4/Y5 (Empresarial) espera a que US2 permita elegir el tipo (T026/T031).
  - US2 depende de Foundational (`clinicsLimit` ya en el formulario) pero no de la implementación visual de US1 (T027 verifica el reinicio a 1 por el valor del formulario, no por el campo en pantalla); su prueba de página (T028) sí se apoya en que `ClinicsLimitField` ya esté wireado (T023 de US1).
  - US3 no depende de US1 ni de US2 para su propia lógica (un solo valor por defecto, campo distinto), pero comparte el mismo archivo de prueba (`SubscriptionCreatePage.test.tsx`) que ambas ya ampliaron, por eso se secuencia después.
- **Polish (Phase 6)**: depende de las tres historias.

### Dentro de cada historia

- Tests antes que la implementación que los hace pasar (marcado «Hace pasar TXXX» en cada tarea de implementación).
- `ClinicsLimitField` (T022) antes que `SubscriptionFormFields` (T023), que lo compone.

### Parallel Opportunities

- Dentro de Foundational: T001, T003, T005 y T008 (pruebas de piezas sin dependencias entre sí) se escriben en paralelo; T011 en paralelo con el bloque del simulador (T008-T010).
- Dentro de US1: T013, T015, T016 y T017 (archivos distintos) en paralelo.
- Dentro de US2: T027 es independiente del resto de la fase.

---

## Parallel Example: Foundational

```bash
Task: "Ampliar src/features/subscriptions/schemas/subscription.test.ts con clinics_limit (T001)"
Task: "Ampliar src/features/subscriptions/schemas/subscriptionForm.test.ts con clinicsLimit y su regla cruzada (T003)"
Task: "Ampliar src/features/subscriptions/api/subscriptionErrors.test.ts con el mapeo de clinics_limit (T005)"
Task: "Ampliar src/test/handlers/subscriptionsCatalog/model.test.ts con la predicción del contrato (T008)"
```

---

## Implementation Strategy

### MVP First (User Story 1 sola, con US2 para poder probarla completa)

1. Completar Phase 1: Setup (no aplica).
2. Completar Phase 2: Foundational (BLOQUEA todo).
3. Completar Phase 3: US1 (el límite de clínicas existe, se valida y se guarda).
4. Completar Phase 4: US2 (ahora se puede elegir Empresarial desde la interfaz para probar US1 por completo).
5. **PARAR y VALIDAR**: quickstart Y1 a Y9.
6. Completar Phase 5: US3 (el cambio más pequeño, cierra la feature).

### Incremental Delivery

1. Setup + Foundational → base lista (el campo nuevo, de punta a punta en el esquema y el simulador).
2. US1 → la regla de negocio ya existe y se puede probar por completo con una suscripción Individual (el único tipo elegible hasta que llega US2).
3. US2 → desbloquea poder crear y ver Empresariales desde la interfaz, con lo que US1 queda demostrable de punta a punta; valor por sí solo como mejora visual.
4. US3 → ajuste final, sin dependencias de las otras dos.
5. Polish → accesibilidad y quickstart completo.

### Parallel Team Strategy

1. El equipo completa Setup y Foundational junto (es, en su mayoría, un solo cambio de esquema coherente).
2. Con Foundational lista: una persona hace US1 (T013-T026); otra hace US2 en paralelo (T027, T030), que no depende de la implementación visual de US1; se integran en T028-T029 (quien termine después ajusta `SubscriptionCreatePage.test.tsx`).
3. US3 espera a que `SubscriptionCreatePage.test.tsx` esté estable tras US1 y US2 (T028).

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí.
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad.
- Verificar que las pruebas fallan antes de implementar.
- El contrato de `clinics_limit` en la API real es una predicción (research D4, contracts/subscriptions-service.md): el simulador de pruebas la reproduce, pero no es una garantía. Si la API real difiere al implementar `007-add-clinics-limit` de `maily-system-api`, el ajuste queda aislado a `validation.ts`/`model.ts` del simulador y a los mensajes de `subscriptionErrors.ts`/`es.ts`.
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés).
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia (salvo las ya documentadas arriba).
