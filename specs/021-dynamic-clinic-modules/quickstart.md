# Guía de validación: Catálogo dinámico de módulos de clínica en alta y edición de suscripciones

**Feature**: `021-dynamic-clinic-modules` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Esta feature consume `GET /api/v1/modules?type_id=2&status_id=1` de **MailySoft Usuarios**
(`VITE_USERS_API_URL`), no de la API de Suscripciones: es el mismo endpoint que ya usan «Módulos»
(013) y «Roles y permisos» (014). No hay ninguna migración ni seed nuevo que aplicar: el catálogo real
de módulos de clínica ya existe (el propio ejemplo del spec, con las keys `administrators` y
`appointments`, es una respuesta real de ese endpoint).

## Requisitos previos

| Requisito | Detalle |
|---|---|
| `mailySoft-usuarios` y `maily-system-api` corriendo en local | Los mismos servicios ya usados por el resto de Suscripciones (003 a 020). |
| Cuenta A1 (Administrator) | Permisos de `subscriptions:*` y, para el paso 1 (opcional), `modules:*`. |
| Catálogo de módulos de clínica | Al menos dos módulos activos de tipo Clínica ya sembrados en el backend (ya existen; el propio ejemplo del spec lo confirma). Si se quiere probar el caso vacío o el de un módulo que desaparece (pasos 1 y 2), se necesita poder desactivar uno desde `/modules`. |
| Dependencias | Ninguna nueva: `npm ci` basta. |

## 1. (Opcional) Preparar los casos de borde, desde la propia UI de Módulos

Sin tocar la base de datos directamente: `/modules` (013-manage-modules) ya permite crear y bloquear
módulos de tipo Clínica.

- Para el escenario Z6 (catálogo vacío): bloquear temporalmente, desde `/modules`, todos los módulos
  de tipo Clínica que estén activos (se reactivan después, al terminar la validación).
- Para el escenario Z7 (una suscripción con un módulo ya obsoleto): bloquear uno que una suscripción de
  prueba ya tenga marcado (verificarlo primero en su edición, antes de bloquearlo).

## 2. Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## 3. Escenarios de validación

Se entra con A1, salvo que se indique otra cuenta.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| Z1 | US1, FR-001, FR-003, FR-004 | Abrir «Nueva suscripción» (`/subscriptions/new`) y ver la sección de módulos incluidos. | Los módulos mostrados coinciden exactamente con los módulos de tipo Clínica activos en `/modules` en ese momento, en el mismo orden (de menor a mayor `sort_order`), con el nombre y la descripción que `/modules` les tiene asignados. |
| Z2 | US1, FR-007 | En esa misma pantalla, intentar desmarcar el módulo de Pacientes (key `patients`). | No se puede: permanece marcado. Los demás módulos se pueden marcar y desmarcar libremente, sin que eso afecte a ningún otro (FR-008: ya no hay dependencias entre ellos). |
| Z3 | US1, FR-006 | Marcar dos o tres módulos cualquiera, llenar el resto del formulario y guardar. | La suscripción se crea; al abrir su edición, esos mismos módulos (más Pacientes) aparecen marcados. |
| Z4 | US2, FR-002, FR-003, FR-004 | Abrir la edición de una suscripción existente (`/subscriptions/{id}/edit`). | La misma sección de módulos, con el catálogo vigente de `/modules`, en su orden; los módulos que la suscripción ya tenía habilitados aparecen marcados. |
| Z5 | US2, FR-009 (requiere el paso 1, caso de un módulo obsoleto) | Abrir la edición de la suscripción cuyo módulo se bloqueó en el paso 1, sin volver a activarlo, y guardar sin tocar la sección de módulos. | Ese módulo no aparece como opción marcable. Tras guardar, la suscripción ya no lo incluye. |
| Z6 | Edge case, FR-012 (requiere el paso 1, caso vacío) | Con todos los módulos de clínica bloqueados, abrir el alta o la edición de una suscripción. | La sección de módulos muestra un mensaje de que no hay módulos disponibles, en vez de una lista vacía sin explicación; el botón «Guardar» está deshabilitado. Reactivar los módulos al terminar. |
| Z7 | FR-010, FR-011 | Con la red del navegador en modo «Sin conexión» (herramientas de desarrollo) antes de abrir el alta o la edición, y luego reconectar y pulsar «Reintentar». | Mientras el catálogo no carga: un indicador de carga primero y, si la solicitud falla, un estado de error con un botón de reintentar; «Guardar» deshabilitado en ambos casos. Al reconectar y reintentar, el catálogo carga y «Guardar» se habilita. |
| Z8 | US1 (Vista previa) | En «Nueva suscripción», marcar y desmarcar módulos y observar el panel «Vista previa» al costado. | La lista de módulos incluidos/no incluidos de la Vista previa coincide en todo momento con lo marcado en el formulario, con los mismos nombres del catálogo vigente (nunca un módulo que el catálogo ya no ofrece, nunca uno marcado que no aparezca ahí). |
| Z9 | Constitución VI (accesibilidad) | Recorrer la sección de módulos con un lector de pantalla y solo con teclado, en los tres estados (cargando, con datos, con error). | El lector de pantalla anuncia cada casilla con su nombre y, en el caso de Pacientes, que está deshabilitada; el indicador de carga y el estado de error se anuncian; toda la sección se opera completa por teclado. |

Los escenarios de la 001 a la 020 siguen aplicando sin cambios a lo que no toca esta feature: el
Comparativo de suscripciones y el detalle de una suscripción siguen mostrando el catálogo fijo de
siempre (research D3 del plan), no el dinámico de esta feature.
