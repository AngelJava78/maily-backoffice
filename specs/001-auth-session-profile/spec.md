# Feature Specification: Acceso, Sesión y Perfil del Usuario

**Feature Branch**: `001-auth-session-profile`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Genera las especificaciones que sean necesarias." Alcance tomado de la descripción original del proyecto: autenticación con Auth0 con las opciones de login, logout y perfil del usuario, y administración de usuarios con un role de sistema (de donde sale el permiso de acceso al backoffice).

## Clarifications

### Session 2026-10-17

- Q: ¿Todos los roles que pueden entrar al backoffice hacen lo mismo y cuáles pueden entrar? → A: No hacen lo mismo. Un usuario puede tener uno o más roles y cada role tiene permisos, así que lo que un operador puede hacer depende de los permisos de sus roles. Pueden entrar los usuarios con al menos uno de los roles Administrator, Developer, Marketing o Billing; los demás roles no pueden entrar. Más adelante un campo de tipo de role (de sistema o de usuario) sustituirá esa lista: los roles de sistema entrarán al backoffice y los de usuario solo a la aplicación Front, aún no construida.
- Q: ¿Cómo se localiza al usuario de MailySoft de quien se identifica y qué estados le impiden entrar? → A: Por el identificador de su cuenta en el proveedor de identidad, que cada usuario de MailySoft tiene registrado. Solo un usuario con estatus Activo puede entrar (Bloqueado y Eliminado se deniegan) y solo cuentan sus roles activos (fuente: repositorio del servicio de usuarios compartido por el usuario).
- Q: ¿Qué permisos controlan cada sección y cada acción del backoffice? → A: Usuarios usa los permisos `users:*`, Tipos de suscripción `subscriptions:*` y Clínicas `tenants:*`; `read` es consultar (listar y mostrar), `write` crear, `update` modificar y `delete` eliminar.
- Q: ¿Quién puede usar la herramienta de token para Postman? → A: Todos los usuarios que pertenezcan a los roles de sistema (hoy Administrator, Developer, Marketing y Billing), sin necesitar un permiso específico.
- Q: ¿Después de cuánto tiempo sin actividad debe cerrarse automáticamente la sesión de un operador? → A: A los 15 minutos sin actividad.
- Q: Si a un operador se le bloquea la cuenta o se le quita un role mientras tiene la sesión abierta, ¿en cuánto tiempo debe dejar de poder usar el backoffice? → A: En máximo 5 minutos: el sistema vuelve a comprobar su cuenta, sus roles y sus permisos cada 5 minutos y cada vez que el operador regresa a la pestaña.
- Q: Si el operador recarga la página o abre el backoffice en otra pestaña mientras su sesión sigue vigente en el proveedor de identidad, ¿qué debe ocurrir? → A: Se acepta un clic extra. Si el navegador permite recuperar la sesión sin intervención, el operador sigue en la misma pantalla; si no, ve la pantalla de acceso y entra con un clic en "Iniciar sesión", sin escribir credenciales y regresando a la pantalla donde estaba. No se exige un dominio propio del proveedor de identidad.
- Q: ¿Hasta qué tamaño de pantalla debe diseñarse y probarse el backoffice: solo computadora y tablet horizontal, también tablet vertical o también celular? → A: Escritorio primero: se diseña y prueba para computadora y tablet horizontal (desde 1024 px de ancho); en pantallas más angostas, hasta 320 px, el contenido se reacomoda sin cortarse ni obligar a desplazarse de lado, pero no se diseña ni se prueba como experiencia móvil.
- Q: Si una persona sin sesión abre una dirección que no existe (por ejemplo, escribe mal una dirección como /usuaros), ¿qué debe ver primero? → A: Se la lleva a la pantalla de acceso para iniciar sesión, igual que con cualquier otra dirección; al entrar, ve "página no encontrada" con un enlace a la página principal.
- Q: Si la plataforma de usuarios no responde cuando alguien inicia sesión, ¿cuánto tiempo máximo debe ver el indicador de progreso antes de que aparezca el mensaje "No se pudo comprobar el acceso" con el botón Reintentar? → A: Como máximo 30 segundos en total, incluidos los reintentos automáticos.
- Q: ¿De dónde deben salir el nombre y el correo que se muestran en el encabezado y en el perfil: del usuario registrado en MailySoft, de la cuenta con la que se identificó en el proveedor de identidad o de ambos? → A: Del usuario de MailySoft. En el proveedor de identidad solo viven el correo, la contraseña y el identificador de la cuenta; los demás datos viven en la plataforma de usuarios, que el backoffice consulta (por identificador, correo o identificador de la cuenta) y muestra en el perfil. La plataforma no guarda imagen, así que se muestran las iniciales.
- Q: ¿Qué datos del usuario debe mostrar la pantalla de perfil? → A: Nombre, apellido paterno, apellido materno, correo electrónico, iniciales y roles activos.
- Q: Cuando alguien se identifica pero no puede entrar (no está en la base de usuarios, no está activo, no tiene un role con acceso o la plataforma no respondió), ¿el mensaje que ve debe incluir el correo de la cuenta con la que se identificó? → A: Sí. Los mensajes de acceso denegado y de comprobación fallida muestran el correo de la cuenta con la que se identificó, además del motivo y los botones; no muestran el nombre ni el enlace al perfil.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar sesión y entrar al backoffice (Priority: P1)

Un operador de MailySoft abre el backoffice sin sesión, se identifica con su cuenta corporativa y, una vez comprobado que tiene permiso de acceso, entra a la página principal, donde ve su nombre y las secciones a las que sus permisos le dan acceso.

**Why this priority**: Sin acceso identificado no se puede usar ni proteger ninguna otra funcionalidad del backoffice; es la base de todas las demás features.

**Independent Test**: Con una cuenta de prueba que tenga un role autorizado con permisos asignados, abrir el backoffice, iniciar sesión y comprobar que se llega a la página principal con el nombre del operador y las secciones que le corresponden. Entrega el valor de "entrar de forma segura" aunque todavía no existan las demás secciones.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** abre cualquier dirección del backoffice, **Then** ve la pantalla de acceso y no se muestra ningún dato protegido.
2. **Given** una persona en la pantalla de acceso, **When** elige "Iniciar sesión" y se identifica, en el proveedor de identidad y nunca en el backoffice, con credenciales válidas de una cuenta registrada en MailySoft, activa y con al menos un role autorizado (Administrator, Developer, Marketing o Billing), **Then** entra al backoffice y llega a la página principal.
3. **Given** una persona sin sesión que abrió una dirección interna concreta, **When** completa el inicio de sesión, **Then** llega a esa dirección y no a la página principal.
4. **Given** un operador con sesión activa, **When** abre la pantalla de acceso, **Then** es llevado a la página principal sin tener que identificarse otra vez.
5. **Given** un operador que acaba de entrar, **When** observa la página principal, **Then** ve su nombre, la opción de cerrar sesión, el acceso a su perfil y solo las secciones del backoffice para las que alguno de sus roles autorizados concede permiso de consulta.
6. **Given** un operador con un role autorizado que todavía no tiene permisos asignados, **When** entra, **Then** llega a la página principal sin secciones de administración y con un aviso de que su role no tiene permisos asignados; si la herramienta de token para Postman está habilitada, la sigue viendo.
7. **Given** un usuario con varios roles, de los cuales solo uno es autorizado (por ejemplo, Marketing y Owner), **When** entra, **Then** accede al backoffice y solo cuentan los permisos de su role autorizado.

---

### User Story 2 - Bloquear el acceso a cuentas no autorizadas (Priority: P1)

Una persona logra identificarse, pero no tiene un usuario registrado en MailySoft, su cuenta no está activa o ninguno de sus roles está autorizado para el backoffice. El sistema le niega el acceso con un mensaje claro y le permite cerrar sesión. Si el acceso se retira a alguien que ya tiene la sesión abierta, también lo pierde en pocos minutos.

**Why this priority**: El backoffice administra información de todos los clientes de MailySoft; identificarse no basta, hay que comprobar que la persona tiene permiso. Sin esta barrera no es seguro liberar ninguna otra funcionalidad.

**Independent Test**: Con cuentas de prueba (sin usuario en MailySoft, con usuario bloqueado, con usuario eliminado, solo con un role no autorizado como Owner, y con un role autorizado), intentar entrar con cada una: las cuatro primeras ven "acceso denegado" sin datos protegidos y la última entra. Después, con la sesión de esa última abierta, bloquearle la cuenta y comprobar que en un máximo de 5 minutos deja de ver contenido protegido.

**Acceptance Scenarios**:

1. **Given** una persona identificada que no tiene usuario en MailySoft, **When** intenta entrar, **Then** ve un mensaje de acceso denegado que explica que su cuenta no está registrada, muestra el correo de la cuenta con la que se identificó y le permite cerrar sesión.
2. **Given** una persona identificada cuyo usuario está bloqueado o eliminado, **When** intenta entrar, **Then** ve un mensaje de acceso denegado que indica que su cuenta no está activa y no se carga ninguna sección ni dato protegido.
3. **Given** una persona identificada cuyos roles no incluyen ninguno de los autorizados (por ejemplo, solo el role Owner), **When** intenta entrar, **Then** ve un mensaje de acceso denegado que indica que no tiene un role con acceso y no se carga ninguna sección ni dato protegido.
4. **Given** una persona con acceso denegado, **When** intenta abrir directamente una dirección interna, **Then** vuelve a ver el acceso denegado.
5. **Given** que el sistema no puede determinar el usuario, sus roles o sus permisos porque la plataforma no responde, **When** una persona intenta entrar, **Then** el acceso no se concede, se informa del problema con el correo de la cuenta con la que se identificó y se ofrece reintentar o cerrar sesión.
6. **Given** un operador con sesión activa cuyos roles o permisos fueron retirados o cambiados, **When** ejecuta una operación que la plataforma rechaza por falta de permisos, **Then** ve un mensaje de "sin permisos" para esa acción y su sesión permanece activa.
7. **Given** un operador con sesión activa a quien se le bloquea la cuenta o se le retiran todos sus roles autorizados, **When** se hace la siguiente comprobación (como máximo 5 minutos después, al regresar a la pestaña o al recargar la aplicación), **Then** deja de ver contenido protegido y ve el acceso denegado con el motivo.
8. **Given** un operador con sesión activa a quien se le quita un permiso, **When** se hace la siguiente comprobación, **Then** las secciones y las acciones visibles se actualizan y, si estaba en una sección que ya no le corresponde, es llevado a la página principal con un aviso.

---

### User Story 3 - Cerrar sesión (Priority: P2)

Un operador con sesión activa cierra su sesión desde cualquier pantalla. La sesión termina por completo, también en el proveedor de identidad, y los datos dejan de ser accesibles.

**Why this priority**: Protege la información en equipos compartidos o desatendidos y evita accesos residuales. Se prioriza después del acceso porque solo puede probarse con una sesión iniciada.

**Independent Test**: Con una sesión activa, cerrar sesión y comprobar que se muestra la pantalla de acceso, que el botón "Atrás" del navegador no revela datos y que volver a entrar exige identificarse otra vez.

**Acceptance Scenarios**:

1. **Given** un operador con sesión activa en cualquier pantalla, **When** elige "Cerrar sesión", **Then** vuelve a la pantalla de acceso y su nombre y sus datos dejan de mostrarse.
2. **Given** una sesión recién cerrada, **When** el operador usa el botón "Atrás" del navegador, **Then** no se muestra información protegida y se le pide iniciar sesión.
3. **Given** una sesión recién cerrada, **When** el operador elige "Iniciar sesión" de nuevo, **Then** debe identificarse otra vez y no entra automáticamente con la sesión anterior.
4. **Given** dos pestañas abiertas con sesión, **When** el operador cierra sesión en una, **Then** en la otra la siguiente acción que requiera datos lo lleva a la pantalla de acceso sin mostrar datos nuevos.

---

### User Story 4 - Recuperarse de una sesión vencida o cerrada por inactividad sin perder el contexto (Priority: P2)

Si la sesión del operador vence, no puede renovarse o se cierra por llevar 15 minutos sin actividad, el sistema lo lleva a identificarse de nuevo y, al terminar, lo devuelve a la pantalla donde estaba.

**Why this priority**: Evita perder el contexto de trabajo y garantiza que una sesión vencida o abandonada no conserva acceso a la información.

**Independent Test**: Con una sesión activa, forzar su vencimiento o dejarla 15 minutos sin actividad y realizar una acción: se pide identificarse y, tras hacerlo, se regresa a la misma pantalla.

**Acceptance Scenarios**:

1. **Given** un operador cuya sesión ha vencido, **When** realiza una acción que requiere datos, **Then** es llevado a la pantalla de acceso y no se muestran datos nuevos.
2. **Given** un operador llevado a identificarse por el vencimiento de su sesión o por inactividad, **When** completa la identificación, **Then** regresa a la pantalla donde estaba.
3. **Given** un operador que lleva 14 minutos sin actividad, **When** se cumple ese tiempo, **Then** ve un aviso de que su sesión se cerrará por inactividad en un minuto, con la opción de continuar.
4. **Given** el aviso de cierre por inactividad, **When** el operador elige continuar, **Then** su sesión sigue activa y el conteo de inactividad empieza de nuevo.
5. **Given** un operador que llega a 15 minutos sin actividad, **When** no responde al aviso, **Then** su sesión se cierra, es llevado a la pantalla de acceso con un mensaje que indica que fue por inactividad y no se muestran datos protegidos.

---

### User Story 5 - Consultar mi perfil (Priority: P3)

El operador abre su perfil para ver con qué identidad y con qué roles está operando.

**Why this priority**: Es útil para confirmar la cuenta en uso y para soporte, pero no bloquea ninguna otra funcionalidad y tiene bajo riesgo.

**Independent Test**: Con una sesión activa, abrir el perfil y comparar los datos mostrados con los de la cuenta de prueba.

**Acceptance Scenarios**:

1. **Given** un operador con sesión activa, **When** abre su perfil desde cualquier pantalla, **Then** ve su nombre, su apellido paterno, su apellido materno (si lo tiene), su correo electrónico, sus iniciales y sus roles activos.
2. **Given** el perfil abierto, **When** el operador busca la forma de editar sus datos, **Then** no existe: el perfil es de solo lectura.

---

### Edge Cases

- ¿Qué ocurre si la persona cancela el proceso de identificación? Vuelve a la pantalla de acceso con un mensaje neutro y puede intentarlo de nuevo.
- ¿Qué ocurre si el proveedor de identidad no está disponible o rechaza las credenciales? Se muestra un mensaje claro, sin detalles técnicos, con la opción de reintentar; no se concede acceso.
- ¿Qué ocurre si el usuario existe en MailySoft pero está bloqueado o eliminado? Se deniega el acceso indicando que su cuenta no está activa.
- ¿Qué ocurre si un role autorizado del usuario está bloqueado o eliminado? No cuenta aunque siga asignado: si no le queda ningún role autorizado activo, se deniega el acceso.
- ¿Qué ocurre si el usuario tiene roles autorizados y no autorizados? Entra, y solo cuentan los permisos de sus roles autorizados activos.
- ¿Qué ocurre si un role concede crear, modificar o eliminar en un recurso pero no consultarlo (por ejemplo, `users:write` sin `users:read`)? La sección no se muestra, porque consultar es la base de las demás acciones, que solo se ofrecen dentro de la sección.
- ¿Qué ocurre mientras se verifica el acceso y la plataforma tarda en responder? Se muestra un indicador de progreso, sin contenido protegido ni parcial; si pasan 30 segundos sin respuesta, se trata como fallo (ver FR-005).
- ¿Qué ocurre si se abre una dirección que no existe? Sin sesión, se lleva a la pantalla de acceso, igual que con cualquier otra dirección (ver FR-001); con acceso concedido, se muestra "página no encontrada" con un enlace a la página principal (ver FR-016); con acceso denegado, se muestra el acceso denegado (ver User Story 2, escenario 4).
- ¿Qué ocurre si cambian los roles o los permisos de un operador mientras tiene la sesión abierta? El cambio se aplica en la siguiente comprobación, como máximo 5 minutos después (ver FR-019 y FR-021); mientras tanto, lo que ya no le corresponde es rechazado por la plataforma (ver User Story 2, escenario 6).
- ¿Qué ocurre si una comprobación periódica no puede completarse porque la plataforma no responde? El operador conserva el acceso que tenía, se reintenta en la siguiente comprobación y las operaciones que necesiten a la plataforma muestran su propio error.
- ¿Qué ocurre con varias pestañas abiertas respecto a la inactividad? La actividad en cualquiera de ellas cuenta: la sesión se cierra solo si ninguna tiene actividad durante 15 minutos.
- ¿Qué ocurre si el operador recarga la página o abre el backoffice en otra pestaña mientras su sesión sigue vigente en el proveedor de identidad? Si el navegador permite recuperar la sesión sin intervención, el operador permanece en la misma pantalla. Si no, ve la pantalla de acceso, entra con un clic en "Iniciar sesión" sin escribir credenciales y regresa a la pantalla donde estaba (ver FR-007); esa fricción es aceptable y no cuenta como fallo.
- ¿Qué ocurre con lo que el operador estaba capturando en un formulario sin guardar cuando la sesión se cierra? Se pierde; por eso escribir cuenta como actividad y existe el aviso previo al cierre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exigir una sesión iniciada para acceder a cualquier sección del backoffice; la única pantalla accesible sin sesión es la pantalla de acceso.
- **FR-002**: El sistema DEBE permitir iniciar sesión mediante el proveedor de identidad corporativo de MailySoft, sin que el backoffice reciba, muestre ni almacene contraseñas.
- **FR-003**: Tras identificarse una persona, el sistema DEBE localizar su usuario en MailySoft mediante el identificador de su cuenta en el proveedor de identidad y obtener su estatus, sus roles activos y los permisos de esos roles, antes de mostrar cualquier contenido protegido.
- **FR-004**: El sistema DEBE conceder el acceso solo si la persona tiene un usuario en MailySoft con estatus Activo y al menos un role activo entre Administrator, Developer, Marketing y Billing; en cualquier otro caso DEBE mostrar un mensaje de acceso denegado que indique el motivo (cuenta no registrada, cuenta no activa o ningún role con acceso) y el correo de la cuenta con la que la persona se identificó, y ofrecer cerrar sesión.
- **FR-005**: Si el sistema no puede determinar el usuario, sus roles o sus permisos (por error o indisponibilidad de la plataforma), DEBE denegar el acceso, informar del problema, mostrar el correo de la cuenta con la que la persona se identificó y ofrecer reintentar o cerrar sesión. Si la plataforma no responde en la primera determinación del acceso (al iniciar sesión, al recargar o al reintentar), DEBE mostrar ese aviso como máximo 30 segundos después de iniciada la comprobación, contando los reintentos automáticos.
- **FR-006**: Mientras se verifica el acceso, el sistema DEBE mostrar un indicador de progreso y NO DEBE mostrar contenido protegido ni parcial.
- **FR-007**: Tras un inicio de sesión exitoso, el sistema DEBE llevar al operador a la dirección que había solicitado originalmente o, si no hubo una, a la página principal.
- **FR-008**: Todas las pantallas con acceso concedido DEBEN mostrar el nombre del operador (su nombre y su apellido paterno) y ofrecer cerrar sesión y abrir su perfil; las de acceso denegado y de comprobación fallida no muestran el nombre ni el perfil, solo lo que indican FR-004 y FR-005.
- **FR-009**: La navegación DEBE listar solo las secciones de administración que existan y que el operador pueda usar según sus permisos (ver FR-017): Usuarios, Tipos de suscripción y Clínicas. Además, cuando esté habilitada, DEBE ofrecer la herramienta de token para Postman a todo operador con acceso al backoffice, sin exigir un permiso específico.
- **FR-010**: El sistema DEBE permitir cerrar sesión desde cualquier pantalla; al hacerlo DEBE terminar la sesión también en el proveedor de identidad, descartar los datos del operador que el backoffice conserve y llevar a la pantalla de acceso.
- **FR-011**: Tras cerrar sesión, el sistema NO DEBE mostrar datos protegidos aunque el operador retroceda en el historial del navegador, y cualquier acceso posterior DEBE exigir identificarse de nuevo.
- **FR-012**: El sistema DEBE ofrecer una pantalla de perfil de solo lectura con el nombre, el apellido paterno, el apellido materno, el correo electrónico, las iniciales y los roles activos del operador, tomados de su usuario de MailySoft; si el usuario no tiene apellido materno, ese dato se muestra vacío (—).
- **FR-013**: Si la sesión vence o no puede renovarse, el sistema DEBE llevar al operador a la pantalla de acceso y, tras identificarse de nuevo, devolverlo a la pantalla donde estaba.
- **FR-014**: Si la plataforma rechaza una operación por falta de permisos, el sistema DEBE informar al operador de que no tiene permiso para esa acción sin cerrar su sesión.
- **FR-015**: El sistema DEBE mostrar mensajes claros, en español, cuando el inicio de sesión se cancele o falle (cancelación, proveedor de identidad no disponible, credenciales rechazadas) y ofrecer volver a intentarlo.
- **FR-016**: El sistema DEBE mostrar una pantalla de "página no encontrada" con un enlace a la página principal cuando un operador con acceso abra una dirección inexistente; sin sesión se aplica FR-001 y con acceso denegado, FR-004.
- **FR-017**: El sistema DEBE mostrar cada sección de administración y cada una de sus acciones solo cuando el operador tiene el permiso que le corresponde: la sección Usuarios usa los permisos `users:*`, Tipos de suscripción usa `subscriptions:*` y Clínicas usa `tenants:*`. Ver la sección, su listado y su detalle requiere `read`; crear, `write`; modificar, `update`; y eliminar, `delete`. Solo cuentan los permisos de sus roles activos autorizados (Administrator, Developer, Marketing y Billing); los permisos de cualquier otro role no cuentan en el backoffice.
- **FR-018**: Si el operador no tiene permiso de consulta para ninguna sección, el sistema DEBE llevarlo a la página principal sin secciones de administración y con un aviso de que su role no tiene permisos asignados.
- **FR-019**: El sistema DEBE determinar el estatus de la cuenta, los roles y los permisos del operador al iniciar sesión y volver a determinarlos cada 5 minutos mientras la sesión esté abierta, cada vez que el operador regrese a la pestaña y cada vez que se recargue la aplicación. Estas comprobaciones automáticas no cuentan como actividad del operador (ver FR-020).
- **FR-020**: El sistema DEBE cerrar la sesión del operador, con los mismos efectos que al cerrar sesión (ver FR-010), cuando pasen 15 minutos sin actividad; cualquier clic, tecla o navegación dentro del backoffice, en cualquier pestaña abierta, cuenta como actividad. Un minuto antes DEBE avisar al operador y permitirle continuar; al cerrarse DEBE llevarlo a la pantalla de acceso indicando que fue por inactividad y, tras identificarse de nuevo, devolverlo a la pantalla donde estaba (ver FR-013).
- **FR-021**: Si en una nueva comprobación el operador ya no cumple las condiciones de acceso (cuenta no activa o ningún role autorizado activo), el sistema DEBE retirar de inmediato todo contenido protegido y mostrar el acceso denegado con el motivo; si solo cambiaron sus permisos, DEBE actualizar de inmediato las secciones y las acciones visibles y, si la sección en la que está ya no le corresponde, llevarlo a la página principal con un aviso.
- **FR-022**: La interfaz DEBE adaptarse al ancho de la ventana. Se diseña y se prueba para computadora y tablet horizontal (desde 1024 px de ancho); en anchos menores, hasta 320 px, DEBE reacomodar el contenido sin cortarlo ni obligar a desplazarse horizontalmente por la página. La experiencia móvil no se diseña ni se prueba.

### Key Entities *(include if feature involves data)*

- **Operador**: Persona del equipo de MailySoft que usa el backoffice. Corresponde a un usuario de MailySoft con uno o más roles; su nombre, sus apellidos y su correo electrónico salen de ese usuario, no del proveedor de identidad.
- **Usuario de MailySoft**: Registro de una persona en la plataforma, con sus datos, el identificador de su cuenta en el proveedor de identidad, un estatus (Activo, Bloqueado o Eliminado) y cero o más roles. El operador es el usuario de MailySoft que corresponde a la identidad con la que se autentica.
- **Role**: Agrupación de permisos que se asigna a usuarios; tiene un nombre y un estatus (Activo, Bloqueado o Eliminado). Los roles autorizados para el backoffice son Administrator, Developer, Marketing y Billing; más adelante un tipo de role (de sistema o de usuario) decidirá cuáles pueden entrar.
- **Permiso**: Autorización para realizar una acción sobre un recurso, con el formato `recurso:acción` (por ejemplo, `users:read`). Las acciones son `read` (consultar: listar y mostrar), `write` (crear), `update` (modificar) y `delete` (eliminar). Se concede a través de los roles.
- **Sesión**: Periodo durante el cual el operador permanece identificado; termina por cierre voluntario, vencimiento, inactividad o imposibilidad de renovarla.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona con cuenta autorizada llega a la página principal en menos de 5 segundos desde que termina de identificarse, en el 95 % de los inicios de sesión.
- **SC-002**: El 100 % de los intentos de acceso con cuentas sin usuario en MailySoft, con usuario bloqueado o eliminado, o sin ningún role autorizado son denegados sin mostrar ningún dato protegido (verificado con una cuenta de prueba de cada caso).
- **SC-003**: Después de cerrar sesión, el 100 % de las direcciones internas exigen identificarse de nuevo, incluido el uso del botón "Atrás" del navegador.
- **SC-004**: Cuando la sesión vence, el 100 % de los operadores es devuelto a la pantalla en la que estaba tras volver a identificarse.
- **SC-005**: Un operador puede cerrar sesión o abrir su perfil en 2 interacciones o menos desde cualquier pantalla.
- **SC-006**: Ante cualquier fallo del proceso de acceso (cancelación, proveedor de identidad no disponible, plataforma no disponible), el operador ve un mensaje comprensible y una acción para continuar en el 100 % de los casos probados.
- **SC-007**: En el 100 % de las pruebas con una cuenta de cada role autorizado, las secciones y las acciones visibles coinciden exactamente con los permisos asignados a su role.
- **SC-008**: El 100 % de las sesiones con 15 minutos sin actividad se cierran, y el operador recibe el aviso previo un minuto antes en el 100 % de esos casos.
- **SC-009**: Cuando se bloquea la cuenta de un operador o se le retira su último role autorizado, deja de ver contenido protegido en un máximo de 5 minutos en el 100 % de los casos probados.
- **SC-010**: En el 100 % de las pantallas de esta feature, con la ventana a 1024 px y a 320 px de ancho, no se corta ningún contenido ni aparece desplazamiento horizontal de la página (verificado en un navegador con esos dos anchos).
- **SC-011**: Cuando la plataforma no responde en la primera determinación del acceso, el 100 % de las personas ve el aviso de que no se pudo comprobar el acceso, con la opción de reintentar o cerrar sesión, en un máximo de 30 segundos desde que empieza la comprobación (verificado con una plataforma simulada que no responde).

## Assumptions

- Todo el personal que usa el backoffice se identifica con el proveedor de identidad corporativo de MailySoft (Auth0); el backoffice nunca recibe ni almacena contraseñas.
- Cada usuario de MailySoft tiene registrado el identificador único de su cuenta en el proveedor de identidad; con él se localiza al usuario tras identificarse. Cada persona que deba usar el backoffice necesita ese usuario (se crea con la feature de administración de usuarios).
- En el proveedor de identidad solo viven el correo, la contraseña y el identificador de la cuenta; los demás datos de la persona (nombre, apellidos, estatus y roles) viven en la plataforma de usuarios, que el backoffice consulta para el encabezado y el perfil. Del proveedor solo se leen el identificador de la cuenta y, para los mensajes de acceso denegado y de comprobación fallida, su correo. La plataforma de usuarios no guarda imagen, así que el perfil muestra las iniciales.
- Un usuario puede tener uno o más roles (o ninguno) y cada role puede tener varios permisos.
- Los roles autorizados son Administrator, Developer, Marketing y Billing, y deben existir en la plataforma; cualquier otro role no da acceso. Cuando exista el tipo de role (de sistema o de usuario), el acceso se decidirá por ese tipo en lugar de por esta lista: los roles de sistema entran al backoffice y los de usuario solo a la aplicación Front, que aún no existe y queda fuera de alcance.
- Solo cuentan los roles activos y, de ellos, los autorizados: un role bloqueado o eliminado no concede acceso ni permisos aunque siga asignado, y los permisos de los roles no autorizados (por ejemplo, de un role pensado para la aplicación Front) no dan capacidades en el backoffice.
- Los permisos de cada role los administra la plataforma, hoy mediante las operaciones del servicio de usuarios y no desde el backoffice. En los datos iniciales de la plataforma ningún role tiene permisos asignados, por lo que deben asignarse antes de que los operadores puedan usar las secciones.
- Dependencia de seguridad: la plataforma debe verificar la identidad y los permisos en cada operación. Hoy el servicio de usuarios no controla el acceso, así que mientras no lo haga el backoffice solo oculta opciones y no es una barrera de seguridad.
- La duración máxima de la sesión, su renovación y las políticas de contraseña o verificación en dos pasos las define el proveedor de identidad; además, el backoffice cierra la sesión tras 15 minutos sin actividad (ver FR-020).
- Recuperar la sesión sin intervención al recargar o abrir otra pestaña depende del navegador y no se garantiza en todos (ver Edge Cases). Evitar el clic extra exigiría un dominio propio del proveedor de identidad, que queda como mejora opcional de despliegue y fuera de alcance de esta feature.
- El perfil es de solo lectura; editar datos personales o cambiar la contraseña se hace fuera del backoffice.
- La interfaz está en español y se diseña y prueba para navegadores de escritorio actuales y tablet en horizontal (desde 1024 px de ancho); la experiencia móvil queda fuera de alcance, aunque en anchos menores el contenido se reacomoda (ver FR-022).
- Dependencia: la plataforma de usuarios debe poder devolver el usuario correspondiente al identificador de la cuenta autenticada, con sus datos (nombre, apellidos, correo), su estatus, sus roles activos y los permisos de cada role.
- Fuera de alcance: registro autónomo de cuentas, recuperación de contraseña, administración de roles y permisos, registro de auditoría de accesos y la aplicación Front para los roles de usuario.
