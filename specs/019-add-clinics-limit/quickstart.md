# Guía de validación: Límite de clínicas por tipo y ajustes visuales del formulario

**Feature**: `019-add-clinics-limit` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Parte de [../018-add-subscription-type/quickstart.md](../018-add-subscription-type/quickstart.md): Auth0, las cuentas, el permiso `subscriptions:*` y el resto del formulario no cambian y no se repiten aquí.

**Importante — a diferencia de las guías anteriores de esta sección**: la API real de suscripciones todavía no implementa `clinics_limit` (contracts/subscriptions-service.md). Por eso esta guía no incluye un paso de SQL contra la base de datos real de `maily-system-api`: la validación de esta feature se hace contra el simulador de pruebas (MSW) del propio Backoffice, que sí reproduce la regla completa (research D4 del plan). Cuando la API real publique `007-add-clinics-limit`, esta guía debe ampliarse con el paso equivalente de la 018 (datos de prueba por SQL contra la base real).

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 a la 018 | Ver sus quickstart; en particular, el tipo de suscripción ya funcionando (018). |
| Dependencias | Ninguna nueva: `npm ci` basta (research D1: `Switch` y `TextField` ya están en uso). |

## 1. Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## 2. Escenarios de validación

Se entra con A1 (todos los permisos de suscripciones), salvo que se indique otra cuenta. Los escenarios de detalle y edición usan el catálogo de prueba ya sembrado por el simulador (`defaultCatalog`/`quickstartCatalog`), donde todas las suscripciones son Individuales por defecto salvo que se indique lo contrario.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| Y1 | US2-1, US3-1, FR-006, FR-007 | Abrir «Nueva suscripción». | El tipo de suscripción se ve como un interruptor de una sola línea (no dos tarjetas), apagado, con el nombre y la explicación de Individual; Autoconsumo aparece activado. |
| Y2 | US1-1, FR-001 | En el mismo formulario, sin tocar nada. | El límite de clínicas muestra 1 y está deshabilitado. |
| Y3 | US1-2, US2-2, FR-002, FR-006 | Activar el interruptor de tipo. | El tipo pasa a Empresarial (el interruptor y su explicación cambian); el límite de clínicas se habilita y sigue mostrando 1. |
| Y4 | US1-3, SC-004 | Con el tipo en Empresarial, cambiar el límite de clínicas a 25, completar el resto del formulario con datos válidos y guardar. | La suscripción se crea con límite de clínicas 25. |
| Y5 | US1-4, SC-002 | Con el tipo en Empresarial, probar el límite de clínicas en 0, en 101 y vacío, intentando guardar cada vez. | En los tres casos, un error junto al campo y la suscripción no se crea. |
| Y6 | US1-5 | Con el tipo en Empresarial y el límite en 25, desactivar el interruptor (volver a Individual) y volver a activarlo. | Al volver a Individual, el límite muestra 1 y se deshabilita; al volver a Empresarial, el límite muestra 1 otra vez (no 25). |
| Y7 | US1-6, US1-7, FR-005 | Crear una suscripción Individual y otra Empresarial con límite 40; abrir el detalle de cada una. | La Individual muestra límite de clínicas 1; la Empresarial muestra 40. |
| Y8 | US1-8, FR-004 | Editar la suscripción Empresarial de Y7: cambiar su límite de clínicas a 60 y guardar. | El nuevo límite (60) se guarda y se refleja en el detalle. |
| Y9 | US1-9, FR-004 | Editar la suscripción Individual de Y7: el límite de clínicas se ve fijo en 1 y deshabilitado; cambiar solo el nombre y guardar. | El nombre cambia; `clinics_limit` nunca aparece en la solicitud enviada. |
| Y10 | US3-2 a US3-4, FR-007 | Crear una suscripción sin tocar Autoconsumo y guardar; crear otra desactivándolo antes de guardar; abrir la edición de una suscripción existente. | La primera se crea con autoconsumo activado; la segunda, desactivado; la edición muestra el valor real de esa suscripción, no el nuevo valor por defecto del alta. |
| Y11 | FR-008, constitución VI | Recorrer el interruptor de tipo y el límite de clínicas solo con teclado y con un lector de pantalla, habilitado y deshabilitado. | El interruptor se opera como cualquier `Switch` ya validado (Autoconsumo); el límite de clínicas deshabilitado se anuncia como tal, con su texto explicativo asociado. |

Los escenarios de la 018 (X1 a X8) y los anteriores (V, W) siguen aplicando sin cambios a lo que no toca esta feature.
