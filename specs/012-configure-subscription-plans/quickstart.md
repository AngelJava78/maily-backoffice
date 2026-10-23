# Guía de validación: Planes de suscripción (precio anual, módulos, límites y comparativo)

**Feature**: `012-configure-subscription-plans` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Parte de [../003-manage-subscription-types/quickstart.md](../003-manage-subscription-types/quickstart.md): Auth0, el servicio de usuarios, las cuentas A1 a A9, el permiso `subscriptions:*` (su paso 1) y la simulación de clínicas (su paso 3) no cambian y no se repiten aquí. Esta guía solo cubre lo que agrega esta feature: el catálogo de prueba con los campos nuevos y los escenarios propios.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001, la 002 y la 003 | Ver su quickstart; en particular, `VITE_SUBSCRIPTIONS_API_URL` ya configurada (obligatoria desde la 003, sin cambios aquí). |
| API de suscripciones al día | El contrato de esta feature ya está implementado en `maily-system-api` (verificado el 2026-10-23: `annual_price`, `trial_days`, `self_service`, `module_keys`, `other_features`, los cuatro límites). No hace falta actualizar ni migrar nada en ese repositorio para esta feature. |
| Dependencias | Ninguna nueva: `npm ci` basta (research D1). |

## 1. Catálogo de prueba (reemplaza el paso 2 de la 003: las columnas cambiaron)

`annual_price` y los cuatro límites ya no tienen valor por defecto en la base de datos: toda fila nueva debe traerlos. Desde la carpeta de la API, en su base `maily_system` (mismo acceso que el paso 2 de la 003):

```sql
BEGIN;

INSERT INTO subscriptions (
  name, description, monthly_price, annual_price, trial_days, self_service,
  module_keys, other_features, consulting_rooms_limit, doctors_limit,
  assistants_limit, new_patients_per_year_limit, status_id
) VALUES
  ('Esencial', 'Para un doctor que solo necesita su agenda.', 499, 4990, 14, true,
   ARRAY['patients', 'scheduling'], ARRAY['Soporte por correo'], 1, 1, 1, 5000, 1),
  ('Profesional', 'Para consultorios con varios doctores que llevan expediente y recetas.', 1299, 12990, 14, true,
   ARRAY['patients', 'scheduling', 'reminders', 'clinical_records', 'clinical_record_templates', 'prescriptions'],
   ARRAY['Soporte por correo y WhatsApp', 'Capacitación inicial en línea'], 2, 3, 2, 15000, 1),
  ('Avanzado', 'Clínica que además lleva sus cobros y reportes.', 2499, 24990, 14, true,
   ARRAY['patients', 'scheduling', 'reminders', 'clinical_records', 'clinical_record_templates', 'prescriptions', 'finance', 'reports'],
   ARRAY['Soporte por correo y WhatsApp', 'Capacitación inicial en línea', 'Migración de datos de otro sistema'], 5, 10, 5, 50000, 1),
  ('Empresarial', 'Hecha a la medida para clínicas grandes; se asigna desde el Backoffice.', 5999, 59990, 14, false,
   ARRAY['patients', 'scheduling', 'reminders', 'clinical_records', 'clinical_record_templates', 'prescriptions', 'finance', 'reports', 'billing'],
   ARRAY['Soporte prioritario por teléfono', 'Capacitación en sitio', 'Migración de datos de otro sistema'], 20, 40, 20, 200000, 1),
  ('Solo', 'Para el médico que trabaja por su cuenta.', 900, 9000, 0, false,
   ARRAY['patients', 'scheduling'], '{}', 1, 1, 0, 5000, 2)
ON CONFLICT DO NOTHING;

COMMIT;

SELECT id, name, monthly_price, annual_price, self_service, module_keys FROM subscriptions WHERE status_id <> 4 ORDER BY id;
```

Los cuatro primeros planes reproducen exactamente los del mockup del Comparativo (mismos precios, mismo ahorro del 17 %, mismos módulos); «Solo» queda Inactiva, sin autoconsumo y sin precio de prueba, para los escenarios de «A la medida», «0 días de prueba» y «sin ahorro» más abajo (su precio anual, 9000, es mayor que 12 × 900 − … en realidad 10800: si se prefiere un caso sin ahorro explícito, usar un precio anual ≥ 10800).

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
| W1 | US1-1, US1-6, FR-001, FR-018 | Abrir «Suscripciones»; ir a la pestaña «Comparativo». | «Listado» está seleccionada por defecto y se ve exactamente como en la 003; «Comparativo» muestra una columna por cada una de las cinco suscripciones del paso 1, en el orden fijo (Esencial, Profesional, Avanzado, Empresarial por precio mensual ascendente; Solo al final, único no Activa). |
| W2 | US1-3, US1-6, FR-019, SC-005 | En el Comparativo, con la pestaña Red abierta, cambiar «Ver precios» de Mensual a Anual y volver. Cambiar de «Comparativo» a «Listado» y de vuelta. | El precio y la leyenda de ahorro cambian al instante en las cuatro columnas de autoconsumo; ninguna de estas acciones genera una solicitud nueva en la pestaña Red. |
| W3 | US1-3, FR-005, SC-004 | En el Comparativo, ver el precio anual de Profesional y de Empresarial. | Profesional: «$12,990.00/año», «Ahorra 17 %», «Equivale a $1,082.50 al mes. Ahorras $2,598.00 al año.». Empresarial: «$59,990.00/año», «Ahorra 17 %», «Equivale a $4,999.17 al mes. Ahorras $11,998.00 al año.» (coincide con el mockup). |
| W4 | Edge case (ahorro no positivo) | Con el precio anual de Solo en 10800 o más (ajustar con SQL si se usó 9000), ver su precio anual en el Comparativo o en su detalle. | Se ve «$10,800.00/año» (o el valor usado) sin ninguna etiqueta ni leyenda de ahorro. |
| W5 | US1-2, US1-5, FR-002, FR-003 | Abrir el detalle de Profesional. | Además de lo de la 003: «$12,990.00/año» con su leyenda de ahorro, «14 días de prueba», la etiqueta «Autoconsumo», los seis módulos marcados con «No incluye: Finanzas, Reportes, Facturación», los cuatro límites (2, 3, 2, 15 000) y «Otras funcionalidades» (antes «Lo que incluye») con sus dos elementos. |
| W6 | US1-5, FR-002 | Abrir el detalle de Empresarial y de Solo. | Empresarial: etiqueta «A la medida» (no «Autoconsumo»). Solo: sin ninguna indicación de días de prueba (0). |
| W7 | US2-1 a US2-3, FR-007, FR-008 | «Nueva suscripción»: revisar la sección «Módulos incluidos» sin tocar nada. | «Pacientes» aparece marcado y deshabilitado con «Siempre incluido»; los otros ocho, sin marcar, con su descripción; Recordatorios, Plantillas de expediente, Recetas y Facturación muestran «Requiere <módulo>»; el contador dice «Marcados: 1 de 9». |
| W8 | US2-4, US2-5, FR-009, SC-003 | Marcar «Recordatorios» sin haber marcado «Agenda y citas»; después desmarcar «Agenda y citas». | Al marcar Recordatorios, «Agenda y citas» se marca también y el contador sube a 3; al desmarcar «Agenda y citas», «Recordatorios» se desmarca también y el contador baja a 1. Repetir con Facturación/Finanzas y con Plantillas de expediente y Recetas/Expediente clínico da el mismo resultado. |
| W9 | US2-2, US2-6, FR-012, FR-014, SC-001 | Completar el alta: nombre «QA Plan 012», precio mensual 1000, precio anual 9996 (sin ahorro: dejarlo así a propósito), 7 días de prueba, autoconsumo activado, los módulos Pacientes + Agenda y citas + Recordatorios, límites 1/2/1/3000, y una funcionalidad «Prueba QA». Revisar la vista previa en cada paso y guardar. | La vista previa refleja cada cambio sin recargar nada; tras guardar, «Suscripción creada.», el detalle muestra exactamente esos datos y la suscripción aparece en el listado y en el Comparativo. |
| W10 | US2-9, FR-010 | En el alta, dejar vacíos el precio anual y los cuatro límites, o escribir 3651 en días de prueba, o 1000001 en un límite. | Error junto a cada campo afectado; no se crea nada. |
| W11 | US3-1 a US3-3, FR-017 | Editar «QA Plan 012» de W9: subir el límite de doctores a 5 y agregar el módulo «Expediente clínico». Guardar. | El formulario trae los valores de W9 precargados (incluidos los módulos marcados); tras guardar, el detalle muestra el nuevo límite y el módulo agregado, y el resto de los datos no cambió. |
| W12 | US3-4 | Editar «QA Plan 012» sin cambiar nada (ni datos generales, ni módulos, ni límites, ni otras funcionalidades) y guardar. | «No había cambios que guardar.»; ningún `PATCH` en la pestaña Red. |
| W13 | Edge case, research D10 | Con dos pestañas en el alta o la edición de la misma suscripción: en la 1, dejar marcado un módulo con requisito; en la 2, quitar ese requisito de la misma suscripción y guardar primero; en la 1, guardar después. | El segundo guardado (el de la pestaña 1) recibe el rechazo `subscription_module_prerequisite_missing` (simulado) y lo muestra junto a «Módulos incluidos»; no se guarda nada y los demás datos capturados en el formulario se conservan. |
| W14 | US1-9, FR-021 | Con A3 (Billing, solo `subscriptions:read`), abrir el Comparativo. | No aparece la fila «Editar» en ninguna columna. |
| W15 | FR-023 | Recorrer el Comparativo y el formulario completo a 1024 px y a 320 px, y solo con teclado. | El Comparativo se desplaza horizontalmente dentro de su propio recuadro, sin mover la página; el `Tabs` y el grupo de módulos se operan con teclado; todos los textos están en español. |

Los escenarios de la 003 (V1 a V27) siguen aplicando sin cambios a lo que no toca esta feature (paginación, cambio de estatus, eliminación, permisos base).

## 4. Comprobaciones automatizadas

Mismos comandos que en la 003 (sin cambios):

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run size
npm run test:e2e
```

## Problemas frecuentes (además de los de la 003)

| Síntoma | Causa probable | Solución |
|---|---|---|
| El `INSERT` del paso 1 falla con «null value in column annual_price» (o en un límite) | Se usó el `INSERT` antiguo de la 003, sin las columnas nuevas | Usar el `INSERT` de esta guía: esas columnas ya no tienen valor por defecto en la base de datos. |
| Un alta o una edición se rechaza con «El módulo «X» no es reconocido…» | El catálogo fijo del frontend (`CLINIC_MODULE_ORDER`) quedó desincronizado del catálogo real de módulos de clínica de la API de usuarios | Revisar research D3: si el catálogo cambió, esta feature debe revisarse. |
| La vista previa no muestra el ahorro anual aunque el precio anual sea menor que 12 mensualidades | El precio mensual o el anual tienen un formato inválido (coma, «$») que todavía no se guardó | Corregir el campo: `computeAnnualSavings` solo calcula con los dos precios ya válidos. |
