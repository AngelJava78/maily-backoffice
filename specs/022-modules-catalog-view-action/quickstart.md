# Quickstart: Módulos de suscripción según el catálogo de la API y acción «Ver» editable

**Feature**: `022-modules-catalog-view-action` | **Spec**: [spec.md](spec.md) | **Datos**: [data-model.md](data-model.md)

## Prerrequisitos

- Backoffice corriendo en local (`npm run dev`), sesión iniciada como Administrador.
- API de usuarios local con al menos 18 módulos activos de tipo Clínica (los de FR-011), y alguno de
  tipo Clínica desactivado o con `active_permissions_count: 0` para los escenarios de borde.
- Al menos una suscripción guardada con módulos del catálogo vigente, y una con algún `key` que ya no
  esté en el catálogo (para Z3).

## Parte 1 — Módulos en suscripciones (US1, US3)

### Z1 — Detalle con el catálogo completo

1. Crea o abre una suscripción con los 18 módulos marcados.
2. Abre su detalle.
3. **Esperado**: los 18 aparecen listados por nombre, en el orden de `sort_order`; no hay línea "No
   incluye".

### Z2 — Comparativo con el catálogo vigente

1. Abre `/subscriptions`, pestaña Comparativo.
2. **Esperado**: una fila por cada módulo activo del catálogo de tipo Clínica, en orden de
   `sort_order`; cada suscripción marca incluido/no incluido módulo por módulo.

### Z3 — Un módulo que ya no está en el catálogo

1. Abre el detalle de la suscripción que tiene guardado un `key` ausente del catálogo vigente.
2. **Esperado**: ese `key` aparece al final de los incluidos, con la etiqueta "(no disponible)"; en el
   Comparativo, ese `key` no genera ninguna fila.

### Z4 — El catálogo falla al cargar

1. Simula una falla de `GET /api/v1/modules?type_id=2&status_id=1` (apaga la API de usuarios o usa un
   proxy que la corte).
2. Abre el detalle de una suscripción y el Comparativo.
3. **Esperado**: ambos muestran el mismo estado de error con botón de reintentar que ya usa el
   formulario de alta; el resto de los datos de la pantalla (precio, estatus, columnas) se ve igual.

### Z5 — Guardar sin bloqueo por dependencias retiradas

1. Abre el alta de una suscripción.
2. Marca Recordatorios sin marcar Agenda y citas (o Facturación sin Finanzas).
3. Guarda.
4. **Esperado**: se guarda sin ningún error.

### Z6 — Un módulo nuevo en la API aparece sin tocar código

1. Da de alta en la API de usuarios un módulo nuevo, activo, de tipo Clínica.
2. Abre el formulario de alta, el detalle de cualquier suscripción y el Comparativo (sin recargar el
   despliegue del Backoffice, solo la página).
3. **Esperado**: el módulo nuevo aparece en los tres.

## Parte 2 — Acción «Ver» en Módulos (US2)

### Z7 — Marcar «Ver» en un módulo sin permisos

1. Crea o localiza un módulo sin ningún permiso (`active_permissions_count: 0`), por ejemplo
   "overview".
2. Ábrelo para editar, marca «Ver» y guarda.
3. **Esperado**: se crea el permiso `overview:read`; el módulo queda con `active_permissions_count: 1`.

### Z8 — Guardar sin marcar ninguna acción

1. Edita el mismo módulo del Z7 (sin ningún permiso).
2. Cambia solo el nombre, sin marcar ninguna acción.
3. Guarda.
4. **Esperado**: se guarda sin error.

### Z9 — El error de FR-015

1. Edita un módulo con las cuatro acciones marcadas (por ejemplo "schedule").
2. Desmarca «Ver», dejando «Crear» marcado.
3. Intenta guardar.
4. **Esperado**: aparece "Para usar Crear, Modificar o Eliminar, marca también Ver." junto al grupo de
   acciones; el guardado no se envía.

### Z10 — Confirmación al desmarcar las cuatro

1. Edita el mismo módulo del Z9, con las cuatro acciones marcadas.
2. Desmarca las cuatro, una por una.
3. **Esperado**: cada desmarque pide la misma confirmación que ya se pedía hoy al quitar cualquier
   acción existente; al aceptar las cuatro y guardar, se eliminan los cuatro permisos.

### Z11 — «Ver» en el panel de alta

1. Abre "Nuevo módulo".
2. **Esperado**: las cuatro acciones están marcadas por defecto; desmarcar «Ver» sin desmarcar las
   otras tres muestra el mismo mensaje del Z9 al intentar guardar.

## Verificación general

- `npm run typecheck`, `npm run lint`, `npm run test` (unitarias e integración) y `npm run test:e2e`
  (si hay entorno Auth0 de pruebas) en verde.
- `npm run build` y `npm run size` dentro del presupuesto de 320 KB gzip.
