# Feature Specification: Administración de Usuarios y Roles de Sistema

**Feature Branch**: `002-manage-users`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Genera las especificaciones que sean necesarias." Alcance tomado de la descripción original del proyecto: "podrá administrar usuarios y asignarles un role de sistema", donde "Administrar = Listar, Mostrar, Crear, Modificar, Eliminar".

## Clarifications

### Session 2026-10-18

- Q: ¿Incluimos en esta feature bloquear, desbloquear y reactivar usuarios, junto con una búsqueda por correo para encontrar a los bloqueados y eliminados? → A: Sí: bloquear, desbloquear y reactivar, más búsqueda exacta por correo (encuentra usuarios de cualquier estatus).
- Q: ¿Un usuario puede tener varios roles de sistema y cómo se asignan? → A: Sí, varios. El alta exige al menos un role y lo asigna justo después de crear al usuario; si la creación funciona pero falla una asignación, el usuario queda creado y el operador ve qué roles faltan y los reintenta desde el detalle. En el detalle los roles se agregan y se quitan uno por uno, cada cambio con confirmación.
- Q: ¿Mostramos los roles de cada usuario en el listado? → A: No. Cada fila muestra nombre, correo y fecha de alta, y los roles se ven en el detalle (si el servicio incluye algún día los roles en el listado, se agregan).
- Q: ¿Puede el operador cambiar el correo de un usuario existente? → A: No. El correo no se edita (solo el nombre y los apellidos), porque la plataforma no lo sincroniza con la cuenta de acceso; un correo mal escrito se corrige eliminando al usuario y creándolo de nuevo.
- Q: ¿Qué hacemos cuando dos operadores modifican a la vez los datos del mismo usuario? → A: Gana la última escritura: la plataforma no ofrece control de concurrencia, así que el sistema solo informa de lo que la plataforma rechaza (el usuario no existe o ya no está activo) y no promete detectar ediciones ajenas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar usuarios: listado, búsqueda por correo y detalle (Priority: P1)

Un operador revisa los usuarios activos de MailySoft en un listado paginado, donde ve de cada uno su nombre, correo electrónico y fecha de alta, abre el detalle de cualquiera de ellos (donde ve también sus roles de sistema) y, con el correo completo, encuentra a un usuario de cualquier estatus (activo, bloqueado o eliminado).

**Why this priority**: Consultar es la base de toda administración: antes de crear, cambiar o eliminar hay que poder ver qué existe. Además, es la primera pieza que entrega valor por sí sola (visibilidad), y la búsqueda es la única forma de llegar a un usuario bloqueado o eliminado, que el listado no muestra.

**Independent Test**: Con más de 10 usuarios activos registrados, abrir la sección Usuarios, recorrer las páginas y abrir el detalle de uno; buscar por correo a un usuario bloqueado y verificar que se encuentra con su estatus; verificar que los datos coinciden con los registrados en la plataforma.

**Acceptance Scenarios**:

1. **Given** más de 10 usuarios activos registrados, **When** el operador abre la sección Usuarios, **Then** ve los primeros 10 con su nombre, correo y fecha de alta, el total de usuarios activos y controles para avanzar o retroceder de página.
2. **Given** el listado, **When** el operador elige ver 25 o 50 usuarios por página, **Then** el listado se actualiza con ese tamaño y vuelve a la primera página.
3. **Given** el listado, **When** el operador selecciona un usuario, **Then** ve su detalle con todos sus datos disponibles, incluidos su estatus y sus roles de sistema; si el usuario no está activo, ve un aviso de que sus roles no se muestran mientras no lo esté.
4. **Given** el detalle de un usuario abierto desde la página 3 del listado, **When** el operador vuelve al listado, **Then** regresa a la página 3.
5. **Given** que no hay usuarios activos registrados, **When** el operador abre la sección, **Then** ve un estado vacío con la acción para crear un usuario.
6. **Given** que la plataforma no responde, **When** el operador abre la sección, **Then** ve un mensaje de error comprensible con la opción de reintentar.
7. **Given** el detalle de un usuario que no existe (por ejemplo, una dirección con un identificador inexistente), **When** el operador intenta abrirlo, **Then** ve un mensaje de "no encontrado" con un enlace al listado.
8. **Given** una persona sin sesión, sin acceso autorizado o sin el permiso `users:read`, **When** abre directamente la dirección de la sección Usuarios, **Then** no ve ningún dato de usuarios y se le aplica el flujo de acceso o de falta de permisos de la feature 001-auth-session-profile.
9. **Given** un operador que tiene `users:read` pero no `users:write`, `users:update` ni `users:delete`, **When** abre la sección Usuarios, **Then** puede consultar el listado, el detalle y la búsqueda y no ve las acciones de crear, modificar, administrar roles, bloquear, desbloquear, eliminar ni reactivar.
10. **Given** usuarios bloqueados o eliminados, **When** el operador abre el listado, **Then** no aparecen en él ni cuentan en su total.
11. **Given** el listado, **When** el operador escribe un correo completo y busca, **Then** ve al usuario con ese correo, sea cual sea su estatus, con su estatus visible, y puede abrir su detalle.
12. **Given** un correo que no corresponde a ningún usuario, **When** el operador busca, **Then** ve el aviso de que no se encontró ningún usuario con ese correo.
13. **Given** un correo vacío o con formato no válido, **When** el operador busca, **Then** ve el error junto al campo y no se realiza la consulta.
14. **Given** una búsqueda realizada, **When** el operador recarga la pantalla o abre de nuevo la misma dirección, **Then** vuelve a ver el mismo resultado.

---

### User Story 2 - Crear un usuario y asignarle roles de sistema (Priority: P1)

Un operador registra un nuevo usuario con sus datos y una contraseña inicial, y le asigna uno o más de los roles de sistema disponibles. La plataforma crea también la cuenta con la que la persona inicia sesión.

**Why this priority**: Dar de alta usuarios con los roles correctos es el motivo principal de esta sección y es requisito de otras features (por ejemplo, un usuario debe existir para poder ser owner de una clínica).

**Independent Test**: Crear un usuario con una contraseña inicial y dos roles, y verificar que aparece en el listado y que su detalle muestra ambos roles.

**Acceptance Scenarios**:

1. **Given** un operador con los permisos necesarios en la sección Usuarios, **When** elige "Crear usuario", completa los datos obligatorios y la contraseña inicial, elige uno o más roles y guarda, **Then** el usuario se crea con esos roles, el operador ve una confirmación, el usuario aparece en el listado y su detalle muestra los roles elegidos, y la persona queda con una cuenta con la que puede iniciar sesión con su correo y esa contraseña.
2. **Given** el formulario de alta, **When** el operador abre la lista de roles, **Then** ve exactamente los roles de sistema que ofrece la plataforma y puede elegir uno o varios.
3. **Given** datos obligatorios vacíos, un formato inválido (por ejemplo, un correo mal escrito), ninguna contraseña o ningún role elegido, **When** intenta guardar, **Then** ve el error junto a cada campo afectado y no se crea el usuario.
4. **Given** un correo que ya pertenece a otro usuario con cualquier estatus, **When** intenta guardar, **Then** ve el motivo del rechazo y no se crea un duplicado; si ese usuario está eliminado o bloqueado, se le indica que puede recuperarlo en lugar de crear uno nuevo y se le ofrece buscarlo por ese correo.
5. **Given** una contraseña que no cumple los requisitos de seguridad de la cuenta de acceso, **When** intenta guardar, **Then** ve el motivo junto al campo de la contraseña y no se crea el usuario.
6. **Given** que ya existe una cuenta de acceso con ese correo, **When** intenta guardar, **Then** ve el motivo del rechazo y no se crea el usuario.
7. **Given** el campo de la contraseña, **When** el operador la escribe, **Then** queda oculta por defecto, puede mostrarla u ocultarla, y no se vuelve a mostrar una vez guardado el usuario.
8. **Given** que la plataforma o el servicio de identidad no responden al crear el usuario, **When** el operador guarda, **Then** ve un error con la opción de reintentar, conserva lo que escribió, no se asigna ningún role y el usuario no se da por creado.
9. **Given** que el usuario se creó pero la asignación de uno o más roles falló, **When** termina el guardado, **Then** el operador ve que el usuario sí se creó, qué roles quedaron asignados y cuáles no, con la opción de reintentar los que faltan; el usuario no se elimina ni se deshacen los roles que sí se asignaron.
10. **Given** que el operador acciona "Guardar" varias veces seguidas mientras la operación está en curso, **When** la operación termina, **Then** solo se creó un usuario y cada role se asignó una sola vez.
11. **Given** un operador que tiene `users:write` pero no `users:update` o no `roles:read`, **When** abre la sección Usuarios, **Then** no ve la acción "Crear usuario", porque no podría completar el alta con roles.
12. **Given** el formulario de alta, **When** el operador escribe el correo, **Then** ve la indicación de que no podrá cambiarlo después.

---

### User Story 3 - Modificar un usuario y administrar sus roles de sistema (Priority: P2)

Un operador corrige el nombre y los apellidos de un usuario existente, o le agrega y le quita roles de sistema.

**Why this priority**: Los datos y los roles cambian con el tiempo; es necesario para mantener la información correcta, pero depende de que ya existan usuarios y se puedan consultar.

**Independent Test**: Editar el nombre de un usuario de prueba, agregarle un role y quitarle otro, y verificar que el nombre se refleja en el detalle y en el listado y que los roles se reflejan en el detalle.

**Acceptance Scenarios**:

1. **Given** el detalle de un usuario activo, **When** el operador elige "Editar", **Then** ve el formulario con los valores actuales; el correo aparece como dato de solo lectura, con la nota de que no se puede cambiar.
2. **Given** el formulario de edición, **When** el operador cambia datos válidos y guarda, **Then** los cambios se guardan, se confirma la acción y se reflejan en el detalle y en el listado.
3. **Given** el formulario de edición con cambios, **When** el operador cancela, **Then** no se guarda ningún cambio.
4. **Given** el detalle de un usuario activo, **When** el operador elige agregar un role, **Then** ve los roles disponibles que el usuario aún no tiene y, al elegir uno, el sistema pide confirmación indicando el usuario y el role, y solo lo asigna si el operador confirma.
5. **Given** el detalle de un usuario con varios roles, **When** el operador elige quitar uno, **Then** el sistema pide confirmación indicando el usuario y el role, y solo lo quita si el operador confirma; los demás roles no cambian.
6. **Given** que un cambio de roles termina con éxito, **When** el operador sigue en el detalle, **Then** ve los roles vigentes sin recargar la pantalla.
7. **Given** que otra persona ya agregó o quitó ese mismo role, **When** el operador confirma el cambio, **Then** ve que el cambio ya estaba hecho y el detalle se actualiza con los roles vigentes.
8. **Given** un operador que ve su propio usuario, **When** intenta agregarse o quitarse roles, **Then** el sistema no lo permite y explica el motivo.
9. **Given** que otro operador eliminó o bloqueó al usuario, o que el usuario ya no existe, después de que el operador abrió el formulario, **When** el operador guarda, **Then** ve que el usuario ya no está activo (o que no existe), el guardado no se aplica y la pantalla se actualiza con su estatus actual.
10. **Given** un usuario bloqueado o eliminado, **When** el operador abre su detalle, **Then** no ve las acciones "Editar", "Agregar role" ni "Quitar role", porque la plataforma solo permite modificar usuarios activos.
11. **Given** un operador que no tiene `users:update`, **When** abre el detalle de un usuario activo, **Then** no ve las acciones de editar ni de administrar roles; y si no tiene `roles:read`, puede quitar roles pero no ve la acción "Agregar role".

---

### User Story 4 - Bloquear y desbloquear un usuario (Priority: P2)

Un operador bloquea a un usuario para que la persona deje de poder iniciar sesión (por ejemplo, ante una baja temporal o un incidente) y lo desbloquea cuando corresponda.

**Why this priority**: Cortar el acceso de una persona de inmediato es la acción de seguridad más urgente de la administración de usuarios y no depende de crear ni de modificar; por eso va antes que eliminar.

**Independent Test**: Bloquear un usuario de prueba confirmando el diálogo, verificar que deja de aparecer en el listado y que se encuentra buscando su correo con el estatus Bloqueado; desbloquearlo y verificar que reaparece en el listado.

**Acceptance Scenarios**:

1. **Given** el detalle de un usuario activo, **When** el operador elige "Bloquear", **Then** ve un diálogo de confirmación que nombra al usuario y explica que la persona no podrá iniciar sesión mientras esté bloqueado.
2. **Given** el diálogo de confirmación, **When** el operador confirma, **Then** el usuario queda Bloqueado, se confirma la acción, su estatus se ve en el detalle y deja de aparecer en el listado y en su total.
3. **Given** el diálogo de confirmación, **When** el operador cancela, **Then** no cambia nada.
4. **Given** un usuario bloqueado encontrado por su correo, **When** el operador elige "Desbloquear" y confirma, **Then** el usuario vuelve a estar Activo, reaparece en el listado y la persona puede iniciar sesión de nuevo.
5. **Given** el detalle de un usuario bloqueado, **When** el operador lo abre, **Then** ve su estatus Bloqueado y solo la acción "Desbloquear": no puede modificarlo, administrar sus roles ni eliminarlo.
6. **Given** que la plataforma no puede actualizar la cuenta de acceso de la persona (servicio de identidad no disponible o con error), **When** el operador confirma bloquear o desbloquear, **Then** ve el motivo con la opción de reintentar y el usuario conserva su estatus anterior.
7. **Given** que otra persona ya cambió el estatus del usuario después de que el operador abrió su detalle, **When** el operador confirma la acción, **Then** ve que el usuario ya tiene otro estatus y la pantalla se actualiza con el estatus actual.
8. **Given** el propio usuario del operador, **When** el operador busca la opción de bloquear, **Then** no puede bloquearse a sí mismo.
9. **Given** un operador que no tiene `users:update`, **When** abre el detalle de un usuario, **Then** no ve las acciones de bloquear ni desbloquear.

---

### User Story 5 - Eliminar y reactivar un usuario (Priority: P3)

Un operador elimina un usuario que ya no debe tener acceso a MailySoft y, si hace falta, lo reactiva más adelante.

**Why this priority**: Es una acción de alto impacto y menor frecuencia que las demás; se entrega al final y con las máximas protecciones. La reactivación permite deshacerla.

**Independent Test**: Eliminar un usuario de prueba confirmando el diálogo, verificar que deja de aparecer en el listado y que se encuentra por su correo con el estatus Eliminado; reactivarlo y verificar que reaparece; repetir cancelando y verificar que no cambia nada.

**Acceptance Scenarios**:

1. **Given** el detalle de un usuario activo, **When** el operador elige "Eliminar", **Then** ve un diálogo de confirmación que nombra al usuario y ofrece confirmar o cancelar.
2. **Given** el diálogo de confirmación, **When** el operador confirma, **Then** el usuario queda eliminado, se confirma la acción, deja de aparecer en el listado y la persona ya no puede iniciar sesión.
3. **Given** el diálogo de confirmación, **When** el operador cancela, **Then** no cambia nada.
4. **Given** que la plataforma rechaza la eliminación (porque otra persona ya cambió el estatus del usuario o porque no pudo actualizar su cuenta de acceso), **When** el operador confirma, **Then** ve el motivo y el usuario permanece sin cambios.
5. **Given** el propio usuario del operador, **When** el operador busca la opción de eliminar, **Then** no puede eliminarse a sí mismo.
6. **Given** un usuario eliminado encontrado por su correo, **When** el operador elige "Reactivar" y confirma, **Then** el usuario vuelve a estar Activo con sus datos y las asignaciones de roles que tenía, reaparece en el listado y la persona puede iniciar sesión de nuevo.
7. **Given** el detalle de un usuario eliminado, **When** el operador lo abre, **Then** ve su estatus Eliminado y solo la acción "Reactivar": no puede modificarlo, administrar sus roles ni bloquearlo.
8. **Given** un operador que no tiene `users:delete`, **When** abre el detalle de un usuario activo, **Then** no ve la acción "Eliminar"; y si no tiene `users:update`, no ve la acción "Reactivar".

---

### Edge Cases

- ¿Qué ocurre con nombres o correos muy largos o con caracteres especiales? Se aceptan según las reglas de la plataforma; en el listado el texto largo se acorta sin romper el diseño y se ve completo en el detalle.
- ¿Qué ocurre si el correo de un usuario está mal escrito? No se puede editar (identifica al usuario y la plataforma no lo sincroniza con su cuenta de acceso): se elimina al usuario y se crea de nuevo con el correo correcto, reasignándole sus roles; el correo erróneo queda reservado por el usuario eliminado.
- ¿Qué ocurre si un role asignado a un usuario se bloquea o se elimina en la plataforma? Deja de aparecer entre los roles del usuario (la plataforma conserva la asociación, sin efecto) y ya no se ofrece para asignarlo.
- ¿Qué ocurre con los roles de un usuario bloqueado o eliminado? La plataforma los conserva, pero no los muestra mientras el usuario no esté activo: el detalle lo indica y vuelven a verse y a tener efecto al desbloquearlo o reactivarlo.
- ¿Qué ocurre si no carga la lista de roles al crear un usuario o al agregar un role? El operador ve el error con la opción de reintentar y no puede guardar un alta sin roles.
- ¿Qué ocurre si se pierde la conexión durante un guardado o una acción de estatus? No se asume el éxito: el operador ve el error y puede reintentar sin generar duplicados.
- ¿Qué ocurre en la última página, si tiene menos de 10 usuarios, o si hay una sola página? Se muestran solo los usuarios existentes y los controles de página reflejan el límite.
- ¿Qué ocurre si otro operador elimina o bloquea a un usuario mientras se consulta? Al abrir su detalle se ve su nuevo estatus y, al guardar un cambio o ejecutar una acción que ese estatus ya no admite, se informa del motivo y la pantalla se actualiza.
- ¿Qué ocurre si dos operadores modifican a la vez el nombre de un mismo usuario activo? La plataforma no detecta ediciones simultáneas: prevalece el último guardado.
- ¿Qué ocurre si no se puede actualizar la cuenta de acceso de la persona al bloquear, desbloquear, eliminar o reactivar? El usuario conserva su estatus y el operador ve el motivo. Si la cuenta no existe, bloquear o eliminar se completa igualmente; desbloquear o reactivar se rechaza, porque sin cuenta la persona no podría iniciar sesión.
- ¿Qué ocurre si se elimina el último usuario con un role determinado? La plataforma decide si lo permite; el sistema muestra su respuesta sin interpretarla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar los usuarios activos de MailySoft en un listado paginado, con 10 usuarios por página por defecto, el total de usuarios activos, la página actual, controles para avanzar y retroceder, y la posibilidad de elegir 10, 25 o 50 usuarios por página.
- **FR-002**: Cada fila del listado DEBE mostrar al menos el nombre, el correo electrónico y la fecha de alta del usuario. El listado NO DEBE mostrar los roles: se ven en el detalle.
- **FR-003**: El sistema DEBE permitir abrir el detalle de un usuario con todos sus datos disponibles (incluidos su estatus y, si está activo, sus roles) y volver al listado en la misma página en la que estaba.
- **FR-004**: El listado, el detalle y la búsqueda DEBEN mostrar estados explícitos de carga, vacío (en el listado, con acción para crear un usuario) y error (con opción de reintentar).
- **FR-005**: El sistema DEBE permitir crear un usuario capturando su correo electrónico, nombre y apellido paterno (obligatorios), su apellido materno (opcional) y una contraseña inicial (obligatoria), y eligiendo al menos un role de sistema (obligatorio) entre los que ofrece la plataforma; el backoffice no crea, modifica ni elimina roles.
- **FR-006**: El sistema DEBE validar los datos antes de enviarlos (campos obligatorios y formatos) y mostrar el error junto a cada campo afectado; cuando la plataforma rechace un dato (por ejemplo, un correo duplicado o una contraseña que no cumple los requisitos de seguridad) DEBE mostrar el motivo junto al campo correspondiente.
- **FR-007**: El sistema DEBE impedir que una acción repetida (como pulsar "Guardar" varias veces) cree o modifique el mismo registro más de una vez, deshabilitando la acción mientras se procesa.
- **FR-008**: El sistema DEBE permitir modificar el nombre y los apellidos de un usuario activo, mostrando sus valores actuales y el correo como dato de solo lectura (el correo NO se puede cambiar), y permitir cancelar sin guardar cambios; los roles se administran aparte (FR-024).
- **FR-009**: El sistema DEBE exigir confirmación explícita, que indique el usuario y el role, antes de agregar o quitar un role de sistema de un usuario.
- **FR-010**: El sistema DEBE exigir confirmación explícita, que nombre al usuario, antes de bloquearlo, desbloquearlo, eliminarlo o reactivarlo, porque cada una de estas acciones cambia si la persona puede iniciar sesión.
- **FR-011**: Cuando la plataforma rechace una operación (duplicado, estatus del usuario que no admite la acción, falta de permisos, validación, contraseña rechazada o servicio de identidad no disponible), el sistema DEBE mostrar el motivo y dejar los datos sin cambios.
- **FR-012**: El sistema NO DEBE permitir que un operador elimine o bloquee su propio usuario ni se agregue o se quite roles a sí mismo.
- **FR-013**: Tras crear, modificar, agregar o quitar roles, bloquear, desbloquear, eliminar o reactivar con éxito, el sistema DEBE mostrar una confirmación y reflejar el cambio en las pantallas donde se muestra (listado, búsqueda y detalle) sin que el operador tenga que recargar la pantalla.
- **FR-014**: Cuando un usuario no exista o ya no esté activo al guardar un cambio de sus datos, el sistema DEBE informarlo, ofrecer volver al listado y dejar al usuario sin cambios. La plataforma no detecta ediciones simultáneas de un usuario activo: si dos operadores guardan sus cambios, prevalece el último.
- **FR-015**: El sistema DEBE ofrecer esta sección y cada una de sus acciones solo a los operadores que tengan el permiso correspondiente (consultar, buscar y ver los roles de un usuario: `users:read`; crear: `users:write`; modificar, agregar o quitar roles, bloquear, desbloquear y reactivar: `users:update`; eliminar: `users:delete`; ver los roles que se pueden agregar: `roles:read`), según la feature 001-auth-session-profile.
- **FR-016**: Todos los textos, mensajes y etiquetas DEBEN estar en español, y las fechas y horas DEBEN mostrarse en la zona horaria local del operador.
- **FR-017**: El listado DEBE mostrar solo usuarios activos y contarlos en su total: los usuarios bloqueados y eliminados no aparecen ni cuentan en él, y se encuentran con la búsqueda por correo (FR-018).
- **FR-018**: El sistema DEBE permitir buscar un usuario por su correo electrónico completo (sin distinguir mayúsculas ni espacios sobrantes) y encontrarlo con cualquier estatus, mostrando su estatus. Un correo vacío o con formato no válido DEBE rechazarse con un error junto al campo, y un correo sin coincidencia DEBE mostrar un aviso de que no se encontró ningún usuario. La búsqueda DEBE quedar reflejada en la dirección de la pantalla, de modo que recargarla o compartirla muestre el mismo resultado.
- **FR-019**: El sistema DEBE mostrar el estatus del usuario (Activo, Bloqueado o Eliminado) en el detalle y en los resultados de la búsqueda, y DEBE ofrecer cada acción solo cuando el estatus la admite: modificar, administrar roles, bloquear y eliminar a un usuario activo; desbloquear a uno bloqueado; reactivar a uno eliminado. Los roles de un usuario solo se muestran mientras está activo.
- **FR-020**: El sistema DEBE permitir bloquear a un usuario activo, desbloquear a uno bloqueado, eliminar a uno activo y reactivar a uno eliminado. Bloquear o eliminar impide que la persona inicie sesión y desbloquear o reactivar se lo devuelve: la plataforma actualiza su cuenta de acceso en la misma operación.
- **FR-021**: Si la plataforma no puede actualizar la cuenta de acceso de la persona (servicio de identidad no disponible o con error, o cuenta inexistente al desbloquear o reactivar), el usuario DEBE conservar su estatus y el operador DEBE ver el motivo, con opción de reintentar cuando proceda.
- **FR-022**: Eliminar un usuario DEBE poder deshacerse con la reactivación: el usuario eliminado conserva sus datos y las asignaciones de roles que tenía, y su correo sigue reservado (no puede crearse otro usuario con él).
- **FR-023**: Crear un usuario con roles DEBE hacerse en este orden: primero se crea el usuario y después se asigna cada role elegido, uno por uno. Si falla la creación, no se asigna ningún role y el usuario no se da por creado. Si la creación funciona y falla la asignación de uno o más roles, el sistema NO DEBE eliminar al usuario ni deshacer las asignaciones que sí funcionaron: DEBE mostrar que el usuario se creó, qué roles quedaron asignados y cuáles no, y permitir reintentar los que faltan desde el detalle del usuario.
- **FR-024**: El sistema DEBE mostrar los roles de un usuario activo y permitir agregarle o quitarle roles uno por uno desde su detalle. Un usuario puede tener varios roles; los roles que se pueden agregar son los que ofrece la plataforma y el usuario aún no tiene, y cada cambio lleva su propia confirmación (FR-009).
- **FR-025**: Crear un usuario con roles combina tres permisos (`users:write` para crearlo, `users:update` para asignarle roles y `roles:read` para listar los roles): el sistema DEBE ofrecer la acción "Crear usuario" solo a quien tiene los tres. La acción "Agregar role" DEBE ofrecerse solo a quien tiene `users:update` y `roles:read`; quitar un role solo requiere `users:update`.

### Key Entities *(include if feature involves data)*

- **Usuario de MailySoft**: Persona registrada en la plataforma. Atributos clave: correo electrónico (identifica de forma única al usuario, con cualquier estatus, y no se modifica una vez creado), nombre, apellido paterno, apellido materno (opcional), estatus (Activo, Bloqueado o Eliminado) y roles de sistema (uno o varios), además de las fechas de creación y de última modificación. Cada usuario tiene una cuenta de acceso en el proveedor de identidad, que la plataforma crea y mantiene al día con su estatus.
- **Role de sistema**: Clasificación global que se asigna a un usuario y le concede sus permisos. Pertenece a un catálogo definido por la plataforma; un usuario puede tener varios roles y un mismo role puede estar asignado a varios usuarios. Las asignaciones se conservan, sin efecto, mientras el usuario esté bloqueado o eliminado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador crea un usuario con sus roles en menos de 2 minutos.
- **SC-002**: La primera página del listado se muestra en menos de 2 segundos en el 95 % de las consultas, en condiciones normales de red.
- **SC-003**: El 100 % de los bloqueos, desbloqueos, eliminaciones, reactivaciones y asignaciones o retiros de role requieren una confirmación explícita previa.
- **SC-004**: Pulsar "Guardar" varias veces seguidas produce 0 registros duplicados.
- **SC-005**: Un operador agrega o quita un role de un usuario en menos de 1 minuto.
- **SC-006**: En el 100 % de los rechazos de la plataforma, el operador ve el motivo y los datos permanecen sin cambios.
- **SC-007**: Un operador localiza a un usuario, de cualquier estatus, escribiendo su correo completo en menos de 30 segundos.
- **SC-008**: En el 100 % de los bloqueos, desbloqueos, eliminaciones y reactivaciones correctos, el estatus que muestra el backoffice coincide con el de la plataforma, y en el 100 % de las fallas al actualizar la cuenta de acceso el usuario conserva su estatus anterior.
- **SC-009**: En el 100 % de las altas en las que falla la asignación de algún role, el usuario creado no se pierde y el operador ve qué roles quedaron asignados y cuáles faltan.

## Assumptions

- Dependencia: requiere la feature 001-auth-session-profile (sesión iniciada y role del operador).
- Fuente de las reglas de la plataforma: los contratos de la API de usuarios (specs 004, 006 y 008 del repositorio `mailySoft-usuarios`) son la fuente de verdad de campos, estatus, permisos y errores; se documentarán en `contracts/` durante la planeación.
- La plataforma de usuarios ofrece la consulta paginada de usuarios activos con el total de registros, la consulta por correo de un usuario con cualquier estatus, el detalle, el alta, la modificación, la eliminación lógica, la reactivación, el bloqueo y el desbloqueo, la asignación y el retiro de roles uno por uno, y el catálogo de roles. El listado tiene un orden fijo (por nombre y apellidos) y no incluye los roles de cada usuario.
- La plataforma no ofrece control de concurrencia para modificar usuarios: ante dos ediciones simultáneas de un usuario activo prevalece la última, y solo rechaza el guardado si el usuario no existe o ya no está activo.
- Un usuario puede tener varios roles de sistema; la plataforma solo asigna y quita roles a usuarios activos y no muestra los roles de un usuario que no lo está. Los atributos de un usuario son los del contrato de la plataforma: correo, nombre, apellido paterno, apellido materno opcional, estatus y fechas de creación y de modificación.
- El catálogo de roles de la plataforma todavía no distingue tipos de role: todos los roles activos son asignables. Cuando exista el tipo (de sistema o de usuario), el backoffice ofrecerá solo los de sistema.
- Crear un usuario lo registra en MailySoft y crea su cuenta de acceso en el proveedor de identidad en una sola operación de la plataforma (todo o nada); por eso el alta captura una contraseña inicial, que se usa únicamente para crear la cuenta y no se guarda ni se muestra después.
- La plataforma no ofrece una operación única para crear un usuario con sus roles: el alta es una secuencia (crear y luego asignar) cuyo orden y fallos parciales define FR-023, sin compensación que elimine al usuario porque su correo quedaría reservado y su cuenta de acceso ya existe. Si la plataforma ofrece esa operación en el futuro, la secuencia se sustituirá por ella.
- Las operaciones de esta sección dependen de los permisos del operador, según la feature 001-auth-session-profile: consultar, buscar y ver los roles de un usuario requieren `users:read`, crear `users:write`, modificar, administrar roles, bloquear, desbloquear y reactivar `users:update`, eliminar `users:delete` y ver los roles que se pueden agregar `roles:read`.
- El correo de un usuario no se modifica desde el backoffice: la plataforma no lo sincroniza con la cuenta de acceso con la que la persona inicia sesión, así que cambiarlo dejaría ambos distintos. Si la plataforma lo sincroniza en el futuro, podrá habilitarse su edición.
- El backoffice no obliga a la persona a cambiar la contraseña inicial: eso depende de la configuración del proveedor de identidad.
- La regla de que un operador no puede eliminarse ni bloquearse ni cambiarse los roles a sí mismo es una protección por defecto contra bloqueos y escaladas de privilegio.
- Los cambios de estatus (bloquear, desbloquear, eliminar y reactivar) los ejecuta la plataforma, que además actualiza la cuenta de acceso de la persona; el backoffice solo ofrece cada acción cuando el estatus la admite y muestra el resultado. Una regla como "no eliminar a quien es owner de una clínica" pertenecería al servicio de clínicas y no forma parte de esta feature.
- Fuera de alcance: búsqueda parcial, filtros y ordenamiento a elección (el listado ofrece paginación y un orden fijo, y la única búsqueda es por correo completo), exportación, acciones masivas, administración del catálogo de roles e historial de cambios.
