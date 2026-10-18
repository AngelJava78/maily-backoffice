# Feature Specification: Administración de Usuarios y Roles de Sistema

**Feature Branch**: `002-manage-users`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Genera las especificaciones que sean necesarias." Alcance tomado de la descripción original del proyecto: "podrá administrar usuarios y asignarles un role de sistema", donde "Administrar = Listar, Mostrar, Crear, Modificar, Eliminar".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar usuarios: listado y detalle (Priority: P1)

Un operador revisa los usuarios de MailySoft en un listado paginado, donde ve de cada uno su nombre, correo electrónico y role de sistema, y abre el detalle de cualquiera de ellos.

**Why this priority**: Consultar es la base de toda administración: antes de crear, cambiar o eliminar hay que poder ver qué existe. Además, es la primera pieza que entrega valor por sí sola (visibilidad).

**Independent Test**: Con más de 10 usuarios registrados, abrir la sección Usuarios, recorrer las páginas y abrir el detalle de uno; verificar que los datos coinciden con los registrados en la plataforma.

**Acceptance Scenarios**:

1. **Given** más de 10 usuarios registrados, **When** el operador abre la sección Usuarios, **Then** ve los primeros 10 con su nombre, correo y role, el total de usuarios y controles para avanzar o retroceder de página.
2. **Given** el listado, **When** el operador elige ver 25 o 50 usuarios por página, **Then** el listado se actualiza con ese tamaño y vuelve a la primera página.
3. **Given** el listado, **When** el operador selecciona un usuario, **Then** ve su detalle con todos sus datos disponibles, incluido su role de sistema.
4. **Given** el detalle de un usuario abierto desde la página 3 del listado, **When** el operador vuelve al listado, **Then** regresa a la página 3.
5. **Given** que no hay usuarios registrados, **When** el operador abre la sección, **Then** ve un estado vacío con la acción para crear un usuario.
6. **Given** que la plataforma no responde, **When** el operador abre la sección, **Then** ve un mensaje de error comprensible con la opción de reintentar.
7. **Given** el detalle de un usuario que ya no existe, **When** el operador intenta abrirlo, **Then** ve un mensaje de "no encontrado" con un enlace al listado.
8. **Given** una persona sin sesión, sin acceso autorizado o sin el permiso `users:read`, **When** abre directamente la dirección de la sección Usuarios, **Then** no ve ningún dato de usuarios y se le aplica el flujo de acceso o de falta de permisos de la feature 001-auth-session-profile.
9. **Given** un operador que tiene `users:read` pero no `users:write`, `users:update` ni `users:delete`, **When** abre la sección Usuarios, **Then** puede consultar el listado y el detalle y no ve las acciones de crear, modificar ni eliminar.

---

### User Story 2 - Crear un usuario y asignarle un role de sistema (Priority: P1)

Un operador registra un nuevo usuario con sus datos y le asigna uno de los roles de sistema disponibles.

**Why this priority**: Dar de alta usuarios con el role correcto es el motivo principal de esta sección y es requisito de otras features (por ejemplo, un usuario debe existir para poder ser owner de una clínica).

**Independent Test**: Crear un usuario con un role y verificar que aparece en el listado y en el detalle con el role elegido.

**Acceptance Scenarios**:

1. **Given** un operador en la sección Usuarios, **When** elige "Crear usuario", completa los datos obligatorios, elige un role y guarda, **Then** el usuario se crea, el operador ve una confirmación y el usuario aparece con el role elegido en el listado y en el detalle.
2. **Given** el formulario de alta, **When** el operador abre la lista de roles, **Then** ve exactamente los roles de sistema que ofrece la plataforma.
3. **Given** datos obligatorios vacíos, un formato inválido (por ejemplo, un correo mal escrito) o ningún role elegido, **When** intenta guardar, **Then** ve el error junto a cada campo afectado y no se crea el usuario.
4. **Given** un correo que ya pertenece a otro usuario, **When** intenta guardar, **Then** ve el motivo del rechazo y no se crea un duplicado.
5. **Given** que la plataforma no responde al guardar, **When** el operador guarda, **Then** ve un error con la opción de reintentar, conserva lo que escribió y el usuario no se da por creado.
6. **Given** que el operador acciona "Guardar" varias veces seguidas mientras la operación está en curso, **When** la operación termina, **Then** solo se creó un usuario.

---

### User Story 3 - Modificar un usuario y cambiar su role de sistema (Priority: P2)

Un operador corrige los datos de un usuario existente o le cambia el role de sistema.

**Why this priority**: Los datos y los roles cambian con el tiempo; es necesario para mantener la información correcta, pero depende de que ya existan usuarios y se puedan consultar.

**Independent Test**: Editar el nombre y el role de un usuario de prueba y verificar que ambos cambios se reflejan en el detalle y en el listado.

**Acceptance Scenarios**:

1. **Given** el detalle de un usuario, **When** el operador elige "Editar", **Then** ve el formulario con los valores actuales.
2. **Given** el formulario de edición, **When** el operador cambia datos válidos y guarda, **Then** los cambios se guardan, se confirma la acción y se reflejan en el detalle y en el listado.
3. **Given** el formulario de edición, **When** el operador cambia el role y guarda, **Then** el sistema pide confirmación indicando el usuario y el nuevo role, y solo aplica el cambio si el operador confirma.
4. **Given** el formulario de edición con cambios, **When** el operador cancela, **Then** no se guarda ningún cambio.
5. **Given** un operador que edita su propio usuario, **When** intenta cambiar su propio role, **Then** el sistema no lo permite y explica el motivo.
6. **Given** que otro operador modificó o eliminó el mismo usuario después de abrir el formulario, **When** el operador guarda, **Then** el sistema informa del conflicto o de que el usuario ya no existe y no sobrescribe en silencio.

---

### User Story 4 - Eliminar un usuario (Priority: P3)

Un operador elimina un usuario que ya no debe existir en MailySoft.

**Why this priority**: Es una acción de alto impacto y menor frecuencia que las demás; se entrega al final y con las máximas protecciones.

**Independent Test**: Eliminar un usuario de prueba confirmando el diálogo y verificar que deja de aparecer en el listado; repetir cancelando y verificar que no cambia nada.

**Acceptance Scenarios**:

1. **Given** el detalle o el listado de usuarios, **When** el operador elige "Eliminar", **Then** ve un diálogo de confirmación que nombra al usuario y ofrece confirmar o cancelar.
2. **Given** el diálogo de confirmación, **When** el operador confirma, **Then** el usuario se elimina, se confirma la acción y deja de aparecer en el listado.
3. **Given** el diálogo de confirmación, **When** el operador cancela, **Then** no cambia nada.
4. **Given** un usuario que la plataforma no permite eliminar (por ejemplo, porque es owner de una clínica), **When** el operador confirma, **Then** ve el motivo del rechazo y el usuario permanece.
5. **Given** el propio usuario del operador, **When** el operador busca la opción de eliminar, **Then** no puede eliminarse a sí mismo.

---

### Edge Cases

- ¿Qué ocurre con nombres o correos muy largos o con caracteres especiales? Se aceptan según las reglas de la plataforma; en el listado el texto largo se acorta sin romper el diseño y se ve completo en el detalle.
- ¿Qué ocurre si el role asignado a un usuario ya no está entre los roles que ofrece la plataforma? Se muestra tal como está en el detalle, y al editar se exige elegir un role vigente.
- ¿Qué ocurre si se pierde la conexión durante un guardado o una eliminación? No se asume el éxito: el operador ve el error y puede reintentar sin generar duplicados.
- ¿Qué ocurre en la última página, si tiene menos de 10 usuarios, o si hay una sola página? Se muestran solo los usuarios existentes y los controles de página reflejan el límite.
- ¿Qué ocurre si otro operador elimina un usuario mientras se consulta? Al abrir su detalle o guardarlo, se informa de que ya no existe.
- ¿Qué ocurre si se elimina el último usuario con un role determinado? La plataforma decide si lo permite; el sistema muestra su respuesta sin interpretarla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar los usuarios de MailySoft en un listado paginado, con 10 usuarios por página por defecto, el total de usuarios, la página actual, controles para avanzar y retroceder, y la posibilidad de elegir 10, 25 o 50 usuarios por página.
- **FR-002**: Cada fila del listado DEBE mostrar al menos el nombre, el correo electrónico y el role de sistema del usuario.
- **FR-003**: El sistema DEBE permitir abrir el detalle de un usuario con todos sus datos disponibles y volver al listado en la misma página en la que estaba.
- **FR-004**: El listado y el detalle DEBEN mostrar estados explícitos de carga, vacío (con acción para crear un usuario) y error (con opción de reintentar).
- **FR-005**: El sistema DEBE permitir crear un usuario capturando los datos obligatorios y eligiendo un role de sistema, que es obligatorio, entre los que ofrece la plataforma; el backoffice no crea, modifica ni elimina roles.
- **FR-006**: El sistema DEBE validar los datos antes de enviarlos (campos obligatorios y formatos) y mostrar el error junto a cada campo afectado; cuando la plataforma rechace un dato (por ejemplo, un correo duplicado) DEBE mostrar el motivo.
- **FR-007**: El sistema DEBE impedir que una acción repetida (como pulsar "Guardar" varias veces) cree o modifique el mismo registro más de una vez, deshabilitando la acción mientras se procesa.
- **FR-008**: El sistema DEBE permitir modificar los datos editables de un usuario, mostrando sus valores actuales, y permitir cancelar sin guardar cambios.
- **FR-009**: El sistema DEBE exigir confirmación explícita, que indique el usuario y el nuevo role, antes de aplicar un cambio de role de sistema.
- **FR-010**: El sistema DEBE exigir confirmación explícita, que nombre al usuario, antes de eliminarlo.
- **FR-011**: Cuando la plataforma rechace una operación (duplicado, dependencias como ser owner de una clínica, falta de permisos, validación), el sistema DEBE mostrar el motivo y dejar los datos sin cambios.
- **FR-012**: El sistema NO DEBE permitir que un operador elimine su propio usuario ni cambie su propio role de sistema.
- **FR-013**: Tras crear, modificar o eliminar con éxito, el sistema DEBE mostrar una confirmación y reflejar el cambio en el listado y el detalle sin que el operador tenga que recargar la pantalla.
- **FR-014**: Cuando un usuario ya no exista o haya sido modificado por otra persona, el sistema DEBE informarlo, ofrecer volver al listado y NO DEBE sobrescribir cambios ajenos en silencio.
- **FR-015**: El sistema DEBE ofrecer esta sección y cada una de sus acciones solo a los operadores que tengan el permiso correspondiente (consultar: `users:read`; crear: `users:write`; modificar: `users:update`; eliminar: `users:delete`), según la feature 001-auth-session-profile.
- **FR-016**: Todos los textos, mensajes y etiquetas DEBEN estar en español, y las fechas y horas DEBEN mostrarse en la zona horaria local del operador.

### Key Entities *(include if feature involves data)*

- **Usuario de MailySoft**: Persona registrada en la plataforma. Atributos clave: nombre, correo electrónico (identifica de forma única al usuario) y role de sistema, además de los demás datos que la plataforma gestione para un usuario.
- **Role de sistema**: Clasificación global que se asigna a un usuario. Pertenece a un catálogo definido por la plataforma; cada usuario tiene exactamente uno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador crea un usuario con su role en menos de 2 minutos.
- **SC-002**: La primera página del listado se muestra en menos de 2 segundos en el 95 % de las consultas, en condiciones normales de red.
- **SC-003**: El 100 % de las eliminaciones y de los cambios de role de sistema requieren una confirmación explícita previa.
- **SC-004**: Pulsar "Guardar" varias veces seguidas produce 0 registros duplicados.
- **SC-005**: Un operador cambia el role de un usuario en menos de 1 minuto.
- **SC-006**: En el 100 % de los rechazos de la plataforma, el operador ve el motivo y los datos permanecen sin cambios.

## Assumptions

- Dependencia: requiere la feature 001-auth-session-profile (sesión iniciada y role del operador).
- La plataforma de usuarios ofrece consulta paginada con el total de registros, detalle, alta, modificación y baja de usuarios, y el catálogo de roles de sistema.
- Cada usuario tiene exactamente un role de sistema. Los atributos exactos de un usuario (más allá de nombre, correo y role) se confirmarán con el contrato de la plataforma durante la planeación.
- Crear un usuario lo registra en MailySoft; la creación o vinculación de su cuenta en el proveedor de identidad para poder iniciar sesión la gestiona la plataforma y no forma parte de esta feature.
- Las operaciones de esta sección dependen de los permisos del operador sobre usuarios, según la feature 001-auth-session-profile: consultar requiere `users:read`, crear `users:write`, modificar `users:update` y eliminar `users:delete`.
- La regla de que un operador no puede eliminarse ni cambiarse el role a sí mismo es una protección por defecto contra bloqueos y escaladas de privilegio.
- La baja de un usuario la ejecuta la plataforma (puede ser lógica o física); el backoffice la presenta como eliminación y no ofrece deshacerla.
- Fuera de alcance: búsqueda, filtros y ordenamiento (el listado conocido solo ofrece paginación; se añadirán cuando la plataforma los ofrezca), exportación, acciones masivas, administración del catálogo de roles e historial de cambios.
