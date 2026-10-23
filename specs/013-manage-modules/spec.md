# Feature Specification: Módulos — administración de módulos del sistema y sus acciones

**Feature Branch**: `013-manage-modules`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Agregar la pantalla 'Módulos' al Backoffice, para administrar los módulos del sistema (Sistema y Clínica) y las acciones que tiene cada uno, usando la API ya implementada de módulos, catálogos y permisos de MailySoft Usuarios (mockups: páginas 11 a 14 del PDF de referencia); además reordenar el menú principal a Panel, Módulos, Usuarios, Suscripciones, Token."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el catálogo de módulos (Priority: P1) 🎯 MVP

Quien administra el Backoffice necesita ver todos los módulos que existen —los del propio
Backoffice (Sistema) y los de la aplicación para clínicas (Clínica)— y qué acciones (Ver, Crear,
Modificar, Eliminar) tiene habilitadas cada uno, para saber qué se puede dar de permiso en "Roles y
permisos" o si falta dar de alta un módulo nuevo.

**Why this priority**: sin poder ver el catálogo no hay forma de saber qué módulos y qué acciones
existen; es la base de todo lo demás.

**Independent Test**: con el catálogo real (23 módulos: 8 de Sistema y 15 de Clínica), abrir
"Módulos" y comprobar que aparecen agrupados por tipo, cada uno con sus acciones correctas, y que
los filtros y la búsqueda acotan la lista como se espera.

**Acceptance Scenarios**:

1. **Given** una persona con `modules:read`, **When** abre "Módulos", **Then** ve dos grupos
   ("Sistema" y "Clínica", cada uno con su conteo) con el nombre, la clave, el tipo y las acciones
   marcadas de cada módulo.
2. **Given** el listado completo, **When** elige el filtro Tipo = Sistema, **Then** solo ve el
   grupo de Sistema.
3. **Given** el listado completo, **When** escribe «agenda» en Buscar, **Then** solo ve el módulo
   "Agenda y citas".
4. **Given** el filtro Estatus = Bloqueados sin que exista ningún módulo bloqueado, **When** se
   aplica, **Then** ve un aviso de que no hay módulos bloqueados, distinto de un error.
5. **Given** una persona sin `modules:read`, **When** inicia sesión, **Then** no ve "Módulos" en el
   menú principal ni puede entrar a su dirección directamente.

---

### User Story 2 - Crear un módulo (Priority: P1)

Quien administra el Backoffice necesita dar de alta un módulo nuevo (por ejemplo "Inventario", de
Clínica) indicando su tipo, su nombre, su clave y cuáles de las cuatro acciones tiene, para poder
empezar a darle permisos a los roles.

**Why this priority**: es la capacidad central de la feature: sin poder crear módulos no hay dónde
más dar de alta las partes nuevas del sistema.

**Independent Test**: crear el módulo "Inventario" (Clínica, clave `inventory`) con dos de sus
cuatro acciones y comprobar que aparece de inmediato en el grupo de Clínica con esas dos acciones
marcadas y las otras dos sin marcar.

**Acceptance Scenarios**:

1. **Given** una persona con `modules:write`, **When** completa tipo, nombre, clave y dos acciones
   y guarda, **Then** el módulo aparece en el listado con esas dos acciones marcadas.
2. **Given** el módulo `inventory` ya creado, **When** alguien intenta crear otro con la misma
   clave o el mismo nombre (aunque cambien las mayúsculas), **Then** la solicitud se rechaza con un
   mensaje que lo explica, sin crear nada.
3. **Given** el formulario de alta, **When** se escribe una clave con mayúsculas, que empieza con
   un número o con más de 50 caracteres, **Then** se explica el formato esperado antes de guardar.
4. **Given** el formulario de alta, **When** no se indica el orden, **Then** el módulo queda al
   final de todos los módulos existentes, sin importar su tipo.

---

### User Story 3 - Modificar un módulo (Priority: P2)

Quien administra el Backoffice necesita corregir el nombre, la descripción, el orden o las acciones
habilitadas de un módulo existente, con la garantía de que su clave y su tipo nunca cambian.

**Why this priority**: es un refinamiento necesario pero no bloqueante: los módulos ya se pueden
crear y usar sin esta operación.

**Independent Test**: editar "Agenda y citas", cambiar su descripción y desmarcar "Eliminar",
guardar y comprobar que el listado refleja el cambio y que su clave y su tipo siguen igual.

**Acceptance Scenarios**:

1. **Given** el módulo `appointments`, **When** se cambia su nombre, su descripción o su orden,
   **Then** el cambio se guarda y su clave y su tipo no cambian; la pantalla nunca ofrece editarlos.
2. **Given** el módulo `appointments`, **When** se marca una acción que no tenía, **Then** queda
   disponible de inmediato como permiso de ese módulo.
3. **Given** el módulo `appointments`, **When** se desmarca una acción que ya tenía, **Then** se
   pide confirmar explícitamente antes de guardar, nombrando el módulo y la acción, porque algún
   role podría perder esa acción.
4. **Given** el módulo base `users`, **When** se abre para editar, **Then** su nombre, descripción
   y orden se pueden cambiar igual que en cualquier otro módulo.

---

### User Story 4 - Bloquear y desbloquear un módulo (Priority: P2)

Quien administra el Backoffice necesita retirar temporalmente un módulo —y el acceso que dan sus
acciones— sin perder su información, y poder revertirlo.

**Why this priority**: es una operación reversible de uso frecuente, pero el sistema ya es útil sin
ella mientras no haga falta retirar nada.

**Independent Test**: bloquear `inventory`, comprobar que desaparece del listado de Activos y
aparece en el de Bloqueados, y que sus acciones ya no figuran como permisos activos; desbloquearlo y
comprobar que todo vuelve a como estaba.

**Acceptance Scenarios**:

1. **Given** el módulo Activo `inventory`, **When** se bloquea, **Then** deja de verse con el
   filtro Activos y aparece con el filtro Bloqueados, con sus mismos datos.
2. **Given** `inventory` bloqueado, **When** se desbloquea, **Then** vuelve a verse como Activo con
   los mismos datos y las mismas acciones de antes.
3. **Given** uno de los cuatro módulos base (Usuarios, Roles, Permisos, Módulos), **When** se
   intenta bloquear, **Then** la opción no está disponible, con una explicación de por qué.
4. **Given** `inventory` ya bloqueado por otra persona un instante antes, **When** se intenta
   bloquear de nuevo, **Then** se informa que ya está bloqueado, sin romper la pantalla.

---

### User Story 5 - Eliminar un módulo (Priority: P2)

Quien administra el Backoffice necesita dar de baja un módulo de forma definitiva, aunque alguna de
sus acciones ya esté asignada a un role.

**Why this priority**: es una operación irreversible y menos frecuente que bloquear; el sistema ya
funciona sin ella mientras no haga falta dar de baja un módulo por completo.

**Independent Test**: eliminar `inventory` (con alguna acción ya asignada a un role) y comprobar que
el módulo y sus acciones desaparecen de toda lista y consulta, y que después se puede crear un
módulo nuevo con la misma clave.

**Acceptance Scenarios**:

1. **Given** el módulo `inventory` con alguna acción asignada a un role, **When** se elimina tras
   confirmar (nombrando el módulo), **Then** el módulo y todas sus acciones desaparecen de toda
   lista y consulta.
2. **Given** `inventory` ya eliminado, **When** se crea un módulo nuevo con la misma clave, **Then**
   se permite.
3. **Given** uno de los cuatro módulos base, **When** se intenta eliminar, **Then** la opción no
   está disponible, con una explicación de por qué.

---

### Edge Cases

- ¿Qué pasa si se crea un módulo con un nombre que ya usa otro módulo no eliminado, aunque cambien
  las mayúsculas? Se rechaza igual que con la clave repetida, sin crear nada.
- ¿Qué pasa si falla la conexión con la plataforma mientras se carga el listado? Se muestra un
  estado de error con la opción de reintentar, conservando los filtros ya elegidos.
- ¿Qué pasa si dos personas editan el mismo módulo a la vez y una guarda primero? La segunda ve, al
  guardar, el aviso de que algo cambió mientras tanto y puede recargar para ver el estado actual
  antes de reintentar.
- ¿Qué pasa si se busca un texto que no coincide con ningún módulo? Se muestra que no hay resultados
  para esa búsqueda, distinto del aviso de que no hay módulos.
- ¿Qué pasa si se intenta desmarcar la acción Ver de un módulo? No se permite: Ver permanece siempre
  marcada mientras el módulo exista, porque ninguna otra acción tiene sentido sin ella.
- ¿Qué pasa si se intenta editar, bloquear o eliminar un módulo que alguien más acaba de eliminar?
  Se informa que ya no existe.
- ¿Qué pasa con las acciones de un módulo que ya estaban asignadas a un role cuando el módulo se
  bloquea? Dejan de dar acceso mientras el módulo esté bloqueado, sin que el role pierda la
  asignación; recuperan su efecto en cuanto el módulo se desbloquea.

## Requirements *(mandatory)*

### Functional Requirements

**Consultar el catálogo**

- **FR-001**: El sistema MUST mostrar, a quien tenga `modules:read`, la lista completa de los
  módulos Activos, agrupada en dos secciones —Sistema y Clínica—, cada una con su propio conteo y
  ordenada por el orden de aparición de cada módulo dentro de su tipo.
- **FR-002**: Cada módulo de la lista MUST mostrar su nombre, su clave, su tipo y las acciones (Ver,
  Crear, Modificar, Eliminar) que tiene habilitadas.
- **FR-003**: Los cuatro módulos base (Usuarios, Roles, Permisos y Módulos) MUST distinguirse
  visualmente de los demás en la lista.
- **FR-004**: El sistema MUST permitir filtrar la lista por tipo (Todos, Sistema o Clínica) y por
  estatus (Activos o Bloqueados); sin elegir un estatus, MUST mostrar solo los Activos.
- **FR-005**: El sistema MUST permitir buscar por texto libre que coincida con el nombre o la clave
  de un módulo, combinándose con los filtros de tipo y de estatus vigentes.
- **FR-006**: El estado de los filtros y de la búsqueda MUST reflejarse en la dirección de la
  pantalla, de modo que se pueda compartir, recargar o volver atrás sin perderlo.
- **FR-007**: Quien no tenga `modules:read` MUST NOT ver la sección "Módulos" en la navegación
  principal ni poder entrar a su pantalla.

**Crear un módulo**

- **FR-008**: Quien tenga `modules:write` MUST poder crear un módulo nuevo indicando su tipo
  (Sistema o Clínica), su nombre y su clave, y opcionalmente su descripción y su orden de
  aparición.
- **FR-009**: La clave MUST escribirse en minúsculas, empezar con una letra y usar solo letras,
  números y guion bajo, con un máximo de 50 caracteres; si no se cumple, el sistema MUST explicar el
  formato esperado antes de guardar.
- **FR-010**: El nombre MUST tener entre 1 y 100 caracteres; la descripción es opcional, hasta 500.
- **FR-011**: Si no se indica el orden al crear, el sistema MUST calcular uno que deje el módulo al
  final de todos los módulos existentes (sin importar su tipo), sin que la persona necesite conocer
  el número exacto.
- **FR-012**: Al crear, la persona MUST poder elegir cuáles de las cuatro acciones tiene el módulo
  nuevo; las cuatro MUST aparecer marcadas por omisión.
- **FR-013**: Un intento de crear un módulo con una clave o un nombre ya usados por otro módulo no
  eliminado (sin distinguir mayúsculas en el nombre) MUST rechazarse con un mensaje que lo explica,
  sin crear nada.

**Modificar un módulo**

- **FR-014**: Quien tenga `modules:update` MUST poder modificar el nombre, la descripción, el orden
  y las acciones habilitadas de un módulo Activo.
- **FR-015**: La clave y el tipo de un módulo MUST NOT poder cambiarse después de creado; la
  pantalla los MUST mostrar como información fija, nunca como campos editables.
- **FR-016**: Marcar una acción que el módulo no tenía MUST dejarla disponible de inmediato como
  permiso de ese módulo; desmarcar una que sí tenía MUST quitarla.
- **FR-017**: Desmarcar una acción que el módulo ya tenía MUST pedir confirmación explícita antes de
  guardar, nombrando el módulo y la acción, porque algún role podría perder esa acción (el sistema
  no distingue si de verdad algún role la tenía asignada: avisa siempre, para no arriesgarse a
  omitirlo).
- **FR-018**: Ver MUST permanecer siempre marcada: el sistema MUST NOT permitir guardar un módulo
  sin esa acción habilitada.

**Bloquear y desbloquear**

- **FR-019**: Quien tenga `modules:update` MUST poder bloquear un módulo Activo; uno Bloqueado MUST
  dejar de aparecer en el listado salvo con el filtro de estatus Bloqueados, y sus acciones MUST
  dejar de dar acceso a quien las tuviera, sin perder la información del módulo.
- **FR-020**: Quien tenga `modules:update` MUST poder desbloquear un módulo Bloqueado, devolviéndolo
  de inmediato a como estaba, con sus mismas acciones vigentes.
- **FR-021**: Los cuatro módulos base MUST NOT poder bloquearse; la opción MUST NOT ofrecerse para
  ellos, con una explicación de por qué.

**Eliminar un módulo**

- **FR-022**: Quien tenga `modules:delete` MUST poder eliminar un módulo Activo o Bloqueado, incluso
  si alguna de sus acciones ya está asignada a uno o más roles; el sistema MUST pedir confirmación
  explícita que nombre el módulo antes de eliminarlo.
- **FR-023**: Eliminar un módulo MUST eliminar también, en la misma operación, todas sus acciones;
  quien ya las tuviera por un role las MUST perder.
- **FR-024**: Los cuatro módulos base MUST NOT poder eliminarse; la opción MUST NOT ofrecerse para
  ellos, con una explicación de por qué.

**Errores y navegación**

- **FR-025**: Todo rechazo (clave o nombre repetidos, formato inválido, módulo base, módulo que ya
  no existe, etc.) MUST mostrarse en español, cerca del campo o de la acción que lo originó, sin
  detalles técnicos ni mensajes crudos de la plataforma.
- **FR-026**: La sección "Módulos" MUST aparecer en el menú principal del Backoffice, visible solo
  para quien tenga `modules:read`; el orden del menú MUST quedar: Panel, Módulos, Usuarios,
  Suscripciones, Token.

### Key Entities

- **Módulo**: una parte administrable del sistema, con clave (identificador estable y único), nombre
  (lo que ve la gente, también único), descripción opcional, un orden de aparición, un tipo (Sistema
  o Clínica, fijo desde su creación) y un estatus (Activo o Bloqueado). Cuatro módulos —Usuarios,
  Roles, Permisos y Módulos— son "base": no se pueden bloquear ni eliminar.
- **Tipo de módulo**: Sistema (pantallas del propio Backoffice) o Clínica (aplicación para las
  clínicas); decide a qué tipo de role se le pueden dar las acciones de ese módulo.
- **Acción de un módulo**: una de cuatro posibles —Ver, Crear, Modificar, Eliminar—; cada una
  marcada en un módulo es, en los hechos, un permiso que después se asigna a los roles en la
  pantalla "Roles y permisos" (fuera de esta spec).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Toda persona con el permiso de ver módulos puede consultar el catálogo completo
  (Sistema y Clínica) con sus acciones, sin tener que pasar de página.
- **SC-002**: Crear un módulo con sus acciones lo deja visible, con esas acciones correctas, en el
  listado en el 100 % de los casos probados.
- **SC-003**: El 100 % de los intentos de crear o modificar un módulo con una clave o un nombre ya
  usados se rechaza, explicando el motivo, sin cambiar ni crear nada.
- **SC-004**: El 100 % de los intentos de bloquear o eliminar uno de los cuatro módulos base se
  rechaza, y la persona entiende por qué sin necesidad de ayuda externa.
- **SC-005**: Al bloquear un módulo, sus acciones dejan de dar acceso de inmediato; al
  desbloquearlo, lo recuperan también de inmediato.
- **SC-006**: Encontrar un módulo bloqueado específico, para desbloquearlo, toma menos de 10
  segundos usando los filtros de tipo y estatus junto con la búsqueda.
- **SC-007**: El 100 % de las personas sin el permiso de ver módulos no ve la sección "Módulos" en
  la navegación ni puede acceder a su pantalla.
- **SC-008**: Modificar el nombre, la descripción o el orden de un módulo nunca cambia su clave ni
  su tipo, en el 100 % de los casos probados.

## Assumptions

- Los cuatro módulos protegidos (Usuarios, Roles, Permisos y Módulos) se reconocen por su clave fija
  (`users`, `roles`, `permissions`, `modules`); la plataforma ya impide bloquearlos o eliminarlos, y
  esta pantalla solo refleja esa misma regla, sin inventar una propia.
- El catálogo de módulos es pequeño y acotado (un máximo documentado de 100 módulos Activos) y se
  muestra completo, sin paginar, igual que ya ocurre con el comparativo de Suscripciones.
- Ver permanece siempre marcada en un módulo: no tiene sentido una acción de Crear, Modificar o
  Eliminar sin poder ver lo que se está cambiando.
- Esta pantalla consulta el mismo servicio (la API de MailySoft Usuarios) que ya usa el Backoffice
  para administrar usuarios y sus roles; no agrega un servicio nuevo.
- El panel para crear o editar un módulo vive en la misma pantalla del listado (maestro-detalle),
  como muestran las páginas 11 a 14 del mockup, y no como páginas separadas de alta y edición —a
  diferencia de cómo hoy funcionan Usuarios y Suscripciones.
- Fuera de alcance de esta feature: la pantalla "Roles y permisos" (páginas 15 a 18 del mismo
  mockup); la pantalla "Clínicas" (todavía no existe en el Backoffice); cualquier cambio a Usuarios
  o Suscripciones. El día que esas pantallas existan, su lugar en el menú principal es el que ya
  muestra el mockup completo (Roles y permisos entre Módulos y Usuarios; Clínicas después de
  Suscripciones).
- La constitución vigente del proyecto describe el alcance del producto como usuarios, suscripciones
  y clínicas; esta feature agrega módulos como un cuarto recurso administrado. Si eso amerita
  actualizar esa sección de la constitución queda como decisión de quien gobierna el proyecto, fuera
  de alcance de esta spec.
- Los textos de la interfaz van en español, centralizados en el módulo de mensajes ya existente; el
  código, los nombres de archivo y los mensajes de commit van en inglés, siguiendo la constitución
  del proyecto.
