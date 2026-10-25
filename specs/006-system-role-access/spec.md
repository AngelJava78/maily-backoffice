# Feature Specification: Acceso al Backoffice Solo con Rol de Sistema

**Feature Branch**: `006-system-role-access`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Spec 1: Solo usuarios con rol de sistema ingresan al Backoffice." La descripción completa (contexto, supuestos a verificar, requisitos, fuera de alcance y criterios de aceptación) se recoge en esta especificación, y los supuestos se verificaron leyendo `mailySoft-usuarios` (ver Assumptions). Objetivo literal: "Solo ingresan al Backoffice los usuarios con al menos un rol de tipo Sistema. Cualquier otro usuario autenticado ve una página que le indica que no tiene acceso." Es la «Spec 1» de la serie del solicitante; en este repositorio es la feature 006, el número con el que la feature 007 ya se refería a este cambio.

## Clarifications

### Session 2026-10-21

- Q: ¿Se debe comprobar el estatus Activo del usuario de forma explícita en la regla de acceso, y qué mensaje ve en «Sin acceso» quien no está Activo? → A: Sí se comprueba explícitamente, como protección adicional; se usa el mismo mensaje único de «Sin acceso» para todo motivo (sin rol de Sistema, cuenta no activa o cuenta no registrada), sin distinguir el motivo en el texto.
- Q: ¿La página «Sin acceso» debe incluir el enlace «Ir a MailySoft», y qué pasa si un ambiente no define la URL de esa aplicación? → A: Se incluye mediante una variable de entorno opcional; si un ambiente no la define, el enlace no aparece y el Backoffice arranca con normalidad.

## User Scenarios & Testing *(mandatory)*

Hoy el Backoffice deja entrar a quien tiene un usuario Activo en MailySoft y al menos un rol activo cuyo nombre está en una lista fija: Administrator, Developer, Marketing y Billing (feature 001, FR-004). La plataforma de usuarios ya informa, en la consulta de acceso de la propia persona, el **tipo** de cada rol: 1 Sistema, que da acceso al Backoffice, y 2 Clínica, que da acceso a la aplicación de MailySoft para clínicas. Esta feature sustituye la lista de nombres por el tipo, lleva a quien no tiene acceso a una página propia, «Sin acceso», y define cómo se trata cada respuesta de esa consulta. En este documento, «rol de Sistema» es un rol activo de tipo 1 que devuelve la consulta de acceso.

### User Story 1 - Entrar al Backoffice con un rol de Sistema (Priority: P1)

Una persona con al menos un rol de Sistema inicia sesión y entra al Backoffice como hasta ahora. No importa cómo se llame el rol ni si tiene además roles de Clínica: basta con uno de Sistema. Lo que puede ver y hacer dentro sigue dependiendo de sus permisos, pero solo de los de sus roles de Sistema.

**Why this priority**: Es el camino de todos los operadores. Si la regla nueva dejara fuera a quien sí tiene un rol de Sistema, nadie podría usar el Backoffice.

**Independent Test**: Con respuestas simuladas de la consulta de acceso (y con cuentas de prueba en un entorno real), iniciar sesión con solo roles de Sistema; con un rol de Sistema y uno de Clínica; con un rol de Sistema cuyo nombre no estaba en la lista de la feature 001 (por ejemplo, Support); y con un tipo Sistema que llega con otro nombre. En todos los casos se entra al Backoffice.

**Acceptance Scenarios**:

1. **Given** una persona con usuario Activo y un rol de Sistema, **When** inicia sesión, **Then** entra al Backoffice y llega a la dirección que había pedido o, si no pidió ninguna, al Panel, como hoy.
2. **Given** una persona con un rol de Sistema y otro de Clínica, **When** inicia sesión, **Then** entra, y las secciones y acciones que ve dependen solo de los permisos de su rol de Sistema: los del rol de Clínica no le dan ninguna.
3. **Given** una persona cuyo único rol de Sistema no estaba en la lista de la feature 001 (por ejemplo, Support) o fue renombrado, **When** inicia sesión, **Then** entra.
4. **Given** una persona cuyo único rol es de Clínica, aunque se llame como uno de la lista anterior (por ejemplo, «Marketing» de tipo Clínica), **When** inicia sesión, **Then** no entra y llega a «Sin acceso».
5. **Given** una respuesta en la que el tipo Sistema llega con otro nombre (por ejemplo, «System») y otra en la que un tipo Clínica llega llamado «Sistema», **When** se decide el acceso, **Then** decide solo el identificador del tipo: entra quien tiene un rol de tipo 1 y no entra quien solo tiene roles de tipo 2.

---

### User Story 2 - Ver «Sin acceso» cuando no se tiene un rol de Sistema (Priority: P1)

Una persona se identifica, pero la plataforma no le reconoce ningún rol de Sistema: solo tiene roles de Clínica, no tiene roles, no está registrada en MailySoft o su usuario no está Activo. El Backoffice la lleva a la página «Sin acceso», que no forma parte de las pantallas internas: le dice que no tiene acceso, con qué cuenta inició sesión y qué puede hacer. Escriba la dirección que escriba, no ve nada del Backoffice.

**Why this priority**: Es la barrera que protege la información de todos los clientes y el objetivo de la feature. Identificarse no basta, y quien no debe entrar necesita saber por qué y cómo salir.

**Independent Test**: Con respuestas simuladas (solo roles de Clínica, sin roles, sin usuario, usuario Bloqueado) y con cuentas de prueba, iniciar sesión y comprobar que se llega a «Sin acceso» con el título, el mensaje, el correo y las acciones, sin menú ni encabezado. Después, escribir direcciones internas (Panel, Perfil, Usuarios, Suscripciones, Token y una inexistente) y comprobar que siempre se vuelve a «Sin acceso» sin ver nada interno.

**Acceptance Scenarios**:

1. **Given** una persona con solo roles de Clínica, **When** inicia sesión, **Then** llega a «Sin acceso» y ve el título «No tienes acceso al Backoffice», el mensaje «Tu usuario no tiene un rol de sistema asignado. Si crees que es un error, contacta al administrador.», la línea «Iniciaste sesión como» seguida del correo de su usuario, el botón «Cerrar sesión» y el enlace «Ir a MailySoft» según FR-015; no ve el menú, el encabezado, su nombre ni el enlace a su perfil.
2. **Given** una persona registrada y Activa sin ningún rol, **When** inicia sesión, **Then** llega a «Sin acceso».
3. **Given** una persona identificada que no tiene usuario en MailySoft, **When** inicia sesión, **Then** llega a «Sin acceso» y el correo que ve es el de la cuenta con la que se identificó.
4. **Given** una persona cuyo usuario no está Activo (Bloqueado, Eliminado u otro estatus), **When** inicia sesión, **Then** llega a «Sin acceso» (ver FR-003).
5. **Given** una persona sin acceso, **When** escribe o abre cualquier dirección interna, exista o no (por ejemplo, el Panel, el perfil, el detalle de un usuario o una dirección mal escrita), **Then** es llevada a «Sin acceso» y en ningún momento ve contenido interno.
6. **Given** una persona en «Sin acceso», **When** usa el botón «Atrás» del navegador o vuelve a escribir una dirección interna, **Then** sigue sin ver contenido interno y vuelve a «Sin acceso».
7. **Given** una persona sin rol de Sistema cuya respuesta indica además un cambio de contraseña pendiente, **When** inicia sesión, **Then** llega a «Sin acceso»: la falta de acceso tiene prioridad.
8. **Given** una persona con acceso, **When** abre la dirección de «Sin acceso», **Then** es llevada al Panel.
9. **Given** una persona sin sesión, **When** abre la dirección de «Sin acceso», **Then** es llevada a la pantalla de inicio de sesión y, tras identificarse, ve lo que le corresponde según la regla: el Panel si tiene acceso, «Sin acceso» si no.

---

### User Story 3 - No ver nada interno mientras se comprueba el acceso (Priority: P1)

Cada vez que se inicia la sesión en una pestaña (al volver del inicio de sesión, al recargar, al abrir otra pestaña o al entrar directamente por una dirección interna), el Backoffice comprueba el acceso antes de mostrar nada. Mientras tanto, la persona ve solo un indicador de carga.

**Why this priority**: Si una pantalla interna apareciera aunque fuera un instante, o se pidieran datos antes de saber si la persona puede verlos, la barrera de la User Story 2 no serviría.

**Independent Test**: Con la consulta de acceso simulada y retrasada, abrir el Backoffice por varias direcciones internas, recargar y abrir otra pestaña. Comprobar que durante la espera solo se ve el indicador de carga y que no se hace ninguna otra consulta a las APIs de MailySoft hasta que llega la respuesta.

**Acceptance Scenarios**:

1. **Given** una persona que vuelve del inicio de sesión, **When** el Backoffice comprueba su acceso, **Then** ve solo un indicador de carga hasta conocer el resultado.
2. **Given** una persona con sesión, **When** recarga la página, abre el Backoffice en otra pestaña o entra directamente por una dirección interna, **Then** el acceso se comprueba de nuevo antes de mostrar nada.
3. **Given** la comprobación en curso, **When** la persona mira la pantalla, **Then** no ve el menú, el encabezado, el Panel ni ninguna otra pantalla interna, ni por un instante.
4. **Given** la comprobación en curso, **When** se observan las consultas del Backoffice, **Then** no se hace ninguna otra consulta a las APIs de MailySoft hasta tener el resultado.
5. **Given** una persona con la sesión abierta a quien se le retira su último rol de Sistema, **When** se vuelve a iniciar la sesión (por ejemplo, al recargar), **Then** llega a «Sin acceso». No se exige detectarlo en tiempo real (ver FR-009).

---

### User Story 4 - Recuperarse cuando no se puede comprobar el acceso (Priority: P2)

Si la consulta de acceso falla, el Backoffice no adivina: no concede el acceso ni muestra «Sin acceso», sino un error con «Reintentar». Un rechazo por sesión no válida lleva a iniciar sesión, como hoy, y un rechazo por falta de permiso o porque no se encuentra a la persona se trata como «sin acceso».

**Why this priority**: Un fallo pasajero de la plataforma no debe dejar entrar a nadie ni hacer creer a un operador legítimo que perdió su acceso. Depende de las historias anteriores, que definen a dónde lleva cada resultado.

**Independent Test**: Con la consulta simulada respondiendo un error de red, un error del servidor, una respuesta con formato inválido, una sesión no válida, una falta de permiso y un «no encontrado», comprobar en cada caso la pantalla que se muestra y que «Reintentar» vuelve a comprobar.

**Acceptance Scenarios**:

1. **Given** la consulta falla por un error de red, por tiempo agotado o por un error del servidor, **When** termina la comprobación (con sus reintentos automáticos, en un máximo de 30 segundos), **Then** la persona ve una página de error con «Reintentar» y no entra ni ve «Sin acceso».
2. **Given** la consulta responde con un formato inesperado (por ejemplo, un rol sin tipo), **When** termina la comprobación, **Then** se muestra la misma página de error y no se concede el acceso.
3. **Given** la página de error, **When** la persona elige «Reintentar» y la plataforma ya responde, **Then** entra si tiene un rol de Sistema o llega a «Sin acceso» si no.
4. **Given** la consulta se rechaza porque la sesión no es válida y no se puede renovar, **When** termina la comprobación, **Then** la persona va a la pantalla de inicio de sesión, como hoy, y al identificarse vuelve a la dirección que había pedido.
5. **Given** la consulta se rechaza por falta de permiso o porque no encuentra a la persona, **When** termina la comprobación, **Then** la persona llega a «Sin acceso», con el correo de la cuenta con la que se identificó, y no ve además el aviso «No tienes permiso para realizar esta acción.».
6. **Given** una persona que abre la dirección de «Sin acceso», **When** la comprobación falla por red, servidor o formato, **Then** ve la página de error con «Reintentar» y no el contenido de «Sin acceso».

---

### User Story 5 - Cerrar sesión desde «Sin acceso» y entrar con otra cuenta (Priority: P2)

Desde «Sin acceso», la persona cierra sesión y su sesión termina también en el proveedor de identidad, de modo que puede identificarse con otra cuenta sin volver a caer en «Sin acceso» con la anterior.

**Why this priority**: Es la única salida de la página. Sin un cierre completo, quien se identificó con la cuenta equivocada quedaría atrapado en un ciclo. Se prioriza después de la barrera porque solo puede probarse desde «Sin acceso».

**Independent Test**: Iniciar sesión con una cuenta sin rol de Sistema, elegir «Cerrar sesión» en «Sin acceso», comprobar que el proveedor de identidad pide de nuevo las credenciales y entrar con una cuenta que sí tiene un rol de Sistema.

**Acceptance Scenarios**:

1. **Given** una persona en «Sin acceso», **When** elige «Cerrar sesión», **Then** su sesión termina en el Backoffice y en el proveedor de identidad, y llega a la pantalla de inicio de sesión.
2. **Given** la sesión recién cerrada desde «Sin acceso», **When** la persona elige «Iniciar sesión», **Then** el proveedor de identidad le pide identificarse, sin entrar automáticamente con la cuenta anterior, y puede usar otra cuenta.
3. **Given** que la persona se identifica con una cuenta que tiene un rol de Sistema, **When** termina el inicio de sesión, **Then** entra al Backoffice con normalidad.
4. **Given** el Backoffice abierto en otra pestaña con la misma sesión, **When** la persona cierra sesión desde «Sin acceso», **Then** la otra pestaña también pierde la sesión, como en la feature 001.

---

### Edge Cases

- ¿Qué ocurre si la persona tiene roles de ambos tipos? Entra, porque basta un rol de Sistema, y solo cuentan los permisos de sus roles de Sistema. Impedir que una persona tenga roles de ambos tipos es otra spec.
- ¿Qué ocurre con un rol de un tipo distinto de 1 y 2? No da acceso ni permisos: solo el tipo 1 da acceso.
- ¿Qué ocurre con un rol de Sistema Bloqueado o Eliminado que sigue asignado? La plataforma no lo devuelve, así que no cuenta; si a la persona no le queda otro rol de Sistema, llega a «Sin acceso». El Backoffice no vuelve a filtrar los roles por estatus (FR-005).
- ¿Qué ocurre si la respuesta trae roles pero no trae usuario? No se concede el acceso: sin usuario de MailySoft no hay acceso (FR-001). La plataforma no lo hace hoy, porque a quien no está registrado le devuelve una lista de roles vacía.
- ¿Qué ocurre si cambia el nombre de un rol o del tipo, o si se traduce (Spec 7)? El acceso no cambia, porque se decide por el identificador del tipo (FR-002).
- ¿Qué ocurre si la respuesta indica un cambio de contraseña pendiente? No cambia la decisión: sin acceso, la persona llega a «Sin acceso» (User Story 2, escenario 7); con acceso, se comporta como hoy, porque el Backoffice no tiene un flujo propio para ese caso (ver Assumptions).
- ¿Qué ocurre si a una persona con la sesión abierta se le retira su último rol de Sistema? No se exige detectarlo al instante: lo ve la próxima vez que se inicia la sesión. Si antes lo detecta la comprobación periódica que ya existe (feature 001: cada 5 minutos y al volver a la pestaña), se aplica la misma regla y la persona es llevada a «Sin acceso».
- ¿Qué ocurre si una persona en «Sin acceso» recibe un rol de Sistema? Entra la próxima vez que se inicia la sesión; si la comprobación periódica lo detecta antes, es llevada al Panel.
- ¿Qué ocurre si falla una comprobación periódica (red o servidor)? Se conserva la última decisión conocida, como en la feature 001. Un rechazo por falta de permiso o por «no encontrado» no es un fallo, sino una respuesta de «sin acceso» (FR-023).
- ¿De dónde sale el correo de «Iniciaste sesión como»? Del usuario de MailySoft que devuelve la consulta. Si no hay usuario (persona no registrada, o rechazo por falta de permiso o por «no encontrado»), sale de la cuenta con la que la persona se identificó. Si tampoco está ahí, la línea no se muestra. Un correo muy largo se ajusta al ancho sin desplazamiento horizontal.
- ¿Qué ocurre si una persona sin acceso abre una dirección que no existe? Llega a «Sin acceso», no a «Página no encontrada», que solo ve quien tiene acceso (feature 001, FR-016).
- ¿Qué ocurre si una persona con sesión pero sin acceso abre la pantalla de inicio de sesión? Termina en «Sin acceso», sin ver contenido interno por el camino.
- ¿Qué ocurre con la inactividad en «Sin acceso»? Es una pantalla con sesión, así que siguen aplicando el cierre por inactividad y el cierre de sesión en otras pestañas de la feature 001.
- ¿Qué ocurre al recargar «Sin acceso»? El acceso se comprueba de nuevo y, según el resultado, la persona se queda en «Sin acceso», va al Panel o ve la página de error.
- ¿Qué ocurre con varias pestañas? Cada pestaña comprueba el acceso al iniciar su sesión, y cerrar sesión en una la cierra en todas (feature 001).

## Requirements *(mandatory)*

### Functional Requirements

**Regla de acceso**

- **FR-001**: El sistema DEBE conceder el acceso al Backoffice solo si la consulta de acceso devuelve el usuario de MailySoft de la persona y al menos un rol de tipo Sistema, con la condición de estatus de FR-003. Basta con un rol de Sistema, aunque la persona tenga además roles de otros tipos. En cualquier otro caso DEBE negarlo.
- **FR-002**: El tipo de un rol DEBE reconocerse por su identificador (1 Sistema, 2 Clínica), definido una sola vez en el Backoffice, y NUNCA por el nombre del rol ni por el del tipo: renombrar o traducir un rol o un tipo NO DEBE cambiar el acceso de nadie. La lista fija de nombres de la feature 001 (Administrator, Developer, Marketing y Billing) DEBE dejar de usarse.
- **FR-003**: La regla de acceso DEBE comprobar explícitamente que el estatus del usuario sea Activo (identificador 1), además de exigir un rol de Sistema. Una persona cuyo usuario no está Activo (Bloqueado, Eliminado o cualquier otro estatus) NO DEBE tener acceso, aunque la respuesta trajera roles de Sistema, y DEBE llegar a «Sin acceso» con el mismo título, el mismo mensaje y las mismas acciones de FR-013: no existe un mensaje distinto para «cuenta no activa», «cuenta no registrada» o «sin rol de Sistema». Esta comprobación es una protección adicional: hoy la consulta de acceso ya no devuelve roles a un usuario que no está Activo (ver Assumptions), por lo que el resultado es el mismo con o sin ella, pero deja de depender de ese comportamiento de la plataforma.
- **FR-004**: La regla DEBE ser una sola y decidirse a partir de la respuesta completa de la consulta de acceso: la entrada, las redirecciones y cualquier comprobación posterior DEBEN usar esa misma regla.
- **FR-005**: El Backoffice DEBE confiar en los roles que devuelve la consulta de acceso y NO DEBE volver a filtrarlos por su estatus.
- **FR-006**: Para lo que la persona puede ver y hacer dentro del Backoffice DEBEN contar solo los permisos de sus roles de Sistema; los permisos de roles de otros tipos NO DEBEN dar ninguna capacidad. La forma en que se aplican los permisos (feature 001, FR-017) no cambia.

**Cuándo se comprueba**

- **FR-007**: El acceso DEBE comprobarse cada vez que se inicia la sesión en una pestaña: al volver del inicio de sesión, al recargar, al abrir el Backoffice en otra pestaña y al entrar directamente por cualquier dirección interna.
- **FR-008**: Mientras no se conozca el resultado de la comprobación, el sistema DEBE mostrar solo un indicador de carga: NO DEBE mostrar ninguna pantalla interna, ni el menú ni el encabezado, ni por un instante, y NO DEBE hacer ninguna otra consulta a las APIs de MailySoft.
- **FR-009**: No se exige detectar en tiempo real que a una persona con la sesión abierta le retiraron su último rol de Sistema: DEBE reflejarse a más tardar la próxima vez que se inicie la sesión. Las comprobaciones periódicas que ya existen (feature 001, FR-019) se conservan y DEBEN aplicar esta misma regla: si en una de ellas la persona deja de tener acceso, DEBE ser llevada a «Sin acceso»; si estando en «Sin acceso» lo obtiene, DEBE ser llevada al Panel.
- **FR-010**: La indicación de cambio de contraseña pendiente que acompaña a la respuesta NO DEBE alterar la regla: quien no tiene acceso DEBE llegar a «Sin acceso» aunque la indicación esté activa, y quien tiene acceso DEBE seguir el comportamiento actual del Backoffice.

**Página «Sin acceso»**

- **FR-011**: El Backoffice DEBE tener una página «Sin acceso» en la dirección `/access-denied`, el equivalente de `/sin-acceso` según la convención de rutas en inglés del proyecto.
- **FR-012**: La página DEBE ser independiente de las pantallas internas: NO DEBE mostrar el menú, el encabezado ni el diseño del Backoffice, ni el nombre de la persona ni el enlace a su perfil, y NO DEBE consultar datos de ninguna API de MailySoft aparte de la consulta de acceso.
- **FR-013**: La página DEBE mostrar el título «No tienes acceso al Backoffice»; el mensaje «Tu usuario no tiene un rol de sistema asignado. Si crees que es un error, contacta al administrador.»; la línea «Iniciaste sesión como» seguida del correo de FR-014; el botón «Cerrar sesión», y el enlace «Ir a MailySoft» según FR-015.
- **FR-014**: El correo de la línea «Iniciaste sesión como» DEBE ser el del usuario de MailySoft que devolvió la consulta de acceso. Si la consulta no devolvió usuario (persona no registrada, o rechazo por falta de permiso o por «no encontrado»), DEBE ser el de la cuenta con la que la persona se identificó en el proveedor de identidad. Si no hay ninguno de los dos, la línea NO DEBE mostrarse.
- **FR-015**: La página DEBE ofrecer el enlace «Ir a MailySoft» cuando el ambiente configure, en una variable de entorno opcional, la dirección de la aplicación de MailySoft para clínicas. Si el ambiente no la define, el enlace NO DEBE mostrarse y el Backoffice DEBE arrancar con normalidad: a diferencia de las variables de Auth0 y de las APIs, esta no es obligatoria.
- **FR-016**: «Cerrar sesión» DEBE terminar la sesión también en el proveedor de identidad, no solo en el Backoffice, con los mismos efectos que el cierre de sesión de la feature 001 (FR-010 y FR-011), y llevar a la pantalla de inicio de sesión. Desde ahí la persona DEBE poder identificarse con otra cuenta sin volver automáticamente a «Sin acceso» con la anterior.
- **FR-017**: La página DEBE cumplir las reglas de accesibilidad de las demás pantallas: foco en su título al llegar, «Sin acceso — MailySoft Backoffice» como título de la pestaña y operación completa por teclado. También DEBE adaptarse al ancho de la ventana como indica la feature 001 (FR-022).

**Redirecciones**

- **FR-018**: Una persona con sesión y sin acceso que abra cualquier dirección interna, exista o no, DEBE ser llevada a «Sin acceso» sin ver antes ningún contenido interno.
- **FR-019**: Una persona con acceso que abra «Sin acceso» DEBE ser llevada al Panel.
- **FR-020**: Una persona sin sesión que abra «Sin acceso» DEBE ser llevada a la pantalla de inicio de sesión, como con cualquier otra dirección protegida; tras identificarse, DEBE ver lo que le corresponda según la regla.
- **FR-021**: Mientras se comprueba el acceso de quien abre «Sin acceso» se aplica FR-008, y si la comprobación falla se aplica FR-024: nunca se muestra el contenido de «Sin acceso» sin saber que la persona no tiene acceso.

**Respuestas con error de la consulta de acceso**

- **FR-022**: Si la consulta se rechaza porque la sesión no es válida (401), DEBE aplicarse el manejo actual (feature 001, FR-013): un intento de renovar la sesión y, si no se puede, la pantalla de inicio de sesión, conservando la dirección de retorno.
- **FR-023**: Si la consulta se rechaza por falta de permiso (403) o porque no encuentra a la persona (404), en la primera comprobación o en una posterior, DEBE tratarse como «sin acceso»: la persona DEBE llegar a «Sin acceso» con el correo de FR-014 y NO DEBE ver además el aviso «No tienes permiso para realizar esta acción.».
- **FR-024**: Si la consulta falla por un error de red, por tiempo agotado, por un error del servidor (5xx) o porque la respuesta no tiene el formato esperado (por ejemplo, un rol sin tipo), el sistema DEBE mostrar una página de error genérica con el botón «Reintentar», y NO DEBE conceder el acceso ni mostrar «Sin acceso». Es la pantalla «No se pudo comprobar el acceso» de la feature 001 (FR-005), que conserva su límite de 30 segundos y su opción de cerrar sesión.
- **FR-025**: «Reintentar» DEBE comprobar el acceso de nuevo y, según el resultado, dar acceso, llevar a «Sin acceso» o volver a mostrar el error.

**Documentación**

- **FR-026**: La documentación del proyecto (README, `.env.example` y las referencias de la feature 001 a los roles autorizados por nombre) DEBE actualizarse para describir la regla por tipo de rol, la página «Sin acceso» y la variable de entorno opcional de FR-015.

### Key Entities *(include if feature involves data)*

- **Consulta de acceso**: lo que la plataforma de usuarios responde sobre la propia persona que inició sesión: su usuario de MailySoft (o ninguno si no está registrada), sus roles activos con su tipo y sus permisos, y si tiene un cambio de contraseña pendiente.
- **Usuario de MailySoft**: el registro de la persona en la plataforma, con su correo y su estatus: 1 Activo; 2 Bloqueado, 3 Eliminado y cualquier otro cuentan como no activos.
- **Rol**: agrupación de permisos asignada a usuarios. Tiene un nombre, que puede editarse; un tipo, obligatorio al crearlo y que no cambia después, y permisos con el formato `recurso:acción`.
- **Tipo de rol**: catálogo de la plataforma con identificador y nombre: 1 Sistema (da acceso al Backoffice) y 2 Clínica (da acceso a la aplicación de MailySoft para clínicas). El nombre es un dato editable; el identificador es el valor estable en el que se basa la regla.
- **Decisión de acceso**: el resultado de aplicar la regla. Con acceso, junto con los permisos de los roles de Sistema; sin acceso, o no comprobado cuando la consulta falló.
- **Cuenta del proveedor de identidad**: la cuenta con la que la persona se identificó. Su correo se muestra en «Sin acceso» cuando la consulta no devuelve usuario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de las pruebas con una cuenta o respuesta simulada de cada caso, entra quien tiene al menos un rol de Sistema (solo de Sistema, o de Sistema y de Clínica) y llega a «Sin acceso» quien no lo tiene (solo de Clínica, sin roles, no registrado y, según FR-003, con usuario no Activo).
- **SC-002**: En el 100 % de los intentos de una persona sin acceso de abrir direcciones internas (al menos el Panel, Perfil, Usuarios, Suscripciones, Token y una dirección inexistente), no aparece contenido interno en ningún momento y termina en «Sin acceso».
- **SC-003**: Con la respuesta de la consulta de acceso retrasada al menos 5 segundos, se muestran 0 pantallas internas y se hacen 0 consultas a otras APIs de MailySoft hasta que llega la respuesta.
- **SC-004**: En el 95 % de los inicios de sesión, quien tiene un rol de Sistema llega a su destino, y quien no lo tiene llega a «Sin acceso», en menos de 5 segundos desde que termina de identificarse.
- **SC-005**: Tras «Cerrar sesión» en «Sin acceso», el 100 % de los siguientes inicios de sesión piden identificarse de nuevo, y entrar con una cuenta con rol de Sistema funciona al primer intento.
- **SC-006**: El 100 % de las personas con acceso que abren «Sin acceso» llegan al Panel, y el 100 % de las personas sin sesión que la abren llegan a la pantalla de inicio de sesión.
- **SC-007**: Con la plataforma fallando (red, servidor o respuesta inválida), el 100 % de las personas ve el error con «Reintentar» en un máximo de 30 segundos; 0 obtienen acceso y 0 ven «Sin acceso».
- **SC-008**: Cambiar el nombre de un rol o de un tipo, sin cambiar su identificador, modifica el acceso de 0 personas.
- **SC-009**: El 100 % de los casos de la regla (los de SC-001, más un tipo desconocido, un nombre de tipo distinto y una respuesta inválida), de las redirecciones (FR-018 a FR-021) y de las respuestas con error (FR-022 a FR-025) tienen pruebas automatizadas con respuestas simuladas de la consulta de acceso.
- **SC-010**: La página «Sin acceso» no presenta violaciones en las verificaciones automáticas de accesibilidad y, con la ventana a 1024 px y a 320 px de ancho, no corta contenido ni provoca desplazamiento horizontal.
- **SC-011**: La feature se entrega con 0 cambios en `mailySoft-usuarios` y 0 cambios en la configuración de Auth0.

## Assumptions

- **Supuestos verificados** leyendo `mailySoft-usuarios` (rama principal, commit `0d3df16`, 2026-10-21) sin modificarlo; los detalles se documentarán en `contracts/` durante la planeación:
  - «La consulta de acceso no devuelve roles inactivos ni eliminados»: **se cumple**. Devuelve solo los roles Activos y, de cada uno, solo sus permisos Activos; a un usuario que no está Activo no le devuelve ningún rol, aunque los tenga asignados.
  - «Qué responde la consulta cuando el usuario no existe en Maily o está inactivo»: en los dos casos **responde con éxito (200)**. Sin usuario y sin roles si la persona no está registrada; con su usuario, su estatus y sin roles si no está Activo. La consulta **nunca responde 403 ni 404**: sus únicos errores son sesión no válida (401), verificación de la sesión no disponible (503) y error interno (500). Por eso **no se cumple** el ejemplo de la descripción («403 o 404, por ejemplo, el usuario existe en Auth0 pero no en Maily»): ese caso llega como respuesta correcta sin usuario y se trata como «sin acceso» por FR-001. FR-023 se mantiene como protección ante un cambio de la API o de un intermediario.
  - Cada rol trae su tipo, con identificador y nombre (1 Sistema, 2 Clínica). El tipo es obligatorio al crear un rol y no cambia después; el nombre del rol y el del tipo sí pueden editarse.
  - La respuesta siempre dice si hay un cambio de contraseña pendiente. Con el cambio pendiente, la consulta de acceso sigue respondiendo con normalidad y las demás operaciones de la API se rechazan hasta que la persona cambie su contraseña.
  - Una persona puede tener roles de ambos tipos (datos anteriores a la regla de un solo tipo, o un rol que se desbloquea), aunque la plataforma ya impide asignarlos.
- **Clasificación de roles en la plataforma**: Administrator, Developer, Support, Marketing y Billing son de Sistema; Owner, Doctor, Nurse y Receptionist, de Clínica. En consecuencia, **Support**, que no estaba en la lista de la feature 001, pasa a dar acceso al Backoffice, y cualquier rol de Sistema que se cree o se renombre en adelante da acceso sin cambiar el Backoffice.
- **Nota de la feature 016**: la pantalla «No se pudo comprobar el acceso» (FR-024) muestra además, debajo de la línea de la cuenta, «Estado de la plataforma» y, si esta falla, «Comprobación directa» ([specs/016-health-dashboard/spec.md](../016-health-dashboard/spec.md), User Stories 5 y 6). Sus reglas no cambian: el límite de 30 segundos, «Reintentar», «Cerrar sesión» y la regla por tipo de rol; «Sin acceso» no tiene esas secciones.
- **Relación con la feature 001**: esta feature sustituye la lista de roles autorizados (FR-004, FR-017, Key Entities y Assumptions de la 001) por el tipo Sistema, y la pantalla «Acceso denegado» con motivo por la página «Sin acceso», con su propia dirección y los textos de FR-013. Lo demás de la 001 no cambia: la pantalla «No se pudo comprobar el acceso» (con su límite de 30 segundos y la opción de cerrar sesión), la sesión vencida, el cierre por inactividad y las comprobaciones periódicas. La feature 007 (FR-013 y Assumptions) ya se refiere a esta feature como «feature 006».
- **Cierre de sesión y Auth0**: «Cerrar sesión» vuelve a la pantalla de inicio de sesión, que ya está registrada en Auth0 como dirección de retorno del cierre de sesión en cada entorno (feature 001). No hace falta registrar ninguna dirección nueva ni cambiar la configuración de Auth0. Si la cuenta corporativa se valida con otro proveedor que conserva su propia sesión, elegir otra cuenta puede requerir cerrarla también allí; eso queda fuera de alcance.
- **Cambio de contraseña pendiente**: el Backoffice no tiene hoy un flujo para ese caso, porque no lee esa indicación, y esta feature no lo crea. Solo garantiza que la falta de acceso tiene prioridad (FR-010). La plataforma espera que, en ese caso, la aplicación lance un inicio de sesión interactivo; queda para otra spec.
- **Página «Sin acceso»**: usa los componentes y el estilo actuales del Backoffice y se adaptará al nuevo diseño cuando se integre la Spec 3 (estilos). Sus textos están en español, en el módulo de mensajes como los demás.
- **Variable de entorno del enlace «Ir a MailySoft»** (FR-015): opcional, validada como las demás URLs de la constitución (sin `/` final, `https` en producción); su nombre exacto se decide en el plan. Mientras la aplicación de MailySoft para clínicas no exista, ningún ambiente la define y el enlace no aparece en ninguno.
- **Fuera de alcance**: cambios en `mailySoft-usuarios`, que solo se lee; cambios en la configuración de Auth0; la regla que impide mezclar roles de ambos tipos (otra spec); la administración de roles y permisos (Spec 2) y cualquier cambio en cómo se aplican los permisos dentro del Backoffice; estilos nuevos (Spec 3); un flujo de cambio de contraseña; detectar en tiempo real la pérdida del rol.
- **Indicaciones del solicitante para el plan** (restricciones de implementación, no requisitos de comportamiento): la regla vive en una sola función reutilizable que recibe la respuesta completa de la consulta de acceso; el identificador del tipo Sistema se define en una constante y nunca se compara el nombre del tipo; la validación de la respuesta incluye el tipo de cada rol; las pruebas automatizadas de la regla usan respuestas simuladas de la consulta, y también se prueban las redirecciones; el trabajo se hace en la rama `006-system-role-access`, creada desde la rama principal; `mailySoft-usuarios` no se modifica.
