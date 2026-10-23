---

description: "Task list template for feature implementation"
---

# Tasks: Planes de suscripción: precio anual, módulos, límites y comparativo

**Input**: Design documents from `/specs/012-configure-subscription-plans/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/subscriptions-service.md](./contracts/subscriptions-service.md), [contracts/app-routes.md](./contracts/app-routes.md), [quickstart.md](./quickstart.md), y lo que sigue vigente de [../003-manage-subscription-types/tasks.md](../003-manage-subscription-types/tasks.md) (no se repite aquí).

**Tests**: incluidas. La constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first para lógica pura; la spec deja las pruebas para `/speckit-implement` (Assumptions). Dentro de cada fase, la prueba de cada pieza nueva de `schemas/` y `policy/` se escribe ANTES que su implementación y DEBE fallar al principio (mismo criterio que 003, 009, 010 y 011). La API de suscripciones se simula a nivel de red con el simulador con estado ya existente de `src/test/handlers/subscriptionsCatalog/`, ampliado en la fase Foundational; nunca se usa un mock de `fetch` ni del cliente HTTP.

**Organization**: tareas agrupadas por historia de usuario de `spec.md` (US1=P1 "consultar: listado, detalle y comparativo", US2=P1 "crear un plan completo", US3=P2 "modificar un plan existente"), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1, US2, US3); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único existente en la raíz del repositorio (`C:\Maily\code\maily-backoffice`): `src/`, `e2e/`. Solo se toca la feature `src/features/subscriptions` (que sigue sin importar `@/features/auth`, research D-003/2), su simulador de pruebas (`src/test/handlers/subscriptionsCatalog/`) y los textos compartidos de `src/shared/messages/es.ts`. Ninguna ruta, navegación, capacidad ni otra feature cambia (plan.md, Project Structure). Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en `es.ts`. Sin aserciones `as` (salvo `as const`), sin `any`, sin `console.*`; componentes `.tsx` de 250 líneas como máximo.

---

## Phase 1: Setup

**Purpose**: línea base antes de ampliar una feature ya en producción. Sin dependencias nuevas que instalar (research D1) y sin variables de entorno ni rutas nuevas (plan.md): no hace falta tocar `vite.config.ts`, `.env.example` ni `app/router`.

- [X] T001 Medir la línea base real del bundle: `npm run build && npm run size` en la raíz del repo; registrar el KB gzip obtenido, para compararlo en el Polish final (T065).

**Checkpoint**: línea base de bundle registrada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el modelo de datos, el catálogo fijo de módulos, el formulario y el simulador de pruebas que **todas** las historias necesitan. Es, en gran parte, el cambio incompatible research D2 (`features` → `other_features`) aplicado a la vez que se agregan los ocho campos nuevos: no hay un estado intermedio en el que el frontend hable con la API vigente usando el campo antiguo.

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

### Catálogo de módulos y reglas puras

- [X] T002 [P] Escribir `src/features/subscriptions/schemas/clinicModuleCatalog.test.ts` (debe fallar primero; data-model.md, `ClinicModuleCatalog`; FR-007). `CLINIC_MODULE_ORDER` es la tupla exacta, en este orden: `patients`, `scheduling`, `reminders`, `clinical_records`, `clinical_record_templates`, `prescriptions`, `finance`, `reports`, `billing` (9 elementos, sin duplicados). `REQUIRED_MODULE_KEY` es `'patients'`. `MODULE_PREREQUISITE` es exactamente `{ reminders: 'scheduling', clinical_record_templates: 'clinical_records', prescriptions: 'clinical_records', billing: 'finance' }`; cada clave y cada valor de ese mapa están en `CLINIC_MODULE_ORDER`, y `REQUIRED_MODULE_KEY` nunca aparece como clave del mapa (no tiene requisito).
- [X] T003 Implementar (tras T002) `src/features/subscriptions/schemas/clinicModuleCatalog.ts`: `CLINIC_MODULE_ORDER` (`as const`), el tipo `ClinicModuleKey = (typeof CLINIC_MODULE_ORDER)[number]`, `REQUIRED_MODULE_KEY` y `MODULE_PREREQUISITE: Partial<Record<ClinicModuleKey, ClinicModuleKey>>`. Hace pasar T002.
- [X] T004 [P] Escribir `src/features/subscriptions/policy/moduleSelection.test.ts` (debe fallar primero; research D4; data-model.md, `withModuleChecked`; FR-009).
  - Marcar `reminders` sin `scheduling` marcado da `{ patients, scheduling, reminders }` (agrega el requisito en cascada).
  - Marcar `clinical_record_templates` y después `prescriptions`, ambos sin `clinical_records`, deja `clinical_records` marcado una sola vez.
  - Desmarcar `scheduling` con `{ patients, scheduling, reminders }` marcado da `{ patients }` (quita el dependiente en cascada).
  - Desmarcar `clinical_records` con `{ patients, clinical_records, clinical_record_templates, prescriptions }` marcado quita los tres a la vez.
  - Marcar o desmarcar un módulo sin requisito ni dependientes (`finance`, `reports`) solo cambia ese módulo.
  - No muta el `ReadonlySet` recibido; el resultado es un `ReadonlySet` nuevo.
- [X] T005 Implementar (tras T003 y T004) `src/features/subscriptions/policy/moduleSelection.ts`: `withModuleChecked(selected, key, checked)`, con el mapa inverso de `MODULE_PREREQUISITE` calculado una vez en el módulo (`Object.entries`, sin `as`). Hace pasar T004.
- [X] T006 [P] Ampliar `src/features/subscriptions/schemas/price.test.ts` (debe fallar primero; research D5; data-model.md, `AnnualSavings`).
  - `computeAnnualSavings('1299.00', '12990.00')` da `{ amountCents: 259800, percent: 17, monthlyEquivalentCents: 108250 }` (el ejemplo de Profesional en los mockups).
  - `computeAnnualSavings('5999.00', '59990.00')` da `percent: 17` y `monthlyEquivalentCents: 499917` (Empresarial: `59990 ÷ 12 = 4999.1666…` redondeado a `4999.17`).
  - `computeAnnualSavings('499.00', '4990.00')` da `percent: 17` y `monthlyEquivalentCents: 41583` (Esencial: `4990 ÷ 12 = 415.8333…` redondeado a `415.83`).
  - `computeAnnualSavings('900.00', '10800.00')` (igual a 12 mensualidades) y `computeAnnualSavings('900.00', '12000.00')` (mayor) dan `null`.
  - Todo se calcula en centavos enteros, sin `parseFloat` ni coma flotante.
- [X] T007 Implementar (tras T006) en `src/features/subscriptions/schemas/price.ts`: el tipo `AnnualSavings` y `computeAnnualSavings(monthlyPrice, annualPrice)`, reutilizando `toCents`. Hace pasar T006.

### Esquema de la suscripción y de la URL

- [X] T008 [P] Ampliar `src/features/subscriptions/schemas/subscription.test.ts` (debe fallar primero; data-model.md, `Subscription`). `subscriptionSchema` convierte además estos campos del DTO:
  - `annual_price` → `annualPrice`: «texto decimal», mismo patrón que `monthlyPrice` (`^\d{1,8}\.\d{2}$`; `'12990'` sin los dos decimales es un error).
  - `trial_days` → `trialDays`: «entero de 0 a 3650» (`0`, `14` y `3650` válidos; `-1`, `3651` y `14.5` inválidos).
  - `self_service` → `selfService`: booleano.
  - `module_keys` → `moduleKeys`: «lista de texto»; conserva una clave fuera del catálogo fijo tal cual, sin rechazarla (research D3).
  - `other_features` → `otherFeatures`: mismas reglas que tenía `features` (lista de texto, puede estar vacía); el campo `features` **ya no existe** en el tipo de salida.
  - `consulting_rooms_limit`, `doctors_limit`, `assistants_limit`, `new_patients_per_year_limit` → `consultingRoomsLimit`, `doctorsLimit`, `assistantsLimit`, `newPatientsPerYearLimit`: «entero de 0 a 1 000 000» cada uno (`0` y `1000000` válidos; `-1` y `1000001` inválidos).

  Los campos que ya probaba T021 de la 003 (`id`, `name`, `description`, `monthlyPrice`, `status`, `clinicsCount`, `createdAt`, `updatedAt`) no cambian; `subscriptionCatalogSchema` sigue descartando el estatus 4.
- [X] T009 Implementar (tras T003 y T008) `src/features/subscriptions/schemas/subscription.ts`: agregar los ocho campos al `.transform` de `subscriptionSchema` con las reglas de T008; quitar `features` del esquema y de `Subscription`. Hace pasar T008. **Rompe en compilación** cualquier archivo que siga leyendo `subscription.features`: T017, T026, T035 y T046 lo corrigen.
- [X] T010 [P] Ampliar `src/features/subscriptions/schemas/subscriptionsLocation.test.ts` (debe fallar primero; research D8; data-model.md, `SubscriptionsLocation`). `SubscriptionsLocation` gana `tab`: `parseSubscriptionsSearchParams` lee `?tab=comparison` como `'comparison'`; cualquier otro valor (`'list'`, ausente, `'x'`) da `'list'`. `toSubscriptionsSearchParams({ ..., tab: 'list' })` omite el parámetro; con `'comparison'` lo escribe. `page` y `pageSize` no cambian de regla.
- [X] T011 Implementar (tras T010) `src/features/subscriptions/schemas/subscriptionsLocation.ts`: `SUBSCRIPTIONS_TABS = ['list', 'comparison'] as const`, el tipo `SubscriptionsTab`, y `tab` en `SubscriptionsLocation`, `parseSubscriptionsSearchParams` y `toSubscriptionsSearchParams`. Hace pasar T010.

### Formulario y catálogo de errores

- [X] T012 [P] Ampliar `src/features/subscriptions/schemas/subscriptionForm.test.ts` (debe fallar primero; data-model.md, «Formulario»). `SubscriptionFormValues` gana:
  - `annualPrice`: mismas reglas que `monthlyPrice` (recortado, obligatorio, `^\d{1,8}(\.\d{1,2})?$`); `'4,500'` y `'$4500'` dan `annualPriceInvalid`, vacío da `annualPriceRequired`.
  - `trialDays`: entero de 0 a 3650; fuera de rango o no entero es error.
  - `selfService`: booleano.
  - `moduleKeys`: `ReadonlySet<ClinicModuleKey>`; siempre contiene `REQUIRED_MODULE_KEY`.
  - `consultingRoomsLimit`, `doctorsLimit`, `assistantsLimit`, `newPatientsPerYearLimit`: enteros de 0 a 1 000 000, los cuatro obligatorios.
  - `otherFeatures` (antes `features`): mismas reglas que antes (0 a 20 elementos de 1 a 150 caracteres cada uno).

  `toFormValues(subscription)` incluye los campos nuevos (`moduleKeys: new Set(subscription.moduleKeys)` filtrado a las claves de `CLINIC_MODULE_ORDER`; `otherFeatures` en vez de `features`). `toCreateSubscriptionBody(values)` agrega `annual_price`, `trial_days`, `self_service`, `module_keys: [...moduleKeys]` y los cuatro límites; usa `other_features` en vez de `features`. `toUpdateSubscriptionBody(initial, values)` compara cada campo nuevo contra `initial` con la tabla de data-model.md (el conjunto de módulos se compara sin importar el orden; con todo igual da `null`, igual que antes).
- [X] T013 Implementar (tras T009, T007, T003 y T012) `src/features/subscriptions/schemas/subscriptionForm.ts` con las reglas de T012; valores iniciales del alta: `annualPrice: ''`, `trialDays: 0`, `selfService: false`, `moduleKeys: new Set([REQUIRED_MODULE_KEY])`, los cuatro límites `''`, `otherFeatures: []`. `MAX_OTHER_FEATURES = 20` (antes `MAX_FEATURES`). Hace pasar T012.
- [X] T014 [P] Ampliar `src/features/subscriptions/api/subscriptionErrors.test.ts` (debe fallar primero; research D10; data-model.md, `SubscriptionErrorOutcome`). `describeSubscriptionError` agrega: `subscription_module_prerequisite_missing` (409) → `kind: 'field'`, `fields.moduleKeys`; `subscription_module_not_found` (422, dentro de `validation_error` con `errors[].field === 'module_keys'`) → igual; `module_check_unavailable` (503) → `kind: 'retryable'`, igual que `authorization_unavailable`. El resto del mapa no cambia.
- [X] T015 Implementar (tras T014) `src/features/subscriptions/api/subscriptionErrors.ts` con los tres casos de T014. Hace pasar T014.
- [X] T016 Agregar a `src/shared/messages/es.ts`, en el bloque `subscriptions` (no requiere prueba propia; lo consumen las pruebas de componentes de las historias):
  - `modules.catalog`: las nueve entradas de `name`/`description` de [contracts/app-routes.md](./contracts/app-routes.md) («Módulos: nombre, descripción y requisito»), indexadas por `ClinicModuleKey`; `modules.requires: (name: string) => \`Requiere ${name}\``, `modules.alwaysIncluded: 'Siempre incluido'`, `modules.marked: (count: number) => \`Marcados: ${count} de 9\``.
  - `form.fields`: `annualPrice: 'Precio anual'`, `trialDays: 'Días de prueba'`, `selfService: 'Autoconsumo en el portal de MailySoft'`, `consultingRoomsLimit: 'Consultorios'`, `doctorsLimit: 'Doctores'`, `assistantsLimit: 'Asistentes'`, `newPatientsPerYearLimit: 'Pacientes nuevos al año'`, `otherFeatures: 'Otras funcionalidades'` (ya no `features`); los textos de ayuda y de «Agregar funcionalidad N de 20» de contracts/app-routes.md, «Formulario».
  - `validation`: `annualPriceRequired`, `annualPriceInvalid` (mismo texto que `priceInvalid`, propio de ese campo), `trialDaysInvalid: 'Escribe un número entero de 0 a 3650.'`, `limitInvalid: 'Escribe un número entero de 0 a 1,000,000.'`, `otherFeatureRequired`/`otherFeatureTooLong`/`otherFeaturesTooMany` (antes `feature*`).
  - `errors.fields`: agregar `annualPrice`, `trialDays`, `selfService`, `consultingRoomsLimit`, `doctorsLimit`, `assistantsLimit`, `newPatientsPerYearLimit`, `moduleKeys: 'Revisa los módulos incluidos: alguno no es válido o le falta su módulo requisito.'`; `otherFeatures` sustituye a `features`.
  - `badge`: `selfService: 'Autoconsumo'`, `custom: 'A la medida'`.
  - `price`: `perYear: (amount: string) => \`${amount}/año\``, `savingsBadge: (percent: number) => \`Ahorra ${percent}%\``, `savingsCaption: (monthly: string, yearly: string) => \`Equivale a ${monthly} al mes. Ahorras ${yearly} al año.\``, `trialDays: (days: number) => \`${days} días de prueba\``.
  - `detail.fields`: agregar `annualPrice`, `trialDays`, `selfService`, `modules`, `notIncluded: (names: string) => \`No incluye: ${names}\``, los cuatro límites; `otherFeatures` sustituye a `features`.
  - `comparison`: `tabLabel: 'Comparativo'`, `listTabLabel: 'Listado'`, `priceToggle: { monthly: 'Mensual', annual: 'Anual' }`, `sections: { modules: 'Módulos', limits: 'Límites de la clínica', otherFeatures: 'Otras funcionalidades', includes: 'Incluye', other: 'Otros', trialDays: 'Días de prueba', clinics: 'Clínicas con el plan', actions: 'Acciones' }`, `editAction: 'Editar'`, `footerNote: 'Precios simulados en pesos mexicanos, antes de IVA.'`, `moduleIncluded: 'Incluido'`, `moduleNotIncluded: 'No incluido'`.
  - `preview.title: 'Vista previa'`, `preview.subtitle: 'Así verá el plan la clínica'`.
- [X] T017 [P] Renombrar `src/features/subscriptions/components/FeaturesField.tsx` y su prueba a `OtherFeaturesField.tsx`/`.test.tsx` (research D2): campo del formulario `otherFeatures` en vez de `features`, `MAX_OTHER_FEATURES` en vez de `MAX_FEATURES`, y los textos de `messages.subscriptions.form.fields.otherFeatures`/`validation.otherFeature*` (T016). El comportamiento (agregar, editar, quitar, foco, contador «N de 20», sin reordenar) no cambia.

### Simulador de pruebas

- [X] T018 [P] Ampliar `src/test/factories.ts`: `subscriptionDto(overrides)` agrega por defecto `annual_price: '12990.00'`, `trial_days: 14`, `self_service: true`, `module_keys: ['clinical_record_templates', 'clinical_records', 'patients', 'prescriptions', 'reminders', 'scheduling']`, `other_features: ['Soporte por correo y WhatsApp', 'Capacitación inicial en línea']`, `consulting_rooms_limit: 2`, `doctors_limit: 3`, `assistants_limit: 2`, `new_patients_per_year_limit: 15000` (el ejemplo «Profesional» de contracts/subscriptions-service.md); quita `features` de los valores por defecto.
- [X] T019 [P] Ampliar `src/test/handlers/subscriptionsCatalog/model.test.ts` (debe fallar primero; contracts/subscriptions-service.md). `CatalogSubscription` y `SubscriptionInput`/`SubscriptionChanges` ganan los ocho campos (con los nombres de la API: `other_features` en vez de `features`).
  - `create(input)`: `module_keys` siempre incluye `'patients'`, se envíe o no; si falta algún requisito de `MODULE_PREREQUISITE` entre las claves pedidas, lanza `CatalogError(409, 'subscription_module_prerequisite_missing', …)`; si alguna clave no está en `CLINIC_MODULE_ORDER`, lanza `CatalogError(422, 'subscription_module_not_found', …)` (como `validation_error` con `errors: [{ field: 'module_keys', … }]`); sin `trial_days`/`self_service`, quedan en `0`/`false`.
  - `update(id, changes)`: `module_keys`, si se envía, sustituye el conjunto completo con las mismas reglas de `create`; los demás campos nuevos cambian solo lo recibido.
  - `clinicsCountOf` y el resto de las reglas ya probadas en la 003 no cambian.
- [X] T020 Implementar (tras T003 y T019) `src/test/handlers/subscriptionsCatalog/model.ts`: agregar los ocho campos a `CatalogSubscription`, a `toDto` (con los nombres de la API) y a `applyChanges`; `create` valida `module_keys` contra `CLINIC_MODULE_ORDER` y `MODULE_PREREQUISITE`, **importados de `src/features/subscriptions/schemas/clinicModuleCatalog`** (research D9, no una copia). Hace pasar T019.
- [X] T021 Implementar (tras T020) `src/test/handlers/subscriptionsCatalog/validation.ts`: `WRITABLE_FIELDS` agrega `annual_price`, `trial_days`, `self_service`, `module_keys`, `other_features` (sustituye a `features`), `consulting_rooms_limit`, `doctors_limit`, `assistants_limit`, `new_patients_per_year_limit`; cada uno con la validación de su tipo y rango (mismo patrón que `priceError`/`featuresError` ya existentes, con los mensajes de contracts/subscriptions-service.md).
- [X] T022 [P] Ampliar `src/test/handlers/subscriptionsCatalog/reads.test.ts` (debe fallar primero): `GET /api/v1/subscriptions` y `GET /api/v1/subscriptions/{id}` devuelven los ocho campos nuevos con los nombres de la API, ya cubierto por T020; esta tarea solo agrega las aserciones. No requiere cambios en `reads.ts`.
- [X] T023 Ampliar `e2e/subscriptions.spec.ts`: revisar que ningún selector o texto dependa de `features` o de «Lo que incluye»; actualizar a `otherFeatures`/«Otras funcionalidades» donde corresponda, sin agregar recorridos nuevos todavía (llegan con T049 y T058 si hace falta).
- [X] T024 Punto de control de la fase: `npm run typecheck`, `npm run lint` y `npm run test` pasan con todo lo anterior, en particular `src/features/subscriptions/{schemas,policy,api}/` y `src/test/handlers/subscriptionsCatalog/`.

**Checkpoint**: modelo de datos, catálogo de módulos, formulario y simulador listos — las historias pueden empezar.

---

## Phase 3: User Story 1 - Consultar el catálogo de planes: listado, detalle y comparativo (Priority: P1) 🎯 MVP

**Goal**: el operador ve, en el detalle de una suscripción, todos sus datos nuevos (precio anual con su ahorro, días de prueba, autoconsumo/a la medida, módulos incluidos y no incluidos, límites, otras funcionalidades); y en una segunda pestaña «Comparativo», una matriz de los planes vigentes lado a lado, con un control Mensual/Anual que no recarga nada.

**Independent Test**: con al menos cuatro suscripciones vigentes de distinto precio, autoconsumo, módulos y límites, abrir el detalle de una y la pestaña Comparativo, y verificar que los dos coinciden entre sí y con la plataforma, en los dos precios (quickstart W1 a W6).

### Tests for User Story 1 ⚠️

> Escribir estas pruebas primero y comprobar que fallan antes de implementar.

- [X] T025 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionPriceDisplay.test.tsx`: con `cycle="monthly"` muestra `$1,299.00/mes`; con `cycle="annual"` y un ahorro positivo muestra `$12,990.00/año`, la etiqueta `Ahorra 17%` y «Equivale a $1,082.50 al mes. Ahorras $2,598.00 al año.»; con `cycle="annual"` y ahorro nulo (`computeAnnualSavings` da `null`) muestra solo el precio, sin etiqueta ni leyenda. Sin violaciones de axe.
- [X] T026 [P] [US1] Escribir `src/features/subscriptions/components/PriceCycleToggle.test.tsx`: `ToggleButtonGroup` con «Mensual» y «Anual»; empieza en el valor de la propiedad `value` (por defecto `'monthly'` cuando no se pasa); al elegir «Anual» llama a `onChange('annual')`; vuelve a Mensual al reabrir si el componente se desmonta y se vuelve a montar sin `value` persistido (research D8: estado local, no en la URL). Operable con teclado; sin violaciones de axe.
- [X] T027 [P] [US1] Ampliar `src/features/subscriptions/components/SubscriptionDetailFields.test.tsx` (tras T009): además de lo que ya probaba la 003,
  - muestra «$12,990.00/año» con su leyenda de ahorro, debajo del precio mensual;
  - con `trialDays: 0` no muestra ninguna indicación de prueba; con `trialDays: 14` muestra «14 días de prueba»;
  - muestra la etiqueta `Autoconsumo` cuando `selfService` es `true`, y `A la medida` cuando es `false`;
  - lista los módulos incluidos por su nombre (orden de `CLINIC_MODULE_ORDER`) y, si falta alguno de los nueve, «No incluye: <los que faltan, separados por coma>»; con los nueve incluidos, no muestra esa leyenda;
  - muestra los cuatro límites con su etiqueta;
  - el campo «Otras funcionalidades» sustituye a «Lo que incluye», mismo comportamiento de lista;
  - sin violaciones de axe.
- [X] T028 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionsComparisonTable.test.tsx`, con el tema real y 4-5 suscripciones de ejemplo (distinto estatus, precio, autoconsumo y módulos).
  - Una columna por suscripción, en el orden de `sortCatalog` (Activas primero por precio mensual, luego las demás; FR-018).
  - El encabezado de cada columna: nombre, etiqueta Autoconsumo/A la medida, descripción, precio del `cycle` recibido (con su leyenda de ahorro si aplica) y la etiqueta de estatus.
  - Una fila por cada uno de los nueve módulos de `CLINIC_MODULE_ORDER`, con una marca (con texto «Incluido» para lectores de pantalla) o un guion («No incluido») por columna.
  - Una fila por cada uno de los cuatro límites, con su número.
  - Una fila «Incluye» con la lista de `otherFeatures` de cada columna (nada si está vacía).
  - «Días de prueba» (oculta si todas tienen 0) y «Clínicas con el plan» (número o «No disponible»).
  - La fila «Editar»: un enlace a `/subscriptions/:id/edit` por columna solo cuando `canEdit` es `true`; con `canEdit: false`, la fila no aparece.
  - El pie «Precios simulados en pesos mexicanos, antes de IVA.».
  - El contenedor se desplaza horizontalmente sin mover la página (`overflowX`).
  - Sin suscripciones, no se renderiza (el estado vacío lo decide quien la usa, T034).
  - Sin violaciones de axe.
- [X] T029 [P] [US1] Escribir `src/features/subscriptions/hooks/useSubscriptionsLocation.test.tsx` (ampliación; tras T011): `location.tab` refleja `?tab=comparison`; `setTab('comparison')` navega a `?tab=comparison` conservando `page`/`page_size` si no son los de por defecto; `setTab('list')` quita el parámetro; `setPage`/`setPageSize` conservan el `tab` vigente.
- [X] T030 [US1] Escribir `src/features/subscriptions/components/SubscriptionsListPage.test.tsx` (reemplaza la prueba de la 003; tras T003 a T024): con `createMemoryRouter`,
  - muestra un `Tabs` con «Listado» (seleccionada por defecto) y «Comparativo»;
  - con `?tab=comparison`, abre directamente en «Comparativo», sin que el contenido de «Listado» se monte;
  - cambiar de pestaña actualiza la URL y **no genera ninguna solicitud nueva** al simulador (reutiliza el catálogo ya cargado: FR-019, SC-005);
  - el contenido de «Listado» (filas, paginación, estados) es exactamente el que probaba `SubscriptionsListPage.test.tsx` de la 003, ahora en el panel de esa pestaña;
  - el panel «Comparativo» muestra `SubscriptionsComparisonTable` con el catálogo ordenado completo (sin paginar) y, vacío, el mismo estado vacío que «Listado»;
  - sin violaciones de axe en las dos pestañas.
- [X] T031 [US1] Ampliar `src/app/router/subscriptions/subscriptionsList.integration.test.tsx` (tras T030): con el catálogo del paso 1 de quickstart.md (Esencial, Profesional, Avanzado, Empresarial, Solo), abrir «Comparativo» y comprobar el precio anual con su ahorro de Profesional y de Empresarial (quickstart W3), que alternar Mensual/Anual no hace solicitudes (W2), y que sin `subscriptions:update` no aparece «Editar» en ninguna columna (W14).

### Implementation for User Story 1

- [X] T032 [US1] Implementar `src/features/subscriptions/components/SubscriptionPriceDisplay.tsx` (tras T025 y T007): recibe `price` (texto), `cycle: 'monthly' | 'annual'` y, solo para `'annual'`, el otro precio (para `computeAnnualSavings`); usa `formatMxn` y `messages.subscriptions.price`. Hace pasar T025.
- [X] T033 [US1] Implementar `src/features/subscriptions/components/PriceCycleToggle.tsx` (tras T026): `ToggleButtonGroup` controlado (`value`, `onChange`), con los textos de `messages.subscriptions.comparison.priceToggle`. Hace pasar T026.
- [X] T034 [US1] Implementar la ampliación de `src/features/subscriptions/components/SubscriptionDetailFields.tsx` (tras T027, T032, T003, T016): agregar las filas de precio anual (`SubscriptionPriceDisplay cycle="annual"`), días de prueba, la etiqueta de autoconsumo, la lista de módulos incluidos/no incluidos (recorrida en `CLINIC_MODULE_ORDER`) y los cuatro límites; renombrar el campo «Lo que incluye» a «Otras funcionalidades» (`subscription.otherFeatures`). Hace pasar T027.
- [X] T035 [US1] Implementar `src/features/subscriptions/components/SubscriptionsComparisonTable.tsx` (tras T028, T032, T033, T003, T016): `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell` de MUI (research D7), recibe `subscriptions: readonly Subscription[]` (ya ordenadas), `cycle`, `canEdit` y `listSearch`; construye las filas a partir de `CLINIC_MODULE_ORDER` y las cuatro claves de límite. Hace pasar T028.
- [X] T036 [US1] Implementar la ampliación de `src/features/subscriptions/hooks/useSubscriptionsLocation.ts` (tras T029 y T011): agregar `setTab` a `SubscriptionsLocationApi`; `setPage` y `setPageSize` pasan `tab: location.tab` a `toSubscriptionsSearchParams`. Hace pasar T029.
- [X] T037 [US1] Extraer `src/features/subscriptions/components/SubscriptionsListView.tsx` (tras T030) con el contenido que hoy pinta `SubscriptionsListPage` (el `SubscriptionsGrid`, la región de estado y los estados de carga/vacío/error de la pestaña Listado), sin cambiar su comportamiento: mismas propiedades que necesitaba antes, menos el encabezado y el botón «Nueva suscripción», que quedan en `SubscriptionsListPage`.
- [X] T038 [US1] Reescribir `src/features/subscriptions/components/SubscriptionsListPage.tsx` (tras T030, T035, T036 y T037, research D11): mantiene el encabezado y «Nueva suscripción»; agrega un `Tabs` (`messages.subscriptions.comparison.listTabLabel`/`tabLabel`) cuyo valor es `location.tab` vía `useSubscriptionsLocation` (ahora con `setTab`); el panel «Listado» renderiza `SubscriptionsListView`, y el panel «Comparativo», `SubscriptionsComparisonTable` con `sortCatalog(query.data ?? [])`, `cycle` en estado local (`useState<'monthly' | 'annual'>('monthly')`) controlado por `PriceCycleToggle`, y `canEdit` de `capabilities`. Hace pasar T030.
- [X] T039 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente W1 a W6 de [quickstart.md](quickstart.md).

**Checkpoint**: el detalle y el Comparativo muestran todos los datos nuevos de punta a punta (MVP de lectura).

---

## Phase 4: User Story 2 - Crear un plan completo (Priority: P1)

**Goal**: el operador da de alta una suscripción con precio mensual y anual, días de prueba, autoconsumo, módulos incluidos (con la cascada de dependencias), los cuatro límites y otras funcionalidades, viendo en todo momento una vista previa.

**Independent Test**: crear un plan con todos los campos (incluidos dos módulos con requisito) y verificar que la vista previa coincide en cada paso con lo capturado, y que el detalle y el Comparativo muestran exactamente esos datos tras guardar (quickstart W7 a W10, W13).

### Tests for User Story 2 ⚠️

- [ ] T040 [P] [US2] Escribir `src/features/subscriptions/components/ModulesField.test.tsx` (tras T005, T003, T016).
  - «Pacientes» aparece marcado y deshabilitado, con «Siempre incluido»; los otros ocho, sin marcar, con su nombre y su descripción (T016); los cuatro con requisito muestran «Requiere <módulo>».
  - El contador dice «Marcados: 1 de 9» al abrir y se actualiza con cada cambio.
  - Marcar «Recordatorios» marca también «Agenda y citas» (llama a `onChange` con el conjunto que da `withModuleChecked`); desmarcar «Agenda y citas» desmarca también «Recordatorios».
  - Es un `fieldset` con `legend`; sin violaciones de axe.
- [ ] T041 [P] [US2] Escribir `src/features/subscriptions/components/ClinicLimitsFields.test.tsx`: los cuatro campos («Consultorios», «Doctores», «Asistentes», «Pacientes nuevos al año») con su texto de ayuda (contracts/app-routes.md); error «Escribe un número entero de 0 a 1,000,000.» fuera de rango; sin violaciones de axe.
- [ ] T042 [P] [US2] Escribir `src/features/subscriptions/components/SelfServiceAndTrialFields.test.tsx`: `Switch` de autoconsumo (apagado por defecto) con su texto de ayuda; campo «Días de prueba» con «0 = sin periodo de prueba.» y error «Escribe un número entero de 0 a 3650.» fuera de rango; sin violaciones de axe.
- [ ] T043 [P] [US2] Escribir `src/features/subscriptions/components/SubscriptionPreviewPanel.test.tsx` (tras T032, T033, T003): recibe los valores actuales del formulario (`SubscriptionFormValues`) y los refleja sin pedir nada a la plataforma: nombre, badge Autoconsumo/A la medida, descripción, precio del `PriceCycleToggle` interno (empieza en Mensual), días de prueba (oculto si 0), módulos marcados con «No incluye: …», los cuatro límites bajo «Podrá dar de alta» y la lista de otras funcionalidades; es una región con un título «Vista previa»; sin violaciones de axe.
- [ ] T044 [US2] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.test.tsx` (tras T017, T040 a T043): el formulario completo incluye, además de lo ya probado en la 003, el precio anual (con «$»/«año», `inputMode="decimal"` y la leyenda de ahorro cuando aplica), `SelfServiceAndTrialFields`, `ModulesField`, `ClinicLimitsFields` y `OtherFeaturesField` (en vez de `FeaturesField`); todos los errores se asocian con `aria-describedby`; sin violaciones de axe.
- [ ] T045 [US2] Ampliar `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx` (tras T044, T013): junto al formulario se ve el panel `SubscriptionPreviewPanel`, que cambia con cada campo capturado; completar todas las secciones y guardar crea la suscripción con el cuerpo completo (`toCreateSubscriptionBody`) y lleva al detalle; dejar vacíos el precio anual o un límite muestra su error sin enviar nada; un rechazo `subscription_module_prerequisite_missing` o `subscription_module_not_found` simulado se muestra junto a la sección «Módulos incluidos» sin perder los demás datos capturados.
- [ ] T046 [P] [US2] Ampliar `src/features/subscriptions/api/subscriptionsApi.create.test.ts` (tras T009, T013): el cuerpo que envía `createSubscription` incluye los ocho campos nuevos tal como los da `toCreateSubscriptionBody`.
- [ ] T047 [P] [US2] Ampliar `src/test/handlers/subscriptionsCatalog/create.test.ts` (tras T021): un alta con un módulo dependiente sin su requisito da `409 subscription_module_prerequisite_missing`; con una clave fuera del catálogo da `422` en `module_keys`; sin `annual_price` o sin alguno de los cuatro límites da `422` en ese campo; con los campos válidos, la respuesta trae los ocho campos nuevos tal como se enviaron (`module_keys` siempre con `patients`).
- [ ] T048 [US2] Ampliar `src/app/router/subscriptions/createSubscription.integration.test.tsx` (tras T045, T047): el recorrido completo de W9 del quickstart (nombre, los dos precios, días de prueba, autoconsumo, tres módulos, los cuatro límites y una otra funcionalidad) termina en el detalle con esos datos exactos; el escenario W13 (carrera: el requisito de un módulo ya marcado se retira en otra sesión antes de guardar) muestra el rechazo junto a «Módulos incluidos» sin perder el resto del formulario.

### Implementation for User Story 2

- [ ] T049 [US2] Implementar `src/features/subscriptions/components/ModulesField.tsx` (tras T040, T005, T003, T016): nueve `Checkbox` dentro de un `FormGroup`/`fieldset`, «Pacientes» deshabilitado y marcado; cada `onChange` llama a `withModuleChecked` y actualiza el campo `moduleKeys` del formulario (`setValue(..., { shouldDirty: true })`). Hace pasar T040.
- [ ] T050 [P] [US2] Implementar `src/features/subscriptions/components/ClinicLimitsFields.tsx` (tras T041, T016): cuatro `TextField` numéricos (`inputMode="numeric"`). Hace pasar T041.
- [ ] T051 [P] [US2] Implementar `src/features/subscriptions/components/SelfServiceAndTrialFields.tsx` (tras T042, T016): `Switch` + `TextField` de días de prueba. Hace pasar T042.
- [ ] T052 [US2] Implementar `src/features/subscriptions/components/SubscriptionPreviewPanel.tsx` (tras T043, T032, T033, T003, T016). Hace pasar T043.
- [ ] T053 [US2] Ampliar `src/features/subscriptions/components/SubscriptionFormFields.tsx` (tras T044, T049 a T052, T017): agregar el campo de precio anual junto al mensual, `SelfServiceAndTrialFields`, `ModulesField`, `ClinicLimitsFields` y sustituir `FeaturesField` por `OtherFeaturesField`. Hace pasar T044.
- [ ] T054 [US2] Ajustar `src/features/subscriptions/components/SubscriptionCreatePage.tsx` (tras T045, T052, T053): colocar `SubscriptionPreviewPanel` junto al formulario (dos columnas en pantallas anchas, apiladas en estrechas), alimentado con `watch()` de React Hook Form. Hace pasar T045.
- [ ] T055 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente W7 a W10 y W13 de [quickstart.md](quickstart.md).

**Checkpoint**: el alta captura y guarda todos los datos nuevos, con vista previa en vivo y sin poder enviar una combinación de módulos inválida.

---

## Phase 5: User Story 3 - Modificar un plan existente (Priority: P2)

**Goal**: el operador cambia el precio anual, los días de prueba, el autoconsumo, los módulos, los límites o las otras funcionalidades de una suscripción existente, con el mismo formulario del alta y enviando solo lo que cambió.

**Independent Test**: editar una suscripción agregando un módulo con requisito, subiendo un límite y cambiando el precio anual, y verificar que el detalle, el listado y el Comparativo reflejan los nuevos valores sin tocar los demás datos; repetir sin cambiar nada y comprobar que no se envía nada (quickstart W11, W12).

### Tests for User Story 3 ⚠️

- [ ] T056 [P] [US3] Ampliar `src/features/subscriptions/components/SubscriptionEditPage.test.tsx` (tras T013, T053): el formulario abre con los valores actuales, incluidos los módulos marcados (`toFormValues`), el precio anual, los días de prueba, el autoconsumo, los cuatro límites y las otras funcionalidades; cambiar solo un límite y guardar envía únicamente ese campo (`toUpdateSubscriptionBody`); agregar un módulo envía el conjunto completo; sin ningún cambio, «Guardar» no envía nada y vuelve al detalle con el aviso de que no había cambios.
- [ ] T057 [P] [US3] Ampliar `src/test/handlers/subscriptionsCatalog/update.test.ts` (tras T021): `module_keys` en una modificación sustituye el conjunto completo (con las mismas reglas de dependencia y catálogo que `create`, T047); los demás campos nuevos cambian solo lo recibido; un cuerpo vacío sigue dando `422` en `body`.
- [ ] T058 [US3] Ampliar `src/app/router/subscriptions/editSubscription.integration.test.tsx` (tras T056, T057): el recorrido de W11 (agregar un límite y un módulo, guardar, ver el detalle actualizado) y de W12 (guardar sin cambios, ver el aviso, ningún `PATCH` en la pestaña Red).

### Implementation for User Story 3

- [ ] T059 [US3] Revisar `src/features/subscriptions/components/SubscriptionEditPage.tsx` (tras T056): confirma que, al reutilizar `SubscriptionFormFields` (T053) y `toFormValues`/`toUpdateSubscriptionBody` (T013) sin cambios propios, pasa T056; ajustar solo si la prueba revela un hueco (por ejemplo, pasar `moduleKeys` o los límites iniciales al abrir). Hace pasar T056.
- [ ] T060 [US3] Punto de control de la historia: ejecutar las pruebas y validar manualmente W11 y W12 de [quickstart.md](quickstart.md).

**Checkpoint**: las tres historias funcionan juntas de punta a punta: consultar, crear y modificar un plan completo.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: verificaciones finales que cruzan las tres historias.

- [ ] T061 [P] Buscar en todo el repositorio (`src/`, `e2e/`, `README.md`) referencias sueltas a `features`/«Lo que incluye» que debieran decir `otherFeatures`/«Otras funcionalidades», y corregirlas.
- [ ] T062 [P] Revisar accesibilidad manual del `Tabs` Listado/Comparativo, del grupo de módulos y de la matriz del Comparativo a 1024 px y a 320 px, solo con teclado (quickstart W15; contracts/app-routes.md, «Accesibilidad»).
- [ ] T063 Medir de nuevo el bundle (`npm run build && npm run size`) y comparar con la línea base de T001; si crece por encima del presupuesto de 300 KB gzip, revisar qué pantalla nueva debe cargarse de forma perezosa.
- [ ] T064 Ejecutar de punta a punta los escenarios W1 a W15 de [quickstart.md](quickstart.md) (los automatizados ya corren en CI; esta pasada es manual, como el cierre de la 003 y la 011).
- [ ] T065 Punto de control final: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:coverage` (umbral de 80 % en `api`, `policy`, `schemas`, `hooks` y `shared/api|lib`) y `npm run build` pasan todos.

**Checkpoint**: feature completa, medida y validada contra el quickstart.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** las tres historias: el esquema de `Subscription`, el formulario, el catálogo de módulos y el simulador los usan todas.
- **User Stories (Phase 3-5)**: todas dependen de Foundational.
  - US1 no depende de US2 ni de US3 (es de solo lectura).
  - US2 depende de los componentes de formulario que crea `SubscriptionPreviewPanel` reutilizando `SubscriptionPriceDisplay`/`PriceCycleToggle` de **US1** (T032, T033): por eso US2 se implementa después de US1, aunque las dos son P1.
  - US3 reutiliza el formulario completo de US2 (T053) y las piezas de US1: se implementa después de las dos.
- **Polish (Phase 6)**: depende de las tres historias.

### Dentro de cada historia

- Tests antes que la implementación que los hace pasar (marcado «Hace pasar TXXX» en cada tarea de implementación).
- Piezas puras (`schemas/`, `policy/`) antes que los componentes que las usan.
- `ModulesField`, `ClinicLimitsFields`, `SelfServiceAndTrialFields` y `OtherFeaturesField` (todas [P] entre sí) antes que `SubscriptionFormFields`, que las compone.

### Parallel Opportunities

- Dentro de Foundational: T002, T006, T008, T010, T012, T014 y T018 (pruebas de piezas sin dependencias entre sí) se escriben en paralelo; igual sus implementaciones cuando no comparten archivo.
- Dentro de US1: T025, T026, T027, T028 y T029 (archivos distintos) en paralelo.
- Dentro de US2: T040, T041, T042 y T043 en paralelo; T046 y T047 en paralelo con las pruebas de componentes.
- Dentro de US3: T056 y T057 en paralelo.

---

## Parallel Example: Foundational

```bash
Task: "Escribir src/features/subscriptions/schemas/clinicModuleCatalog.test.ts (T002)"
Task: "Ampliar src/features/subscriptions/schemas/price.test.ts con computeAnnualSavings (T006)"
Task: "Ampliar src/features/subscriptions/schemas/subscription.test.ts con los ocho campos nuevos (T008)"
Task: "Ampliar src/features/subscriptions/schemas/subscriptionsLocation.test.ts con tab (T010)"
```

## Parallel Example: User Story 2 (componentes del formulario)

```bash
Task: "Escribir ModulesField.test.tsx (T040)"
Task: "Escribir ClinicLimitsFields.test.tsx (T041)"
Task: "Escribir SelfServiceAndTrialFields.test.tsx (T042)"
Task: "Escribir SubscriptionPreviewPanel.test.tsx (T043)"
```

---

## Implementation Strategy

### MVP First (historias 1 y 2, las dos P1)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (BLOQUEA todo).
3. Completar Phase 3: US1 (consultar: detalle y Comparativo con todos los datos nuevos).
4. **PARAR y VALIDAR**: quickstart W1 a W6.
5. Completar Phase 4: US2 (crear un plan completo, reutilizando los componentes de precio de US1).
6. **PARAR y VALIDAR**: quickstart W7 a W10 y W13.

### Incremental Delivery

1. Setup + Foundational → base lista (el cambio de contrato, aplicado de una vez).
2. US1 → el Comparativo y el detalle enriquecido ya aportan valor por sí solos (consultar lo que ya existe con el contrato nuevo).
3. US2 → primera entrega completa de alta y consulta; PR pequeño y enfocado, como pide la constitución.
4. US3 → cierra el patrón de Listar/Mostrar/Crear/Modificar para esta ampliación (Cambiar estatus y Eliminar no cambian: siguen siendo los de la 003).
5. Polish → medición final, accesibilidad y quickstart completo.

### Parallel Team Strategy

1. El equipo completa Setup y Foundational junto (es, en su mayoría, un solo cambio de contrato coherente: dividirlo entre varias personas por archivo, no por historia).
2. Con Foundational lista: una persona hace US1 (T025-T039); otra prepara en paralelo los componentes de formulario de US2 que no dependen de US1 (T040-T044, T046-T047) y los termina de integrar (T052-T054) en cuanto US1 entrega `SubscriptionPriceDisplay`/`PriceCycleToggle` (T032-T033).
3. US3 espera a que el formulario de US2 (T053) esté completo.

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí.
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad.
- Verificar que las pruebas fallan antes de implementar.
- El simulador de pruebas (`src/test/handlers/subscriptionsCatalog/`) importa el catálogo fijo de módulos del propio código de producción (T020, research D9): si el contrato de la API cambiara, esas pruebas y `clinicModuleCatalog.ts` cambian primero.
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés).
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia (salvo la ya documentada de US2/US3 sobre las piezas de precio y de formulario de US1/US2).
