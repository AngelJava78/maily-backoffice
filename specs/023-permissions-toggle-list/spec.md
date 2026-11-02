# Feature Specification: Permisos de un role como lista con botones de alternancia

**Feature Branch**: `023-permissions-toggle-list`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Quiero que los roles y permisos se muestren en forma de lista y que tengan botones «Toggle Buttons»." Acompañada de dos capturas: la pantalla actual de «Roles y permisos» y, como referencia visual de los botones, el grupo de botones de «Tipo» y «Estatus» de la pantalla de Módulos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los permisos de un role como una lista de módulos con botones (Priority: P1)

Una persona con acceso a «Roles y permisos» elige un role y, en vez de la tabla de casillas «Módulo × Ver / Crear / Modificar / Eliminar», ve una lista en la que cada módulo es un elemento con su nombre y, junto a él, un botón de alternancia por cada acción que ese módulo tiene disponible. Un botón pulsado significa que el role tiene esa acción concedida; uno sin pulsar, que no la tiene. Los botones se ven igual que los grupos de botones de «Tipo» y «Estatus» de la pantalla de Módulos.

**Why this priority**: Es el cambio pedido y la base de todo lo demás: sin la lista no hay botones que pulsar. Se entrega junto con la Historia 2, porque la lista reemplaza a la tabla que hoy permite editar.

**Independent Test**: Con un role que tiene permisos concedidos en varios módulos, abrir su detalle y comprobar que cada módulo aparece como un elemento de la lista, que solo muestra sus acciones disponibles y que el estado de cada botón coincide con lo concedido y con el contador «X de Y permisos».

**Acceptance Scenarios**:

1. **Given** un role seleccionado, **When** se carga su detalle, **Then** sus permisos se muestran como una lista con un elemento por módulo, en el mismo orden que tenía la tabla, y ya no como una tabla de casillas.
2. **Given** un módulo que en el catálogo solo tiene algunas acciones (por ejemplo, Ver y Modificar), **When** se muestra su elemento, **Then** solo aparecen los botones de esas acciones, en el orden Ver, Crear, Modificar, Eliminar, sin huecos ni botones inactivos para las que no tiene.
3. **Given** un role con ciertas acciones concedidas, **When** se muestra la lista, **Then** los botones de las acciones concedidas se ven pulsados y los demás sin pulsar, y la cantidad de botones de acción pulsados coincide con el «X» de «X de Y permisos».
4. **Given** un role de Clínica que también recibe módulos de Sistema, **When** se muestra la lista, **Then** los módulos siguen agrupados bajo un encabezado por tipo («Módulos de Clínica», «Módulos de Sistema»); un role de Sistema no muestra encabezados.
5. **Given** una persona que no tiene permiso para editar roles, **When** abre el detalle de un role, **Then** ve el estado de cada botón pero no puede cambiarlo, y los botones se distinguen visualmente de los que simplemente están sin pulsar.
6. **Given** que el catálogo no tiene módulos para el tipo del role, **When** se muestra el detalle, **Then** en lugar de la lista aparece el mensaje de que ese tipo todavía no tiene módulos.
7. **Given** que falla la carga de los permisos, **When** se muestra el detalle, **Then** en el lugar de la lista aparece un error con la opción de reintentar, y el nombre, la descripción y las acciones del role siguen visibles.

---

### User Story 2 - Conceder y retirar permisos con los botones (Priority: P1)

Una persona con permiso para editar roles pulsa y despulsa los botones de acción de uno o varios módulos para cambiar lo que el role puede hacer. Los cambios quedan pendientes y se guardan o se descartan todos juntos, igual que hoy.

**Why this priority**: Editar permisos es el propósito del módulo; los botones sustituyen a las casillas y deben hacer exactamente lo mismo, con las mismas reglas.

**Independent Test**: Con un role editable, pulsar y despulsar acciones de varios módulos, comprobar el contador, guardar y volver a abrir el role para ver que el estado persiste; repetir y descartar para ver que todo vuelve al último estado guardado.

**Acceptance Scenarios**:

1. **Given** un módulo cuyo botón de una acción está sin pulsar, **When** la persona lo pulsa, **Then** el botón queda pulsado y el contador «X de Y permisos» sube en uno de inmediato, sin guardar todavía.
2. **Given** un módulo con «Ver» sin pulsar, **When** la persona pulsa «Crear», «Modificar» o «Eliminar», **Then** «Ver» se pulsa también en ese módulo.
3. **Given** un módulo con varias acciones pulsadas, **When** la persona despulsa «Ver», **Then** se despulsan también todas las demás acciones de ese módulo.
4. **Given** una persona que pulsó un botón, **When** lo vuelve a pulsar y deja la acción como estaba al último guardado, **Then** ya no hay cambio pendiente por ese botón (si era el único, «Guardar cambios» deja de estar disponible).
5. **Given** cambios pendientes en los permisos, **When** la persona pulsa «Guardar cambios», **Then** los botones y el contador quedan con el nuevo estado, que se conserva al volver a entrar.
6. **Given** cambios pendientes en los permisos, **When** la persona pulsa «Descartar cambios», **Then** todos los botones vuelven al estado del último guardado.
7. **Given** cambios pendientes, **When** la persona cambia de role o de pestaña, o intenta salir de la sección, **Then** recibe el aviso de cambios sin guardar de siempre.
8. **Given** que se está guardando, **When** la operación está en curso, **Then** ningún botón de la lista admite cambios hasta que termine.

---

### User Story 3 - Conceder o retirar de una vez todas las acciones de un módulo (Priority: P2)

Cada elemento de la lista ofrece, junto a sus botones de acción, un botón «Todo el módulo» que concede o retira de una vez todas las acciones que ese módulo tiene disponibles.

**Why this priority**: Ahorra pulsaciones al configurar roles amplios (como un administrador) y ya existe en la tabla actual; debe conservarse, pero el role se puede configurar sin él acción por acción.

**Independent Test**: En un módulo con varias acciones, pulsar «Todo el módulo» y comprobar que todas quedan pulsadas; pulsarlo de nuevo y comprobar que todas quedan sin pulsar.

**Acceptance Scenarios**:

1. **Given** un módulo con alguna acción sin pulsar, **When** la persona pulsa «Todo el módulo», **Then** quedan pulsadas todas las acciones que ese módulo tiene disponibles (y ninguna otra).
2. **Given** un módulo con todas sus acciones pulsadas, **When** la persona pulsa «Todo el módulo», **Then** todas quedan sin pulsar.
3. **Given** un módulo con algunas acciones pulsadas y otras no, **When** se muestra su elemento, **Then** «Todo el módulo» se ve sin pulsar; cuando la persona pulsa la última acción que faltaba, «Todo el módulo» pasa a verse pulsado por sí solo.

---

### User Story 4 - Usar la lista con teclado, lector de pantalla y en pantallas angostas (Priority: P3)

Cualquier persona, sin importar cómo interactúe con la pantalla, puede leer y cambiar los permisos de un role con la lista de botones.

**Why this priority**: Es un requisito de calidad transversal del Backoffice, no un flujo nuevo; las historias anteriores ya entregan el valor central.

**Independent Test**: Recorrer la lista solo con el teclado y con un lector de pantalla; reducir el ancho de la ventana hasta el mínimo admitido.

**Acceptance Scenarios**:

1. **Given** el foco en la lista, **When** la persona navega con el teclado, **Then** puede llegar a cada botón (entrando con Tab al grupo de cada módulo y moviéndose entre sus acciones con las flechas) y alternarlo con Espacio o Enter, con el foco siempre visible.
2. **Given** un lector de pantalla, **When** se recorre un botón de acción, **Then** anuncia la acción, el módulo y si está pulsado o no (por ejemplo, «Ver de Pacientes, pulsado»).
3. **Given** una ventana angosta, **When** se muestra la lista, **Then** el nombre de cada módulo y sus botones se reacomodan en varias líneas, sin desplazamiento horizontal de la página y sin texto cortado.

---

### Edge Cases

- Un módulo sin ninguna acción disponible se muestra solo con su nombre, sin botones ni «Todo el módulo».
- Un módulo con una sola acción muestra ese botón y también «Todo el módulo», para que todos los elementos se comporten igual.
- A diferencia de los filtros de «Tipo» y «Estatus» de Módulos, los botones de acción no son excluyentes: un módulo puede tener ninguno, algunos o todos pulsados.
- Un role sin ningún permiso concedido muestra todos los botones sin pulsar; no debe confundirse con un estado de carga o de error.
- Los nombres de módulo largos se reacomodan en varias líneas sin tapar ni desplazar los botones.
- Una lista con muchos módulos se recorre con el desplazamiento normal de la página; no se pagina ni se oculta ningún módulo.
- Si el guardado de permisos solo se aplica en parte, el aviso y el reintento se comportan como ya define la feature `014-roles-permisos` (FR-018); los botones reflejan los mismos datos que reflejaba la tabla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El detalle de un role DEBE mostrar sus permisos como una lista con un elemento por módulo del tipo que corresponde al role (incluidos los módulos de Sistema que un role de Clínica puede recibir), en lugar de la tabla de casillas.
- **FR-002**: Cada elemento DEBE mostrar el nombre del módulo y un botón de alternancia por cada acción que ese módulo tiene disponible, en el orden Ver, Crear, Modificar, Eliminar; las acciones que el módulo no tiene NO DEBEN mostrarse ni dejar un hueco o un botón inactivo.
- **FR-003**: Cada botón de acción DEBE tener dos estados visibles, pulsado (acción concedida) y sin pulsar (no concedida), y DEBE reflejar siempre el permiso concedido o, si lo hay, el cambio pendiente. Los botones de un mismo módulo son independientes entre sí: pueden estar pulsados ninguno, algunos o todos.
- **FR-004**: Pulsar un botón DEBE alternar su estado como un cambio pendiente (sin guardar todavía) y el contador «X de Y permisos» DEBE actualizarse de inmediato; «X» cuenta solo botones de acción pulsados, nunca el botón «Todo el módulo».
- **FR-005**: La regla de dependencia de «Ver» DEBE mantenerse: pulsar Crear, Modificar o Eliminar pulsa también Ver en ese módulo, y despulsar Ver despulsa las demás acciones de ese módulo. El resultado DEBE verse en los botones en el mismo instante.
- **FR-006**: Cada elemento con al menos una acción DEBE incluir un botón «Todo el módulo» que concede o retira de una vez todas las acciones disponibles de ese módulo, y solo esas. Su estado DEBE verse pulsado únicamente cuando todas las acciones del módulo están pulsadas.
- **FR-007**: Guardar, descartar, avisar antes de perder cambios sin guardar y conservar lo aplicado cuando un guardado se cumple solo en parte DEBEN seguir funcionando exactamente como hoy; esta feature no cambia esas reglas, solo el control con el que se editan los permisos.
- **FR-008**: Para una persona sin permiso para editar roles, y mientras haya un guardado en curso, los botones DEBEN mostrar su estado pero no admitir cambios, con una apariencia que los distinga de los botones simplemente sin pulsar.
- **FR-009**: Los encabezados que agrupan los módulos por tipo cuando un role de Clínica también muestra módulos de Sistema DEBEN mantenerse; un role con módulos de un solo tipo no los muestra.
- **FR-010**: Los estados de cargando, vacío («Este tipo todavía no tiene módulos en el catálogo») y error con reintento DEBEN mantenerse y afectar solo a la zona de permisos, sin ocultar el nombre, la descripción ni las acciones del role.
- **FR-011**: Cada botón DEBE tener un nombre accesible que indique la acción y el módulo (por ejemplo, «Ver de Pacientes»), DEBE exponer a las tecnologías de apoyo si está pulsado o no, y DEBE poder alternarse con el teclado. El estado pulsado DEBE distinguirse también sin depender solo del color: un botón pulsado lleva una marca de verificación visible, y un botón no editable la conserva.
- **FR-012**: Los botones DEBEN tener la misma forma de grupo segmentado, el mismo tamaño y la misma tipografía que los botones de alternancia ya usados en las pantallas de Módulos y de Suscripciones, y el mismo aspecto de estado pulsado salvo por la marca de verificación que exige FR-011, para que la pantalla se vea parte del mismo producto.
- **FR-013**: En anchos de pantalla pequeños, el nombre de cada módulo y sus botones DEBEN reacomodarse en varias líneas, sin desplazamiento horizontal de la página y sin texto cortado.
- **FR-014**: El texto de ayuda de la tabla (hoy solo su nombre accesible, redactado con «marcar» y casillas) DEBE reformularse para los botones, mostrarse a la vista encima de la lista y seguir explicando que crear, modificar o eliminar también requiere Ver. El texto de la pantalla de creación de un role que habla de «la tabla» DEBE decir «la lista».
- **FR-015**: Esta feature NO DEBE cambiar la lista de roles de la izquierda (pestañas Clínica y Sistema, nombre, descripción, contador de permisos y «Nuevo role»), ni crear, duplicar o eliminar roles, ni la asignación de roles a personas, ni los permisos necesarios para ver o editar esta sección.

### Key Entities

- **Elemento de módulo**: Cada fila de la lista de permisos de un role. Representa un módulo con las acciones que realmente tiene y, por cada una, si el role la tiene concedida (botón pulsado) o no (botón sin pulsar).
- **Role, Módulo, Acción y Permiso concedido**: Sin cambios respecto a la feature `014-roles-permisos`; esta feature solo cambia cómo se presentan y cómo se editan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En un role con 20 módulos, una persona localiza si un módulo concreto tiene concedida una acción concreta en menos de 10 segundos, sin desplazamiento horizontal en ningún ancho de pantalla admitido.
- **SC-002**: Conceder o retirar una acción individual toma una sola pulsación, y conceder o retirar todas las acciones de un módulo toma una sola pulsación sobre «Todo el módulo».
- **SC-003**: El 100 % de los escenarios de aceptación de la feature `014-roles-permisos` y de `015-clinic-roles-system-modules` que describen la edición de permisos (dependencia de Ver, «Todo el módulo», guardar, descartar, aviso de cambios sin guardar y guardado parcial) siguen dando el mismo resultado con la nueva presentación.
- **SC-004**: El contador «X de Y permisos» coincide en el 100 % de los casos con la cantidad de botones de acción pulsados y con el total de acciones mostradas, antes y después de guardar.
- **SC-005**: Ningún role queda guardado con Crear, Modificar o Eliminar concedidos sin Ver, en ninguna secuencia de pulsaciones.
- **SC-006**: La lista completa se opera con teclado en el 100 % de sus controles, y las verificaciones automáticas de accesibilidad de la pantalla no reportan violaciones.
- **SC-007**: En una revisión visual, los botones de la lista son indistinguibles en forma, tamaño y tipografía de los de «Tipo» y «Estatus» de Módulos, y en el estado pulsado solo se diferencian por la marca de verificación de FR-011.

## Assumptions

- «Los roles y permisos… en forma de lista… con botones» se interpreta como los **permisos de un role** (hoy una tabla de casillas Módulo × acción). La lista de roles de la izquierda ya es una lista y no cambia.
- Las capturas son la pantalla actual de «Roles y permisos» y la referencia visual de los botones (el grupo de «Tipo» y «Estatus» de Módulos). Que los botones sean no excluyentes es una decisión de esta spec, porque los permisos de un módulo son independientes entre sí.
- La lista **reemplaza** a la tabla; no se ofrece un selector para alternar entre ambas vistas.
- Los datos, las reglas de negocio, las operaciones contra la API, los textos de las acciones («Ver», «Crear», «Modificar», «Eliminar», «Todo el módulo») y el orden de los módulos no cambian; es un cambio de presentación y de control de edición.
- Pulsar un botón no guarda por sí solo: los cambios siguen siendo pendientes hasta «Guardar cambios», como con las casillas.
- Se conserva «Todo el módulo» como un botón más de cada elemento (en lugar de la casilla de la última columna), porque la feature `014-roles-permisos` (FR-009) lo exige.
- Depende de las features `014-roles-permisos` y `015-clinic-roles-system-modules` (comportamiento que se conserva) y de `008-design-system` y de los botones de alternancia de Módulos y Suscripciones (apariencia).
- Fuera de alcance: cambios en la lista de roles, en el alta, duplicado y baja de roles, en la asignación de roles a personas, en el catálogo de módulos y acciones, y en cualquier contrato con las APIs.
