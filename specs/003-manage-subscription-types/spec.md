# Feature Specification: Administración de Suscripciones

**Feature Branch**: `003-manage-subscription-types`

**Created**: 2026-10-17

**Updated**: 2026-10-20

**Status**: Draft

**Input**: User description: "Un CRUD de suscripciones dentro del backoffice. Las suscripciones son los planes que MailySoft ofrece a las clínicas; la constitución las llama «tipos de suscripción» y se trata del mismo recurso. El CRUD incluye listar, ver el detalle, crear, modificar, cambiar el estatus y eliminar. La opción de navegación y el título de la sección se llaman «Suscripciones», y la spec debe usar esa terminología. Sigue el mismo patrón que la sección Usuarios (feature 002): listado paginado, detalle, formulario compartido para crear y editar, y eliminación con diálogo de confirmación." Alcance heredado de la descripción original del proyecto: "podrá administrar los tipos de suscripciones de MailySoft", donde "Administrar = Listar, Mostrar, Crear, Modificar, Eliminar".

Ajuste del 2026-10-20: alinear la spec con la API de suscripciones ya implementada, cuyo contrato es la fuente de verdad; los datos son definitivos (nombre, descripción, precio mensual en pesos mexicanos, lo que incluye, estatus, número de clínicas y fechas); se añade cambiar el estatus entre Activa, Inactiva y Bloqueada; eliminar es una baja lógica que la plataforma rechaza si la suscripción tiene clínicas asignadas o si no puede comprobarlo; el listado tiene un orden fijo (primero las Activas y después las Inactivas y Bloqueadas, cada grupo por precio mensual) y se ordena y pagina sobre el catálogo completo; gana el último cambio, sin detección de ediciones ajenas; y cada rechazo de la plataforma se traduce, según su código, a un mensaje propio en español.

## Clarifications

### Session 2026-10-20

- Q: ¿Cómo se presenta y se ordena el listado de suscripciones? → A: En una tabla paginada con 10 filas por defecto y opciones de 25 y 50, el total y la página actual, con las columnas nombre (enlace al detalle), precio mensual, estatus y número de clínicas, y el botón «Nueva suscripción». El orden es fijo y el operador no puede cambiarlo: primero todas las Activas, de menor a mayor precio mensual; después, en un solo grupo, las Inactivas y las Bloqueadas (y cualquier estatus desconocido), también de menor a mayor precio; dentro de cada grupo, los empates de precio se ordenan por nombre. Como la plataforma devuelve el catálogo completo sin paginar, se ordena y se pagina sobre el catálogo ya obtenido (desviación del principio IV de la constitución que impone el contrato; ver Assumptions).
- Q: ¿Cómo se muestra el estatus? → A: Con un chip que lleva el texto del estatus y un color distinto para Activa, Inactiva y Bloqueada. Las filas no se atenúan, para cumplir el contraste mínimo de WCAG 2.1 AA: el estatus lo comunica solo el chip, que nunca depende únicamente del color.
- Q: ¿Qué muestra el detalle y dónde están las acciones? → A: Todos los datos, incluida la lista completa de lo que incluye y las fechas. Ahí, y solo ahí, están las acciones Editar, Cambiar estatus y Eliminar, cada una visible únicamente para quien tiene el permiso correspondiente. Al volver al listado, el operador regresa a la página en la que estaba.
- Q: ¿Cómo funcionan el alta y la edición? → A: Cada una tiene su propia pantalla y su propia dirección, y ambas comparten el mismo formulario. En «lo que incluye» se pueden agregar, editar y quitar elementos, pero no reordenarlos: el orden es el de captura, y al llegar a 20 elementos ya no se pueden agregar más. Si se guarda con éxito, el operador va al detalle de la suscripción y ve una notificación de éxito; si cancela, no se guarda nada.
- Q: ¿Cómo se cambia el estatus? → A: Solo se ofrecen los estatus distintos del actual. Inactivar y Bloquear piden una confirmación que nombra la suscripción y el nuevo estatus; Activar se aplica directamente, con una notificación de éxito.
- Q: ¿Cuándo se puede eliminar una suscripción? → A: Si su número de clínicas es mayor que 0, la acción aparece deshabilitada y se muestra el motivo («Tiene N clínicas asignadas»). Si el número es «No disponible», la acción se ofrece y la plataforma decide. La confirmación nombra la suscripción y, si la eliminación tiene éxito, el operador vuelve al listado con una notificación de éxito.
- Q: En el listado, ¿los dos grupos (primero las Activas; después las Inactivas y las Bloqueadas) solo determinan el orden de las filas, o deben verse separados en la tabla? → A: Solo determinan el orden: es una sola tabla con las filas ordenadas por grupo, sin encabezados ni separadores; la etiqueta de estatus distingue cada fila.
- Q: Al capturar el precio mensual en el formulario, ¿qué debe aceptar el campo además de los dígitos: solo el punto decimal, o también comas de miles y el signo «$»? → A: Solo dígitos con punto decimal opcional y hasta dos decimales (por ejemplo, «4500» o «4500.50»); comas, «$» u otros caracteres muestran un error junto al campo.
- Q: Al editar una suscripción, si el operador pulsa «Guardar» sin haber cambiado ningún dato, ¿qué debe pasar? → A: No se envía nada y el operador vuelve al detalle con el aviso de que no había cambios que guardar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar suscripciones: listado y detalle (Priority: P1)

Un operador revisa las suscripciones —los planes que MailySoft ofrece a las clínicas— en un listado paginado con un orden fijo, en el que las Activas van primero, y abre el detalle de cualquiera de ellas para ver todos sus datos.

**Why this priority**: Conocer la oferta vigente es la base para administrarla: antes de crear, cambiar o eliminar una suscripción hay que poder ver qué existe.

**Independent Test**: Con más de 10 suscripciones registradas, de los tres estatus y con algunos precios repetidos, abrir la sección Suscripciones, recorrer las páginas comprobando el orden (Activas primero; cada grupo de menor a mayor precio y, a igualdad, por nombre) y abrir el detalle de una; verificar que los datos coinciden con los de la plataforma.

**Acceptance Scenarios**:

1. **Given** más de 10 suscripciones registradas, **When** el operador abre la sección Suscripciones, **Then** ve las 10 primeras según el orden fijo, cada una con su nombre, su precio mensual, su estatus y su número de clínicas, junto con el total de suscripciones, la página actual y controles para avanzar o retroceder de página; las filas no tienen acciones, porque editar, cambiar el estatus y eliminar se hacen desde el detalle.
2. **Given** el listado, **When** el operador elige ver 25 o 50 suscripciones por página, **Then** el listado se actualiza con ese tamaño y vuelve a la primera página.
3. **Given** suscripciones Activas, Inactivas y Bloqueadas con distintos precios, **When** el operador recorre el listado, **Then** ve primero todas las Activas, de menor a mayor precio mensual, y después las Inactivas y las Bloqueadas en un solo grupo, también de menor a mayor precio; a igualdad de precio dentro de un grupo, por nombre; los grupos no se separan con encabezados ni filas separadoras, y no tiene forma de cambiar ese orden.
4. **Given** suscripciones de los tres estatus, **When** el operador las ve en el listado o en su detalle, **Then** cada estatus aparece como una etiqueta con su nombre y un color propio, y ninguna fila se ve atenuada.
5. **Given** el listado, **When** el operador selecciona el nombre de una suscripción, **Then** ve su detalle con todos sus datos: nombre, descripción, precio mensual, la lista completa de lo que incluye en el orden guardado, estatus, número de clínicas y fechas de creación y de última modificación en su hora local; el precio y el estatus aparecen con el mismo formato que en el listado.
6. **Given** una suscripción con un precio mensual de 4500, **When** el operador la ve en el listado o en su detalle, **Then** el precio aparece como «$4,500.00/mes».
7. **Given** una suscripción cuyo número de clínicas la plataforma informa como no disponible, **When** el operador la ve en el listado o en su detalle, **Then** el número aparece como «No disponible», nunca como 0.
8. **Given** el detalle de una suscripción abierto desde la página 2 del listado, **When** el operador vuelve al listado, **Then** regresa a la página 2, con el mismo tamaño de página.
9. **Given** que no hay suscripciones registradas, **When** el operador abre la sección, **Then** ve un estado vacío con la acción «Nueva suscripción», si tiene permiso para crear.
10. **Given** que la plataforma tarda o no responde, **When** el operador abre la sección o el detalle de una suscripción, **Then** ve un indicador de carga mientras espera y, si la consulta falla, un mensaje de error comprensible con la opción de reintentar.
11. **Given** una suscripción que no existe o fue eliminada (por ejemplo, una dirección con un identificador inexistente), **When** el operador intenta abrir su detalle, **Then** ve un mensaje de «no encontrada» con un enlace al listado.
12. **Given** un operador con sesión iniciada, **When** mira la navegación, **Then** ve la opción «Suscripciones» solo si `subscriptions:read` está entre los permisos de sus roles activos.
13. **Given** una persona sin sesión, sin acceso autorizado o sin el permiso `subscriptions:read`, **When** abre directamente la dirección de la sección Suscripciones, **Then** no ve ningún dato de suscripciones y se le aplica el flujo de acceso o de falta de permisos de la feature 001-auth-session-profile.
14. **Given** un operador que tiene `subscriptions:read` pero no `subscriptions:write`, `subscriptions:update` ni `subscriptions:delete`, **When** abre el listado y el detalle de una suscripción, **Then** puede consultarlos y no ve las acciones «Nueva suscripción», «Editar», «Cambiar estatus» ni «Eliminar».

---

### User Story 2 - Crear una suscripción (Priority: P1)

Un operador da de alta una nueva suscripción con su nombre, su descripción (opcional), su precio mensual y lo que incluye. La suscripción nace Activa.

**Why this priority**: Lanzar nuevas ofertas es parte central de la administración comercial de MailySoft y el principal motivo para tener esta sección.

**Independent Test**: Crear una suscripción con nombre, precio y tres elementos en «lo que incluye» y verificar que el operador llega a su detalle con una notificación de éxito, que la suscripción nace Activa y que aparece en el listado con los valores capturados; intentar crear otra con el mismo nombre escrito en otras mayúsculas y verificar que se rechaza junto al campo nombre.

**Acceptance Scenarios**:

1. **Given** un operador con `subscriptions:write` en el listado, **When** elige «Nueva suscripción», **Then** ve el formulario de alta en su propia pantalla, con nombre, descripción, precio mensual y «lo que incluye», y sin ningún campo de estatus.
2. **Given** el formulario de alta, **When** el operador completa datos válidos y guarda, **Then** la suscripción se crea con estatus Activa, el operador llega a su detalle con una notificación de éxito y la suscripción aparece en el listado con los valores capturados.
3. **Given** el formulario, **When** el operador agrega tres elementos a «lo que incluye», edita el segundo, quita el primero y guarda, **Then** la suscripción incluye los dos elementos restantes, en el orden en que se capturaron.
4. **Given** 20 elementos en «lo que incluye», **When** el operador intenta agregar otro, **Then** no puede hacerlo y ve que se alcanzó el máximo de 20; al quitar uno, puede volver a agregar.
5. **Given** un nombre vacío o de más de 100 caracteres, una descripción de más de 500, un precio negativo, con más de dos decimales, mayor que 99,999,999.99, no numérico o escrito con comas o con «$» (por ejemplo, «4,500» o «$4500»), o un elemento de «lo que incluye» vacío o de más de 150 caracteres, **When** el operador intenta guardar, **Then** ve el error junto a cada campo afectado y no se crea la suscripción.
6. **Given** un nombre que ya usa otra suscripción no eliminada, aunque difiera en mayúsculas o en espacios al inicio o al final (por ejemplo, « pro » frente a «Pro»), **When** el operador intenta guardar, **Then** ve junto al campo nombre que ese nombre ya está en uso y no se crea un duplicado.
7. **Given** el formulario de alta con datos capturados, **When** el operador cancela, **Then** no se crea nada y vuelve al listado.
8. **Given** que la plataforma no responde al guardar, **When** el operador guarda, **Then** ve un error con la opción de reintentar, conserva lo que escribió y la suscripción no se da por creada.
9. **Given** que el operador acciona «Guardar» varias veces seguidas mientras la operación está en curso, **When** la operación termina, **Then** solo se creó una suscripción.
10. **Given** un operador sin `subscriptions:write`, **When** abre la sección, **Then** no ve «Nueva suscripción» y, si abre directamente la dirección del alta, ve que no tiene permiso para esa acción y no puede crear.

---

### User Story 3 - Modificar una suscripción (Priority: P2)

Un operador corrige o actualiza el nombre, la descripción, el precio mensual o lo que incluye de una suscripción existente.

**Why this priority**: Los precios y lo que incluye cada plan cambian con el tiempo; es necesario para mantener la oferta vigente, pero depende de poder crear y consultar suscripciones.

**Independent Test**: Editar solo el precio de una suscripción de prueba y verificar que el detalle y el listado muestran el nuevo precio (y su nueva posición en el orden) y que los demás datos no cambiaron; repetir cancelando la edición y verificar que no cambia nada.

**Acceptance Scenarios**:

1. **Given** el detalle de una suscripción, **When** el operador con `subscriptions:update` elige «Editar», **Then** ve en su propia pantalla el mismo formulario del alta con los valores actuales, incluidos los elementos de «lo que incluye» en su orden, y sin ningún campo de estatus.
2. **Given** el formulario de edición, **When** el operador cambia datos válidos y guarda, **Then** los cambios se guardan, el operador llega al detalle con una notificación de éxito y los cambios se reflejan en el detalle y en el listado (incluida, si cambió el precio, su nueva posición en el orden).
3. **Given** el formulario de edición con cambios, **When** el operador cancela, **Then** no se guarda ningún cambio y vuelve al detalle.
4. **Given** el formulario de edición sin ningún cambio, **When** el operador guarda, **Then** no se envía nada a la plataforma y vuelve al detalle con el aviso de que no había cambios que guardar.
5. **Given** datos inválidos o un nombre que ya usa otra suscripción, **When** el operador guarda, **Then** ve el error junto al campo afectado y la suscripción conserva sus valores anteriores.
6. **Given** el formulario de edición de una suscripción llamada «pro», **When** el operador cambia solo las mayúsculas de su nombre a «Pro» y guarda, **Then** el cambio se acepta.
7. **Given** que otra persona cambió el precio de la suscripción después de que el operador abrió el formulario, **When** el operador cambia solo la descripción y guarda, **Then** se guarda la nueva descripción y se conserva el precio que puso la otra persona, porque solo se envía lo que cambió; si ambos cambiaron el mismo dato, queda el del último en guardar.
8. **Given** que otra persona eliminó la suscripción después de que el operador abrió el formulario, **When** el operador guarda, **Then** ve que la suscripción ya no existe, con la opción de volver al listado, y no se guarda nada.
9. **Given** que al operador le retiraron `subscriptions:update` después de abrir el formulario, **When** guarda, **Then** ve el estado «sin permisos» para esa acción, su sesión sigue abierta y no se guarda nada.
10. **Given** un operador sin `subscriptions:update`, **When** abre el detalle de una suscripción, **Then** no ve «Editar» y, si abre directamente la dirección de edición, ve que no tiene permiso para esa acción y no puede modificarla.

---

### User Story 4 - Cambiar el estatus de una suscripción (Priority: P2)

Un operador cambia el estatus de una suscripción entre Activa, Inactiva y Bloqueada: la inactiva para retirarla de la oferta, la bloquea para suspenderla o la vuelve a activar.

**Why this priority**: Es la forma de retirar o suspender un plan sin perder su historial ni quitárselo a las clínicas que ya lo tienen; es más frecuente y menos drástica que eliminar y no depende de modificar sus datos.

**Independent Test**: Con una suscripción Activa de prueba, inactivarla confirmando el diálogo, bloquearla y volver a activarla, comprobando cada vez su estatus en el detalle y su grupo en el listado; pedir un estatus que otra persona ya aplicó y comprobar que se muestra el motivo y se actualiza el dato; con una cuenta sin `subscriptions:update`, comprobar que la acción no aparece.

**Acceptance Scenarios**:

1. **Given** el detalle de una suscripción, **When** el operador con `subscriptions:update` elige «Cambiar estatus», **Then** se le ofrecen solo los estatus distintos del actual entre Activa, Inactiva y Bloqueada.
2. **Given** una suscripción Activa, **When** el operador elige Inactiva, **Then** ve una confirmación que nombra la suscripción y el nuevo estatus; al confirmar, la suscripción queda Inactiva, el operador ve una notificación de éxito, el detalle muestra el nuevo estatus y, en el listado, la suscripción pasa al grupo de las Inactivas y Bloqueadas.
3. **Given** una suscripción Activa o Inactiva, **When** el operador elige Bloqueada y confirma, **Then** la suscripción queda Bloqueada y el operador ve una notificación de éxito; del mismo modo, una Bloqueada puede pasar a Inactiva.
4. **Given** la confirmación para inactivar o bloquear, **When** el operador cancela, **Then** no cambia nada.
5. **Given** una suscripción Inactiva o Bloqueada, **When** el operador elige Activa, **Then** el cambio se aplica sin confirmación, el operador ve una notificación de éxito y, en el listado, la suscripción vuelve al grupo de las Activas.
6. **Given** una suscripción con clínicas asignadas, **When** el operador la inactiva o la bloquea y confirma, **Then** el cambio se permite y las clínicas conservan la suscripción.
7. **Given** que otra persona ya le dio a la suscripción el estatus que el operador pide, **When** el operador confirma el cambio, **Then** ve el motivo del rechazo (la suscripción ya tiene ese estatus) y la pantalla se actualiza con el estatus vigente.
8. **Given** que otra persona eliminó la suscripción, **When** el operador intenta cambiar su estatus, **Then** ve que la suscripción ya no existe, con la opción de volver al listado.
9. **Given** la confirmación de un cambio de estatus, **When** el operador la pulsa varias veces seguidas, **Then** el cambio se envía una sola vez y no aparece el rechazo de que la suscripción ya tiene ese estatus.
10. **Given** un operador sin `subscriptions:update`, **When** abre el detalle de una suscripción, **Then** no ve la acción «Cambiar estatus».

---

### User Story 5 - Eliminar una suscripción (Priority: P3)

Un operador elimina una suscripción que MailySoft ya no ofrece y que ninguna clínica tiene asignada. La baja es lógica y no se puede deshacer desde el backoffice: la suscripción deja de aparecer y su nombre queda libre.

**Why this priority**: Es una acción de alto impacto, poco frecuente y sin vuelta atrás; se entrega al final y con las máximas protecciones.

**Independent Test**: Eliminar una suscripción de prueba sin clínicas confirmando el diálogo y verificar que deja de aparecer en el listado y que su nombre puede usarse en una nueva; repetir cancelando y verificar que no cambia nada; abrir una suscripción con clínicas y verificar que la acción aparece deshabilitada con el motivo.

**Acceptance Scenarios**:

1. **Given** el detalle de una suscripción sin clínicas asignadas, **When** el operador con `subscriptions:delete` elige «Eliminar», **Then** ve un diálogo de confirmación que nombra la suscripción, advierte que la eliminación no se puede deshacer y ofrece confirmar o cancelar.
2. **Given** el diálogo de confirmación, **When** el operador confirma, **Then** la suscripción se elimina, el operador vuelve al listado con una notificación de éxito y la suscripción ya no aparece en él ni cuenta en su total.
3. **Given** el diálogo de confirmación, **When** el operador cancela, **Then** no cambia nada.
4. **Given** una suscripción con clínicas asignadas (por ejemplo, 3), **When** el operador abre su detalle, **Then** la acción «Eliminar» aparece deshabilitada y se muestra el motivo: «Tiene 3 clínicas asignadas».
5. **Given** una suscripción cuyo número de clínicas es «No disponible», **When** el operador abre su detalle, **Then** la acción «Eliminar» se ofrece y, si confirma, decide la plataforma (escenarios 2, 6 y 7).
6. **Given** que la plataforma rechaza la eliminación porque la suscripción tiene clínicas asignadas (por ejemplo, porque su número no estaba disponible o porque se le asignó una clínica después de abrir el detalle), **When** el operador confirma, **Then** ve el motivo, la suscripción permanece sin cambios y la pantalla se actualiza con su número de clínicas.
7. **Given** que la plataforma no puede comprobar en ese momento si la suscripción tiene clínicas, **When** el operador confirma, **Then** ve el motivo (no se pudo comprobar y no se eliminó) con la opción de reintentar, y la suscripción permanece sin cambios.
8. **Given** que otra persona ya eliminó la suscripción, **When** el operador confirma, **Then** ve que la suscripción ya no existe, con la opción de volver al listado.
9. **Given** el diálogo de confirmación, **When** el operador pulsa «Eliminar» varias veces seguidas, **Then** la eliminación se envía una sola vez y no aparece el aviso de que la suscripción ya no existe.
10. **Given** una suscripción eliminada, **When** el operador crea otra con el mismo nombre, **Then** se crea sin conflicto.
11. **Given** un operador sin `subscriptions:delete`, **When** abre el detalle de una suscripción, **Then** no ve la acción «Eliminar».

---

### Edge Cases

- ¿Qué ocurre con nombres, descripciones o elementos de «lo que incluye» muy largos o con caracteres especiales? Se aceptan dentro de sus límites (100, 500 y 150 caracteres); en el listado el texto largo se acorta sin romper el diseño y se ve completo en el detalle.
- ¿Qué ocurre con un nombre que solo difiere de otro en mayúsculas o en espacios al inicio o al final («Pro», «pro» y « Pro »)? Es el mismo nombre: se guarda sin esos espacios y no puede repetirse entre las suscripciones no eliminadas, aunque estén Inactivas o Bloqueadas, y el error se muestra junto al campo nombre. Una suscripción sí puede cambiar las mayúsculas de su propio nombre, y el nombre de una suscripción eliminada queda libre.
- ¿Qué ocurre con un precio de 0? Es válido (precio a cotizar o plan histórico, que se explican en la descripción): se muestra «$0.00/mes», sin textos añadidos, y ocupa su lugar en el orden por precio.
- ¿Qué ocurre si el operador escribe el precio con comas o con «$» (por ejemplo, «4,500» o «4,50»)? Se rechaza con un error junto al campo y no se guarda: el precio se escribe solo con dígitos y punto decimal, así que «4,50» nunca puede guardarse como 450 por error.
- ¿Qué ocurre cuando «lo que incluye» llega a 20 elementos? Ya no se pueden agregar más; quitar uno vuelve a permitirlo. Una lista vacía también es válida y el detalle indica que no hay elementos. Un elemento vacío o solo con espacios impide guardar: se marca con un error junto a él hasta que el operador lo complete o lo quite.
- ¿Qué ocurre si el número de clínicas no está disponible? Se muestra «No disponible», nunca 0, en el listado y en el detalle; la acción de eliminar se ofrece y la plataforma decide.
- ¿Qué ocurre con una suscripción de estatus desconocido (añadido a mano en la plataforma)? Se muestra con el nombre de estatus que da la plataforma, en una etiqueta de color neutro; va en el segundo grupo del listado y se trata como vigente: se puede editar, eliminar y cambiar a Activa, Inactiva o Bloqueada (se ofrecen los tres).
- ¿Qué ocurre si otra persona elimina la suscripción mientras el operador la consulta o la edita? Al abrir su detalle, guardar un cambio, cambiar su estatus o eliminarla se informa que ya no existe, con la opción de volver al listado.
- ¿Qué ocurre si otra persona cambia el estatus mientras tanto? El detalle muestra el estatus vigente cada vez que se carga; si el operador pide el estatus que la suscripción ya tiene, la plataforma lo rechaza, se muestra el motivo y se actualiza el dato; cualquier otro cambio de estatus se aplica normalmente.
- ¿Qué ocurre si dos operadores modifican a la vez la misma suscripción? Gana el último cambio: como solo se envía lo que cambió, se conservan las ediciones de datos distintos; si ambos cambian el mismo dato, queda el del último en guardar. «Lo que incluye» cuenta como un solo dato: queda la lista completa del último en guardar.
- ¿Qué ocurre si dos operadores crean a la vez una suscripción con el mismo nombre? Solo una se crea; el otro ve, junto al campo nombre, que el nombre ya está en uso.
- ¿Qué ocurre si varias suscripciones de un mismo grupo tienen el mismo precio? Se ordenan por nombre en orden alfabético; como no puede haber dos nombres iguales, el orden es siempre el mismo.
- ¿Qué ocurre si se inactiva o se bloquea una suscripción con clínicas? Se permite y las clínicas la conservan; las consecuencias para ellas las deciden otros sistemas, fuera de esta feature.
- ¿Qué ocurre si se pierde la conexión durante un guardado, un cambio de estatus o una eliminación? No se asume el éxito: el operador ve el error y puede reintentar sin generar duplicados; nada se reintenta automáticamente.
- ¿Qué ocurre en la última página, si tiene menos filas que el tamaño elegido, o si hay una sola página? Se muestran solo las suscripciones existentes y los controles de página reflejan el límite. Si la página a la que vuelve el operador ya no existe (por ejemplo, tras eliminar la única suscripción de la última página), se muestra la última página disponible.
- ¿Qué ocurre si al operador se le retira un permiso mientras usa la sección? Si ejecuta la acción, la plataforma la rechaza y se muestra el estado «sin permisos» sin cerrar la sesión; la navegación y las acciones visibles se actualizan en la siguiente comprobación de permisos de la feature 001.
- ¿Qué ocurre si el catálogo crece más de lo previsto? La plataforma lo entrega completo hasta 500 suscripciones (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar las suscripciones en un listado paginado, con 10 por página por defecto, el total de suscripciones, la página actual, controles para avanzar y retroceder, y la posibilidad de elegir 10, 25 o 50 por página. Como la plataforma entrega el catálogo completo en una sola consulta, el orden (FR-015) y la paginación DEBEN aplicarse sobre ese catálogo ya obtenido, sin mostrar más filas que el tamaño de página elegido.
- **FR-002**: Cada fila del listado DEBE mostrar el nombre de la suscripción, como enlace a su detalle, su precio mensual (FR-014), su estatus (FR-016) y su número de clínicas (FR-019). El listado DEBE ofrecer la acción «Nueva suscripción» a quien puede crear (FR-013).
- **FR-003**: El sistema DEBE permitir abrir el detalle de una suscripción con todos sus datos —nombre, descripción, precio mensual, la lista completa de lo que incluye en el orden guardado, estatus, número de clínicas y fechas de creación y de última modificación— y volver al listado en la misma página y con el mismo tamaño de página en que estaba (en la primera página, si llegó al detalle por una dirección directa). Las acciones Editar, Cambiar estatus y Eliminar DEBEN ofrecerse solo en el detalle.
- **FR-004**: El listado, el detalle y el formulario de edición (mientras obtiene los valores actuales) DEBEN mostrar estados explícitos de carga, vacío (en el listado, con la acción para crear una suscripción si el operador puede crear) y error (con opción de reintentar).
- **FR-005**: El sistema DEBE permitir crear una suscripción, en su propia pantalla y dirección, capturando su nombre (obligatorio), su descripción (opcional), su precio mensual (obligatorio) y lo que incluye (opcional, FR-023), y permitir cancelar sin crear nada, de vuelta al listado. El formulario NO DEBE pedir el estatus: toda suscripción nace Activa.
- **FR-006**: El sistema DEBE validar los datos antes de enviarlos y mostrar el error junto a cada campo afectado: nombre de 1 a 100 caracteres; descripción de hasta 500 caracteres; precio mensual de 0 a 99,999,999.99 con hasta dos decimales, escrito solo con dígitos y un punto decimal opcional (por ejemplo, «4500» o «4500.50»), así que las comas, el signo «$» y cualquier otro carácter se rechazan junto al campo; y lo que incluye, de 0 a 20 elementos de 1 a 150 caracteres cada uno. Los límites se cuentan sin los espacios al inicio y al final, que no se guardan, y una descripción vacía equivale a no tener descripción.
- **FR-007**: El sistema DEBE impedir que una acción repetida (pulsar «Guardar» o confirmar un cambio de estatus o una eliminación varias veces) cree o modifique el mismo registro más de una vez, deshabilitando la acción mientras se procesa.
- **FR-008**: El sistema DEBE permitir modificar, en su propia pantalla y dirección y con el mismo formulario del alta, el nombre, la descripción, el precio mensual y lo que incluye de una suscripción de cualquier estatus, mostrando sus valores actuales, y permitir cancelar sin guardar cambios, de vuelta al detalle. Al guardar DEBE enviar solo los datos que cambiaron respecto de los que había al abrir el formulario (si cambia cualquier elemento de lo que incluye, la lista completa); si no cambió ninguno, NO DEBE enviar nada y DEBE volver al detalle con el aviso de que no había cambios que guardar («Guardar» no se deshabilita por falta de cambios). El estatus no se modifica en este formulario (FR-017).
- **FR-009**: El sistema DEBE exigir una confirmación explícita, que nombre la suscripción y advierta que no se puede deshacer, antes de eliminarla.
- **FR-010**: Cuando la plataforma rechace una operación, el sistema DEBE dejar los datos sin cambios y mostrar un mensaje propio del backoffice, en español, elegido según el código del rechazo, y NUNCA el texto del servidor:
  - sesión vencida o no válida: el flujo de la feature 001-auth-session-profile (renovar la sesión una vez y, si no se puede, iniciar sesión de nuevo y volver a la misma pantalla);
  - sin permiso: el estado «sin permisos» para esa acción, sin cerrar la sesión;
  - suscripción no encontrada: un mensaje de que la suscripción ya no existe, con enlace al listado;
  - nombre en uso: el error junto al campo nombre;
  - estatus sin cambio o suscripción con clínicas asignadas: un mensaje de negocio que explica el motivo;
  - datos no válidos: un error junto a cada campo afectado, o un mensaje general si el dato no corresponde a un campo del formulario;
  - servicio de permisos o de clínicas no disponible, error de red o error del servidor: un mensaje genérico con la opción de reintentar; cuando lo que falla es la comprobación de clínicas al eliminar, el mensaje indica además que no pudo comprobarse si la suscripción tiene clínicas y que no se eliminó.

  Crear, modificar, cambiar el estatus y eliminar NO DEBEN reintentarse automáticamente.
- **FR-011**: Tras crear, modificar, cambiar el estatus o eliminar con éxito, el sistema DEBE mostrar una notificación de éxito y reflejar el cambio en el listado y en el detalle sin que el operador tenga que recargar la pantalla: al crear o modificar, el operador llega al detalle de la suscripción; al cambiar el estatus, sigue en el detalle, que muestra el nuevo estatus; al eliminar, vuelve al listado, en la página en la que estaba o, si ya no existe, en la última disponible.
- **FR-012**: La plataforma no detecta ediciones simultáneas y gana el último cambio, así que el sistema NO DEBE prometer que detecta ediciones ajenas. Enviar solo lo que cambió (FR-008) DEBE conservar los cambios que otra persona haya hecho en otros datos. Si la suscripción fue eliminada mientras tanto, el sistema DEBE informar que ya no existe y ofrecer volver al listado; si otra persona ya le dio el estatus pedido, DEBE mostrar el motivo y actualizar el estatus mostrado.
- **FR-013**: El sistema DEBE mostrar la opción «Suscripciones» en la navegación, y dar acceso a la sección, solo a quien tenga `subscriptions:read` entre los permisos de sus roles activos según la feature 001-auth-session-profile; quien no lo tenga y abra una dirección de la sección no ve datos y recibe el flujo de falta de permisos de la 001. Cada acción DEBE mostrarse solo a quien tenga, además, su permiso: «Nueva suscripción», `subscriptions:write`; «Editar» y «Cambiar estatus», `subscriptions:update`; «Eliminar», `subscriptions:delete`. Quien abra directamente la dirección del alta o de la edición sin el permiso correspondiente DEBE ver que no tiene permiso para esa acción, sin el formulario. La plataforma es quien autoriza: un rechazo por falta de permiso DEBE manejarse (FR-010) aunque la interfaz haya mostrado la acción.
- **FR-014**: Todos los textos, mensajes y etiquetas DEBEN estar en español. El precio mensual DEBE mostrarse como importe en pesos mexicanos con el formato de México (separador de miles, punto decimal y dos decimales) seguido de «/mes» —por ejemplo, «$4,500.00/mes»—, igual en el listado y en el detalle; no hay otro periodo ni otra moneda. Las fechas y horas DEBEN mostrarse en la zona horaria local del operador.
- **FR-015**: El listado DEBE tener un orden fijo que el operador no puede cambiar: primero todas las suscripciones Activas y, después, en un solo grupo, las Inactivas, las Bloqueadas y las de estatus desconocido; dentro de cada grupo, de menor a mayor precio mensual y, a igualdad de precio, por nombre en orden alfabético sin distinguir mayúsculas. Los grupos solo determinan el orden: el listado es una sola tabla, sin encabezados ni separadores entre grupos, y la etiqueta de estatus (FR-016) distingue cada fila.
- **FR-016**: El sistema DEBE mostrar el estatus con una etiqueta que lleve su nombre y un color distinto para Activa, Inactiva y Bloqueada (neutro para un estatus desconocido); el estatus NO DEBE comunicarse solo con el color y las filas NO DEBEN atenuarse según el estatus, para cumplir el contraste mínimo de WCAG 2.1 AA. El estatus DEBE reconocerse por su identificador en la plataforma, no por su nombre, y una suscripción Eliminada NUNCA DEBE mostrarse.
- **FR-017**: El sistema DEBE permitir cambiar el estatus de una suscripción entre Activa, Inactiva y Bloqueada, en cualquier dirección y aunque tenga clínicas asignadas, con una acción del detalle separada del formulario de edición que ofrezca solo los estatus distintos del actual. Inactivar y bloquear DEBEN pedir una confirmación que nombre la suscripción y el nuevo estatus; activar se aplica sin confirmación. Cada cambio correcto DEBE notificarse (FR-011).
- **FR-018**: Eliminar una suscripción DEBE ser una baja lógica sin opción de deshacer desde el backoffice: la suscripción deja de aparecer y su nombre queda libre para otra. Si su número de clínicas es mayor que 0, la acción DEBE aparecer deshabilitada con el motivo visible junto a ella («Tiene 1 clínica asignada» o «Tiene N clínicas asignadas»); si es «No disponible», la acción DEBE ofrecerse y decide la plataforma. Si la plataforma la rechaza porque tiene clínicas asignadas o porque no pudo comprobarlo, el sistema DEBE mostrar el motivo y la suscripción permanece sin cambios.
- **FR-019**: El número de clínicas DEBE ser de solo lectura; cuando la plataforma lo informe como no disponible, DEBE mostrarse «No disponible» y NUNCA 0.
- **FR-020**: Una suscripción con un estatus que el backoffice no conoce DEBE mostrarse con el nombre de estatus que da la plataforma y tratarse como vigente: va en el segundo grupo del listado (FR-015) y admite editar, cambiar a Activa, Inactiva o Bloqueada, y eliminar, con las mismas reglas que las demás.
- **FR-021**: Al crear o modificar, el sistema DEBE enviar a la plataforma solo datos editables —nombre, descripción, precio mensual y lo que incluye— y NUNCA el identificador, el estatus, el número de clínicas ni las fechas.
- **FR-022**: Toda operación con la plataforma de suscripciones DEBE identificarse con la credencial de acceso de la sesión del operador, la misma que vale para las demás plataformas de MailySoft; esa credencial DEBE enviarse solo a la dirección configurada para la plataforma de suscripciones y NUNCA DEBE mostrarse, registrarse ni guardarse.
- **FR-023**: En «lo que incluye», el formulario DEBE permitir agregar, editar y quitar elementos, que se conservan en el orden de captura y no se pueden reordenar; al llegar a 20 elementos NO DEBE permitir agregar más. El detalle DEBE mostrarlos en el orden guardado.

### Key Entities *(include if feature involves data)*

- **Suscripción**: Plan que MailySoft ofrece a las clínicas. Atributos: identificador (lo asigna la plataforma); nombre (obligatorio, de 1 a 100 caracteres, guardado sin espacios al inicio ni al final y único, sin distinguir mayúsculas, entre las suscripciones no eliminadas); descripción (opcional, hasta 500 caracteres; vacía equivale a no tener); precio mensual (en pesos mexicanos, de 0 a 99,999,999.99 con hasta dos decimales; 0 es válido); lo que incluye (lista ordenada de 0 a 20 textos de 1 a 150 caracteres, solo informativa, que se muestra en el orden guardado); estatus; número de clínicas que la tienen (solo lectura, aportado por otra plataforma y que puede no estar disponible); y fechas de creación y de última modificación (solo lectura).
- **Estatus de suscripción**: Catálogo de la plataforma, que se reconoce por el identificador de cada estatus y no por su nombre: Activa (disponible y ofrecida), Inactiva (retirada de la oferta; las clínicas que ya la tienen la conservan), Bloqueada (suspendida) y Eliminada (baja lógica: nunca se muestra). Una suscripción nace Activa y cambia entre Activa, Inactiva y Bloqueada en cualquier dirección; Eliminada no tiene vuelta atrás. La plataforma puede añadir a mano otros estatus, que se muestran con su nombre y se tratan como vigentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador crea una suscripción con su precio y hasta 5 elementos en «lo que incluye» en menos de 2 minutos.
- **SC-002**: Con el catálogo completo (hasta 100 suscripciones), la primera página del listado se muestra en menos de 2 segundos en el 95 % de las consultas, en condiciones normales de red.
- **SC-003**: El 100 % de las eliminaciones, inactivaciones y bloqueos requieren una confirmación explícita previa que nombra la suscripción (y, en los cambios de estatus, el nuevo estatus).
- **SC-004**: Pulsar «Guardar» o confirmar una acción varias veces seguidas produce 0 registros duplicados y 0 operaciones repetidas.
- **SC-005**: En el 100 % de los rechazos de la plataforma, el operador ve un mensaje propio del backoffice en español que explica el motivo, nunca el texto del servidor, y los datos permanecen sin cambios.
- **SC-006**: Un operador encuentra y abre el detalle de una suscripción concreta en menos de 30 segundos.
- **SC-007**: En el 100 % de las pruebas con suscripciones de los tres estatus y con precios repetidos, el orden del listado coincide con la regla fija (Activas primero; cada grupo de menor a mayor precio y, a igualdad, por nombre) en todas las páginas y con cualquier tamaño de página.
- **SC-008**: Ninguna suscripción se muestra con 0 clínicas cuando la plataforma informa el número como no disponible, y ninguna suscripción con clínicas asignadas se elimina desde el backoffice (0 casos de cada tipo).
- **SC-009**: Un operador cambia el estatus de una suscripción desde su detalle en 3 interacciones o menos.
- **SC-010**: En el 100 % de las pruebas con cuentas de distintos permisos, la opción «Suscripciones» y las acciones visibles coinciden exactamente con los permisos `subscriptions:*` de la cuenta.
- **SC-011**: En el 100 % de las operaciones verificadas, la credencial de acceso solo se envía a la dirección configurada de la plataforma de suscripciones y no aparece en pantallas, registros ni en el almacenamiento del navegador.

## Assumptions

- Dependencia: requiere la feature 001-auth-session-profile: sesión iniciada; los permisos del operador, que devuelve la operación `GET /api/v1/authorization/me` del API de usuarios (cuentan los permisos de sus roles activos autorizados); el manejo uniforme de la sesión vencida o no válida (401) y de la falta de permisos (403); y su único módulo de permisos, que decide cada acción sin comparar nombres de role.
- Dependencia: sigue el patrón de la feature 002-manage-users: listado paginado, detalle, formulario compartido para crear y editar con pantallas y direcciones propias, eliminación con diálogo de confirmación, notificaciones y regreso a la página del listado. Como en la 002, las acciones de la sección solo se ofrecen a quien además puede consultarla (`subscriptions:read`).
- Dependencia: la API de suscripciones, ya implementada y en funcionamiento (repositorio `maily-system-api`, feature `001-subscriptions-api`). Su spec y su contrato (`contracts/openapi-subscriptions.yaml`, `contracts/error-catalog.md` y `contracts/permission-matrix.md`) son la fuente de verdad de datos, reglas, permisos y errores; el detalle de operaciones y esquemas se documentará en `contracts/` de esta feature durante `/speckit-plan`. Operaciones: `GET /api/v1/subscriptions` (catálogo completo, sin paginar, ordenado por fecha de creación) y `GET /api/v1/subscriptions/{subscription_id}` con `subscriptions:read`; `POST /api/v1/subscriptions` con `subscriptions:write`; `PATCH /api/v1/subscriptions/{subscription_id}` (solo los datos enviados) y `PATCH /api/v1/subscriptions/{subscription_id}/status` con `subscriptions:update`; y `DELETE /api/v1/subscriptions/{subscription_id}` con `subscriptions:delete`.
- Dependencia: la URL base de la API se configura por entorno con `VITE_SUBSCRIPTIONS_API_URL`, ya prevista en la configuración del backoffice. Las operaciones envían el access token de la sesión (`Authorization: Bearer`, con el audience de las APIs de MailySoft) solo a ese host. La API no valida el token por sí misma: lo reenvía al API de usuarios, que decide el permiso en cada petición. El token nunca se muestra, se registra ni se persiste (constitución, principio V).
- Dependencia: la API solo admite llamadas desde el navegador de los sitios de su lista configurable, vacía por defecto, igual que la de usuarios (que en desarrollo se usa a través de un intermediario): cada entorno debe incluir el sitio del backoffice en esa lista o usar un intermediario equivalente; el plan define cuál.
- Desviación de la constitución (principio IV): la constitución exige paginación del lado del servidor y prohíbe descargar una colección completa para paginarla en el cliente, pero el contrato devuelve el catálogo completo sin paginar (se esperan hasta 100 suscripciones y la API lo entrega completo hasta 500). Por eso el listado se ordena y se pagina sobre el catálogo obtenido. La desviación la impone el contrato y se justificará en Complexity Tracking del plan, sin enmendar la constitución. Si la API empezara a paginar (un cambio incompatible de su contrato, que se versionaría), esta feature deberá revisarse.
- El orden del listado (grupos por estatus y precio) es una regla de presentación del backoffice, no una regla de negocio de la plataforma: la API ordena por fecha de creación y deja que el Front reordene o agrupe.
- Concurrencia: la API no tiene control de concurrencia (gana el último cambio) y modificar acepta solo los datos que cambian; por eso se retira la detección de ediciones ajenas de la versión anterior de esta spec. Modificar exige enviar al menos un dato, de ahí que guardar sin cambios no contacte a la plataforma (FR-008).
- Terminología: el recurso se llama «suscripciones» en todo el backoffice. Así se rotulan la opción de navegación y el título de la sección («Suscripciones»), y así lo nombran la feature 001 y la constitución (desde su versión 1.2.1); hasta el 2026-10-20, ambas, igual que el texto de navegación, decían «tipos de suscripción». La API habla de «suscripciones» o «planes»; es el mismo recurso, con los permisos `subscriptions:*`. La API describe una pantalla de referencia con tarjetas y las inactivas atenuadas; el backoffice usa una tabla y no atenúa filas (ver Clarifications).
- Contraste con el contrato: este pedido y el contrato coinciden, así que no hay diferencias que resolver. El contrato aporta estas precisiones: (1) el servicio de clínicas solo produce un rechazo al eliminar; en las lecturas, su falta se refleja como número de clínicas no disponible; (2) una suscripción recién creada se devuelve con 0 clínicas, un cero verdadero; (3) modificar exige al menos un dato, y la lista de lo que incluye se envía y se sustituye completa; (4) una suscripción puede conservar su propio nombre cambiando solo las mayúsculas; (5) los errores de validación de lo que incluye se refieren a la lista entera, no a un elemento concreto; (6) la ruta real es `/api/v1/subscriptions`, no la `/suscriptions` del ejemplo no normativo de la constitución.
- Moneda y periodo: los precios son mensuales y en pesos mexicanos (MXN, con formato es-MX); la API no admite otro periodo ni otra moneda, por lo que se retira la periodicidad como dato variable de la versión anterior.
- Significado de los estatus (según la API): Activa = disponible y ofrecida a clínicas nuevas; Inactiva = retirada de la oferta, aunque las clínicas que ya la tienen la conservan; Bloqueada = suspendida por la administración. Aplicar sus consecuencias a las clínicas corresponde a otros sistemas.
- Pruebas: en la fase de especificación no se escriben ni se ejecutan pruebas. Cada historia define su prueba independiente y escenarios verificables; las pruebas unitarias, de integración y E2E se escribirán y ejecutarán en `/speckit-implement`, como exige el principio VII de la constitución.
- Restricciones: la feature respeta la constitución v1.2.1 y el stack ya definido; no introduce tecnologías ni dependencias nuevas.
- Fuera de alcance: asignar suscripciones a clínicas, ver qué clínicas tienen una suscripción, recuperar suscripciones eliminadas, búsqueda, filtros y orden elegido por el operador, reordenar lo que incluye, exportación, acciones masivas, historial de cambios o de precios, y otras monedas o periodos.
