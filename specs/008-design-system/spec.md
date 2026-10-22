# Feature Specification: Estilos, Diseño e Iconografía de MailySoft v2

**Feature Branch**: `008-design-system`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Spec 3: Estilos, diseño e iconografía" (serie «Spec N» de la persona solicitante; en Spec Kit es la 008). La descripción completa (contexto, objetivo, requisitos, fuera de alcance y criterios de aceptación) se recoge en esta especificación sin quitar ni cambiar requisitos. Las marcas del original «[ver aclaración de stack]» y «[Confirmar]», y el «sidebar» que web-soft no tiene, quedan como [NEEDS CLARIFICATION]. Objetivo literal: "El Backoffice adopta el sistema de diseño de MailySoft v2 (colores, tipografía, espaciado, componentes, layout e iconografía), para que ambas aplicaciones se vean como un mismo producto."

## Clarifications

### Session 2026-10-21

- Q: ¿El Backoffice debe replicar el diseño visual de web-soft usando MUI como única librería de componentes, o reemplazar MUI por Tailwind CSS para igualar el stack real de web-soft? → A: Replicar el diseño de web-soft usando MUI (retematizado); MUI sigue siendo la única librería de componentes.
- Q: ¿El layout del Backoffice debe adoptar el esquema de web-soft (barra superior fija con navegación y, en móvil, una barra de navegación inferior, sin sidebar), o debe agregar un sidebar de navegación lateral? → A: Adoptar el layout de web-soft (barra superior fija y barra de navegación inferior en móvil); sin sidebar.
- Q: Para el borde de los campos de formulario, ¿se debe usar el token `borde-fuerte` de web-soft (#4A7FA7, contraste 4,3:1) en lugar de `borde` (#E3EAF2, contraste 1,2:1), para cumplir el contraste mínimo WCAG AA aunque no sea el valor que usa hoy web-soft en ese lugar? → A: Usar `borde-fuerte` (4,3:1); prevalece WCAG AA (FR-019) sobre el valor literal de web-soft.
- Q: Como fuente de los valores de diseño, ¿se toma el sistema de tokens de las pantallas de web-soft ya migradas, o el aspecto actual de su área de plataforma (todavía con los colores anteriores)? → A: Las pantallas ya migradas al sistema de diseño v2; el área de plataforma no es la referencia.
- Q: ¿La etiqueta junto al logo debe decir «Backoffice», con el estilo de píldora que usa web-soft para su etiqueta «Plataforma»? → A: Sí, «Backoffice» con el estilo de píldora de «Plataforma».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconocer el Backoffice como parte de MailySoft (Priority: P1)

Quien opera el Backoffice lo abre y lo reconoce como parte del mismo producto que MailySoft v2: el mismo logo, los mismos colores, la misma tipografía y los mismos iconos, con un layout como el de web-soft (navegación, header y área de contenido) que muestra las secciones del Backoffice y una etiqueta que lo distingue de MailySoft. Al angostar la ventana, el layout se reacomoda igual que el de web-soft.

**Why this priority**: Es el objetivo de la feature y la base de lo demás: sin tokens, iconos y layout no hay pantallas que migrar ni estructura para las Specs 4 a 7.

**Independent Test**: Abrir el Backoffice y MailySoft v2 lado a lado, a un ancho de escritorio y a uno de móvil, y comparar el layout: logo, etiqueta, colores, tipografía, iconos, navegación, header y comportamiento responsive.

**Acceptance Scenarios**:

1. **Given** una persona con sesión en el Backoffice, **When** abre cualquier pantalla interna, **Then** ve el layout de web-soft (header, navegación y área de contenido) con el logo de Maily, la etiqueta «Backoffice» junto a él y las secciones del Backoffice que puede ver según sus permisos.
2. **Given** el Backoffice y MailySoft v2 abiertos lado a lado al mismo ancho, **When** se comparan sus layouts, **Then** usan los mismos colores, tipografía, iconos y estilo de componentes.
3. **Given** el Backoffice a un ancho de escritorio, **When** la ventana se angosta hasta el ancho de un móvil, **Then** el layout se reacomoda igual que el de web-soft en los mismos anchos.
4. **Given** el header de cualquier pantalla interna, **When** se observa su lado derecho, **Then** tiene reservado el espacio del icono de perfil (Spec 5) y del selector de idioma (Spec 7), y lo que hoy ofrece el header (el nombre de la persona, ir al perfil y cerrar sesión) sigue disponible.
5. **Given** el Backoffice abierto en una pestaña del navegador, **When** la persona mira la pestaña, **Then** ve el favicon de MailySoft v2.

---

### User Story 2 - Usar todas las pantallas con el nuevo diseño sin que cambie su comportamiento (Priority: P1)

Quien opera el Backoffice recorre todas las pantallas existentes (la pantalla de acceso previa al login, el Panel, el perfil, los listados, los detalles, los formularios, los diálogos de confirmación, los avisos y los estados de carga, vacío y error) y las ve con los componentes de web-soft, pero cada pantalla sigue en la misma dirección, muestra los mismos datos y hace lo mismo que antes.

**Why this priority**: El cambio solo cumple su objetivo si llega a todas las pantallas y no rompe nada: es una feature de presentación.

**Independent Test**: Recorrer cada ruta existente antes y después del cambio y comprobar que la dirección, los datos, las acciones y los mensajes son los mismos; comparar lado a lado con MailySoft v2 una pantalla de listado, una de formulario, un modal y los mensajes; ejecutar las pruebas existentes.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla existente del Backoffice, **When** se abre después del cambio, **Then** usa el nuevo layout y los componentes base, en la misma ruta y con el mismo comportamiento que antes.
2. **Given** una pantalla de listado del Backoffice y una de MailySoft v2 lado a lado, **When** se comparan la tabla, la paginación, los badges y los botones, **Then** usan los mismos colores, tipografía, iconos y estilo de componentes.
3. **Given** un formulario del Backoffice y uno de MailySoft v2 lado a lado, **When** se comparan las etiquetas, los campos, los selects, las casillas, los errores y los botones, **Then** usan los mismos colores, tipografía, iconos y estilo de componentes.
4. **Given** una acción que pide confirmación (por ejemplo, eliminar), **When** se abre el modal, **Then** tiene el aspecto del modal de web-soft y nombra el recurso afectado, como hoy.
5. **Given** una operación que termina bien o mal, **When** el Backoffice avisa a la persona, **Then** el mensaje (toast o alerta) tiene el aspecto de los mensajes de web-soft y dice lo mismo que hoy.
6. **Given** una pantalla que depende de datos remotos, **When** está cargando, no hay datos o la consulta falla, **Then** muestra los estados de carga, vacío y error con el aspecto de web-soft y conserva las acciones que hoy ofrece en ellos.
7. **Given** una persona sin sesión, **When** abre la pantalla de acceso previa al login del Backoffice, **Then** la ve con el nuevo diseño; la página de login de Auth0 no cambia.
8. **Given** cualquier pantalla, **When** se revisan sus iconos, **Then** todos salen de la librería de web-soft a través del componente común y no queda ninguno de la librería anterior.

---

### User Story 3 - Operar el Backoffice con teclado y con contraste suficiente (Priority: P2)

Una persona que usa solo el teclado, o que tiene baja visión, opera todo el Backoffice con el nuevo diseño: siempre ve dónde está el foco, llega a todo con el teclado y lee textos, iconos y bordes de campos con contraste suficiente.

**Why this priority**: La accesibilidad WCAG AA ya se exige hoy y web-soft no la cumple en todo (foco visible solo en botones y campos, borde de los campos por debajo de 3:1, modales sin retener el foco): el cambio de diseño no puede empeorarla.

**Independent Test**: Recorrer cada pantalla solo con el teclado; medir el contraste de textos, iconos informativos y bordes de campos; ejecutar las verificaciones automáticas de accesibilidad existentes.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla, **When** la persona recorre sus controles con el teclado, **Then** el foco siempre es visible y sigue un orden lógico.
2. **Given** un modal abierto, **When** la persona lo opera con el teclado, **Then** puede usarlo y cerrarlo sin ratón, el foco no se pierde detrás del modal y, al cerrarlo, vuelve a un lugar lógico.
3. **Given** cualquier texto, icono informativo o borde de campo, **When** se mide su contraste, **Then** cumple WCAG AA (4,5:1 el texto normal; 3:1 el texto grande y lo que identifica un control).
4. **Given** las verificaciones automáticas de accesibilidad de las pantallas principales, **When** se ejecutan, **Then** no reportan violaciones.

---

### User Story 4 - Migrar una pantalla con la guía de diseño (Priority: P2)

Quien desarrolla las Specs 1 y 2 (u otra pantalla futura) adapta su pantalla al nuevo diseño siguiendo la guía de `docs/DESIGN.md`, usando solo tokens, componentes base y el componente común de iconos, y sabe de qué archivo de web-soft sale cada pieza.

**Why this priority**: Las Specs 1 y 2 agregan pantallas en paralelo en otras ramas y deben adaptarse al mergear; sin guía, cada pantalla volvería a inventar estilos.

**Independent Test**: Seguir la guía para migrar una pantalla y comprobar que el resultado solo usa tokens, componentes base y el componente de iconos, sin valores fijos ni textos dispersos.

**Acceptance Scenarios**:

1. **Given** `docs/DESIGN.md`, **When** una persona desarrolladora lo abre, **Then** encuentra los tokens, los componentes y los iconos con cómo usarlos, la tabla de equivalencias con web-soft y una guía corta para migrar una pantalla.
2. **Given** una pantalla migrada con la guía, **When** se revisa, **Then** no usa colores, tamaños de fuente ni espaciados fuera de los tokens, todos sus iconos pasan por el componente común y no agrega textos fijos dispersos.
3. **Given** cualquier token, fuente, icono, logo, favicon o componente del Backoffice, **When** se busca en la tabla de equivalencias, **Then** se sabe de qué archivo de web-soft sale y en qué archivo del Backoffice quedó.

---

### User Story 5 - Encontrar la estructura lista para las Specs 4 a 7 (Priority: P3)

Quien implemente el modo oscuro (Spec 4), el icono de perfil (Spec 5), la fotografía de usuarios (Spec 6) o el inglés/español (Spec 7) encuentra la estructura preparada y la documentación de cómo lo resuelve web-soft, sin tener que rehacer lo que entrega esta feature.

**Why this priority**: Esas specs vienen después; su costo depende de que esta deje la estructura lista, pero el Backoffice ya cumple su objetivo sin ellas.

**Independent Test**: Revisar que ningún componente use valores fijos, que el header tenga los espacios reservados, que exista el avatar con iniciales, que no haya textos fijos nuevos dispersos y que `docs/DESIGN.md` documente cómo resuelve web-soft el modo oscuro, el menú de perfil, el avatar y los idiomas.

**Acceptance Scenarios**:

1. **Given** los tokens y los componentes de esta feature, **When** la Spec 4 agregue el modo oscuro, **Then** le basta agregar un segundo set de valores, sin cambiar los componentes.
2. **Given** el header, **When** la Spec 5 o la Spec 7 agreguen el icono de perfil o el selector de idioma, **Then** encuentran su espacio reservado a la derecha.
3. **Given** el avatar con iniciales de los componentes base, **When** las Specs 5 y 6 lo necesiten, **Then** ya existe con el aspecto de web-soft.
4. **Given** los textos de la interfaz, **When** la Spec 7 agregue el inglés, **Then** esta feature no dejó textos fijos nuevos dispersos por el código.
5. **Given** `docs/DESIGN.md`, **When** se prepara una de las Specs 4 a 7, **Then** encuentra cómo resuelve web-soft el modo oscuro, el menú de perfil, el avatar y los idiomas, o que no los tiene.

---

### Edge Cases

- ¿Qué ocurre con las pantallas o los elementos del Backoffice que no tienen equivalente en web-soft (por ejemplo, la herramienta de token, la pantalla de configuración inválida o la de comprobación de acceso fallida)? Se construyen con los tokens y los componentes base. Un valor que no esté en web-soft no se inventa: se consulta con la persona solicitante y se registra en la tabla de equivalencias.
- ¿Qué ocurre cuando el Backoffice ofrece algo que web-soft no tiene (por ejemplo, elegir cuántas filas ver por página, reintentar una consulta fallida o los toasts)? La función se conserva con el aspecto de web-soft, porque el comportamiento de las pantallas no cambia (FR-017).
- ¿Qué ocurre si un valor o un comportamiento de web-soft no alcanza WCAG AA (el borde de los campos, `#E3EAF2`, tiene 1,2:1 sobre blanco; el foco solo se ve en botones y campos; los modales no se cierran con Escape ni retienen el foco)? Prevalece WCAG AA (FR-019): el borde de los campos usa el token `borde-fuerte` de web-soft (`#4A7FA7`, 4,3:1) en lugar de `borde`; el resto del comportamiento accesible que ya tiene MUI (foco visible en todos los controles, cierre de modales con Escape y retención del foco) se conserva tal cual, sin bajarlo al nivel de web-soft.
- ¿Qué ocurre si la fuente no se puede cargar? Se usa la fuente de respaldo que define web-soft (la del sistema), sin que cambie el contenido ni se rompa el layout.
- ¿Qué ocurre si la imagen del logo no se puede cargar? Se muestra el nombre en texto, como hace el componente de marca de web-soft, para que la aplicación no quede sin identificar.
- ¿Qué ocurre en una ventana muy angosta (320 px)? El layout se reacomoda sin desplazamiento horizontal, como ya exige el Backoffice (feature 001), y el header conserva sus accesos al perfil y a cerrar sesión.
- ¿Qué ocurre con los textos que el nuevo diseño necesita y hoy no existen (por ejemplo, la etiqueta «Backoffice» o el nombre accesible de un icono)? Se agregan al módulo central de mensajes, nunca dispersos por el código (FR-020).
- ¿Qué ocurre con los iconos propios de web-soft? Hoy son solo los de órganos, de uso clínico. Si una pantalla del Backoffice usa un icono propio, se muestra a través del componente común, como los de la librería.
- ¿Qué ocurre con las pantallas que agregan las Specs 1 y 2 en otras ramas? No se adaptan aquí: se adaptan al mergear, con la guía de `docs/DESIGN.md` (FR-023).
- ¿Qué ocurre con la página de login de Auth0 (Universal Login)? No cambia: está fuera de alcance. Solo cambia la pantalla de acceso propia del Backoffice, previa al login.

## Requirements *(mandatory)*

### Functional Requirements

La numeración de los grupos sigue la de los requisitos del original (1 a 9).

**1. Reutilización**

- **FR-001**: El Backoffice DEBE copiar o adaptar desde web-soft los tokens, las fuentes, los iconos, el logo, el favicon y los componentes.
- **FR-002**: El plan DEBE replicar el diseño de web-soft retematizando MUI (manteniéndolo como única librería de componentes), sin reemplazarlo por Tailwind CSS. Al final NO DEBEN quedar dos librerías de UI conviviendo.
- **FR-003**: DEBE registrarse de dónde sale cada elemento en una tabla de equivalencias (archivo de web-soft → archivo del Backoffice).

**2. Tokens centralizados**

- **FR-004**: Los colores, la tipografía, el espaciado, los radios, las sombras y los breakpoints DEBEN definirse como tokens centralizados.
- **FR-005**: Los tokens DEBEN usar los nombres y valores de web-soft. Si web-soft no tiene tokens semánticos, DEBEN crearse (`color-background`, `color-surface`, `color-text-primary`, `color-primary`, `color-danger`…) con sus valores. Si un valor de web-soft no alcanza el contraste WCAG AA que exige FR-019, prevalece FR-019: se usa otro valor del propio sistema de web-soft que sí lo cumpla (ver Edge Cases).
- **FR-006**: Ningún componente DEBE usar valores fijos, para que la Spec 4 solo agregue un segundo set de valores.

**3. Iconografía**

- **FR-007**: El Backoffice DEBE usar la misma librería y los mismos iconos propios de web-soft, a través de un componente común.
- **FR-008**: DEBEN reemplazarse todos los iconos actuales.

**4. Componentes base**, con el aspecto y el comportamiento de web-soft:

- **FR-009**: Controles: botones, inputs, selects y checkboxes.
- **FR-010**: Datos: tablas, paginación, cards, badges y avatar con iniciales.
- **FR-011**: Mensajes: modales, toasts y alertas.
- **FR-012**: Estados: vacío, carga y error.

**5. Layout**

- **FR-013**: El layout DEBE ser como el de web-soft: una barra superior fija con el logo, el área de contenido y la navegación del Backoffice, y en móvil una barra de navegación inferior; sin sidebar.
- **FR-014**: El header DEBE reservar a la derecha el espacio del icono de perfil (Spec 5) y del selector de idioma (Spec 7).
- **FR-015**: Una etiqueta «Backoffice» junto al logo, con el estilo de píldora que web-soft usa para su etiqueta «Plataforma», DEBE distinguirlo de MailySoft.
- **FR-016**: El comportamiento responsive DEBE ser el mismo que en web-soft.

**6. Aplicación a las pantallas existentes**

- **FR-017**: El diseño DEBE aplicarse a todas las pantallas existentes, sin cambiar rutas, lógica ni llamadas a APIs.
- **FR-018**: El alcance DEBE incluir la pantalla previa al login, si el Backoffice tiene una propia (la tiene: ver Assumptions).

**7. Accesibilidad**

- **FR-019**: El Backoffice DEBE cumplir el contraste mínimo WCAG AA y tener foco visible y navegación con teclado.

**8. Textos**

- **FR-020**: NO DEBEN agregarse textos fijos nuevos dispersos por el código (Spec 7).

**9. Documentación en `docs/DESIGN.md`**

- **FR-021**: DEBE documentar los tokens, los componentes y los iconos, y cómo usarlos.
- **FR-022**: DEBE incluir la tabla de equivalencias con web-soft.
- **FR-023**: DEBE incluir una guía corta para migrar una pantalla al nuevo diseño, que usarán las Specs 1 y 2 al mergearse.
- **FR-024**: DEBE describir cómo resuelve web-soft el modo oscuro, el menú de perfil, el avatar y los idiomas, si los tiene, como insumo para las Specs 4 a 7.

### Key Entities *(include if feature involves data)*

- **Token de diseño**: valor con nombre de una de estas categorías: color, tipografía, espaciado, radio, sombra o breakpoint. Tiene un nombre (el de web-soft o, si web-soft no lo tiene, uno semántico nuevo), un valor y un papel (por ejemplo, fondo de página, texto principal, acción o peligro). Los componentes solo usan tokens.
- **Set de valores**: los valores de todos los tokens para una apariencia. Esta feature entrega uno, el de web-soft; la Spec 4 agrega un segundo sin cambiar los componentes.
- **Componente base**: pieza reutilizable con el aspecto y el comportamiento de web-soft (controles, datos, mensajes y estados) con la que se construyen todas las pantallas.
- **Icono**: pictograma de la librería de web-soft o propio de web-soft que se muestra a través del componente común, con tamaño y color tomados de los tokens.
- **Recurso de marca**: el logo, el favicon y la fuente, copiados de web-soft.
- **Equivalencia**: fila de la tabla que relaciona un archivo de web-soft con el archivo del Backoffice que lo copia o lo adapta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

SC-001 a SC-008 son los criterios de aceptación del original; SC-009 a SC-011 expresan como resultados medibles los requisitos 7, 1 y 8, sin agregar requisitos.

- **SC-001**: Lado a lado con MailySoft v2, estos cinco elementos usan los mismos colores, tipografía, iconos y estilo de componentes: el layout, una pantalla de listado, una de formulario, un modal y los mensajes (5 de 5).
- **SC-002**: Ningún componente usa colores, tamaños de fuente o espaciados fuera de los tokens (0 valores fijos).
- **SC-003**: Todos los iconos salen de la librería de web-soft, a través del componente común (0 iconos de otra librería).
- **SC-004**: Todas las pantallas existentes usan el nuevo layout y los componentes base (100 % de las pantallas listadas en Assumptions).
- **SC-005**: El header tiene el espacio reservado para el perfil y el idioma.
- **SC-006**: Las rutas y el comportamiento de todas las pantallas no cambian (100 % de las rutas existentes).
- **SC-007**: `docs/DESIGN.md` existe con las secciones pedidas (las de FR-021 a FR-024).
- **SC-008**: La aplicación compila, y el lint y las pruebas existentes pasan.
- **SC-009**: Las verificaciones automáticas de accesibilidad de las pantallas principales reportan 0 violaciones, y el 100 % de los textos, iconos informativos y bordes de campos medidos alcanzan el contraste WCAG AA.
- **SC-010**: Al terminar, el Backoffice usa una sola librería de UI.
- **SC-011**: 0 textos fijos nuevos dispersos por el código.

## Assumptions

- Contexto:
  - Backoffice: `C:\Maily\code\maily-backoffice`. Es el único repositorio que se modifica.
  - Rama: `008-design-system`, desde la rama principal (`main`, `eaed393`).
  - Referencia: MailySoft v2. Código: `C:\Maily\code\Maily360\MailySoft\web-soft`, solo lectura; es la fuente de verdad del diseño. App desplegada: https://maily360-production.up.railway.app; es producción: solo para observar, sin enviar formularios ni cambiar datos.
  - Esta spec es la base de las Specs 4 (modo oscuro y claro), 5 (icono de perfil), 6 (fotografía de usuarios) y 7 (inglés/español). No se implementan aquí, pero queda la estructura lista para ellas.
  - En paralelo, la Spec 1 (página «Sin acceso», `specs/006-system-role-access`) y la Spec 2 (administración de roles) agregan pantallas en otras ramas.
- Pantalla previa al login: el Backoffice tiene una propia, la de acceso (`/access`, también tras el cierre por inactividad), así que entra en el alcance (FR-018).
- Pantallas existentes en `main` (`eaed393`), que cubren FR-017 y SC-004: acceso, retorno del login, configuración inválida, acceso denegado, comprobación de acceso fallida, Panel, perfil, usuarios (listado, detalle, alta y edición), suscripciones (listado, detalle, alta y edición), herramienta de token y página no encontrada, además del layout, los diálogos de confirmación, las notificaciones y los estados de carga, vacío y error que comparten.
- Lo que trae web-soft (análisis del 2026-10-21; el detalle va al research del plan):
  - Tokens de color con nombres en español y la regla «el color marca estado, nunca categoría»: `marca`, `accion`, `tinta`, `cuerpo`, `suave`, `tenue`, `fondo`, `superficie`, `superficie-sutil`, `borde`, `borde-fuerte`, `exito`, `aviso`, `peligro` y sus variantes (`-hover`, `-tinte`, `-borde`, `-oscuro`, `-icono`). Sombras propias; espaciado, radios, tamaños de letra y breakpoints de la escala por defecto de su librería de estilos.
  - Tipografía Inter (400, 500, 600 y 700) con la fuente del sistema de respaldo; iconos de `lucide-react` y SVG propios de órganos; logo horizontal, isotipo (favicon) y logo vertical.
  - Layout sin sidebar: barra superior fija con el logo, la navegación (icono y etiqueta) y el menú de la persona a la derecha; por debajo de 768 px, una barra de navegación inferior; contenido centrado con un ancho máximo.
  - No tiene toasts, modo oscuro ni selector de idioma; sí tiene menú de perfil y avatar con foto o iniciales.
  - web-soft está migrando vista por vista a su sistema de tokens: su área de plataforma, la más parecida al Backoffice, todavía usa los colores anteriores. La referencia de esta feature son los tokens de las pantallas ya migradas al sistema de diseño v2, no el aspecto actual del área de plataforma.
- Fuera de alcance:
  - Modo oscuro, menú de perfil, fotografías e idiomas (Specs 4 a 7), aunque web-soft ya los tenga.
  - Las pantallas de las Specs 1 y 2: se adaptan al mergear, con la guía.
  - Cambios en web-soft y una librería de UI compartida entre ambos proyectos.
  - La página de login de Auth0 (Universal Login).
- Indicaciones de la persona solicitante para el plan y la implementación (restricciones de trabajo, no requisitos de comportamiento):
  - Solo cambia la presentación: no se tocan la lógica de negocio, la autenticación, las rutas ni las llamadas a APIs.
  - El plan propone qué se reutiliza tal cual y qué se adapta, la lista de tokens y de componentes base, las dependencias que habría que agregar o quitar y las etapas (tokens → iconos → componentes base → layout → pantallas), y espera aprobación antes de editar código.
  - Al cerrar cada etapa: levantar la app y compararla con la referencia con capturas de ambas, verificar que el build, el lint y las pruebas pasan, mostrar el resultado y esperar aprobación antes de seguir.
  - No se agregan ni quitan dependencias sin aprobación. No se inventan valores de diseño: si algo no está en la referencia, se consulta.
  - No se inicia sesión en ninguna aplicación: para ver pantallas internas (del Backoffice o de MailySoft), la persona solicitante inicia sesión o entrega capturas.
  - Al terminar se entregan los cambios realizados, la lista de pantallas migradas, capturas de antes y después, lo que quedó pendiente y lo que deben tener en cuenta las Specs 1, 2, 4, 5, 6 y 7.
- Restricciones conocidas para el plan:
  - Constitución 1.3.0: la UI DEBE construirse con MUI y MUI X Data Grid con un theme centralizado, sin otras librerías de componentes ni CSS global ad hoc (principio VI y «Stack obligatorio»); los identificadores van en inglés (principio I), mientras FR-005 pide los nombres de web-soft, en español; solo se admiten dependencias con licencias MIT, Apache-2.0, BSD o ISC, y la fuente Inter tiene licencia OFL-1.1; las ramas siguen la convención `NNN-nombre` (esta es `008-design-system`). Las desviaciones permanentes exigen enmienda.
  - La Content Security Policy documentada en el README (`default-src 'self'`) bloquea fuentes servidas por terceros.
  - Presupuesto de JS inicial: 300 KB gzip en la ruta de entrada (hoy, 277,4 KB).
  - Hay pruebas que dependen de clases internas de MUI y una prueba de extremo a extremo que exige ver «Perfil» y «Cerrar sesión» en el header a 1024 y a 320 px: el plan debe decir cómo se conservan sin cambiar el comportamiento que verifican.
  - Línea base en `main` (`eaed393`, 2026-10-21): el build, el presupuesto de bundle, el lint, el formato y las 2685 pruebas pasan.
