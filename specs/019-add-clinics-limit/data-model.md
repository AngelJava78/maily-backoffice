# Modelo de datos: Límite de clínicas por tipo y ajustes visuales del formulario

**Feature**: `019-add-clinics-limit` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

Describe solo lo que esta feature agrega sobre [../018-add-subscription-type/data-model.md](../018-add-subscription-type/data-model.md) y [../012-configure-subscription-plans/data-model.md](../012-configure-subscription-plans/data-model.md), que siguen siendo válidos en todo lo demás.

## `Subscription` (amplía a la de 018)

| Campo | Tipo | Origen (DTO) | Reglas |
|---|---|---|---|
| `clinicsLimit` | `number \| null` | `clinics_limit` | **Nuevo**. Entero plano (no anidado, a diferencia de `subscriptionType`), igual forma que `consultingRoomsLimit`. `1` si el tipo de la suscripción es Individual; de `1` a `100` si no. `null` cuando la API no lo informa (transición de contrato, spec → Edge Cases; mismo trato que `clinicsCount`: ausente o `null` se toma como `null`, nunca como `0`). |

Todos los demás campos de `Subscription` (003/012/018) quedan sin cambio.

## `SubscriptionFormValues` (amplía a la de 018)

| Campo | Tipo | Reglas (mensajes en `es.ts`) |
|---|---|---|
| `clinicsLimit` | `string` | **Nuevo**. A nivel de campo: solo dígitos, de 1 a 7 caracteres (mismo patrón que los otros cuatro límites, `CLINIC_LIMIT_PATTERN`). A nivel del formulario completo (`.superRefine()`, research D5): si `subscriptionTypeId === SUBSCRIPTION_TYPE.INDIVIDUAL`, el valor numérico DEBE ser exactamente `1`; si no, DEBE ser un entero de `1` a `100`. En el alta se abre en `'1'` (Clarifications); al cambiar el tipo, `SubscriptionTypeField` dejar este campo en `'1'` en el mismo evento (research D6), sin importar el tipo nuevo. |

## `SubscriptionTypeField` (amplía al de 018)

El `onChange` que ya tenía (research D1 de la 018) gana un segundo efecto en el mismo evento: además de `setValue('subscriptionTypeId', next)`, llama `setValue('clinicsLimit', '1', { shouldValidate: true })` (research D6). El interruptor de D1 de esta feature sustituye el `ToggleButtonGroup` interno; el campo que controla (`subscriptionTypeId`) y la prop `disabled` (edición, FR-004 de la 018) no cambian.

## `ClinicsLimitField` (nuevo; `components/ClinicsLimitField.tsx`)

```ts
interface ClinicsLimitFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly register: UseFormRegister<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
}
```

Lee `subscriptionTypeId` con `useWatch({ control, name: 'subscriptionTypeId' })` (research D3) para decidir `disabled = subscriptionTypeId === SUBSCRIPTION_TYPE.INDIVIDUAL`. Es un `TextField` registrado como los otros cuatro límites (`register('clinicsLimit')`), con `disabled` condicional y un texto de ayuda que cambia: el de rango (1 a 100) cuando está habilitado, o uno propio que explica que es fijo para las suscripciones Individual cuando no lo está — mismo patrón de `helperText`/`error` ya usado en `ClinicLimitsFields.tsx`.

## `toFormValues` (amplía a la de 018)

`EditableData` gana `'clinicsLimit'` (de `Subscription`). La conversión:

```ts
clinicsLimit: String(subscription.clinicsLimit ?? 1),
```

Un valor `null` (transición de contrato) abre el campo en `'1'`, nunca vacío (Clarifications), igual que una suscripción recién creada.

## `CreateSubscriptionBody` (amplía a la de 018)

| Campo | Tipo | Regla |
|---|---|---|
| `clinics_limit` | `number` | **Nuevo**, obligatorio. `toCreateSubscriptionBody` lo llena con `Number(values.clinicsLimit)`. |

## `UpdateSubscriptionBody` (amplía a la de 018, a diferencia de `subscription_type_id`)

| Campo | Tipo | Regla |
|---|---|---|
| `clinics_limit` | `number` (opcional) | **Nuevo**. A diferencia de `subscription_type_id` (nunca se envía), `clinics_limit` **sí** puede enviarse, pero solo cuando el tipo de la suscripción que se edita no es Individual. `toUpdateSubscriptionBody` no lo agrega en absoluto si `initial.subscriptionType.id === SUBSCRIPTION_TYPE.INDIVIDUAL` (research D4: inmutable en ese caso, igual trato que el tipo); si no, lo agrega solo si el valor cambió respecto de `initial.clinicsLimit`, igual patrón que los otros cuatro límites. |

## Simulador de pruebas (`test/handlers/subscriptionsCatalog/`)

| Archivo | Cambio |
|---|---|
| `model.ts` | `CatalogSubscription` gana `clinicsLimit: number` (por defecto `1`, igual que la predicción de respaldo de `007` FR-007 para filas ya existentes). `SubscriptionInput` gana `clinics_limit: number` (obligatorio). `SubscriptionChanges` gana `clinics_limit?: number` (a diferencia de `subscription_type_id`, sí forma parte de este tipo). `toDto()` agrega `clinics_limit` como entero plano. `create()` valida, después de las comprobaciones ya existentes: si `input.subscription_type_id === SUBSCRIPTION_TYPE.INDIVIDUAL` y `input.clinics_limit !== 1`, rechaza (predicción D4, mensaje propio); si no, y `clinics_limit` no está entre 1 y 100, rechaza igual. `update()` rechaza, antes de aplicar cambios, si la suscripción vigente es Individual y `changes.clinics_limit !== undefined` (sin importar el valor, research D4); si no es Individual, valida el nuevo valor entre 1 y 100 antes de aplicarlo. |
| `validation.ts` | `clinics_limit` se agrega a los campos de forma ya permitidos tanto en `validateCreate` como en `validateUpdate` (a diferencia de `subscription_type_id`, que solo se permite al crear); su comprobación de forma (obligatorio al crear, entero de 1 a 100) sigue el mismo patrón que `limitError`, con sus propios límites. La regla cruzada con el tipo (exactamente 1 si Individual; inmutable al modificar una Individual) se aplica en `model.ts`, no aquí, porque necesita conocer el tipo de la suscripción (research D4, data-model → `model.ts`). |
