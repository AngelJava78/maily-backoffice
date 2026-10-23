# Contrato consumido: API de suscripciones (ampliación)

**Feature**: `012-configure-subscription-plans` | **Fecha**: 2026-10-23 | **Spec**: [../spec.md](../spec.md)

Actualiza [../../003-manage-subscription-types/contracts/subscriptions-service.md](../../003-manage-subscription-types/contracts/subscriptions-service.md) con lo que cambió en el contrato desde entonces. Verificado el 2026-10-23 leyendo directamente el código fuente vigente del repositorio `maily-system-api` (copia local `C:\Maily\code\maily-system-api`): `src/models/subscription.py`, `src/dtos/subscription.py`, `src/routers/subscriptions.py` y `src/clinic_modules.py`. Las seis operaciones (S1 a S6), las condiciones generales (token, permisos, orden de comprobaciones, estatus, concurrencia, paginación, CORS) y los campos `name`, `description`, `monthly_price`, `status`, `clinics_count`, `created_at` y `updated_at` siguen exactamente como en la 003: no se repiten aquí.

## Campos nuevos de `SubscriptionRead`, `SubscriptionCreate` y `SubscriptionUpdate`

| Campo | Tipo en el DTO | Regla | En `SubscriptionCreate` | En `SubscriptionUpdate` |
|---|---|---|---|---|
| `annual_price` | `Decimal` (texto con dos decimales al leer) | De 0 a 99 999 999,99, con hasta dos decimales (número o texto); independiente de `monthly_price`, sin proporción obligatoria | Obligatorio | No puede ser `null`; si se envía, lo cambia |
| `trial_days` | entero | De 0 a 3650; `0` = sin periodo de prueba | Opcional, por defecto `0` | No puede ser `null` |
| `self_service` | booleano | Si el plan está en autoconsumo en el portal de MailySoft | Opcional, por defecto `false` | No puede ser `null` |
| `module_keys` | lista de texto | Siempre incluye `"patients"`, se envíe o no; cada clave adicional se valida contra el catálogo de módulos de clínica de la API de usuarios (`GET /api/v1/modules?type_id=2&status_id=1`) y contra las dependencias de la tabla siguiente | Opcional, por defecto `[]` (equivale a solo `patients`) | No puede ser `null`; sustituye al conjunto completo |
| `other_features` | lista de texto | Sustituyó a `features`; de 0 a 20 elementos de 1 a 150 caracteres cada uno, en el orden enviado | Opcional, por defecto `[]` | No puede ser `null`; sustituye a la lista completa |
| `consulting_rooms_limit` | entero | De 0 a 1 000 000 | Obligatorio | No puede ser `null` |
| `doctors_limit` | entero | De 0 a 1 000 000 | Obligatorio | No puede ser `null` |
| `assistants_limit` | entero | De 0 a 1 000 000 | Obligatorio | No puede ser `null` |
| `new_patients_per_year_limit` | entero | De 0 a 1 000 000 | Obligatorio | No puede ser `null` |

`SubscriptionCreate` y `SubscriptionUpdate` siguen sin admitir campos desconocidos ni de solo lectura (`extra: "forbid"`); el campo `features` ya no existe en ninguno de los dos y, si se envía, la API lo rechaza como campo no permitido.

## Dependencias entre módulos (regla propia de esta API, no de la API de usuarios)

| Módulo dependiente | Requiere |
|---|---|
| `reminders` | `scheduling` |
| `clinical_record_templates` | `clinical_records` |
| `prescriptions` | `clinical_records` |
| `billing` | `finance` |

`patients` no tiene requisito y no puede excluirse. Un `module_keys` que incluya un dependiente sin su requisito se rechaza (ver Errores). El catálogo de las nueve claves reconocidas y esta tabla están reproducidos en el frontend como contenido fijo (research D3 de este plan, [`clinicModuleCatalog.ts`](../data-model.md)); si la API de suscripciones ampliara su catálogo o sus dependencias, esta feature debe revisarse.

## Errores nuevos

Se agregan al catálogo de la 003 (mismo cuerpo uniforme `{ code, message, errors? }`; la interfaz nunca muestra `message` ni los textos de `errors`):

| `code` | Estado | Operación | Cómo lo trata la interfaz |
|---|---|---|---|
| `subscription_module_prerequisite_missing` | 409 | S3, S4 | Error junto a la sección «Módulos incluidos» (research D10). En el uso normal del formulario no debería producirse, porque el propio formulario arrastra el requisito al marcar un dependiente (FR-009); solo llega por una carrera con un cambio del catálogo de módulos. |
| `subscription_module_not_found` | 422 | S3, S4 | Igual: error junto a «Módulos incluidos». Ocurre si una clave de `module_keys` ya no es un módulo de clínica vigente en la API de usuarios. |
| `module_check_unavailable` | 503 | S3, S4 | Aviso genérico con la acción disponible de nuevo (como `authorization_unavailable`); no cambió nada. |

El resto del catálogo de errores (`validation_error`, `subscription_name_already_exists`, `subscription_status_unchanged`, `subscription_has_clinics`, `clinics_check_unavailable`, `subscription_not_found`, `permission_denied`, los de 401 y los de 5xx) sigue igual que en la 003; `validation_error` ahora también puede traer `errors[].field` con cualquiera de los ocho campos nuevos, que la interfaz asocia a su propio campo del formulario (data-model.md).

## Ejemplo de cuerpo completo (`SubscriptionRead`, verificado contra el ejemplo del propio router)

```json
{
  "id": 2,
  "name": "Profesional",
  "description": "Para consultorios con varios doctores que llevan expediente y recetas.",
  "monthly_price": "1299.00",
  "annual_price": "12990.00",
  "trial_days": 14,
  "self_service": true,
  "module_keys": [
    "clinical_record_templates", "clinical_records", "patients",
    "prescriptions", "reminders", "scheduling"
  ],
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

`module_keys` llega ordenado alfabéticamente (lo dice el propio DTO); el frontend lo recorre en el orden de `CLINIC_MODULE_ORDER` (FR-007), no en el orden que envía la API.

## Validación en el cliente y simulador de pruebas

Igual que la 003 (Zod a mano en `features/subscriptions/schemas`, MSW con un simulador con estado), ampliado con las reglas de esta página (research D9): el simulador importa el catálogo fijo de módulos y sus dependencias del propio código de producción (`clinicModuleCatalog.ts`), para no mantener una segunda copia del catálogo en las pruebas.
