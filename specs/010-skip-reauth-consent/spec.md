# Feature Specification: Evitar la Pantalla de Autorización al Recuperar una Sesión Activa

**Feature Branch**: `010-skip-reauth-consent`

**Created**: 2026-10-22

**Status**: Draft

**Input**: Descripción de la persona usuaria: "Quiero que corrijas un comportamiento anormal de la página cuando se presiona F5, se termina la sesión y regresa a la página de login. Quiero que cuando se presione F5 solo se recargue la página actual sin cerrar sesión. O así funcionan las aplicaciones construidas con React?" Investigación previa a esta spec: specs/001-auth-session-profile/spec.md (Q21, FR-007, Edge Cases línea 139, Assumptions línea 204) ya había decidido que, al recargar sin que el navegador recupere la sesión por sí solo, un clic en "Iniciar sesión" sin volver a escribir credenciales es una fricción aceptable, y que eliminarla del todo requeriría un dominio propio del proveedor de identidad (fuera de alcance de esa feature). Capturas de pantalla compartidas por la persona usuaria mostraron un paso adicional que esa spec no contempló: tras el clic en "Iniciar sesión", el proveedor de identidad muestra una pantalla de autorización ("Authorize App" / "¿Autorizar la aplicación?") que exige un segundo clic ("Accept"/"Aceptar") antes de volver a la pantalla original. Esta spec corrige específicamente ese paso adicional; no vuelve a abrir las decisiones ya tomadas en la Spec 1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recuperar una pantalla sin re-autorizar lo ya concedido (Priority: P1)

Una persona con sesión activa en el proveedor de identidad recarga (F5) una pantalla protegida del Backoffice, o la abre en una pestaña nueva. Hoy, cuando el navegador no logra recuperar la sesión por sí solo, ve la pantalla de acceso, hace clic en "Iniciar sesión" y, antes de volver a su pantalla, debe aceptar una pantalla de autorización pidiéndole que confirme un acceso que ya había concedido antes. Se quiere que ese paso de autorización repetida desaparezca: tras el clic en "Iniciar sesión", la persona debe volver directo a la pantalla donde estaba.

**Why this priority**: es el pedido explícito de la persona usuaria y el paso que interrumpe el trabajo en cada recarga, a diferencia del clic en "Iniciar sesión" (ya aceptado en la Spec 1).

**Independent Test**: con una sesión vigente en el proveedor de identidad y ya autorizada una vez, recargar cualquier pantalla protegida del Backoffice (o abrirla en una pestaña nueva) y confirmar que, tras el clic en "Iniciar sesión" (cuando aparece), la persona vuelve directo a la pantalla original, sin ver una pantalla de autorización de por medio.

**Acceptance Scenarios**:

1. **Given** una sesión vigente y ya autorizada en el proveedor de identidad, **When** se recarga una pantalla protegida y el navegador no recupera la sesión por sí solo, **Then** aparece la pantalla de acceso; al hacer clic en "Iniciar sesión" la persona vuelve directo a la pantalla donde estaba, sin una pantalla de autorización de por medio.
2. **Given** la misma situación, **When** el navegador sí recupera la sesión por sí solo, **Then** la persona nunca deja la pantalla en la que estaba (comportamiento ya vigente de la Spec 1, sin cambios).
3. **Given** una sesión que el proveedor de identidad ya no reconoce como vigente (expiró, la persona cerró sesión, o es la primera vez que usa el Backoffice), **When** se recarga una pantalla protegida, **Then** se pide identificarse con credenciales y, si corresponde, autorizar el acceso, como ya ocurre hoy — este caso no cambia.

---

### Edge Cases

- ¿Qué ocurre la primera vez que una persona usa el Backoffice, cuando todavía no autorizó nada? Ve la pantalla de autorización una vez, como es esperado; esta feature evita que se repita en cada recarga posterior, no que desaparezca siempre.
- ¿Qué ocurre si una feature futura pide un permiso nuevo que la persona nunca autorizó? Vuelve a pedirse autorización para ese permiso nuevo; evitar la pantalla repetida aplica solo a lo que ya fue concedido antes.
- ¿Qué ocurre con el cierre de sesión manual o por inactividad? No cambia: en ambos casos la sesión termina también en el proveedor de identidad (Spec 1, FR-010), así que la siguiente vez vuelve a pedirse identificarse de cero.
- ¿Qué ocurre si la persona revoca el acceso del Backoffice desde su cuenta del proveedor de identidad? Vuelve a pedirse autorización la siguiente vez, como corresponde.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE, al recuperar una sesión que el proveedor de identidad reconoce como vigente y ya autorizada antes por la misma persona para el mismo conjunto de permisos, devolver a la persona a la pantalla donde estaba sin mostrar una pantalla de autorización o consentimiento adicional.
- **FR-002**: El sistema DEBE seguir pidiendo identificarse con credenciales cuando el proveedor de identidad ya no reconoce una sesión vigente para la persona (sesión expirada, cerrada, o primer uso del Backoffice) — este caso no cambia con esta feature.
- **FR-003**: El sistema DEBE seguir pidiendo autorización cuando el conjunto de permisos solicitado no coincida con el que la persona ya había concedido antes (p. ej. una feature futura agrega un permiso nuevo) — evitar la pantalla de autorización aplica solo a permisos ya concedidos.
- **FR-004**: El sistema NO DEBE cambiar el comportamiento que la Spec 1 ya aceptó: cuando el navegador no recupera la sesión por sí solo, la persona sigue viendo la pantalla de acceso y necesitando un clic en "Iniciar sesión" (sin volver a escribir credenciales) antes de volver a su pantalla.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al recargar cualquier pantalla protegida con una sesión vigente y ya autorizada, la persona vuelve a esa misma pantalla sin ver una pantalla de autorización, en el 100 % de los casos probados.
- **SC-002**: Cuando aparece el clic en "Iniciar sesión" (porque el navegador no recuperó la sesión por sí solo), el tiempo entre ese clic y volver a ver la pantalla original baja a menos de 3 segundos, al quitar el paso manual de aceptar la autorización.
- **SC-003**: Ninguna persona necesita volver a conceder un permiso que ya había concedido antes, en el 100 % de las recargas con sesión vigente.

## Assumptions

- Esta mejora depende de cómo el proveedor de identidad decide si repetir o no la pantalla de autorización para una aplicación y un conjunto de permisos ya concedidos antes; no es un comportamiento que dependa solo del código del Backoffice, sino también de cómo está configurada la aplicación del lado del proveedor de identidad.
- No cambia nada de lo ya aceptado en la Spec 1: el clic en "Iniciar sesión" cuando el navegador no recupera la sesión por sí solo, y el dominio propio del proveedor de identidad que esa spec dejó fuera de alcance para eliminar ese clic, siguen igual.
- No cambia el cierre de sesión manual, el cierre por inactividad, ni el caso de una sesión que el proveedor de identidad ya no reconoce como vigente: en esos casos, volver a pedir credenciales y, si corresponde, autorización, sigue siendo lo esperado.
- La primera vez que una persona usa el Backoffice sigue viendo la pantalla de autorización una vez; esta feature evita que se repita en cada recarga posterior.
