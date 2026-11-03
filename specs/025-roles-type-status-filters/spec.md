# Feature Specification: Lista de roles con filtros de Tipo y Estatus, y bloqueo de roles

**Feature Branch**: `025-roles-type-status-filters`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Los roles y permisos se deben mostrar en una lista, con botones «Toggle Button» como los de la pantalla de Módulos. Tipo: Todos | Sistema | Clínica. Estatus: Activos | Bloqueados." Precisada después así: los filtros sustituyen a las pestañas CLÍNICA y SISTEMA; al abrir la pantalla, Tipo en «Todos» y Estatus en «Activos», como en Módulos; la lista de permisos con botones de la feature 023 se mantiene; y si la API no permite editar los permisos de un role bloqueado, mostrarlos en solo lectura. Y ante la pregunta de alcance: «Sí debemos agregar funciones para bloquear, desbloquear y eliminar (lógicamente) roles», con el catálogo de estatus de roles 1 Activo, 2 Bloqueado, 3 Eliminado. Esta feature corrige la interpretación de la feature 023, que aplicó los botones a los permisos de un role pero no creó los filtros de Tipo y Estatus que se habían pedido.

## Contexto

La pantalla «Roles y permisos» muestra hoy una pestaña por tipo (CLÍNICA y SISTEMA, abre en Clínica), la lista de los roles activos de ese tipo a la izquierda y, al elegir uno, su detalle a la derecha. No hay forma de ver todos los roles juntos, de ver los roles bloqueados ni de bloquear o desbloquear uno. La pantalla de Módulos, en cambio, ya filtra con dos grupos de botones de alternancia: «Tipo» (Todos | Sistema | Clínica) y «Estatus» (Activos | Bloqueados). Esta feature lleva a Roles ese mismo patrón y añade las acciones que dan sentido al filtro de Estatus.

Los tres estatus de un role son Activo, Bloqueado y Eliminado. **Eliminar** un role (de forma lógica: se marca como eliminado y deja de verse) ya existe en esta pantalla desde la feature 014 y no cambia. Lo que falta son **Bloquear** y **Desbloquear**.

Qué hace hoy la API de roles, comprobado en su código el 2026-11-02:
- La lista admite pedir los roles activos o los bloqueados (por omisión, los activos). Los eliminados no se pueden pedir.
- Bloquear un role activo y desbloquear uno bloqueado son operaciones que pide el mismo permiso que editar roles. Un role bloqueado conserva su información, su nombre sigue reservado y sus asignaciones a personas se conservan, pero **dejan de tener efecto** mientras esté bloqueado.
- De un role bloqueado **no** se puede consultar el detalle, **ni** sus permisos, **ni** modificarlo, **ni** eliminarlo: para todo eso responde «no encontrado». Para eliminarlo, primero hay que desbloquearlo.
- Un role eliminado no se puede reactivar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filtrar los roles por Tipo con botones (Priority: P1)

Una persona con acceso a «Roles y permisos» ve, encima de la lista de roles, el grupo de botones «Tipo» con las opciones Todos, Sistema y Clínica, en lugar de las pestañas. Al abrir la pantalla está en «Todos» y la lista muestra los roles de ambos tipos; al pulsar Sistema o Clínica, la lista muestra solo los de ese tipo.

**Why this priority**: Es el núcleo de lo pedido y lo que hoy falta: sin los botones de Tipo no hay forma de ver todos los roles a la vez ni de cambiar de tipo con el patrón de Módulos.

**Independent Test**: Con roles de ambos tipos, abrir la pantalla y comprobar que aparece «Todos» pulsado con todos los roles activos; pulsar Sistema y luego Clínica y comprobar que la lista muestra solo los roles de cada tipo, y que ya no hay pestañas.

**Acceptance Scenarios**:

1. **Given** una persona que abre «Roles y permisos» sin ningún filtro elegido, **When** se carga la pantalla, **Then** ve los grupos «Tipo» y «Estatus», con «Todos» y «Activos» pulsados, y la lista muestra los roles activos de ambos tipos; ya no aparecen las pestañas CLÍNICA y SISTEMA.
2. **Given** la lista con «Todos» pulsado, **When** la persona pulsa «Sistema», **Then** solo quedan los roles activos de Sistema, y «Sistema» se ve pulsado en lugar de «Todos».
3. **Given** la lista filtrada por un tipo, **When** la persona pulsa «Todos», **Then** vuelven a verse los roles de ambos tipos.
4. **Given** la lista con roles de ambos tipos, **When** se muestra cada elemento, **Then** indica a qué tipo pertenece el role, junto a su nombre y su descripción, para distinguirlos sin tener que filtrar.
5. **Given** que no hay roles de un tipo, **When** la persona filtra por él, **Then** en lugar de la lista aparece el mensaje de que todavía no hay roles de ese tipo, con la invitación a crear el primero, y los filtros siguen disponibles.

---

### User Story 2 - Filtrar los roles por Estatus y ver los bloqueados (Priority: P1)

La persona pulsa «Bloqueados» en el grupo «Estatus» para ver los roles que están bloqueados, y «Activos» para volver a los activos. Los dos filtros se combinan: por ejemplo, los roles bloqueados de Clínica.

**Why this priority**: Es la otra mitad de lo pedido. Hoy los roles bloqueados son invisibles para quien administra el sistema; sin este filtro nadie puede saber cuáles hay.

**Independent Test**: Con al menos un role bloqueado, pulsar «Bloqueados» y comprobar que aparece solo ese role y que no aparece ninguno activo; combinarlo con cada opción de Tipo; elegir el role bloqueado y comprobar que se explica por qué no se pueden ver ni cambiar sus permisos.

**Acceptance Scenarios**:

1. **Given** la lista de roles activos, **When** la persona pulsa «Bloqueados», **Then** la lista muestra únicamente los roles bloqueados (del tipo que indique el filtro Tipo) y «Bloqueados» se ve pulsado en lugar de «Activos».
2. **Given** «Bloqueados» pulsado, **When** la persona cambia el filtro Tipo, **Then** la lista combina ambos filtros: cada elemento cumple el tipo y el estatus elegidos.
3. **Given** «Bloqueados» pulsado y ningún role bloqueado que cumpla los filtros, **When** se muestra la lista, **Then** aparece el mensaje de que no hay roles bloqueados, y los filtros siguen disponibles.
4. **Given** la lista de roles bloqueados, **When** la persona elige uno, **Then** el detalle muestra su nombre, su descripción, su tipo y que está bloqueado, y explica que, mientras esté bloqueado, no se pueden ver ni cambiar sus permisos ni eliminarlo; no se muestran la lista de permisos ni las acciones de guardar, duplicar o eliminar, y no aparece ningún error de carga.
5. **Given** la lista de roles bloqueados, **When** se muestra cada elemento, **Then** no muestra el contador «X permisos», porque los permisos de un role bloqueado no están disponibles.
6. **Given** que falla la carga de los roles de un estatus, **When** se muestra la lista, **Then** en su lugar aparece un error con la opción de reintentar, sin ocultar los filtros ni el título de la pantalla.

---

### User Story 3 - Bloquear y desbloquear un role (Priority: P2)

Una persona con permiso para editar roles bloquea un role activo desde su detalle, después de confirmar, y desbloquea uno bloqueado desde su detalle. Eliminar un role (de forma lógica) sigue funcionando como hasta ahora para los roles activos.

**Why this priority**: Da sentido al filtro de Estatus: sin estas acciones, «Bloqueados» solo mostraría roles bloqueados desde fuera del Backoffice. Va después de los filtros porque los filtros ya entregan valor por sí solos.

**Independent Test**: Con un role activo y una persona que puede editar roles, bloquearlo (con la confirmación), comprobar que sale de «Activos» y aparece en «Bloqueados»; desbloquearlo y comprobar que vuelve a «Activos» con el mismo nombre, descripción, tipo y permisos.

**Acceptance Scenarios**:

1. **Given** el detalle de un role activo y una persona que puede editar roles, **When** se muestra, **Then** ofrece la acción «Bloquear role» junto a las que ya tiene (guardar, descartar, duplicar y eliminar); una persona que no puede editar roles no la ve.
2. **Given** un role activo con cambios de permisos sin guardar o con un guardado en curso, **When** se muestra su detalle, **Then** la acción «Bloquear role» no está disponible hasta que los cambios se guarden o se descarten.
3. **Given** el detalle de un role activo sin cambios pendientes, **When** la persona pulsa «Bloquear role», **Then** aparece una confirmación que nombra el role y explica que, mientras esté bloqueado, las personas que lo tienen asignado dejan de recibir lo que concede, que sus permisos no se podrán ver ni cambiar y que se puede volver a activar desbloqueándolo.
4. **Given** esa confirmación, **When** la persona confirma, **Then** el role queda bloqueado, sale de la lista actual, el detalle se cierra y un aviso de éxito nombra el role y dice que ahora está en «Bloqueados».
5. **Given** esa confirmación, **When** la persona la cancela, **Then** no cambia nada.
6. **Given** el detalle de un role bloqueado y una persona que puede editar roles, **When** se muestra, **Then** ofrece la acción «Desbloquear role»; una persona que no puede editar roles ve el detalle del role bloqueado sin esa acción.
7. **Given** el detalle de un role bloqueado, **When** la persona pulsa «Desbloquear role», **Then** el role se desbloquea de inmediato, sin confirmación, sale de la lista de bloqueados, el detalle se cierra y un aviso de éxito nombra el role y dice que ahora está en «Activos».
8. **Given** un role que acaba de desbloquearse, **When** la persona abre «Activos», **Then** el role aparece con el mismo nombre, descripción, tipo y permisos que tenía antes de bloquearse.
9. **Given** que la persona pulsa Bloquear o Desbloquear, **When** la operación está en curso, **Then** la acción muestra que está trabajando y no admite una segunda pulsación.
10. **Given** que otra sesión ya bloqueó (o desbloqueó) el role, **When** la persona intenta lo mismo, **Then** un aviso explica que el role ya estaba en ese estatus y la lista se actualiza, sin tratarlo como una falla.
11. **Given** que la operación falla por otra causa, **When** se muestra el resultado, **Then** un aviso de error lo explica, el role queda como estaba y la persona puede intentarlo de nuevo.
12. **Given** el detalle de un role activo, **When** la persona usa «Eliminar role», **Then** funciona exactamente como en la feature 014 (confirmación y eliminación lógica); y el detalle de un role bloqueado no ofrece «Eliminar role», pero su explicación indica que hay que desbloquearlo antes de poder eliminarlo.

---

### User Story 4 - Que los filtros, la selección y la creación de roles sean coherentes (Priority: P2)

El estado de los filtros y el role elegido viven en la dirección de la pantalla, de modo que se puede compartir, recargar y volver atrás. Cambiar un filtro, crear o duplicar un role y las direcciones antiguas se comportan de forma predecible.

**Why this priority**: Sin esto la pantalla funciona pero sorprende: se pierden filtros al recargar, un role nuevo puede quedar oculto por el filtro activo y los enlaces guardados con las pestañas antiguas dejarían de abrir donde se esperaba.

**Independent Test**: Elegir filtros y un role, recargar y comprobar que todo sigue igual; abrir una dirección antigua con el tipo de una pestaña; crear un role de Sistema con el filtro en «Bloqueados» y comprobar que queda a la vista y elegido.

**Acceptance Scenarios**:

1. **Given** filtros elegidos y un role abierto, **When** la persona recarga la página o vuelve atrás desde otra pantalla, **Then** los mismos filtros y el mismo role siguen elegidos.
2. **Given** un enlace guardado antes de esta feature que pedía el tipo Clínica o el tipo Sistema, **When** se abre, **Then** la pantalla muestra los roles activos de ese tipo, con el filtro Tipo en esa opción.
3. **Given** una dirección con un valor de filtro no válido, **When** se abre, **Then** la pantalla abre con el filtro en su valor por omisión, sin mostrar un error.
4. **Given** un role abierto, **When** la persona cambia el filtro Tipo o el filtro Estatus, **Then** se cierra su detalle y vuelve el mensaje de elegir un role, porque puede haber dejado de cumplir los filtros.
5. **Given** un role abierto con cambios de permisos sin guardar, **When** la persona intenta cambiar un filtro, **Then** recibe el aviso de cambios sin guardar de siempre, igual que antes al cambiar de pestaña.
6. **Given** cualquier combinación de filtros, **When** la persona crea o duplica un role, **Then** el role nuevo (que nace activo) queda elegido y a la vista: el filtro Estatus pasa a «Activos» y el filtro Tipo se ajusta solo si no incluía el tipo del nuevo role.
7. **Given** una dirección que pide abrir un role que el filtro actual no muestra (por ejemplo, un role bloqueado con «Activos»), **When** se abre, **Then** no se abre ese role y aparece el mensaje de elegir un role, sin error.

---

### User Story 5 - Usar los filtros y las acciones con teclado, lector de pantalla y en pantallas angostas (Priority: P3)

Cualquier persona, sin importar cómo interactúe con la pantalla, puede cambiar los filtros de Tipo y Estatus, recorrer la lista resultante y bloquear o desbloquear un role.

**Why this priority**: Es un requisito de calidad transversal del Backoffice, no un flujo nuevo; las historias anteriores ya entregan el valor central.

**Independent Test**: Cambiar ambos filtros y bloquear y desbloquear un role solo con el teclado y con un lector de pantalla; reducir el ancho de la ventana hasta el mínimo admitido.

**Acceptance Scenarios**:

1. **Given** el foco antes de los filtros, **When** la persona navega con el teclado, **Then** puede entrar a cada grupo con Tab, moverse entre sus botones con las flechas y elegir uno con Espacio o Enter, con el foco siempre visible.
2. **Given** un lector de pantalla, **When** se recorre un grupo de filtros, **Then** anuncia su nombre («Tipo», «Estatus») y, en cada botón, su texto y si está pulsado.
3. **Given** la confirmación de «Bloquear role», **When** se abre y se cierra, **Then** el foco entra en ella, se queda dentro mientras está abierta y vuelve al control que la abrió o, si ese ya no existe, al título de la pantalla.
4. **Given** una ventana angosta, **When** se muestran los filtros y las acciones del detalle, **Then** se reacomodan en varias líneas, sin desplazamiento horizontal de la página y sin texto cortado.

---

### Edge Cases

- Siempre hay exactamente un botón pulsado en cada grupo: pulsar el que ya está pulsado no lo despulsa ni deja el filtro vacío (igual que en Módulos).
- Si un role se bloquea o se elimina desde otra sesión mientras está abierto, se aplica el manejo de «no encontrado» que la pantalla ya tiene.
- Con «Todos» y «Activos» pulsados y muchos roles, la lista se recorre con el desplazamiento normal de la página; no se pagina ni se oculta ningún role.
- Un role sin descripción muestra solo su nombre y su tipo en el elemento, como hoy no muestra una descripción vacía.
- «Nuevo role» sigue disponible con cualquier combinación de filtros, también con «Bloqueados», porque un role nuevo siempre nace activo.
- Cambiar de filtro no pierde el otro filtro: cambiar Tipo conserva el Estatus y al revés.
- El nombre de un role bloqueado sigue reservado: crear otro role con ese nombre da el mismo aviso de nombre repetido que ya existe.
- Un role eliminado no vuelve a verse ni se puede reactivar; no hay un filtro «Eliminados».
- Una persona sin permiso para crear, editar o eliminar roles ve los mismos filtros y la misma lista; solo están ausentes o deshabilitadas las acciones que ya lo estaban, y no ve «Bloquear role» ni «Desbloquear role».
- Los dos grupos son visibles a la vez: no hay un grupo que dependa del otro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La pantalla «Roles y permisos» NO DEBE mostrar las pestañas CLÍNICA y SISTEMA; en su lugar DEBE mostrar un grupo de botones de alternancia llamado «Tipo» con las opciones Todos, Sistema y Clínica, en ese orden.
- **FR-002**: La pantalla DEBE mostrar un segundo grupo de botones de alternancia llamado «Estatus» con las opciones Activos y Bloqueados, en ese orden, junto al de Tipo.
- **FR-003**: Cada grupo DEBE ser de selección única y tener siempre una opción pulsada; volver a pulsar la opción ya pulsada NO DEBE dejar el grupo sin selección.
- **FR-004**: Al abrir la pantalla sin ningún filtro elegido, DEBEN estar pulsados «Todos» y «Activos».
- **FR-005**: Los filtros DEBEN aplicarse de inmediato, sin botón de confirmación, y combinarse: la lista DEBE mostrar exactamente los roles que cumplen el tipo y el estatus elegidos, ni más ni menos.
- **FR-006**: Cada elemento de la lista DEBE mostrar el nombre del role, su descripción (si tiene) y su tipo. Los roles activos DEBEN mostrar además el contador «X permisos» que ya tenían; los roles bloqueados NO DEBEN mostrarlo.
- **FR-007**: Cambiar cualquiera de los dos filtros DEBE cerrar el detalle del role abierto y mostrar de nuevo el mensaje de elegir un role. Si el role abierto tiene cambios de permisos sin guardar, DEBE mostrarse antes el aviso de cambios sin guardar que ya existe.
- **FR-008**: El estado de los filtros y el role elegido DEBEN conservarse en la dirección de la pantalla, de modo que recargar, compartir el enlace y volver atrás los restablezcan. Un valor no válido en la dirección DEBE sustituirse por el valor por omisión, sin error.
- **FR-009**: Los enlaces anteriores a esta feature que pedían el tipo Clínica o el tipo Sistema DEBEN seguir abriendo la lista de ese tipo, con el filtro Tipo en esa opción y el Estatus en «Activos».
- **FR-010**: Al crear o duplicar un role, el role nuevo DEBE quedar elegido y a la vista: el filtro Estatus DEBE pasar a «Activos» y el filtro Tipo DEBE cambiar solo si no incluía el tipo del role nuevo.
- **FR-011**: Una dirección que pida abrir un role que la lista filtrada no muestra NO DEBE abrir ese role ni mostrar un error: DEBE aparecer el mensaje de elegir un role.
- **FR-012**: Al elegir un role bloqueado, el detalle DEBE mostrar su nombre, su descripción, su tipo y que está bloqueado, y DEBE explicar que mientras esté bloqueado no se pueden ver ni cambiar sus permisos ni eliminarlo, y que para eso hay que desbloquearlo. NO DEBE mostrar la lista de permisos ni las acciones de guardar, descartar, duplicar o eliminar, ni consultar al servicio datos que este no entrega para un role bloqueado, ni mostrar un error de carga.
- **FR-013**: El detalle de un role activo DEBE ofrecer la acción «Bloquear role» a quien puede editar roles. Mientras el role tenga cambios de permisos sin guardar o haya un guardado en curso, la acción NO DEBE estar disponible. Al pulsarla, DEBE pedirse una confirmación que nombre el role y explique las consecuencias: las personas que lo tienen asignado dejan de recibir lo que concede, sus permisos no se pueden ver ni cambiar y se puede volver a activar desbloqueándolo. El role NO DEBE bloquearse hasta que la persona confirme.
- **FR-014**: El detalle de un role bloqueado DEBE ofrecer la acción «Desbloquear role» a quien puede editar roles. Desbloquear DEBE hacerse de inmediato, sin confirmación, porque devuelve el role a su estado anterior.
- **FR-015**: Tras bloquear o desbloquear un role, DEBE cerrarse su detalle, el role DEBE salir de la lista actual y aparecer en la del otro estatus, y un aviso de éxito DEBE nombrar el role y decir dónde está ahora («Bloqueados» o «Activos»). Un role desbloqueado DEBE conservar el mismo nombre, descripción, tipo y permisos que tenía.
- **FR-016**: Mientras una operación de bloqueo o desbloqueo está en curso, su acción DEBE mostrar que trabaja y NO DEBE admitir una segunda pulsación. Si el role ya estaba en el estatus pedido (por ejemplo, otra sesión lo bloqueó antes), DEBE avisarse de eso, sin tratarlo como una falla, y actualizarse la lista. Cualquier otra falla DEBE avisarse como error, dejar el role como estaba y permitir reintentar.
- **FR-017**: La acción «Eliminar role» DEBE seguir como en la feature 014 para los roles activos (confirmación y eliminación lógica). NO DEBE ofrecerse en un role bloqueado, porque la API no lo permite; la explicación de FR-012 indica que hay que desbloquearlo primero.
- **FR-018**: Los estados de cargando, vacío y error con reintento DEBEN aplicarse a la zona de la lista y no ocultar los filtros ni el título. Los mensajes de vacío DEBEN distinguir el caso: no hay roles de un tipo, no hay roles en absoluto («Todos») y no hay roles bloqueados.
- **FR-019**: El detalle de un role activo, su lista de permisos con botones, sus reglas de edición, el guardado, el aviso de cambios sin guardar y la acción de duplicar DEBEN seguir funcionando exactamente como en la feature 023, salvo por la acción nueva «Bloquear role» de FR-013.
- **FR-020**: Los botones de ambos grupos DEBEN tener la misma forma de grupo segmentado, el mismo tamaño, la misma tipografía y el mismo aspecto de estado pulsado que los grupos de «Tipo» y «Estatus» de la pantalla de Módulos, con la etiqueta del grupo sobre cada uno.
- **FR-021**: Cada grupo DEBE tener un nombre accesible («Tipo», «Estatus»); cada botón DEBE exponer a las tecnologías de apoyo si está pulsado; y los grupos, «Bloquear role», «Desbloquear role» y la confirmación DEBEN poder operarse con el teclado, con el foco siempre visible y gestionado en la confirmación (entra, se queda dentro y vuelve a donde estaba).
- **FR-022**: En anchos de pantalla pequeños, los dos grupos y las acciones del detalle DEBEN reacomodarse en varias líneas, sin desplazamiento horizontal de la página y sin texto cortado.
- **FR-023**: Esta feature NO DEBE cambiar la creación de roles, la edición de su nombre y descripción, la eliminación de roles activos (más allá de FR-017), la asignación de roles a personas ni los permisos necesarios para ver esta sección, y NO DEBE añadir un buscador por texto a la lista de roles.

### Key Entities

- **Role**: Un conjunto de permisos con nombre y descripción. Tiene un **tipo** (Sistema o Clínica) y un **estatus** (Activo, Bloqueado o Eliminado). Un role bloqueado conserva sus datos, su nombre y sus asignaciones a personas, pero estas dejan de tener efecto, y la API no entrega su detalle ni sus permisos. Un role eliminado deja de verse y no se puede reactivar.
- **Filtros de la lista**: El par «Tipo» (Todos, Sistema o Clínica) y «Estatus» (Activos o Bloqueados) que decide qué roles aparecen. Siempre tiene un valor en cada grupo, y vive en la dirección de la pantalla.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde que se abre la pantalla, una persona llega a cualquiera de las seis combinaciones de Tipo y Estatus con a lo sumo dos pulsaciones (una por grupo), y la lista que ve contiene en el 100 % de los casos exactamente los roles que cumplen la combinación.
- **SC-002**: Al abrir la pantalla por primera vez, la persona ve los roles activos de ambos tipos sin pulsar nada (100 % de las aperturas sin filtros en la dirección).
- **SC-003**: El 100 % de los enlaces anteriores a esta feature con el tipo Clínica o Sistema abren la lista de ese tipo.
- **SC-004**: Al elegir cualquier role bloqueado, la persona ve una explicación y ningún mensaje de error en el 100 % de los casos, y nunca llega a mostrarse una lista de permisos vacía que pueda confundirse con un role sin permisos.
- **SC-005**: Una persona con permiso bloquea un role activo con dos acciones (pulsar «Bloquear role» y confirmar) y lo desbloquea con una; en el 100 % de los casos el role aparece enseguida en la lista del nuevo estatus y deja de aparecer en la del anterior.
- **SC-006**: En el 100 % de los roles que se bloquean y se desbloquean, el role recupera el mismo nombre, descripción, tipo y permisos que tenía.
- **SC-007**: Ninguna persona sin permiso para editar roles ve las acciones «Bloquear role» o «Desbloquear role» (0 casos), y ningún role se bloquea sin que se haya confirmado antes.
- **SC-008**: El 100 % de los escenarios de aceptación de la feature 023 que describen el detalle de un role activo y la edición de sus permisos siguen dando el mismo resultado.
- **SC-009**: Un role recién creado o duplicado queda elegido y visible en el 100 % de las combinaciones de filtros activas en ese momento.
- **SC-010**: Los dos grupos de filtros y las acciones de bloqueo se operan con teclado en el 100 % de sus controles, y las verificaciones automáticas de accesibilidad de la pantalla no reportan violaciones.
- **SC-011**: En una revisión visual, los grupos «Tipo» y «Estatus» de Roles son indistinguibles en forma, tamaño, tipografía y estado pulsado de los de Módulos.

## Assumptions

- «Los roles y permisos… en una lista, con botones Toggle Button… Tipo: Todos | Sistema | Clínica; Estatus: Activos | Bloqueados» se interpreta ahora como lo que muestran las capturas: dos grupos de filtros iguales a los de Módulos que gobiernan la lista de roles. La feature 023 los tomó solo como referencia de estilo; esa lectura era errónea y esta feature la corrige.
- Esta feature **sustituye** la parte de la feature 023 (FR-015) que mantenía las pestañas Clínica y Sistema, y deja sin efecto «abre en Clínica». La lista de permisos con botones de la 023 **no** se toca.
- Los valores iniciales «Todos» y «Activos» los eligió quien pidió la feature, para ser iguales a los de Módulos.
- Con «Todos», los roles de ambos tipos se muestran en una sola lista ordenada por nombre, y cada elemento indica su tipo; no se agrupan bajo encabezados.
- El filtro de Estatus solo ofrece Activos y Bloqueados. Los roles eliminados nunca se muestran, como en Módulos, y la API tampoco permite pedirlos.
- «Eliminar (lógicamente) roles» ya existe para los roles activos (feature 014) y se conserva sin cambios. La API no permite eliminar un role bloqueado, así que para eliminarlo hay que desbloquearlo primero; esta feature no pretende cambiar eso.
- El deseo expresado «si la API no permite editar los permisos de un role bloqueado, mostrarlos en solo lectura» no es realizable: la API tampoco entrega los permisos de un role bloqueado (responde «no encontrado»), de modo que lo que se muestra es el mensaje explicativo de FR-012 en lugar de los permisos. Si la API cambiara en el futuro y los entregara, mostrarlos en solo lectura sería una mejora aparte.
- Bloquear y desbloquear exigen el mismo permiso que editar roles, porque eso es lo que pide la API; no se crea un permiso nuevo. Bloquear pide confirmación porque afecta a las personas que tienen el role (dejan de recibir lo que concede); desbloquear no, porque restituye el estado anterior y se puede deshacer bloqueando de nuevo.
- Al desbloquear, la API no comprueba que las personas que recuperan el role no queden con roles activos de los dos tipos; ese caso queda fuera de esta feature.
- El contador «X permisos» de los roles activos se conserva tal como estaba. Para los bloqueados se omite por la misma razón.
- La constitución del proyecto (Principio VI) describe hoy a Roles como lista maestro-detalle «con pestañas por tipo (Clínica/Sistema)». Reemplazar las pestañas por filtros exige enmendar esa frase; se hace al planear esta feature, no en esta spec.
- Esta feature depende de que la API de roles siga permitiendo pedir los roles activos o los bloqueados, bloquear y desbloquear, y responder «no encontrado» para el detalle, los permisos y la eliminación de un role bloqueado (hechos comprobados en el código de la API el 2026-11-02, no en un contrato publicado).
- Es independiente de la feature 024 (módulos y submódulos en árbol): una trabaja sobre Roles y la otra sobre Módulos, y no comparten componentes.
