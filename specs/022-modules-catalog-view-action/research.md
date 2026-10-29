# Research: Módulos de suscripción según el catálogo de la API y acción «Ver» editable

**Feature**: `022-modules-catalog-view-action` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md)

## D1 — Tres rebanadas independientes, en código que no se toca entre sí

Las tres historias de usuario del spec caen en dos features distintas y no comparten ningún archivo:

- US1 (detalle y comparativo) y US3 (dependencias y mocks) viven en `features/subscriptions` y
  `src/test/handlers/subscriptions*`.
- US2 (acción «Ver») vive enteramente en `features/modules`.

Dentro de `features/subscriptions`, US1 y US3 tampoco se tocan entre sí: US1 cambia
`SubscriptionDetailFields.tsx`/`SubscriptionsComparisonTable.tsx` y sus páginas; US3 cambia
`subscriptionErrors.ts`, borra `clinicModuleCatalog.ts` y reescribe los dos simuladores de prueba. La
única intersección es que US1 **depende** de que `clinicModuleCatalog.ts` deje de ser la fuente de
`SubscriptionDetailFields`/`SubscriptionsComparisonTable` antes de que US3 pueda borrarlo (no al revés).
Dentro de `features/modules`, US2 es autocontenida.

**Decisión**: `/speckit-tasks` puede organizar US1 antes de US3 (US1 vacía ese archivo de sus dos
últimos consumidores; US3 lo borra y limpia los simuladores), y US2 en paralelo con ambas, sin
dependencia de archivo alguna.

## D2 — El detalle y el comparativo se vuelven «tontos»: reciben el catálogo por props

Mismo patrón que ya estableció la 021 (research D5 de esa feature) para `ModulesField`/`RolesField`:
ni `SubscriptionDetailFields` ni `SubscriptionsComparisonTable` piden el catálogo ellos mismos. Lo pide
el componente de página que ya existe por encima de cada uno:

- `SubscriptionDetailPage` ya llama a `useSubscription`; agrega `useClinicModulesCatalog()` **en
  paralelo** (mismo principio que la 021, research D7: dos queries independientes, ninguna en cascada
  de la otra) y pasa el resultado a `SubscriptionDetailFields` como props nuevos.
- `SubscriptionsListPage` ya llama a `useSubscriptionCatalog()`; agrega `useClinicModulesCatalog()` de
  la misma forma y lo pasa a `SubscriptionsComparisonTable`. El hook se llama sin condicionarlo a la
  pestaña activa (Listado/Comparativo): es una lectura barata y cacheada (`staleTime` de 5 minutos, ya
  fijado en la 021), igual que `useSubscriptionCatalog()` ya se pide sin importar la pestaña.

**Alternativa descartada**: que cada componente pida su propio catálogo con `useClinicModulesCatalog()`
directamente. Se descarta porque React Query ya deduplica por `queryKey`, pero mezclar "quién pide
datos" con "quién solo los muestra" en un componente de presentación compartido (`SubscriptionDetailFields`
también se usa, sin red, en sus propias pruebas de componente) rompe el patrón ya elegido en toda la
feature 021 y obligaría a envolver sus pruebas en un `QueryClientProvider` con MSW en vez de pasar props
fijos.

## D3 — Carga/error/vacío a nivel de la sección de módulos, no de toda la pantalla

El detalle de una suscripción y el comparativo ya muestran su propio contenido en cuanto está listo
(el detalle no espera a los módulos para mostrar el nombre o el precio; el comparativo no espera a los
módulos para mostrar las columnas). FR-007 pide que ambos repliquen "el mismo estado de error con opción
de reintentar que ya usa el formulario" — el que `ModulesField` ya construyó en la 021 (research D5 de
esa feature): `CircularProgress` mientras carga, `ErrorState` con reintento si falla, `Alert` si el
catálogo vino vacío. Se replica ese mismo esquema de tres estados, pero **acotado a la sección de
módulos de cada pantalla**, no a la pantalla entera:

- **Detalle** (`SubscriptionDetailFields`): el sub-componente `Modules` (dentro del mismo archivo) gana
  los mismos cuatro estados que `ModulesField` (carga/error con reintento/catálogo vacío/contenido), sin
  casillas: en el estado de contenido, lista los `module_keys` de la suscripción en el orden del
  catálogo, con los que no están en el catálogo al final como "(no disponible)" (FR-006), seguidos de la
  línea "No incluye" con los del catálogo que la suscripción no tiene.
- **Comparativo** (`SubscriptionsComparisonTable`): mientras el catálogo no esté usable, la sección
  "Módulos" es **una sola fila** que ocupa todas las columnas (mismo mecanismo de `colSpan` que ya usa
  `SectionRow`) con el indicador de carga o el error con reintento; en cuanto está usable, vuelve a ser
  una fila por módulo, igual que hoy, solo que iterando el catálogo dinámico en vez de
  `CLINIC_MODULE_ORDER`.

**Por qué no bloquear toda la pantalla**: hacerlo obligaría a esperar un segundo recurso (el catálogo de
módulos) para mostrar datos que no dependen de él (precio, estatus, clínicas asignadas), degradando una
pantalla que hoy ya es progresiva. Acotar el estado a la sección es además el mismo criterio que la 021
ya aplicó con `saveDisabled` ("tal catálogo que no cargó" — comentario ya existente en `FormFrame`):
bloquear solo lo que depende del catálogo, no el resto del formulario.

## D4 — `clinicModuleCatalog.ts` se borra ahora (la 021 lo dejó pendiente a propósito)

La 021 (research D3 de esa feature) dejó explícitamente ese archivo vivo porque
`SubscriptionDetailFields`, `SubscriptionsComparisonTable` y el simulador de la propia API de
Suscripciones seguían dependiendo de él. Esta feature migra a los dos primeros (D2/D3) y reescribe el
tercero (D6) para que valide contra su propio catálogo simulado en vez de esa lista fija — con eso,
`CLINIC_MODULE_ORDER`, `MODULE_PREREQUISITE` y el tipo `ClinicModuleKey` se quedan sin ningún
consumidor de producción ni de prueba, y el archivo se borra entero (FR-008), junto con su prueba
(`clinicModuleCatalog.test.ts`).

`REQUIRED_MODULE_KEY` no se mueve: ya vive, desde la 021, únicamente en `schemas/clinicModule.ts`
(`021` lo declaró ahí a propósito, coexistiendo con el de `clinicModuleCatalog.ts` solo mientras ese
archivo seguía vivo). Al borrarse `clinicModuleCatalog.ts`, queda la única fuente, cumpliendo FR-008
sin ningún cambio adicional.

**Archivos de prueba que solo importaban una key literal válida, no comportamiento de esta lista**
(`REQUIRED_MODULE_KEY`/`ClinicModuleKey`, usados solo para armar un `moduleKeys` de prueba arbitrario):
`OtherFeaturesField.test.tsx`, `useCreateSubscription.test.tsx`, `SubscriptionTypeField.test.tsx`,
`ClinicsLimitField.test.tsx`, `ClinicLimitsFields.test.tsx`, `SelfServiceAndTrialFields.test.tsx`. Su
único cambio es apuntar el import a `../schemas/clinicModule` en vez de `../schemas/clinicModuleCatalog`
(mismo valor literal, `'patients'`); ninguno prueba comportamiento de esta feature.

## D5 — `subscriptionErrors.ts`: una rama menos, sin nuevo tipo de resultado

`subscription_module_prerequisite_missing` y `subscription_module_not_found` ya caían en el mismo
`case` compartido, con el mismo resultado (`{ kind: 'field', fields: { moduleKeys: ... } }`). FR-010 solo
retira el primer código de ese `case` (deja de reconocerse por su nombre; una respuesta con ese código,
si todavía ocurriera, cae en el `default` ya existente y se trata como error inesperado, tal como anota
la Assumption del spec) y simplifica el texto de `errors.fields.moduleKeys` en `es.ts`, quitando la
mención a "le falta su módulo requisito". No se crea ningún tipo, rama ni archivo nuevo.

## D6 — Los dos simuladores de prueba, cada uno con su propia lista literal de 18 keys

`src/test/handlers/subscriptionModulesCatalog.ts` (simula `GET /modules` de Usuarios) y
`src/test/handlers/subscriptionsCatalog/model.ts` (simula la validación de `module_keys` de la propia
API de Suscripciones) son simuladores de **dos servicios distintos**, y ya seguían, desde la 021
(research D10 de esa feature), el principio de que cada simulador es independiente: ninguno importa al
otro. Esta feature mantiene ese principio: en vez de que ambos deriven de `CLINIC_MODULE_ORDER` (que se
borra, D4), cada uno gana su **propia** lista literal de los 18 keys reales que trae FR-011
(`overview`, `schedule`, …, `reminders`), sin que un archivo importe la lista del otro.

- `subscriptionModulesCatalog.ts`: `DEFAULT_CLINIC_MODULES` pasa de derivarse de `CLINIC_MODULE_ORDER` +
  `messages.subscriptions.modules.catalog` (ambos a punto de desaparecer) a ser un arreglo literal con
  los 18 `{ key, name, description, sort_order }`, mismo criterio de espaciado de `sort_order` que ya
  usaba (múltiplos de 10, en el orden de la lista).
- `subscriptionsCatalog/model.ts`: `KNOWN_MODULE_KEYS` deja de ser `new Set(CLINIC_MODULE_ORDER)` y pasa
  a ser un `Set` literal con los mismos 18 keys (duplicado intencional, no importado: son catálogos de
  dos servicios simulados distintos, y acoplarlos haría que cambiar el catálogo simulado de uno
  afectara al otro sin que ninguna prueba real lo pida). El bloque que recorre `MODULE_PREREQUISITE`
  se borra entero: ninguna dependencia se valida (FR-008, FR-011).

**Alternativa descartada**: que `model.ts` importe `DEFAULT_CLINIC_MODULES` de
`subscriptionModulesCatalog.ts` para no duplicar la lista de 18 keys. Se descarta por la misma razón que
ya sostuvo la 021 (research D10): son simulaciones de servicios independientes: la API de Suscripciones
no consulta a la de Usuarios para validar `module_keys`, así que su simulador tampoco debería
depender del simulador del otro.

## D7 — La acción «Ver»: un `refine` distinto, no una reestructuración

El mecanismo que faltaba para FR-012 a FR-017 ya existe casi completo; solo cambian tres piezas
puntuales, mínimas, en `features/modules`:

1. `moduleActionCatalog.ts`: se borra `REQUIRED_ACTION_KEY`.
2. `ModuleFormFields.tsx`: se quita `disabled={action === REQUIRED_ACTION_KEY}` de la casilla (queda
   `disabled={false}` para las cuatro, es decir, se quita el atributo). Se agrega, bajo el `FormGroup`,
   el mensaje de `errors.actions?.message` cuando existe (mismo idioma visual que `ModulesField` ya usa
   para su propio error de campo, con un `FormHelperText`), porque hoy ese error nunca se mostraba (la
   única regla que podía fallar, "falta Ver", nunca ocurría con la casilla bloqueada).
3. `moduleForm.ts`: el `refine` de `actions` cambia de "debe incluir `read`" (`hasRequiredAction`,
   FR-016 lo retira) a "si incluye `write`, `update` o `delete`, debe incluir también `read`" (FR-015),
   con el mensaje nuevo "Para usar Crear, Modificar o Eliminar, marca también Ver." El `Set` vacío ya
   no viola ninguna regla (FR-016): un módulo se guarda sin ninguna acción.

`withActionChecked` (`moduleActionSelection.ts`) se simplifica a un toggle plano (agrega o quita, sin
casos especiales) y deja de importar `REQUIRED_ACTION_KEY`: se conserva como función propia, en vez de
inlinearla en los dos paneles que la llaman, porque ya tiene su propia prueba unitaria y mantiene la
simetría de que un cambio de selección de acciones pasa por un único punto, igual que
`resolveModuleSelection` lo es para los módulos de clínica (D2 de la 021).

**No cambia nada en la confirmación de desmarcar una acción existente** (`ModuleEditPanel`,
`handleActionToggle`/`ConfirmDialog`): ya está escrita de forma genérica sobre cualquier
`ModuleActionKey`, recorriendo `MODULE_ACTION_ORDER`. En cuanto el bloqueo especial de «Ver» desaparece
de los puntos 1 y 2, desmarcarla dispara esa misma confirmación ya existente, sin tocar ese archivo
(FR-014 queda satisfecho por código que ya existe).

## D8 — Fuera de alcance confirmado: `features/roles`, APIs externas, e2e

`features/roles` tiene su propia copia del endpoint de módulos y su propia matriz de permisos; esta
feature no la toca (exclusión explícita del spec). Ningún archivo de `e2e/` (`subscriptions.spec.ts`,
`modules.spec.ts`) menciona los nombres en español del catálogo viejo ni `REQUIRED_ACTION_KEY`/
`actionsReadRequired`: se revisan al cerrar la implementación, sin cambios esperados (mismo hallazgo que
la 021 documentó para e2e, research D12 de esa feature).
