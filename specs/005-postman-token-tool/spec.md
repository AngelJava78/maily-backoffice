# Feature Specification: Token de Acceso para Postman (Herramienta Temporal)

**Feature Branch**: `005-postman-token-tool`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Genera las especificaciones que sean necesarias." Alcance tomado de la descripción original del proyecto: una "opción para generar y mostrar un token de Auth0 que usaré para hacer llamadas a través de Postman", que "se desactivará en el futuro".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Obtener mi token de acceso para usarlo en Postman (Priority: P1)

Un operador del equipo técnico abre la opción "Token para Postman", genera un token de acceso a su nombre, lo copia y lo usa en Postman para hacer llamadas a los servicios de MailySoft con sus mismos permisos.

**Why this priority**: Es el propósito de la herramienta: permitir probar y consumir los servicios de MailySoft desde una herramienta externa sin crear credenciales aparte.

**Independent Test**: Con la herramienta habilitada, abrir la opción, generar y copiar el token, pegarlo en Postman y hacer una llamada a la plataforma: la llamada es atendida con la identidad y los permisos del operador.

**Acceptance Scenarios**:

1. **Given** la herramienta habilitada y un operador con sesión activa, **When** abre "Token para Postman" y solicita generar el token, **Then** ve un token vigente a su nombre, oculto por defecto, junto con su fecha y hora de expiración.
2. **Given** un token generado y oculto, **When** el operador elige "Mostrar", **Then** ve el valor completo del token y, al elegir "Ocultar", vuelve a ocultarse.
3. **Given** un token generado, **When** el operador elige "Copiar", **Then** el valor completo queda en el portapapeles y ve una confirmación de que se copió.
4. **Given** el token copiado y pegado en Postman, **When** el operador hace una llamada a la plataforma, **Then** la llamada se atiende con la identidad y los permisos del operador.
5. **Given** la pantalla del token, **When** el operador la observa, **Then** ve una advertencia visible de que el token da acceso a MailySoft con sus permisos y no debe compartirse ni guardarse en lugares públicos.
6. **Given** la pantalla del token, **When** el operador revisa sus opciones, **Then** no existe ninguna para generar credenciales de otra persona ni de una aplicación.

---

### User Story 2 - Mantener la herramienta bajo control y poder retirarla (Priority: P1)

La herramienta solo existe en los entornos donde MailySoft la habilita y puede retirarse en el futuro sin afectar al resto del backoffice.

**Why this priority**: Mostrar un token es una función sensible y temporal; sin un control claro de disponibilidad no es seguro liberarla.

**Independent Test**: Deshabilitar la herramienta en un entorno y comprobar que no aparece en la navegación ni es accesible por dirección directa, y que el resto del backoffice funciona igual; volver a habilitarla y comprobar que aparece.

**Acceptance Scenarios**:

1. **Given** la herramienta deshabilitada en el entorno, **When** un operador revisa la navegación, **Then** no existe la opción "Token para Postman".
2. **Given** la herramienta deshabilitada, **When** un operador abre directamente la dirección de la herramienta, **Then** ve la pantalla de "página no encontrada".
3. **Given** la herramienta habilitada, **When** un operador con acceso al backoffice revisa la navegación, **Then** ve la opción "Token para Postman".
4. **Given** la herramienta habilitada y una persona sin sesión, **When** abre la dirección de la herramienta, **Then** se le pide identificarse primero y no se muestra ningún token.
5. **Given** la herramienta deshabilitada, **When** un operador usa cualquier otra sección del backoffice, **Then** todas funcionan igual que con la herramienta habilitada.
6. **Given** un entorno nuevo en el que nadie ha habilitado la herramienta, **When** un operador revisa la navegación, **Then** la opción no existe, porque la herramienta está deshabilitada por defecto.

---

### User Story 3 - Conocer la vigencia del token y renovarlo (Priority: P2)

El operador ve cuándo expira su token y puede generar uno nuevo cuando el actual venza o lo necesite.

**Why this priority**: Un token vencido hace fallar las llamadas de Postman sin explicación; conocer la vigencia y renovarlo evita confusión, pero la herramienta es útil ya con la generación básica.

**Independent Test**: Generar un token, verificar que se muestra su expiración; esperar a que venza (o simularlo) y verificar que se indica como expirado y se puede generar uno nuevo.

**Acceptance Scenarios**:

1. **Given** un token generado, **When** el operador mira la pantalla, **Then** ve la fecha y hora de expiración en su zona horaria y el tiempo restante, que se actualiza mientras la pantalla está abierta.
2. **Given** un token expirado, **When** el operador mira la pantalla, **Then** ve que está expirado, no puede copiarlo y se le ofrece generar uno nuevo.
3. **Given** un token vigente, **When** el operador elige "Generar nuevo", **Then** obtiene un token vigente y el anterior deja de mostrarse.
4. **Given** un token generado, **When** el operador sale de la pantalla o cierra sesión, **Then** el token deja de mostrarse y, al volver, debe generarlo otra vez.

---

### Edge Cases

- ¿Qué ocurre si el portapapeles no está disponible o el navegador no permite copiar? Se informa y se ofrece mostrar el token para seleccionarlo y copiarlo manualmente.
- ¿Qué ocurre si no se puede obtener el token (sesión inválida o proveedor de identidad no disponible)? Se muestra un mensaje claro con la opción de reintentar o de iniciar sesión de nuevo.
- ¿Qué ocurre con un token muy largo? Al mostrarlo se ajusta a la pantalla sin recortarse y "Copiar" copia siempre el valor íntegro.
- ¿Qué ocurre si la herramienta se deshabilita mientras un operador la tiene abierta? Al siguiente intento de generar un token se le informa de que la herramienta ya no está disponible.
- ¿Qué ocurre con varias pestañas abiertas? Cada una gestiona su propio token de forma independiente.
- ¿Qué ocurre con una persona sin acceso al backoffice? No llega a la herramienta, porque primero se le niega el acceso (feature 001).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar la opción "Token para Postman" en la navegación solo cuando la herramienta esté habilitada para el entorno y el operador tenga acceso al backoffice.
- **FR-002**: La habilitación de la herramienta DEBE depender de la configuración del entorno, no de acciones de los operadores, y DEBE estar deshabilitada por defecto.
- **FR-003**: Cuando la herramienta esté deshabilitada, la opción NO DEBE existir en la navegación y su dirección directa DEBE mostrar "página no encontrada".
- **FR-004**: El sistema DEBE generar un token vigente a nombre del operador autenticado, con los mismos permisos que tiene en su sesión.
- **FR-005**: El sistema NO DEBE generar credenciales para otras identidades ni credenciales de aplicación o de servicio.
- **FR-006**: El token DEBE mostrarse oculto por defecto, con acciones para mostrarlo y ocultarlo.
- **FR-007**: El sistema DEBE permitir copiar el valor íntegro del token con una confirmación visible.
- **FR-008**: El sistema DEBE mostrar la fecha y hora de expiración del token en la zona horaria local del operador y el tiempo restante, e indicar claramente cuándo el token está expirado.
- **FR-009**: El sistema DEBE permitir obtener un token nuevo en cualquier momento.
- **FR-010**: La pantalla DEBE mostrar de forma visible una advertencia de seguridad sobre el uso del token.
- **FR-011**: El sistema NO DEBE conservar el token una vez que el operador sale de la pantalla o cierra sesión, y NO DEBE guardarlo ni registrarlo en ningún lugar.
- **FR-012**: El sistema DEBE mostrar un mensaje claro, en español, con opción de reintentar cuando no pueda obtener el token.
- **FR-013**: El retiro de la herramienta NO DEBE afectar a ninguna otra función del backoffice.

### Key Entities *(include if feature involves data)*

- **Token de acceso**: Credencial temporal que identifica al operador ante la plataforma de MailySoft y permite a herramientas externas, como Postman, hacer llamadas con los permisos del operador. Tiene valor, fecha de expiración y está vinculada a una sola persona.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador obtiene y copia un token válido en menos de 30 segundos desde que abre la opción.
- **SC-002**: El 100 % de los tokens mostrados mientras están vigentes son aceptados por la plataforma en una llamada de prueba.
- **SC-003**: Con la herramienta deshabilitada hay 0 puntos de acceso a ella (ni en la navegación ni por dirección directa).
- **SC-004**: Después de salir de la pantalla o cerrar sesión, 0 tokens permanecen visibles.
- **SC-005**: Deshabilitar la herramienta no altera ninguna otra función: el 100 % de las pruebas de las demás secciones siguen pasando.
- **SC-006**: En el 100 % de los casos, el operador identifica si su token está vigente o expirado sin necesidad de probarlo en Postman.

## Assumptions

- Dependencia: requiere la feature 001-auth-session-profile (sesión iniciada y acceso al backoffice).
- La herramienta es temporal: se retirará en el futuro, sin fecha definida, y su retiro no requiere cambios en el resto del backoffice.
- Está pensada para el equipo técnico de MailySoft que usa Postman; se habilita por entorno (por ejemplo, desarrollo y pruebas) y permanece deshabilitada por defecto.
- El token es del mismo tipo de credencial que el backoffice usa para consultar la plataforma; su vigencia la define el proveedor de identidad y generar uno nuevo no revoca los anteriores.
- Todos los usuarios que pertenezcan a los roles de sistema (hoy Administrator, Developer, Marketing y Billing) pueden usar la herramienta cuando está habilitada, sin necesitar un permiso específico, porque el token solo da los permisos que ya tienen.
- Fuera de alcance: tokens de otras personas o de aplicaciones, revocación de tokens, historial de tokens generados, y probar llamadas desde dentro del backoffice.
