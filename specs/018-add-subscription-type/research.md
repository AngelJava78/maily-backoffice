# Investigación: Tipo de suscripción (Individual o Empresarial)

**Feature**: `018-add-subscription-type` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](spec.md)

Esta feature no abre preguntas de tecnología (reutiliza el stack de las features 001 a 012 sin excepción) ni de proceso de negocio (el contrato de la API ya está implementado y verificado, spec → Assumptions). La investigación se centra en cómo encajar el campo nuevo en la arquitectura ya existente de `features/subscriptions`, descrita en [../003-manage-subscription-types/plan.md](../003-manage-subscription-types/plan.md) y [../012-configure-subscription-plans/plan.md](../012-configure-subscription-plans/plan.md). No queda ningún `NEEDS CLARIFICATION`: la única ambigüedad del pedido original (preselección o no del control) ya se resolvió en `/speckit-clarify` y está en el spec.

## D1. El catálogo de los dos tipos es contenido fijo del frontend, con el identificador numérico como valor canónico

**Decisión**: un módulo de datos puro, `schemas/subscriptionTypeCatalog.ts`, declara los dos identificadores y su orden de presentación:

```ts
export const SUBSCRIPTION_TYPE = { INDIVIDUAL: 1, ENTERPRISE: 2 } as const;
export const SUBSCRIPTION_TYPE_ORDER = [
  SUBSCRIPTION_TYPE.INDIVIDUAL,
  SUBSCRIPTION_TYPE.ENTERPRISE,
] as const;
export type SubscriptionTypeId = (typeof SUBSCRIPTION_TYPE_ORDER)[number];
```

El nombre y la explicación visibles de cada opción (FR-002) viven en `messages.subscriptions.types.catalog[id]`, como cualquier otro texto de la interfaz (constitución VI), igual que ya hace `clinicModuleCatalog.ts` con sus nueve módulos (research D3 de la 012). Se usa el identificador numérico (`1`, `2`) como clave, no un nombre simbólico en inglés, porque la API no expone ninguna clave de texto para el tipo (solo `id` y un `name` en español que es dato de catálogo y puede cambiar, verificado en `openapi-subscriptions.yaml` de `maily-system-api`) y porque la propia API instruye a quien la consume a basarse en el `id`, nunca en el `name` — la misma postura que ya aplica esta sección al estatus (FR-016 de la 003: «se reconoce por su identificador... no por su nombre», ahora repetida en la spec de esta feature para el tipo).

**Alternativas**: pedir el catálogo de tipos a la API (si existiera un endpoint para listarlo) — no existe ninguno (verificado en `src/routers/subscriptions.py` de `maily-system-api`: el catálogo solo se lee anidado dentro de cada suscripción). Usar claves de texto en inglés (`'individual'`, `'enterprise'`) con una tabla de conversión a los identificadores `1`/`2` — se descarta: agrega una capa de mapeo sin necesidad (YAGNI, constitución I) cuando el identificador numérico ya es el valor estable y es el mismo que hay que enviar a la API.

## D2. El detalle muestra el nombre del catálogo propio del frontend, no el `name` que devuelve la API

**Decisión**: `SubscriptionDetailFields` resuelve el texto a mostrar con `messages.subscriptions.types.catalog[subscription.subscriptionType.id]?.name`, igual que `SubscriptionStatusChip` ya hace con el estatus (research de la 003) y no con el campo `subscription.subscriptionType.name` que llega del servidor. Si el identificador no es `1` ni `2` (un tercer tipo agregado a mano al catálogo de la plataforma, fuera de alcance de esta feature, spec → Edge Cases), se usa el `name` que trae la API como respaldo, para no romper la pantalla — el mismo trato que ya da FR-020 de la 003 a un estatus desconocido.

**Alternativas**: mostrar siempre el `subscription_type.name` de la API — se descarta: ese nombre es dato de catálogo editable a mano (lo dice el propio contrato) y la spec exige reconocer el tipo por su identificador, no por su nombre (Key Entities); confiar en el texto del servidor también se alejaría del patrón ya establecido para el estatus.

## D3. El control de alta es un `ToggleButtonGroup` exclusivo que siempre tiene una opción marcada

**Decisión**: se reutiliza `ToggleButtonGroup` de `@mui/material`, ya incorporado al proyecto por `PriceCycleToggle` (research D1/D8 de la 012): mismo componente de MUI, cero dependencias nuevas. Un componente nuevo y pequeño, `SubscriptionTypeField.tsx`, lo envuelve con las dos opciones (`SUBSCRIPTION_TYPE_ORDER`), cada una con su nombre y su explicación (FR-002), y una prop `disabled` para reutilizarlo tanto en el alta (habilitado) como en la edición (deshabilitado, con el texto de inmutabilidad de FR-004) en vez de dos componentes casi idénticos (constitución I: responsabilidad única, sin duplicar). El `onChange` de un `ToggleButtonGroup` exclusivo entrega `null` cuando se intenta desmarcar la única opción marcada; `SubscriptionTypeField` ignora ese `null` y conserva el valor que ya tenía, de modo que el control nunca queda sin ninguna opción marcada (la decisión de Clarifications: Individual por defecto, el guardado nunca se bloquea por falta de selección).

**Alternativas**: `RadioGroup` — se descarta porque el proyecto ya tiene un control visualmente equivalente para exactamente este patrón (Mensual/Anual) y el pedido original pide explícitamente un «toggle button»; `Switch` (como `selfService`) — se descarta porque un interruptor de dos posiciones no nombra las dos opciones con la misma claridad que dos botones con su propio texto, y aquí ninguna de las dos opciones es un valor "apagado" implícito.

## D4. `subscriptionTypeId` se envía solo al crear; nunca se construye en el cuerpo de la edición

**Decisión**: `SubscriptionFormValues` gana `subscriptionTypeId: SubscriptionTypeId`, con valor inicial `SUBSCRIPTION_TYPE.INDIVIDUAL` en el alta (Clarifications) y el id de la suscripción en la edición (`toFormValues`). `toCreateSubscriptionBody` agrega `subscription_type_id: values.subscriptionTypeId` al cuerpo. `toUpdateSubscriptionBody` **no** gana ninguna línea nueva: simplemente nunca lee ni compara `values.subscriptionTypeId`, así que el campo nunca aparece en el cuerpo de un `PATCH`, sin importar qué muestre el control deshabilitado (FR-005). No es una regla de negocio duplicada (constitución IV): la API ya rechaza `subscription_type_id` en cualquier actualización (`extra: "forbid"`, mensaje propio de inmutabilidad); esta decisión es solo que el frontend nunca intenta enviarlo, así que ese rechazo nunca debería producirse en el uso normal de esta interfaz.

**Alternativas**: comparar `subscriptionTypeId` contra el valor inicial como los demás campos y enviarlo si "cambiara" — se descarta: el control está deshabilitado en la edición, por lo que nunca puede cambiar desde la interfaz, y agregar la comparación sería código muerto que invitaría, por error futuro, a reactivar el control sin darse cuenta de que la API lo rechaza.

## D5. Manejo de rechazos: un código dedicado más, mapeado al mismo patrón que ya existe

**Decisión**: se agrega `subscription_type_not_found` (422) a `describeSubscriptionError` (`api/subscriptionErrors.ts`), con el mismo trato que ya reciben `subscription_module_prerequisite_missing`/`subscription_module_not_found`: un error de tipo `field` sobre el control, con un mensaje propio (no el texto del servidor, FR-007). El mensaje genérico de validación (`validation_error` con `errors[].field === "subscription_type_id"`, que cubriría un identificador ausente, nulo, no entero o `≤ 0`) se mapea igual que los demás campos, agregando la entrada correspondiente al `Map` de `FORM_FIELDS` de `subscriptionErrors.ts` y a la lista de `applyRefusal.ts`; en la práctica, esta ruta no debería alcanzarse porque el control de alta siempre envía un entero positivo de `SUBSCRIPTION_TYPE_ORDER`. El rechazo de inmutabilidad (enviar el campo al modificar) tampoco debería alcanzarse, porque esta interfaz nunca lo envía (D4); no se le agrega un mapeo propio, igual que la 003 no mapea rechazos que su propia interfaz no puede provocar.

**Alternativas**: tratar `subscription_type_not_found` como un error general de formulario (`kind: 'form'`) en vez de asociarlo al control — se descarta: el patrón ya establecido para `subscription_module_not_found` (mismo código 422, misma causa: una clave que deja de existir en un catálogo externo entre que se abrió el formulario y se guardó) lo asocia a su campo, y hacerlo distinto aquí sin motivo rompería la consistencia que la constitución VI pide.

## D6. El simulador de pruebas (MSW) reproduce la obligatoriedad y la inmutabilidad

**Decisión**: `test/handlers/subscriptionsCatalog/model.ts` agrega `subscription_type_id` (por defecto `1`, como ya hace la base de datos real) y devuelve `subscription_type: { id, name }` en las lecturas; `validation.ts` agrega las reglas de creación (entero positivo obligatorio, `subscription_type_not_found` si no es `1` ni `2`) y la de actualización (cualquier `subscription_type_id` en el cuerpo de un `PATCH` se rechaza como campo no permitido, igual trato que ya reciben otros campos de solo creación). Así el simulador queda fiel al contrato real verificado en `maily-system-api` (constitución VII), sin introducir una tercera copia de las reglas de negocio.

**Alternativas**: ninguna; es la continuación directa del patrón ya establecido por la 003 y ampliado por la 012 (research D9 de la 012).
