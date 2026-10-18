# Feature Specification: Administración de Tipos de Suscripción

**Feature Branch**: `003-manage-subscription-types`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Genera las especificaciones que sean necesarias." Alcance tomado de la descripción original del proyecto: "podrá administrar los tipos de suscripciones de MailySoft", donde "Administrar = Listar, Mostrar, Crear, Modificar, Eliminar".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar tipos de suscripción: listado y detalle (Priority: P1)

Un operador revisa los tipos de suscripción que ofrece MailySoft en un listado paginado y abre el detalle de cualquiera de ellos para ver sus condiciones.

**Why this priority**: Conocer la oferta vigente es la base para administrarla: antes de crear, cambiar o eliminar un tipo hay que poder ver qué existe.

**Independent Test**: Con varios tipos de suscripción registrados, abrir la sección Tipos de suscripción, recorrer el listado y abrir el detalle de uno; verificar que los datos coinciden con los registrados en la plataforma.

**Acceptance Scenarios**:

1. **Given** más de 10 tipos de suscripción registrados, **When** el operador abre la sección Tipos de suscripción, **Then** ve los primeros 10 con su nombre y sus condiciones principales, el total de tipos y controles para avanzar o retroceder de página.
2. **Given** el listado, **When** el operador elige ver 25 o 50 tipos por página, **Then** el listado se actualiza con ese tamaño y vuelve a la primera página.
3. **Given** el listado, **When** el operador selecciona un tipo de suscripción, **Then** ve su detalle con todos sus datos disponibles, y los importes y periodos aparecen con el mismo formato que en el listado.
4. **Given** el detalle de un tipo abierto desde la página 2 del listado, **When** el operador vuelve al listado, **Then** regresa a la página 2.
5. **Given** que no hay tipos de suscripción registrados, **When** el operador abre la sección, **Then** ve un estado vacío con la acción para crear uno.
6. **Given** que la plataforma no responde, **When** el operador abre la sección, **Then** ve un mensaje de error comprensible con la opción de reintentar.
7. **Given** el detalle de un tipo que ya no existe, **When** el operador intenta abrirlo, **Then** ve un mensaje de "no encontrado" con un enlace al listado.
8. **Given** una persona sin sesión, sin acceso autorizado o sin el permiso `subscriptions:read`, **When** abre directamente la dirección de la sección Tipos de suscripción, **Then** no ve ningún dato y se le aplica el flujo de acceso o de falta de permisos de la feature 001-auth-session-profile.
9. **Given** un operador que tiene `subscriptions:read` pero no `subscriptions:write`, `subscriptions:update` ni `subscriptions:delete`, **When** abre la sección Tipos de suscripción, **Then** puede consultar el listado y el detalle y no ve las acciones de crear, modificar ni eliminar.

---

### User Story 2 - Crear un tipo de suscripción (Priority: P1)

Un operador da de alta un nuevo tipo de suscripción con sus datos y condiciones comerciales.

**Why this priority**: Lanzar nuevas ofertas es parte central de la administración comercial de MailySoft y el principal motivo para tener esta sección.

**Independent Test**: Crear un tipo de suscripción con todos sus datos obligatorios y verificar que aparece en el listado y en el detalle con los valores capturados.

**Acceptance Scenarios**:

1. **Given** un operador en la sección Tipos de suscripción, **When** elige "Crear tipo de suscripción", completa los datos obligatorios y guarda, **Then** el tipo se crea, el operador ve una confirmación y el tipo aparece con los valores capturados en el listado y en el detalle.
2. **Given** datos obligatorios vacíos o valores inválidos (por ejemplo, un importe negativo o un texto donde se espera un número), **When** intenta guardar, **Then** ve el error junto a cada campo afectado y no se crea el tipo.
3. **Given** un nombre que ya usa otro tipo de suscripción, **When** intenta guardar, **Then** ve el motivo del rechazo y no se crea un duplicado.
4. **Given** que la plataforma no responde al guardar, **When** el operador guarda, **Then** ve un error con la opción de reintentar, conserva lo que escribió y el tipo no se da por creado.
5. **Given** que el operador acciona "Guardar" varias veces seguidas mientras la operación está en curso, **When** la operación termina, **Then** solo se creó un tipo de suscripción.

---

### User Story 3 - Modificar un tipo de suscripción (Priority: P2)

Un operador corrige o actualiza los datos y las condiciones de un tipo de suscripción existente.

**Why this priority**: Las ofertas evolucionan (ajustes de condiciones, correcciones); es necesario para mantener la oferta vigente, pero depende de poder crear y consultar tipos.

**Independent Test**: Editar un valor de un tipo de suscripción de prueba y verificar que el cambio se refleja en el detalle y en el listado.

**Acceptance Scenarios**:

1. **Given** el detalle de un tipo de suscripción, **When** el operador elige "Editar", **Then** ve el formulario con los valores actuales.
2. **Given** el formulario de edición, **When** el operador cambia datos válidos y guarda, **Then** los cambios se guardan, se confirma la acción y se reflejan en el detalle y en el listado.
3. **Given** el formulario de edición con cambios, **When** el operador cancela, **Then** no se guarda ningún cambio.
4. **Given** datos inválidos o un nombre duplicado, **When** el operador guarda, **Then** ve el error o el motivo del rechazo y el tipo conserva sus valores anteriores.
5. **Given** que otro operador modificó o eliminó el mismo tipo después de abrir el formulario, **When** el operador guarda, **Then** el sistema informa del conflicto o de que el tipo ya no existe y no sobrescribe en silencio.

---

### User Story 4 - Eliminar un tipo de suscripción (Priority: P3)

Un operador elimina un tipo de suscripción que MailySoft ya no ofrece.

**Why this priority**: Es una acción de alto impacto y poco frecuente; se entrega al final y con las máximas protecciones.

**Independent Test**: Eliminar un tipo de prueba confirmando el diálogo y verificar que deja de aparecer en el listado; repetir cancelando y verificar que no cambia nada.

**Acceptance Scenarios**:

1. **Given** el detalle o el listado de tipos de suscripción, **When** el operador elige "Eliminar", **Then** ve un diálogo de confirmación que nombra el tipo y ofrece confirmar o cancelar.
2. **Given** el diálogo de confirmación, **When** el operador confirma, **Then** el tipo se elimina, se confirma la acción y deja de aparecer en el listado.
3. **Given** el diálogo de confirmación, **When** el operador cancela, **Then** no cambia nada.
4. **Given** un tipo que la plataforma no permite eliminar (por ejemplo, porque está en uso), **When** el operador confirma, **Then** ve el motivo del rechazo y el tipo permanece.

---

### Edge Cases

- ¿Qué ocurre con nombres o descripciones muy largos o con caracteres especiales? Se aceptan según las reglas de la plataforma; en el listado el texto largo se acorta sin romper el diseño y se ve completo en el detalle.
- ¿Qué ocurre con importes en cero o con decimales? Se aceptan o rechazan según las reglas de la plataforma, y el motivo del rechazo se muestra junto al campo.
- ¿Qué ocurre si se pierde la conexión durante un guardado o una eliminación? No se asume el éxito: el operador ve el error y puede reintentar sin generar duplicados.
- ¿Qué ocurre en la última página, si tiene menos de 10 tipos, o si hay una sola página? Se muestran solo los tipos existentes y los controles de página reflejan el límite.
- ¿Qué ocurre si otro operador elimina un tipo mientras se consulta? Al abrir su detalle o guardarlo, se informa de que ya no existe.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar los tipos de suscripción en un listado paginado, con 10 tipos por página por defecto, el total de tipos, la página actual, controles para avanzar y retroceder, y la posibilidad de elegir 10, 25 o 50 tipos por página.
- **FR-002**: Cada fila del listado DEBE mostrar al menos el nombre del tipo y sus condiciones principales (como precio y periodicidad, cuando el tipo las incluya).
- **FR-003**: El sistema DEBE permitir abrir el detalle de un tipo de suscripción con todos sus datos disponibles y volver al listado en la misma página en la que estaba.
- **FR-004**: El listado y el detalle DEBEN mostrar estados explícitos de carga, vacío (con acción para crear un tipo) y error (con opción de reintentar).
- **FR-005**: El sistema DEBE permitir crear un tipo de suscripción capturando todos los datos obligatorios que defina la plataforma.
- **FR-006**: El sistema DEBE validar los datos antes de enviarlos (campos obligatorios, formatos y valores numéricos válidos) y mostrar el error junto a cada campo afectado; cuando la plataforma rechace un dato (por ejemplo, un nombre duplicado) DEBE mostrar el motivo.
- **FR-007**: El sistema DEBE impedir que una acción repetida (como pulsar "Guardar" varias veces) cree o modifique el mismo registro más de una vez, deshabilitando la acción mientras se procesa.
- **FR-008**: El sistema DEBE permitir modificar los datos editables de un tipo de suscripción, mostrando sus valores actuales, y permitir cancelar sin guardar cambios.
- **FR-009**: El sistema DEBE exigir confirmación explícita, que nombre el tipo, antes de eliminarlo.
- **FR-010**: Cuando la plataforma rechace una operación (duplicado, tipo en uso, falta de permisos, validación), el sistema DEBE mostrar el motivo y dejar los datos sin cambios.
- **FR-011**: Tras crear, modificar o eliminar con éxito, el sistema DEBE mostrar una confirmación y reflejar el cambio en el listado y el detalle sin que el operador tenga que recargar la pantalla.
- **FR-012**: Cuando un tipo de suscripción ya no exista o haya sido modificado por otra persona, el sistema DEBE informarlo, ofrecer volver al listado y NO DEBE sobrescribir cambios ajenos en silencio.
- **FR-013**: El sistema DEBE ofrecer esta sección y cada una de sus acciones solo a los operadores que tengan el permiso correspondiente (consultar: `subscriptions:read`; crear: `subscriptions:write`; modificar: `subscriptions:update`; eliminar: `subscriptions:delete`), según la feature 001-auth-session-profile.
- **FR-014**: Todos los textos, mensajes y etiquetas DEBEN estar en español; los importes DEBEN mostrarse con la moneda y el formato numérico de la región del operador, y los periodos con nombres en español (por ejemplo, mensual o anual), de forma idéntica en el listado, el detalle y los formularios; las fechas y horas, en la zona horaria local del operador.

### Key Entities *(include if feature involves data)*

- **Tipo de suscripción**: Oferta comercial de MailySoft. Atributos clave de referencia: nombre (identifica de forma única al tipo), descripción y condiciones comerciales como precio y periodicidad; la lista exacta de atributos la define la plataforma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador crea un tipo de suscripción en menos de 2 minutos.
- **SC-002**: La primera página del listado se muestra en menos de 2 segundos en el 95 % de las consultas, en condiciones normales de red.
- **SC-003**: El 100 % de las eliminaciones requieren una confirmación explícita previa.
- **SC-004**: Pulsar "Guardar" varias veces seguidas produce 0 registros duplicados.
- **SC-005**: En el 100 % de los rechazos de la plataforma, el operador ve el motivo y los datos permanecen sin cambios.
- **SC-006**: Un operador encuentra y abre el detalle de un tipo de suscripción concreto en menos de 30 segundos.

## Assumptions

- Dependencia: requiere la feature 001-auth-session-profile (sesión iniciada y role del operador).
- La plataforma de suscripciones ofrece consulta paginada con el total de registros, detalle, alta, modificación y baja de tipos de suscripción.
- Los atributos exactos de un tipo de suscripción (nombre, descripción, precio, periodicidad, estado u otros) y sus reglas de validación se confirmarán con el contrato de la plataforma durante la planeación; los de este documento son de referencia.
- El catálogo es pequeño (decenas de tipos), por lo que la paginación basta para encontrar un tipo concreto.
- Si los tipos incluyen importes, se muestran en la moneda que indique la plataforma; la gestión de varias monedas queda fuera de alcance.
- Las operaciones de esta sección dependen de los permisos del operador sobre tipos de suscripción, según la feature 001-auth-session-profile: consultar requiere `subscriptions:read`, crear `subscriptions:write`, modificar `subscriptions:update` y eliminar `subscriptions:delete`.
- La baja de un tipo la ejecuta la plataforma (puede ser lógica o física); el backoffice la presenta como eliminación y no ofrece deshacerla.
- La relación entre tipos de suscripción y clínicas (si existe) no forma parte de esta feature.
- Fuera de alcance: búsqueda, filtros y ordenamiento (el contrato conocido solo ofrece paginación), exportación, acciones masivas, historial de cambios y versionado de precios.
