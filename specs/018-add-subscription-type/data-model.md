# Modelo de datos: Tipo de suscripción (Individual o Empresarial)

**Feature**: `018-add-subscription-type` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Describe solo lo que esta feature agrega sobre [../003-manage-subscription-types/data-model.md](../003-manage-subscription-types/data-model.md) y [../012-configure-subscription-plans/data-model.md](../012-configure-subscription-plans/data-model.md), que siguen siendo válidos en todo lo demás (`SubscriptionStatus`, la máquina de estados, `ClinicModuleCatalog`, `withModuleChecked`, `AnnualSavings`, `SubscriptionsLocation`, `SubscriptionCapabilities`, las claves de TanStack Query).

## `SubscriptionTypeCatalog` (nuevo; `schemas/subscriptionTypeCatalog.ts`, dato fijo, no sale de ninguna respuesta)

| Constante | Forma | Contenido |
|---|---|---|
| `SUBSCRIPTION_TYPE` | objeto | `{ INDIVIDUAL: 1, ENTERPRISE: 2 }` (research D1). |
| `SUBSCRIPTION_TYPE_ORDER` | tupla de 2 identificadores | `[1, 2]`, en el orden de presentación del control (Individual primero). |
| `SubscriptionTypeId` | tipo | `(typeof SUBSCRIPTION_TYPE_ORDER)[number]`, es decir `1 \| 2`. |

El nombre y la explicación de cada opción viven en `messages.subscriptions.types.catalog[id]` (constitución VI: textos centralizados), no en este archivo:

| Id | Nombre | Explicación (FR-002) |
|---|---|---|
| `1` | Individual | Médico independiente con un solo consultorio. |
| `2` | Empresarial | Empresa con varias clínicas y varios consultorios por clínica. |

## `Subscription` (amplía a la de 003/012)

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `subscriptionType` | `{ id: number; name: string }` | `subscription_type` | **Nuevo**. Objeto anidado, igual forma que `status`. Obligatorio en toda lectura (la API lo exige desde su migración de respaldo; nunca llega vacío, ni en suscripciones creadas antes de esta función, spec → Edge Cases). Se reconoce por `id`, no por `name` (research D2); hoy `id` es `1` o `2`, pero el esquema no lo restringe a esos dos valores para no rechazar la lectura de un tercer tipo futuro agregado a mano al catálogo de la plataforma (fuera de alcance de esta feature: solo se lee y se muestra con el `name` de respaldo, research D2). |

Todos los demás campos de `Subscription` (003/012) quedan sin cambio.

## `SubscriptionFormValues` (amplía a la de 003/012)

| Campo | Tipo | Reglas (mensajes en `es.ts`) |
|---|---|---|
| `subscriptionTypeId` | `SubscriptionTypeId` (`z.union([z.literal(1), z.literal(2)])`) | **Nuevo**. Siempre tiene uno de los dos valores: el control nunca permite dejarlo sin marcar (research D3), así que no hay un mensaje de "obligatorio" que mostrar desde Zod. En el alta se abre en `SUBSCRIPTION_TYPE.INDIVIDUAL` (Clarifications); en la edición, en el id de la suscripción que se está editando. |

Todos los demás campos del formulario (003/012) quedan sin cambio.

## `toFormValues` (amplía a la de 003/012)

`EditableData` (el tipo que toma `toFormValues` para abrir la edición) gana `subscriptionType` entre los campos que toma de `Subscription` — solo para leer su `id` al construir `subscriptionTypeId`; no se usa para comparar cambios (no hay nada que comparar: D4 de research). `toFormValues` agrega:

```ts
subscriptionTypeId: subscription.subscriptionType.id as SubscriptionTypeId,
```

## `CreateSubscriptionBody` (amplía a la de 003/012)

| Campo | Tipo | Regla |
|---|---|---|
| `subscription_type_id` | `number` | **Nuevo**, obligatorio. `toCreateSubscriptionBody` lo llena con `values.subscriptionTypeId`. |

## `UpdateSubscriptionBody` (sin cambio de forma)

No gana ningún campo: `subscription_type_id` **no existe** en esta interfaz, a propósito (research D4; la API lo rechaza con `extra: "forbid"` si se envía). `toUpdateSubscriptionBody` no lee `values.subscriptionTypeId` en ningún punto de su comparación.

## `SubscriptionFormField` y `FORM_FIELDS` (amplían a las de 003/012)

- `api/subscriptionErrors.ts`: `SubscriptionFormField` gana `'subscriptionTypeId'`; el `Map` `FORM_FIELDS` gana `['subscription_type_id', 'subscriptionTypeId']`; `describeSubscriptionError` gana el caso `'subscription_type_not_found'` (research D5), con el mismo mensaje que ya usa para el campo (`text.fields.subscriptionTypeId`).
- `components/applyRefusal.ts`: la lista `FORM_FIELDS` (el orden en que se enfoca el primer campo con error) gana `'subscriptionTypeId'`, en la posición del control en el formulario (antes de `name`, research D3).
- `shared/messages/es.ts`: `subscriptions.errors.fields.subscriptionTypeId` (mensaje propio, p. ej. «El tipo de suscripción no es válido.»); `subscriptions.form.fields.subscriptionType` (etiqueta del grupo, «Tipo de suscripción»); `subscriptions.form.subscriptionTypeImmutableHelper` (texto bajo el control deshabilitado en la edición); `subscriptions.detail.fields.type` (etiqueta del detalle, «Tipo»); `subscriptions.types.catalog` (la tabla de arriba).

## Simulador de pruebas (`test/handlers/subscriptionsCatalog/`)

| Archivo | Cambio |
|---|---|
| `model.ts` | Agrega `subscription_type_id` a la fila guardada (por defecto `1`, igual que la columna real) y `subscription_type: { id, name }` a la forma de lectura. |
| `validation.ts` | Agrega, al crear: entero obligatorio, `> 0`, y `subscription_type_not_found` (422) si no es `1` ni `2`. Al actualizar: cualquier `subscription_type_id` presente en el cuerpo se rechaza como campo no permitido (mismo mecanismo que ya usa para otros campos de solo creación). |
| `seed.ts` | Las suscripciones de prueba existentes declaran su `subscription_type_id` (una mezcla de `1` y `2`, para poder probar ambos). |
