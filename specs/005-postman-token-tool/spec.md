# Feature Specification: Token de Acceso para Postman (Herramienta Temporal)

**Feature Branch**: `005-postman-token-tool`

**Created**: 2026-10-17

**Updated**: 2026-10-19

**Status**: Draft

**Input**: User description: "Una opción en la cual los usuarios con perfil Developer puedan generar un token y usar este token para invocar las APIs desde Postman. Esta opción solo debe aparecer para los roles con perfil de Administrator o Developer. Al iniciar sesión, la opción se debe mostrar u ocultar según este role." Alcance heredado de la descripción original del proyecto: una "opción para generar y mostrar un token de Auth0 que usaré para hacer llamadas a través de Postman", que "se desactivará en el futuro". Ajuste del 2026-10-19: al ingresar a la página Token debe haber un botón para generar o actualizar el token; la página empieza sin token, solo con sus espacios y el botón "Generar"; al generarlo se muestra el token con una opción para copiarlo y la fecha y hora en que caduca, y el botón pasa a "Refrescar", que repite el proceso.

## Clarifications

### Session 2026-10-19

- Q: ¿Qué roles pueden ver y usar la herramienta? → A: Los que incluyan el permiso `token:read`: el acceso lo decide ese permiso y no el nombre del role. Solo los roles Administrator y Developer deben recibirlo, y eso se activa o desactiva en la base de datos de la API de usuarios de MailySoft, sin cambios en el backoffice, que no compara nombres de role. Esto reemplaza las reglas anteriores: primero "todos los roles de sistema" y luego "solo Administrator o Developer" por nombre.
- Q: ¿Cuándo se decide si la opción se muestra? → A: Al iniciar sesión, cuando se conocen el role y los permisos del usuario en MailySoft; mientras no estén resueltos la opción no se muestra.
- Q: ¿Qué muestra la página Token al entrar y cuándo se crea el token? → A: Al entrar no muestra ningún token: solo los espacios del token y el botón "Generar". El token se crea únicamente cuando la persona pulsa ese botón, nunca al abrir la página, y cada vez que vuelve a entrar la página regresa a este estado inicial.
- Q: ¿Qué ve la persona tras generar el token y cómo obtiene otro? → A: Ve el token, una opción para copiarlo y la fecha y hora en que caduca, y el botón "Generar" pasa a llamarse "Refrescar". Al pulsar "Refrescar" se repite el proceso (token nuevo, con su opción de copiar y su nueva fecha y hora de expiración) sin salir de la página. Esto reemplaza al antiguo "Generar nuevo".
- Q: Cuando la persona pulsa "Generar" o "Refrescar", ¿el token debe aparecer oculto (y verse completo solo con "Mostrar") o visible desde el primer momento? → A: Oculto por defecto: aparece enmascarado en su espacio y solo se ve completo con "Mostrar" (vuelve a ocultarse con "Ocultar"); "Copiar" funciona sin revelarlo. Por tanto, "se muestra el token" del flujo original se entiende como que el token ocupa su espacio en la página.
- Q: ¿La herramienta se activa por entorno (desarrollo, QA, producción) o solo por el permiso del role? → A: Solo por el permiso `token:read`: no depende del entorno ni de una configuración del backoffice. Se activa o desactiva asignando o quitando el permiso a los roles en la base de datos de la API de usuarios, según se necesite, y llega al backoffice con los permisos de los roles que devuelve la consulta de la propia persona (feature 001). Esto reemplaza el interruptor por entorno que tenía la herramienta (deshabilitada por defecto y habilitada en cada entorno).
- Q: Si una persona que no tiene el permiso `token:read` escribe directamente la dirección de la herramienta Token en el navegador, ¿qué debe ocurrir? → A: Se le lleva a la página principal con un aviso propio de la herramienta, más claro que el de las demás secciones, que le indica que no tiene permiso para usarla (por ejemplo, «No tienes permiso para usar la herramienta Token.»), con la sesión abierta y sin generar ningún token. No hay una pantalla de "sin permisos" aparte. Esto reemplaza el "estado de sin permisos" de la versión anterior.
- Q: Si con la herramienta Token abierta el backoffice repite la comprobación de los permisos de la persona y la API de usuarios no responde, ¿la herramienta debe seguir disponible o debe ocultarse? → A: Sigue disponible: se conserva la última respuesta conocida, igual que en el resto del backoffice (feature 001), hasta que una comprobación correcta indique otra cosa. "Ante la duda se oculta" vale solo mientras los permisos todavía no se han podido resolver (por ejemplo, justo después de iniciar sesión).
- Q: Si una persona tiene un role de sistema y otro role que no lo es, y solo ese otro role incluye `token:read`, ¿debe ver la herramienta Token? → A: Solo pueden ingresar al backoffice las personas con un role de tipo "Role de sistema"; cualquier otro role no da acceso. Una vez dentro, se evalúa si la persona tiene el permiso `token:read`: si lo tiene, puede entrar a la página; si no, no puede entrar a la opción Token. Por tanto, cuentan los permisos de sus roles de sistema activos (como en el resto del backoffice, feature 001) y un `token:read` que solo tenga otro role no cuenta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar mi token, copiarlo y refrescarlo (Priority: P1)

Una persona con permiso para usar la herramienta (`token:read`; por ejemplo, con perfil Developer o Administrator) entra a la página Token, que al principio no muestra ningún token. Pulsa "Generar", ve su token con la opción de copiarlo y la fecha y hora en que caduca, lo copia y lo usa en Postman para invocar las APIs de MailySoft con sus mismos permisos. Cuando necesita otro, pulsa "Refrescar".

**Why this priority**: Es el propósito de la herramienta: permitir probar y consumir las APIs de MailySoft desde Postman sin crear credenciales aparte.

**Independent Test**: Con una sesión cuyo role incluya `token:read` (por ejemplo, Developer), abrir la página Token y comprobar que no muestra ningún token; pulsar "Generar" y comprobar que aparecen el token (oculto), la opción de copiarlo y su fecha y hora de expiración, y que el botón pasó a "Refrescar"; copiar el token, pegarlo en Postman y hacer una llamada a una API de MailySoft (la llamada es atendida con la identidad y los permisos de esa persona); pulsar "Refrescar" y comprobar que aparece un token nuevo con su nueva fecha y hora de expiración.

**Acceptance Scenarios**:

1. **Given** una persona con sesión activa cuyo role incluye `token:read`, **When** abre la página Token, **Then** ve los espacios del token y de su expiración vacíos y el botón "Generar", sin ningún token ni fecha y sin una acción de copiar disponible.
2. **Given** la página Token en su estado inicial, **When** la persona pulsa "Generar", **Then** el botón queda deshabilitado con un indicador de progreso mientras se obtiene el token y, al terminar, ve en el espacio del token un token vigente a su nombre, oculto por defecto.
3. **Given** un token generado y oculto, **When** la persona elige "Mostrar", **Then** ve el valor completo del token y, al elegir "Ocultar", vuelve a ocultarse.
4. **Given** un token generado, oculto o visible, **When** la persona elige "Copiar", **Then** el valor completo queda en el portapapeles, sin necesidad de mostrarlo antes, y ve una confirmación de que se copió.
5. **Given** un token generado, oculto o visible, **When** la persona mira la página, **Then** ve la fecha y hora de expiración de ese token en su zona horaria local.
6. **Given** que se acaba de generar el primer token, **When** la persona mira el botón, **Then** ya no dice "Generar" sino "Refrescar".
7. **Given** un token en pantalla y el botón "Refrescar", **When** la persona lo pulsa, **Then** se repite el proceso: se obtiene un token nuevo que reemplaza al anterior y aparece oculto por defecto (aunque el anterior estuviera visible), con su propia fecha y hora de expiración y con la opción de copiarlo, y el botón sigue diciendo "Refrescar".
8. **Given** el token copiado y pegado en Postman, **When** la persona invoca una API de MailySoft, **Then** la llamada se atiende con su identidad y sus permisos.
9. **Given** un token en pantalla, **When** la persona sale de la página y vuelve a entrar, **Then** la página aparece en su estado inicial: sin token y con el botón "Generar".
10. **Given** la página Token, **When** la persona la observa, con o sin token, **Then** ve una advertencia visible de que el token da acceso a MailySoft con sus permisos y no debe compartirse ni guardarse en lugares públicos.
11. **Given** la página Token, **When** la persona revisa sus opciones, **Then** no existe ninguna para generar credenciales de otra persona ni de una aplicación.
12. **Given** dos personas con roles distintos que incluyen `token:read` (por ejemplo, Administrator y Developer), **When** abren la página Token, **Then** ambas pueden generar, copiar y refrescar su token exactamente igual.

---

### User Story 2 - Ver la opción solo si mi role tiene el permiso token:read (Priority: P1)

Al iniciar sesión, el backoffice conoce el role de la persona y los permisos de ese role, y muestra la opción "Token" solo si alguno de sus roles de sistema activos incluye el permiso `token:read`; para cualquier otra persona la opción no existe, sea cual sea el nombre de su role.

**Why this priority**: Un token de acceso es una función sensible; limitarla a quienes tienen un permiso específico, que MailySoft asigna a los roles que lo necesiten, es la condición para poder liberarla.

**Independent Test**: Iniciar sesión con un usuario cuyo role incluya `token:read` y con otro cuyo role no lo incluya, y comprobar que la opción aparece solo para el primero; asignar o quitar el permiso a un role y comprobar que, cuando el backoffice vuelve a resolver los permisos, la opción aparece o desaparece sin cambiar nada en el backoffice.

**Acceptance Scenarios**:

1. **Given** una persona cuyo role incluye `token:read`, **When** inicia sesión, **Then** la navegación muestra "Token".
2. **Given** una persona cuyos roles no incluyen `token:read`, **When** inicia sesión, **Then** la navegación no muestra "Token".
3. **Given** un role que incluye `token:read` y otro que no, **When** sus personas inician sesión, **Then** solo la del primero ve la opción, aunque el segundo se llame Administrator o Developer y el primero Marketing o Billing: el nombre del role no cuenta.
4. **Given** una persona con varios roles de los cuales al menos uno, de sistema y activo, incluye `token:read`, **When** inicia sesión, **Then** ve la opción.
5. **Given** una persona cuyo role con `token:read` está bloqueado o eliminado y que no tiene otro role de sistema activo que lo incluya, **When** inicia sesión, **Then** no ve la opción.
6. **Given** una persona sin el permiso `token:read`, **When** abre directamente la dirección de la herramienta, **Then** se le lleva a la página principal con un aviso que le indica que no tiene permiso para usar la herramienta, no se genera ningún token y su sesión permanece abierta.
7. **Given** una persona que acaba de iniciar sesión y cuyo role y permisos aún no se han resuelto, **When** carga el backoffice, **Then** la opción no se muestra hasta que se conozcan.
8. **Given** una persona con la opción visible, **When** su role o los permisos de su role cambian, el backoffice vuelve a resolverlos y ya no incluyen `token:read`, **Then** la opción desaparece de la navegación y cualquier token que estuviera en pantalla se descarta.
9. **Given** una persona sin sesión, **When** abre la dirección de la herramienta, **Then** se le pide identificarse primero y no se muestra ningún token.

---

### User Story 3 - Activar o desactivar la herramienta según se necesite (Priority: P2)

Quien administra los permisos de MailySoft (hoy, mediante el servicio de usuarios) activa la herramienta asignando `token:read` a los roles que deban tenerla (Administrator y Developer) y la desactiva quitándolo, sin tocar el backoffice y con el mismo efecto en desarrollo, QA y producción. Retirar la herramienta en el futuro no afecta al resto del backoffice.

**Why this priority**: Mostrar un token es una función sensible y temporal; poder encenderla y apagarla con un dato, sin desplegar, es lo que permite controlarla de forma segura. El permiso decide quién la ve (User Story 2); esta historia cubre cómo se activa y se desactiva.

**Independent Test**: Con `token:read` sin asignar a ningún role, comprobar que nadie ve la opción; asignarlo a un role y comprobar que sus personas la ven en la siguiente comprobación de permisos; quitarlo y comprobar que dejan de verla; repetir en dos entornos y comprobar que solo cuenta el dato de cada uno; y comprobar que el resto del backoffice funciona igual en todos los casos.

**Acceptance Scenarios**:

1. **Given** que ningún role tiene el permiso `token:read` (estado por defecto), **When** una persona cualquiera revisa la navegación, **Then** no existe la opción "Token".
2. **Given** que se asigna `token:read` a un role, **When** una persona con ese role vuelve a iniciar sesión o el backoffice vuelve a resolver sus permisos, **Then** ve la opción "Token" sin ningún cambio ni despliegue en el backoffice.
3. **Given** que se quita `token:read` a un role, **When** el backoffice vuelve a resolver los permisos de sus personas, **Then** la opción deja de existir para ellas, tenga el role el nombre que tenga.
4. **Given** dos entornos (por ejemplo, QA y producción) con el mismo role, uno con `token:read` y otro sin él, **When** una persona con ese role revisa la navegación en cada entorno, **Then** ve la opción solo donde el role tiene el permiso: lo decide el dato, no el entorno.
5. **Given** la herramienta desactivada (nadie tiene el permiso), **When** una persona usa cualquier otra sección del backoffice, **Then** todas funcionan igual que con la herramienta activada.

---

### User Story 4 - Saber si mi token sigue vigente (Priority: P2)

La persona identifica de un vistazo si su token sigue vigente o ya expiró y, cuando expira, lo reemplaza con "Refrescar".

**Why this priority**: Un token vencido hace fallar las llamadas de Postman sin explicación; saber hasta cuándo es válido y poder refrescarlo evita confusión, pero la herramienta es útil ya con la generación básica.

**Independent Test**: Generar un token y verificar que se muestra su expiración y que figura como vigente; esperar a que venza (o simularlo) y verificar que la página lo indica como expirado sin recargar y que "Refrescar" entrega un token vigente.

**Acceptance Scenarios**:

1. **Given** un token vigente, **When** la persona mira la página, **Then** un indicador le dice que el token está vigente.
2. **Given** un token vigente y la página abierta, **When** llega su fecha y hora de expiración, **Then** la página lo indica como expirado sin que la persona la recargue, la acción de copiar deja de estar disponible y el botón sigue diciendo "Refrescar".
3. **Given** un token expirado, **When** la persona pulsa "Refrescar", **Then** obtiene un token vigente con su nueva fecha y hora de expiración y el token expirado deja de estar en pantalla.

---

### Edge Cases

- ¿Qué ocurre si el portapapeles no está disponible o el navegador no permite copiar? Se informa y se ofrece mostrar el token para seleccionarlo y copiarlo manualmente.
- ¿Qué ocurre si no se puede obtener el token al pulsar "Generar" (sesión inválida o proveedor de identidad no disponible)? La página permanece en su estado inicial, con el botón "Generar", y se muestra un mensaje claro con la opción de reintentar o de iniciar sesión de nuevo.
- ¿Qué ocurre si falla "Refrescar"? Se muestra el mismo mensaje con opción de reintentar y la página conserva el token que ya tenía en pantalla, con su fecha y hora de expiración; el botón sigue diciendo "Refrescar".
- ¿Qué ocurre si la persona pulsa varias veces seguidas "Generar" o "Refrescar"? Mientras se obtiene el token el botón está deshabilitado, de modo que cada ronda produce un solo token.
- ¿Qué ocurre con el token anterior cuando se refresca? Deja de estar en pantalla, pero no se revoca: sigue siendo válido en Postman hasta su fecha de expiración.
- ¿Qué ocurre si la persona recarga la página del navegador? Igual que al volver a entrar: aparece el estado inicial, sin token, porque el token no se conserva.
- ¿Qué ocurre con un token muy largo? Al mostrarlo se ajusta a la pantalla sin recortarse y "Copiar" copia siempre el valor íntegro.
- ¿Qué ocurre si cambia el role de la persona, o los permisos de su role, mientras tiene la herramienta abierta? Cuando el backoffice vuelve a resolverlos y ya no incluyen `token:read`, se retira la opción y se descarta el token que estuviera en pantalla (ver User Story 2, escenario 8); los tokens ya generados no se revocan y siguen siendo válidos en Postman hasta su fecha de expiración.
- ¿Qué ocurre si no se pueden resolver el role y sus permisos (la API de usuarios no responde)? Si nunca se habían resuelto (por ejemplo, justo después de iniciar sesión), la opción no se muestra: ante la duda se oculta, y el backoffice sigue el manejo habitual de ese fallo definido en la feature 001. Si ya se habían resuelto y falla una comprobación posterior, se conserva la última respuesta conocida: la opción y la herramienta siguen disponibles, con el token que tuviera en pantalla, hasta que una comprobación correcta indique otra cosa.
- ¿Qué ocurre si el permiso `token:read` todavía no existe en la API de usuarios o no está asignado a ningún role? Nadie ve la opción: la herramienta queda inaccesible hasta que el permiso exista y se asigne.
- ¿Qué ocurre con varias pestañas abiertas? Cada una gestiona su propio token de forma independiente.
- ¿Qué ocurre con una persona sin acceso al backoffice (por ejemplo, con roles que no son de sistema)? No llega a la herramienta, porque primero se le niega el acceso (feature 001).
- ¿Qué ocurre si una persona sin el permiso `token:read` obtiene la dirección de la herramienta? Se le lleva a la página principal con un aviso que le indica que no tiene permiso para usarla; no hay forma de generar el token porque la pantalla de la herramienta no llega a mostrarse.
- ¿Qué ocurre si la persona tiene un role de sistema y otro role que no lo es, y solo ese otro role incluye `token:read`? No cuenta: la herramienta no aparece, porque solo cuentan los permisos de sus roles de sistema activos, como en el resto del backoffice (feature 001).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar la opción "Token" en la navegación solo cuando se cumplan las dos condiciones: la persona tiene acceso al backoffice (solo lo tienen quienes cuentan con un role de sistema, como define la feature 001) y alguno de sus roles de sistema activos incluye el permiso `token:read`.
- **FR-002**: La decisión de mostrar u ocultar la opción DEBE tomarse al iniciar sesión, a partir del role de la persona y los permisos de ese role en MailySoft, y DEBE volver a evaluarse cada vez que el backoffice resuelva de nuevo su role y sus permisos.
- **FR-003**: Mientras el role y los permisos de la persona no se hayan resuelto con éxito ni una sola vez desde que inició sesión (por ejemplo, justo después de iniciar sesión, o si la API de usuarios no responde), la opción NO DEBE mostrarse y la herramienta NO DEBE generar tokens. Una vez resueltos, si una comprobación posterior falla, el sistema DEBE conservar la última respuesta conocida, como en el resto del backoffice (feature 001), hasta que una comprobación correcta indique otra cosa.
- **FR-004**: Solo cuentan los permisos de los roles de sistema activos: un role bloqueado, eliminado o que no sea de sistema NO DEBE aportar `token:read`. Una vez dentro del backoffice, el acceso a la herramienta lo decide únicamente ese permiso: el nombre del role NO DEBE influir, y las personas sin `token:read` NO DEBEN ver la opción ni entrar a la herramienta.
- **FR-005**: Si una persona sin el permiso `token:read` abre la dirección de la herramienta, el sistema DEBE llevar a esa persona a la página principal con un aviso propio de la herramienta que le indique que no tiene permiso para usarla (por ejemplo, «No tienes permiso para usar la herramienta Token.»), sin cerrar su sesión y sin generar ningún token.
- **FR-006**: La disponibilidad de la herramienta DEBE depender únicamente del permiso `token:read` de los roles de la persona, que se activa o desactiva asignándolo o quitándolo en la API de usuarios. NO DEBE depender del entorno (desarrollo, QA o producción) ni de una configuración del backoffice, y mientras ningún role tenga el permiso la herramienta DEBE estar desactivada para todas las personas.
- **FR-007**: El sistema DEBE generar un token vigente a nombre de la persona autenticada, con los mismos permisos que tiene en su sesión; la herramienta NO DEBE ampliar sus permisos.
- **FR-008**: El sistema NO DEBE generar credenciales para otras identidades ni credenciales de aplicación o de servicio.
- **FR-009**: Al abrir la página Token, el sistema DEBE mostrarla en su estado inicial: los espacios del token y de su expiración vacíos y el botón "Generar", sin ningún token ni fecha y sin acción de copiar disponible. El sistema NO DEBE generar un token hasta que la persona pulse "Generar".
- **FR-010**: Al pulsar "Generar", el sistema DEBE obtener un token según FR-007 y colocarlo en el espacio del token, oculto (enmascarado) por defecto, con las acciones "Mostrar" y "Ocultar" para ver su valor completo o volver a ocultarlo.
- **FR-011**: Con un token en pantalla, oculto o visible, el sistema DEBE permitir copiar su valor íntegro sin necesidad de mostrarlo y confirmar visiblemente que se copió.
- **FR-012**: Con un token en pantalla, oculto o visible, el sistema DEBE mostrar su fecha y hora de expiración en la zona horaria local de la persona e indicar si el token está vigente o expirado.
- **FR-013**: Si el token llega a su fecha y hora de expiración con la página abierta, el sistema DEBE indicarlo como expirado sin que la persona recargue la página y DEBE dejar de ofrecer la acción de copiarlo.
- **FR-014**: El botón que obtiene el token DEBE decir "Generar" mientras no haya ningún token en pantalla y "Refrescar" desde que hay uno, esté vigente o expirado.
- **FR-015**: Al pulsar "Refrescar", el sistema DEBE repetir el proceso de generación: obtener un token nuevo, sin reutilizar el anterior, reemplazar el que estaba en pantalla (el nuevo queda oculto por defecto aunque el anterior estuviera visible) y mostrar su nueva fecha y hora de expiración. DEBE poder hacerse en cualquier momento, con el token vigente o expirado.
- **FR-016**: Mientras se obtiene un token, al generar o al refrescar, el sistema DEBE deshabilitar el botón y mostrar un indicador de progreso, de modo que cada acción de la persona produzca como máximo un token.
- **FR-017**: La página DEBE mostrar de forma visible, en todos sus estados, una advertencia de seguridad sobre el uso del token.
- **FR-018**: El sistema NO DEBE conservar el token una vez que la persona sale de la página, la recarga, cierra sesión o pierde el permiso requerido, y NO DEBE guardarlo ni registrarlo en ningún lugar. Cada vez que se abre la página DEBE aparecer en su estado inicial.
- **FR-019**: El sistema DEBE mostrar un mensaje claro, en español, con opción de reintentar cuando no pueda obtener el token, al generar o al refrescar; si falla al refrescar, la página DEBE conservar el token que ya tenía en pantalla.
- **FR-020**: La desactivación o el retiro de la herramienta NO DEBEN afectar a ninguna otra función del backoffice.

### Key Entities *(include if feature involves data)*

- **Token de acceso**: Credencial temporal que identifica a la persona ante la plataforma de MailySoft y permite a herramientas externas, como Postman, invocar las APIs con los permisos de esa persona. Tiene valor y fecha de expiración, está vinculada a una sola persona y es vigente o expirada según esa fecha. Mientras está en pantalla puede estar oculto (enmascarado, su estado por defecto) o visible (valor completo); "en pantalla" significa presente en la página en cualquiera de los dos estados. Hay como máximo uno en pantalla a la vez y, mientras la persona no pulse "Generar", ninguno.
- **Role**: Agrupación de permisos asignada a la persona (definida en la feature 001). Solo los roles de tipo "Role de sistema" (los roles autorizados de la feature 001) dan acceso al backoffice; cualquier otro role no. Para esta feature solo importa si alguno de sus roles de sistema activos incluye el permiso `token:read`, no cómo se llame el role.
- **Permiso `token:read`**: Permiso, con el formato `recurso:acción` de la feature 001, que habilita ver la opción "Token" y usar todas sus acciones (generar, copiar y refrescar). Se concede a través de roles (solo Administrator y Developer) y es a la vez el criterio de acceso por persona y el interruptor de la herramienta; no existe un permiso aparte para cada acción.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona con el permiso `token:read` genera y copia un token válido en menos de 30 segundos desde que abre la página, con solo dos acciones: "Generar" y "Copiar".
- **SC-002**: El 100 % de los tokens generados por la herramienta, mientras están vigentes, son aceptados por la plataforma en una llamada de prueba.
- **SC-003**: El 100 % de las personas con un role de sistema activo que incluye `token:read` ven la opción al iniciar sesión, y el 0 % de las que no tienen ese permiso la ven.
- **SC-004**: Para una persona sin el permiso `token:read` hay 0 puntos de acceso a la herramienta: no aparece en la navegación y, al abrir su dirección, no se genera ningún token.
- **SC-005**: Después de salir de la página, recargarla, cerrar sesión o perder el permiso requerido, 0 tokens permanecen en pantalla.
- **SC-006**: Desactivar la herramienta no altera ninguna otra función: el 100 % de las pruebas de las demás secciones siguen pasando.
- **SC-007**: En el 100 % de los casos, la persona identifica si su token está vigente o expirado sin necesidad de probarlo en Postman.
- **SC-008**: En el 100 % de las pulsaciones de "Refrescar", la persona obtiene, sin salir de la página, un token nuevo distinto del anterior y con su fecha y hora de expiración actualizadas.
- **SC-009**: Tras asignar o quitar `token:read` a un role, la opción aparece o desaparece para sus personas en la siguiente comprobación de permisos (como máximo 5 minutos después, según la feature 001), sin cambios ni despliegues en el backoffice y con el mismo resultado en cualquier entorno.

## Assumptions

- Dependencia: requiere la feature 001-auth-session-profile (sesión iniciada, acceso al backoffice y role y permisos de la persona resueltos desde la API de usuarios de MailySoft).
- "Perfil Developer" y "perfil Administrator" de la descripción original significan que solo esos dos roles deben recibir el permiso `token:read`; MailySoft lo asigna o lo quita en la base de datos de la API de usuarios y el backoffice no compara nombres de role: el acceso lo decide el permiso.
- El permiso `token:read` no existe todavía en la API de usuarios: debe crearse y asignarse a los roles que correspondan antes de poder usar la herramienta, y mientras no exista o no esté asignado a ningún role nadie la ve. Crearlo y asignarlo se hace en el servicio de usuarios, no en el backoffice. Una vez asignado, llega al backoffice con los permisos de cada role en la consulta de la propia persona de la feature 001, sin otro cambio en esa consulta.
- La opción de navegación y la página se llaman "Token" (antes "Token para Postman"); la herramienta sigue existiendo para usar el token en Postman.
- La herramienta es temporal: se retirará en el futuro, sin fecha definida, y su retiro no requiere cambios en el resto del backoffice.
- La disponibilidad de la herramienta no depende del entorno (desarrollo, QA o producción) ni de una configuración del backoffice: depende solo de que el role de la persona tenga `token:read`. Cada entorno usa los permisos de su propia API de usuarios, así que se activa o desactiva en cada uno según se necesite; mientras ningún role tenga el permiso, está desactivada.
- Esta decisión sustituye el interruptor por entorno que la constitución del proyecto exige hoy para esta herramienta (principio V: funcionalidad apagada por defecto y activada por entorno): la constitución debe enmendarse antes de planificar, y el indicador de entorno de la herramienta que ya existe en la configuración (feature 001) deja de tener razón de ser.
- La restricción por permiso es una regla de experiencia de uso: ocultar la opción no es el mecanismo de seguridad. El token solo otorga los permisos que la persona ya tiene y las APIs de MailySoft siguen imponiendo sus propias autorizaciones en cada llamada.
- "Solo" los espacios del token y el botón "Generar" en el estado inicial significa que no hay token ni fecha; la advertencia de seguridad es un aviso de la página y se muestra siempre.
- El token es del mismo tipo de credencial que el backoffice usa para consultar la plataforma; su vigencia la define el proveedor de identidad. "Refrescar" obtiene un token nuevo pero no revoca los anteriores: el que deja de estar en pantalla sigue siendo válido en Postman hasta su fecha de expiración.
- Cambia respecto a las versiones anteriores de este spec (primero todos los roles de sistema, luego solo Administrator y Developer por nombre y con un interruptor por entorno): ahora el acceso y la activación los decide el permiso `token:read`. La feature 001 (su aclaración sobre quién puede usar la herramienta, que hoy dice que no necesita un permiso específico; su requisito sobre la navegación; el escenario del operador con role autorizado sin permisos asignados; contracts/app-routes.md y contracts/environment.md, que condicionan la herramienta a un indicador de entorno, y su modelo de permisos, que debe incluir el recurso `token`) debe alinearse con esta regla.
- Fuera de alcance: tokens de otras personas o de aplicaciones, revocación de tokens, historial de tokens generados, asignar o quitar `token:read` a los roles desde el backoffice (se hace en el servicio de usuarios), probar llamadas desde dentro del backoffice y una cuenta regresiva en vivo del tiempo restante (solo se muestra la fecha y hora de expiración y si el token está vigente o expirado).
