# Feature Specification: Catálogo dinámico de módulos de clínica en alta y edición de suscripciones

**Feature Branch**: `021-dynamic-clinic-modules`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Al momento de crear o modificar las suscripciones debe mostrar solamente los módulos activos del tipo clínica.
En ambas pantallas, crear y modificar suscripciones se deben mostar los modulos de tipo clínica activas, ordenados por sort_order.

http://localhost:5173/subscriptions/new
Se deben mostrar los modulos de tipo clínica activas, ordenados por sort_order.

http://localhost:5173/subscriptions/3/edit
Se deben mostrar los modulos de tipo clínica activas, ordenados por sort_order.

Al guardar (POST o PUT) se deben mandar los key de cada modulo seleccionado o habilitado para esa suscripción.

La api de suscripciones devuelve los modulos activos de tipo clínica.
curl --location 'http://127.0.0.1:8000/api/v1/modules?type_id=2&status_id=1' \
--header 'Authorization: Bearer <token>'
Ejemplo del response: [... 2 módulos de ejemplo: administrators, appointments, con id, key, name, description, sort_order, created_at, status, type, active_permissions_count]"

Esta feature reemplaza, en el alta y la edición de suscripciones, la lista fija de nueve módulos de clínica que hoy vive en el código del Backoffice por el catálogo vigente de módulos de clínica activos, el mismo que ya administra la pantalla de Módulos. El nombre, la descripción y el orden de cada módulo pasan a venir de ese catálogo. Las keys de ese catálogo no necesariamente coinciden con las que usan hoy las reglas de «Pacientes siempre incluido» y las dependencias entre módulos (ver Clarifications); por eso esta feature retira la regla de dependencias entre módulos, pero conserva la de «Pacientes» siempre incluido y no editable, evaluada contra la key `patients` del catálogo recibido.

## Clarifications

### Session 2026-10-28

- Q: Cuando el catálogo real trae módulos cuya key no coincide con ninguna de las que hoy usan las reglas de «Pacientes siempre incluido» y las dependencias entre módulos (como pasa en el propio ejemplo de la API, con las keys `administrators` y `appointments`), ¿cómo deben comportarse esos módulos? → A: Se quitan esas reglas por completo; todos los módulos del catálogo se muestran como casillas independientes, sin ninguna marcada por defecto ni ninguna exigencia entre módulos.
- Q: ¿El módulo de Pacientes (key `patients`) debe comportarse como cualquier otro módulo del catálogo (sin trato especial, según la respuesta anterior), o debe volver a aparecer siempre marcado por defecto y no poder quitarse en ninguna suscripción? → A: Vuelve a tener trato especial: el módulo con key `patients` aparece siempre seleccionado por defecto y no se puede quitar en ninguna suscripción (alta o edición), mientras forme parte del catálogo activo de módulos de clínica que devuelve la API. Las dependencias entre módulos (la otra regla retirada en la respuesta anterior) se mantienen retiradas; solo `patients` conserva trato especial. Los módulos que se muestran siguen dependiendo exclusivamente del catálogo que devuelve la API (FR-001, FR-002, FR-005): no se muestra ningún módulo que no esté en ese catálogo, ni siquiera `patients` si llegara a faltar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El alta de una suscripción ofrece los módulos de clínica realmente activos (Priority: P1)

Un operador que da de alta una suscripción ve, en la sección de módulos incluidos, únicamente los módulos de tipo Clínica que están activos en ese momento, en el mismo orden en que aparecen en el catálogo de módulos, en vez de una lista fija de nueve módulos que no refleja si alguno fue desactivado o si se agregó uno nuevo.

**Why this priority**: Es el flujo más usado (dar de alta planes nuevos) y el que hoy puede ofrecer módulos que ya no existen o no mostrar módulos nuevos del catálogo, porque la lista está fija en el código.

**Independent Test**: Abrir el alta de una suscripción y comprobar que la sección de módulos incluidos muestra exactamente los módulos de tipo Clínica activos en el catálogo, en su orden, y que guardar la suscripción registra las keys de los módulos que quedaron marcados.

**Acceptance Scenarios**:

1. **Given** el catálogo de módulos tiene varios módulos de tipo Clínica activos con distinto `sort_order`, **When** el operador abre el alta de una suscripción, **Then** la sección de módulos incluidos los muestra a todos, de menor a mayor `sort_order`, con el nombre y la descripción del catálogo.
2. **Given** el catálogo de módulos tiene módulos de tipo Sistema o módulos de clínica inactivos, **When** el operador abre el alta de una suscripción, **Then** esos módulos no aparecen entre las opciones.
3. **Given** el formulario de alta con varios módulos marcados, **When** el operador guarda la suscripción, **Then** la solicitud enviada incluye exactamente las keys de los módulos que quedaron marcados o habilitados, ni más ni menos.
4. **Given** el catálogo de módulos todavía se está obteniendo, **When** el operador abre el alta de una suscripción, **Then** la sección de módulos muestra un indicador de carga y el botón de guardar permanece deshabilitado hasta que el catálogo termine de cargar.
5. **Given** la obtención del catálogo de módulos falla, **When** el operador abre el alta de una suscripción, **Then** la sección de módulos muestra un estado de error con una opción para reintentar, y el botón de guardar permanece deshabilitado hasta que el catálogo se cargue con éxito.
6. **Given** el catálogo activo de módulos de clínica incluye el módulo con key `patients`, **When** el operador abre el alta de una suscripción e intenta desmarcarlo, **Then** no puede hacerlo: permanece marcado.

---

### User Story 2 - La edición de una suscripción existente también usa el catálogo vigente de módulos (Priority: P2)

Un operador que modifica una suscripción existente ve la misma sección de módulos incluidos, con los módulos de clínica activos del catálogo en su orden, con los módulos que la suscripción ya tenía habilitados marcados cuando siguen activos.

**Why this priority**: Es la misma capacidad que la historia 1 aplicada a la edición; depende de ella pero agrega el caso de una suscripción que ya tiene módulos guardados, algunos de los cuales pueden haber dejado de estar activos en el catálogo.

**Independent Test**: Abrir la edición de una suscripción existente y comprobar que la sección de módulos incluidos muestra los módulos de clínica activos del catálogo, con los que la suscripción ya tenía habilitados marcados (si siguen activos), y que guardar los cambios envía exactamente las keys que quedaron marcadas.

**Acceptance Scenarios**:

1. **Given** una suscripción que ya tiene habilitados varios módulos que siguen activos en el catálogo, **When** el operador abre su edición, **Then** esos módulos aparecen marcados entre las opciones, en el orden del catálogo.
2. **Given** una suscripción que tiene habilitado un módulo cuya key ya no está activa en el catálogo de módulos de clínica, **When** el operador abre su edición, **Then** ese módulo no aparece como opción marcable.
3. **Given** el caso anterior, **When** el operador guarda los cambios sin volver a habilitar ese módulo, **Then** la suscripción deja de incluirlo.
4. **Given** el formulario de edición con el catálogo de módulos ya cargado, **When** el operador marca o desmarca módulos y guarda, **Then** la solicitud enviada incluye exactamente las keys de los módulos que quedaron marcados o habilitados en ese momento.
5. **Given** cualquier suscripción existente, **When** el operador abre su edición e intenta desmarcar el módulo con key `patients`, **Then** no puede hacerlo: permanece marcado, y la solicitud de guardado siempre incluye su key.

---

### Edge Cases

- ¿Qué pasa si el catálogo de módulos de clínica activos está vacío al abrir el alta o la edición? El sistema debe mostrarlo con un mensaje claro de que no hay módulos disponibles, en vez de dejar la sección vacía sin explicación, y el botón de guardar permanece deshabilitado.
- ¿Qué pasa con el módulo cuya key es `patients` (Pacientes)? Mantiene su trato especial: aparece siempre marcado por defecto y no se puede desmarcar, tanto en el alta de una suscripción nueva como en la edición de cualquier suscripción existente, mientras forme parte del catálogo activo de módulos de clínica devuelto por la API.
- ¿Qué pasa si el módulo con key `patients` no forma parte del catálogo activo de módulos de clínica que devuelve la API? No aparece como opción, igual que cualquier otro módulo fuera de ese catálogo (FR-005); en ese caso excepcional no hay ningún módulo marcado como obligatorio.
- ¿Qué pasa con las dependencias que hoy existen entre módulos (por ejemplo, Recordatorios requiere Agenda y citas)? Dejan de aplicarse: el operador puede marcar o desmarcar cualquier módulo (salvo `patients`) sin que eso marque, desmarque o bloquee ningún otro.
- ¿Qué pasa si dos módulos del catálogo comparten el mismo `sort_order`? Se muestran en un orden estable (el mismo orden relativo del catálogo recibido), sin que la pantalla se recargue en un orden distinto cada vez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al abrir el alta de una suscripción, el sistema DEBE obtener la lista vigente de módulos de tipo Clínica activos del catálogo de módulos, en vez de usar una lista fija definida en el código del formulario.
- **FR-002**: Al abrir la edición de una suscripción existente, el sistema DEBE obtener esa misma lista vigente de módulos de tipo Clínica activos.
- **FR-003**: El sistema DEBE mostrar los módulos de clínica activos ordenados de menor a mayor según su posición (`sort_order`) en el catálogo.
- **FR-004**: El sistema DEBE mostrar, para cada módulo ofrecido, el nombre y la descripción tal como los define el catálogo de módulos, en vez del texto fijo que hoy vive en el código del Backoffice.
- **FR-005**: El sistema NO DEBE ofrecer como opción marcable ningún módulo que no sea de tipo Clínica o que no esté activo en el catálogo en el momento de abrir la pantalla.
- **FR-006**: Al guardar una suscripción (alta o edición), el sistema DEBE enviar exactamente la key de cada módulo que el operador dejó marcado o habilitado, sin incluir módulos no mostrados ni módulos no marcados.
- **FR-007**: El módulo cuya key es `patients` (Pacientes) DEBE aparecer siempre marcado de forma predeterminada y NO DEBE poder desmarcarse ni quitarse en ninguna suscripción (alta o edición), mientras forme parte del catálogo activo de módulos de clínica que devuelve la API; ningún otro módulo del catálogo tiene este trato especial.
- **FR-008**: El sistema NO DEBE exigir ni aplicar ninguna dependencia entre módulos; marcar o desmarcar un módulo del catálogo NO DEBE marcar, desmarcar ni bloquear ningún otro módulo.
- **FR-009**: Si una suscripción que se está editando tiene habilitado un módulo cuya key ya no está en el catálogo activo de módulos de clínica, el sistema NO DEBE ofrecerlo como opción marcable; si el operador guarda sin volver a incluirlo, ese módulo deja de estar en la suscripción.
- **FR-010**: Mientras el catálogo de módulos se está obteniendo, el sistema DEBE mostrar un indicador de carga en la sección de módulos y DEBE impedir guardar la suscripción hasta que termine de cargar.
- **FR-011**: Si la obtención del catálogo de módulos falla, el sistema DEBE mostrar un estado de error con una opción para reintentar, y DEBE impedir guardar la suscripción mientras el catálogo no se haya obtenido con éxito.
- **FR-012**: Si el catálogo activo de módulos de clínica está vacío, el sistema DEBE mostrarlo claramente (por ejemplo, con un mensaje de que no hay módulos disponibles) en vez de dejar la sección vacía sin explicación.

### Key Entities *(include if feature involves data)*

- **Módulo de clínica (catálogo)**: una funcionalidad que una suscripción puede incluir; se identifica por una key única, tiene nombre, descripción y un orden de presentación (`sort_order`), es de tipo Clínica y tiene un estado (activo/inactivo) que determina si se ofrece en el alta o la edición de suscripciones. Es el mismo catálogo que ya administra la pantalla de Módulos del Backoffice.
- **Selección de módulos de una suscripción**: el conjunto de keys de módulos que una suscripción en particular tiene habilitados; su forma de guardarse no cambia con esta feature, solo el origen de las opciones que el operador puede marcar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al abrir el alta o la edición de una suscripción, los módulos de clínica mostrados como opciones coinciden exactamente con los módulos de tipo Clínica activos del catálogo en ese momento: ninguno inactivo, ninguno de otro tipo, y ninguno activo faltante.
- **SC-002**: Los módulos se presentan siempre en el mismo orden que tienen en el catálogo (`sort_order`), sin que un cambio de orden en el catálogo requiera publicar una nueva versión del Backoffice.
- **SC-003**: Cuando un módulo de clínica se desactiva en el catálogo, deja de ofrecerse como opción en nuevas altas y ediciones de suscripciones sin necesidad de publicar una nueva versión del Backoffice.
- **SC-004**: Al guardar una suscripción (alta o edición), las keys enviadas coinciden exactamente con los módulos que el operador dejó marcados, el 100% de las veces.
- **SC-005**: Si el catálogo de módulos no puede obtenerse, el operador se entera del problema en la misma pantalla y puede reintentar sin perder los demás datos que ya había llenado en el formulario.
- **SC-006**: El módulo de Pacientes (key `patients`) aparece marcado y no se puede desmarcar en el 100% de las aperturas del alta y la edición de suscripciones en las que ese módulo forma parte del catálogo activo.

## Assumptions

- El catálogo de módulos de clínica activos se obtiene del mismo origen de datos que ya usan la pantalla de administración de Módulos y la de Roles (MailySoft Usuarios), no de la API de Suscripciones; la API de Suscripciones solo recibe las keys seleccionadas al guardar, como ya ocurre hoy.
- De las dos reglas de negocio que hoy existen en el código, esta feature retira la de dependencias entre módulos (dependía de keys fijas que el catálogo real no necesariamente respeta) pero conserva la de «Pacientes» siempre incluido y no editable, ahora evaluada contra la key `patients` tal como la devuelva el catálogo activo; el operador queda libre de marcar o desmarcar cualquier otro módulo del catálogo (ver Clarifications).
- Si una suscripción existente no tuviera guardada la key `patients` (por ejemplo, datos previos a esta regla), el formulario la muestra igualmente marcada por defecto y la incluye al guardar, igual que para cualquier suscripción nueva; el estado real previamente guardado para esa key no se respeta en este caso, porque la regla es incondicional mientras `patients` esté en el catálogo activo.
- Las pantallas de solo lectura que hoy muestran los módulos de una suscripción (su detalle y el comparativo de suscripciones) NO se modifican en esta feature y siguen usando la lista y el orden fijos actuales; mantenerlas sincronizadas con el catálogo dinámico de módulos queda fuera de alcance.
- Si un módulo que una suscripción ya tenía habilitado deja de estar activo en el catálogo, el formulario no lo ofrece como marcable y no agrega ninguna indicación especial de «módulo descontinuado»; esto es consistente con el comportamiento ya existente para keys que el Backoffice no reconoce.
- El catálogo de módulos de clínica activos no cambia con tanta frecuencia como para requerir refrescarlo mientras la pantalla de alta o edición sigue abierta; basta con obtenerlo una vez al abrirla.
