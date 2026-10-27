# Feature Specification: Límite de clínicas por tipo y ajustes visuales del formulario de suscripción

**Feature Branch**: `019-add-clinics-limit`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Quiero que cambies el control de tipo de suscripción. Debe ser un botón similar a Autoconsumo. El cambio solo es visual. El valor predeterminado es: Individual. Además, debes cambiar el valor predeterminado del control Autoconsumo a verdadero. Nuevamente el cambio solo es visual. También debes agregar un control para el límite de consultorios. Este cambio es visual y de negocio también. Comportamiento: Si: subscription_type_id == \"Individual\", entonces: El limite de clínicas es igual a 1. No se puede cambiar. Si subscription_type_id != \"Individual\", entonces: El límite de clínicas es mayor que 0 y menor o igual a 100. Actualmente la api de suscripciones no lo considera, pero ya se está haciendo la corrección en la api. En las operaciones de la api el campo se llamará: clinics_limit"

Esta feature extiende `003-manage-subscription-types`, `012-configure-subscription-plans` y `018-add-subscription-type`, ya implementadas: cambia la apariencia de dos controles ya existentes del formulario de suscripción (tipo y autoconsumo) y agrega un dato nuevo, el límite de clínicas, ligado al tipo de suscripción. Todo lo que esas features ya definen (listado, detalle, Comparativo, permisos, manejo de rechazos, el resto de los límites de la clínica, y la inmutabilidad del tipo) se conserva sin cambio salvo lo que aquí se añade.

**Nota de terminología**: el límite de clínicas (`clinics_limit`) es un dato nuevo y distinto de «Consultorios» (`consulting_rooms_limit`, feature 012) y de «Clínicas» (el número de clínicas que ya tienen la suscripción, de solo lectura, feature 003); ninguno de esos dos campos existentes cambia (confirmado, ver Clarifications).

## Clarifications

### Session 2026-10-26

- Q: El control nuevo que pides, ¿debe limitar las clínicas que puede tener la suscripción, o los consultorios (el campo que ya existe en el formulario, llamado «Consultorios»)? → A: Es un dato nuevo, «Límite de clínicas» (`clinics_limit`), distinto de «Consultorios» (`consulting_rooms_limit`), que no se toca.
- Q: Cuando el operador cambia el tipo a Empresarial en el alta, ¿el límite de clínicas debe aparecer vacío (obligándolo a escribir un valor) o con un valor ya puesto que pueda aceptar o cambiar? → A: Con 1 ya puesto (el mínimo válido); el operador puede dejarlo o cambiarlo a cualquier valor de 1 a 100.
- Q: Al editar una suscripción Empresarial ya existente que todavía no tiene límite de clínicas guardado (por la transición de la API), ¿el campo debe abrir vacío o con 1 ya puesto, igual que en el alta? → A: Con 1 ya puesto, igual que en el alta: el campo nunca aparece vacío.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Limitar el número de clínicas según el tipo de suscripción (Priority: P1)

Un operador que da de alta o modifica una suscripción ve y, cuando aplica, captura cuántas clínicas puede tener como máximo: si la suscripción es Individual, el límite es 1 y no se puede cambiar; si es Empresarial, el operador captura un límite de 1 a 100.

**Why this priority**: Es el único de los tres cambios con una regla de negocio real: evita que una suscripción quede con un límite de clínicas que no corresponde a su tipo. Los otros dos cambios son solo de apariencia.

**Independent Test**: Crear una suscripción Individual y verificar que su límite de clínicas muestra 1 y no se puede tocar; crear una Empresarial con un límite de 15 y verificar que se guarda; intentar guardar una Empresarial con 0, con 101 o sin ningún valor y verificar que se rechaza junto al campo en los tres casos.

**Acceptance Scenarios**:

1. **Given** el formulario de alta, que abre con el tipo en Individual, **When** el operador lo ve, **Then** el límite de clínicas muestra 1 y está deshabilitado, sin poder escribirse.
2. **Given** el formulario de alta, **When** el operador cambia el tipo a Empresarial, **Then** el límite de clínicas se habilita y muestra 1, que el operador puede dejar o cambiar a cualquier valor de 1 a 100.
3. **Given** el formulario de alta con el tipo en Empresarial, **When** el operador escribe un límite de 1 a 100 y guarda con el resto de los datos válidos, **Then** la suscripción se crea con ese límite de clínicas.
4. **Given** el formulario de alta con el tipo en Empresarial, **When** el operador intenta guardar con el límite vacío, en 0, en un número mayor que 100 o con un valor no numérico, **Then** ve un error junto al campo y la suscripción no se crea.
5. **Given** el formulario de alta con el tipo en Empresarial y un límite ya cambiado (por ejemplo, a 20), **When** el operador cambia el tipo de vuelta a Individual, **Then** el límite de clínicas vuelve a mostrar 1, deshabilitado, sin importar lo que había escrito; si vuelve a elegir Empresarial, el campo vuelve a mostrar 1 (no el 20 que había puesto antes).
6. **Given** el detalle de una suscripción Individual, **When** el operador lo ve, **Then** el límite de clínicas muestra 1.
7. **Given** el detalle de una suscripción Empresarial con un límite de clínicas de 20, **When** el operador lo ve, **Then** el límite de clínicas muestra 20.
8. **Given** el formulario de edición de una suscripción Empresarial, **When** el operador cambia el límite de clínicas a un valor de 1 a 100 y guarda, **Then** el nuevo límite se guarda.
9. **Given** el formulario de edición de una suscripción Individual, **When** el operador lo abre, **Then** el límite de clínicas muestra 1, deshabilitado, igual que en el alta.

---

### User Story 2 - El tipo de suscripción se elige con un interruptor, como Autoconsumo (Priority: P2)

Un operador que da de alta o revisa una suscripción ve el tipo (Individual o Empresarial) como un interruptor de una sola línea, igual en apariencia al de Autoconsumo, en vez de las dos opciones seleccionables actuales.

**Why this priority**: Es un cambio de apariencia; no toca qué se guarda ni ninguna de las reglas que ya exige la feature 018 (obligatorio al crear, fijo para siempre, Individual por defecto).

**Independent Test**: Abrir el alta y comprobar que el tipo se ve y se opera como un interruptor de una sola línea, con Individual marcado por defecto; cambiarlo a Empresarial y comprobar que el interruptor y su explicación cambian; abrir una edición y comprobar que se ve igual pero deshabilitado.

**Acceptance Scenarios**:

1. **Given** el formulario de alta, **When** el operador lo ve, **Then** el tipo de suscripción se presenta como un interruptor de una sola línea, con el mismo patrón visual que ya usa Autoconsumo, con su etiqueta y una explicación breve del tipo vigente.
2. **Given** el interruptor en Individual, su posición por defecto, **When** el operador lo activa, **Then** el tipo pasa a Empresarial y la explicación mostrada cambia a la de Empresarial.
3. **Given** el interruptor en Empresarial, **When** el operador lo desactiva, **Then** el tipo vuelve a Individual y la explicación mostrada cambia a la de Individual.
4. **Given** el formulario de edición, **When** el operador lo abre, **Then** ve el mismo interruptor, deshabilitado y marcado en el tipo de la suscripción, con el texto de que no se puede modificar.
5. **Given** el interruptor, **When** se compara con el control de dos opciones que reemplaza, **Then** el dato que se guarda, su obligatoriedad, su valor por defecto y su inmutabilidad al editar no cambian: la única diferencia es la apariencia.

---

### User Story 3 - Autoconsumo activado por defecto en el alta (Priority: P3)

Un operador que da de alta una suscripción ve «Autoconsumo» ya activado, en vez de desactivado.

**Why this priority**: Ahorra una interacción en el caso más común, sin afectar ninguna validación ni el significado del dato; es el cambio más pequeño de los tres.

**Independent Test**: Abrir el alta y comprobar que Autoconsumo aparece activado; guardar sin tocarlo y comprobar que la suscripción se crea con autoconsumo activado; desactivarlo antes de guardar y comprobar que se crea desactivada.

**Acceptance Scenarios**:

1. **Given** el formulario de alta recién abierto, **When** el operador lo ve, **Then** «Autoconsumo» aparece activado.
2. **Given** el formulario de alta con Autoconsumo activado, **When** el operador completa el resto de los datos válidos sin tocar Autoconsumo y guarda, **Then** la suscripción se crea con autoconsumo activado.
3. **Given** el formulario de alta, **When** el operador desactiva Autoconsumo antes de guardar, **Then** la suscripción se crea con autoconsumo desactivado.
4. **Given** el formulario de edición de una suscripción existente, **When** el operador lo abre, **Then** Autoconsumo muestra el valor actual de esa suscripción, nunca el nuevo valor por defecto del alta.

---

### Edge Cases

- ¿El límite de clínicas se valida contra el número de clínicas que la suscripción ya tiene asignadas? No; esta feature no cruza esos dos datos. Si una Empresarial con 30 clínicas asignadas recibe un límite menor, la plataforma decide qué hacer, fuera de esta feature.
- ¿Qué pasa con una suscripción Empresarial que no tenga límite de clínicas guardado (por ejemplo, de transición mientras la API incorpora el dato)? En el detalle se muestra «No disponible»; en la edición, el campo abre con 1 ya puesto, igual que en el alta, y el operador puede dejarlo o cambiarlo a cualquier valor de 1 a 100.
- ¿Qué pasa si el operador alterna varias veces entre Individual y Empresarial antes de guardar? Cada cambio aplica de inmediato la regla del tipo vigente en ese momento (1 y deshabilitado para Individual; 1 y editable para Empresarial); un límite distinto de 1 que el operador haya escrito para Empresarial no se recuerda al volver a elegir Empresarial después de pasar por Individual.
- ¿Qué pasa si se intenta guardar la edición de una suscripción Individual? El límite de clínicas sigue fijo en 1 y nunca se envía como un dato que cambió, igual que ya ocurre con el tipo de suscripción (feature 018).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El formulario de alta DEBE mostrar el límite de clínicas de la suscripción, ligado al tipo elegido en el mismo formulario: con el tipo Individual, el campo DEBE mostrar 1, deshabilitado, sin poder escribirse; con el tipo Empresarial, el campo DEBE estar habilitado, mostrar 1 como valor inicial (que el operador puede dejar o cambiar) y aceptar solo un entero mayor que 0 y menor o igual que 100, mostrando un error junto al campo si se deja vacío o si el valor está fuera de ese rango.
- **FR-002**: Cuando el operador cambie el tipo en el formulario de alta antes de guardar, el límite de clínicas DEBE ajustarse de inmediato a la regla del nuevo tipo (fijo en 1 y deshabilitado para Individual; 1 y editable para Empresarial), sin conservar un valor distinto de 1 que el operador hubiera escrito antes para Empresarial.
- **FR-003**: Al crear o modificar una suscripción, el sistema DEBE enviar el límite de clínicas vigente: 1 cuando el tipo es Individual, o el valor capturado (de 1 a 100) cuando es Empresarial.
- **FR-004**: El formulario de edición DEBE permitir modificar el límite de clínicas mientras el tipo de la suscripción sea distinto de Individual, con la misma regla de 1 a 100, mostrando 1 como valor inicial cuando la suscripción no traiga un límite guardado; mientras el tipo sea Individual, DEBE mostrarlo fijo en 1 y deshabilitado, igual que en el alta.
- **FR-005**: El detalle de una suscripción DEBE mostrar su límite de clínicas junto con el resto de sus datos.
- **FR-006**: El control para elegir el tipo de suscripción (Individual o Empresarial) DEBE presentarse como un interruptor de una sola línea, con el mismo patrón visual que ya usa el control de Autoconsumo (feature 012), en vez de dos opciones seleccionables por separado; la explicación de a quién va dirigido cada tipo DEBE seguir disponible, visible junto al interruptor según el tipo vigente. Este cambio es solo de apariencia: el dato que guarda, su obligatoriedad, su valor por defecto (Individual) y su inmutabilidad después de creada la suscripción (feature 018, FR-001 a FR-005) NO DEBEN cambiar.
- **FR-007**: El formulario de alta DEBE abrir con «Autoconsumo» activado por defecto, en vez de desactivado. El formulario de edición DEBE seguir mostrando el valor real de la suscripción que se edita, nunca este nuevo valor por defecto del alta.
- **FR-008**: Todos los textos, etiquetas y mensajes nuevos de esta función DEBEN estar en español, siguiendo el mismo patrón ya exigido en las features 003, 012 y 018.

### Key Entities *(include if feature involves data)*

- **Suscripción**: además de lo ya definido, tiene un límite de clínicas: un entero que es 1 cuando su tipo es Individual, o de 1 a 100 cuando es Empresarial; obligatorio siempre, pero editable por el operador solo cuando el tipo no es Individual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las suscripciones Individuales, creadas o editadas, quedan con límite de clínicas igual a 1.
- **SC-002**: El 100 % de los intentos de guardar una suscripción Empresarial con el límite de clínicas vacío, en 0 o mayor que 100 muestran el error junto al campo y no se guardan.
- **SC-003**: Un operador ve el límite de clínicas ajustarse al cambiar el tipo en el alta (a 1 deshabilitado, o a 1 editable) sin ninguna recarga ni demora perceptible.
- **SC-004**: El 100 % de las suscripciones Empresariales creadas quedan con el límite de clínicas que el operador capturó, entre 1 y 100.
- **SC-005**: En una revisión visual del formulario, el control de tipo de suscripción se reconoce como un interruptor de una sola línea, igual en apariencia al de Autoconsumo, no como dos opciones separadas.
- **SC-006**: El 100 % de las suscripciones creadas sin que el operador toque Autoconsumo quedan con autoconsumo activado.

## Assumptions

- Dependencia: extiende las features 003-manage-subscription-types, 012-configure-subscription-plans y 018-add-subscription-type, ya implementadas; todo lo que ellas ya definen (listado, detalle, Comparativo, permisos, manejo de rechazos, el resto de los límites de la clínica, y la inmutabilidad del tipo) se conserva sin cambio salvo lo que aquí se añade.
- Terminología: «límite de clínicas» (`clinics_limit`) es un dato nuevo, distinto de «Clínicas» (el número de clínicas que ya tienen la suscripción, de solo lectura, feature 003) y de «Consultorios» (`consulting_rooms_limit`, feature 012); ninguno de esos dos campos existentes cambia (confirmado en Clarifications).
- Dependencia: la API de suscripciones todavía no admite `clinics_limit`; según el pedido, su incorporación ya está en desarrollo del lado de la API. El contrato exacto (si es obligatorio al crear, sus mensajes de rechazo, y si acepta un valor para Individual) se verificará contra el código fuente de `maily-system-api` durante `/speckit-plan`, igual que se hizo con el tipo de suscripción en la feature 018; si para entonces el campo sigue sin existir en la API, el plan debe decidir cómo proceder.
- El límite de clínicas no se valida contra el número de clínicas que la suscripción ya tiene asignadas (dato de solo lectura de la feature 003); esa comprobación, si existe, la hace la plataforma, fuera de esta feature.
- Una suscripción Empresarial sin límite de clínicas guardado (por ejemplo, por la transición del contrato de la API) muestra «No disponible» en el detalle y abre con 1 ya puesto en la edición, igual que en el alta (confirmado en Clarifications): el campo nunca aparece vacío, y el operador puede dejarlo o cambiarlo a cualquier valor de 1 a 100.
- El interruptor del tipo de suscripción (User Story 2) es un cambio de apariencia: no modifica ninguna regla ya definida en la feature 018 (obligatorio al crear, fijo para siempre, Individual por defecto, manejo de rechazos).
- Pruebas: en la fase de especificación no se escriben ni se ejecutan pruebas; se escribirán y ejecutarán en `/speckit-implement`, como exige el principio VII de la constitución.
- Restricciones: la feature respeta la constitución v1.7.0 y el stack ya definido; no introduce tecnologías ni dependencias nuevas.
- Fuera de alcance: cambiar el campo «Consultorios» ya existente; mostrar el límite de clínicas en el listado o en el Comparativo; cualquier validación cruzada entre el límite de clínicas y el número de clínicas ya asignadas; y administrar un tercer tipo de suscripción (sigue fuera de alcance desde la feature 018).
