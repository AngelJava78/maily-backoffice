# Feature Specification: Módulos y submódulos en árbol jerárquico

**Feature Branch**: `024-modules-submodules-tree`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Cambiemos la funcionalidad de los módulos y submódulos. Los submódulos deben verse anidados, es decir los submódulos deben aparecer debajo del módulo al que pertenecen en forma de árbol jerárquico."

## Contexto

Hoy la sección «Módulos» muestra el catálogo como una lista plana agrupada por tipo (Sistema y Clínica). El servicio de usuarios de MailySoft ya define los **submódulos**: un módulo que depende de otro módulo, su **padre** (por ejemplo, «Recetas» y «Signos vitales» dentro de «Pacientes»). Sus reglas, que esta feature respeta y refleja en pantalla:

- Hay **un solo nivel**: un submódulo no puede tener submódulos.
- Un submódulo es del **mismo tipo** que su padre (Sistema o Clínica).
- Los módulos base de administración (Usuarios, Roles, Permisos y Módulos) **no pueden ser padres ni submódulos**.
- Si el padre está **Bloqueado**, sus submódulos dejan de estar disponibles, aunque conservan su propio estatus.
- **No se puede eliminar** un módulo que tenga submódulos.

Esta feature hace que esa jerarquía **se vea y se pueda administrar** desde el Backoffice.

Palabras que usa esta spec: **módulo de primer nivel** (sin padre; todos los de hoy lo son), **submódulo** (con padre) y **fila de contexto** (la fila atenuada de un padre que se muestra solo para ubicar a un submódulo cuando el padre no es parte de la vista actual).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los submódulos anidados bajo su módulo (Priority: P1)

Quien administra módulos abre «Módulos» y ve los submódulos **justo debajo del módulo al que pertenecen**, con un nivel de sangría, formando un árbol jerárquico. Cada módulo que tiene submódulos permite contraerlos o expandirlos. Los módulos sin submódulos se ven y se comportan como hoy.

**Why this priority**: Es el cambio pedido y la base de las demás historias: sin ver la jerarquía no tiene sentido administrarla.

**Independent Test**: Con un catálogo que tenga un módulo con varios submódulos, otro sin ninguno y módulos de ambos tipos, abrir «Módulos» y comprobar que cada submódulo aparece bajo su padre, en el grupo de su tipo, y que contraer y expandir el padre oculta y muestra sus submódulos.

**Acceptance Scenarios**:

1. **Given** el módulo «Pacientes» con los submódulos «Expediente clínico», «Signos vitales», «Recetas» y «Diagnósticos», **When** la persona abre «Módulos», **Then** los cuatro aparecen inmediatamente debajo de «Pacientes», con un nivel de sangría, y ninguno aparece como módulo de primer nivel.
2. **Given** un módulo con submódulos, **When** se muestra, **Then** tiene un control para contraer y expandir sus submódulos, que empieza expandido, e indica cuántos submódulos tiene.
3. **Given** un módulo sin submódulos, **When** se muestra, **Then** no tiene ese control y su fila es igual a la de hoy.
4. **Given** módulos de Sistema y de Clínica, **When** se muestra la lista, **Then** siguen los dos grupos de siempre (Sistema primero) y cada submódulo está dentro del grupo de su padre.
5. **Given** varios módulos y varios submódulos de un mismo padre, **When** se muestran, **Then** los de primer nivel van ordenados por su número de orden y luego por nombre, y los submódulos de cada padre, igual entre ellos.
6. **Given** una fila de submódulo, **When** se muestra, **Then** ofrece lo mismo que cualquier módulo: nombre, clave, su propio orden, sus permisos y la acción «Editar» para quien puede editar.
7. **Given** los contadores del encabezado de cada grupo y de la lista, **When** se muestran, **Then** distinguen cuántos son módulos y cuántos submódulos.

---

### User Story 2 - Elegir, cambiar o quitar el módulo padre (Priority: P2)

Al crear o editar un módulo, la persona puede indicar a qué módulo pertenece (su padre), cambiarlo por otro o quitarlo para que vuelva a ser de primer nivel. Al guardar, el módulo aparece en su nueva posición del árbol.

**Why this priority**: Sin esto la jerarquía solo se podría ver, no crear ni corregir desde el Backoffice.

**Independent Test**: Crear un módulo de Clínica eligiendo como padre «Pacientes» y verlo anidado; editarlo para cambiarle el padre y luego para quitárselo; comprobar que cada cambio se ve en el árbol sin recargar la página.

**Acceptance Scenarios**:

1. **Given** el formulario para crear un módulo, **When** se abre, **Then** incluye un campo opcional «Módulo padre» con la opción «Ninguno (módulo de primer nivel)» elegida por defecto.
2. **Given** el tipo elegido en el formulario de alta, **When** la persona abre las opciones de «Módulo padre», **Then** solo ve módulos de primer nivel, activos, de ese mismo tipo y que no sean módulos base.
3. **Given** un padre elegido en el alta, **When** la persona cambia el tipo del módulo a uno distinto del de ese padre, **Then** el padre elegido se limpia y las opciones se actualizan al nuevo tipo.
4. **Given** un módulo de primer nivel sin submódulos, **When** la persona edita y elige un padre, **Then** al guardar el módulo pasa a ser submódulo y aparece bajo ese padre, que se muestra expandido.
5. **Given** un submódulo, **When** la persona elige otro padre, **Then** al guardar aparece bajo el nuevo padre; y si elige «Ninguno», pasa a ser de primer nivel dentro de su grupo.
6. **Given** un módulo que tiene submódulos a la vista, **When** la persona lo edita, **Then** el campo «Módulo padre» está deshabilitado y explica que un módulo con submódulos no puede ser a su vez submódulo (si tiene submódulos que no se ven, el servicio rechaza el cambio y se muestra ese mismo mensaje, como en el escenario 8).
7. **Given** uno de los módulos base (Usuarios, Roles, Permisos, Módulos), **When** se edita, **Then** el campo «Módulo padre» no se puede cambiar y explica que los módulos base no tienen padre; y esos módulos nunca aparecen como opción de padre.
8. **Given** que el servicio rechaza el cambio (el padre ya no existe, ya es un submódulo, es de otro tipo, es el propio módulo o es un módulo base), **When** la persona guarda, **Then** ve un mensaje en español junto al campo «Módulo padre», el formulario conserva lo escrito y no se pierde ningún dato.
9. **Given** un módulo cuyo padre actual está Bloqueado, **When** se edita, **Then** el campo muestra ese padre como valor actual aunque no figure entre las opciones.

---

### User Story 3 - Bloquear, desbloquear y eliminar un módulo con submódulos (Priority: P3)

Quien administra ve con claridad qué ocurre con los submódulos cuando bloquea o elimina a su padre, y no puede eliminar por accidente un módulo que aún tiene submódulos.

**Why this priority**: Evita sorpresas con un efecto que hoy no existe (un padre bloqueado deja sin disponibilidad a sus submódulos), pero la jerarquía ya es útil sin esto.

**Independent Test**: Con un módulo que tiene submódulos, ver el aviso al bloquearlo, comprobar que sus submódulos dejan de verse entre los activos y vuelven al desbloquearlo, e intentar eliminarlo.

**Acceptance Scenarios**:

1. **Given** un módulo con submódulos activos, **When** la persona ve su zona de bloqueo, **Then** un texto indica cuántos submódulos quedarán sin disponibilidad si lo bloquea (conservan su propio estatus).
2. **Given** que la persona bloquea ese módulo, **When** vuelve a la lista de activos, **Then** ni el módulo ni sus submódulos aparecen; y al desbloquearlo, todos vuelven a su lugar en el árbol.
3. **Given** un módulo con submódulos a la vista, **When** la persona ve su zona de eliminación, **Then** la acción «Eliminar módulo» no está disponible y un texto explica que primero hay que eliminar sus submódulos o cambiarlos de padre.
4. **Given** que el servicio rechaza la eliminación de un módulo con submódulos que no se ven en la vista actual (por ejemplo, porque están Bloqueados, o porque otra persona acaba de asignarle uno), **When** la persona confirma, **Then** ve el mismo mensaje en español y no se elimina nada.
5. **Given** un submódulo, **When** la persona lo bloquea o lo elimina, **Then** funciona como con cualquier módulo, su padre no cambia, y si era el único submódulo el padre pierde su control de contraer y expandir.

---

### User Story 4 - Usar el árbol con teclado, lector de pantalla y pantallas angostas (Priority: P3)

Cualquier persona, sin importar cómo interactúe con la pantalla, puede leer la jerarquía y contraer, expandir y editar módulos y submódulos.

**Why this priority**: Es un requisito de calidad transversal del Backoffice; las historias anteriores ya entregan el valor central.

**Independent Test**: Recorrer la lista solo con el teclado y con un lector de pantalla; reducir el ancho de la ventana al mínimo admitido.

**Acceptance Scenarios**:

1. **Given** el foco en la lista, **When** la persona navega con el teclado, **Then** puede llegar al control de contraer y expandir de cada padre y a la acción «Editar» de cada fila, y operarlos con Enter o Espacio, con el foco siempre visible.
2. **Given** un lector de pantalla, **When** se recorre un padre, **Then** anuncia su nombre, si está expandido o contraído y cuántos submódulos tiene; y al recorrer un submódulo, anuncia que pertenece a ese padre.
3. **Given** una ventana angosta, **When** se muestra la lista, **Then** la sangría de los submódulos sigue siendo legible y no hay desplazamiento horizontal de la página.

---

### Edge Cases

- **Submódulo en una vista donde su padre no está.** En la vista «Bloqueados», un submódulo bloqueado cuyo padre está Activo aparece bajo una **fila de contexto** de su padre (atenuada, sin acciones, con su nombre y clave, indicando que pertenece a otra vista). El submódulo se puede editar; la fila de contexto no cuenta en los contadores.
- **Padre Bloqueado con submódulos Activos.** El servicio los trata como no disponibles: no aparecen en «Activos» ni en «Bloqueados» (salvo que ellos mismos estén Bloqueados), de modo que bajo un padre bloqueado solo se ven sus submódulos que también lo están.
- **Búsqueda.** Si solo coincide un submódulo, aparece bajo su padre, mostrado como contexto; si coincide el padre, aparece con todos sus submódulos. Mientras hay una búsqueda, los padres con coincidencias se muestran expandidos.
- **Filtro de tipo.** Como un submódulo siempre es del tipo de su padre, filtrar por tipo nunca separa a un submódulo de su padre.
- **Un solo submódulo.** El padre muestra el control de contraer y expandir con «1 submódulo».
- **Muchos submódulos** (decenas bajo un mismo padre): se pueden contraer todos con un solo control y la lista no se vuelve lenta.
- **Datos inesperados.** Si el servicio entregara un submódulo cuyo padre es a su vez submódulo, la lista no falla: lo muestra bajo su padre directo.
- **Cambios simultáneos.** Si otra persona elimina o bloquea al padre mientras se edita un submódulo, el guardado muestra un mensaje claro y la lista se actualiza.
- **Sin módulos.** Los mensajes de «No hay módulos activos», «No hay módulos bloqueados» y «Ningún módulo coincide con la búsqueda» no cambian.
- **Estado de contraído.** Es solo de la pantalla: al recargar o volver a entrar, todos los padres empiezan expandidos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La lista de módulos DEBE mostrar cada submódulo inmediatamente debajo de su módulo padre, con un nivel de sangría, formando un árbol jerárquico; un submódulo NO DEBE aparecer como módulo de primer nivel cuando su padre forma parte de la vista.
- **FR-002**: Los grupos por tipo (Sistema primero, Clínica después) DEBEN mantenerse, y cada submódulo DEBE aparecer dentro del grupo de su padre.
- **FR-003**: Un módulo con al menos un submódulo DEBE mostrar un control para contraer y expandir sus submódulos, expandido de forma inicial, junto con la cantidad de submódulos que tiene. Un módulo sin submódulos NO DEBE mostrar ese control y DEBE verse como hoy.
- **FR-004**: El estado de contraído DEBE ser solo de la pantalla (no se conserva al recargar). Mientras haya una búsqueda, los padres con coincidencias DEBEN mostrarse expandidos y el control de contraer y expandir NO se ofrece (en su lugar solo se indica la cantidad de submódulos); al limpiar la búsqueda, cada padre vuelve al estado que tenía.
- **FR-005**: Los módulos de primer nivel DEBEN ordenarse por su número de orden y luego por nombre, y los submódulos de cada padre, igual entre ellos.
- **FR-006**: Cada fila, de módulo o de submódulo, DEBE conservar lo que hoy muestra y permite: orden, nombre, clave, la marca «Base» de los módulos base, tipo, permisos y la acción «Editar» para quien puede editar.
- **FR-007**: Los contadores del encabezado de cada grupo y de la lista DEBEN distinguir módulos de submódulos. Las filas de contexto NO DEBEN contarse.
- **FR-008**: La búsqueda por nombre o clave y el filtro de tipo DEBEN conservar la jerarquía: un submódulo que coincide se muestra bajo su padre (como contexto si el padre no coincide) y un padre que coincide se muestra con todos sus submódulos.
- **FR-009**: En las vistas de estatus («Activos» y «Bloqueados»), un submódulo cuyo padre no forma parte de la vista DEBE mostrarse bajo una fila de contexto de su padre, atenuada, sin acciones y señalada como perteneciente a otra vista.
- **FR-010**: Los formularios de alta y de edición de un módulo DEBEN incluir un campo opcional «Módulo padre», con la opción «Ninguno (módulo de primer nivel)» como valor por defecto. Sus opciones DEBEN ser únicamente módulos de primer nivel, activos, del mismo tipo que el módulo y que no sean módulos base; nunca el propio módulo.
- **FR-011**: En el alta, cambiar el tipo del módulo DEBE limpiar un padre elegido que no sea de ese tipo y actualizar las opciones. En la edición el tipo no cambia, así que las opciones no varían.
- **FR-012**: En la edición, el campo «Módulo padre» DEBE permitir asignar, cambiar o quitar el padre; DEBE estar deshabilitado, con una explicación, cuando el módulo tiene submódulos a la vista o es uno de los módulos base; y DEBE mostrar el padre actual aunque no figure entre las opciones (por ejemplo, un padre Bloqueado).
- **FR-013**: Al guardar un cambio de padre, la lista DEBE actualizarse sin recargar la página y el módulo DEBE verse en su nueva posición, con su nuevo padre expandido.
- **FR-014**: Cuando el servicio rechace un cambio de padre (el padre no existe o fue eliminado, ya es submódulo, es de otro tipo, es el propio módulo, es un módulo base, o el módulo tiene submódulos), la persona DEBE ver un mensaje en español junto al campo «Módulo padre», el formulario DEBE conservar lo escrito y NO DEBE mostrarse texto crudo del servidor.
- **FR-015**: La zona de bloqueo de un módulo con submódulos activos DEBE indicar cuántos quedarán sin disponibilidad al bloquearlo; al bloquearlo o desbloquearlo, la lista DEBE reflejar que sus submódulos dejan de verse entre los activos o vuelven a verse.
- **FR-016**: La acción «Eliminar módulo» NO DEBE estar disponible para un módulo que tenga submódulos a la vista y DEBE explicar que primero hay que eliminar sus submódulos o cambiarlos de padre. Si el servicio rechaza la eliminación porque el módulo tiene submódulos que no se ven en la vista actual, DEBE mostrarse el mismo mensaje y no eliminarse nada.
- **FR-017**: La jerarquía DEBE poder leerse y operarse con teclado y lector de pantalla: el control de contraer y expandir DEBE comunicar su estado y la cantidad de submódulos, cada submódulo DEBE comunicar a qué padre pertenece, y todo DEBE ser operable con Enter o Espacio con el foco visible. En anchos pequeños NO DEBE haber desplazamiento horizontal de la página.
- **FR-018**: Todo lo que no es jerarquía DEBE seguir igual para los módulos de primer nivel: crear, editar, marcar acciones, bloquear, desbloquear, eliminar, filtros y mensajes.
- **FR-019**: Esta feature NO DEBE cambiar la presentación de otras secciones que listan módulos (por ejemplo, «Roles y permisos» y los planes de «Suscripciones»); esas secciones siguen mostrando los módulos que reciben, ahora también los submódulos, como módulos independientes.

### Key Entities

- **Módulo**: Una parte del sistema a la que se dan permisos, con clave, nombre, descripción, orden, tipo (Sistema o Clínica), estatus y las acciones que admite. Puede tener un módulo padre.
- **Módulo de primer nivel**: Un módulo sin padre; puede tener submódulos. Los módulos base de administración son siempre de primer nivel y no tienen submódulos.
- **Submódulo**: Un módulo con padre. Tiene sus propios clave, nombre, orden, estatus y permisos. Es del mismo tipo que su padre y no puede tener submódulos.
- **Relación padre–submódulo**: Un solo nivel, mismo tipo, el padre existe y no está eliminado, y ningún módulo base participa. Si el padre está Bloqueado, sus submódulos no están disponibles sin cambiar su propio estatus.
- **Fila de contexto**: Representación atenuada de un padre que no forma parte de la vista actual, usada solo para ubicar a un submódulo que sí forma parte de ella.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En un catálogo de 40 módulos con 20 submódulos, una persona identifica a qué módulo pertenece cualquier submódulo en menos de 5 segundos, sin leer claves ni abrir ninguna ventana.
- **SC-002**: El 100 % de los submódulos que forman parte de la vista aparecen directamente bajo su padre, con cualquier combinación de tipo, estatus y búsqueda; ninguno aparece suelto como módulo de primer nivel salvo que su padre no forme parte de la vista, y en ese caso aparece bajo una fila de contexto.
- **SC-003**: Una persona puede crear un submódulo, eligiendo su padre en el mismo formulario del alta, en menos de 1 minuto, y asignar o quitar el padre de un módulo existente en menos de 30 segundos.
- **SC-004**: El 100 % de los intentos que incumplen las reglas de la jerarquía (padre de otro tipo, el propio módulo, un submódulo como padre, un módulo base, un módulo con submódulos convertido en submódulo) se evitan en el formulario o terminan en un mensaje claro en español, sin pérdida de lo escrito.
- **SC-005**: Contraer o expandir un módulo con 30 submódulos responde en menos de 1 segundo, y la lista de 200 entradas se muestra sin demoras perceptibles.
- **SC-006**: Todo lo que ofrece la lista (contraer, expandir y editar) se opera por teclado, y las verificaciones automáticas de accesibilidad de la pantalla no reportan violaciones.
- **SC-007**: El 100 % de los escenarios de aceptación de las features de módulos ya entregadas (`013-manage-modules`, `021-dynamic-clinic-modules`, `022-modules-catalog-view-action`) que describen módulos de primer nivel siguen dando el mismo resultado.

## Assumptions

- **Dependencia del servicio de usuarios**: esta feature necesita que el servicio de usuarios entregue el módulo padre de cada módulo y acepte asignarlo al crear y modificar, tal como define su spec `017-module-submodules` (versión 5.4.0 del servicio). Cuando se redactó esta spec esa implementación estaba en curso y la versión publicada seguía siendo la 5.3.0; el 2026-11-02 ya está en el repositorio del servicio (commit `2e17ecb`, versión 5.4.0), pero esta feature no se puede probar de punta a punta hasta que esa versión esté desplegada en el entorno que se use. El Backoffice exige esa versión: el campo del módulo padre es obligatorio en las respuestas del servicio, así que debe desplegarse primero el servicio y después el Backoffice.
- **Alcance**: la jerarquía se presenta y se administra en la sección «Módulos» (la lista y el formulario de alta y edición). «Roles y permisos», los planes de «Suscripciones» y el resto de las secciones siguen mostrando los módulos en lista plana, ahora incluidos los submódulos; presentarlos anidados allí sería otra feature.
- **Padres ofrecidos**: en los formularios solo se ofrecen como padre los módulos de primer nivel **activos**. El servicio también admite un padre Bloqueado, pero el Backoffice no lo ofrece; si un submódulo ya lo tiene, se muestra como valor actual (FR-012).
- **Un solo nivel y sin reordenar arrastrando**: no hay terceros niveles ni arrastrar y soltar; el orden de un submódulo entre sus hermanos se cambia con el campo «Orden», como hoy.
- **Sin botón aparte**: no hay un botón «Nuevo submódulo»; un submódulo se crea con el botón «Nuevo módulo» eligiendo su padre.
- **Misma lista, mismos datos**: el árbol se arma con la misma consulta del catálogo que la pantalla ya usa, que trae cada módulo con su padre; los módulos y submódulos no se paginan (el catálogo es pequeño, de hasta unos 200 activos).
- **Estatus**: un submódulo Activo con padre Bloqueado no aparece en la lista, ni entre los activos ni entre los bloqueados, hasta que el padre se desbloquee (así lo entrega el servicio).
- **Lo existente**: los textos, la marca «Base», las acciones de cada módulo, el bloqueo y la eliminación de un módulo sin submódulos, los filtros y los permisos de acceso a la sección no cambian.
- **Fuera de alcance**: cambiar los permisos o roles que dan acceso a la sección, el catálogo de acciones, y validar que un plan de suscripción que incluya un submódulo incluya también a su padre (eso corresponde al servicio de suscripciones).
