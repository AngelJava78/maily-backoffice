# Feature Specification: Menú de Perfil con Avatar en el Encabezado

**Feature Branch**: `011-profile-avatar-menu`

**Created**: 2026-10-23

**Status**: Draft

**Input**: Descripción de la persona usuaria: "Quiero que agregues un botón de perfil con la foto del usuario logueado en el sistema en la esquina superior izquierda. Actualmente la api de usuarios no devuelve la foto. Así que muestra un avatar genérico para todos los usuarios sin importar el género del usuario. El usuario no podrá cambiar de role ni de usuario. Pero si podrá cerrar su sesión y podrá ir a su perfil para cambiar su foto. Aunque la api no lo soporta actualmente." Incluye cuatro capturas de pantalla de referencia (Microsoft Teams, Excel/cuenta Microsoft, y dos pantallas al estilo Google/Gemini), todas con el mismo patrón: un botón redondo con el avatar de la persona que, al activarse, abre un menú con su nombre, correo y acciones. Corresponde a la «Spec 5: icono de perfil» de la serie «Spec N» de la persona solicitante (specs/008-design-system dejó reservado el espacio y construido el componente de avatar para esta feature, sin usarlos todavía — ver docs/DESIGN.md).

## Clarifications

### Session 2026-10-23

- Q: ¿Qué debe mostrar el avatar, ya que la plataforma de usuarios no entrega fotografía? → A:
  Reutilizar el componente que specs/008-design-system ya construyó y dejó sin usar: las iniciales
  de la persona sobre un tono de color propio de esa persona (distinto entre personas, calculado de
  forma determinística), no un ícono idéntico para todas.
- Q: ¿Qué debe pasar cuando alguien intenta cambiar su fotografía en "Mi perfil", dado que la
  plataforma de usuarios no lo admite todavía? → A: Mostrar la opción; al activarla, explicar con
  claridad que todavía no está disponible — no ocultarla ni dejarla sin reacción.
- Q: ¿El botón de avatar va en la esquina superior izquierda o en la derecha del encabezado? → A:
  Derecha — confirmado por la persona solicitante; el pedido original decía "izquierda" por error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identificar la cuenta propia y cerrar sesión desde un único control (Priority: P1)

Quien usa el Backoffice ve, en la esquina superior derecha del encabezado, un botón con su avatar.
Al activarlo, se abre un menú con su nombre, correo y role(s) activos, un enlace a "Mi perfil" y la
opción de cerrar sesión — sin ofrecer cambiar de role activo ni de cuenta/usuario.

**Why this priority**: es el pedido central de la feature; reemplaza el nombre en texto plano y los
botones sueltos de "Perfil" y "Cerrar sesión" que hoy están en el encabezado por el patrón que
muestran las capturas compartidas.

**Independent Test**: abrir el menú desde cualquier pantalla con sesión concedida, confirmar que
muestra nombre, correo y role(s) activos, que "Mi perfil" lleva a la pantalla de perfil y cierra el
menú, y que "Cerrar sesión" termina la sesión igual que hoy.

**Acceptance Scenarios**:

1. **Given** sesión concedida en cualquier pantalla, **When** la persona activa el botón de avatar
   del encabezado, **Then** se abre un menú con su nombre, su correo y su(s) role(s) activo(s).
2. **Given** el menú abierto, **When** la persona elige "Mi perfil", **Then** va a la pantalla de su
   perfil y el menú se cierra.
3. **Given** el menú abierto, **When** la persona elige "Cerrar sesión", **Then** su sesión termina
   igual que hoy (specs/001-auth-session-profile, FR-010).
4. **Given** el menú abierto, **When** se observa su contenido, **Then** no ofrece ninguna acción
   para cambiar el role activo ni para cambiar de cuenta o de usuario.

---

### User Story 2 - Un avatar reconocible y consistente, sin fotografía ni género (Priority: P1)

Como la plataforma de usuarios no entrega una fotografía, el avatar debe mostrar algo reconocible,
sin representar ni sugerir un género, y debe verse igual en el encabezado y en "Mi perfil" (la
única otra pantalla de hoy que ya muestra un avatar de la propia persona).

**Why this priority**: pedido explícito de la persona usuaria, y es lo primero que se percibe de
esta feature.

**Independent Test**: comparar el avatar del encabezado con el de "Mi perfil"; deben seguir el
mismo criterio visual, y ninguno debe mostrar una silueta o ícono con apariencia de género.

**Acceptance Scenarios**:

1. **Given** una persona sin fotografía registrada (el caso de hoy, para todas), **When** ve su
   avatar en el encabezado, **Then** ve sus iniciales sobre un color propio de esa persona, y no
   una silueta ni un ícono con apariencia de género.
2. **Given** el mismo avatar visible en el encabezado y en "Mi perfil", **When** se comparan,
   **Then** siguen el mismo criterio visual.

---

### User Story 3 - Saber que cambiar la fotografía está planeado, aunque todavía no funcione (Priority: P3)

Quien quiere cambiar su fotografía la busca en "Mi perfil" y encuentra la opción, aunque hoy no
pueda completarla porque la plataforma de usuarios todavía no lo admite.

**Why this priority**: pedido explícito, pero de menor impacto inmediato que el menú en sí —
es, a propósito, una opción visible de algo que hoy no se puede completar.

**Independent Test**: entrar a "Mi perfil", buscar cómo cambiar la fotografía y activar esa opción;
confirmar que explica con claridad que todavía no está disponible, sin fallar en silencio ni dar a
entender que el cambio ocurrió.

**Acceptance Scenarios**:

1. **Given** la pantalla de "Mi perfil", **When** la persona busca cómo cambiar su fotografía,
   **Then** encuentra la opción.
2. **Given** que la activa, **When** ocurre, **Then** un mensaje claro le dice que todavía no está
   disponible, sin dejarla pensar que el cambio se aplicó.

---

### Edge Cases

- ¿Qué ocurre si la persona tiene más de un role activo? El menú muestra todos, igual que ya hace
  "Mi perfil" hoy (specs/001-auth-session-profile).
- ¿Qué ocurre con la verificación automática existente que hoy espera "Perfil" y "Cerrar sesión"
  visibles directamente en el encabezado, sin abrir nada (`e2e/responsive.spec.ts`)? Esta feature
  la actualiza para que abra el menú primero: es un cambio deliberado de ese contrato para adoptar
  el patrón de menú, no una pérdida de accesibilidad — el botón que abre el menú sigue siendo
  accesible por teclado y con nombre accesible en cualquier ancho (FR-007).
- ¿Qué ocurre en ancho de móvil, donde la navegación entre secciones baja a una barra inferior? El
  encabezado, y el botón de avatar dentro de él, siguen visibles en todos los anchos, igual que hoy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, en la esquina superior derecha del encabezado de toda
  pantalla con sesión concedida, un botón con el avatar de la persona que abre un menú con su
  información.
- **FR-002**: El menú DEBE mostrar el nombre, el correo y el/los role(s) activo(s) de la persona,
  sin ofrecer ninguna acción para cambiarlos ni para cambiar de cuenta o de usuario.
- **FR-003**: El menú DEBE ofrecer ir a "Mi perfil" y cerrar sesión; cerrar sesión DEBE comportarse
  igual que hoy (specs/001-auth-session-profile, FR-010).
- **FR-004**: El avatar DEBE mostrar las iniciales de la persona sobre un tono de color propio de
  esa persona; NO DEBE mostrar una fotografía mientras la plataforma de usuarios no la entregue, y
  NO DEBE mostrar un ícono o silueta que sugiera género.
- **FR-005**: El sistema DEBE mostrar el mismo avatar (mismo criterio visual de FR-004) tanto en el
  encabezado como en "Mi perfil" — hoy esa pantalla ya muestra un avatar con un criterio distinto
  (un color fijo, igual para cualquier persona), que DEBE unificarse con esta feature.
- **FR-006**: "Mi perfil" DEBE ofrecer una forma de cambiar la fotografía; al activarla, DEBE
  explicar con claridad que todavía no está disponible, sin fallar en silencio ni simular un cambio
  que no ocurre.
- **FR-007**: El botón que abre el menú DEBE ser operable por teclado y tener un nombre accesible,
  en cualquier ancho de pantalla.

### Key Entities *(include if feature involves data)*

- **Avatar**: representación visual de una persona — sus iniciales sobre un tono de color propio de
  esa persona, sin fotografía ni elementos que sugieran género — igual en el encabezado y en "Mi
  perfil".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde cualquier pantalla, llegar a "Mi perfil" o cerrar sesión desde el nuevo menú
  toma como máximo dos acciones (abrir el menú, elegir la opción).
- **SC-002**: El 100 % de las personas ven el mismo criterio de avatar, sin fotografía, tanto en el
  encabezado como en "Mi perfil".
- **SC-003**: Ninguna persona puede cambiar su role activo ni la cuenta con la que entró desde este
  menú, en el 100 % de los casos probados.
- **SC-004**: Quien intenta cambiar su fotografía entiende, sin ambigüedad, que todavía no está
  disponible — verificado por el mensaje mostrado, no por que la acción falle sin explicación.

## Assumptions

- El nombre en texto plano y los controles sueltos "Perfil" y "Cerrar sesión" que hoy están en el
  encabezado se reemplazan por el nuevo menú — no conviven ambos.
- No se usa la fotografía que a veces entrega el proveedor de identidad (Auth0) en su token: la
  specs/001-auth-session-profile ya decidió que los datos de la persona vienen solo de la
  plataforma de usuarios de MailySoft, no del proveedor de identidad; esta feature no cambia eso.
