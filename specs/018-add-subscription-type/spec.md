# Feature Specification: Tipo de suscripción (Individual o Empresarial)

**Feature Branch**: `018-add-subscription-type`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Quiero que incorpores el campo tipo de suscripción a las suscripciones. La api de sistema ya considera esa implementación. C:\Maily\code\maily-system-api\. Dado que en este momento solo existen dos tipos de suscripciones: Individual y Empresarial, ponlo como un toggle button al momento de crear o modificar la suscripción."

Esta feature extiende `003-manage-subscription-types` y `012-configure-subscription-plans`, ya implementadas: agrega el tipo de suscripción (Individual o Empresarial), un dato nuevo que la API de suscripciones ya expone. Todo lo que esas features ya definen (listado, detalle, Comparativo, permisos, manejo de rechazos, concurrencia, formato) se conserva sin cambio salvo lo que aquí se añade.

Ajuste respecto del pedido original: el pedido describe el control como disponible "al crear o modificar"; la API de suscripciones, ya implementada, exige el tipo como dato obligatorio al crear y lo deja fijo para siempre, rechazando explícitamente cualquier intento de enviarlo al modificar (ver Assumptions). Por eso esta spec ofrece el control de elegir el tipo solo en el alta, y lo muestra en la edición como un dato ya fijado, sin poder cambiarlo, igual que ya ocurre con el estatus y el número de clínicas.

## Clarifications

### Session 2026-10-26

- Q: Cuando el operador abre el formulario de alta, ¿el control de tipo debe empezar sin ninguna opción marcada (obligándolo a elegir activamente) o con "Individual" ya preseleccionado (y puede cambiarlo a Empresarial antes de guardar)? → A: Con "Individual" preseleccionado por defecto; el operador puede cambiarlo a Empresarial antes de guardar, y el guardado nunca se bloquea por falta de selección.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el tipo al crear una suscripción (Priority: P1)

Un operador que da de alta una nueva suscripción indica si es para un médico independiente (Individual) o para una empresa con varias clínicas (Empresarial), mediante un control de selección única que abre con Individual ya marcado por defecto y que puede cambiar a Empresarial antes de guardar. Es un dato obligatorio, pero el operador nunca necesita tocar el control para dejar una suscripción con un tipo válido.

**Why this priority**: Es el núcleo del pedido: sin el tipo, una suscripción nueva queda incompleta frente al contrato ya vigente de la API, que lo exige para crear.

**Independent Test**: Abrir el formulario de alta y verificar que Individual aparece ya marcado; guardar sin tocar el control y verificar que la suscripción queda Individual; crear otra cambiando el control a Empresarial y verificar que queda guardada con ese tipo, visible en su detalle.

**Acceptance Scenarios**:

1. **Given** el formulario de alta recién abierto, **When** el operador lo ve, **Then** encuentra un control con dos opciones, Individual y Empresarial, cada una con su nombre y una breve explicación de a quién va dirigida, con Individual ya marcado por defecto.
2. **Given** el formulario de alta, **When** el operador cambia el control a Empresarial (o lo deja en Individual), completa el resto de los datos válidos y guarda, **Then** la suscripción se crea con el tipo marcado, el operador llega a su detalle con una notificación de éxito y el detalle muestra ese tipo.
3. **Given** el formulario de alta con el resto de los datos válidos, **When** el operador guarda sin tocar el control de tipo, **Then** la suscripción se crea con tipo Individual, el valor con el que abrió el formulario.
4. **Given** el formulario de alta con Individual marcado por defecto, **When** el operador elige Empresarial y después vuelve a elegir Individual antes de guardar, **Then** solo queda marcada la última opción elegida.
5. **Given** que la plataforma rechaza la creación porque el tipo marcado ya no existe en su catálogo (por ejemplo, por un cambio entre que se abrió el formulario y se guardó), **When** el operador guarda, **Then** ve el motivo junto al control, conserva el resto de los datos capturados y la suscripción no se crea.

---

### User Story 2 - Ver el tipo de una suscripción, también al editarla (Priority: P2)

Un operador que abre el detalle de una suscripción, o su formulario de edición, ve si es Individual o Empresarial, y sabe que ya no se puede cambiar.

**Why this priority**: Conocer el tipo es necesario para entender la oferta y para no intentar cambiarlo por error; depende de que la suscripción ya exista (User Story 1).

**Independent Test**: Abrir el detalle de una suscripción Individual y el de una Empresarial y verificar que cada una muestra su tipo; abrir el formulario de edición de cada una y verificar que el control muestra el tipo correspondiente, deshabilitado; guardar un cambio en otro dato y verificar que el tipo no cambió.

**Acceptance Scenarios**:

1. **Given** el detalle de una suscripción, **When** el operador lo abre, **Then** ve su tipo (Individual o Empresarial) junto con el resto de sus datos.
2. **Given** el formulario de edición de una suscripción, **When** el operador lo abre, **Then** ve el control con el tipo actual marcado, deshabilitado, y un texto que explica que el tipo no se puede modificar después de creada.
3. **Given** el formulario de edición, **When** el operador cambia otros datos válidos (por ejemplo, el nombre o el precio) y guarda, **Then** el tipo de la suscripción no cambia.
4. **Given** una suscripción creada antes de que existiera esta función, **When** el operador abre su detalle o su edición, **Then** ve igualmente un tipo asignado (Individual o Empresarial), nunca un dato vacío o "no disponible".

---

### Edge Cases

- ¿Qué pasa si el operador intenta cambiar el tipo desde la edición? No se ofrece ningún control para eso: se muestra fijo y deshabilitado, y el sistema nunca envía un tipo a la plataforma al modificar, aunque el resto de los datos cambie.
- ¿Qué pasa con las suscripciones que ya existían antes de esta función? Ya tienen un tipo asignado por la plataforma (ver Assumptions) y se muestran con normalidad, sin ningún aviso especial ni distinción frente a una creada después.
- ¿Qué relación tiene el tipo con el número de clínicas de la suscripción? Ninguna que el backoffice deba aplicar: esa relación (una clínica si es Individual, cualquier cantidad si es Empresarial) la administra el sistema de clínicas, fuera de esta feature; el backoffice solo muestra el tipo y el número de clínicas que ya mostraba antes, sin cruzarlos ni validarlos entre sí.
- ¿Qué pasa si en el futuro la plataforma agrega un tercer tipo a su catálogo? Fuera de alcance de esta feature: hoy son exactamente dos, y el control ofrece solo esas dos opciones.
- ¿Qué pasa si la plataforma no puede confirmar el tipo elegido al guardar el alta (por ejemplo, error de red o del servidor)? Sigue el mismo manejo de rechazos ya definido en la feature 003 (mensaje genérico con opción de reintentar, sin crear nada ni asumir éxito).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El formulario de alta de una suscripción DEBE ofrecer un control de selección única con las dos opciones visibles, Individual y Empresarial, con Individual marcado por defecto al abrir el formulario; el operador DEBE poder cambiarlo a Empresarial (o volver a Individual) en cualquier momento antes de guardar. El guardado NUNCA DEBE bloquearse por falta de selección, porque el control siempre tiene una opción marcada.
- **FR-002**: Cada opción del control DEBE presentarse con su nombre (Individual, Empresarial) y una breve explicación de a quién va dirigida (Individual: médico independiente con un solo consultorio; Empresarial: empresa con varias clínicas y varios consultorios), para que el operador elija con criterio.
- **FR-003**: Al crear una suscripción, el sistema DEBE enviar a la plataforma el tipo elegido junto con el resto de los datos de alta ya definidos en las features 003 y 012.
- **FR-004**: El formulario de edición de una suscripción NO DEBE ofrecer ninguna forma de cambiar su tipo: DEBE mostrar el control con el tipo actual marcado y deshabilitado, junto con un texto que explique que el tipo queda fijo para siempre desde la creación.
- **FR-005**: Al guardar el formulario de edición, el sistema NUNCA DEBE enviar el tipo a la plataforma, sin importar lo que muestre el control ni qué otros datos cambien.
- **FR-006**: El detalle de una suscripción DEBE mostrar su tipo (Individual o Empresarial) junto con el resto de sus datos, siguiendo el mismo patrón ya definido en la feature 003 (FR-003).
- **FR-007**: Cuando la plataforma rechace la creación porque el tipo marcado ya no existe en su catálogo (por ejemplo, por un cambio entre que se abrió el formulario y se guardó), el sistema DEBE mostrar el motivo junto al control, en español y sin el texto del servidor, conservar el resto de los datos capturados y no crear la suscripción, siguiendo el mismo patrón de manejo de rechazos ya definido en la feature 003 (FR-010).
- **FR-008**: Todos los textos, etiquetas y mensajes de esta función DEBEN estar en español, siguiendo el mismo patrón ya exigido en las features 003 y 012.

### Key Entities *(include if feature involves data)*

- **Suscripción**: además de los atributos ya definidos en las features 003 y 012, tiene un tipo (Individual o Empresarial), obligatorio desde su creación y fijo para siempre.
- **Tipo de suscripción**: catálogo de la plataforma, administrado a mano (igual que el estatus de suscripción), que hoy tiene exactamente dos valores: Individual (médico independiente; su consultorio se asocia a una sola clínica) y Empresarial (empresa con varias clínicas y varios consultorios por clínica). Se reconoce por su identificador, no por su nombre. Se asigna obligatoriamente al crear una suscripción y ninguna operación posterior lo modifica.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las suscripciones creadas desde el backoffice quedan con un tipo válido (Individual o Empresarial, el marcado por el operador o el valor por defecto); 0 se crean sin tipo.
- **SC-002**: El 100 % de las suscripciones creadas sin que el operador toque el control de tipo quedan como Individual, el valor por defecto, sin ninguna acción adicional de su parte.
- **SC-003**: 0 suscripciones cambian de tipo a través del backoffice después de creadas, en cualquier prueba de edición.
- **SC-004**: Un operador que necesita el tipo Empresarial lo logra con una sola interacción (un clic en el control); quien necesita Individual no realiza ninguna interacción adicional, porque ya es el valor con el que abre el formulario.
- **SC-005**: El 100 % de las suscripciones, creadas antes o después de esta función, muestran un tipo válido en su detalle y en su edición, nunca un valor vacío o "no disponible".

## Assumptions

- Dependencia: extiende las features 003-manage-subscription-types y 012-configure-subscription-plans, ya implementadas; todo lo que ellas ya definen (listado, detalle, Comparativo, permisos, manejo de rechazos, concurrencia, formato de moneda y fecha) se conserva sin cambio salvo lo que aquí se añade.
- Dependencia: la API de suscripciones (repositorio `maily-system-api`, feature `006-add-subscription-type`) ya implementa el tipo de suscripción como catálogo propio, verificado directamente en su código fuente y en su contrato (`specs/006-add-subscription-type/contracts/openapi-subscriptions.yaml` y `error-catalog.md` de ese repositorio). El contrato exacto (operaciones, esquemas y códigos de rechazo) se documentará en `contracts/` de esta feature durante `/speckit-plan`.
- El tipo es un catálogo administrado a mano por la plataforma (igual que el estatus de suscripción), hoy con exactamente dos valores, Individual y Empresarial; un tercer valor futuro sería un cambio del catálogo de la plataforma, no de esta feature, y queda fuera de alcance.
- El tipo es obligatorio al crear y fijo para siempre: la plataforma rechaza explícitamente cualquier intento de modificarlo después de creada la suscripción, incluso con el mismo valor que ya tiene. Por eso el backoffice ofrece el control de elegir el tipo solo en el alta y lo muestra fijo y deshabilitado en la edición (ajuste frente al pedido original, que mencionaba el control también al modificar).
- Las suscripciones creadas antes de esta función ya tienen un tipo asignado por la plataforma (mediante una migración que corrió una sola vez al desplegar esa API); el backoffice nunca necesita manejar una suscripción sin tipo.
- La relación entre el tipo y cuántas clínicas puede tener una suscripción (una si es Individual, cualquier cantidad si es Empresarial) la administra el sistema de clínicas, fuera de esta feature y de la API de suscripciones: el backoffice no valida ni aplica esa relación.
- Pruebas: en la fase de especificación no se escriben ni se ejecutan pruebas; se escribirán y ejecutarán en `/speckit-implement`, como exige el principio VII de la constitución.
- Restricciones: la feature respeta la constitución v1.7.0 y el stack ya definido; no introduce tecnologías ni dependencias nuevas.
- Fuera de alcance: cambiar el tipo de una suscripción ya creada; administrar el catálogo de tipos (agregar, editar o eliminar tipos); mostrar el tipo como columna del listado o del Comparativo (feature 012); filtrar o buscar por tipo; y cualquier regla de negocio sobre cuántas clínicas puede tener una suscripción según su tipo.
