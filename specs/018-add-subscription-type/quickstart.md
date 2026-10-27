# Guía de validación: Tipo de suscripción (Individual o Empresarial)

**Feature**: `018-add-subscription-type` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Parte de [../003-manage-subscription-types/quickstart.md](../003-manage-subscription-types/quickstart.md) y [../012-configure-subscription-plans/quickstart.md](../012-configure-subscription-plans/quickstart.md): Auth0, el servicio de usuarios, las cuentas A1 a A9, el permiso `subscriptions:*` y el catálogo de prueba con precio anual, módulos, límites y otras funcionalidades no cambian y no se repiten aquí. Esta guía solo cubre lo que agrega esta feature: el tipo de cada suscripción de prueba y los escenarios propios.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 a la 012 | Ver sus quickstart; en particular, `VITE_SUBSCRIPTIONS_API_URL` ya configurada. |
| API de suscripciones al día, con la migración del tipo aplicada | El contrato ya está implementado en `maily-system-api` (feature `006-add-subscription-type`, commit `3faf696`, verificado el 2026-10-26). Si la base de datos local de esa API se creó antes de ese commit, hay que aplicar su migración nueva antes de probar esta feature: desde la carpeta de la API, `alembic upgrade head` (crea `subscription_types`, la siembra con Individual/Empresarial y agrega `subscription_type_id` a `subscriptions` con `DEFAULT 1`). |
| Dependencias | Ninguna nueva: `npm ci` basta (research D1/D3: `ToggleButtonGroup` ya está en `@mui/material`). |

## 1. Catálogo de prueba (ajusta el tipo de algunas suscripciones del paso 1 de la 012)

Las suscripciones que ya existían quedan en `subscription_type_id = 1` (Individual) por el valor por defecto de la columna. Para poder probar las dos opciones, desde la carpeta de la API, en su base `maily_system`:

```sql
BEGIN;

-- Confirma el catálogo sembrado por la migración.
SELECT id, name FROM subscription_types ORDER BY id;
-- 1 | Individual
-- 2 | Empresarial

-- "Empresarial" (del paso 1 de la 012) pasa a tipo Empresarial; el resto queda Individual.
UPDATE subscriptions SET subscription_type_id = 2 WHERE name = 'Empresarial';

COMMIT;

SELECT s.id, s.name, t.id AS type_id, t.name AS type_name
FROM subscriptions s JOIN subscription_types t ON t.id = s.subscription_type_id
WHERE s.status_id <> 4 ORDER BY s.id;
```

## 2. Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## 3. Escenarios de validación

Se entra con A1 (todos los permisos de suscripciones), salvo que se indique otra cuenta.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| X1 | US1-1, FR-001, FR-002 | Abrir «Nueva suscripción». | El control de tipo muestra Individual y Empresarial, cada una con su nombre y su explicación («Médico independiente con un solo consultorio.» / «Empresa con varias clínicas y varios consultorios por clínica.»), con Individual ya marcado. |
| X2 | US1-3, FR-001, SC-002 | Completar el resto del formulario de alta con datos válidos sin tocar el control de tipo, y guardar. | La suscripción se crea, el operador llega a su detalle con notificación de éxito, y el detalle muestra «Individual». |
| X3 | US1-2, US1-4, FR-003, SC-001 | «Nueva suscripción»: cambiar el control a Empresarial, completar el resto con datos válidos y guardar. | La suscripción se crea con tipo Empresarial (visible en su detalle); repetir eligiendo Empresarial y volviendo a Individual antes de guardar confirma que solo queda marcada la última opción elegida. |
| X4 | US2-1, FR-006 | Abrir el detalle de «Profesional» (Individual) y el de «Empresarial» (Empresarial, tras el paso 1). | Cada uno muestra su tipo junto con el resto de sus datos. |
| X5 | US2-2, US2-3, FR-004, FR-005 | Editar «Profesional»: revisar el control de tipo, cambiar solo el nombre a «Profesional QA» y guardar. | El control muestra «Individual» marcado y deshabilitado, con el texto de que el tipo no se puede modificar después de creada; tras guardar, el tipo sigue siendo Individual. |
| X6 | US2-4, SC-005 | Abrir el detalle de una suscripción creada antes de esta función (cualquiera del catálogo de la 012 que no se haya tocado en el paso 1). | Muestra un tipo válido (Individual, el valor por defecto), nunca un dato vacío ni «No disponible». |
| X7 | US1-5, FR-007 (requiere ajustar el simulador o la base de datos para forzar el caso) | Con un identificador de tipo que no exista en el catálogo al momento de guardar (por ejemplo, simulando `subscription_type_not_found`). | El operador ve el motivo junto al control de tipo, conserva el resto de los datos capturados y la suscripción no se crea. |
| X8 | FR-008 | Recorrer el control de tipo en el alta y en la edición solo con teclado y con un lector de pantalla. | El grupo se anuncia como «Tipo de suscripción»; cada opción se identifica por su texto; en la edición, deshabilitado y con su texto explicativo asociado. |

Los escenarios de la 003 (V1 a V27) y de la 012 (W1 a W15) siguen aplicando sin cambios a lo que no toca esta feature.
