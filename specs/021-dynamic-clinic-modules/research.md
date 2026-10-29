# Investigación: Catálogo dinámico de módulos de clínica en alta y edición de suscripciones

**Feature**: `021-dynamic-clinic-modules` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md)

## D1. El endpoint ya está documentado; no hace falta un contrato nuevo

**Decisión**: esta feature consume `GET /api/v1/modules?type_id=2&status_id=1` contra el cliente HTTP
`users` (MailySoft Usuarios), el mismo endpoint ya documentado en
[../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md)
(fila «Catálogo de módulos»: «Ordenado por `sort_order`, luego `name`»). No se crea `contracts/` en
este feature: es un segundo consumidor de un contrato ya existente, no un contrato nuevo.

**Alternativas consideradas**: documentar un contrato propio en `contracts/modules-service.md` —
descartado por duplicar exactamente lo que ya documenta la 014, con el mismo endpoint y las mismas
reglas (orden del servidor, filtros `type_id`/`status_id`).

## D2. Capa `api`/`schemas`/`hooks` propia de `features/subscriptions`, no importada de `roles`/`modules`

**Decisión**: se crean archivos propios y pequeños dentro de `features/subscriptions`, replicando el
patrón ya usado por `features/roles` para este mismo endpoint (`api/modulesApi.ts`,
`schemas/module.ts`, `hooks/useModulesCatalog.ts`) en vez de importarlos: la constitución I prohíbe
que una feature importe los internos de otra (solo su `index.ts`), y `features/roles` ya resolvió
este mismo endpoint con su propia copia en vez de importar `features/modules` — mismo precedente,
misma solución.

**Esquema propio, no el de `roles` ni el de `modules`**: el esquema de `roles` (`schemas/module.ts`)
es deliberadamente liviano y no trae `description` (su pantalla no la necesita); el esquema completo
de `modules` (`schemas/systemModule.ts`) trae `description`, pero también `id`, `created_at`,
`status`, `type` y `active_permissions_count`, que esta feature no usa en ningún lado. El esquema
nuevo (`schemas/clinicModule.ts`) es el subconjunto exacto que FR-001 a FR-004 necesitan: `key`,
`name`, `description`, `sortOrder` — ni más (YAGNI) ni menos (FR-004 exige `description`, que la
versión de `roles` no trae).

**Alternativas consideradas**: reutilizar el esquema de `roles` y pedir `description` por separado —
descartado, la API ya la trae en la misma respuesta; no hay segunda llamada que evitar duplicando el
esquema.

## D3. El catálogo estático (`clinicModuleCatalog.ts`) NO se borra: sigue vivo para lo que queda fuera de alcance

**Hallazgo de esta investigación** (no estaba en el research original de ninguna feature anterior):
`CLINIC_MODULE_ORDER`, `MODULE_PREREQUISITE` y los nueve textos de
`messages.subscriptions.modules.catalog` siguen siendo la fuente de verdad de tres cosas que esta
feature, por las Assumptions del spec, deja explícitamente sin tocar:

1. `SubscriptionsComparisonTable.tsx` (el Comparativo, feature 020): itera `CLINIC_MODULE_ORDER` para
   sus filas de Módulos.
2. `SubscriptionDetailFields.tsx` (el detalle de una suscripción): itera `CLINIC_MODULE_ORDER` para
   «Módulos incluidos»/«no incluidos».
3. `src/test/handlers/subscriptionsCatalog/model.ts` (el simulador MSW de la propia API de
   Suscripciones): valida `module_keys` en `createSubscription`/`updateSubscription` contra
   `CLINIC_MODULE_ORDER` y `MODULE_PREREQUISITE`, simulando una regla de negocio del backend real que
   es independiente de esta feature (research D13 original de `003-manage-subscription-types`: «la
   API ya valida `module_keys`»).

**Decisión**: `schemas/clinicModuleCatalog.ts` no se modifica ni se borra. Solo deja de ser la fuente
que alimenta el formulario de alta/edición (`ModulesField`, `SubscriptionPreviewPanel`): esos dos
pasan a recibir el catálogo vigente como prop, en vez de iterar `CLINIC_MODULE_ORDER` ellos mismos.
`REQUIRED_MODULE_KEY` (`'patients'`) se sigue importando desde ese mismo archivo —no se duplica en el
esquema nuevo— porque sigue siendo la única fuente de esa constante, compartida ahora entre el
catálogo fijo (Comparativo, detalle, simulador) y la nueva lógica dinámica del formulario.

**Qué sí se borra**: `policy/moduleSelection.ts` (`withModuleChecked`, la cascada de dependencias) y
su prueba. Su único consumidor era `ModulesField.tsx`; la Clarification de esta feature retira esa
regla del formulario, y ningún otro archivo del repositorio lo importa (verificado por búsqueda:
cero referencias fuera de `ModulesField.tsx` y su propia prueba).

## D4. `resolveModuleSelection`: una única función para «qué se ve marcado» y «qué se guarda»

**Decisión**: una función pura nueva, `resolveModuleSelection(selected, catalog)` en
`policy/clinicModuleSelection.ts` (reemplaza a `policy/moduleSelection.ts`), con dos efectos sobre el
conjunto de keys seleccionadas:

1. Quita cualquier key que no esté en el catálogo vigente recibido (FR-005, FR-009): una suscripción
   que ya tenía marcado un módulo hoy inactivo o inexistente no lo ofrece como opción, y si se guarda
   así, ese módulo se pierde de la suscripción.
2. Agrega `REQUIRED_MODULE_KEY` si el catálogo vigente lo trae, sin importar si ya estaba marcado
   (FR-007, Clarifications): Pacientes aparece siempre marcado, incluso si la suscripción que se edita
   no lo tenía guardado.

Se usa en dos momentos, con el mismo resultado garantizado en ambos: (a) al dibujar `ModulesField` y
`SubscriptionPreviewPanel` (qué aparece marcado), y (b) justo antes de construir el cuerpo de la
solicitud, en `SubscriptionCreatePage`/`SubscriptionEditPage` (qué se guarda). Usar la misma función
en los dos sitios evita que la vista previa o la casilla muestren algo distinto de lo que en realidad
se enviaría si se guardara en ese momento.

**Alternativas consideradas**: dos funciones separadas (una para «quitar keys obsoletas», otra para
«forzar Pacientes») — descartada, ambas siempre se aplican juntas en los mismos dos lugares; separarlas
solo agregaría una llamada doble sin ningún caso de uso real que las necesite por separado.

## D5. `ModulesField` deja de pedir datos: el patrón ya existe en `features/users` (`RolesField`)

**Decisión**: se replica, de punta a punta, el patrón ya usado por `RolesField.tsx` +
`useRolesCatalog.ts` + `UserCreatePage.tsx` (`features/users`) para un problema idéntico (un campo de
formulario cuyas opciones vienen de un catálogo remoto, con Guardar bloqueado mientras no esté
disponible):

- La página (`SubscriptionCreatePage`/`SubscriptionEditPage`), no el campo, llama a
  `useClinicModulesCatalog()` (TanStack Query).
- `ModulesField` pasa a recibir `modules`, `loading`, `loadFailed`, `onRetry` como props (además de
  `control`/`errors`, que conserva): sin `useQuery` propio, sin MSW en su propia prueba —igual que
  `RolesField.test.tsx`.
- `FormFrame` ya tiene desde `003-manage-subscription-types` un prop `saveDisabled` pensado
  exactamente para esto («such as a catalog that did not load», comentario ya existente en el código);
  `UserCreatePage` ya lo usa así (`saveDisabled={!catalogIsUsable}`). Esta feature reutiliza ese mismo
  prop, sin cambiar `FormFrame`.

Mientras el catálogo carga o falla, `ModulesField` muestra un indicador de carga o un `ErrorState` con
reintento (mismo componente que ya usa `RolesField`); si carga vacío, un `Alert severity="warning"`
(mismo patrón que `rolesEmpty`). Guardar queda deshabilitado en los tres casos salvo que el catálogo
haya cargado con al menos un módulo.

**Alternativas consideradas**: que `ModulesField` siga pidiendo sus propios datos con `useQuery`
interno — descartada: rompe el patrón ya establecido por `RolesField` para este mismo problema, y
obligaría a registrar MSW en la prueba del componente, que hoy no lo necesita.

## D6. `SubscriptionPreviewPanel` SÍ está en alcance: refleja la misma pantalla, no es una pantalla de solo lectura aparte

**Hallazgo de esta investigación**: el spec (Assumptions) deja fuera de alcance el detalle de una
suscripción y el Comparativo, por nombre. No menciona la Vista previa (`SubscriptionPreviewPanel`),
que solo se usa en `/subscriptions/new`, al costado del propio formulario, reflejando en vivo
`watch()` de ese mismo formulario (no es una pantalla separada: es parte de la misma pantalla de
alta). Dejarla con `CLINIC_MODULE_ORDER` fijo la desincroniza de lo que las casillas de arriba
realmente ofrecen: un módulo que el catálogo vigente agrega nunca aparecería en la vista previa, y uno
que el catálogo ya no ofrece seguiría apareciendo en ella como si todavía se pudiera guardar.

**Decisión**: `SubscriptionPreviewPanel` entra en alcance. Gana el mismo prop `modules: readonly
ClinicModule[]` que `ModulesField`, sustituye su iteración de `CLINIC_MODULE_ORDER` por una sobre ese
catálogo y usa `module.name` en vez de `text.modules.catalog[key].name`; aplica la misma
`resolveModuleSelection` para decidir incluidos/excluidos, por consistencia con lo que la casilla de
Pacientes muestra siempre marcado.

## D7. El catálogo de módulos se pide en paralelo con la suscripción en la edición, no en cascada

**Decisión**: `SubscriptionEditPage` llama a `useClinicModulesCatalog()` junto con
`useSubscription(subscriptionId)` (mismo nivel, ambas consultas en paralelo), y pasa el resultado
hacia abajo a `EditSubscriptionForm` como prop. `EditSubscriptionForm` solo monta después de que la
suscripción cargó (como ya ocurre hoy); para entonces el catálogo de módulos pudo ya haber terminado
de cargar en paralelo, o seguir cargando (en cuyo caso `ModulesField` muestra su propio estado de
carga, D5).

`toFormValues` (en `schemas/subscriptionForm.ts`) deja de filtrar `moduleKeys` contra un catálogo fijo
(`CLINIC_MODULE_ORDER`): se vuelve un traspaso puro (`new Set(subscription.moduleKeys)`), porque es
una función síncrona que se ejecuta al construir `defaultValues` del formulario, antes de que el
catálogo de módulos necesariamente haya resuelto. Filtrar contra el catálogo vigente es responsabilidad
exclusiva de `resolveModuleSelection` (D4), que sí puede esperar a que el catálogo esté disponible.

**Alternativas consideradas**: bloquear el montaje de `EditSubscriptionForm` hasta que ambas consultas
resuelvan (como ya hace con la propia suscripción) — descartada: encadenaría las dos peticiones en vez
de pedirlas en paralelo, y no hace falta: `resolveModuleSelection` ya resuelve correctamente el caso de
un catálogo que todavía no cargó cuando el formulario se guarda (D5: Guardar queda deshabilitado hasta
entonces).

## D8. El contador «Marcados: N de 9» tenía un 9 fijo; pasa a ser dinámico

**Hallazgo de esta investigación**: `messages.subscriptions.modules.marked` está escrito como
`(count: number) => \`Marcados: ${count} de 9\``, con el 9 escrito literal en el texto, no derivado del
tamaño de ningún arreglo. Como el catálogo deja de tener un tamaño fijo, ese texto quedaría mintiendo
en cuanto el catálogo real tenga un número de módulos distinto de nueve.

**Decisión**: `marked` pasa a `(count: number, total: number) => \`Marcados: ${count} de ${total}\``;
`ModulesField` le pasa el tamaño del catálogo vigente (`modules.length`) como `total`.

## D9: Textos muertos para el formulario, vivos para lo demás; textos nuevos para carga/error/vacío

**Decisión**: `messages.subscriptions.modules.catalog` (los nueve nombres/descripciones) y
`messages.subscriptions.modules.requires` (el texto «Requiere X») dejan de usarse desde
`ModulesField`/`SubscriptionPreviewPanel`, pero NO se borran (D3: siguen alimentando el Comparativo y
el detalle). Se agregan tres claves nuevas bajo `subscriptions.modules`, con el mismo patrón ya usado
por `users.form.rolesLoadError`/`rolesEmpty`:

- `loadError: { title, message }` — para el `ErrorState` cuando falla la carga del catálogo.
- `empty` — para el aviso cuando el catálogo vigente de módulos de clínica está vacío (FR-012).

`alwaysIncluded` («Siempre incluido») se conserva: sigue siendo el texto que acompaña a Pacientes.

## D10. Un simulador MSW propio de esta feature, con el mismo catálogo de nueve para no romper lo ya existente

**Decisión**: un archivo nuevo, `src/test/handlers/subscriptionModulesCatalog.ts` (un único archivo,
no una carpeta: a diferencia de `modulesCatalog/` o `rolesCatalog/`, esta feature solo necesita
simular una lectura, no un CRUD completo), con un simulador chico y configurable por comportamiento
(normal/falla/cuelga), con el mismo patrón ya usado por `createUsersServiceMock`
(`requests` grabadas, `failWith`, `hang`, `recover`). No se reutiliza `modulesCatalog/` (el simulador
de la pantalla de administración `features/modules`) ni `rolesCatalog/` (el de `features/roles`):
ambos ya simulan este mismo endpoint real de forma independiente entre sí —es el patrón ya establecido
en este repositorio (cada feature simula sus propias dependencias externas, research D13 de
`013-manage-modules`)—, así que un tercer simulador propio de `subscriptions` sigue ese mismo patrón
en vez de romperlo.

Su catálogo por omisión reutiliza las mismas nueve keys/nombres/descripciones de
`CLINIC_MODULE_ORDER`/`messages.subscriptions.modules.catalog` (importados, no retecleados), con
`sort_order` espaciado de 10 en 10 en ese mismo orden. Esto es deliberado: la mayoría de las pruebas de
integración ya existentes (`SubscriptionCreatePage.test.tsx`, `SubscriptionEditPage.test.tsx`,
`editSubscription.integration.test.tsx`) buscan casillas por nombres como «Recordatorios» o «Pacientes»
— con este catálogo por omisión, esas pruebas solo necesitan registrar el simulador nuevo, sin reescribir
sus aserciones. Un pequeño número de pruebas nuevas, dedicadas, prueban la dinámica real del catálogo
(otro orden, otras keys como `administrators`/`appointments` del propio ejemplo del spec, un módulo
que desaparece, Pacientes forzado aunque falte en los datos guardados).

## D11. `toCreateSubscriptionBody`/`toUpdateSubscriptionBody` no cambian de firma

**Decisión**: `schemas/subscriptionForm.ts` generaliza `moduleKeysSchema`/`SubscriptionFormValues.
moduleKeys` de `ReadonlySet<ClinicModuleKey>` a `ReadonlySet<string>` (las keys dejan de ser una unión
cerrada en cuanto vienen de un catálogo vivo), pero `toCreateSubscriptionBody`/
`toUpdateSubscriptionBody` conservan exactamente su firma actual: no reciben el catálogo ni lo conocen.
Es la página (que ya tiene el catálogo cargado, porque si no, Guardar está deshabilitado) la que aplica
`resolveModuleSelection` a `values.moduleKeys` y arma un `SubscriptionFormValues` resuelto antes de
llamar a esas funciones. Esto mantiene `subscriptionForm.ts` sin ninguna dependencia nueva hacia el
catálogo de módulos de clínica, y hace que `toUpdateSubscriptionBody`'s comparación (`sameSet`) siga
funcionando sin cambios: compara el conjunto ya resuelto contra `initial.moduleKeys` (el de la
suscripción tal como se guardó), así que una key obsoleta que se cae por `resolveModuleSelection` sigue
detectándose como un cambio real y se envía en el `PATCH`, incluso si el operador no tocó nada.

## D12. `e2e/subscriptions.spec.ts` no necesita cambios

Ningún escenario existente busca una casilla de módulo por nombre (el único paso que toca «lo que
incluye» una suscripción, V9, agrega elementos de «Otras funcionalidades», un campo distinto). Se
revisa durante la implementación como verificación, sin que se espere ningún cambio.
