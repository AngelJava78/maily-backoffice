# Feature Specification: Lista de roles y permisos en tabla, como la de Usuarios

**Feature Branch**: `027-roles-grid-list`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Quiero que los Roles y permisos se vean en forma de lista como los usuarios. Toma como referencia la imagen adjunta (solo el grid)." La imagen es la tabla de la pantalla «Usuarios»: las columnas Nombre (cada nombre, un enlace), Correo electrónico y Fecha de alta, y un pie con «Filas por página: 10», el rango «1–4 de 4» y las flechas de página anterior y siguiente. Solo se toma como referencia esa tabla, no el resto de la pantalla de Usuarios.

## Contexto

**«Roles y permisos» hoy** (features 014, 023 y 025). Bajo el título están los grupos de filtros «Tipo» y «Estatus». Debajo, la pantalla se parte en dos: a la izquierda (en pantallas anchas) una lista estrecha de roles, con el botón «Nuevo role» encima y, por cada role, su nombre y, en una segunda línea, su tipo, su descripción y su número de permisos; a la derecha, el detalle del role que se elige —su nombre, descripción y tipo, las acciones de guardar, descartar, duplicar, eliminar y bloquear, y la lista de permisos con botones de alternancia— o, si no se ha elegido ninguno, el mensaje «Elige un role para ver y cambiar lo que puede hacer en cada módulo.». Elegir un role no cambia de pantalla: solo cambia la parte derecha. Todos los roles se ven a la vez, sin páginas.

**«Usuarios», la referencia.** Una tabla a todo lo ancho: un encabezado con los nombres de las columnas, una fila por usuario separada de la siguiente por una línea fina, el nombre como enlace subrayado que lleva a una pantalla de detalle propia, la fecha con día, mes abreviado, año y hora («1 nov 2026, 10:19») y, abajo a la derecha, el pie de paginación: «Filas por página» (10, 25 o 50), el rango «1–4 de 4» y las flechas de página anterior y siguiente. Al volver del detalle, la tabla conserva la página y el tamaño de página que tenía.

**Qué cambia.** La lista de roles pasa a ser esa misma tabla, y el detalle de un role, que hoy ocupa la mitad derecha, pasa a ser una pantalla propia a la que se llega con el nombre del role y de la que se vuelve a la misma tabla. Lo que la imagen no muestra no cambia: el título, los grupos de filtros «Tipo» y «Estatus» y el botón «Nuevo role» se quedan, y de «Usuarios» no se copia nada más (por ejemplo, el buscador por correo no tiene equivalente para roles).

**Qué da hoy la API de roles**, comprobado en su contrato, en su código y en el cliente del Backoffice el 2026-11-03: la lista devuelve **todos** los roles de un estatus —activos o bloqueados; pedir los eliminados se rechaza— en una sola respuesta, **sin paginación** y ordenados por nombre, y cada role trae su nombre, su descripción, su tipo, su estatus y su fecha de alta. El número de permisos de un role activo se pide role por role; de un role bloqueado la API no entrega ni el detalle ni los permisos (responde «no encontrado»).

## Clarifications

### Session 2026-11-03

- Q: ¿Qué columnas debe tener la tabla de roles? → A: Nombre, Estatus, Tipo y el total de permisos escrito «n permisos», en ese orden, según indicó la persona que pidió la feature al iniciar la aclaración. Como esa lista no las incluye, Descripción y Fecha de alta dejan de ser columnas; la descripción sigue en el detalle del role.
- Q: ¿Qué estatus de role debe poder mostrar la tabla? → A: Solo Activo o Bloqueado, uno a la vez según el filtro «Estatus» que ya existe (Activos | Bloqueados); la columna dice el estatus de cada fila y «Eliminado» nunca aparece, porque los roles eliminados no se listan. No hace falta cambiar la API.
- Q: ¿Dónde debe abrirse el detalle de un role cuando se pulsa su nombre en la tabla? → A: En una pantalla propia, como el detalle de un usuario: la tabla ocupa todo el ancho y «Volver al listado» regresa a la misma tabla.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los roles en una tabla como la de Usuarios (Priority: P1)

Una persona con acceso a «Roles y permisos» ve los roles en una tabla a todo lo ancho, con el mismo aspecto y el mismo pie de paginación que la tabla de Usuarios, en lugar de la lista estrecha de la izquierda. Los filtros «Tipo» y «Estatus» siguen encima y gobiernan lo que muestra la tabla.

**Why this priority**: Es lo pedido: que Roles se vea como Usuarios. Sin la tabla no hay feature; el resto de las historias (detalle propio, altas, enlaces) solo tienen sentido sobre ella.

**Independent Test**: Con más de 10 roles activos de ambos tipos y al menos uno bloqueado, abrir la pantalla y comprobar que aparecen los filtros con «Todos» y «Activos» pulsados y una tabla con las columnas Nombre, Estatus, Tipo y Permisos y el pie «Filas por página»; comparar su aspecto con el de la tabla de Usuarios; pasar de página, cambiar las filas por página y cambiar cada filtro.

**Acceptance Scenarios**:

1. **Given** una persona que abre «Roles y permisos» sin ningún filtro elegido, **When** se carga la pantalla, **Then** ve el título, los grupos «Tipo» y «Estatus» con «Todos» y «Activos» pulsados y, debajo, una tabla a todo lo ancho con los roles activos de ambos tipos; ya no aparecen la lista estrecha de la izquierda, el panel de la derecha ni el mensaje «Elige un role…».
2. **Given** la tabla, **When** se muestra cada fila, **Then** indica, en las columnas Nombre, Estatus, Tipo y Permisos y en ese orden, el nombre del role (como enlace), su estatus («Activo» con «Activos» pulsado y «Bloqueado» con «Bloqueados»), su tipo (Sistema o Clínica) y su total de permisos escrito «n permisos» (por ejemplo, «12 permisos» o «1 permiso»).
3. **Given** más roles que filas por página, **When** la persona usa las flechas del pie, **Then** pasa a la página siguiente o a la anterior, el rango del pie (por ejemplo «11–15 de 15») se actualiza y la tabla nunca muestra más filas que las elegidas.
4. **Given** la tabla, **When** la persona cambia «Filas por página» (10, 25 o 50), **Then** la tabla vuelve a la primera página con ese número de filas; por omisión son 10.
5. **Given** la tabla de Roles y la de Usuarios, **When** se comparan una al lado de la otra, **Then** se ven iguales en encabezado, separadores de fila, enlace del nombre y pie, en los temas claro y oscuro; solo cambia el contenido de las columnas.
6. **Given** la tabla, **When** la persona mira el encabezado de las columnas, **Then** no ofrece ordenar, filtrar ni abrir un menú de columna, y la pantalla no tiene buscador de texto, como la tabla de Usuarios.
7. **Given** la tabla con «Todos» pulsado, **When** la persona pulsa «Sistema», «Clínica» o «Bloqueados», **Then** la tabla muestra exactamente los roles que cumplen los dos filtros, con su propio total y sus páginas, y vuelve a la primera página.
8. **Given** «Bloqueados» pulsado, **When** se muestra la tabla, **Then** cada fila dice «Bloqueado» en la columna Estatus y «—» en la columna Permisos, porque los permisos de un role bloqueado no están disponibles, y el nombre de cada role sigue siendo un enlace.
9. **Given** una combinación de filtros sin ningún role, **When** se muestra la tabla, **Then** en su lugar aparece el mensaje de vacío de ese caso («Todavía no hay roles…», «…de Clínica», «…de Sistema» o «No hay roles bloqueados.»), con el botón «Nuevo role» a la vista si la persona puede crear roles y el estatus es «Activos», y los filtros siguen disponibles.
10. **Given** que los roles se están cargando, **When** se muestra la pantalla, **Then** la zona de la tabla indica que está cargando, sin ocultar el título ni los filtros.
11. **Given** que falla la carga de los roles, **When** se muestra la pantalla, **Then** en lugar de la tabla aparece un error con la opción de reintentar, sin ocultar el título, los filtros ni «Nuevo role».
12. **Given** un role cuyo número de permisos todavía no se conoce o no se pudo obtener, **When** se muestra su fila, **Then** esa celda muestra «—» y el resto de la fila y de la tabla se ve y se usa con normalidad.

---

### User Story 2 - Abrir un role desde la tabla y volver a la misma lista (Priority: P1)

La persona pulsa el nombre de un role y se abre su detalle en una pantalla propia, igual que al pulsar el nombre de un usuario. Ahí está todo lo que hoy ofrece el panel de la derecha: sus datos, sus permisos con botones y sus acciones. Desde esa pantalla vuelve a la tabla tal como la dejó.

**Why this priority**: Con la tabla a todo lo ancho ya no cabe el panel de la derecha; sin una pantalla de detalle nadie podría ver ni cambiar los permisos de un role, que es el propósito de la sección. Va con la tabla porque una sin la otra deja la sección inutilizable.

**Independent Test**: Desde la tabla, abrir un role activo con el ratón y con el teclado, cambiar un permiso y guardarlo, volver a la tabla y comprobar que conserva filtros, página y tamaño de página; abrir un role bloqueado desde «Bloqueados»; abrir la dirección de un role que no existe.

**Acceptance Scenarios**:

1. **Given** la tabla de roles activos, **When** la persona pulsa el nombre de uno (con el ratón o con el teclado), **Then** se abre una pantalla con el detalle de ese role, con su nombre como título, que no comparte el espacio con la tabla.
2. **Given** el detalle de un role activo, **When** se muestra, **Then** contiene lo mismo que hoy muestra el panel de la derecha —nombre y descripción, tipo, el recuento «X de Y permisos», las acciones Guardar cambios, Descartar cambios, Duplicar, Eliminar role y Bloquear role (según lo que la persona puede hacer) y la lista de permisos por módulo y acción con botones— y funciona exactamente como en las features 023 y 025.
3. **Given** el detalle de un role, **When** la persona pulsa «Volver al listado» o usa el botón Atrás del navegador, **Then** vuelve a la tabla con los mismos filtros, la misma página y el mismo tamaño de página que tenía al salir.
4. **Given** una persona sin permiso para editar roles, **When** abre el detalle de un role, **Then** lo ve con sus campos y sus botones de permisos sin poder cambiarlos y sin las acciones que no le corresponden, como hoy en el panel.
5. **Given** la tabla de roles bloqueados, **When** la persona pulsa el nombre de uno, **Then** se abre su detalle con lo mismo que hoy muestra el panel de un role bloqueado: nombre, descripción, tipo, que está bloqueado y la explicación de que mientras lo esté no se pueden ver ni cambiar sus permisos ni eliminarlo, con «Desbloquear role» para quien puede editar roles; sin lista de permisos, sin guardar, descartar, duplicar ni eliminar, y sin error de carga.
6. **Given** la dirección del detalle de un role que no existe o que ya fue eliminado, **When** se abre, **Then** aparece el aviso «Este role ya no existe» con la forma de volver al listado, no un error ni una pantalla en blanco.

---

### User Story 3 - Crear, duplicar, bloquear, desbloquear y eliminar en el nuevo recorrido (Priority: P2)

Las acciones que hoy ocurren dentro de la misma pantalla (dejar elegido el role nuevo, cerrar el panel) pasan a ocurrir entre dos pantallas: «Nuevo role» está en la tabla; crear o duplicar lleva al detalle del role nuevo; bloquear, desbloquear y eliminar devuelven a la tabla.

**Why this priority**: La tabla y el detalle ya entregan el valor central; esto da a cada acción sobre un role un final claro en el nuevo recorrido. Va después porque sin la tabla y el detalle no hay dónde hacerlas.

**Independent Test**: Con el filtro en «Bloqueados», crear un role de Sistema y comprobar que se abre su detalle y que al volver al listado aparece en la tabla; duplicarlo; bloquear el role y desbloquearlo; eliminar otro; provocar un fallo en una de las acciones.

**Acceptance Scenarios**:

1. **Given** una persona que puede crear roles, **When** ve la pantalla con cualquier combinación de filtros, también con «Bloqueados», **Then** el botón «Nuevo role» está disponible junto al título, a la derecha, como «Crear usuario» en Usuarios; quien no puede crear roles no lo ve.
2. **Given** el formulario de «Nuevo role», **When** la persona crea el role, **Then** se abre el detalle del role nuevo, para poder ajustar de inmediato sus permisos.
3. **Given** el detalle de un role recién creado o duplicado, **When** la persona vuelve al listado, **Then** el role aparece en la tabla: el filtro Estatus pasa a «Activos», el filtro Tipo cambia solo si no incluía el tipo del role nuevo (como en la feature 025) y la tabla muestra la página donde está.
4. **Given** el detalle de un role activo, **When** la persona pulsa «Duplicar», **Then** se abre el detalle de la copia, con el foco en su nombre, como hoy.
5. **Given** el detalle de un role activo sin cambios pendientes, **When** la persona lo bloquea (con la confirmación de la feature 025), **Then** vuelve a la tabla con los mismos filtros, el role ya no está en «Activos», un aviso de éxito dice que ahora está en «Bloqueados» y el foco queda en el título de la pantalla.
6. **Given** el detalle de un role bloqueado, **When** la persona pulsa «Desbloquear role», **Then** vuelve a la tabla con los mismos filtros, el role ya no está en «Bloqueados», un aviso de éxito dice que ahora está en «Activos» y el foco queda en el título de la pantalla.
7. **Given** el detalle de un role activo, **When** la persona lo elimina (con la confirmación de siempre), **Then** vuelve a la tabla con los mismos filtros y el role ya no aparece.
8. **Given** que crear, duplicar, bloquear, desbloquear o eliminar falla, **When** se muestra el resultado, **Then** la persona se queda donde estaba, con el mismo mensaje de error que hoy, y puede reintentar.

---

### User Story 4 - Que filtros, página, enlaces antiguos y cambios sin guardar sean coherentes (Priority: P2)

El estado de la tabla (filtros, página y tamaño de página) vive en la dirección de la pantalla, igual que hoy el de la lista. Los enlaces guardados antes de esta feature siguen abriendo lo que mostraban, y salir del detalle con cambios sin guardar sigue pidiendo confirmación.

**Why this priority**: Sin esto el nuevo recorrido sorprende: se pierden filtros o página al recargar o al volver, los enlaces compartidos dejan de abrir el role que mostraban o se pierden permisos editados sin aviso.

**Independent Test**: Elegir filtros, página y tamaño, recargar y volver desde un detalle; abrir un enlace antiguo con un role elegido y otro con solo un tipo; editar permisos de un role y probar cada salida del detalle.

**Acceptance Scenarios**:

1. **Given** filtros, página y tamaño de página elegidos, **When** la persona recarga la pantalla o comparte su enlace, **Then** la tabla muestra lo mismo; un valor no válido en la dirección se sustituye por el de por omisión, sin mostrar un error.
2. **Given** una persona en una página posterior a la primera, **When** cambia cualquiera de los dos filtros, **Then** la tabla vuelve a la primera página.
3. **Given** una página que deja de existir porque el último role de la última página salió de la lista (por ejemplo, se bloqueó), **When** se muestra la tabla, **Then** se corrige sola a la última página que existe.
4. **Given** un enlace guardado antes de esta feature que solo pedía un tipo o un estatus, **When** se abre, **Then** la tabla muestra los roles con esos filtros, en la primera página.
5. **Given** un enlace guardado antes de esta feature que pedía abrir un role, **When** se abre, **Then** se abre el detalle de ese role (el de un role bloqueado, si lo estaba); si ese role ya no existe, aparece el aviso de que ya no existe, con la forma de volver al listado.
6. **Given** el detalle de un role con cambios sin guardar, **When** la persona intenta salir de él por cualquier camino de la aplicación (el enlace «Volver al listado», el menú de secciones o el botón Atrás del navegador), **Then** aparece el aviso de cambios sin guardar de siempre, con «Quedarme» y «Descartar y continuar», y no se pierde nada hasta que la persona confirme.

---

### User Story 5 - Usar la tabla con teclado, lector de pantalla y en pantallas angostas (Priority: P3)

Cualquier persona, sin importar cómo interactúe con la pantalla, puede recorrer la tabla, cambiar de página, abrir un role y volver.

**Why this priority**: Es un requisito de calidad transversal del Backoffice, no un flujo nuevo; las historias anteriores ya entregan el valor central.

**Independent Test**: Recorrer la tabla, el pie y el detalle solo con el teclado y con un lector de pantalla; reducir el ancho de la ventana hasta el mínimo admitido.

**Acceptance Scenarios**:

1. **Given** la tabla, **When** la persona navega con el teclado, **Then** puede llegar al nombre de cada role con Tab y abrirlo con Enter, y a los controles del pie (filas por página, anterior, siguiente), con el foco siempre visible.
2. **Given** un lector de pantalla, **When** recorre la tabla, **Then** la tabla tiene un nombre accesible, cada columna tiene su encabezado y cada fila se lee con sus datos.
3. **Given** un lector de pantalla y un cambio de página, de tamaño de página o de filtro, **When** la tabla se actualiza, **Then** se anuncia, sin mover el foco, qué roles se muestran y cuántos hay en total (por ejemplo «Mostrando 1 a 10 de 15 roles.»), como ya se anuncia en Usuarios.
4. **Given** que se abre el detalle de un role o se vuelve a la tabla, **When** cambia la pantalla, **Then** el foco y el título de la pestaña se gestionan como en las demás pantallas con detalle: el foco va al título de la pantalla nueva y el título de la pestaña la nombra.
5. **Given** una ventana angosta, **When** se muestra la pantalla, **Then** la página no se desplaza horizontalmente (si no caben todas las columnas, la tabla se desplaza dentro de su marco), el pie conserva «Filas por página» y se reacomoda en varias líneas, y los filtros y «Nuevo role» se reacomodan sin texto cortado.

---

### Edge Cases

- Siempre hay exactamente un botón pulsado en cada grupo de filtros; pulsar el que ya está pulsado no lo despulsa (sin cambios respecto a la feature 025).
- Un nombre largo se corta con puntos suspensivos en la tabla y se ve completo en el detalle.
- Si un role se elimina o se bloquea desde otra sesión mientras su detalle está abierto, se aplica el manejo de «no encontrado» que ya existe, con la forma de volver al listado.
- Con «Bloqueados» pulsado no se pide el número de permisos de ningún role: la columna Permisos muestra «—» en todas las filas.
- Un valor de role que no es válido en la dirección, como el escrito a mano, se ignora y se muestra la tabla, sin error.
- Una persona sin permiso para crear, editar o eliminar roles ve los mismos filtros y la misma tabla, y puede abrir el detalle; solo están ausentes o deshabilitadas las acciones que ya lo estaban.
- La tabla y el detalle nunca están abiertos a la vez, así que cambiar de filtro o de página no puede descartar cambios sin guardar: solo se pueden perder al salir del detalle, y ahí se avisa.
- Un role eliminado no vuelve a verse ni se puede reactivar; no hay un filtro «Eliminados» y la columna Estatus nunca dice «Eliminado» (sin cambios).
- Los dos grupos de filtros son visibles a la vez: no hay un grupo que dependa del otro (sin cambios).
- Con muchos roles la tabla sigue paginada: nunca se muestran todos a la vez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pantalla «Roles y permisos» DEBE mostrar los roles en una tabla a todo lo ancho, bajo el título y los grupos de filtros «Tipo» y «Estatus». NO DEBE mostrar la lista estrecha de la izquierda, el panel de detalle de la derecha ni el mensaje «Elige un role…».
- **FR-002**: La tabla DEBE tener exactamente las columnas Nombre, Estatus, Tipo y Permisos, en ese orden; NO DEBE tener columnas de descripción ni de fecha de alta.
- **FR-003**: Cada fila DEBE mostrar: el nombre del role como enlace a su detalle; su estatus («Activo» o «Bloqueado»); su tipo (Sistema o Clínica); y su total de permisos —los que tiene concedidos— escrito «n permisos» («1 permiso» si es uno). Si el role está bloqueado, o si su total todavía no se conoce o no se pudo obtener, la celda de Permisos DEBE mostrar «—».
- **FR-004**: La tabla DEBE tener el mismo pie de paginación que la de Usuarios: «Filas por página» con 10, 25 y 50 (10 por omisión), el rango de filas mostradas con el total («1–4 de 4») y los controles de página anterior y siguiente. El total DEBE ser el número de roles que cumplen los dos filtros, y la tabla NO DEBE mostrar más filas que las elegidas.
- **FR-005**: Los roles DEBEN mostrarse por orden de nombre. La tabla NO DEBE ofrecer ordenar ni filtrar por columna, menú de columnas ni buscador de texto, igual que la de Usuarios.
- **FR-006**: La tabla DEBE tener el mismo aspecto que la de Usuarios —encabezado, separadores de fila, resaltado de la fila bajo el cursor, nombre como enlace, tipografía y pie—, en los temas claro y oscuro de la aplicación.
- **FR-007**: Los grupos «Tipo» y «Estatus», sus opciones, sus valores iniciales («Todos» y «Activos») y su aspecto DEBEN seguir como en la feature 025; en particular, «Estatus» NO DEBE ganar una opción «Todos» ni «Eliminados»: la tabla muestra los roles de un solo estatus a la vez. Los filtros DEBEN aplicarse de inmediato, combinarse y, al cambiar cualquiera de ellos, llevar la tabla a su primera página y conservar el tamaño de página.
- **FR-008**: Cambiar «Filas por página» DEBE llevar la tabla a su primera página.
- **FR-009**: Los estados de cargando, vacío y error con reintento DEBEN aplicarse a la zona de la tabla y NO DEBEN ocultar el título, los filtros ni «Nuevo role». Los mensajes de vacío DEBEN ser los que ya existen y distinguir el caso: no hay roles, no hay roles de Clínica, no hay roles de Sistema y no hay roles bloqueados.
- **FR-010**: «Nuevo role» DEBE mostrarse junto al título, a la derecha, solo a quien puede crear roles y con cualquier combinación de filtros, y DEBE abrir el mismo formulario que hoy. También DEBE ofrecerse en el mensaje de vacío de «Activos».
- **FR-011**: Pulsar el nombre de un role DEBE abrir su detalle en una pantalla propia, que NO comparte el espacio con la tabla. El detalle de un role activo DEBE contener y hacer lo mismo que hoy el panel de la derecha —datos, lista de permisos con botones, reglas de edición, guardado, descarte, duplicado, eliminación, bloqueo y aviso de cambios sin guardar—, tal como lo describen la feature 023 y la 025 (FR-019).
- **FR-012**: El detalle de un role bloqueado DEBE seguir como lo describe la feature 025 (FR-012 y FR-014): sus datos, que está bloqueado y la explicación, con «Desbloquear role» para quien puede editar roles, y sin lista de permisos, sin acciones de guardar, descartar, duplicar ni eliminar y sin error de carga.
- **FR-013**: El detalle DEBE ofrecer la acción «Volver al listado». Esa acción y el botón Atrás del navegador DEBEN devolver a la tabla con los mismos filtros, la misma página y el mismo tamaño de página de los que se salió.
- **FR-014**: La dirección de un role que no existe o que ya fue eliminado DEBE mostrar el aviso «Este role ya no existe» con la forma de volver al listado, sin error. El mismo manejo DEBE aplicarse si el role se elimina o se bloquea desde otra sesión con su detalle abierto.
- **FR-015**: Al crear un role DEBE abrirse el detalle del role nuevo; al duplicarlo, el de la copia, con el foco en su nombre como hoy.
- **FR-016**: Tras bloquear, desbloquear o eliminar un role DEBE volverse a la tabla con los mismos filtros (y la misma página, o la última que exista), el role DEBE haber salido de ella, DEBEN mostrarse los avisos que ya existen (el de éxito de bloquear y desbloquear, que dice dónde está ahora el role) y el foco DEBE quedar en el título de la pantalla.
- **FR-017**: Al volver al listado desde el detalle de un role recién creado o duplicado, el role DEBE aparecer en la tabla: el filtro Estatus DEBE pasar a «Activos», el filtro Tipo DEBE cambiar solo si no incluía el tipo del role nuevo (feature 025, FR-010) y la tabla DEBE mostrar la página donde está el role. En ese caso, esto prevalece sobre FR-013.
- **FR-018**: El estado de la tabla (filtros, página y tamaño de página) DEBE conservarse en la dirección de la pantalla, de modo que recargar, compartir el enlace, volver atrás y volver desde el detalle lo restablezcan. Un valor no válido en la dirección DEBE sustituirse por el de por omisión, sin error, y una página posterior a la última DEBE corregirse a la última que exista.
- **FR-019**: Los enlaces anteriores a esta feature DEBEN seguir abriendo lo que mostraban: los que pedían un tipo, un estatus o ambos, la tabla con esos filtros; los que pedían abrir un role, el detalle de ese role, activo o bloqueado. Si el role ya no existe, DEBE aplicarse FR-014; un role no válido en la dirección DEBE ignorarse y mostrarse la tabla, sin error.
- **FR-020**: Salir del detalle de un role con cambios sin guardar, por cualquier camino de la aplicación, DEBE mostrar antes el aviso de cambios sin guardar que ya existe y NO DEBE perder los cambios hasta que la persona lo confirme.
- **FR-021**: Al cambiar de página, de tamaño de página o de filtro, la zona de la tabla DEBE anunciar a las tecnologías de apoyo, sin mover el foco, qué roles se muestran y cuántos hay en total.
- **FR-022**: La tabla DEBE tener un nombre accesible y encabezados de columna; el nombre de cada role DEBE ser un enlace operable con el teclado, igual que los controles del pie, con el foco siempre visible. Al abrir el detalle o volver a la tabla, el foco y el título de la pestaña DEBEN gestionarse como en las demás pantallas con detalle.
- **FR-023**: En anchos de pantalla pequeños la página NO DEBE desplazarse horizontalmente: si no caben todas las columnas, la tabla DEBE desplazarse dentro de su marco; el pie DEBE conservar «Filas por página» y reacomodarse en varias líneas; y los filtros y «Nuevo role» DEBEN reacomodarse sin texto cortado.
- **FR-024**: Esta feature NO DEBE cambiar qué es un role ni sus permisos, el formulario de creación, la lista de permisos con botones (feature 023), las reglas de bloquear, desbloquear y eliminar, la asignación de roles a personas, los permisos necesarios para ver o usar la sección ni su entrada en el menú, y NO DEBE añadir buscador por texto, ordenación por columna ni exportación.

### Key Entities

- **Role**: Un conjunto de permisos con nombre y descripción. Tiene un **tipo** (Sistema o Clínica) y un **estatus** (Activo, Bloqueado o Eliminado). Un role bloqueado conserva sus datos, su nombre y sus asignaciones a personas, pero estas dejan de tener efecto, y mientras esté bloqueado no se pueden consultar su detalle ni sus permisos. Un role eliminado deja de verse y no se puede reactivar.
- **Estado de la tabla**: Los filtros «Tipo» (Todos, Sistema o Clínica) y «Estatus» (Activos o Bloqueados), la página y el tamaño de página que deciden qué roles se ven. Siempre tiene un valor en cada parte y vive en la dirección de la pantalla.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al abrir la pantalla sin filtros en la dirección, el 100 % de las veces la persona ve la tabla con los roles activos de ambos tipos y ni la lista de la izquierda ni el panel de la derecha; la tabla contiene exactamente los roles que cumplen los filtros y el total del pie coincide con su número.
- **SC-002**: Una persona llega al detalle de cualquier role con una sola acción (pulsar su nombre) y vuelve a la tabla con otra; al volver, el 100 % de las veces la tabla conserva los mismos filtros, la misma página y el mismo tamaño de página.
- **SC-003**: El 100 % de los escenarios de aceptación de las features 023 y 025 que describen el detalle de un role (activo o bloqueado), sus acciones y la edición de sus permisos siguen dando el mismo resultado desde la pantalla de detalle.
- **SC-004**: En una revisión visual lado a lado, la tabla de Roles es indistinguible de la de Usuarios en encabezado, separadores de fila, enlace del nombre y pie de paginación, en los temas claro y oscuro; solo difiere el contenido de las columnas.
- **SC-005**: El 100 % de los enlaces anteriores a esta feature (con un tipo, un estatus o un role elegido) abren lo que mostraban: la tabla con esos filtros o el detalle de ese role.
- **SC-006**: En 0 casos se pierden cambios sin guardar al salir del detalle sin que la persona lo haya confirmado, sea cual sea el camino de salida.
- **SC-007**: Un role recién creado o duplicado aparece en la tabla al volver al listado en el 100 % de las combinaciones de filtros y de página que había en ese momento.
- **SC-008**: Un role bloqueado, desbloqueado o eliminado desde su detalle queda, al volver a la tabla, en la lista de su nuevo estatus (o fuera de todas, si se eliminó) y fuera de la anterior en el 100 % de los casos.
- **SC-009**: Todos los controles nuevos (el nombre de cada role, el pie de la tabla y «Volver al listado») se operan con teclado, y las verificaciones automáticas de accesibilidad de la tabla y del detalle no reportan violaciones.
- **SC-010**: Con una conexión normal y hasta 100 roles, la tabla muestra los nombres de los roles de su primera página en menos de 2 segundos desde que se abre la pantalla o se cambia un filtro; el número de permisos puede completarse después, sin bloquear la tabla.

## Assumptions

- **Lectura de la petición.** «Los Roles y permisos se vean en forma de lista como los usuarios… (solo el grid)» se interpreta así: la lista de roles de la pantalla «Roles y permisos» pasa a ser una tabla como la de Usuarios —la que muestra la imagen—, con su mismo aspecto y su mismo pie de paginación; «solo el grid» se entiende como que la referencia es únicamente la tabla, no el resto de la pantalla de Usuarios. La feature 023 ya leyó mal una petición parecida («lista»), por eso las lecturas de esta spec quedan escritas aquí y no se dan por sentadas; si alguna no es la que se quería, se corrige en `/speckit-clarify` antes de planear.
- **El detalle de un role pasa a una pantalla propia**, como el de un usuario (el nombre de la tabla es el enlace —el resto de la fila no lo es— y se vuelve con «Volver al listado»). Es la consecuencia de que la tabla ocupe todo el ancho. Confirmado al aclarar (véase Clarifications): se descartaron un panel junto a la tabla y un diálogo sobre ella.
- **Columnas.** Las definió la persona que pidió la feature al aclarar (véase Clarifications): Nombre (el enlace al detalle), Estatus, Tipo y Permisos, en ese orden; la tabla de Usuarios de la imagen tiene otras (Nombre, Correo electrónico y Fecha de alta). Descripción y Fecha de alta no son columnas, y la descripción se ve en el detalle. «n permisos» es el total de permisos que el role tiene concedidos, como lo dice hoy la lista de la izquierda («X permisos»), no el de los que su tipo admite. Un role bloqueado muestra «—» en Permisos porque sus permisos no se pueden consultar.
- **Estatus.** El filtro «Estatus» no cambia (Activos | Bloqueados, uno a la vez, como en Módulos y en las features 025 y 026), así que con cada filtro todas las filas muestran el mismo estatus; la columna existe para que cada fila lo diga por sí misma. «Eliminado» no aparece nunca: la API de roles no permite pedir los roles eliminados (hoy rechaza la petición) y la pantalla no los lista, de modo que esta feature no necesita cambios en la API.
- **La tabla pagina la lista completa.** Como la API entrega todos los roles de un estatus de una vez, el pie de la tabla pagina esa respuesta (10, 25 o 50 por página, 10 por omisión, como en Usuarios) y los filtros se aplican igual. El Principio IV de la constitución pide paginar en el servidor y no descargar una colección completa para paginarla en el navegador, así que el plan DEBE resolverlo —justificarlo en Complexity Tracking, ya que la API no ofrece paginación para roles y su número es pequeño y acotado, como el del catálogo de módulos, o pedir a la API que pagine—; esta spec solo fija lo que la persona ve.
- **La constitución se enmienda al planear.** El Principio VI describe hoy a Roles como lista maestro-detalle en una sola pantalla, y dice que esa variante no requiere Complexity Tracking. Con esta feature Roles sigue el patrón general (listado paginado y detalle en pantalla propia), de modo que esa variante deja de describirlo y se retira en el plan, como se hizo con las pestañas en la feature 025; no se hace en esta spec.
- **Qué reemplaza.** De las features 014 y 025 se reemplaza lo propio del maestro-detalle: elegir un role dentro de la misma pantalla, el mensaje «Elige un role…», cerrar el detalle al cambiar un filtro y que la lista «no se pagina». Todo lo que ocurre dentro del detalle de un role (feature 023, FR-019 de la 025, bloqueo, duplicado y eliminación) se conserva; solo cambia dónde se muestra.
- **Orden.** Por nombre, como lo da la API; no hay ordenación por columna, igual que en Usuarios.
- **Crear y duplicar.** «Nuevo role» sigue siendo el mismo formulario, ahora junto al título; tras crear o duplicar se abre el detalle del role nuevo (hoy queda elegido en la misma pantalla) y no hay un aviso de éxito nuevo: solo siguen los avisos que ya existen.
- **Enlaces antiguos.** Los que traían un role elegido abren ahora el detalle de ese role; la forma exacta de las direcciones nuevas la decide el plan, siempre que los enlaces antiguos sigan abriendo lo que mostraban.
- **Permisos de la sección.** Ver la sección, crear, editar y eliminar roles piden los mismos permisos que hoy; no se crea ninguno nuevo.
- **Independiente de la feature 026** (filtros de Tipo y Estatus en Usuarios): ambas pantallas acaban con tabla, filtros y pie parecidos, pero esta feature no obliga a compartir código con aquella, y la 026 no es requisito de esta.
