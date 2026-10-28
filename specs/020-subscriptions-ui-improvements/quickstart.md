# Guía de validación: Reorganización visual del formulario, el listado y el comparativo de suscripciones

**Feature**: `020-subscriptions-ui-improvements` | **Fecha**: 2026-10-27 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Parte de [../019-add-clinics-limit/quickstart.md](../019-add-clinics-limit/quickstart.md): Auth0, las cuentas, el permiso `subscriptions:*`, el simulador MSW y el resto del formulario no cambian y no se repiten aquí. No hay ningún paso de SQL contra la API real: esta feature no agrega, cambia ni repite ninguna llamada (research D8), así que toda la validación es contra el catálogo de prueba ya sembrado por el simulador del propio Backoffice.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 a la 019 | Ver sus quickstart; en particular, el límite de clínicas ya funcionando (019). |
| Dependencias | Ninguna nueva: `npm ci` basta (research: sin dependencias nuevas). |
| Catálogo de prueba | Al menos una suscripción Individual y una Empresarial vigentes (ya sembradas por el simulador), una de ellas con `clinics_limit` guardado y otra sin él (para ver «No disponible»). |

## 1. Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## 2. Escenarios de validación

Se entra con A1 (todos los permisos de suscripciones), salvo que se indique otra cuenta.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| Z1 | US1-1, US1-2, FR-001, FR-002 | Abrir «Nueva suscripción» (`/subscriptions/new`) y desplazarse hasta el final del formulario. | Una sola sección titulada «Límites» (mismo tamaño y peso que «Módulos incluidos») contiene el límite de clínicas junto con Consultorios, Doctores, Asistentes y Pacientes nuevos al año. |
| Z2 | US1-3, US1-4, FR-003 | En esa sección, con el tipo en Individual; luego cambiar el tipo a Empresarial y capturar un límite de clínicas válido junto con el resto de los límites; guardar. | El límite de clínicas se comporta exactamente igual que antes de esta feature (019): fijo en 1 y deshabilitado para Individual, editable de 1 a 100 para Empresarial; la suscripción se crea con los valores capturados. |
| Z3 | US1-5 | Abrir la edición de una suscripción existente. | La misma sección «Límites», con el límite de clínicas ya agrupado, con el mismo comportamiento de solo lectura o edición según el tipo. |
| Z4 | US2-1, US2-3 a US2-6, FR-004, FR-005 | Abrir el listado (`/subscriptions`), con al menos una suscripción Individual y una Empresarial visibles. | Las columnas aparecen en el orden Nombre, Tipo, Clínicas, Consultorios, Precio mensual, Precio anual, Estatus; cada una muestra el dato correcto (Tipo: «Individual»/«Empresarial»; Precio anual con el mismo formato de moneda que Precio mensual). |
| Z5 | US2-2, FR-006, SC-002 | En el mismo listado, al abrirlo; luego hacer clic en el encabezado «Precio anual». | Las filas aparecen ordenadas de menor a mayor precio mensual al abrir; tras el clic, se reordenan de menor a mayor precio anual. |
| Z6 | US3-1, FR-007, SC-006 | Abrir el Comparativo (`/subscriptions?tab=comparison`). | El control para elegir Individual/Empresarial aparece antes que el control «Mensual y Anual», con el mismo patrón visual. |
| Z7 | US3-2, US3-3, US3-6, FR-008, FR-009 | Elegir Individual en el filtro nuevo; comprobar el orden de los planes; cambiar a Empresarial; cambiar el ciclo a Anual. | Con Individual, solo se ven planes Individuales, ordenados de menor a mayor precio mensual; con Empresarial, solo planes Empresariales; al cambiar a Anual, se reordenan de menor a mayor precio anual, sin recargar la página. |
| Z8 | US3-4 | Cambiar el filtro de tipo varias veces seguidas. | La tabla se actualiza de inmediato cada vez, sin recargar la página, y la selección de Mensual/Anual no cambia por sí sola. |
| Z9 | US3-5, FR-007 edge case | Dejar el filtro en un tipo sin ningún plan vigente (si el catálogo de prueba no tiene ese caso, verificarlo con las pruebas automatizadas de `/speckit-implement` en vez de a mano). | Un aviso de que no hay suscripciones de ese tipo para comparar, sin dejar la pantalla en blanco ni romper el resto del Comparativo. |
| Z10 | US4-1, US4-2, FR-010 | En el Comparativo, ver la sección «Límites de la clínica» de un plan Empresarial con límite de clínicas guardado y de otro sin él. | Una fila «Límite de clínicas», junto a Consultorios/Doctores/Asistentes/Pacientes nuevos al año, con el número guardado o «No disponible» según corresponda. |
| Z11 | US4-3, US4-4, FR-011 | Ver la sección «Módulos» de cualquier plan. | Cada celda muestra un icono (afirmativo o negativo), nunca el texto «Incluido»/«No incluido». |
| Z12 | US4-5, FR-011, constitución VI | Recorrer la sección «Módulos» con un lector de pantalla; recorrer el filtro de tipo y el ordenamiento del listado solo con teclado. | El lector de pantalla anuncia «Incluido» o «No incluido» en cada icono; el filtro de tipo y los encabezados de columna del listado se operan completos por teclado, igual que ya lo hacían «Mensual y Anual» y el resto de la grilla. |

Los escenarios de la 019 (Y1 a Y11) y los anteriores siguen aplicando sin cambios a lo que no toca esta feature.
