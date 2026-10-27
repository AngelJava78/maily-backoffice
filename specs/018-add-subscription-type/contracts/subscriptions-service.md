# Contrato consumido: API de suscripciones (tipo de suscripción)

**Feature**: `018-add-subscription-type` | **Fecha**: 2026-10-26 | **Spec**: [../spec.md](../spec.md)

Actualiza [../../012-configure-subscription-plans/contracts/subscriptions-service.md](../../012-configure-subscription-plans/contracts/subscriptions-service.md) con lo que cambió en el contrato desde entonces. Verificado el 2026-10-26 leyendo directamente el código fuente vigente del repositorio `maily-system-api` (copia local `C:\Maily\code\maily-system-api`, feature `006-add-subscription-type`, commit `3faf696`): `src/models/subscription_type.py`, `src/models/subscription.py`, `src/dtos/subscription.py`, `src/routers/subscriptions.py`, `src/services/subscription_service.py`, `src/messages.py`, `src/error_handlers.py` y `specs/006-add-subscription-type/contracts/` de ese repositorio (`openapi-subscriptions.yaml`, `error-catalog.md`). Las seis operaciones (S1 a S6), las condiciones generales y todos los campos que no se listan aquí siguen exactamente como en la 003 y la 012: no se repiten.

## Campo nuevo: `subscription_type` / `subscription_type_id`

A diferencia de los demás campos (mismo nombre en lectura, creación y actualización), este tiene **tres formas distintas** según la operación:

| Operación | Nombre del campo | Forma | Regla |
|---|---|---|---|
| Lectura (`SubscriptionRead`, S1/S2) | `subscription_type` | Objeto anidado `{ id, name }` (igual forma que `status`) | Siempre presente, nunca `null`. `id` es el valor estable; `name` es dato de catálogo administrado a mano y puede cambiar. |
| Creación (`SubscriptionCreate`, S3) | `subscription_type_id` | Entero | **Obligatorio**, estricto (`strict=True`), `> 0`. Sin valor por defecto en el DTO (la columna de la base de datos sí tiene `DEFAULT 1`, pero solo para no dejar sin tipo a las filas que ya existían al desplegar esta ampliación; la API siempre lo exige explícito al crear). |
| Actualización (`SubscriptionUpdate`, S4) | — | **No existe este campo en el esquema** | `SubscriptionUpdate` sigue con `extra: "forbid"` (003); como `subscription_type_id` no está declarado ahí, enviarlo con cualquier valor —incluido el que la suscripción ya tiene— se rechaza igual que un campo no permitido, pero con un mensaje propio de inmutabilidad (ver Errores). |

Catálogo (`subscription_types`, administrado a mano, igual patrón que `subscription_statuses`): hoy exactamente dos filas, `id=1` → «Individual» (médico independiente; su consultorio se asocia a una sola clínica) e `id=2` → «Empresarial» (empresa con varias clínicas y varios consultorios por clínica). Un identificador que sea un entero positivo pero no exista en el catálogo se descubre al escribir (clave foránea), no con una lectura previa, y se traduce al código `subscription_type_not_found`. Quien consume la API DEBE basarse en el `id`, nunca en el `name` (contrato `SubscriptionTypeRead`, igual exigencia que ya aplica esta sección al `id` del estatus, FR-016 de la 003).

La relación de negocio entre el tipo y cuántas clínicas puede tener la suscripción (una si es Individual, cualquier cantidad si es Empresarial) **no la aplica esta API**: solo expone el tipo en sus lecturas; el sistema que administra las clínicas es quien la aplica, fuera de esta API y de esta feature (igual conclusión que la spec, Assumptions).

## Errores nuevos

Se agregan al catálogo ya heredado de la 003 y la 012 (mismo cuerpo uniforme `{ code, message, errors? }`; la interfaz nunca muestra `message` ni los textos de `errors`):

| `code` | Estado | Operación | Mensaje de la API (nunca se muestra; referencia) | Cómo lo trata la interfaz |
|---|---|---|---|---|
| `subscription_type_not_found` | 422 | S3 (crear) | «No se encontró el tipo de suscripción con el identificador {subscription_type_id}.» | Error junto al control de tipo (research D5): no debería producirse en el uso normal, porque el control de alta solo envía `1` o `2`; solo llegaría por una carrera con un cambio del catálogo de tipos entre que se abrió el formulario y se guardó. |

Mensajes de validación nuevos (dentro de `validation_error`, `errors[].field === "subscription_type_id"`; no son códigos nuevos, van en el catálogo ya existente de esa forma):

| Situación | Operación | Mensaje de la API (nunca se muestra; referencia) | Cómo lo trata la interfaz |
|---|---|---|---|
| Falta, es `null`, no es un entero, o es `≤ 0` | S3 (crear) | «El tipo de suscripción es obligatorio y debe ser un número entero positivo.» | Error junto al control (research D5); no debería producirse, porque el control siempre envía `1` o `2` (Clarifications: nunca queda sin marcar). |
| Se envía en la actualización, con cualquier valor | S4 (modificar) | «El tipo de suscripción no puede modificarse una vez creada.» | No debería producirse nunca desde esta interfaz: el formulario de edición nunca construye `subscription_type_id` en el cuerpo del `PATCH` (research D4, FR-005). No se mapea un mensaje propio para este caso porque esta interfaz no tiene ninguna acción que pueda provocarlo. |

El resto del catálogo de errores (`validation_error` para los demás campos, `subscription_name_already_exists`, `subscription_module_prerequisite_missing`, `subscription_module_not_found`, `module_check_unavailable`, `subscription_status_unchanged`, `subscription_has_clinics`, `clinics_check_unavailable`, `subscription_not_found`, `permission_denied`, los de 401 y los de 5xx) sigue igual que en la 003 y la 012.

## Ejemplo de cuerpo completo (`SubscriptionRead`, verificado contra el ejemplo del propio router de `maily-system-api`)

```json
{
  "id": 2,
  "name": "Profesional",
  "description": "Para consultorios con varios doctores que llevan expediente y recetas.",
  "subscription_type": { "id": 2, "name": "Empresarial" },
  "monthly_price": "1299.00",
  "annual_price": "12990.00",
  "trial_days": 14,
  "self_service": true,
  "module_keys": ["clinical_record_templates", "clinical_records", "patients", "prescriptions", "reminders", "scheduling"],
  "other_features": ["Soporte por correo y WhatsApp", "Capacitación inicial en línea"],
  "consulting_rooms_limit": 2,
  "doctors_limit": 3,
  "assistants_limit": 2,
  "new_patients_per_year_limit": 15000,
  "status": { "id": 1, "name": "Activa" },
  "clinics_count": 0,
  "created_at": "2026-10-23T15:00:00Z",
  "updated_at": "2026-10-23T15:00:00Z"
}
```

## Ejemplo de cuerpo de creación (`SubscriptionCreate`, parcial: solo el campo nuevo junto a uno ya existente)

```json
{
  "name": "Profesional",
  "subscription_type_id": 2,
  "monthly_price": "1299.00"
}
```

## Validación en el cliente y simulador de pruebas

Igual que la 003 y la 012 (Zod a mano en `features/subscriptions/schemas`, MSW con un simulador con estado), ampliado con las reglas de esta página (research D6): el simulador agrega `subscription_type_id` al modelo guardado (por defecto `1`) y reproduce tanto la obligatoriedad al crear como la inmutabilidad al actualizar, para que una prueba que intentara enviar el campo en un `PATCH` reciba el mismo rechazo que daría la API real.
