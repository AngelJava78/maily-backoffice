# Contrato consumido: API de suscripciones (límite de clínicas — predicción)

**Feature**: `019-add-clinics-limit` | **Fecha**: 2026-10-26 | **Spec**: [../spec.md](../spec.md)

Actualiza [../../018-add-subscription-type/contracts/subscriptions-service.md](../../018-add-subscription-type/contracts/subscriptions-service.md) con lo que esta feature espera que cambie en el contrato. **A diferencia de esa actualización (verificada contra código ya fusionado), esta es una predicción**: `clinics_limit` no está implementado todavía en `maily-system-api`. Existe `specs/007-add-clinics-limit/spec.md` en ese repositorio (copia local `C:\Maily\code\maily-system-api`, leído el 2026-10-26), con el mismo nombre de campo y la misma regla de negocio que esta feature, pero su `plan.md` sigue siendo la plantilla sin llenar: no hay `research.md`, `data-model.md` ni `contracts/` todavía de ese lado. Este documento combina esa spec con el código ya fusionado de la misma API (research D4 del plan) para predecir la forma exacta; donde la spec de `007` no fija una palabra exacta, se marca como predicción.

**Antes de implementar esta feature, re-verificar este documento contra el código fuente real de `maily-system-api`** (igual criterio que la 018 usó para el tipo de suscripción). Si la API todavía no ha fusionado `007-add-clinics-limit` para cuando esta feature se implemente, ver Assumptions del plan para cómo proceder.

## Campo nuevo: `clinics_limit`

| Operación | Forma | Regla (spec `007` de `maily-system-api`) |
|---|---|---|
| Lectura (`SubscriptionRead`, S1/S2) | `clinics_limit: int`, entero plano, junto a `consulting_rooms_limit` y los otros tres límites | Siempre presente (`007` FR-004, FR-007: ninguna fila queda sin límite, ni las que ya existían al desplegar). |
| Creación (`SubscriptionCreate`, S3) | `clinics_limit: int` | Obligatorio (`007` FR-001). Si el tipo elegido es Individual, el único valor aceptado es `1` (`007` FR-002); si no, de `1` a `100` (`007` FR-003). Fuera de regla, la creación se rechaza completa. |
| Actualización (`SubscriptionUpdate`, S4) | `clinics_limit?: int` (opcional, a diferencia de `subscription_type_id`) | Si la suscripción vigente es Individual, el campo **no se admite en absoluto**: enviarlo, con cualquier valor (incluido `1`, el que ya tiene), rechaza la solicitud completa, incluidos los demás campos que traiga (`007` FR-005, edge cases). Si no es Individual, se puede modificar a cualquier valor de `1` a `100` (`007` FR-006). |

## Predicción de mensajes (research D4 del plan; **sin confirmar**)

| Situación | Mensaje predicho | Base de la predicción |
|---|---|---|
| Falta, no es entero, o está fuera de 1 a 100 (al crear) | «El límite de clínicas debe ser un número entero de 1 a 100.» | Mismo patrón que `SUBSCRIPTION_CONSULTING_ROOMS_LIMIT_INVALID_MESSAGE` = «El límite de consultorios debe ser un número entero de 0 a 1 000 000.» (`maily-system-api/src/messages.py:120-121`, verificado). |
| Es un entero de 1 a 100, pero la suscripción es Individual y el valor no es 1 (al crear) | «El límite de clínicas de una suscripción Individual debe ser exactamente 1.» | Regla cruzada (`007` FR-002) que no cabe en una restricción de un solo campo; se predice un mensaje propio de negocio, con el mismo tono que otros rechazos de negocio ya existentes (p. ej. `subscription_status_unchanged`). |
| Se envía en la actualización de una suscripción Individual (con cualquier valor) | «El límite de clínicas no se puede modificar en una suscripción Individual.» | Mismo mecanismo que `SUBSCRIPTION_TYPE_IMMUTABLE_MESSAGE` = «El tipo de suscripción no puede modificarse una vez creada.» (`maily-system-api/src/messages.py`, verificado en la 018), adaptado: a diferencia del tipo, este campo sí es válido en la actualización de las demás suscripciones, así que el rechazo no puede ser el genérico de "campo no permitido" sin más contexto. |

Ninguno de estos tres textos debe mostrarse nunca en pantalla (FR-008 de la spec de `019` y de `007`): el backoffice siempre traduce el código del rechazo a su propio mensaje en español, igual patrón que el resto de esta sección (003 FR-010).

## Ejemplo de cuerpo de creación (`SubscriptionCreate`, predicho)

```json
{
  "name": "Clínica Plus",
  "subscription_type_id": 2,
  "clinics_limit": 25,
  "monthly_price": "1299.00"
}
```

## Validación en el cliente y simulador de pruebas

El simulador (`test/handlers/subscriptionsCatalog/`) reproduce esta predicción completa (obligatoriedad y rango al crear, la regla cruzada con el tipo, y la inmutabilidad condicional al modificar), para poder construir y probar esta feature de punta a punta sin esperar a que la API real la implemente (research D4). Si el contrato real termina usando otro código o texto, el cambio queda aislado a `validation.ts`/`model.ts` del simulador y al mapa de errores de `subscriptionErrors.ts`, sin tocar el resto de la feature.
