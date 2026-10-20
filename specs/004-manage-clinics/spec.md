# Feature Specification: Administración de Clínicas y Asignación de Owner

**Feature Branch**: `004-manage-clinics`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Genera las especificaciones que sean necesarias." Alcance tomado de la descripción original del proyecto: "podrá administrar las clínicas y al crear una clínica se asignará un owner de la clínica que a su vez se convierte en el administrador de la clínica", donde "Administrar = Listar, Mostrar, Crear, Modificar, Eliminar".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar clínicas y su owner: listado y detalle (Priority: P1)

Un operador revisa las clínicas de MailySoft en un listado paginado, donde ve de cada una su nombre y su owner, y abre el detalle de cualquiera de ellas.

**Why this priority**: Consultar es la base de toda administración y permite verificar que cada clínica está a cargo de la persona correcta.

**Independent Test**: Con varias clínicas registradas (más de 10), abrir la sección Clínicas, recorrer las páginas y abrir el detalle de una; verificar que los datos y el owner coinciden con los registrados en la plataforma.

**Acceptance Scenarios**:

1. **Given** más de 10 clínicas registradas, **When** el operador abre la sección Clínicas, **Then** ve las primeras 10 con su nombre y su owner, el total de clínicas y controles para avanzar o retroceder de página.
2. **Given** el listado, **When** el operador elige ver 25 o 50 clínicas por página, **Then** el listado se actualiza con ese tamaño y vuelve a la primera página.
3. **Given** el listado, **When** el operador selecciona una clínica, **Then** ve su detalle con todos sus datos y con su owner identificado como administrador de la clínica.
4. **Given** el detalle de una clínica, **When** el operador selecciona a su owner, **Then** abre el detalle de ese usuario.
5. **Given** el detalle de una clínica abierto desde la página 3 del listado, **When** el operador vuelve al listado, **Then** regresa a la página 3.
6. **Given** que no hay clínicas registradas, **When** el operador abre la sección, **Then** ve un estado vacío con la acción para crear una clínica.
7. **Given** que la plataforma no responde, **When** el operador abre la sección, **Then** ve un mensaje de error comprensible con la opción de reintentar.
8. **Given** el detalle de una clínica que ya no existe, **When** el operador intenta abrirlo, **Then** ve un mensaje de "no encontrado" con un enlace al listado.
9. **Given** una persona sin sesión, sin acceso autorizado o sin el permiso `tenants:read`, **When** abre directamente la dirección de la sección Clínicas, **Then** no ve ningún dato de clínicas y se le aplica el flujo de acceso o de falta de permisos de la feature 001-auth-session-profile.
10. **Given** un operador que tiene `tenants:read` pero no `tenants:write`, `tenants:update` ni `tenants:delete`, **When** abre la sección Clínicas, **Then** puede consultar el listado y el detalle y no ve las acciones de crear, modificar ni eliminar.

---

### User Story 2 - Crear una clínica y asignarle su owner (Priority: P1)

Un operador registra una nueva clínica con sus datos y elige, entre los usuarios existentes, a su owner. Al guardarse, ese usuario queda como administrador de la clínica.

**Why this priority**: Dar de alta clínicas con su responsable es el motivo principal de esta sección; una clínica sin owner no tendría quién la administre.

**Independent Test**: Crear una clínica seleccionando un usuario existente como owner y verificar que aparece en el listado y que su detalle muestra a ese usuario como administrador de la clínica.

**Acceptance Scenarios**:

1. **Given** un operador en la sección Clínicas, **When** elige "Crear clínica", completa los datos obligatorios, selecciona un usuario existente como owner y guarda, **Then** la clínica se crea, el operador ve una confirmación y el detalle de la clínica muestra a ese usuario como su owner y administrador.
2. **Given** el formulario de alta, **When** el operador no selecciona un owner e intenta guardar, **Then** el sistema no lo permite e indica que el owner es obligatorio.
3. **Given** el selector de owner y una base con muchos usuarios, **When** el operador busca a un usuario concreto, **Then** puede localizarlo y seleccionarlo sin recorrer manualmente todo el listado de usuarios.
4. **Given** que la persona que debe ser owner todavía no existe como usuario, **When** el operador no la encuentra en el selector, **Then** el sistema le indica que primero debe crear el usuario y ofrece un acceso directo a la creación de usuarios.
5. **Given** datos obligatorios vacíos o inválidos, **When** intenta guardar, **Then** ve el error junto a cada campo afectado y no se crea la clínica.
6. **Given** que la plataforma rechaza la clínica o al owner elegido (por ejemplo, porque el usuario ya no existe), **When** el operador guarda, **Then** ve el motivo y no queda creada ninguna clínica sin owner.
7. **Given** que la plataforma no responde al guardar, **When** el operador guarda, **Then** ve un error con la opción de reintentar, conserva lo que escribió y la clínica no se da por creada.
8. **Given** que el operador acciona "Guardar" varias veces seguidas mientras la operación está en curso, **When** la operación termina, **Then** solo se creó una clínica.

---

### User Story 3 - Modificar los datos de una clínica (Priority: P2)

Un operador corrige o actualiza los datos de una clínica existente.

**Why this priority**: Los datos de las clínicas cambian con el tiempo; es necesario para mantener la información correcta, pero depende de poder crear y consultar clínicas.

**Independent Test**: Editar un dato de una clínica de prueba y verificar que el cambio se refleja en el detalle y en el listado, y que su owner no cambia.

**Acceptance Scenarios**:

1. **Given** el detalle de una clínica, **When** el operador elige "Editar", **Then** ve el formulario con los valores actuales y su owner en solo lectura.
2. **Given** el formulario de edición, **When** el operador cambia datos válidos y guarda, **Then** los cambios se guardan, se confirma la acción y se reflejan en el detalle y en el listado.
3. **Given** el formulario de edición con cambios, **When** el operador cancela, **Then** no se guarda ningún cambio.
4. **Given** datos inválidos o rechazados por la plataforma, **When** el operador guarda, **Then** ve el error o el motivo y la clínica conserva sus valores anteriores.
5. **Given** que otro operador modificó o eliminó la misma clínica después de abrir el formulario, **When** el operador guarda, **Then** el sistema informa del conflicto o de que la clínica ya no existe y no sobrescribe en silencio.

---

### User Story 4 - Eliminar una clínica (Priority: P3)

Un operador elimina una clínica que ya no debe existir en MailySoft.

**Why this priority**: Es una acción de alto impacto y poco frecuente; se entrega al final y con las máximas protecciones.

**Independent Test**: Eliminar una clínica de prueba confirmando el diálogo, verificar que deja de aparecer en el listado y que su owner sigue existiendo como usuario; repetir cancelando y verificar que no cambia nada.

**Acceptance Scenarios**:

1. **Given** el detalle o el listado de clínicas, **When** el operador elige "Eliminar", **Then** ve un diálogo de confirmación que nombra la clínica y ofrece confirmar o cancelar.
2. **Given** el diálogo de confirmación, **When** el operador confirma, **Then** la clínica se elimina, se confirma la acción y deja de aparecer en el listado.
3. **Given** una clínica eliminada, **When** el operador consulta la sección Usuarios, **Then** el que era su owner sigue existiendo como usuario.
4. **Given** el diálogo de confirmación, **When** el operador cancela, **Then** no cambia nada.
5. **Given** una clínica que la plataforma no permite eliminar, **When** el operador confirma, **Then** ve el motivo del rechazo y la clínica permanece.

---

### Edge Cases

- ¿Qué ocurre si el usuario elegido como owner deja de existir entre su selección y el guardado? La plataforma rechaza la operación; el operador ve el motivo, no queda una clínica sin owner y puede elegir otro.
- ¿Qué ocurre si la clínica se crea pero no es posible dejar asignado a su owner? El resultado para el operador es único: se informa del error y no queda una clínica sin owner.
- ¿Qué ocurre si el usuario elegido ya es owner o administrador de otra clínica? Se permite salvo que la plataforma lo rechace; si lo rechaza, se muestra el motivo.
- ¿Qué ocurre si no hay usuarios registrados al abrir el selector de owner? Se muestra un estado vacío con acceso directo a la creación de usuarios.
- ¿Qué ocurre con el owner de una clínica cuyo usuario ya no está disponible? El detalle muestra "owner no disponible" y el resto de los datos de la clínica.
- ¿Qué ocurre con nombres muy largos o caracteres especiales? Se aceptan según las reglas de la plataforma; en el listado el texto largo se acorta sin romper el diseño y se ve completo en el detalle.
- ¿Qué ocurre si se pierde la conexión durante un guardado o una eliminación? No se asume el éxito: el operador ve el error y puede reintentar sin generar duplicados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar las clínicas en un listado paginado, con 10 clínicas por página por defecto, el total de clínicas, la página actual, controles para avanzar y retroceder, y la posibilidad de elegir 10, 25 o 50 clínicas por página.
- **FR-002**: Cada fila del listado DEBE mostrar al menos el nombre de la clínica y el nombre de su owner.
- **FR-003**: El sistema DEBE permitir abrir el detalle de una clínica con todos sus datos disponibles, mostrar a su owner identificado como administrador de la clínica con un acceso a su detalle de usuario, y volver al listado en la misma página en la que estaba.
- **FR-004**: El listado y el detalle DEBEN mostrar estados explícitos de carga, vacío (con acción para crear una clínica) y error (con opción de reintentar).
- **FR-005**: El sistema DEBE permitir crear una clínica capturando los datos obligatorios y seleccionando un owner, que es obligatorio, entre los usuarios existentes.
- **FR-006**: El selector de owner DEBE permitir localizar a un usuario concreto sin recorrer manualmente todo el listado de usuarios, y DEBE ofrecer un acceso directo a la creación de usuarios cuando la persona buscada no exista.
- **FR-007**: El sistema DEBE garantizar que la creación de una clínica y la asignación de su owner den un único resultado para el operador: o la clínica queda creada con su owner, o no queda creada y se informa del error; NO DEBE existir una clínica sin owner.
- **FR-008**: Al crear una clínica, su owner DEBE quedar como administrador de esa clínica, y así DEBE verse en su detalle.
- **FR-009**: El sistema DEBE validar los datos antes de enviarlos (campos obligatorios y formatos) y mostrar el error junto a cada campo afectado; cuando la plataforma rechace un dato u operación DEBE mostrar el motivo y dejar los datos sin cambios.
- **FR-010**: El sistema DEBE impedir que una acción repetida (como pulsar "Guardar" varias veces) cree o modifique el mismo registro más de una vez, deshabilitando la acción mientras se procesa.
- **FR-011**: El sistema DEBE permitir modificar los datos editables de una clínica, mostrando sus valores actuales y su owner en solo lectura, y permitir cancelar sin guardar cambios.
- **FR-012**: El sistema DEBE exigir confirmación explícita, que nombre la clínica, antes de eliminarla; eliminar una clínica NO DEBE eliminar al usuario que era su owner.
- **FR-013**: Tras crear, modificar o eliminar con éxito, el sistema DEBE mostrar una confirmación y reflejar el cambio en el listado y el detalle sin que el operador tenga que recargar la pantalla.
- **FR-014**: Cuando una clínica ya no exista o haya sido modificada por otra persona, el sistema DEBE informarlo, ofrecer volver al listado y NO DEBE sobrescribir cambios ajenos en silencio.
- **FR-015**: El sistema DEBE ofrecer esta sección y cada una de sus acciones solo a los operadores que tengan el permiso correspondiente (consultar: `tenants:read`; crear: `tenants:write`; modificar: `tenants:update`; eliminar: `tenants:delete`), según la feature 001-auth-session-profile.
- **FR-016**: Todos los textos, mensajes y etiquetas DEBEN estar en español, y las fechas y horas DEBEN mostrarse en la zona horaria local del operador.

### Key Entities *(include if feature involves data)*

- **Clínica**: Cliente de MailySoft. Atributos clave de referencia: nombre y datos de contacto, además de los demás datos que la plataforma gestione. Siempre tiene exactamente un owner.
- **Owner de la clínica**: Usuario de MailySoft designado al crear la clínica. Al asignarse, se convierte en el administrador de esa clínica.
- **Usuario de MailySoft**: Persona registrada en la plataforma (gestionada en la feature 002-manage-users); un usuario puede ser owner de una o varias clínicas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador crea una clínica con su owner en menos de 3 minutos.
- **SC-002**: Un operador localiza y selecciona a un usuario concreto como owner en menos de 30 segundos, aun con 1 000 usuarios registrados.
- **SC-003**: El 100 % de las clínicas creadas desde el backoffice tienen owner; hay 0 clínicas sin owner, incluso ante fallos durante la creación.
- **SC-004**: En el 100 % de las clínicas creadas, el detalle muestra a su owner como administrador de la clínica.
- **SC-005**: El 100 % de las eliminaciones requieren una confirmación explícita previa, y ninguna eliminación de clínica elimina a su owner como usuario.
- **SC-006**: La primera página del listado se muestra en menos de 2 segundos en el 95 % de las consultas, en condiciones normales de red.
- **SC-007**: Pulsar "Guardar" varias veces seguidas produce 0 registros duplicados.

## Assumptions

- Dependencias: requiere la feature 001-auth-session-profile (sesión iniciada y role del operador) y la feature 002-manage-users (los owners son usuarios existentes).
- El owner de una clínica es siempre un usuario ya registrado en MailySoft; crear al owner desde el formulario de la clínica queda fuera de alcance (si no existe, se crea primero en la sección Usuarios).
- Cada clínica tiene un solo owner. La asignación inicial ocurre al crear la clínica; cambiar el owner de una clínica existente queda fuera de alcance de esta versión, hasta definir qué le ocurre al administrador anterior.
- La plataforma es quien convierte al owner en administrador de la clínica y quien garantiza que no existan clínicas sin owner; si no puede garantizarlo en una sola operación, la planeación debe definir cómo se logra el resultado único descrito en FR-007.
- Los atributos exactos de una clínica (nombre, datos de contacto, dirección u otros) y sus reglas de validación se confirmarán con el contrato de la plataforma durante la planeación; los de este documento son de referencia.
- Un usuario puede ser owner de más de una clínica salvo que la plataforma lo rechace.
- Localizar a un usuario concreto para elegirlo como owner puede requerir que la plataforma de usuarios ofrezca búsqueda por nombre o correo; si no la ofrece todavía, esto debe resolverse en la planeación.
- Las operaciones de esta sección dependen de los permisos del operador sobre clínicas, según la feature 001-auth-session-profile: consultar requiere `tenants:read`, crear `tenants:write`, modificar `tenants:update` y eliminar `tenants:delete`.
- La baja de una clínica la ejecuta la plataforma (puede ser lógica o física); el backoffice la presenta como eliminación y no ofrece deshacerla.
- La relación entre clínicas y suscripciones (si existe) no forma parte de esta feature.
- Fuera de alcance: búsqueda, filtros y ordenamiento del listado de clínicas, exportación, acciones masivas, cambio de owner, historial de cambios y administración de otros administradores de la clínica.
