# Feature Specification: Modo Oscuro y Claro del Backoffice

**Feature Branch**: `009-dark-mode-toggle`

**Created**: 2026-10-22

**Status**: Draft

**Input**: Descripción de la persona usuaria: "dark-mode. Los estilos quedaron bien. Pero el fondo quedó mal. Quiero que aprovechar para agregar un botón para habilitar los estilos en modo claro y modo oscuro. En la imagen que me compartió, el logotipo no se veía bien. Corregir eso también al cambiar entre modo oscuro y claro." Corresponde a la «Spec 4: modo oscuro y claro» de la serie «Spec N» de la persona solicitante (specs/008-design-system dejó la estructura de tokens lista para esta feature, sin implementarla); en Spec Kit es la 009. Incluye una captura de pantalla de la barra superior actual del Backoffice, con fondo azul marino y el logotipo "maily" con bajo contraste sobre ese fondo.

## Clarifications

### Session 2026-10-22

- Q: ¿Dónde debe guardarse la preferencia de tema (claro/oscuro) de cada persona usuaria del Backoffice? → A: Solo en el dispositivo/navegador (sin cambios de backend); no se sincroniza entre dispositivos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el tema de la interfaz (Priority: P1)

Quien usa el Backoffice encuentra, en cualquier pantalla, un control claramente visible para cambiar entre el tema claro y el tema oscuro. Al activarlo, el cambio se aplica de inmediato a toda la aplicación (fondo, barra de navegación, tarjetas, formularios, tablas), sin dejar zonas con los colores del otro tema.

**Why this priority**: Es el pedido central de la feature. Sin el control de cambio, el modo oscuro no existe como funcionalidad para la persona usuaria, aunque exista la paleta de colores.

**Independent Test**: Iniciar sesión en el Backoffice, activar el control, y recorrer varias pantallas (panel, usuarios, suscripciones, token, perfil) verificando que todo el contenido visible — incluida la barra superior y, en ancho móvil, la barra de navegación inferior — respeta el tema activo, sin fondos ni textos del tema contrario.

**Acceptance Scenarios**:

1. **Given** el Backoffice abierto en tema claro, **When** la persona activa el control de tema, **Then** toda la interfaz visible cambia a los colores del tema oscuro sin necesidad de recargar la página manualmente.
2. **Given** el tema oscuro activo, **When** la persona navega a otra sección del Backoffice, **Then** el tema oscuro se mantiene aplicado de forma consistente en la nueva pantalla.
3. **Given** el tema oscuro activo, **When** la persona vuelve a activar el control, **Then** la interfaz regresa al tema claro aprobado, sin colores ni fondos remanentes del tema oscuro.

---

### User Story 2 - Logotipo legible en ambos temas (Priority: P1)

Quien usa el Backoffice ve el logotipo de Maily con buen contraste tanto en el tema claro como en el oscuro, incluida la barra superior cuyo color de fondo cambia entre temas.

**Why this priority**: Es el defecto puntual reportado por la persona usuaria a partir de la captura compartida (logotipo casi ilegible sobre el fondo de la barra), y afecta la percepción de marca en cada pantalla.

**Independent Test**: Comparar visualmente la barra superior en tema claro y en tema oscuro, confirmando que el logotipo se distingue claramente de su fondo en ambos casos.

**Acceptance Scenarios**:

1. **Given** el tema claro activo, **When** se observa la barra superior, **Then** el logotipo se distingue con contraste accesible de su fondo.
2. **Given** el tema oscuro activo, **When** se observa la barra superior, **Then** el logotipo se distingue con contraste accesible de su fondo oscuro, sin verse apagado, borroso o casi invisible.
3. **Given** la persona cambia de tema, **When** ocurre el cambio, **Then** el tratamiento del logotipo se actualiza junto con el resto de la interfaz, sin esperar una recarga manual.

---

### User Story 3 - Preferencia de tema recordada entre visitas (Priority: P2)

Quien ya eligió un tema no necesita volver a elegirlo cada vez que entra al Backoffice desde el mismo dispositivo: la aplicación recuerda su elección y la aplica automáticamente.

**Why this priority**: Da comodidad y consistencia de uso, pero no bloquea el valor central (P1) de poder cambiar de tema en el momento.

**Independent Test**: Elegir un tema, cerrar la pestaña o la sesión, volver a entrar desde el mismo dispositivo, y confirmar que el tema elegido sigue activo sin seleccionar nada de nuevo.

**Acceptance Scenarios**:

1. **Given** la persona eligió el tema oscuro en este dispositivo, **When** vuelve a abrir el Backoffice desde el mismo dispositivo, **Then** la interfaz carga directamente en tema oscuro, sin pedir que lo elija otra vez.
2. **Given** la persona nunca eligió un tema de forma explícita en este dispositivo, **When** abre el Backoffice por primera vez, **Then** el tema inicial sigue la preferencia de apariencia del sistema operativo o navegador de ese dispositivo.

---

### Edge Cases

- ¿Qué ocurre si una pantalla o componente nuevo todavía no tiene definidos los valores del tema oscuro? Debe heredar los tokens del sistema de diseño en vez de quedar sin estilos o con el fondo del tema contrario.
- ¿Qué ocurre si el sistema operativo o navegador de la persona tiene configurada una preferencia de apariencia oscura, pero la persona elige explícitamente el tema claro dentro del Backoffice (o viceversa)? La elección explícita dentro del Backoffice prevalece sobre la preferencia del sistema mientras la persona no la cambie.
- ¿Qué ocurre con los elementos nativos del navegador (barras de desplazamiento, controles de formulario, selectores de fecha) que la aplicación no estila directamente? Deben coincidir con el tema activo, para evitar la mezcla de fondos que motivó este pedido.
- ¿Qué ocurre con los colores que comunican estado (éxito, aviso, peligro) al cambiar de tema? Deben seguir siendo reconocibles y mantener el contraste mínimo exigido en ambos temas.
- ¿Qué ocurre si la persona usa el Backoffice desde otro dispositivo o navegador? Al no sincronizarse la preferencia, ese dispositivo aplica su propia preferencia de sistema hasta que la persona la elija ahí también.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un control visible y accesible, disponible en cualquier pantalla del Backoffice, para cambiar entre el tema claro y el tema oscuro.
- **FR-002**: El sistema DEBE aplicar el tema elegido de forma consistente en toda la aplicación (barra superior, navegación inferior en ancho móvil, contenido, formularios y tablas), sin dejar zonas con colores del tema contrario.
- **FR-003**: El sistema DEBE recordar la elección de tema de la persona usuaria en el dispositivo/navegador donde la hizo, y aplicarla automáticamente en sus próximas visitas desde ese mismo dispositivo, sin sincronizarla con otros dispositivos.
- **FR-004**: El sistema DEBE mantener el logotipo de Maily claramente visible y con contraste accesible en la barra superior tanto en tema claro como en tema oscuro, reutilizando el archivo de logotipo actual con un tratamiento de contraste adicional en tema oscuro.
- **FR-005**: El sistema DEBE mantener el contraste mínimo WCAG 2.1 AA entre textos, iconos y controles interactivos y su fondo, en ambos temas, igual que exige el sistema de diseño vigente (specs/008-design-system).
- **FR-006**: El sistema DEBE permitir que la elección explícita de tema de la persona prevalezca sobre la preferencia de apariencia del sistema operativo o navegador, una vez que la persona haya elegido.
- **FR-007**: El sistema DEBE ofrecer el control de tema como una alternancia de dos estados (claro/oscuro) y, mientras la persona no haya elegido explícitamente en ese dispositivo, DEBE mostrar el tema que coincida con la preferencia de apariencia del sistema operativo o navegador.
- **FR-008**: El sistema DEBE corregir el fondo de la interfaz para que, en el tema que esté activo, ninguna zona de la pantalla muestre un color de fondo no previsto por el diseño aprobado (el defecto reportado sobre el fondo actual).

### Key Entities *(include if feature involves data)*

- **Preferencia de Tema**: la elección de apariencia (claro u oscuro) de la persona usuaria, guardada únicamente en el dispositivo/navegador donde se eligió, y el momento en que se aplica (preferencia de sistema por defecto, hasta que haya una elección explícita).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cambiar entre tema claro y oscuro se logra con una sola acción, desde cualquier pantalla del Backoffice.
- **SC-002**: El 100% de las pantallas y elementos de navegación auditados reflejan correctamente el tema activo, sin fondos mezclados entre temas.
- **SC-003**: El logotipo cumple el contraste accesible mínimo (WCAG AA) contra su fondo, tanto en tema claro como en tema oscuro.
- **SC-004**: Las personas que vuelven a entrar desde el mismo dispositivo ven aplicado automáticamente el último tema que eligieron ahí, sin tener que volver a seleccionarlo.
- **SC-005**: El cambio de tema se percibe como inmediato (sin parpadeos ni contenido sin estilo visible) en el 100% de los casos probados.

## Assumptions

- El Backoffice es la única aplicación afectada por esta feature; MailySoft v2 (web-soft) no tiene modo oscuro propio (confirmado en docs/DESIGN.md), por lo que no existe una paleta de referencia que replicar: la paleta oscura se define desde cero, con los mismos nombres de token que ya usa el tema claro (specs/008-design-system).
- El control de cambio de tema está disponible para cualquier persona con sesión iniciada en el Backoffice, sin distinción de rol.
- Ningún componente existente necesita rediseñarse para soportar el tema oscuro: alcanza con un segundo conjunto de valores de los mismos tokens de color, tal como anticipó specs/008-design-system.
- "El fondo quedó mal" se interpreta como un defecto general de fondo de la interfaz actual (tema claro), no solo del futuro tema oscuro; por eso FR-008 lo cubre como corrección independiente del resto de la feature.
