# Contrato de la interfaz: pestañas, formulario y Comparativo de Suscripciones

**Feature**: `012-configure-subscription-plans` | **Fecha**: 2026-10-23 | **Spec**: [../spec.md](../spec.md)

Amplía [../../003-manage-subscription-types/contracts/app-routes.md](../../003-manage-subscription-types/contracts/app-routes.md), que sigue vigente en lo que no se menciona aquí: las cuatro rutas (`/subscriptions`, `/subscriptions/new`, `/subscriptions/:subscriptionId`, `/subscriptions/:subscriptionId/edit`), la guarda de permisos, el estado de navegación (`listSearch`), las acciones del detalle (Editar, Cambiar estatus, Eliminar) y sus diálogos, y la accesibilidad general. No hay rutas nuevas (research D6).

## Pestañas del listado (`/subscriptions`)

| Pestaña | Valor en la URL (`?tab=`) | Por defecto | Contenido |
|---|---|---|---|
| Listado | `list` (se omite de la URL) | Sí | Exactamente el listado de la 003 (Data Grid paginado, columnas nombre/precio mensual/estatus/clínicas, orden fijo). |
| Comparativo | `comparison` | No | La matriz de esta página, más abajo. |

Cambiar de pestaña no dispara ninguna consulta nueva (research D6, FR-019, SC-005): ambas leen el mismo catálogo ya obtenido. `page` y `page_size` se conservan al cambiar de pestaña. Un valor de `tab` que no es `list` ni `comparison` se trata como `list` (igual que un `page` inválido en la 003).

## Comparativo: estados

| Estado | Qué se ve |
|---|---|
| Cargando | El mismo indicador que ya usa el listado mientras `useSubscriptionCatalog` no tiene datos. |
| Vacío | «No hay suscripciones registradas» con «Nueva suscripción» (solo si puede crear); igual que el listado. |
| Error | Bloque de error con «Reintentar»; igual que el listado. |
| Éxito | La matriz: una columna por suscripción vigente, en el orden fijo del listado (FR-018), con desplazamiento horizontal si no caben todas. |

## Comparativo: estructura de la matriz

| Bloque | Contenido por columna |
|---|---|
| Encabezado | Nombre; etiqueta «Autoconsumo» o «A la medida» (`selfService`); descripción; precio del periodo elegido por el control «Ver precios» (más abajo), con la leyenda de ahorro si aplica (FR-005); etiqueta de estatus. |
| Fila «Acciones» | «Editar» (enlace a `/subscriptions/:id/edit`), solo si el operador tiene `subscriptions:update` (FR-021); si nadie tiene el permiso, la fila no aparece. |
| Sección «Módulos» | Una fila por cada una de las nueve claves de `CLINIC_MODULE_ORDER` (nombre visible, tabla de nombres más abajo); una marca (✓, con texto para lectores de pantalla) si `moduleKeys` la incluye, un guion si no. |
| Sección «Límites de la clínica» | Una fila por `consultingRoomsLimit`, `doctorsLimit`, `assistantsLimit` y `newPatientsPerYearLimit`, con su número por columna. |
| Sección «Otras funcionalidades» | Una fila «Incluye» con la lista de `otherFeatures` de cada columna (o nada si está vacía). |
| Sección «Otros» | «Días de prueba» (oculto si `trialDays` es 0, igual que en el detalle) y «Clínicas con el plan» (`clinicsCount`, o «No disponible»). |
| Pie | «Precios simulados en pesos mexicanos, antes de IVA.» (texto fijo, no un dato de la API). |

Control «Ver precios»: `PriceCycleToggle` (Mensual/Anual), estado local del Comparativo, siempre empieza en Mensual (research D8); cambiarlo solo repinta el precio y la leyenda de ahorro del encabezado.

## Módulos: nombre, descripción y requisito (FR-007; `messages.subscriptions.modules.catalog`)

| Clave | Nombre | Descripción | Requiere |
|---|---|---|---|
| `patients` | Pacientes | Directorio de pacientes y sus datos de contacto. | — (siempre incluido) |
| `scheduling` | Agenda y citas | Calendario por doctor y consultorio; citas y confirmaciones. | — |
| `reminders` | Recordatorios | Avisos de cita por WhatsApp, SMS o correo. | Agenda y citas |
| `clinical_records` | Expediente clínico | Historia clínica, notas de consulta y archivos. | — |
| `clinical_record_templates` | Plantillas de expediente | Plantillas de preguntas de MailySoft que el doctor usa al abrir el expediente de un paciente. | Expediente clínico |
| `prescriptions` | Recetas | Recetas en PDF con los datos del doctor. | Expediente clínico |
| `finance` | Finanzas | Cobros, caja y gastos de la clínica. | — |
| `reports` | Reportes | Indicadores de citas, ingresos y pacientes. | — |
| `billing` | Facturación | Facturas CFDI para los pacientes. | Finanzas |

## Formulario (alta y edición): secciones nuevas

Amplía la tabla «Formulario (alta y edición)» de la 003 (Nombre, Descripción y Precio mensual no cambian).

| Campo o sección | Control | Ayuda | Errores |
|---|---|---|---|
| Precio anual | Texto con «$» delante y «/año» detrás; `inputMode="decimal"` | «Ahorro de $X (Y %) frente a 12 pagos mensuales de $Z.» cuando hay ahorro (FR-005); si no, sin leyenda | «El precio anual es obligatorio.»; «Escribe un importe de 0 a 99,999,999.99 solo con números y hasta dos decimales.» |
| Días de prueba | Numérico, `inputMode="numeric"` | «0 = sin periodo de prueba.» | «Escribe un número entero de 0 a 3650.» |
| Autoconsumo en el portal de MailySoft | `Switch` | «Activada: aparece en el portal de MailySoft y cualquier clínica puede contratarla por su cuenta.» | — |
| Módulos incluidos | `Checkbox` por cada uno de los nueve (tabla de arriba); «Pacientes» deshabilitado y marcado, con «Siempre incluido»; cada dependiente muestra «Requiere <módulo>» junto a su nombre | «Módulos de tipo Clínica. La clínica solo ve y usa los que marques. Marcados: N de 9.» | Un rechazo `subscription_module_prerequisite_missing` o `subscription_module_not_found` se muestra junto a esta sección (research D10) |
| Límites de la clínica: Consultorios | Numérico | «Espacios donde se da consulta; cada uno tiene su agenda.» | «Escribe un número entero de 0 a 1,000,000.» |
| Límites de la clínica: Doctores | Numérico | «Usuarios de la clínica con el rol Doctor.» | Igual |
| Límites de la clínica: Asistentes | Numérico | «Usuarios de la clínica con el rol Asistente.» | Igual |
| Límites de la clínica: Pacientes nuevos al año | Numérico | «Pacientes que puede registrar toda la clínica cada año, sin importar cuántos doctores tenga.» | Igual |
| Otras funcionalidades | Antes «Lo que incluye»: mismo grupo con un campo por elemento, «Agregar funcionalidad» y el contador «N de 20» | «Lo que ofrece el plan sin ser un módulo del sistema, como soporte o capacitación. Se muestran en este orden, hasta 20.» | Mismos mensajes que «Lo que incluye» en la 003, con el nuevo nombre del campo |

## Panel «Vista previa» (FR-014; a la derecha del formulario, como en el mockup)

| Elemento | Contenido |
|---|---|
| Control «Mensual / Anual» | `PriceCycleToggle` propio, estado local, empieza en Mensual (research D8); independiente del de la pestaña Comparativo. |
| Encabezado | Nombre (o el marcador de posición si está vacío); etiqueta «Autoconsumo»/«A la medida»; descripción. |
| Precio | El del periodo elegido, con la leyenda de ahorro si aplica al precio anual. |
| Prueba | «N días de prueba», oculto si es 0. |
| Módulos | Lista de los marcados, por su nombre, en el orden de `CLINIC_MODULE_ORDER`; debajo, «No incluye: <los no marcados, separados por coma>» (vacío si los nueve están marcados). |
| Límites | «Podrá dar de alta» con los cuatro valores capturados. |
| Otras funcionalidades | La lista capturada, en el orden de captura. |

Se actualiza con cada cambio del formulario, sin pedir nada a la plataforma (es el mismo estado que React Hook Form ya tiene).

## Detalle: datos nuevos

Amplía la tabla «Datos y formatos» de la 003 (Nombre, Descripción, Precio mensual, Estatus, Clínicas y Fechas no cambian).

| Dato | Detalle | Formato |
|---|---|---|
| Precio anual | «$12,990.00/año», con la leyenda de ahorro si aplica | `formatMxn` + «/año» (FR-005) |
| Días de prueba | «N días de prueba», u omitido si es 0 | — |
| Autoconsumo | Etiqueta «Autoconsumo» o «A la medida» | Junto al nombre, como en el mockup |
| Módulos incluidos | Lista de los incluidos por su nombre; debajo, «No incluye: …» con los demás (nada si incluye los nueve) | Orden de `CLINIC_MODULE_ORDER` |
| Límites de la clínica | Los cuatro valores, con su etiqueta | Enteros, sin decimales |
| Otras funcionalidades | Antes «Lo que incluye»: misma lista, mismo formato, nuevo nombre | — |

## Accesibilidad (amplía a la 003)

- El `Tabs` Listado/Comparativo sigue el patrón estándar de MUI (`role="tablist"`, flechas para moverse, `aria-selected`); el panel activo es la única región con contenido interactivo.
- En el Comparativo, la marca y el guion de cada módulo llevan un texto para lectores de pantalla («Incluido»/«No incluido»), no solo el símbolo; la tabla se desplaza horizontalmente dentro de su propio contenedor, igual que el listado (WCAG 1.4.10 exceptúa las tablas de datos).
- El grupo «Módulos incluidos» es un `fieldset` con su `legend`, como ya es «Lo que incluye» en la 003; marcar un dependiente anuncia (`aria-live="polite"`, el mismo contador «Marcados: N de 9») que su requisito también quedó marcado.
- El panel «Vista previa» es una región con un título propio (`aria-label` o encabezado visible «Vista previa»), para que se distinga del formulario al navegar por regiones.
