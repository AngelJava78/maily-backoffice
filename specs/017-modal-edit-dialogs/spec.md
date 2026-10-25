# Feature Specification: Crear y editar un módulo en un modal, no en un panel fijo

**Feature Branch**: `017-modal-edit-dialogs`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Separar los <div> de edición en modales o popups. Por ejemplo: en
Módulos, al dar clic en el botón Editar de un módulo, el formulario aparece al lado derecho, en una
columna fija de la misma pantalla; eso debería aparecer en un modal o popup en su lugar."

**Nota de alcance**: De los recursos administrados hoy (Usuarios, Suscripciones, Módulos, Roles),
el único que presenta su formulario como un panel fijo al lado de la lista, dentro de la misma
pantalla, es **Módulos** (`ModuleEditPanel`/`ModuleCreatePanel`, controlados por `?edit=`/`?new=1`
en la URL). Usuarios y Suscripciones ya usan pantallas separadas para alta y edición (no un panel al
lado de la lista); Roles usa un panel maestro-detalle siempre visible junto a su matriz de permisos,
una variante de presentación que la constitución del proyecto ya reconoce de forma explícita para
ese recurso. Esta feature se limita a Módulos: a las otras pantallas no les aplica el problema que
describe el pedido.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar un módulo sin reducir la lista (Priority: P1)

Quien administra módulos necesita que, al pulsar "Editar" en un módulo de la lista, su formulario
aparezca en un modal superpuesto a la pantalla, en vez de ocupar una columna fija al lado de la
lista, para poder revisar o cambiar un módulo sin que el resto de la lista quede reducido mientras
tanto.

**Why this priority**: Es el caso exacto que motiva la feature; sin él, el problema que describe el
pedido sigue intacto.

**Independent Test**: Se puede probar por completo pulsando "Editar" en cualquier módulo de la lista
y comprobando que su formulario aparece en un modal, con la lista detrás usando todo el ancho de la
pantalla.

**Acceptance Scenarios**:

1. **Given** la lista de módulos, **When** la persona pulsa "Editar" en un módulo, **Then** se abre
   un modal con el formulario de ese módulo (nombre, descripción, orden, acciones y la zona de
   bloquear/eliminar), y la lista detrás conserva todo el ancho de la pantalla.
2. **Given** el modal de edición abierto, **When** la persona guarda los cambios con éxito, **Then**
   se avisa del éxito y la lista refleja el cambio, igual que ya ocurre hoy.
3. **Given** el modal de edición abierto con cambios sin guardar, **When** la persona lo cierra (con
   "Descartar", la tecla Escape o un clic fuera del modal) sin guardar, **Then** ningún cambio se
   aplica y la lista queda como estaba.
4. **Given** el modal de edición de un módulo abierto, **When** la persona lo cierra y abre
   "Editar" de otro módulo, **Then** el modal muestra los datos propios de ese otro módulo, nunca
   mezclados con los del anterior.

---

### User Story 2 - Crear un módulo nuevo con el mismo mecanismo (Priority: P2)

Quien administra módulos necesita que "Nuevo módulo" abra también en un modal, igual que "Editar",
para que crear y editar se sientan como la misma clase de acción, sin una mezcla de un modal para
una y un panel fijo para la otra.

**Why this priority**: No bloquea la Historia 1 (editar ya resuelve el caso de uso motivador), pero
sin ella la pantalla quedaría con dos mecanismos distintos para dos acciones muy parecidas.

**Independent Test**: Se puede probar por completo pulsando "Nuevo módulo" y comprobando que el
formulario de alta aparece en un modal, con la lista detrás usando todo el ancho de la pantalla.

**Acceptance Scenarios**:

1. **Given** la lista de módulos, **When** la persona pulsa "Nuevo módulo", **Then** se abre un
   modal con el formulario de alta.
2. **Given** el modal de alta, **When** el módulo se crea con éxito, **Then** ese mismo modal pasa a
   mostrar la edición del módulo recién creado, sin que la persona tenga que volver a abrirlo a
   mano (igual que hoy pasa de "Nuevo módulo" a "Editar módulo" dentro del mismo panel).

### Edge Cases

- ¿Qué pasa con el enlace a un módulo en edición (`/modules?edit=<id>`)? Sigue abriendo
  directamente su modal al cargar la página, igual que hoy abre su panel; el botón Atrás del
  navegador cierra el modal igual que cierra el panel hoy (FR-004).
- ¿Qué pasa con las confirmaciones que ya existen dentro del formulario (retirar una acción ya
  concedida, bloquear, eliminar)? Siguen apareciendo igual, ahora superpuestas al modal de edición
  en vez de al panel; no cambian su texto ni su comportamiento.
- ¿Qué pasa si se cierra el modal sin guardar? Los cambios se pierden sin ninguna advertencia
  nueva, igual que hoy se pierden al elegir editar otro módulo sin haber guardado el actual
  (FR-005; no es una regresión, es el mismo comportamiento que ya existe).
- ¿Qué pasa con "Roles y permisos"? No cambia: su panel maestro-detalle es una variante distinta,
  ya reconocida como válida para ese recurso, y queda fuera de alcance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al editar un módulo, el sistema MUST mostrar su formulario en un modal superpuesto a
  la pantalla, no en un panel fijo al lado de la lista.
- **FR-002**: Al crear un módulo, el sistema MUST mostrar su formulario en un modal, con el mismo
  mecanismo que el de edición (FR-001).
- **FR-003**: Mientras ningún modal esté abierto, la lista de módulos MUST usar todo el ancho
  disponible de la pantalla (ya no se reserva una columna fija para un panel vacío).
- **FR-004**: Qué módulo se está editando, o si se está creando uno nuevo, MUST seguir
  determinándose desde la URL, con el mismo criterio que hoy, de forma que abrir o cerrar el modal
  con el botón Atrás del navegador, recargar la página o compartir el enlace se comporte igual que
  hoy con el panel.
- **FR-005**: Cerrar el modal (con su acción de cancelar, la tecla Escape o un clic fuera de él) sin
  guardar MUST descartar los cambios pendientes, igual que ya ocurre hoy al cambiar de módulo sin
  guardar; esta feature no agrega ninguna advertencia nueva de cambios sin guardar.
- **FR-006**: Guardar los cambios de un módulo, bloquearlo, desbloquearlo o eliminarlo desde dentro
  del modal MUST seguir funcionando exactamente igual que hoy (mismas reglas, mismos mensajes,
  misma confirmación antes de retirar una acción ya concedida o de eliminar).
- **FR-007**: Al crear un módulo con éxito, el sistema MUST continuar mostrando, en el mismo modal,
  la edición del módulo recién creado, sin que la persona tenga que volver a abrirlo a mano.
- **FR-008**: El modal MUST gestionar el foco de forma accesible: al abrirse, el foco entra en él; al
  cerrarse, vuelve al control que lo abrió ("Editar" o "Nuevo módulo" del módulo correspondiente).

### Key Entities

Ninguna: esta feature no cambia ningún dato ni modelo, solo cómo se presenta el formulario que ya
existe.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al editar o crear un módulo, la lista detrás del modal se sigue viendo completa (no
  reducida, como hoy, a aproximadamente dos tercios del ancho de la pantalla).
- **SC-002**: El 100% de las operaciones que ya ofrece el panel hoy (editar, bloquear, desbloquear,
  eliminar, crear) siguen disponibles dentro del modal, con el mismo resultado.
- **SC-003**: Un enlace a `/modules?edit=<id>` sigue abriendo directamente el modal de ese módulo,
  igual que hoy abre directamente su panel.

## Assumptions

- Esta feature sustituye, solo en su forma de presentación, la decisión de la spec
  `013-manage-modules` (Assumptions: "El panel para crear o editar un módulo vive en la misma
  pantalla del listado... y no como páginas separadas de alta y edición"): sigue siendo la misma
  pantalla `/modules`, sin navegar a una ruta distinta; cambia únicamente de un panel fijo a un
  modal superpuesto.
- No se agrega ninguna advertencia de "cambios sin guardar" al cerrar el modal: que Módulos no
  tenga una hoy (a diferencia de "Roles y permisos") no es algo que esta feature deba corregir.
- "Roles y permisos" (spec `014-roles-permisos`) queda fuera de alcance: su panel maestro-detalle es
  una variante de presentación ya reconocida por la constitución para ese recurso, con su propia
  razón de ser (mostrar la matriz de permisos junto al resto del detalle en todo momento), distinta
  del caso de Módulos.
- Usuarios y Suscripciones quedan fuera de alcance: ya usan pantallas separadas de alta y edición,
  no el panel al lado de la lista que esta feature corrige.
