# Tasks: Administración de Suscripciones

**Input**: Design documents from `/specs/003-manage-subscription-types/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md y `.specify/memory/constitution.md`

**Tests**: Incluidas. La plantilla las marca como opcionales, pero la constitución (VII) exige pruebas automatizadas con cada feature y pruebas primero en la lógica pura, y la spec las deja para `/speckit-implement` (Assumptions, «Pruebas»). Dentro de cada fase, las pruebas se escriben ANTES de la implementación y DEBEN fallar al principio. Se usan Vitest, React Testing Library, user-event y MSW. La API de suscripciones se simula a nivel de red con el simulador con estado de `src/test/handlers/subscriptionsCatalog/`, que toma los permisos del simulador del servicio de usuarios (`createUsersDirectoryMock`); nunca se usa un mock de `fetch` ni del cliente HTTP. Auth0 se simula con el doble centralizado, y las pruebas de integración usan `renderApp` (la aplicación completa).

**Organization**: Tareas agrupadas por historia de usuario para poder implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1 a US5); solo en las fases de historias
- Cada descripción incluye las rutas exactas de los archivos

## Path Conventions

- **Single project** en la raíz del repositorio (plan.md): `src/`, `e2e/`, `scripts/`
- Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, y los textos de interfaz solo en `src/shared/messages/es.ts`
- Alias `@/` → `src/`. Dependencias permitidas: `app → features → shared`; una feature solo importa a otra por su `index.ts`. **`src/features/subscriptions` NO importa `@/features/auth`** (research D2): las capacidades llegan a las pantallas por propiedades desde los adaptadores de `src/app/router/subscriptions/`. `auth` solo importa de `subscriptions` el tipo `SubscriptionCapabilities` (`import type`)
- Los ids de suscripción son **enteros** (research D5), no UUID como los de usuario
- Sin aserciones `as` (salvo `as const`), sin `any` y sin `console.*`; componentes `.tsx` de 250 líneas como máximo (reglas de ESLint)
- Las claves de TanStack Query salen de factorías; las rutas de la API se aíslan en la capa `api` de la feature
- Los archivos nuevos de `api`, `policy`, `schemas`, `hooks` y `shared/lib` cuentan para el umbral de cobertura de 80 % (`vite.config.ts`)

## Prerrequisitos manuales (fuera de las tareas)

Estas acciones las hace una persona. Sin ellas no se puede validar de punta a punta (los puntos de control y T140), pero las pruebas automatizadas no las necesitan.

- Levantar la API de suscripciones (`C:\maily\code\maily-system-api`) con su base y sus migraciones, en `http://127.0.0.1:8010` o en otro puerto con `SUBSCRIPTIONS_API_PROXY_TARGET`, y con `USERS_API_BASE_URL` apuntando al servicio de usuarios real ([quickstart.md](quickstart.md), «Requisitos previos»).
- Dar los permisos `subscriptions:*` a los roles (quickstart, paso 1) y cargar el catálogo de prueba (paso 2).
- Para los escenarios de eliminar y de clínicas asignadas: la simulación de clínicas de la API (quickstart, paso 3).
- Para los E2E (T134): las variables `E2E_AUTH0_*` de la 001 (la cuenta A1, con los permisos del paso 1) y, solo para el recorrido que modifica el catálogo, `E2E_ALLOW_SUBSCRIPTION_WRITES=true` con la simulación de clínicas en marcha.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuración de la API de suscripciones: variable obligatoria, proxy de desarrollo y su documentación (research D13). No se instala ninguna dependencia (D1).

- [X] T001 Ampliar `src/app/config/env.test.ts` (debe fallar primero; research D13). `validSource` gana `VITE_SUBSCRIPTIONS_API_URL: '/proxy/subscriptions'`. Sin la variable, o con un valor vacío, `parseEnv` falla con `VITE_SUBSCRIPTIONS_API_URL: ${messages.config.rules.apiUrl}`. En desarrollo acepta `/proxy/subscriptions` y `http://127.0.0.1:8010`; en producción, solo `https` o una ruta del mismo origen. `VITE_CLINICS_API_URL` sigue siendo opcional: el `describe.each` actual pasa a cubrir solo esa variable
- [X] T002 Implementar (tras T001). En `src/app/config/env.ts`, `VITE_SUBSCRIPTIONS_API_URL: apiBase` (deja de ser `optionalApiBase`). En `src/vite-env.d.ts`, `readonly VITE_SUBSCRIPTIONS_API_URL: string`. Crear `src/test/handlers/subscriptionsCatalog/baseUrl.ts` con `export const SUBSCRIPTIONS_API_BASE_URL = 'http://localhost:5173/proxy/subscriptions'`. Usar esa constante en el `env` de `src/test/renderApp.tsx`, y `'/proxy/subscriptions'` en el `env` de `src/app/providers/HttpClientsProvider.test.tsx`. Hace pasar T001 sin romper otras pruebas
- [X] T003 [P] Añadir a `vite.config.ts` el proxy `'/proxy/subscriptions'`, con `target: env.SUBSCRIPTIONS_API_PROXY_TARGET ?? 'http://127.0.0.1:8010'`, `changeOrigin: true` y `rewrite` que quita el prefijo, como el de usuarios. Lleva un comentario: la API solo habilita CORS con `CORS_ALLOWED_ORIGINS` y su puerto documentado es el 8010. En `.env.example`, descomentar `VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions` y añadir `# SUBSCRIPTIONS_API_PROXY_TARGET=http://127.0.0.1:8010` bajo «Solo desarrollo»
- [X] T004 [P] Documentar la configuración. En `README.md`, la tabla de variables pasa a marcar `VITE_SUBSCRIPTIONS_API_URL` como obligatoria (`/proxy/subscriptions` en desarrollo o una URL `https`), con la fila `SUBSCRIPTIONS_API_PROXY_TARGET` (solo desarrollo, por defecto `127.0.0.1:8010`), y `npm run dev` menciona los dos proxies. En `specs/001-auth-session-profile/contracts/environment.md`, la fila de `VITE_SUBSCRIPTIONS_API_URL` dice «Sí (feature 003)» con el ejemplo `/proxy/subscriptions`, y se actualiza el bloque de ejemplo del `.env`
- [X] T005 Verificar que nada se rompió con los cambios de `src/app/config/env.ts`, `src/vite-env.d.ts`, `src/test/renderApp.tsx`, `vite.config.ts` y `.env.example` (T001 a T004): `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run test`. Con un `.env.local` sin `VITE_SUBSCRIPTIONS_API_URL`, `npm run dev` muestra «Configuración inválida» con esa variable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lo que TODAS las historias necesitan. Comprende las piezas de la 002 que pasan a ser comunes, textos comunes, estatus, capacidades, formato de moneda, esquemas, orden y página del catálogo y clasificación de errores. También las claves de caché, el cliente HTTP, los títulos de ruta y el límite de importaciones. Por último, la infraestructura de pruebas: fábricas y el núcleo del simulador con estado de la API.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta terminar esta fase

Cada prueba de esta fase precede a su implementación. Los manejadores del simulador para cada operación llegan con la historia que los usa.

### Piezas de la 002 que pasan a ser comunes (research D2; sin cambiar su comportamiento)

- [X] T006 Mover `src/app/router/users/RequireCapability.tsx` y `RequireCapability.test.tsx` a `src/app/router/`. El contenido no cambia, salvo el comentario, que pasa a hablar de «una pantalla de una sección» y no de usuarios. Actualizar las importaciones de `src/app/router/users/UserCreateRoute.tsx` y `src/app/router/users/UserEditRoute.tsx`
- [X] T007 [P] Mover `atMost` y `REFRESH_WAIT_MS` de `src/features/users/hooks/refreshUser.ts` a `src/shared/lib/atMost.ts`, con el bloque `describe('atMost')` de `src/features/users/hooks/refreshUser.test.ts` en `src/shared/lib/atMost.test.ts`. Actualizar las importaciones de `refreshUser.ts` y `src/features/users/hooks/useChangeUserStatus.ts`
- [X] T008 [P] Mover `src/features/users/components/RefreshFailedAlert.tsx` y su prueba a `src/shared/ui/RefreshFailedAlert.tsx` y `src/shared/ui/RefreshFailedAlert.test.tsx`. Actualizar las importaciones de `src/features/users/components/UserDetailPage.tsx` y `src/features/users/components/UserRolesPanel.tsx`
- [X] T009 Generalizar `src/features/users/components/UserForm.tsx` en `src/shared/ui/FormFrame.tsx`, con la misma API: `onSubmit`, `pending`, `saveDisabled`, `error` (recibe el foco), `cancelTo`, `cancelState` y `children`. El botón de guardar lee `messages.common.save`. Mover su prueba a `src/shared/ui/FormFrame.test.tsx`.
  - En `src/shared/messages/es.ts`, añadir `save: 'Guardar'` a `common` y quitar `users.form.save`.
  - Actualizar `src/features/users/components/UserCreatePage.tsx` y `UserEditPage.tsx`, y las pruebas que usan `messages.users.form.save`: `src/features/users/components/UserCreatePage.test.tsx`, `UserEditPage.test.tsx`, y en `src/app/router/users/`, `createUser.integration.test.tsx`, `editUser.integration.test.tsx` y `deleteReactivate.integration.test.tsx`
- [X] T010 Punto de control de los movimientos (T006 a T009): `npm run typecheck`, `npm run lint` y `npm run test` pasan, y las pruebas de `src/features/users/` y `src/app/router/users/` siguen verdes sin cambiar lo que comprueban
- [X] T011 Extraer lo genérico del simulador de la 002 a `src/test/handlers/shared/` (research D14).
  - `requestLog.ts`: `createRequestLog(baseUrl)` con `RecordedRequest`; la ruta relativa se calcula con la base recibida en lugar de `USERS_API_BASE_URL`. Guarda además el texto del cuerpo, para que el simulador nuevo distinga un JSON ilegible.
  - `failures.ts`: `createFailureControls({ defaultCodes })` con `failNext({ method?, path?, status, code, after? })`, `failAll(status, code?)`, `hang()`, `defer()`, `recover()` e `intercept(request, path)`.
  - `src/test/handlers/usersDirectory/behaviors.ts` compone esos controles con los de la cuenta de acceso, y `src/test/handlers/usersDirectory/index.ts` crea su registro con `USERS_API_BASE_URL`. Las pruebas existentes de `src/test/handlers/usersDirectory/` pasan sin cambios

### Textos, estatus, capacidades y formato

- [X] T012 Añadir a `src/shared/messages/es.ts` lo común de la sección.
  - En `titles`: `subscriptions: 'Suscripciones'`, `subscriptionCreate: 'Nueva suscripción'`, `subscriptionDetail: 'Detalle de la suscripción'` y `subscriptionEdit: 'Editar suscripción'`.
  - El bloque `subscriptions`: `title: 'Suscripciones'`; `status: { active: 'Activa', inactive: 'Inactiva', blocked: 'Bloqueada' }`; `price: { perMonth: (amount: string) => \`${amount}/mes\` }`; `clinics: { notAvailable: 'No disponible' }`.
  - `validation`: `nameRequired: 'El nombre es obligatorio.'`, `nameTooLong: 'El nombre no puede superar los 100 caracteres.'`, `descriptionTooLong: 'La descripción no puede superar los 500 caracteres.'`, `priceRequired: 'El precio mensual es obligatorio.'`, `priceInvalid: 'Escribe un importe de 0 a 99,999,999.99 solo con números y hasta dos decimales.'`, `featureRequired: 'Escribe el texto o quita el elemento.'`, `featureTooLong: 'Cada elemento admite hasta 150 caracteres.'` y `featuresTooMany: 'Lo que incluye admite hasta 20 elementos.'`.
  - `errors`: `nameInUse: 'Ya existe una suscripción con este nombre.'`, `formInvalid: 'Hay datos no válidos en el formulario.'`, `fields: { name: 'Revisa el nombre: debe tener de 1 a 100 caracteres.', description: 'Revisa la descripción: admite hasta 500 caracteres.', monthlyPrice: <el mismo texto que validation.priceInvalid>, features: 'Revisa lo que incluye: hasta 20 elementos de 1 a 150 caracteres.' }`, `notFound: 'La suscripción ya no existe.'`, `statusUnchanged: 'La suscripción ya tenía ese estatus. Se actualizó la pantalla.'`, `hasClinics: 'No se puede eliminar: la suscripción tiene clínicas asignadas. Se actualizó la pantalla.'`, `clinicsUnavailable: 'No se pudo comprobar si la suscripción tiene clínicas asignadas, así que no se eliminó. Inténtalo de nuevo.'` y `retryable: 'No pudimos completar la acción. Inténtalo de nuevo.'`.
  - El error inesperado reutiliza `messages.errors.unexpected` y el 403, `messages.forbidden.action`
- [X] T013 [P] Escribir `src/features/subscriptions/policy/subscriptionActions.test.ts` (debe fallar primero; research D3, data-model.md, «Acciones del detalle»).
  - `getStatusTargets(statusId)` devuelve, siempre en el orden 1, 2, 3, «Activa, Inactiva y Bloqueada menos el actual (con un id desconocido, los tres)»: 1 da `[2, 3]`, 2 da `[1, 3]`, 3 da `[1, 2]`, y 5 o 99 dan `[1, 2, 3]`.
  - `needsStatusConfirmation(targetId)` es `false` para 1 y `true` para 2 y 3.
  - `getDeleteAvailability(clinicsCount)` da `{ kind: 'allowed' }` con `null` o 0, y `{ kind: 'blocked', clinics }` con 1 o más (1 da `clinics: 1` y 3 da `clinics: 3`).
  - No muta sus argumentos
- [X] T014 Implementar (tras T013).
  - `src/features/subscriptions/schemas/subscriptionStatus.ts`: `SUBSCRIPTION_STATUS = { ACTIVE: 1, INACTIVE: 2, BLOCKED: 3, DELETED: 4 } as const`, `CHANGEABLE_STATUS_IDS = [1, 2, 3] as const` e `isActiveSubscription(statusId)`. Las decisiones usan el id, nunca el nombre.
  - `src/features/subscriptions/policy/subscriptionActions.ts`: la interfaz `SubscriptionCapabilities`, con `canCreate`, `canEdit`, `canChangeStatus` y `canDelete`, todas `readonly boolean`; `getStatusTargets`, `needsStatusConfirmation`, `getDeleteAvailability` y el tipo `DeleteAvailability`.
  - Crear `src/features/subscriptions/index.ts` exportando el tipo `SubscriptionCapabilities`. Hace pasar T013
- [X] T015 [P] Escribir `src/features/auth/policy/subscriptionCapabilities.test.ts` (debe fallar primero; FR-013).
  - `getSubscriptionCapabilities(access)`, probada con conjuntos de permisos.
  - Sin `subscriptions:read`, todo es `false` aunque estén `subscriptions:write`, `update` y `delete`; con solo `subscriptions:read`, también.
  - `canCreate` ⇔ `subscriptions:write`; `canEdit` y `canChangeStatus` ⇔ `subscriptions:update`; `canDelete` ⇔ `subscriptions:delete`.
  - Los permisos de `users` o `tenants` no cuentan, y un Administrator con `subscriptions:*` lo tiene todo
- [X] T016 Implementar (tras T014 y T015) `src/features/auth/policy/subscriptionCapabilities.ts`: `getSubscriptionCapabilities(access)` devuelve `SubscriptionCapabilities` (solo el tipo, importado de `@/features/subscriptions`) usando únicamente `can()`. Exportarla desde `src/features/auth/index.ts`. Hace pasar T015
- [X] T017 [P] Escribir `src/shared/lib/formatCurrency.test.ts` (debe fallar primero; FR-014, research D7). `formatMxn(amount)` recibe un texto decimal y lo formatea en pesos mexicanos con el formato de México:
  - `'4500.00'` da `$4,500.00`, `'0.00'` da `$0.00`, `'1999.5'` da `$1,999.50` y `'99999999.99'` da `$99,999,999.99`;
  - siempre lleva dos decimales y separador de miles;
  - un texto que no es un número se devuelve tal cual, sin lanzar
- [X] T018 Implementar (tras T017) `src/shared/lib/formatCurrency.ts` con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`. Hace pasar T017

### Esquemas, orden y errores

- [X] T019 [P] Escribir `src/features/subscriptions/schemas/price.test.ts` (debe fallar primero; data-model.md, aclaración 8).
  - `PRICE_INPUT_PATTERN` es «`^\d{1,8}(\.\d{1,2})?$`: solo dígitos y un punto decimal opcional con hasta dos decimales, de 0 a 99,999,999.99». Acepta `0`, `4500`, `4500.5`, `4500.50`, `99999999.99` y `00000001`. Rechaza `''`, `-1`, `4,500`, `$4500`, `12.345`, `100000000`, `1e3`, `4500.` y `.5`.
  - `READ_PRICE_PATTERN` es «`^\d{1,8}\.\d{2}$`»: acepta `4500.00` y rechaza `4500` y `4500.5`.
  - `toCents(text)`: `'4500.00'` y `'4500'` dan 450000, `'4500.5'` da 450050, `'0'` da 0, `'99999999.99'` da 9999999999 y `'0.29'` da 29 (sin aritmética de coma flotante)
- [X] T020 Implementar (tras T019) `src/features/subscriptions/schemas/price.ts`: `PRICE_INPUT_PATTERN`, `READ_PRICE_PATTERN` y `toCents`, que separa enteros y decimales del texto sin `parseFloat`. Hace pasar T019
- [X] T021 [P] Escribir `src/features/subscriptions/schemas/subscription.test.ts` (debe fallar primero; data-model.md, `Subscription`). `subscriptionSchema` convierte el DTO `{ id, name, description, monthly_price, features, status, clinics_count, created_at, updated_at }` en `{ id, name, description, monthlyPrice, features, status, clinicsCount, createdAt, updatedAt }` con estas reglas:
  - `id`: «entero de 1 a 2 147 483 647»;
  - `name`: «texto no vacío»;
  - `description`: «texto o `null`»;
  - `monthlyPrice`: «`^\d{1,8}\.\d{2}$`: pesos mexicanos con dos decimales» (`'4500'` es un error);
  - `features`: «lista de textos» (puede estar vacía);
  - `status`: `{ id, name }`;
  - `clinicsCount`: «entero ≥ 0 o `null`»; «Un campo **ausente** también es `null`» (un DTO sin `clinics_count` da `clinicsCount: null`, nunca 0);
  - `createdAt` y `updatedAt`: fecha y hora con zona (ISO 8601).

  Además, `subscriptionCatalogSchema` es una lista de `subscriptionSchema` que **descarta** los elementos con `status.id` 4, y se rechazan los valores fuera de estas reglas
- [X] T022 Implementar (tras T020 y T021) `src/features/subscriptions/schemas/subscription.ts`: `subscriptionSchema` (con `.transform` a camelCase), `subscriptionCatalogSchema` y el tipo `Subscription`. Hace pasar T021
- [X] T023 [P] Escribir `src/features/subscriptions/schemas/subscriptionsLocation.test.ts` (debe fallar primero; research D5; contracts/app-routes.md, «Estado del listado en la URL»).
  - `parseSubscriptionsSearchParams(URLSearchParams)` devuelve `{ page, pageSize }`: `page` es «entero ≥ 1 escrito con dígitos», 1 por defecto (`abc`, `0`, `-2` y `2.5` dan 1); `pageSize` es «10, 25 o 50», 10 por defecto (`7` y `100` dan 10).
  - Otros parámetros se ignoran.
  - `toSubscriptionsSearchParams` omite los valores por defecto y es la inversa del anterior para todo valor válido.
  - `PAGE_SIZE_OPTIONS` es `[10, 25, 50]` y `DEFAULT_PAGE_SIZE`, 10.
  - `parseSubscriptionId(value)` acepta «solo dígitos, sin ceros a la izquierda, de 1 a 2 147 483 647»: `'7'` da 7 y `'2147483647'` da 2147483647. `undefined`, `''`, `'abc'`, `'0'`, `'007'`, `'-1'`, `'1.5'`, `'12abc'` y `'2147483648'` dan `null`
- [X] T024 Implementar (tras T023) `src/features/subscriptions/schemas/subscriptionsLocation.ts`: `PAGE_SIZE_OPTIONS`, `DEFAULT_PAGE_SIZE`, el tipo `SubscriptionsLocation`, `parseSubscriptionsSearchParams`, `toSubscriptionsSearchParams` y `parseSubscriptionId`, todo con Zod y sin lanzar. Hace pasar T023
- [X] T025 [P] Escribir `src/features/subscriptions/schemas/subscriptionDetailState.test.ts` (debe fallar primero). `parseSubscriptionDetailState(state: unknown)` nunca lanza y devuelve `{ listSearch? }`. `listSearch` es un «texto opcional; hasta 300 caracteres; empieza por `?` y solo contiene las claves `page` y `page_size`; si no, se descarta»:
  - se conservan `'?page=2&page_size=25'` y `'?page=3'`;
  - se descartan `'page=3'`, `'?email=a%40b.com'`, `'?page=2&x=1'`, `'?next=https://evil.example'` y los textos de más de 300 caracteres;
  - `null`, números, textos y arreglos como estado dan `{}`
- [X] T026 Implementar (tras T025) `src/features/subscriptions/schemas/subscriptionDetailState.ts`: `parseSubscriptionDetailState` y el tipo `SubscriptionDetailLocationState`. Hace pasar T025
- [X] T027 [P] Escribir `src/features/subscriptions/schemas/subscriptionForm.test.ts` (debe fallar primero; data-model.md, «Formulario»).
  - `subscriptionFormSchema`, con los mensajes de `messages.subscriptions.validation`:
    - `name`: «Recortado; obligatorio; hasta 100.» (`'  Pro  '` es válido; `''`, `'   '` y 101 caracteres no);
    - `description`: «Recortado; hasta 500; vacío = sin descripción.»;
    - `monthlyPrice`: «Recortado; obligatorio; `^\d{1,8}(\.\d{1,2})?$` … Comas, «$» y cualquier otro carácter son error» (`'4,500'`, `'$4500'` y `'-1'` dan `priceInvalid`; `''` da `priceRequired`);
    - `features`: «De 0 a 20 (`MAX_FEATURES`); cada `value`, recortado, de 1 a 150: vacío o solo espacios es error junto a ese elemento» (el error del elemento va en `features.<i>.value`; 21 elementos dan `featuresTooMany`).
  - El esquema no tiene transformaciones.
  - `toFormValues(subscription)` da `{ name, description: description ?? '', monthlyPrice, features: [{ value }] }`.
  - `toCreateSubscriptionBody(values)` da `{ name, description?, monthly_price, features }`, recortado, con `description` solo si no está vacía y `monthly_price` como texto; nunca `id`, `status`, `clinics_count` ni fechas.
  - `toUpdateSubscriptionBody(initial, values)` cumple la tabla de data-model.md:
    - `name` cambia si su texto recortado es distinto, también si solo cambian las mayúsculas (`'pro'` frente a `'Pro'`);
    - `description` cambia si el texto recortado es distinto de `initial.description ?? ''`; vacía se envía `null`;
    - `monthly_price` cambia si `toCents` es distinto (`'4500'` frente a `'4500.00'` no es cambio);
    - `features` se envía completa si cambia el número de elementos o algún elemento recortado;
    - sin ningún cambio devuelve `null`
- [X] T028 Implementar (tras T012, T020, T022 y T027) `src/features/subscriptions/schemas/subscriptionForm.ts`: `MAX_FEATURES = 20`, `subscriptionFormSchema`, el tipo `SubscriptionFormValues` (`z.infer`), `toFormValues`, los tipos `CreateSubscriptionBody` y `UpdateSubscriptionBody`, `toCreateSubscriptionBody` y `toUpdateSubscriptionBody`. Hace pasar T027
- [X] T029 [P] Escribir `src/features/subscriptions/policy/catalogOrder.test.ts` (debe fallar primero; FR-015, research D6, data-model.md, «Orden y página del catálogo»).
  - `sortCatalog(items)` ordena por estos criterios, sin mutar la lista recibida:
    1. «grupo: Activa (1) antes que cualquier otro estatus» (Inactiva, Bloqueada y un id 5 van juntas en el segundo);
    2. «precio mensual ascendente, en centavos» (`'900.00'` antes que `'1200.00'`);
    3. «nombre ascendente con `Intl.Collator('es', { sensitivity: 'accent' })`» (`'Clínica Plus'` antes que `'Pro'` con el mismo precio; `'pro'` y `'Pro'` no se distinguen);
    4. «id ascendente (desempate final)».
  - Con el catálogo de quickstart.md (paso 2), produce exactamente el orden que allí se describe.
  - `pageOf(sorted, page, pageSize)` devuelve `{ items, total, pages, page, pageWasClamped }`: `items` tiene «Como mucho `pageSize` elementos»; `pages` es «`ceil(total / pageSize)`; 0 con el catálogo vacío»; `page` es «La pedida o, si es posterior a la última, la última; 1 con el catálogo vacío», y `pageWasClamped` es `true` solo en ese caso
- [X] T030 Implementar (tras T014, T020, T022 y T029) `src/features/subscriptions/policy/catalogOrder.ts`: `sortCatalog` (un `Intl.Collator` creado una vez en el módulo) y `pageOf`, con el tipo `CatalogPage`. Hace pasar T029
- [X] T031 [P] Escribir `src/features/subscriptions/api/subscriptionErrors.test.ts` (debe fallar primero; research D12; data-model.md, `SubscriptionErrorOutcome`). `describeSubscriptionError(error, operation)`, con `operation` ∈ `catalog`, `get`, `create`, `update`, `changeStatus` y `delete`, devuelve `{ kind, message, fields? }` con textos de `messages.subscriptions.errors`:
  - `subscription_name_already_exists` → `field` con `fields.name` igual a `nameInUse`;
  - `validation_error` con `errors` de `name`, `description`, `monthly_price` o `features` → `field`, cuyos `fields` (`name`, `description`, `monthlyPrice` y `features`) llevan los textos de `errors.fields`; si no hay ningún campo conocido (`body`, `status`, `status_id` o uno desconocido) → `form` con `formInvalid`;
  - `subscription_not_found` → `notFound`; `subscription_status_unchanged` → `statusUnchanged`; `subscription_has_clinics` → `hasClinics`; `clinics_check_unavailable` → `clinicsUnavailable`;
  - `authorization_unavailable`, `internal_error`, red, tiempo agotado y otros 5xx → `retryable`;
  - 403 → `forbidden`, con `messages.forbidden.action`;
  - cualquier otro `ApiError`, o un valor que no lo sea → `unexpected`, con `messages.errors.unexpected`.

  **Nunca** devuelve el `message` de la API, ni el de un campo. `toNotification(outcome)` da `info` para nada, `warning` para `notFound`, `statusUnchanged` y `hasClinics`, `error` para el resto y `null` para `forbidden`
- [X] T032 Implementar (tras T012 y T031) `src/features/subscriptions/api/subscriptionErrors.ts`: los tipos `SubscriptionOperation`, `SubscriptionFormField` y `SubscriptionErrorOutcome` (unión discriminada por `kind`), `describeSubscriptionError` y `toNotification`. Los nombres de campo se traducen con un `Map<string, SubscriptionFormField>`, sin `as`. Hace pasar T031

### Caché, avisos, cliente HTTP, rutas y límites

- [X] T033 [P] Escribir `src/features/subscriptions/hooks/subscriptionKeys.test.ts` (debe fallar primero; data-model.md, «Claves»): `subscriptionKeys.all` es `['subscriptions']`, `subscriptionKeys.catalog()` es `['subscriptions', 'catalog']` y `subscriptionKeys.detail(7)` es `['subscriptions', 'detail', 7]`; las claves son de solo lectura
- [X] T034 Implementar (tras T033) `src/features/subscriptions/hooks/subscriptionKeys.ts`. Hace pasar T033
- [X] T035 [P] Escribir `src/features/subscriptions/hooks/refreshSubscription.test.ts` (debe fallar primero; research D8).
  - `isSubscriptionOutOfDate(error, operation)` es `true` para `notFound`, `statusUnchanged` y `hasClinics`, y `false` para el resto.
  - `refreshSubscription(queryClient, id)` invalida `detail(id)` (exacta) y `catalog()`, y termina cuando se volvieron a consultar o tras `REFRESH_WAIT_MS` (de `@/shared/lib/atMost`), aunque una consulta se cuelgue (temporizadores falsos)
- [X] T036 Implementar (tras T007, T032, T034 y T035) `src/features/subscriptions/hooks/refreshSubscription.ts`. Hace pasar T035
- [X] T037 [P] Escribir `src/features/subscriptions/hooks/useNotifySubscriptionError.test.tsx` (debe fallar primero): con `createWrapper`, notifica el `toNotification` del error con su gravedad, no notifica nada con un 403, usa la función `deliver` si se le pasa, y devuelve el `SubscriptionErrorOutcome`
- [X] T038 Implementar (tras T032 y T037) `src/features/subscriptions/hooks/useNotifySubscriptionError.ts`. Hace pasar T037
- [X] T039 [P] Ampliar `src/app/providers/HttpClientsProvider.test.tsx` (debe fallar primero; FR-022, research D13): el contexto ofrece `subscriptions` además de `users`; una solicitud con `subscriptions` va a la base de `VITE_SUBSCRIPTIONS_API_URL` con `Authorization: Bearer <token de la sesión>`, y una con `users` va a la suya; los dos usan la misma función de token y el mismo aviso de sesión vencida
- [X] T040 Implementar (tras T002 y T039).
  - En `src/shared/api/httpClientsContext.tsx`, `HttpClients` gana `readonly subscriptions: HttpClient`.
  - `src/app/providers/HttpClientsProvider.tsx` lo crea con `createHttpClient({ baseUrl: env.VITE_SUBSCRIPTIONS_API_URL, getAccessToken, onSessionExpired })` y añade la variable a las dependencias del `useMemo`.
  - `src/test/renderWithProviders.tsx` crea el cliente `subscriptions` con `SUBSCRIPTIONS_API_BASE_URL`, y se revisa con una búsqueda de `HttpClientsContext.Provider` que ningún otro arnés de pruebas quede sin él. Hace pasar T039
- [X] T041 [P] Escribir `src/app/layouts/useRouteAccessibility.subscriptions.test.tsx` (debe fallar primero; contracts/app-routes.md).
  - Con `createMemoryRouter` y rutas cuyo `handle` declara `titleKey` y `subscriptionIdParam: 'subscriptionId'`, `document.title` vale `Suscripciones — MailySoft Backoffice`, `Nueva suscripción — …`, `Detalle de la suscripción — …` y `Editar suscripción — …`.
  - `/subscriptions/abc` y `/subscriptions/0` se titulan `Página no encontrada — MailySoft Backoffice`.
  - Las rutas de usuarios siguen igual
- [X] T042 Implementar (tras T012, T024 y T041).
  - Exportar `parseSubscriptionId` desde `src/features/subscriptions/index.ts`, de forma estática: es ligero.
  - En `src/app/layouts/useRouteAccessibility.ts`, ampliar `routeHandleSchema` con las claves `subscriptions`, `subscriptionCreate`, `subscriptionDetail` y `subscriptionEdit`, y con el campo opcional `subscriptionIdParam`, cuyo valor se comprueba con `parseSubscriptionId` como `userIdParam` con `parseUserId`. Hace pasar T041
- [X] T043 [P] Ampliar `eslint.config.js` (research D2): el bloque `no-restricted-imports` que hoy cubre `src/features/users/**/*.{ts,tsx}` cubre también `src/features/subscriptions/**/*.{ts,tsx}`, con un mensaje que nombre la feature. Comprobar con `npm run lint` que un `import { can } from '@/features/auth'` temporal en un archivo de `src/features/subscriptions/` falla, y revertirlo

### Infraestructura de pruebas

- [X] T044 [P] Ampliar `src/test/factories.ts` con el tipo `SubscriptionDto` (`z.input<typeof subscriptionSchema>`) y `subscriptionDto(overrides)`, que por defecto es `{ id: 2, name: 'Pro', description: 'Para clínicas en crecimiento.', monthly_price: '4500.00', features: ['Hasta 5 consultorios', 'Usuarios ilimitados'], status: { id: 1, name: 'Activa' }, clinics_count: 0, created_at: '2026-10-17T15:00:00Z', updated_at: '2026-10-17T15:00:00Z' }`. Crear `src/test/subscriptionCapabilities.ts` con `ALL_SUBSCRIPTION_CAPABILITIES`, `NO_SUBSCRIPTION_CAPABILITIES` y `subscriptionCapabilities(overrides)`, como `src/test/capabilities.ts`
- [X] T045 [P] Escribir `src/test/handlers/subscriptionsCatalog/model.test.ts` (debe fallar primero; research D14; contracts/subscriptions-service.md). Reglas sobre `createCatalogModel(initial)`:
  - `list()` devuelve las no eliminadas por fecha de creación y, a igualdad, por id, incluidos los estatus añadidos a mano; `find(id)` no encuentra las eliminadas ni las inexistentes.
  - `create(input)`: recorta el nombre, la descripción y cada elemento; una descripción vacía es `null`; el precio se guarda con dos decimales (`'4500'` da `'4500.00'`); nace con estatus 1 y 0 clínicas. Rechaza con `409 subscription_name_already_exists` un nombre que, recortado y en minúsculas, ya usa una no eliminada (también Inactiva o Bloqueada), y acepta el de una eliminada.
  - `update(id, changes)`: cambia solo los datos recibidos y avanza `updated_at`; una suscripción conserva su propio nombre aunque cambien las mayúsculas; `features` sustituye la lista; `''` o `null` borran la descripción; da `404 subscription_not_found` si no existe.
  - `changeStatus(id, statusId)`: acepta 1, 2 y 3 en cualquier dirección, también con clínicas; el estatus actual da `409 subscription_status_unchanged`, y 4 o desconocido dan `422` en `status_id`.
  - `remove(id)`: con las clínicas no disponibles da `503 clinics_check_unavailable`; con 1 o más clínicas, `409 subscription_has_clinics`; si no, pasa a 4 y libera el nombre.
  - `clinicsCountOf(id)` da el número o `null` cuando las clínicas no están disponibles.
  - Los mensajes en español son los del catálogo de errores de la API
- [X] T046 Implementar (tras T045) `src/test/handlers/subscriptionsCatalog/model.ts`: los tipos `CatalogSubscription`, `CatalogStatus` y `CatalogInitial`, y `createCatalogModel(initial)` con las reglas de T045. Los errores de negocio son un `CatalogError { status, code, message, fieldErrors? }`. Hace pasar T045
- [X] T047 [P] Escribir `src/test/handlers/subscriptionsCatalog/handle.test.ts` (debe fallar primero; contracts/subscriptions-service.md, «Orden de comprobaciones»). Con una operación de prueba registrada mediante `createHandle` y `fetch` contra `SUBSCRIPTIONS_API_BASE_URL`:
  - un cuerpo que no es JSON legible da `422` en `body` antes que la identidad;
  - sin `Authorization` da `401 unauthenticated`, y otro formato, `401 invalid_token`;
  - los fallos inyectados con `failNext` se aplican después de la identidad;
  - sin el permiso en `directory.state.permissionsOf(sub)` da `403 permission_denied`, con «Permiso requerido: <permiso>» en el mensaje, antes de validar el cuerpo o buscar la suscripción;
  - con `authorizationUnavailable()`, todas dan `503 authorization_unavailable`;
  - quitar el permiso al role en el simulador de usuarios (`directory.revoke`) surte efecto en la siguiente petición;
  - cada solicitud queda registrada con método, ruta, búsqueda, cuerpo y cabecera `authorization`
- [X] T048 Implementar (tras T011, T046 y T047) en `src/test/handlers/subscriptionsCatalog/`:
  - `authorize.ts`: el token `Bearer test-token:<sub>` y el permiso, leído del simulador de usuarios.
  - `handle.ts`: el envoltorio `createHandle(model, failures, log, directory)`, que aplica, en este orden, JSON ilegible → identidad → fallo inyectado → permiso → operación, y convierte `CatalogError` en `{ code, message, errors? }`.
  - `validation.ts`: las reglas y mensajes de campo del catálogo de errores (campos no permitidos, `name`, `description`, `monthly_price`, `features`, `status_id`, cuerpo vacío al modificar e id de ruta que no es un entero positivo; un id mayor que 2 147 483 647 es `404`).
  - `seed.ts`: `defaultCatalog()` con Básico ($1500.00, Activa, 2 clínicas), Pro ($4500.00, Activa, 0), Premium ($8900.00, Activa, 1), Enterprise ($0.00, Activa, 0, «Precio a cotizar.»), Solo ($900.00, Inactiva, 0), Legacy full ($0.00, Inactiva, 3) y Suspendido ($2000.00, Bloqueada, 0), con ids 1 a 7; y `makeSubscriptions(count, { firstId })`, con «Plan prueba NN» Activas de $100 × N.
  - `index.ts`: `createSubscriptionsCatalogMock({ directory, initial = defaultCatalog() })`, que registra los manejadores en el servidor compartido y devuelve `state`, `requests`, `requestCount` y `requestsTo(method, path)`; los controles de fallos y `authorizationUnavailable()`; `clinics.unavailable()` y `clinics.recover()`; y las ayudas de datos, que no aplican reglas: `addSubscription`, `addStatus(id, name)`, `setClinics(id, count)`, `setStatus(id, statusId)`, `update(id, changes)` y `remove(id)`, para simular lo que hace «otra persona».

  Hace pasar T047
- [X] T049 Punto de control de la fase: `npm run typecheck`, `npm run lint` y `npm run test` pasan con todo lo anterior, en particular las pruebas de `src/test/handlers/subscriptionsCatalog/` y de `src/features/subscriptions/{schemas,policy,api,hooks}/`

**Checkpoint**: Fundación lista: las historias pueden empezar

---

## Phase 3: User Story 1 - Consultar suscripciones: listado y detalle (Priority: P1) 🎯 MVP

**Goal**: El operador ve las suscripciones en una tabla paginada con orden fijo (Activas primero; cada grupo por precio y, a igualdad, por nombre), con precio, estatus y clínicas, y abre el detalle de cualquiera con todos sus datos. Hay estados de carga, vacío y error, la página viaja en la URL y la sección exige el permiso `subscriptions:read`. La acción «Nueva suscripción» del listado y del estado vacío llega con US2 (T089).

**Independent Test**: Con más de 10 suscripciones de los tres estatus y precios repetidos, abrir «Suscripciones», recorrer las páginas comprobando el orden, abrir un detalle y volver a la misma página (quickstart V1 a V8).

### Tests for User Story 1 ⚠️

> **NOTA: escribir estas pruebas PRIMERO y comprobar que FALLAN antes de implementar**

- [X] T050 [P] [US1] Escribir `src/features/subscriptions/api/subscriptionsApi.read.test.ts` con MSW explícito.
  - `listSubscriptions(client, { signal })` envía `GET /api/v1/subscriptions` con `Authorization: Bearer` y devuelve `Subscription[]` en camelCase: descarta las de estatus 4, y un `clinics_count` ausente o `null` da `clinicsCount: null`.
  - Una respuesta fuera de contrato (por ejemplo, `monthly_price: '4500'`) es un `ApiError` de contrato.
  - `getSubscription(client, 7, { signal })` envía `GET /api/v1/subscriptions/7`. El `404` se propaga como `ApiError` con `code` `subscription_not_found`, y una respuesta con estatus 4 se trata igual (`ApiError.fromResponse(404, { code: 'subscription_not_found', … })`).
  - Las dos cancelan la solicitud con la señal
- [X] T051 [P] [US1] Escribir `src/test/handlers/subscriptionsCatalog/reads.test.ts` (debe fallar primero), contra `createSubscriptionsCatalogMock` con `fetch`.
  - `GET /api/v1/subscriptions` trae las no eliminadas en el orden de la API (fecha de creación e id), con `clinics_count` del modelo o `null` si las clínicas no están disponibles, y `[]` si no hay.
  - `GET /api/v1/subscriptions/{id}` da `404` para una eliminada, una inexistente o un id mayor que 2 147 483 647, y `422` en `subscription_id` si el id no es un entero positivo.
  - Sin `subscriptions:read`, las dos dan `403` antes de validar o buscar
- [X] T052 [P] [US1] Escribir `src/features/subscriptions/hooks/useSubscriptionsLocation.test.tsx` (debe fallar primero; con `createWrapper`).
  - `useSubscriptionsLocation()` devuelve `location` según la URL: `/subscriptions?page=2&page_size=25` da 2 y 25.
  - Una URL con valores inválidos se normaliza con `replace`, sin añadir entradas al historial.
  - `setPage(3)` navega a `?page=3` y `setPage(n, { replace: true })` reemplaza la entrada.
  - `setPageSize(25)` navega a `?page_size=25` y vuelve a la página 1.
  - `search` devuelve la búsqueda canónica para el estado de navegación
- [X] T053 [P] [US1] Escribir `src/features/subscriptions/hooks/useSubscriptionCatalog.test.tsx` con el simulador: devuelve el catálogo **ordenado** (`select: sortCatalog`); una sola solicitud por montaje; un 500 se reintenta como máximo 2 veces (`retryDelay` 0) y termina en error; un 403 se notifica sin cerrar la sesión; cancelar la consulta aborta la solicitud
- [X] T054 [P] [US1] Escribir `src/features/subscriptions/hooks/useSubscription.test.tsx`: `useSubscription(7)` devuelve la suscripción; el `404` queda como error de la consulta, con `ApiError` `subscription_not_found`, y no se reintenta
- [X] T055 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionStatusChip.test.tsx`.
  - Muestra `Activa`, `Inactiva` o `Bloqueada` según el **id**: con `{ id: 2, name: 'Suspendida' }` muestra `Inactiva`.
  - Con un id desconocido (`{ id: 5, name: 'En revisión' }`) muestra el `name` de la API, con contorno (`outlined`).
  - Siempre hay texto; los colores son `success`, `default` y `warning`; no hay violaciones de axe
- [X] T056 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionsGrid.test.tsx`, con el tema real.
  - Columnas: `Nombre`, un enlace a `/subscriptions/:id` con el estado `{ listSearch }`; `Precio mensual`, «$4,500.00/mes»; `Estatus`, con la etiqueta; y `Clínicas`, un número o «No disponible», nunca 0 con `null`.
  - El pie va en español, con el total recibido.
  - «Ir a la página siguiente» llama a `onPaginationChange(2, 10)`, y el selector (`getByLabelText(/filas por página/i)`) ofrece 10, 25 y 50.
  - Pulsar una cabecera no ordena y no hay menú de columnas.
  - Ninguna fila tiene opacidad reducida.
  - Sin filas, muestra `messages.subscriptions.list.empty` y la acción de `emptyAction`; con `loading`, indica carga.
  - No hay violaciones de axe
- [X] T057 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionDetailFields.test.tsx`.
  - Una lista de definiciones con nombre, descripción (`—` si es `null`), precio mensual, estatus, clínicas y lo que incluye, como `ul` en el orden recibido, o «Sin elementos» si está vacía.
  - También la fecha de creación y la de última modificación, con `formatDateTime`.
  - Un nombre largo se ajusta sin desbordar y no hay violaciones de axe
- [X] T058 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionDetailPage.test.tsx` con el simulador, sin capacidades.
  - El `h1` `messages.subscriptions.detail.title` está desde el primer render y hay un indicador mientras carga.
  - Un `404`, o una suscripción con estatus 4, muestra «Suscripción no encontrada» con un enlace a `/subscriptions`; cualquier otro error, el bloque de error con «Reintentar».
  - Si un refresco falla con datos en pantalla, los datos siguen y aparece `RefreshFailedAlert`.
  - «Volver al listado» lleva a `/subscriptions` más el `listSearch` del estado de navegación (sin él, a `/subscriptions`; uno ajeno se ignora).
  - Sin capacidades no hay «Editar», «Cambiar estatus» ni «Eliminar» (US1-14).
  - No hay violaciones de axe
- [X] T059 [P] [US1] Escribir `src/features/subscriptions/components/SubscriptionsListPage.test.tsx` con el simulador (`makeSubscriptions(12)` más el catálogo por defecto) y `createMemoryRouter`.
  - Muestra el `h1` `messages.subscriptions.title` y las 10 primeras en el orden fijo, con el total.
  - Cambiar de página y de tamaño actualiza la URL (el tamaño vuelve a la página 1) **sin nuevas solicitudes** al simulador.
  - `/subscriptions?page=99` muestra la última página y la reemplaza en la URL; una URL inválida se normaliza.
  - La región `role="status"` dice «Mostrando 11 a 19 de 19 suscripciones.» en la página 2.
  - Un fallo muestra el bloque de error, y «Reintentar» lo recupera.
  - El catálogo vacío muestra «No hay suscripciones registradas».
  - No hay violaciones de axe
- [X] T060 [P] [US1] Ampliar `src/app/navigation/sections.test.ts` (debe fallar primero): el registro real `sections` es, en este orden, `users`, `{ id: 'subscriptions', path: '/subscriptions', labelKey: 'subscriptions', resource: 'subscriptions' }` y `token`, y `getVisibleSections` devuelve Suscripciones solo con `subscriptions:read`
- [X] T061 [P] [US1] Escribir `src/app/router/subscriptions/subscriptionsList.integration.test.tsx`: la aplicación completa con `renderApp`, `createUsersDirectoryMock()` y `createSubscriptionsCatalogMock({ directory, initial })` con el catálogo del paso 2 de quickstart.md, y el operador `ADMIN_SUB`.
  - Con `subscriptions:read`, el enlace «Suscripciones» aparece en la navegación.
  - La página 1 y la página 2 tienen el contenido del quickstart (V3).
  - Abrir Solo desde la página 2 y «Volver al listado» regresa a la página 2 (US1-8); elegir 25 por página vuelve a la 1 (US1-2).
  - Con las clínicas no disponibles, todas dicen «No disponible».
  - Un estatus 5 se muestra con su nombre y en el segundo grupo.
  - Con el role sin `subscriptions:read` (`directory.revoke`), no hay enlace y `/subscriptions` lleva a `/` con el aviso (US1-13).
  - Con solo `subscriptions:read` no hay ninguna acción (US1-14, como Billing).
  - `/subscriptions/abc` muestra «Página no encontrada» y `/subscriptions/99999`, «Suscripción no encontrada» (V7).
  - Con `failAll(500)`, aparece el error, y tras `recover()`, «Reintentar» lo recupera (V6)

### Implementation for User Story 1

- [X] T062 [US1] Añadir a `src/shared/messages/es.ts` (tras T012) los textos de esta historia en `subscriptions`.
  - `list`: `gridLabel: 'Suscripciones'`; `columns: { name: 'Nombre', monthlyPrice: 'Precio mensual', status: 'Estatus', clinics: 'Clínicas' }`; `empty: 'No hay suscripciones registradas'`; `pageStatus: (from: number, to: number, total: number) => \`Mostrando ${from} a ${to} de ${total} suscripciones.\``; y `loadError: { title: 'No se pudieron cargar las suscripciones', message: 'Ocurrió un problema al consultar las suscripciones. Puedes reintentar.' }`.
  - `detail`: `title: 'Detalle de la suscripción'`; `backToList: 'Volver al listado'`; `fields: { name: 'Nombre', description: 'Descripción', monthlyPrice: 'Precio mensual', status: 'Estatus', clinics: 'Clínicas', features: 'Lo que incluye', createdAt: 'Fecha de creación', updatedAt: 'Última modificación' }`; `emptyValue: '—'`; `noFeatures: 'Sin elementos'`; `loadError: { title: 'No se pudo cargar la suscripción', message: 'Ocurrió un problema al consultar la suscripción. Puedes reintentar.' }`; `refreshError: 'No se pudo actualizar la información de la suscripción. Se muestra la última que se tenía.'`; y `notFound: { title: 'Suscripción no encontrada', message: 'La suscripción no existe o ya no está disponible.', backToList: 'Volver al listado' }`
- [X] T063 [US1] Implementar `src/features/subscriptions/api/subscriptionsApi.ts` (tras T050 y T022). La constante `SUBSCRIPTIONS_PATH = '/api/v1/subscriptions'`; `listSubscriptions(client, { signal })`, con `subscriptionCatalogSchema`; y `getSubscription(client, id, { signal })`, con `subscriptionSchema`, donde el estatus 4 se convierte en un `404 subscription_not_found`. Hace pasar T050
- [X] T064 [P] [US1] Implementar `src/test/handlers/subscriptionsCatalog/reads.ts` (tras T048 y T051), con los dos `GET` y el permiso `subscriptions:read`, y registrarlo en `createSubscriptionsCatalogMock` (`index.ts`). Hace pasar T051
- [X] T065 [P] [US1] Implementar `src/features/subscriptions/hooks/useSubscriptionsLocation.ts` (tras T052 y T024). Como `useUsersLocation`, sin búsqueda: deriva `location` de la URL, la normaliza con `replace` mediante un efecto y devuelve `{ location, search, setPage, setPageSize }`. Hace pasar T052
- [X] T066 [P] [US1] Implementar `src/features/subscriptions/hooks/useSubscriptionCatalog.ts` (`useQuery` con `subscriptionKeys.catalog()`, `listSubscriptions` con la señal y `select: sortCatalog`) y `src/features/subscriptions/hooks/useSubscription.ts` (`subscriptionKeys.detail(id)`), tras T053, T054, T063, T030 y T034, con el cliente `subscriptions` de `useHttpClients()`. Hacen pasar T053 y T054
- [X] T067 [P] [US1] Implementar `src/features/subscriptions/components/SubscriptionStatusChip.tsx` (tras T055 y T014): un `Chip` de MUI con el texto de `messages.subscriptions.status` según `SUBSCRIPTION_STATUS`, o el `name` de la API si el id es desconocido. El color (`success`, `default`, `warning`; `outlined` para el desconocido) solo refuerza el texto. Hace pasar T055
- [X] T068 [US1] Implementar `src/features/subscriptions/components/SubscriptionsGrid.tsx` (tras T056, T062, T067 y T018).
  - Un `DataGrid` con `paginationMode="server"`, `rowCount`, `paginationModel` (página 1-based hacia fuera y 0-based hacia el grid), `pageSizeOptions` de `PAGE_SIZE_OPTIONS` y `autoHeight`.
  - `disableColumnSorting`, `disableColumnFilter`, `disableColumnMenu` y `disableRowSelectionOnClick`.
  - El nombre es un `Link` de MUI con `RouterLink` y `state={{ listSearch }}`; el precio, `messages.subscriptions.price.perMonth(formatMxn(...))`; y las clínicas, el número o `clinics.notAvailable`.
  - Reutiliza los estilos del pie de `UsersGrid`: «Filas por página» visible bajo 600 px y el pie en dos líneas.
  - `slots.noRowsOverlay` muestra el texto vacío y `emptyAction`.

  Hace pasar T056
- [X] T069 [P] [US1] Implementar `src/features/subscriptions/components/SubscriptionDetailFields.tsx` (tras T057, T062, T067 y T018): una lista de definiciones que pasa a una columna en pantallas estrechas, la descripción con sus saltos de línea y lo que incluye como `ul`. Hace pasar T057
- [X] T070 [US1] Implementar `src/features/subscriptions/components/SubscriptionDetailPage.tsx` (tras T058, T066 y T069).
  - Propiedades: `subscriptionId` y `capabilities`.
  - El `h1` está desde el primer render, y una barra con «Volver al listado» es el primer hijo en todos los estados, con un hueco para las acciones que añaden US3, US4 y US5.
  - El 404 (de `describeSubscriptionError`) muestra el estado «no encontrada»; otros errores, el bloque de error con «Reintentar»; y un refresco fallido con datos, `RefreshFailedAlert` de `@/shared/ui`.
  - El estado de navegación se lee con `parseSubscriptionDetailState`.

  Hace pasar T058
- [X] T071 [US1] Implementar `src/features/subscriptions/components/SubscriptionsListPage.tsx` (tras T059, T065, T066 y T068).
  - Propiedad: `capabilities`.
  - El catálogo ordenado se corta con `pageOf` según la URL. Con `pageWasClamped`, un efecto reemplaza la página con `setPage(page, { replace: true })`, y el grid nunca recibe una página inexistente.
  - `LiveStatus` muestra el texto `pageStatus`; un error sin datos, `ErrorState` con «Reintentar».
  - Hay un hueco `emptyAction` y otro en la barra del título para la acción de crear (T089).

  Hace pasar T059
- [X] T072 [US1] Exportar desde `src/features/subscriptions/index.ts`, como componentes perezosos (`lazy` dentro de la feature, como en `users`), `SubscriptionsListPage` y `SubscriptionDetailPage`; lo estático sigue siendo solo ligero
- [X] T073 [US1] Integrar en la aplicación (tras T016, T042, T060, T061 y T072).
  - Crear `src/app/router/subscriptions/SubscriptionsListRoute.tsx` (`<SubscriptionsListPage capabilities={getSubscriptionCapabilities(useGrantedAccess())} />`) y `src/app/router/subscriptions/SubscriptionDetailRoute.tsx`. Este muestra `NotFoundPage` si `parseSubscriptionId` da `null` y, si no, `SubscriptionDetailPage` con el id y las capacidades.
  - En `src/app/router/routes.tsx`, el grupo `path: '/subscriptions'` con `<RequirePermission resource="subscriptions"><Outlet /></RequirePermission>`, la ruta índice (`titleKey: 'subscriptions'`) y `:subscriptionId` (`titleKey: 'subscriptionDetail'`, `subscriptionIdParam: 'subscriptionId'`), cada una con su `ErrorBoundary`.
  - Registrar la sección en `src/app/navigation/sections.ts`, entre `users` y `token`.

  Hace pasar T060 y T061
- [ ] T074 [US1] Punto de control de la historia: ejecutar las pruebas y validar manualmente V1 a V8 de [quickstart.md](quickstart.md) (V8 sin la parte de «Nueva suscripción», que llega con US2)

**Checkpoint**: La sección se consulta de punta a punta (MVP de lectura)

---

## Phase 4: User Story 2 - Crear una suscripción (Priority: P1)

**Goal**: El operador da de alta una suscripción con nombre, descripción, precio mensual y lo que incluye (de 0 a 20 elementos, sin reordenar), validada en el cliente. Los rechazos de la API se muestran junto a cada campo con textos propios. La suscripción nace Activa y el operador llega a su detalle con una notificación. Exige `subscriptions:write`.

**Independent Test**: Crear una suscripción con tres elementos en lo que incluye, editar uno y quitar otro, y verificar el detalle y el listado; intentar el mismo nombre con otras mayúsculas (quickstart V9 a V12).

### Tests for User Story 2 ⚠️

- [X] T075 [P] [US2] Escribir `src/features/subscriptions/api/subscriptionsApi.create.test.ts`: `createSubscription(client, body)` envía `POST /api/v1/subscriptions` con el cuerpo tal cual (`{ name, description?, monthly_price, features }`, sin id, estatus, clínicas ni fechas) y devuelve la `Subscription` creada (Activa, `clinicsCount: 0`); un `409 subscription_name_already_exists` y un `422 validation_error` se propagan como `ApiError` con sus `fieldErrors`
- [X] T076 [P] [US2] Escribir `src/test/handlers/subscriptionsCatalog/create.test.ts` (debe fallar primero).
  - `POST /api/v1/subscriptions` (`subscriptions:write`) responde `201` con la suscripción Activa, `clinics_count: 0` y `Location`, y aparece en el `GET`.
  - Un nombre repetido sin distinguir mayúsculas ni espacios da `409`; el de una eliminada se acepta.
  - Campos no permitidos (`id`, `status`, `clinics_count`, `created_at`) dan `422` con ese campo; el nombre vacío, el precio negativo o con tres decimales, 21 elementos o un elemento vacío dan `422` con un error por campo.
  - Sin el permiso da `403` antes de validar
- [X] T077 [P] [US2] Escribir `src/features/subscriptions/hooks/useCreateSubscription.test.tsx` con el simulador: al crear, guarda `detail(id)` con lo devuelto e invalida `catalog()`; no se reintenta ante un 500; con `gcTime` por defecto, sin datos sensibles que retener
- [X] T078 [P] [US2] Escribir `src/features/subscriptions/components/FeaturesField.test.tsx`, con un formulario de React Hook Form de prueba.
  - Un `fieldset` con `legend` «Lo que incluye», la ayuda y el contador «N de 20».
  - «Agregar elemento» añade un campo «Elemento N» con el foco.
  - Cada elemento tiene un botón «Quitar el elemento N», y quitarlo pasa el foco al siguiente, al anterior o a «Agregar elemento».
  - No hay controles para reordenar.
  - Con 20 elementos, «Agregar elemento» está deshabilitado y se lee «Se alcanzó el máximo de 20 elementos.»; al quitar uno vuelve a estar disponible.
  - El error de un elemento se asocia a su campo, y el error de la lista entera se muestra sobre ella.
  - No hay violaciones de axe
- [X] T079 [P] [US2] Escribir `src/features/subscriptions/components/SubscriptionFormFields.test.tsx`: campos `Nombre` (obligatorio), `Descripción` (varias líneas, con su ayuda), `Precio mensual` (con «$» delante y «/mes» detrás, `inputMode="decimal"` y su ayuda) y `FeaturesField`; no hay ningún campo de estatus; los errores se asocian con `aria-describedby`; no hay violaciones de axe
- [X] T080 [P] [US2] Escribir `src/features/subscriptions/components/SubscriptionCreatePage.test.tsx`, con el simulador y `createMemoryRouter`.
  - El `h1` es `messages.subscriptions.form.createTitle`.
  - Guardar vacío muestra `nameRequired` y `priceRequired` junto a sus campos, con el foco en el primero y sin solicitud.
  - `'4,500'`, `'$4500'` y `'12.345'` dan `priceInvalid` sin solicitud.
  - Datos válidos crean la suscripción y llevan a `/subscriptions/:id` con `replace` y el estado `{ listSearch }`, con el aviso «Suscripción creada.».
  - Un `409` de nombre muestra `nameInUse` junto al nombre; un `422` con `features` muestra `errors.fields.features` sobre la lista; un `422` sin campo conocido muestra `formInvalid` como error general, con el foco.
  - Un 500 muestra el error general con lo escrito conservado.
  - Pulsar «Guardar» dos veces envía un solo `POST`, y «Cancelar» está deshabilitado mientras se guarda.
  - «Cancelar» lleva al listado (con `listSearch`) sin crear nada.
  - Ningún texto mostrado es el `message` de la API.
  - No hay violaciones de axe
- [X] T081 [P] [US2] Escribir `src/app/router/subscriptions/createSubscription.integration.test.tsx`, con la aplicación completa.
  - Con `subscriptions:write`, «Nueva suscripción» aparece junto al título y en el estado vacío, y lleva a `/subscriptions/new`.
  - El alta completa de US2-2 y US2-3 termina en el detalle y la suscripción aparece en su lugar del listado.
  - « pro » se rechaza junto al nombre (US2-6).
  - Sin `subscriptions:write` no hay botón, y `/subscriptions/new` vuelve a `/subscriptions` con «No tienes permiso para realizar esta acción.» (US2-10).
  - El cuerpo registrado por el simulador no lleva `id`, `status`, `clinics_count` ni fechas (FR-021)

### Implementation for User Story 2

- [X] T082 [US2] Añadir a `src/shared/messages/es.ts` (tras T062) los textos de esta historia en `subscriptions`.
  - `list.createAction: 'Nueva suscripción'`.
  - `form`: `createTitle: 'Nueva suscripción'`; `fields: { name: 'Nombre', description: 'Descripción', monthlyPrice: 'Precio mensual', features: 'Lo que incluye' }`; `descriptionHelper: 'Opcional. Hasta 500 caracteres.'`; `priceHelper: 'Solo números y punto decimal, por ejemplo 4500 o 4500.50.'`; `pricePrefix: '$'`; `priceSuffix: '/mes'`; `featuresHelper: 'Se muestra en este orden. Hasta 20 elementos.'`; `featureLabel: (n: number) => \`Elemento ${n}\``; `removeFeature: (n: number) => \`Quitar el elemento ${n}\``; `addFeature: 'Agregar elemento'`; `featuresCount: (n: number) => \`${n} de 20\``; y `featuresMax: 'Se alcanzó el máximo de 20 elementos.'`.
  - `notices.created: 'Suscripción creada.'`
- [X] T083 [US2] Ampliar `src/features/subscriptions/api/subscriptionsApi.ts` (tras T075 y T028) con `createSubscription(client, body, { signal })`, un `POST` validado con `subscriptionSchema`. Hace pasar T075
- [X] T084 [P] [US2] Implementar `src/test/handlers/subscriptionsCatalog/create.ts` (tras T048 y T076) y registrarlo en `index.ts`. Hace pasar T076
- [X] T085 [P] [US2] Implementar `src/features/subscriptions/hooks/useCreateSubscription.ts` (tras T077, T083 y T034): `useMutation` con `toCreateSubscriptionBody`; en `onSuccess`, `setQueryData(detail(id))` e invalidar `catalog()`, devolviendo la promesa para que la mutación siga pendiente hasta que la pantalla tenga los datos. Hace pasar T077
- [X] T086 [P] [US2] Implementar `src/features/subscriptions/components/FeaturesField.tsx` (tras T078 y T082) con `useFieldArray` (`name: 'features'`): un `TextField` por elemento, registrado con `inputRef`; el botón de quitar con su nombre accesible; el foco tras quitar; agregar se deshabilita al llegar a `MAX_FEATURES`; y el contador y la ayuda visibles. Hace pasar T078
- [X] T087 [US2] Implementar `src/features/subscriptions/components/SubscriptionFormFields.tsx` (tras T079 y T086): los campos del formulario compartido, que reciben `register`, `control` y `errors` de React Hook Form; el precio usa `InputAdornment` para «$» y «/mes»; la descripción es multilínea. Hace pasar T079
- [X] T088 [US2] Implementar `src/features/subscriptions/components/SubscriptionCreatePage.tsx` (tras T080, T085 y T087).
  - React Hook Form con `zodResolver(subscriptionFormSchema)` y los valores iniciales vacíos, dentro de `FormFrame` (de `@/shared/ui`), con `cancelTo` al listado y `listSearch`.
  - `mutateAsync` dentro de `handleSubmit`, con la navegación al detalle en el `onSuccess` de la llamada.
  - Los rechazos se reparten con `describeSubscriptionError(error, 'create')`: los `fields`, con `setError` y el foco en el primero; `form`, `retryable` y `unexpected`, al error general; `forbidden` no se repite.

  Hace pasar T080
- [X] T089 [US2] Integrar (tras T081 y T088).
  - Exportar `SubscriptionCreatePage` perezoso desde `src/features/subscriptions/index.ts`.
  - Crear `src/app/router/subscriptions/SubscriptionCreateRoute.tsx` con `<RequireCapability allowed={canCreate} to="/subscriptions">`, y añadir la ruta `new` (`titleKey: 'subscriptionCreate'`) en `src/app/router/routes.tsx`, **antes** de `:subscriptionId`.
  - En `src/features/subscriptions/components/SubscriptionsListPage.tsx`, con `capabilities.canCreate`, el botón «Nueva suscripción» (`RouterLink` a `/subscriptions/new` con `state={{ listSearch: search }}`) junto al título y como `emptyAction`.

  Hace pasar T081
- [ ] T090 [US2] Punto de control de la historia: ejecutar las pruebas y validar manualmente V9 a V12 de [quickstart.md](quickstart.md)

**Checkpoint**: Primera entrega útil: ver y crear suscripciones (las dos historias P1)

---

## Phase 5: User Story 3 - Modificar una suscripción (Priority: P2)

**Goal**: El operador cambia el nombre, la descripción, el precio o lo que incluye en su propia pantalla. Se envía solo lo que cambió y nada si no cambió nada. Las ediciones de datos distintos de otra persona se conservan, y una suscripción eliminada mientras tanto se informa. Exige `subscriptions:update`.

**Independent Test**: Editar solo el precio y comprobar el detalle, el listado y que el `PATCH` lleva solo `monthly_price`; cancelar; guardar sin cambios (quickstart V13 a V16).

### Tests for User Story 3 ⚠️

- [X] T091 [P] [US3] Escribir `src/features/subscriptions/api/subscriptionsApi.update.test.ts`: `updateSubscription(client, 7, body)` envía `PATCH /api/v1/subscriptions/7` con el cuerpo tal cual (solo los datos que cambiaron) y devuelve la `Subscription`; `404`, `409` y `422` se propagan como `ApiError`
- [X] T092 [P] [US3] Escribir `src/test/handlers/subscriptionsCatalog/update.test.ts` (debe fallar primero).
  - `PATCH /api/v1/subscriptions/{id}` (`subscriptions:update`) cambia solo los datos recibidos y avanza `updated_at`.
  - `{}` da `422` en `body`, y un campo no permitido (`status`, `id`, `clinics_count`), `422` en ese campo.
  - El nombre de otra no eliminada da `409`, mientras que cambiar solo las mayúsculas del propio se acepta.
  - Una eliminada o inexistente da `404`.
  - `update(id, changes)` y `remove(id)` del simulador cambian los datos «por otra persona» sin reglas
- [X] T093 [P] [US3] Escribir `src/features/subscriptions/hooks/useUpdateSubscription.test.tsx` con el simulador: `useUpdateSubscription(7)` con `{ body }` guarda `detail(7)` e invalida `catalog()`; ante un `404` llama a `refreshSubscription` y la mutación sigue pendiente hasta que el detalle se volvió a consultar; no se reintenta
- [X] T094 [P] [US3] Escribir `src/features/subscriptions/components/SubscriptionEditPage.test.tsx` con el simulador.
  - El `h1` es `messages.subscriptions.edit.title`, con un indicador mientras carga.
  - El formulario trae los valores actuales: lo que incluye en su orden, el precio como llega y ningún campo de estatus.
  - Cambiar solo el precio envía `{ monthly_price }` y nada más; cambiar solo las mayúsculas del nombre envía `{ name }`.
  - Vaciar la descripción envía `{ description: null }`; quitar un elemento envía la lista completa.
  - Sin cambios, no hay solicitud y lleva al detalle con `replace` y el aviso «No había cambios que guardar.» (`info`); «Guardar» no está deshabilitado por falta de cambios.
  - Al guardar, lleva al detalle con `replace`, el estado `{ listSearch }` y «Suscripción guardada.».
  - «Cancelar» vuelve al detalle sin solicitud.
  - Un `404` al cargar muestra «Suscripción no encontrada»; al guardar, avisa (`warning`), y la pantalla pasa a ese estado con el enlace al listado.
  - Un `409` de nombre va junto al nombre; un fallo de carga muestra el bloque de error con «Reintentar» y «Volver al listado».
  - Una nueva carga no pisa lo escrito.
  - No hay violaciones de axe
- [X] T095 [P] [US3] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.test.tsx`: con `canEdit`, «Editar» enlaza a `/subscriptions/:id/edit` con el estado `{ listSearch }`; sin él, no está
- [X] T096 [P] [US3] Escribir `src/app/router/subscriptions/editSubscription.integration.test.tsx`, con la aplicación completa.
  - Editar el precio de Solo lo cambia en el detalle y lo mueve en el listado.
  - Si `catalog.update(id, { monthly_price })` cambia el precio «por otra persona» con el formulario abierto y el operador cambia solo la descripción, se conservan ambos cambios (US3-7).
  - Si `catalog.remove(id)` la elimina con el formulario abierto, guardar avisa de que ya no existe y ofrece el listado (US3-8).
  - Si `directory.revoke('Administrator', 'subscriptions:update')` quita el permiso con el formulario abierto, guardar muestra el aviso de permiso, la sesión sigue abierta y no se guarda nada (US3-9).
  - Sin `subscriptions:update`, no hay «Editar» y `/subscriptions/:id/edit` vuelve al detalle con el aviso (US3-10)

### Implementation for User Story 3

- [X] T097 [US3] Añadir a `src/shared/messages/es.ts` (tras T082) en `subscriptions`: `actions.edit: 'Editar'`; `edit: { title: 'Editar suscripción', saved: 'Suscripción guardada.', noChanges: 'No había cambios que guardar.' }`
- [X] T098 [US3] Ampliar `src/features/subscriptions/api/subscriptionsApi.ts` (tras T091) con `updateSubscription(client, id, body, { signal })`, un `PATCH` validado con `subscriptionSchema`. Hace pasar T091
- [X] T099 [P] [US3] Implementar `src/test/handlers/subscriptionsCatalog/update.ts` (tras T048 y T092) y registrarlo en `index.ts`. Hace pasar T092
- [X] T100 [P] [US3] Implementar `src/features/subscriptions/hooks/useUpdateSubscription.ts` (tras T093, T098 y T036): `useUpdateSubscription(id)` con las variables `{ body }`. En `onSuccess`, `setQueryData(detail(id))` e invalidar `catalog()`; en `onError`, si `isSubscriptionOutOfDate`, devuelve `refreshSubscription(...)`. Hace pasar T093
- [X] T101 [US3] Implementar `src/features/subscriptions/components/SubscriptionEditPage.tsx` (tras T094, T097, T100 y T087).
  - Propiedad: `subscriptionId`.
  - El formulario se construye con la suscripción cargada (`key` por id, sin reiniciarse) y `toFormValues`, dentro de `FormFrame`, con `cancelTo` al detalle.
  - Al guardar, `toUpdateSubscriptionBody(initial, values)`: con `null`, navega al detalle con `replace` y avisa de que no había cambios; si no, `mutateAsync` y navega en el `onSuccess` de la llamada.
  - Los rechazos van como en el alta, y además `notFound` avisa con `useNotifySubscriptionError`.
  - Los estados de carga, no encontrada y error son los de contracts/app-routes.md.

  Hace pasar T094
- [X] T102 [US3] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.tsx` (tras T095 y T097): con `capabilities.canEdit`, el botón «Editar» (`RouterLink` a `/subscriptions/:id/edit`, con `listSearch`) en la barra. Hace pasar T095
- [X] T103 [US3] Integrar (tras T096 y T101).
  - Exportar `SubscriptionEditPage` perezoso desde `src/features/subscriptions/index.ts`.
  - Crear `src/app/router/subscriptions/SubscriptionEditRoute.tsx`: muestra `NotFoundPage` con un id inválido y, si no, `<RequireCapability allowed={canEdit} to={\`/subscriptions/${id}\`}>`.
  - Añadir la ruta `:subscriptionId/edit` (`titleKey: 'subscriptionEdit'`, `subscriptionIdParam: 'subscriptionId'`) en `src/app/router/routes.tsx`.

  Hace pasar T096
- [ ] T104 [US3] Punto de control de la historia: ejecutar las pruebas y validar manualmente V13 a V16 de [quickstart.md](quickstart.md)

**Checkpoint**: Ver, crear y modificar funcionan de forma independiente

---

## Phase 6: User Story 4 - Cambiar el estatus de una suscripción (Priority: P2)

**Goal**: Desde el detalle, el operador cambia el estatus a cualquiera distinto del actual. Inactivar y bloquear piden una confirmación que nombra la suscripción y el nuevo estatus; activar se aplica directamente. Los rechazos (ya tenía ese estatus, ya no existe) se muestran y la pantalla se actualiza. Exige `subscriptions:update`.

**Independent Test**: Inactivar, bloquear y volver a activar una suscripción, comprobando el detalle y el grupo en el listado; pedir un estatus que otra persona ya aplicó; operador sin el permiso (quickstart V17 a V20).

### Tests for User Story 4 ⚠️

- [X] T105 [P] [US4] Escribir `src/features/subscriptions/api/subscriptionsApi.status.test.ts`: `changeSubscriptionStatus(client, 7, 2)` envía `PATCH /api/v1/subscriptions/7/status` con `{ status_id: 2 }` y nada más, y devuelve la `Subscription` con el nuevo estatus; `409 subscription_status_unchanged` y `404` se propagan como `ApiError`
- [X] T106 [P] [US4] Escribir `src/test/handlers/subscriptionsCatalog/status.test.ts` (debe fallar primero): `PATCH .../status` (`subscriptions:update`) acepta 1, 2 y 3 en cualquier dirección, también con clínicas y desde un estatus 5; el actual da `409`, y 4, 0, `'2'` o un campo extra dan `422`; una eliminada da `404`; sin el permiso da `403`
- [X] T107 [P] [US4] Escribir `src/features/subscriptions/hooks/useChangeSubscriptionStatus.test.tsx` con el simulador: `useChangeSubscriptionStatus(7)` con `{ statusId }` guarda `detail(7)` con lo devuelto e invalida `catalog()`; ante `409 subscription_status_unchanged` o `404`, devuelve `refreshSubscription` y la mutación sigue pendiente hasta el refresco; no se reintenta
- [X] T108 [P] [US4] Escribir `src/features/subscriptions/components/SubscriptionStatusMenu.test.tsx` con el simulador.
  - El botón «Cambiar estatus» (`aria-haspopup="menu"`) abre un menú con los verbos de `getStatusTargets`: una Activa ofrece «Inactivar» y «Bloquear»; una Bloqueada, «Activar» e «Inactivar»; una de estatus 5, los tres.
  - «Inactivar» abre un diálogo que nombra la suscripción y «Inactiva», con el foco en «Cancelar»; al confirmar, envía `{ status_id: 2 }` y avisa «Suscripción inactivada.» **después** de que el diálogo se cerró.
  - «Bloquear» usa la variante `danger`; cancelar no envía nada.
  - «Activar» envía `{ status_id: 1 }` sin diálogo, con el botón pendiente, y avisa «Suscripción activada.».
  - Pulsar dos veces la confirmación envía un solo `PATCH` y no aparece el rechazo de estatus sin cambio.
  - Un `409` avisa con `statusUnchanged` y el detalle muestra el estatus vigente.
  - El menú se opera con teclado (flechas, `Enter` y `Esc`) y el foco vuelve al botón.
  - No hay violaciones de axe con el menú y con el diálogo abiertos
- [X] T109 [P] [US4] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.test.tsx`: con `canChangeStatus`, está «Cambiar estatus»; sin él, no
- [X] T110 [P] [US4] Escribir `src/app/router/subscriptions/changeStatus.integration.test.tsx`, con la aplicación completa.
  - Pro pasa a Inactiva (con confirmación), a Bloqueada y de nuevo a Activa, sin confirmación, y en el listado cambia de grupo.
  - Básico, con 2 clínicas, se inactiva sin problema (US4-6).
  - Si `catalog.setStatus(id, 2)` deja Premium Inactiva «por otra persona», pedir Inactivar avisa y actualiza (US4-7); si `catalog.remove(id)` la elimina, avisa de que ya no existe (US4-8).
  - Sin `subscriptions:update` no hay «Cambiar estatus» (US4-10)

### Implementation for User Story 4

- [X] T111 [US4] Añadir a `src/shared/messages/es.ts` (tras T097) en `subscriptions`.
  - `actions.changeStatus: 'Cambiar estatus'` y `statusTargets: { activate: 'Activar', inactivate: 'Inactivar', block: 'Bloquear' }`.
  - `dialogs.inactivate: { title: 'Inactivar suscripción', body: (name: string) => \`La suscripción ${name} pasará a Inactiva. Las clínicas que ya la tienen la conservan.\`, confirm: 'Inactivar' }` y `dialogs.block: { title: 'Bloquear suscripción', body: (name: string) => \`La suscripción ${name} pasará a Bloqueada. Las clínicas que ya la tienen la conservan.\`, confirm: 'Bloquear' }`.
  - `statusNotices: { activated: 'Suscripción activada.', inactivated: 'Suscripción inactivada.', blocked: 'Suscripción bloqueada.' }`
- [X] T112 [US4] Ampliar `src/features/subscriptions/api/subscriptionsApi.ts` (tras T105) con `changeSubscriptionStatus(client, id, statusId, { signal })`, un `PATCH` a `/status` con `{ status_id }`. Hace pasar T105
- [X] T113 [P] [US4] Implementar `src/test/handlers/subscriptionsCatalog/status.ts` (tras T048 y T106) y registrarlo en `index.ts`. Hace pasar T106
- [X] T114 [P] [US4] Implementar `src/features/subscriptions/hooks/useChangeSubscriptionStatus.ts` (tras T107, T112 y T036). Hace pasar T107
- [X] T115 [US4] Implementar `src/features/subscriptions/components/SubscriptionStatusMenu.tsx` (tras T108, T111 y T114).
  - Un `Button` con `Menu` de MUI cuyos elementos salen de `getStatusTargets`.
  - Con `needsStatusConfirmation`, `ConfirmDialog` (`tone="danger"` para bloquear); si no, `mutate` directo.
  - Los avisos se guardan con `useDeferredNotice` y se muestran en `onExited`; una confirmación que se está cerrando no hace nada; los errores pasan por `useNotifySubscriptionError(defer)`.
  - El estado del diálogo vive en el componente y el foco se gestiona con `focusIfLost`.

  Hace pasar T108
- [X] T116 [US4] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.tsx` (tras T109 y T115): con `capabilities.canChangeStatus`, `SubscriptionStatusMenu` en la barra de acciones. Hace pasar T109 y T110
- [ ] T117 [US4] Punto de control de la historia: ejecutar las pruebas y validar manualmente V17 a V20 de [quickstart.md](quickstart.md)

**Checkpoint**: Ver, crear, modificar y cambiar el estatus funcionan

---

## Phase 7: User Story 5 - Eliminar una suscripción (Priority: P3)

**Goal**: Desde el detalle, el operador elimina una suscripción sin clínicas tras una confirmación que nombra la suscripción y advierte que no se puede deshacer. Con clínicas, la acción aparece deshabilitada con el motivo. Los rechazos de la API (tiene clínicas, no se pudo comprobar, ya no existe) se muestran sin cambiar nada. Exige `subscriptions:delete`.

**Independent Test**: Eliminar una suscripción sin clínicas y comprobar que deja de aparecer y que su nombre queda libre; cancelar; abrir una con clínicas y ver la acción deshabilitada con el motivo (quickstart V21 a V23).

### Tests for User Story 5 ⚠️

- [X] T118 [P] [US5] Escribir `src/features/subscriptions/api/subscriptionsApi.delete.test.ts`: `deleteSubscription(client, 7)` envía `DELETE /api/v1/subscriptions/7` y resuelve con `undefined` ante un `204` (esquema `z.undefined()`); `409 subscription_has_clinics`, `503 clinics_check_unavailable` y `404` se propagan como `ApiError`
- [X] T119 [P] [US5] Escribir `src/test/handlers/subscriptionsCatalog/remove.test.ts` (debe fallar primero).
  - `DELETE /api/v1/subscriptions/{id}` (`subscriptions:delete`) da `204` y la suscripción deja de aparecer en el `GET`, mientras que su `GET` por id da `404`.
  - Su nombre puede usarse en un alta nueva.
  - Con clínicas da `409`, y con `clinics.unavailable()`, `503`, sin cambiar nada; una eliminada o inexistente da `404`.
  - Sin el permiso da `403` antes de buscar
- [X] T120 [P] [US5] Escribir `src/features/subscriptions/hooks/useDeleteSubscription.test.tsx` con el simulador: `useDeleteSubscription(7)` espera (como mucho `REFRESH_WAIT_MS`) a que `catalog()` se vuelva a consultar antes de resolver y expone `forget()` para quitar `detail(7)` tras salir; ante `409 subscription_has_clinics` o `404`, devuelve `refreshSubscription`; ante `503 clinics_check_unavailable`, no cambia la caché; no se reintenta
- [X] T121 [P] [US5] Escribir `src/features/subscriptions/components/DeleteSubscriptionAction.test.tsx` con el simulador.
  - Con 3 clínicas, el botón «Eliminar» está deshabilitado y se lee «Tiene 3 clínicas asignadas», asociado con `aria-describedby`; con 1, «Tiene 1 clínica asignada».
  - Con `null` o 0 está habilitado y abre un diálogo (variante `danger`, foco en «Cancelar») que nombra la suscripción y dice que no se puede deshacer; cancelar no envía nada.
  - Al confirmar, navega a `/subscriptions` más el `listSearch` y avisa «Suscripción eliminada.».
  - Un `409` avisa con `hasClinics` y el detalle muestra el número y el botón deshabilitado.
  - Un `503 clinics_check_unavailable` avisa con `clinicsUnavailable` y la acción sigue disponible.
  - Un `404` avisa con `notFound`.
  - Pulsar dos veces la confirmación envía un solo `DELETE` y no aparece el aviso de que ya no existe.
  - No hay violaciones de axe
- [X] T122 [P] [US5] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.test.tsx`: con `canDelete`, está «Eliminar», habilitado o deshabilitado según las clínicas; sin él, no hay botón ni motivo
- [X] T123 [P] [US5] Escribir `src/app/router/subscriptions/deleteSubscription.integration.test.tsx`, con la aplicación completa.
  - Eliminar una sin clínicas, desde la página 2, vuelve a la página 2 del listado, sin la suscripción y con el total menor.
  - Básico (2) y Premium (1) muestran el motivo (US5-4).
  - Con `clinics.unavailable()`, Enterprise muestra «No disponible», ofrece «Eliminar» y el rechazo dice que no se pudo comprobar (US5-5, US5-7).
  - Si `catalog.setClinics(id, 1)` le asigna clínicas «por otra persona» con el detalle abierto, la eliminación se rechaza y el detalle se actualiza (US5-6).
  - Si `catalog.remove(id)` la elimina «por otra persona», confirmar avisa de que ya no existe (US5-8).
  - Un alta nueva puede usar el nombre de una eliminada (US5-10).
  - Sin `subscriptions:delete` no hay «Eliminar» (US5-11)

### Implementation for User Story 5

- [X] T124 [US5] Añadir a `src/shared/messages/es.ts` (tras T111) en `subscriptions`.
  - `actions.delete: 'Eliminar'` y `dialogs.delete: { title: 'Eliminar suscripción', body: (name: string) => \`La suscripción ${name} dejará de aparecer y su nombre quedará libre. Esta acción no se puede deshacer.\`, confirm: 'Eliminar' }`.
  - `deleteBlocked: (clinics: number) => (clinics === 1 ? 'Tiene 1 clínica asignada' : \`Tiene ${clinics} clínicas asignadas\`)`.
  - `notices.deleted: 'Suscripción eliminada.'`
- [X] T125 [US5] Ampliar `src/features/subscriptions/api/subscriptionsApi.ts` (tras T118) con `deleteSubscription(client, id, { signal })`, un `DELETE` con `z.undefined()`. Hace pasar T118
- [X] T126 [P] [US5] Implementar `src/test/handlers/subscriptionsCatalog/remove.ts` (tras T048 y T119) y registrarlo en `index.ts`. Hace pasar T119
- [X] T127 [P] [US5] Implementar `src/features/subscriptions/hooks/useDeleteSubscription.ts` (tras T120, T125, T036 y T007). Hace pasar T120
- [X] T128 [US5] Implementar `src/features/subscriptions/components/DeleteSubscriptionAction.tsx` (tras T121, T124 y T127).
  - El botón (`color="error"`) y el motivo visible, según `getDeleteAvailability`.
  - `ConfirmDialog` con `tone="danger"`; al confirmar, `mutate`. En el `onSuccess` de la llamada, navega al listado con el `listSearch` del estado de navegación, avisa y, tras navegar, olvida el detalle (`forget()`).
  - Los errores pasan por `useNotifySubscriptionError`, con los avisos diferidos hasta que el diálogo se cerró.

  Hace pasar T121
- [X] T129 [US5] Ampliar `src/features/subscriptions/components/SubscriptionDetailPage.tsx` (tras T122 y T128): con `capabilities.canDelete`, `DeleteSubscriptionAction` en la barra de acciones. Hace pasar T122 y T123
- [ ] T130 [US5] Punto de control de la historia: ejecutar las pruebas y validar manualmente V21 a V23 de [quickstart.md](quickstart.md), con la simulación de clínicas

**Checkpoint**: Las cinco historias funcionan; queda el trabajo transversal

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Pruebas transversales, E2E, documentación y puertas de calidad finales

- [X] T131 [P] Escribir `src/app/router/subscriptions/confirmations.integration.test.tsx` (SC-003, FR-009, FR-017), con la aplicación completa: inactivar, bloquear y eliminar abren su confirmación, que nombra la suscripción, antes de cualquier solicitud (ningún `PATCH .../status` ni `DELETE` llega al simulador hasta confirmar), y cancelar no deja ninguna; activar es la única que no pide confirmación
- [X] T132 [P] Escribir `src/app/router/subscriptions/capabilities.integration.test.tsx` (FR-013, SC-010), con la aplicación completa, dando y quitando permisos al role Developer con `directory.grant` y `directory.revoke`.
  - Solo `subscriptions:read`: listado y detalle sin ninguna acción.
  - `+ subscriptions:write`: «Nueva suscripción».
  - `+ subscriptions:update`: «Editar» y «Cambiar estatus».
  - `+ subscriptions:delete`: «Eliminar».
  - Retirar un permiso con la pantalla abierta oculta la acción en la siguiente comprobación (al volver a la pestaña, 001)
- [X] T133 [P] Escribir `src/app/router/subscriptions/credential.integration.test.tsx` (FR-022, SC-011), con la aplicación completa, tras recorrer el listado, un detalle, un alta, una edición, un cambio de estatus y una eliminación.
  - Cada solicitud que recibió el simulador de suscripciones lleva `Authorization: Bearer test-token:<sub>` y su URL empieza por `SUBSCRIPTIONS_API_BASE_URL`.
  - `localStorage`, `sessionStorage` y la URL no contienen el token
- [X] T134 [P] Crear `e2e/subscriptions.spec.ts`, que se omite sin `E2E_*` (constitución VII).
  - Con A1 y el catálogo del paso 2 de quickstart.md: V1 a V5 (listado, tamaños, orden, precio y «No disponible», detalle y regreso a la página 2) y V7.
  - Solo con `E2E_ALLOW_SUBSCRIPTION_WRITES=true` y la simulación de clínicas en marcha: crear «QA 003 <marca de tiempo>» con dos elementos, editar su precio, inactivarla, activarla y eliminarla
- [X] T135 [P] Ampliar `e2e/responsive.spec.ts` (FR-022 de la 001, quickstart V25): con A1, a 1024×768 y a 320×640, el listado, un detalle, `/subscriptions/new` y `/subscriptions/:id/edit` no desbordan (`document.documentElement.scrollWidth` ≤ `clientWidth`; la tabla se desplaza dentro de su recuadro), y el menú de estatus y los diálogos caben
- [X] T136 [P] Actualizar `README.md`, en español: la sección Suscripciones en la descripción y en el estado, la estructura de carpetas, la API de suscripciones como requisito de desarrollo (puerto 8010, CORS y proxy) y las variables `E2E_*` nuevas de T134. La línea base de tamaño la actualiza T137
- [X] T137 Ejecutar todas las puertas de calidad y corregir lo que falle: `npm run typecheck`, `npm run lint` (sin advertencias), `npm run format:check`, `npm run test:coverage` (mínimo 80 % de líneas en las capas incluidas en `vite.config.ts`), `npm run build` y `npm run size` (JS de la ruta de entrada ≤ 300 KB gzip y sin los marcadores del Data Grid).
  - Comprobar la guarda por mutación: importar temporalmente `SubscriptionsListPage` de forma estática en `src/app/router/routes.tsx`, desde su archivo de componente; confirmar que `npm run build && npm run size` falla nombrando el archivo y el marcador; y revertir.
  - Registrar en las notas de `plan.md` la línea base de la ruta de entrada y el tamaño de los fragmentos perezosos nuevos, y actualizar la línea base en `README.md`
- [X] T138 [P] Comprobaciones de seguridad (constitución V). Confirmar con búsquedas en `src/`:
  - que no hay `console.` fuera de `src/shared/lib/logger.ts`, ni `localStorage`, `dangerouslySetInnerHTML`, `any` explícito o aserciones `as` (salvo `as const`);
  - que `src/features/subscriptions` no importa `@/features/auth`;
  - que ningún texto de la API llega a la pantalla: no se usa `error.message` ni `fieldErrors[].message` en componentes ni en `describeSubscriptionError`.

  Ejecutar `npm audit --omit=dev --audit-level=high`
- [X] T139 [P] Añadir a `specs/003-manage-subscription-types/plan.md` una sección «Notas de implementación»: las decisiones tomadas al implementar que afinen lo planeado sin cambiar los requisitos, los tamaños medidos en T137 y lo aprendido con el simulador, el Data Grid paginado fuera del grid y el campo de lo que incluye
- [ ] T140 Ejecutar la guía de validación completa de [quickstart.md](quickstart.md): V1 a V27, con las cuentas A1, A3 y A4, el catálogo de prueba, los permisos del paso 1 y la simulación de clínicas. Corregir las discrepancias con la spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T001 → T002; T003 y T004 son independientes; T005 verifica
- **Foundational (Phase 2)**: depende de Setup y BLOQUEA todas las historias. Los movimientos (T006 a T009) y su punto de control (T010) van primero; T011 prepara el simulador; en el resto, cada prueba precede a su implementación, y el núcleo del simulador (T045 a T048) cierra la fase
- **User Stories (Phase 3 a 7)**: dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran entregar

### User Story Dependencies

- **US1 (P1)**: tras Foundational; sin dependencias de otras historias
- **US2 (P1)**: depende de US1 (el listado recibe la acción de crear y el alta termina en el detalle; el grupo de rutas `/subscriptions`)
- **US3 (P2)**: depende de US1 (detalle) y de los campos del formulario de US2 (`SubscriptionFormFields` y `FeaturesField`: T086 y T087)
- **US4 (P2)**: depende de US1 (detalle); no depende de US2 ni de US3
- **US5 (P3)**: depende de US1 (detalle); no depende de US4, aunque comparte con ella la barra de acciones del detalle (coordinar `SubscriptionDetailPage.tsx`)

### Within Each User Story

- Las pruebas se escriben primero y deben fallar antes de implementar
- Simulador y API antes de los hooks; hooks antes de los componentes; componentes antes de las rutas y los adaptadores
- Cada historia termina con su punto de control antes de pasar a la siguiente

### Archivos compartidos (evitar tareas en paralelo sobre ellos)

| Archivo | Tareas que lo modifican (en este orden) |
|---|---|
| `src/shared/messages/es.ts` | T009, T012, T062, T082, T097, T111, T124 |
| `src/features/subscriptions/index.ts` | T014, T042, T072, T089, T103 |
| `src/features/subscriptions/api/subscriptionsApi.ts` | T063, T083, T098, T112, T125 |
| `src/test/handlers/subscriptionsCatalog/index.ts` | T048, T064, T084, T099, T113, T126 |
| `src/app/router/routes.tsx` | T073, T089, T103 |
| `src/features/subscriptions/components/SubscriptionDetailPage.tsx` | T070, T102, T116, T129 |
| `src/features/subscriptions/components/SubscriptionDetailPage.test.tsx` | T058, T095, T109, T122 |
| `src/features/subscriptions/components/SubscriptionsListPage.tsx` | T071, T089 |
| `src/features/auth/index.ts` | T016 |
| `src/app/navigation/sections.ts` | T073 |
| `src/test/factories.ts` | T044 |
| `src/test/handlers/usersDirectory/behaviors.ts`, `index.ts` | T011 |
| `vite.config.ts`, `.env.example` | T003 |
| `README.md` | T004, T136, T137 |

### Parallel Opportunities

- Setup: T003 y T004 en paralelo con T001 y T002
- Foundational: T007 y T008 en paralelo (T006 y T009 tocan rutas y pantallas de usuarios); las pruebas de unidades distintas (T013, T015, T017, T019, T021, T023, T025, T027, T029, T031, T033, T035, T037, T039, T041, T045 y T047) son paralelas entre sí, y sus implementaciones lo son cuando no comparten archivos (los esquemas T020, T022, T024 y T026 entre sí, por ejemplo)
- Cada historia: todas sus pruebas marcadas [P] pueden escribirse a la vez; el simulador, los hooks y los componentes de archivos distintos se implementan en paralelo
- Tras US1, US2, US4 y US5 pueden avanzar en paralelo con personas distintas si coordinan `SubscriptionDetailPage.tsx`, `es.ts`, `subscriptionsApi.ts` y el `index.ts` del simulador; US3 espera a los campos del formulario de US2

---

## Parallel Example: User Story 1

```bash
# Escribir juntas las pruebas de la historia 1 (archivos distintos):
Task: "T050 subscriptionsApi.read.test.ts en src/features/subscriptions/api/"
Task: "T051 reads.test.ts en src/test/handlers/subscriptionsCatalog/"
Task: "T052 useSubscriptionsLocation.test.tsx en src/features/subscriptions/hooks/"
Task: "T053 useSubscriptionCatalog.test.tsx en src/features/subscriptions/hooks/"
Task: "T055 SubscriptionStatusChip.test.tsx en src/features/subscriptions/components/"
Task: "T056 SubscriptionsGrid.test.tsx en src/features/subscriptions/components/"
Task: "T057 SubscriptionDetailFields.test.tsx en src/features/subscriptions/components/"
Task: "T061 subscriptionsList.integration.test.tsx en src/app/router/subscriptions/"

# Después, implementar en paralelo lo que no comparte archivos:
Task: "T064 reads.ts del simulador"
Task: "T065 useSubscriptionsLocation.ts"
Task: "T066 useSubscriptionCatalog.ts y useSubscription.ts"
Task: "T067 SubscriptionStatusChip.tsx"
Task: "T069 SubscriptionDetailFields.tsx"
```

---

## Implementation Strategy

### MVP First (historia 1; primera entrega recomendada: historias 1 y 2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (BLOQUEA todo)
3. Completar Phase 3: US1 (consulta: listado ordenado y paginado, y detalle)
4. **PARAR y VALIDAR**: quickstart V1 a V8
5. Completar Phase 4: US2 (alta). Con US1 forma la primera entrega útil, porque las dos son P1
6. **PARAR y VALIDAR**: quickstart V9 a V12

### Incremental Delivery

1. Setup + Foundational → base lista (incluye las piezas movidas de la 002, sin cambiar su comportamiento)
2. US1 → US2 → primera entrega (ver y crear)
3. US3 → modificar; luego US4 → cambiar el estatus; luego US5 → eliminar
4. Polish → pruebas transversales, E2E, README y puertas de calidad finales
5. Cada historia añade valor sin romper las anteriores; PRs pequeños y enfocados (constitución): como mínimo, uno por fase y por historia, y el de los movimientos de Foundational (T006 a T011) puede ir aparte

### Parallel Team Strategy

1. El equipo completa Setup y Foundational junto
2. Con Foundational lista: una persona hace US1 y US2; otra prepara US4 y US5 sobre el detalle de US1; US3 espera a los campos del formulario de US2 (coordinar los archivos compartidos)

---

## Notes

- [P] = archivos distintos y sin dependencias entre sí
- La etiqueta [Story] vincula la tarea con su historia para trazabilidad
- Verificar que las pruebas fallan antes de implementar
- El simulador de pruebas (`src/test/handlers/subscriptionsCatalog/`) se verifica con sus propias pruebas contra [contracts/subscriptions-service.md](contracts/subscriptions-service.md); si el contrato cambia, cambian primero esas pruebas. Antes de implementar, contrastar con el `/openapi.json` vigente de la API
- Hacer commit tras cada tarea o grupo lógico (Conventional Commits en inglés)
- Evitar: tareas vagas, conflictos en un mismo archivo y dependencias entre historias que rompan su independencia
