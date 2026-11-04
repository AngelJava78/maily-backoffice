# Feature Specification: Lista de usuarios con filtros de Tipo y Estatus

**Feature Branch**: `026-users-type-status-filters`

**Created**: 2026-11-02

**Status**: Implementada (2026-11-03; requiere la API de usuarios 5.5.0, spec 018 de mailySoft-usuarios)

**Input**: User description: "Agrega la spec 026 para los usuarios. Con botones «Toggle Button» como los de la pantalla de Módulos. Tipo: Todos | Sistema | Clínica. Estatus: Activos | Bloqueados." Con el catálogo de estatus de usuarios: 1 Activo, 2 Bloqueado, 3 Eliminado.

## Contexto

La pantalla «Usuarios» muestra hoy una tabla paginada (10, 25 o 50 por página) con **solo los usuarios activos** (nombre, correo y fecha de alta), un botón «Crear usuario» y un buscador por correo que encuentra a un usuario de cualquier estatus. Desde el detalle de un usuario ya se puede editarlo, asignarle y quitarle roles, bloquearlo, desbloquearlo, eliminarlo (de forma lógica) y reactivar a uno eliminado; esas acciones no cambian. Los usuarios bloqueados no se pueden listar: solo se llega a ellos si se conoce su correo.

Las pantallas de Módulos y de Roles (feature 025) filtran con dos grupos de botones de alternancia: «Tipo» (Todos | Sistema | Clínica) y «Estatus» (Activos | Bloqueados). Esta feature lleva ese mismo patrón a Usuarios.

Un usuario tiene su propio **estatus** (Activo, Bloqueado o Eliminado), pero no tiene un «tipo» propio: lo tienen sus **roles** (Sistema o Clínica), y cada rol tiene a su vez su propio estatus. Por eso el tipo de un usuario es el de sus **roles Activos**. Al asignar roles no se permite combinar los dos tipos, aunque solo se comparan los roles Activos, así que una persona puede acabar con roles Activos de ambos tipos (por ejemplo, al desbloquear un rol).

Qué hace hoy la API de usuarios, comprobado en su código el 2026-11-02: la lista de usuarios admite solo la página y su tamaño, y devuelve únicamente a los usuarios **activos**; no permite pedir a los bloqueados ni filtrar por tipo, y los usuarios que devuelve no traen su tipo ni sus roles (los roles se piden usuario por usuario). La ampliación que lo resuelve es la versión 5.5.0 de la API de usuarios (su spec 018), **implementada el 2026-11-03**: la lista ya puede pedir a los activos o a los bloqueados, filtrar por tipo y traer el tipo de cada usuario (véase Clarifications y Assumptions).

## Clarifications

### Session 2026-11-03

- Q: ¿Qué es el «Tipo» de un usuario? → A: Los tipos de sus roles con estatus Activo (Sistema o Clínica); un rol Bloqueado o Eliminado no cuenta aunque siga asignado. Con roles Activos de ambos tipos aparece al filtrar por Sistema y por Clínica y se muestra «Sistema y Clínica»; sin roles Activos se muestra «—» y solo aparece con «Todos». Es la misma regla que la spec 018 de la API de usuarios.
- Q: ¿Qué estatus filtra el grupo «Estatus»? → A: El estatus propio del usuario (1 Activo, 2 Bloqueado; los 3 Eliminado nunca se listan), independiente del estatus de sus roles.
- Q: ¿Se cambia antes la API de usuarios y cuándo se planea esta feature? → A: La feature consumirá la lista de usuarios de la API 5.5.0 (spec 018 de mailySoft-usuarios: filtro de estatus, filtro de tipo y el tipo de cada usuario en la propia lista), hoy planeada pero sin implementar. Se espera a que esa API esté implementada antes de planear esta feature, sin buscar mientras tanto un rodeo en el Backoffice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filtrar los usuarios por Tipo con botones (Priority: P1)

Una persona con acceso a «Usuarios» ve, encima de la tabla, el grupo de botones «Tipo» con las opciones Todos, Sistema y Clínica. Al abrir la pantalla está en «Todos» y la tabla muestra a los usuarios activos de ambos tipos; al pulsar Sistema o Clínica, muestra solo a los que tienen al menos un rol Activo de ese tipo. Cada fila indica el tipo del usuario.

**Why this priority**: Es la mitad de lo pedido y lo que hoy falta: quien administra el sistema no puede separar al personal de Maily del de las clínicas.

**Independent Test**: Con usuarios de ambos tipos, abrir la pantalla y comprobar que aparece «Todos» pulsado con todos los usuarios activos y una columna de tipo; pulsar Sistema y luego Clínica y comprobar que cada tabla muestra solo a los usuarios de ese tipo.

**Acceptance Scenarios**:

1. **Given** una persona que abre «Usuarios» sin ningún filtro elegido, **When** se carga la pantalla, **Then** ve los grupos «Tipo» y «Estatus», con «Todos» y «Activos» pulsados, y la tabla muestra a los usuarios activos de ambos tipos.
2. **Given** la tabla con «Todos» pulsado, **When** la persona pulsa «Sistema», **Then** solo quedan los usuarios activos con al menos un rol Activo de Sistema, el total y las páginas se recalculan, y «Sistema» se ve pulsado en lugar de «Todos».
3. **Given** la tabla filtrada por un tipo, **When** la persona pulsa «Todos», **Then** vuelven a verse los usuarios de ambos tipos.
4. **Given** la tabla, **When** se muestra cada fila, **Then** indica el tipo del usuario (Sistema o Clínica) junto a su nombre, su correo y su fecha de alta.
5. **Given** un usuario que no tiene ningún rol Activo (no tiene roles, o solo tiene roles Bloqueados o Eliminados), **When** se muestra la tabla con «Todos», **Then** aparece con el tipo vacío («—»), y no aparece al filtrar por Sistema ni por Clínica.
6. **Given** que no hay usuarios de un tipo, **When** la persona filtra por él, **Then** en lugar de la tabla aparece el mensaje de que no hay usuarios de ese tipo, y los filtros siguen disponibles.

---

### User Story 2 - Filtrar los usuarios por Estatus y ver los bloqueados (Priority: P1)

La persona pulsa «Bloqueados» en el grupo «Estatus» para ver a los usuarios bloqueados y «Activos» para volver a los activos. Los dos filtros se combinan: por ejemplo, los usuarios bloqueados de Clínica. Desde la lista se llega al detalle de un usuario bloqueado, donde ya se puede desbloquear.

**Why this priority**: Es la otra mitad de lo pedido. Hoy no hay forma de saber qué usuarios están bloqueados, ni de llegar a ellos sin conocer su correo.

**Independent Test**: Con al menos un usuario bloqueado, pulsar «Bloqueados» y comprobar que aparece solo él y que no aparece ningún usuario activo; combinarlo con cada opción de Tipo; abrir su detalle y desbloquearlo, y comprobar que al volver ya no está en «Bloqueados» y sí en «Activos».

**Acceptance Scenarios**:

1. **Given** la tabla de usuarios activos, **When** la persona pulsa «Bloqueados», **Then** la tabla muestra únicamente a los usuarios bloqueados (del tipo que indique el filtro Tipo), con su propio total y sus páginas, y «Bloqueados» se ve pulsado en lugar de «Activos».
2. **Given** «Bloqueados» pulsado, **When** la persona cambia el filtro Tipo, **Then** la tabla combina ambos filtros: cada fila cumple el tipo y el estatus elegidos.
3. **Given** la tabla de bloqueados, **When** se muestra cada fila, **Then** indica que el usuario está bloqueado, y su nombre es un enlace a su detalle, como en la tabla de activos.
4. **Given** el detalle de un usuario bloqueado abierto desde la tabla, **When** la persona lo desbloquea y vuelve a la lista, **Then** la lista conserva los mismos filtros y el usuario ya no aparece en «Bloqueados» (aparece en «Activos»).
5. **Given** «Bloqueados» pulsado y ningún usuario bloqueado que cumpla los filtros, **When** se muestra la tabla, **Then** aparece el mensaje de que no hay usuarios bloqueados, sin el botón «Crear usuario» como invitación, y los filtros siguen disponibles.
6. **Given** que falla la carga de los usuarios de un estatus, **When** se muestra la pantalla, **Then** en lugar de la tabla aparece un error con la opción de reintentar, sin ocultar los filtros, el buscador ni el título.

---

### User Story 3 - Que los filtros, la paginación y el buscador sean coherentes (Priority: P2)

El estado de los filtros, la página y el tamaño de página viven en la dirección de la pantalla, de modo que se puede compartir, recargar y volver atrás, y el buscador por correo sigue funcionando como hoy.

**Why this priority**: Sin esto la pantalla funciona pero sorprende: se pierden los filtros al recargar o al volver desde el detalle, se queda uno en una página que ya no existe al filtrar, o el buscador deja de encontrar usuarios bloqueados.

**Independent Test**: Elegir filtros, página y tamaño, abrir un usuario y volver, y recargar: todo debe seguir igual; cambiar un filtro estando en la página 3; buscar por correo a un usuario bloqueado con el filtro en «Activos».

**Acceptance Scenarios**:

1. **Given** filtros, página y tamaño de página elegidos, **When** la persona recarga o vuelve desde el detalle de un usuario, **Then** los mismos filtros, la misma página y el mismo tamaño siguen elegidos.
2. **Given** una persona en una página posterior a la primera, **When** cambia cualquiera de los dos filtros, **Then** la tabla vuelve a la primera página.
3. **Given** un enlace guardado antes de esta feature con solo la página y el tamaño, **When** se abre, **Then** la pantalla muestra a los usuarios activos de ambos tipos en esa página y con ese tamaño.
4. **Given** una dirección con un valor de filtro no válido, **When** se abre, **Then** la pantalla abre con el filtro en su valor por omisión, sin mostrar un error.
5. **Given** cualquier combinación de filtros, **When** la persona busca un correo, **Then** el buscador encuentra a ese usuario con cualquier estatus y de cualquier tipo, sin que los filtros lo oculten, como hoy.
6. **Given** una búsqueda por correo en curso, **When** la persona la limpia, **Then** vuelve a la tabla con los filtros que tenía.
7. **Given** una página que deja de existir porque el último usuario de la última página cambió de estatus, **When** se muestra la tabla, **Then** se corrige sola a la última página que existe, como hoy.
8. **Given** que la persona puede crear usuarios, **When** ve la pantalla, **Then** el botón «Crear usuario» sigue disponible con cualquier combinación de filtros.

---

### User Story 4 - Usar los filtros con teclado, lector de pantalla y en pantallas angostas (Priority: P3)

Cualquier persona, sin importar cómo interactúe con la pantalla, puede cambiar los filtros de Tipo y Estatus y recorrer la tabla resultante.

**Why this priority**: Es un requisito de calidad transversal del Backoffice, no un flujo nuevo; las historias anteriores ya entregan el valor central.

**Independent Test**: Cambiar ambos filtros solo con el teclado y con un lector de pantalla; reducir el ancho de la ventana hasta el mínimo admitido.

**Acceptance Scenarios**:

1. **Given** el foco antes de los filtros, **When** la persona navega con el teclado, **Then** puede entrar a cada grupo con Tab, moverse entre sus botones con las flechas y elegir uno con Espacio o Enter, con el foco siempre visible.
2. **Given** un lector de pantalla, **When** se recorre un grupo de filtros, **Then** anuncia su nombre («Tipo», «Estatus») y, en cada botón, su texto y si está pulsado.
3. **Given** un lector de pantalla y un cambio de filtro, **When** la tabla se actualiza, **Then** se anuncia sin mover el foco cuántos usuarios se muestran, como ya se anuncia al cambiar de página.
4. **Given** una ventana angosta, **When** se muestran los filtros, el buscador y la tabla, **Then** los filtros se reacomodan en varias líneas, sin desplazamiento horizontal de la página y sin texto cortado.

---

### Edge Cases

- Siempre hay exactamente un botón pulsado en cada grupo: pulsar el que ya está pulsado no lo despulsa ni deja el filtro vacío (igual que en Módulos).
- Los usuarios eliminados nunca aparecen en la tabla ni en sus totales; no hay un filtro «Eliminados». Para reactivar a uno eliminado se sigue buscando su correo, como hoy.
- Si una persona tiene roles Activos de los dos tipos (la asignación lo impide, pero solo compara los roles Activos, así que puede ocurrir al desbloquear un rol), aparece al filtrar por Sistema y también al filtrar por Clínica, y su tipo se muestra como «Sistema y Clínica».
- El tipo de un usuario cuenta solo sus roles Activos: los roles Bloqueados y los Eliminados no cuentan, aunque sigan asignados. Un usuario sin ningún rol Activo se comporta como un usuario sin roles. Si un rol se bloquea o se desbloquea, el tipo de sus usuarios cambia en la siguiente carga de la lista.
- El estatus del usuario y el de sus roles son independientes: el filtro «Estatus» mira solo el del usuario, y el tipo de un usuario Bloqueado se calcula igual que el de uno Activo, con sus roles Activos.
- El resultado de la búsqueda por correo sigue como hoy (nombre, estatus, correo, fecha de alta y enlace al detalle) y no muestra el tipo.
- Un usuario recién creado aparece en la tabla de activos según su tipo; si el filtro actual no lo incluye, no se mueve el filtro: la persona ve el detalle del nuevo usuario, como hoy al crearlo.
- Un usuario bloqueado desde su detalle sale de la tabla de activos y entra en la de bloqueados cuando la persona vuelve a la lista, con los mismos filtros.
- Con muchos usuarios la tabla sigue paginada; los filtros no cargan todos los usuarios de golpe.
- Una persona sin permiso para crear, editar, bloquear o eliminar usuarios ve los mismos filtros y la misma tabla; solo están ausentes o deshabilitadas las acciones que ya lo estaban.
- Los dos grupos son visibles a la vez: no hay un grupo que dependa del otro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pantalla «Usuarios» DEBE mostrar, encima de la tabla y junto al buscador por correo, un grupo de botones de alternancia llamado «Tipo» con las opciones Todos, Sistema y Clínica, en ese orden.
- **FR-002**: La pantalla DEBE mostrar un segundo grupo de botones de alternancia llamado «Estatus» con las opciones Activos y Bloqueados, en ese orden, junto al de Tipo. El filtro DEBE usar el estatus propio del usuario (Activo o Bloqueado), no el de sus roles.
- **FR-003**: Cada grupo DEBE ser de selección única y tener siempre una opción pulsada; volver a pulsar la opción ya pulsada NO DEBE dejar el grupo sin selección.
- **FR-004**: Al abrir la pantalla sin ningún filtro elegido, DEBEN estar pulsados «Todos» y «Activos».
- **FR-005**: Los filtros DEBEN aplicarse de inmediato, sin botón de confirmación, y combinarse: la tabla DEBE mostrar exactamente los usuarios que cumplen el tipo y el estatus elegidos, ni más ni menos, y su total y sus páginas DEBEN calcularse solo con esos usuarios.
- **FR-006**: La tabla DEBE mostrar una columna de tipo con el tipo de cada usuario (Sistema, Clínica o «Sistema y Clínica» si tiene roles Activos de ambos; vacío con «—» si no tiene ningún rol Activo). Con «Bloqueados» pulsado, cada fila DEBE indicar también que el usuario está bloqueado.
- **FR-007**: El tipo de un usuario DEBE ser el de sus roles con estatus Activo; los roles Bloqueados y Eliminados no cuentan aunque sigan asignados. Un usuario cumple un tipo si tiene al menos un rol Activo de ese tipo, y con roles Activos de ambos tipos cumple los dos. La regla DEBE ser la misma para usuarios Activos y Bloqueados, y DEBE coincidir con la que aplica la API de usuarios (el Backoffice muestra el tipo que ella informa, no lo calcula por su cuenta).
- **FR-008**: Cambiar cualquiera de los dos filtros DEBE llevar la tabla a su primera página y conservar el tamaño de página elegido.
- **FR-009**: El estado de los filtros, la página y el tamaño de página DEBEN conservarse en la dirección de la pantalla, de modo que recargar, compartir el enlace, volver atrás y volver desde el detalle de un usuario los restablezcan. Un valor no válido en la dirección DEBE sustituirse por el valor por omisión, sin error.
- **FR-010**: Los enlaces anteriores a esta feature, que solo traían la página y el tamaño, DEBEN seguir abriendo esa página con «Todos» y «Activos».
- **FR-011**: El buscador por correo DEBE seguir encontrando a un usuario de cualquier estatus y de cualquier tipo, sin que los filtros lo oculten. Mientras haya una búsqueda, los filtros DEBEN conservar su valor en la dirección, de modo que al limpiar la búsqueda se vuelva a la tabla con los mismos filtros.
- **FR-012**: El nombre de cada usuario de la tabla DEBE seguir siendo un enlace a su detalle, también en la tabla de bloqueados; al volver desde el detalle, la lista DEBE reflejar los cambios de estatus hechos allí.
- **FR-013**: Los estados de cargando, vacío y error con reintento DEBEN aplicarse a la zona de la tabla y no ocultar los filtros, el buscador ni el título. Los mensajes de vacío DEBEN distinguir el caso: no hay usuarios activos, no hay usuarios de un tipo y no hay usuarios bloqueados.
- **FR-014**: Al cambiar un filtro o la página, la zona de la tabla DEBE anunciar a las tecnologías de apoyo, sin mover el foco, qué usuarios se muestran, como ya hace al cambiar de página.
- **FR-015**: Los botones de ambos grupos DEBEN tener la misma forma de grupo segmentado, el mismo tamaño, la misma tipografía y el mismo aspecto de estado pulsado que los grupos de «Tipo» y «Estatus» de la pantalla de Módulos, con la etiqueta del grupo sobre cada uno.
- **FR-016**: Cada grupo DEBE tener un nombre accesible («Tipo», «Estatus»); cada botón DEBE exponer a las tecnologías de apoyo si está pulsado; y los grupos DEBEN poder operarse con el teclado, entrando con Tab y moviéndose entre sus botones con las flechas, con el foco siempre visible.
- **FR-017**: En anchos de pantalla pequeños, los filtros, el buscador y los botones de la pantalla DEBEN reacomodarse en varias líneas, sin desplazamiento horizontal de la página y sin texto cortado.
- **FR-018**: Esta feature NO DEBE cambiar el detalle de un usuario ni sus acciones (editar, asignar y quitar roles, bloquear, desbloquear, eliminar y reactivar), la creación de usuarios, el buscador por correo (salvo FR-011), los permisos necesarios para ver o usar esta sección ni las protecciones sobre el propio usuario de quien opera, y NO DEBE añadir un buscador por nombre.

### Key Entities

- **Usuario**: Una persona registrada en la plataforma, con nombre, correo, fecha de alta y un **estatus** propio (1 Activo, 2 Bloqueado o 3 Eliminado). Su **tipo** (Sistema o Clínica) no es un dato suyo, sino el de sus roles con estatus Activo; puede tener uno, los dos o ninguno.
- **Rol**: Agrupa permisos; tiene un tipo (Sistema o Clínica) y un estatus propio (Activo, Bloqueado o Eliminado), independiente del de los usuarios que lo tienen asignado.
- **Filtros de la lista**: El par «Tipo» (Todos, Sistema o Clínica) y «Estatus» (Activos o Bloqueados) que decide qué usuarios aparecen en la tabla, junto con la página y el tamaño de página. Siempre tiene un valor en cada grupo y vive en la dirección de la pantalla.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde que se abre la pantalla, una persona llega a cualquiera de las seis combinaciones de Tipo y Estatus con a lo sumo dos pulsaciones (una por grupo), y la tabla que ve contiene en el 100 % de los casos exactamente los usuarios que cumplen la combinación, con un total que coincide con el número de usuarios que cumplen.
- **SC-002**: Al abrir la pantalla por primera vez, la persona ve a los usuarios activos de ambos tipos sin pulsar nada (100 % de las aperturas sin filtros en la dirección).
- **SC-003**: Una persona localiza a los usuarios bloqueados de un tipo en a lo sumo dos pulsaciones y sin conocer ningún correo; antes de esta feature solo podía hacerlo con el correo exacto de cada uno.
- **SC-004**: El 100 % de los enlaces anteriores a esta feature (solo página y tamaño) abren la misma página de usuarios activos.
- **SC-005**: Tras recargar o volver desde el detalle de un usuario, el 100 % de las veces la lista conserva los mismos filtros, página y tamaño de página.
- **SC-006**: La búsqueda por correo encuentra al usuario en el 100 % de los casos, con cualquier combinación de filtros elegida.
- **SC-007**: Un usuario bloqueado o desbloqueado desde su detalle queda, al volver a la lista, en la tabla de su nuevo estatus y fuera de la del anterior en el 100 % de los casos.
- **SC-008**: Los dos grupos de filtros se operan con teclado en el 100 % de sus botones, y las verificaciones automáticas de accesibilidad de la pantalla no reportan violaciones.
- **SC-009**: En una revisión visual, los grupos «Tipo» y «Estatus» de Usuarios son indistinguibles en forma, tamaño, tipografía y estado pulsado de los de Módulos y de Roles.
- **SC-010**: Cambiar de filtro actualiza la tabla en menos de 2 segundos con una conexión normal para listas de hasta 1 000 usuarios.

## Assumptions

- **Tipo de un usuario** es el tipo de sus roles Activos (Sistema o Clínica), porque un usuario no tiene tipo propio; confirmado por el usuario el 2026-11-03 (véase Clarifications).
- **Esta feature depende de la versión 5.5.0 de la API de usuarios** (spec 018 de mailySoft-usuarios, «Filtros de Estatus y Tipo en la Lista de Usuarios»), que añade a la lista de usuarios: (1) el filtro de estatus, Activos (por omisión) o Bloqueados, con su total y su paginación; (2) el filtro por el tipo de los roles Activos del usuario; y (3) el tipo de cada usuario en la propia lista, también de los bloqueados. Sin los parámetros nuevos responde como hoy, así que es compatible con el Backoffice actual. Sin ella no habría forma razonable de hacerlo en el Backoffice: los bloqueados no se podrían listar y el tipo obligaría a pedir los roles usuario por usuario en cada página (y la API no da los roles de un usuario bloqueado). Por decisión del usuario, esta feature esperó a que la API 5.5.0 estuviera implementada, lo que ocurrió el 2026-11-03; el plan toma como contrato el de la API ya construida. Para usar la feature, el entorno debe tener desplegada la API 5.5.0 o posterior.
- Los valores iniciales «Todos» y «Activos» son los de Módulos y Roles, para que las tres pantallas se comporten igual.
- La tabla sigue paginada con el servidor (10, 25 o 50 por página, 10 por omisión); no se trae la lista completa para filtrar en el navegador.
- El filtro de Estatus solo ofrece Activos y Bloqueados. Los usuarios eliminados nunca se muestran, como en Módulos y en Roles, y se llega a ellos por el buscador de correo, como hoy.
- Las acciones de estatus de un usuario (bloquear, desbloquear, eliminar, reactivar) ya existen en su detalle y no cambian; esta feature no agrega acciones sobre las filas de la tabla.
- Las tres pantallas (Módulos, Roles y Usuarios) repiten el mismo par de grupos de filtros, pero cada una conserva su propia lógica; esta feature no obliga a compartir componentes con ellas.
- Es independiente de las features 024 (módulos y submódulos en árbol) y 025 (filtros y bloqueo de roles): trabaja sobre Usuarios y no comparte código con ellas, aunque la 025 y esta feature deberían verse y comportarse igual.
