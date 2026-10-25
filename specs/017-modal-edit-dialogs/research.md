# Research: Crear y editar un módulo en un modal, no en un panel fijo

## R1 — Un único `Dialog` compartido, no uno por panel

**Decision**: Un componente nuevo, `ModuleFormDialog`, posee el `<Dialog>` (abre/cierra, título
accesible) y, dentro, muestra el contenido de `ModuleCreatePanel` o de `ModuleEditPanel` según
`location.panel.kind`. Ambos pierden su propio `<Paper variant="outlined">` y su
`<Typography variant="h6" component="h2">` de título; en su lugar devuelven
`<DialogTitle>`/`<DialogContent>`/`<DialogActions>` directamente (sin envolver nada en su propio
`Dialog`). Ningún hook (`useForm`, `useCreateModule`, `useUpdateModule`), validación
(`moduleFormSchema`) ni llamada a la API cambia: solo cambia el JSX raíz que envuelve ese mismo
contenido.

**Rationale**: `ModuleCreatePanel.onCreated` ya le pasa el id del módulo recién creado a
`openEdit` (`ModulesPage.tsx`, `panel()`), que solo cambia el parámetro `edit` de la URL — con un
único `Dialog` que permanece abierto durante esa transición, pasar de crear a editar el módulo
recién creado (FR-007) es continuo (el mismo modal cambia de contenido), en vez de un cierre seguido
de una reapertura con dos animaciones de transición. Si cada panel tuviera su propio `Dialog`, esa
transición se vería como el modal de "Nuevo módulo" cerrándose y el de "Editar módulo" abriéndose
por separado.

**Alternatives considered**: Que `ModuleCreatePanel` y `ModuleEditPanel` sean, cada uno, su propio
`Dialog` autocontenido (como ya es `RoleFormDialog` en Roles) — rechazada por la razón anterior
(FR-007 dejaría de sentirse continuo) y porque duplicaría el manejo de `open`/`onClose`/título
accesible en dos componentes en vez de uno.

## R2 — Pruebas de `ModuleEditPanel`/`ModuleCreatePanel`: renderizarlas dentro de un `Dialog` real

**Decision**: `ModuleEditPanel.test.tsx` y `ModuleCreatePanel.test.tsx` envuelven el componente bajo
prueba en un `<Dialog open>` mínimo al renderizarlo (en vez de renderizarlo solo), para que
`DialogTitle`/`DialogContent` tengan el contexto real en el que de verdad se usan.

**Rationale**: `DialogTitle` y `DialogContent` de MUI están pensados para vivir dentro de un
`Dialog` (que aporta el `role="dialog"`, `aria-modal` y la asociación de `aria-labelledby`);
renderizarlos sueltos en la prueba (como hoy se renderiza `<Paper>`) arriesgaría una violación de
`axe` nueva en las pruebas que ya corren `axe(container)` sobre estos componentes, y no reflejaría
cómo la persona los ve de verdad. El contenido (campos, validación, llamadas a la API) sigue
probándose exactamente igual; solo cambia el contexto de render.

**Alternatives considered**: Dejar `ModuleEditPanel`/`ModuleCreatePanel` como `<Paper>` autocontenido
y poner el `Dialog` alrededor sin tocarlos — rechazada: un `<Paper>` dentro de un `<Dialog>` duplica
el marco visual (borde del `Paper` dentro del propio recuadro del modal) y no sigue el patrón ya
establecido en el proyecto (`RoleFormDialog` usa `DialogTitle`/`DialogContent` directamente, no un
`Paper` anidado).

## R3 — `ModulesPage.test.tsx`: la prueba de "panel vacío" se invierte, no se descarta

**Decision**: La prueba `'shows an empty panel until a module is opened or created'` (hoy: sin
ningún modal abierto, se ve el texto "Selecciona un módulo para editarlo, o crea uno nuevo.") pasa a
probar lo contrario: sin ningún modal abierto, ese texto **no** aparece en ningún lado (no hay nada
que mostrar vacío, porque ya no hay una columna de panel reservada — FR-003). Las pruebas
`'opens the create panel...'`/`'opens the edit panel...'` ganan una aserción de que, al abrirlos,
`screen.getByRole('dialog')` encuentra el modal.

**Rationale**: Con el modal, "no hay nada seleccionado" ya no es un estado del panel que haya que
pintar (antes, `panel()` siempre devolvía algo, aunque fuera un `EmptyState`); ahora simplemente no
hay ningún `Dialog` abierto. Sin invertir esta prueba, quedaría una prueba en verde que ya no
describe el comportamiento real (el mismo riesgo que research.md de otras specs de este proyecto ya
viene señalando para pruebas que una feature nueva vuelve falsas).

## R4 — El foco del modal se apoya en el comportamiento ya incluido de `Dialog`

**Decision**: FR-008 (el foco entra al abrir, vuelve al control que lo abrió al cerrar) no necesita
código propio: `Dialog` de MUI ya atrapa el foco dentro de sí mismo mientras está abierto y lo
devuelve al elemento que tenía el foco justo antes de abrirse, en cuanto se cierra — el mismo
comportamiento del que ya depende `RoleFormDialog` (`src/features/roles/components/RoleFormDialog.tsx`),
que tampoco escribe ninguna gestión de foco propia.

**Rationale**: Escribir manejo de foco a mano (refs, `useEffect`, guardar y restaurar el elemento
activo) duplicaría algo que el componente ya resuelve, y ya hay un precedente directo en el propio
proyecto que confía en ese comportamiento por defecto sin que haya sido necesario nada más
(Principio I: sin abstracciones ni código donde no hace falta).

**Alternatives considered**: Guardar el elemento enfocado antes de abrir el modal y devolverle el
foco a mano al cerrar (patrón que sí usa `RoleDetailPanel`/`justDuplicatedIdRef` para otro caso,
mover el foco a un campo recién creado) — innecesaria aquí porque no hay que mover el foco a un
sitio nuevo, solo devolverlo a donde estaba, que es exactamente lo que `Dialog` ya hace solo.

## R5 — El `Grid` dentro de `ModulesPage` pierde su columna de panel

**Decision**: El `Grid` que hoy reparte `xs:12, md:8` (tabla) y `xs:12, md:4` (panel) pasa a tener
una sola columna (`xs:12`, sin tope de `md`) para la tabla; el `ModuleFormDialog` se renderiza aparte
(hermano del `Grid`, no dentro de él), porque un `Dialog` de MUI ya se superpone a toda la pantalla
por sí mismo (vía `Portal`) y no ocupa espacio de layout donde se declara.

**Rationale**: Es exactamente lo que pide FR-003 (la lista usa todo el ancho disponible mientras no
hay ningún modal abierto) y SC-001; no hace falta ninguna lógica condicional de ancho porque un
`Dialog` cerrado no renderiza nada en el árbol visible de todos modos.

## R6 — Pruebas de `ModuleEditPanel`: esperar por nombre, no por conteo, tras cerrar su `ConfirmDialog`

**Decision** (hallazgo de implementación, T004): con `ModuleEditPanel` ahora dentro de un `Dialog`
(el de `ModuleFormDialog`), su propio `ConfirmDialog` (retirar una acción, eliminar) queda anidado
dentro de otro `Dialog` ya abierto — algo que antes de esta feature no ocurría (`ModuleEditPanel`
era un `<Paper>` suelto). Al cerrar ese `ConfirmDialog`, una prueba que solo cuenta
`screen.queryAllByRole('dialog')).toHaveLength(1)` puede resolverse en un instante transitorio
equivocado (el de salida de MUI deja el nodo del diálogo que se cierra montado, todavía con
`role="dialog"`, durante su animación) y dar por buena una página cuyo contenido de fondo sigue
`aria-hidden`. La corrección: volver a confirmar explícitamente que el diálogo **de fuera**
("Editar módulo") sigue presente por su propio nombre, además de que el conteo total es 1
(`src/features/modules/components/ModuleEditPanel.test.tsx`, `noDialog()`).

**Rationale**: Un conteo por sí solo no distingue "el de fuera sigue, el de dentro ya se fue" de
cualquier otro estado intermedio que también sume 1; pedir el elemento por su nombre accesible
fuerza a `waitFor` a reintentar hasta el estado real, no uno que coincide por casualidad.
Confirmado con un repro mínimo (dos `Dialog` de MUI anidados, sin nada de `ModuleEditPanel` de por
medio): el mismo síntoma aparece y se resuelve igual, así que no es nada específico de este
componente — cualquier prueba nueva que anide un `ConfirmDialog` dentro de este modal debe seguir el
mismo patrón.

## R7 — Hallazgo de implementación: las pruebas de integración de `/modules` (fuera de `features/modules`) también necesitaban cerrar el modal a mano

**Decision** (hallazgo de implementación, T009): `src/app/router/modules/{blockModule,createModule,
deleteModule,editModule}.integration.test.tsx` no estaban en el inventario original de este plan
(viven fuera de `src/features/modules`, así que no aparecieron en la exploración de research.md).
Ocho de sus pruebas fallaban: todas interactuaban con el panel de editar/crear y, **sin cerrarlo**,
intentaban luego leer o pulsar algo de la tabla o los filtros de fondo — válido con el panel fijo de
antes (nunca bloqueaba nada), inválido con el modal (FR-001/FR-002), que vuelve inerte el resto de
la pantalla mientras está abierto. La corrección, en cada caso: cerrarlo explícitamente (Escape, o un
clic fuera cuando no queda nada enfocable dentro — ver el caso de abajo) antes de tocar la tabla.

**Caso adicional**: bloquear/desbloquear un módulo mientras se mira el filtro contrario (Activos
viendo uno que se acaba de bloquear, o viceversa) hace que, al refrescarse el catálogo, el panel
abierto pase a mostrar "Este módulo ya no existe." (D10 de la spec `013`, sin cambios) — un mensaje
sin nada enfocable. Sin un control dentro del modal, la tecla Escape deja de llegarle (el foco cae a
`document.body`, fuera de su árbol) y no lo cierra; hay que cerrarlo con un clic fuera (el mismo
`outsideOf()` de `ConfirmDialog.test.tsx`), no con el teclado.

**Rationale**: estas pruebas no estaban en el plan porque viven en una carpeta distinta a la que se
exploró para research.md; la lección queda aquí porque es genérica a cualquier prueba de integración
futura sobre `/modules` que toque el modal y luego la tabla: cerrarlo primero, y preferir un clic
fuera sobre Escape si el contenido en ese momento podría no tener nada enfocable.
