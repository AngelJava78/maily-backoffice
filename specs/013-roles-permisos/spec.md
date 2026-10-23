# Feature Specification: Roles y permisos

**Feature Branch**: `013-roles-permisos`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: Módulo "Roles y permisos" del Backoffice, a partir de los mockups del PDF de MailySoft (páginas 15 a 18: pantallas de editar un role existente y crear uno nuevo), integrado contra la API ya existente de MailySoft Usuarios. Incluye una aclaración sobre el orden final del menú superior (Panel, Módulos, Roles y Permisos, Usuarios, Suscripciones, Clínicas, Token), distinto del orden que muestra el propio mockup.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver y ajustar los permisos de un role existente (Priority: P1)

Una persona con acceso a "Roles y permisos" entra a la sección, ve la lista de roles agrupada en dos pestañas ("Clínica" y "Sistema"), elige uno y ve, a la derecha, su nombre, descripción, tipo y la tabla completa de módulos con las acciones que tiene concedidas (Ver, Crear, Modificar, Eliminar). Cambia el nombre o la descripción, qué puede hacer ese role en uno o varios módulos, o ambas cosas, y guarda el cambio de una vez, o lo descarta si se arrepiente.

**Why this priority**: Es el propósito central del módulo — sin esto no hay forma de saber ni cambiar lo que cada role puede hacer. Las demás historias (crear, duplicar, eliminar) son variaciones sobre esta misma pantalla de detalle.

**Independent Test**: Con roles de prueba ya existentes de ambos tipos, entrar a la sección, cambiar de pestaña, seleccionar distintos roles, marcar y desmarcar acciones de varios módulos, guardar y confirmar que la tabla y el contador de permisos reflejan el cambio; descartar cambios sin guardar y confirmar que la tabla vuelve al estado anterior.

**Acceptance Scenarios**:

1. **Given** hay roles de tipo Clínica y de tipo Sistema, **When** la persona abre "Roles y permisos", **Then** ve la pestaña Clínica seleccionada por defecto con su lista de roles, y puede cambiar a la pestaña Sistema para ver la suya.
2. **Given** la persona eligió un role de la lista, **When** se carga su detalle, **Then** ve su nombre, descripción, tipo, el contador "X de Y permisos" y una tabla con todos los módulos de ese tipo, cada uno con las acciones que realmente tiene disponibles según el catálogo (algunos módulos no muestran todas las columnas).
3. **Given** un módulo de la tabla no tiene "Ver" marcado, **When** la persona marca "Crear", "Modificar" o "Eliminar" en esa fila, **Then** la interfaz marca también "Ver" automáticamente para esa fila.
4. **Given** un módulo tiene varias acciones marcadas, **When** la persona desmarca "Ver" en esa fila, **Then** la interfaz desmarca también el resto de acciones de esa fila.
5. **Given** la persona marcó la casilla "Todo el módulo" de una fila, **When** la interfaz procesa el cambio, **Then** quedan marcadas todas las acciones que ese módulo tiene disponibles (no más).
6. **Given** la persona cambió permisos de un role, **When** pulsa "Guardar cambios", **Then** la tabla y el contador de permisos quedan con el nuevo estado, y éste persiste si vuelve a entrar más tarde.
7. **Given** la persona cambió permisos sin guardar, **When** pulsa "Descartar cambios", **Then** la tabla vuelve a mostrar los permisos tal como estaban antes de sus cambios, y el nombre y la descripción también vuelven a su último valor guardado.
8. **Given** la persona cambió el nombre o la descripción de un role, con o sin tocar la tabla de permisos, **When** pulsa "Guardar cambios", **Then** ambos cambios se guardan juntos; si el nuevo nombre está vacío o ya lo usa otro role, la interfaz lo señala y no guarda nada hasta corregirlo.
9. **Given** la persona no tiene el permiso de esta sección, **When** inicia sesión, **Then** no ve "Roles y permisos" en el menú ni puede entrar a su ruta.

---

### User Story 2 - Crear un role nuevo (Priority: P2)

Una persona con acceso pulsa "Nuevo role", indica nombre, descripción opcional y tipo (Clínica o Sistema), y arma su tabla de permisos desde cero o, para ahorrar trabajo, eligiendo "Copiar permisos de" otro role del mismo tipo para partir de esos permisos y ajustarlos antes de guardar.

**Why this priority**: Da de alta roles para necesidades nuevas (p. ej. un puesto nuevo en una clínica, o un perfil nuevo del Backoffice); depende de la tabla de permisos de la Historia 1 pero es un flujo independiente y claramente valioso por sí solo.

**Independent Test**: Crear un role de tipo Clínica desde cero marcando permisos manualmente, y crear otro de tipo Sistema copiando los permisos de uno existente; confirmar en ambos casos que el role aparece en la lista de su pestaña con los permisos esperados.

**Acceptance Scenarios**:

1. **Given** la persona pulsó "Nuevo role", **When** completa nombre y tipo sin tocar la tabla de permisos, **Then** puede guardar un role con ese nombre, tipo y ningún permiso concedido.
2. **Given** la persona está creando un role, **When** elige "Copiar permisos de" un role existente del mismo tipo, **Then** la tabla de permisos se precarga igual que la del role copiado, y la persona puede seguir ajustándola antes de guardar.
3. **Given** la persona está creando un role de tipo Clínica, **When** busca en "Copiar permisos de", **Then** solo ve roles de tipo Clínica como opción (los de tipo Sistema no aparecen), y viceversa.
4. **Given** la persona no escribió un nombre, **When** intenta guardar, **Then** la interfaz se lo impide y señala el campo obligatorio.
5. **Given** la persona escribió un nombre ya usado por otro role (sea cual sea su tipo), **When** intenta guardar, **Then** la interfaz muestra un error indicando que ese nombre ya existe.
6. **Given** la persona está creando un role, **When** pulsa "Cancelar", **Then** no se crea ningún role y vuelve a la pantalla anterior.
7. **Given** el role se creó correctamente, **When** la persona vuelve a la lista, **Then** lo ve en la pestaña de su tipo y puede abrir su detalle como cualquier otro role.

---

### User Story 3 - Eliminar un role (Priority: P3)

Una persona con acceso elimina, desde el detalle de un role, uno que ya no se necesita, confirmando antes de que se borre de forma definitiva.

**Why this priority**: Cierra el ciclo de vida de un role (se puede crear y también retirar), pero es menos frecuente que ver/ajustar o crear, y es una variación de la misma pantalla de detalle.

**Independent Test**: Crear un role de prueba y eliminarlo desde su detalle confirmando la acción, comprobando que desaparece de la lista; abrir la confirmación y cancelarla, comprobando que no se elimina nada.

**Acceptance Scenarios**:

1. **Given** la persona está en el detalle de un role, **When** pulsa "Eliminar role", **Then** ve una advertencia de que la acción no se puede deshacer y debe confirmarla explícitamente antes de que algo se borre.
2. **Given** la persona confirmó la eliminación de un role, **When** se completa la acción, **Then** el role desaparece de la lista de su pestaña y de cualquier lugar donde se elija un role (p. ej. "Copiar permisos de").
3. **Given** la persona abrió la confirmación de eliminar, **When** decide no continuar, **Then** cierra el aviso sin que se elimine nada.

---

### User Story 4 - Duplicar un role existente (Priority: P4)

Una persona con acceso duplica un role desde su detalle para partir de uno ya configurado, en vez de crear uno desde cero o usar "Copiar permisos de".

**Why this priority**: Es un atajo sobre la Historia 2 (crear copiando permisos) pensado para el caso de "quiero algo casi igual a este": ahorra pasos pero no habilita nada que no se pudiera lograr ya combinando crear + copiar permisos.

**Independent Test**: Duplicar un role existente y confirmar que aparece un role nuevo con el mismo tipo y los mismos permisos que el original, listo para renombrarlo y ajustarlo.

**Acceptance Scenarios**:

1. **Given** la persona está en el detalle de un role, **When** pulsa "Duplicar", **Then** se crea un role nuevo del mismo tipo y con los mismos permisos que el original, con un nombre distinto que la persona puede editar de inmediato.
2. **Given** se duplicó un role, **When** la persona guarda el nuevo nombre (o lo deja como vino), **Then** el role duplicado queda en la lista de su pestaña como un role independiente: cambiar los permisos de uno no afecta al otro.

---

### Edge Cases

- Si el catálogo de módulos no tiene ninguna acción disponible para un módulo, ese módulo se muestra en la tabla sin casillas marcables en esa fila (no se oculta, para que quede claro que existe pero no tiene acciones configurables).
- Si una pestaña (Clínica o Sistema) no tiene ningún role todavía, se muestra un mensaje invitando a crear el primero, en vez de una lista vacía sin explicación.
- Si la persona cambia de pestaña, elige otro role de la lista, o intenta salir de la sección teniendo cambios sin guardar en el detalle actual, la interfaz lo avisa y deja elegir entre descartar esos cambios o quedarse.
- Si otra persona cambió el mismo role mientras la persona actual tenía su detalle abierto, al guardar la interfaz avisa del conflicto y no sobrescribe en silencio: la persona debe revisar el estado actual antes de reintentar.
- Si un role ya tiene concedidos todos los permisos posibles para su tipo, el contador muestra el total igualado (p. ej. "50 de 50") y todas las casillas disponibles aparecen marcadas.
- Intentar cambiar el tipo (Clínica/Sistema) de un role ya creado no es una operación disponible en la interfaz.
- Si un tipo (Clínica o Sistema) todavía no tiene ningún módulo en el catálogo, la tabla de permisos de sus roles se muestra vacía (sin filas), no como un error.
- Si guardar un cambio de permisos (editar, crear copiando de otro role, o duplicar) requiere varias operaciones y alguna de ellas falla mientras otras sí se completan, el sistema no aparenta un éxito total: dice con claridad qué sí quedó guardado y qué no, deja la tabla acorde al estado real, y permite reintentar solo lo que faltó.
- Si crear o duplicar un role completa la creación del role pero solo copia parte de sus permisos, el role queda creado igualmente (no se revierte) con los permisos que sí se aplicaron, listo para que la persona lo revise y complete desde su detalle.
- Eliminar un role que todavía está asignado a personas o clínicas no se bloquea: el role deja de estar activo y de poder asignarse o recibir más cambios, pero quienes ya lo tenían asignado lo conservan (qué ven esas personas por ello es un comportamiento del módulo de Usuarios, no de esta feature).
- Si la persona puede entrar a "Roles y permisos" pero el sistema le niega el catálogo necesario para construir la tabla de permisos, ve igualmente el resto del detalle del role (nombre, descripción, tipo, contador) con un aviso de que la tabla no se pudo cargar, en vez de ocultar toda la pantalla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, para quien tiene permiso de lectura sobre este recurso, una entrada "Roles y permisos" en el menú principal; quien no tiene ese permiso no la ve ni puede acceder a su contenido.
- **FR-002**: El menú principal DEBE listar sus secciones en este orden relativo: Panel primero; luego, en cuanto existan, Módulos y Roles y Permisos (en ese orden); luego Usuarios, Suscripciones y Clínicas; Token al final. Mientras Módulos y Clínicas no sean todavía secciones del menú, el orden visible resultante es Panel, Roles y Permisos, Usuarios, Suscripciones, Token.
- **FR-003**: El sistema DEBE presentar los roles agrupados en dos conjuntos independientes y claramente identificados, Clínica y Sistema, de forma que elegir uno no mezcle roles del otro tipo.
- **FR-004**: Por cada role de la lista, el sistema DEBE mostrar al menos su nombre, su descripción y cuántos permisos tiene concedidos.
- **FR-005**: Al elegir un role, el sistema DEBE mostrar su detalle: nombre, descripción, tipo, un contador de permisos concedidos sobre el total posible para ese tipo, y una tabla de permisos con un módulo por fila.
- **FR-006**: La tabla de permisos DEBE incluir únicamente los módulos del mismo tipo que el role (un role de Clínica no muestra ni puede recibir permisos de módulos de Sistema, y viceversa).
- **FR-007**: Por cada módulo de la tabla, el sistema DEBE mostrar únicamente las acciones que ese módulo tiene disponibles (no toda fila tiene necesariamente Ver, Crear, Modificar y Eliminar).
- **FR-008**: El sistema DEBE impedir que una fila quede con Crear, Modificar o Eliminar concedido sin que Ver también lo esté: al conceder cualquiera de esas tres, Ver se concede junto con ella; al retirar Ver, las demás de esa fila se retiran con él.
- **FR-009**: El sistema DEBE ofrecer, por fila, una forma de conceder o retirar de una sola vez todas las acciones disponibles de ese módulo.
- **FR-010**: El sistema DEBE permitir guardar, de una sola vez, los cambios pendientes del detalle de un role (nombre, descripción y permisos, cualquier combinación de los tres), y también descartarlos todos juntos para volver al último estado guardado sin salir de la pantalla.
- **FR-011**: El sistema DEBE permitir crear un role nuevo indicando nombre (obligatorio), descripción (opcional) y tipo (Clínica o Sistema); el tipo no se puede modificar una vez creado el role.
- **FR-012**: Al crear un role, el sistema DEBE ofrecer copiar los permisos de otro role ya existente del mismo tipo como punto de partida, dejando a la persona ajustar la tabla resultante antes de guardar.
- **FR-013**: El sistema DEBE exigir que el nombre de un role sea único entre todos los roles existentes, sin importar su tipo ni mayúsculas/minúsculas, e informar con un mensaje claro cuando no lo sea.
- **FR-014**: El sistema DEBE permitir duplicar un role existente, creando uno nuevo del mismo tipo y con los mismos permisos que el original, independiente de él a partir de ese momento.
- **FR-015**: El sistema DEBE permitir eliminar un role, pidiendo antes una confirmación explícita que indique que la acción no se puede deshacer; la confirmación DEBE completarse aunque el role esté asignado a personas o clínicas (eliminar no queda bloqueado por eso).
- **FR-016**: El sistema DEBE reflejar de inmediato, en la lista de roles, cualquier alta, cambio de permisos, duplicado o baja realizado desde el detalle, sin requerir recargar la página.
- **FR-017**: El sistema DEBE avisar antes de descartar cambios sin guardar cuando la persona cambia de role, de pestaña o intenta salir de la sección con cambios pendientes.
- **FR-018**: Cuando guardar los permisos de un role (editar, crear copiando de otro, o duplicar) implique varias operaciones y alguna falle, el sistema DEBE conservar las que sí se aplicaron, mostrar con claridad cuáles no, y permitir reintentar solo esas sin perder ni duplicar las demás.
- **FR-019**: Si crear o duplicar un role solo logra aplicar parte de los permisos que debía copiar, el sistema DEBE dejar el role creado con lo que sí se aplicó, en vez de revertir su creación, para que la persona lo complete desde su detalle como cualquier otro role.
- **FR-020**: Si el catálogo de módulos o de permisos necesario para construir la tabla no está disponible para la persona o falla al cargarse, el sistema DEBE seguir mostrando el resto del detalle del role con un aviso puntual, en vez de ocultar toda la pantalla.
- **FR-021**: El sistema DEBE permitir modificar el nombre y la descripción de un role ya existente desde su detalle, con las mismas reglas que al crearlo (nombre obligatorio, hasta 50 caracteres, único entre todos los roles sin importar el tipo); el tipo del role sigue sin poder modificarse.

### Key Entities

- **Role**: Un perfil de permisos que se asigna a personas (usuarios de clínica o del propio Backoffice). Atributos: nombre, descripción, tipo (Clínica o Sistema, fijo desde su creación), y su colección de permisos concedidos. El tipo determina qué módulos puede tener y quién puede recibirlo.
- **Módulo**: Una sección administrable de MailySoft (p. ej. Pacientes, Agenda y citas, Facturación, o — del lado Sistema — Usuarios, Suscripciones). Tiene un tipo (Clínica o Sistema) y una lista fija de qué acciones admite, definida fuera de esta feature.
- **Acción**: Una operación posible sobre un módulo — Ver, Crear, Modificar o Eliminar —, no necesariamente disponible en todos los módulos.
- **Permiso concedido**: La combinación de un role, un módulo y una acción que ese role tiene autorizada. El conjunto de permisos concedidos de un role es lo que la tabla de la pantalla de detalle muestra y edita.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona con acceso encuentra y abre el detalle de cualquier role existente en menos de 30 segundos desde que entra a "Roles y permisos".
- **SC-002**: El 100 % de los intentos de conceder Crear, Modificar o Eliminar sin Ver, o de retirar Ver dejando las demás concedidas, quedan corregidos por la interfaz antes de guardar — ningún role queda guardado en ese estado inconsistente.
- **SC-003**: Una persona puede crear un role nuevo completo (nombre, tipo y permisos) copiando los de uno existente y ajustándolo en menos de 2 minutos.
- **SC-004**: El 100 % de las eliminaciones de role pasan por una confirmación explícita; ninguna eliminación ocurre a partir de una sola acción.
- **SC-005**: Quien no tiene el permiso de esta sección no logra, en ningún intento, ver su entrada de menú ni el contenido de su pantalla.
- **SC-006**: Después de guardar un cambio de permisos, la persona ve el nuevo estado reflejado en la tabla y en el contador sin necesidad de recargar la página.

## Assumptions

- El catálogo de módulos, sus tipos (Clínica/Sistema) y las acciones que cada uno admite ya existen y se consultan desde el sistema de MailySoft Usuarios; esta feature los consume tal cual, sin crearlos ni editarlos (esa gestión es una pantalla "Módulos" aparte, fuera de alcance).
- El contador "X de Y permisos" usa como Y el total de permisos posibles para ese tipo según el catálogo vigente en el momento de verlo; no es un tope fijo del producto, y puede cambiar si el catálogo cambia.
- El orden final deseado para todo el menú principal es Panel, Módulos, Roles y Permisos, Usuarios, Suscripciones, Clínicas, Token. Como Módulos y Clínicas todavía no son secciones del menú hoy, esta feature deja el menú visible como Panel, Roles y Permisos, Usuarios, Suscripciones, Token, e inserta Roles y Permisos justo antes de Usuarios; cuando se construya Módulos más adelante, debe insertarse entre Panel y Roles y Permisos para completar el orden deseado.
- Esta feature administra la definición de cada role y su tabla de permisos, no a quién se le asigna cada role: la asignación de roles a personas ya existe en el módulo de Usuarios y no cambia aquí.
- Se reutiliza el permiso/rol de acceso ya existente del Backoffice para decidir quién ve y administra esta sección, siguiendo el mismo mecanismo que ya gobierna las demás secciones del menú.
- Solo se puede "copiar permisos de" un role del mismo tipo que el que se está creando.
- Un role también se puede bloquear temporalmente sin eliminarlo (un tercer estado, además de activo y eliminado); los mockups de esta feature no muestran esa acción, así que esta feature no la expone — queda para una iteración futura si se decide incluirla.
