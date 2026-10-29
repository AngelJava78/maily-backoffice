# Feature Specification: Módulos de suscripción según el catálogo de la API y acción «Ver» editable

**Feature Branch**: `022-modules-catalog-view-action`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Módulos de suscripción según el catálogo de la API de usuarios y acción «Ver» editable en la pantalla de Módulos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los módulos reales de una suscripción en su detalle y en el comparativo (Priority: P1)

Un administrador abre el detalle de cualquier suscripción, o el comparativo de planes, y ve exactamente los módulos de clínica que la suscripción tiene guardados, con su nombre y descripción vigentes, en el mismo orden en que el catálogo de módulos los presenta en el formulario de alta y edición.

**Why this priority**: Hoy el detalle y el comparativo recorren una lista fija de 9 keys que ya no existen en el catálogo real (`scheduling`, `clinical_records`, `clinical_record_templates`, entre otros). El resultado es que toda suscripción con módulos actuales (`schedule`, `appointments`, `overview`, etc.) se ve incompleta o como si no incluyera nada: es un defecto de exactitud de datos visible en cada suscripción, en las dos pantallas donde un administrador revisa o compara planes. Es la prioridad más alta porque afecta la confianza en la información que el Backoffice muestra, todos los días, para cada suscripción existente.

**Independent Test**: Puede probarse por completo abriendo el detalle de una suscripción con módulos del catálogo vigente y comprobando que aparecen todos por su nombre correcto, y abriendo el comparativo y comprobando que tiene una fila por cada módulo activo del catálogo. No depende de ninguna otra historia de esta especificación.

**Acceptance Scenarios**:

1. **Given** una suscripción "Saturno" guardada con los 18 módulos del catálogo vigente marcados, **When** un administrador abre su detalle, **Then** ve los 18 módulos listados por su nombre, en el orden de `sort_order` del catálogo, sin ninguna línea de "No incluye".
2. **Given** el comparativo de suscripciones vigentes, **When** un administrador lo abre, **Then** ve una fila por cada módulo activo del catálogo de tipo Clínica, en el orden de `sort_order`, con una marca de incluido o no incluido por cada suscripción de la columna.
3. **Given** una suscripción guardada con un `key` que ya no está en el catálogo vigente (un módulo que se desactivó después), **When** un administrador abre su detalle, **Then** ese `key` aparece igual, al final de los incluidos, con la etiqueta "(no disponible)"; en el comparativo ese `key` no genera ninguna fila.
4. **Given** la consulta del catálogo de módulos falla, **When** un administrador abre el detalle o el comparativo, **Then** ve el mismo estado de error con opción de reintentar que ya usa el formulario de alta y edición, y un indicador de carga mientras la consulta está en curso.
5. **Given** se da de alta en la API de usuarios un módulo nuevo, activo y de tipo Clínica, **When** un administrador abre el formulario, el detalle o el comparativo de cualquier suscripción, **Then** el módulo nuevo aparece en los tres, sin que el Backoffice haya cambiado código alguno.

---

### User Story 2 - Marcar y desmarcar la acción «Ver» al crear o editar un módulo (Priority: P2)

Un administrador abre el panel de crear o editar un módulo, en la pantalla de Módulos, y puede marcar o desmarcar la acción «Ver» igual que marca o desmarca Crear, Modificar o Eliminar.

**Why this priority**: Hoy la casilla de «Ver» está siempre deshabilitada. Para un módulo que no tiene el permiso `read` (por ejemplo uno recién creado con `active_permissions_count: 0`), esa casilla aparece desmarcada y bloqueada, así que el formulario nunca puede guardarse: la validación exige «Ver» marcado, pero el único control que lo marcaría está inhabilitado. Ese módulo queda sin poder editarse en absoluto, ni siquiera para cambiarle el nombre. Es la segunda prioridad porque bloquea por completo la edición de registros concretos ya existentes en la pantalla de Módulos.

**Independent Test**: Puede probarse por completo abriendo la edición de un módulo sin ningún permiso, marcando «Ver» y guardando, y comprobando que el permiso se creó y que el módulo puede guardarse también sin marcar ninguna acción. No depende de la historia 1 ni de la 3.

**Acceptance Scenarios**:

1. **Given** el módulo "overview" sin ningún permiso (`active_permissions_count: 0`), **When** un administrador marca «Ver» y guarda, **Then** se crea el permiso `overview:read` y el módulo queda con `active_permissions_count: 1`.
2. **Given** el módulo "overview" sin ningún permiso, **When** un administrador cambia solo el nombre y guarda, sin marcar ninguna acción, **Then** el cambio se guarda sin error.
3. **Given** el módulo "schedule" con las cuatro acciones marcadas, **When** un administrador desmarca «Ver» dejando «Crear» marcado y guarda, **Then** ve el error "Para usar Crear, Modificar o Eliminar, marca también Ver." y el guardado no se envía.
4. **Given** el módulo "schedule" con las cuatro acciones marcadas, **When** un administrador desmarca las cuatro, **Then** se le pide la misma confirmación que ya se pide hoy al quitar cualquier acción existente, y al aceptar, se eliminan los cuatro permisos.
5. **Given** el panel de "Nuevo módulo", **When** un administrador lo abre, **Then** las cuatro acciones aparecen marcadas por defecto y puede desmarcar «Ver» igual que las demás, con la misma regla del escenario 3.

---

### User Story 3 - Guardar una suscripción con cualquier combinación de módulos, sin reglas de dependencia (Priority: P3)

Un administrador marca, en el formulario de alta o edición de una suscripción, cualquier combinación de módulos del catálogo vigente (por ejemplo Recordatorios sin Agenda y citas, o Facturación sin Finanzas) y la guarda sin que nada en el Backoffice la rechace por una dependencia entre módulos.

**Why this priority**: Las dependencias entre módulos (`MODULE_PREREQUISITE`) ya no son una regla de negocio: la API de sistema va a dejar de exigirlas, y la selección de módulos del formulario ya no las aplica desde la funcionalidad anterior. Lo que falta es retirar los restos que todavía las mencionan en el Backoffice — el catálogo fijo de 9 módulos (`CLINIC_MODULE_ORDER`, `MODULE_PREREQUISITE`, `clinicModuleCatalog.ts`) y el manejo del error 409 `subscription_module_prerequisite_missing` — y hacer que los simuladores de prueba validen contra su propio catálogo en vez de esa lista fija. Es la prioridad más baja de las tres porque hoy esto no bloquea ningún flujo real de un administrador: es orden y preparación para cuando la API de sistema retire la regla, además de dejar las pruebas libres de un supuesto que ya no aplica.

**Independent Test**: Puede probarse por completo marcando, en el alta de una suscripción, un módulo que antes exigía otro (por ejemplo Recordatorios sin Agenda y citas) y comprobando que se guarda sin ningún error. No depende de la historia 1 ni de la 2.

**Acceptance Scenarios**:

1. **Given** el formulario de alta de una suscripción, **When** un administrador marca Recordatorios sin marcar Agenda y citas, o Facturación sin marcar Finanzas, y guarda, **Then** no aparece ningún error y la suscripción se guarda con esos módulos.
2. **Given** el código y las pruebas de la funcionalidad de suscripciones, **When** se revisan después de este cambio, **Then** ninguno hace referencia a una key de módulo concreta, salvo `patients` (el único con tratamiento especial) y los datos de prueba del simulador.

---

### Edge Cases

- ¿Qué ve un administrador si el catálogo de módulos está vacío (ninguno activo de tipo Clínica)? El detalle y el comparativo no tienen ninguna fila ni módulo que mostrar, salvo los `key` guardados que ya no están en el catálogo, tratados como "(no disponible)".
- ¿Qué pasa si una suscripción guardada no tiene ningún `key` que siga en el catálogo vigente? Su detalle muestra únicamente la lista de "(no disponible)", sin módulos incluidos del catálogo; el comparativo no le marca ninguna fila como incluida.
- ¿Qué pasa si dos módulos del catálogo tienen el mismo `sort_order`? Se ordenan entre ellos por `name`.
- ¿Qué pasa si un módulo de Módulos tiene ya las cuatro acciones y un administrador las desmarca una por una? Cada desmarque de una acción que el módulo ya tenía pide su propia confirmación, igual que hoy.
- ¿Qué pasa si un administrador intenta guardar un módulo nuevo sin marcar ninguna acción? Se guarda sin ningún permiso creado (`active_permissions_count: 0`), igual que se permite en edición.
- ¿Qué pasa si, mientras la API de sistema todavía no retira la regla de dependencias, llega una respuesta `subscription_module_prerequisite_missing`? El Backoffice ya no la distingue: cae en el mensaje genérico de error inesperado, porque este código deja de tener manejo propio (FR-010).

## Requirements *(mandatory)*

### Functional Requirements

**Módulos en suscripciones**

- **FR-001**: El formulario de crear y editar una suscripción, su vista previa, el detalle de la suscripción y la tabla comparativa MUST obtener los módulos de `GET /api/v1/modules?type_id=2&status_id=1` de la API de usuarios, reutilizando la misma consulta y la misma caché que ya usa el formulario de alta y edición.
- **FR-002**: Los módulos MUST mostrarse ordenados por `sort_order` ascendente y, en caso de empate, por `name`. El Backoffice aplica este orden él mismo, aunque la API ya los devuelva ordenados.
- **FR-003**: El nombre y la descripción de cada módulo MUST obtenerse del catálogo (`name`, `description`), no de una lista de textos fija del Backoffice.
- **FR-004**: El detalle de la suscripción MUST listar los módulos incluidos en el orden del catálogo, seguido de una línea "No incluye" con los módulos del catálogo que la suscripción no tiene marcados.
- **FR-005**: La tabla comparativa MUST tener una fila por cada módulo del catálogo, en el orden del catálogo.
- **FR-006**: Si una suscripción guardada tiene un `key` que no está en el catálogo vigente (por ejemplo, un módulo que se desactivó), el detalle MUST mostrarlo igual, con su `key` y la etiqueta "(no disponible)", al final de la lista de incluidos. La tabla comparativa no genera ninguna fila para esos `key`.
- **FR-007**: Si la consulta del catálogo de módulos falla, el detalle de la suscripción y la tabla comparativa MUST mostrar el mismo estado de error, con opción de reintentar, que ya usa el formulario de alta y edición. Mientras la consulta está en curso, ambos MUST mostrar un indicador de carga.
- **FR-008**: El Backoffice MUST NOT validar dependencias entre módulos de clínica. Se eliminan del código `MODULE_PREREQUISITE`, `CLINIC_MODULE_ORDER`, el tipo `ClinicModuleKey` y el archivo que los contiene. El único `key` con tratamiento especial (`patients`, siempre marcado y no removible en el formulario) se conserva en un solo lugar del código.
- **FR-009**: `patients` MUST seguir siempre marcado y deshabilitado en el formulario de alta y edición de una suscripción (sin cambios respecto al comportamiento actual).
- **FR-010**: Se elimina el manejo específico del error `subscription_module_prerequisite_missing`. El error `subscription_module_not_found` MUST mostrarse en el campo de módulos del formulario con el mensaje "Revisa los módulos incluidos: alguno no es válido."
- **FR-011**: Los simuladores de prueba de la API de suscripciones MUST validar los `module_keys` recibidos contra su propio catálogo de módulos simulado, no contra una lista fija de keys, y MUST NOT aplicar ninguna regla de dependencia entre módulos. El catálogo por defecto de ese simulador refleja el catálogo real vigente de 18 módulos de clínica (`overview`, `schedule`, `appointments`, `patients`, `prescriptions`, `vital_signs`, `patient_diagnoses`, `templates`, `clinics`, `consulting_rooms`, `staff`, `finance`, `billing`, `expenses`, `incomes`, `services`, `reports`, `reminders`), cada uno con su propio `sort_order`.

**Acción «Ver» en la pantalla de Módulos**

- **FR-012**: En los paneles de crear y editar un módulo, la acción «Ver» MUST poder marcarse y desmarcarse igual que Crear, Modificar y Eliminar. Su casilla nunca está deshabilitada.
- **FR-013**: Marcar «Ver» en un módulo que no lo tiene MUST crear el permiso `<key>:read` al guardar, con el mismo mecanismo que ya usan las demás acciones.
- **FR-014**: Desmarcar «Ver» en un módulo que ya lo tiene MUST pedir la misma confirmación que ya se pide hoy al quitar cualquier otra acción existente, y eliminar el permiso `<key>:read` al guardar si se confirma.
- **FR-015**: Crear, Modificar y Eliminar MUST requerir que «Ver» esté marcado: no se puede guardar un módulo con alguna de esas tres acciones marcada y «Ver» desmarcado. En ese caso MUST mostrarse el mensaje "Para usar Crear, Modificar o Eliminar, marca también Ver." junto al grupo de acciones, y el guardado no se envía.
- **FR-016**: Un módulo MUST poder guardarse sin ninguna acción marcada. Se elimina la validación que hoy exige al menos la acción «Ver».
- **FR-017**: En el panel de "Nuevo módulo", las cuatro acciones siguen marcadas por defecto; «Ver» también se puede desmarcar ahí, sujeto a la misma regla del FR-015.
- **FR-018**: Se elimina la constante que marca «Ver» como la acción requerida, y la lógica que, al desmarcarla, no permitía completar la acción. Esta especificación reemplaza el requisito FR-018 original de la funcionalidad de Módulos (013).

### Key Entities

- **Módulo de clínica (catálogo)**: un módulo activo de tipo Clínica tal como lo da la API de usuarios — `key`, `name`, `description`, `sort_order` — que una suscripción puede incluir. Es la única fuente de nombres, descripciones y orden que las pantallas de suscripciones usan.
- **Suscripción**: ya existente; para esta especificación solo importa su lista de `module_keys` guardados, que puede contener keys ausentes del catálogo vigente.
- **Módulo del sistema (pantalla de Módulos)**: ya existente; para esta especificación importan sus cuatro acciones posibles (Ver, Crear, Modificar, Eliminar) y cuáles tiene activas.
- **Permiso**: la combinación `<key del módulo>:<acción>` que se crea o se elimina al guardar un módulo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador que abre el detalle de cualquier suscripción ve, el 100% de las veces, todos los módulos que la suscripción realmente tiene guardados, por su nombre vigente, sin ninguno mostrado como ausente por error.
- **SC-002**: Dar de alta un módulo nuevo, activo y de tipo Clínica en la API de usuarios lo hace aparecer en el formulario, el detalle y el comparativo de suscripciones sin ningún cambio de código ni redespliegue del Backoffice.
- **SC-003**: Un administrador puede guardar una suscripción con cualquier combinación de módulos activos del catálogo, sin que ninguna combinación sea rechazada por una regla de dependencia.
- **SC-004**: Un administrador puede marcar o desmarcar la acción «Ver» de cualquier módulo, incluidos los que hoy no tienen ningún permiso, sin encontrar la casilla bloqueada.
- **SC-005**: Un módulo puede guardarse con cero acciones marcadas, el 100% de las veces que se intenta.
- **SC-006**: El typecheck, el lint y la suite de pruebas automatizadas (unitarias, de integración y end-to-end) terminan sin ningún fallo causado por este cambio.

## Assumptions

- El orden alfabético usado como criterio de empate en FR-002 es el orden estándar de comparación de texto; no se especificó un criterio de localización distinto.
- Los valores de `sort_order` del catálogo por defecto de 18 módulos del simulador de prueba (FR-011) los asigna quien implemente esta especificación, en el mismo orden en que se listaron, siguiendo el mismo criterio que ya usa el catálogo por defecto actual del simulador (valores espaciados, no consecutivos).
- Los estados de carga, error con reintento y catálogo vacío que el detalle y el comparativo deben mostrar (FR-007) son los mismos que ya existen en el formulario de alta y edición; esta especificación no pide diseños nuevos, solo que las tres pantallas los compartan.
- La confirmación que ya se pide hoy al desmarcar una acción existente de un módulo, y el mensaje de error de un campo o de un grupo de campos del formulario, son los mismos mecanismos ya construidos en la pantalla de Módulos; esta especificación extiende su alcance a la acción «Ver», sin rediseñarlos.
- Mientras la API de sistema todavía no retira la validación de dependencias entre módulos, una respuesta `subscription_module_prerequisite_missing` que llegara a ocurrir en producción deja de tener manejo especial en el Backoffice (FR-010) y se trata como un error inesperado genérico.
- Esta especificación no modifica la matriz de permisos de roles (`features/roles`) ni la API de usuarios ni la API de sistema: solo el código y las pruebas de este Backoffice en las pantallas de Suscripciones y de Módulos.
