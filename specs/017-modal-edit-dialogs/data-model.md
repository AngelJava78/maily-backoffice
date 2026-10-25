# Data Model: Crear y editar un módulo en un modal, no en un panel fijo

Ninguna entidad, campo ni esquema nuevo o modificado. Esta feature cambia únicamente cómo se
presenta un formulario que ya existe (`ModuleFormValues`, `SystemModule`, `ModulesLocation`, todos
de la spec `013-manage-modules`, sin tocar): de un panel fijo a un modal. No hay ninguna respuesta de
API, validación de Zod ni estado de servidor que cambie de forma.

## `ModulesLocation` (existente, `schemas/modulesLocation.ts`, sin cambios)

Sigue siendo la única fuente de verdad de "qué modal está abierto": `location.panel.kind` (`'none'`
| `'create'` | `{kind:'edit', moduleId}`). `ModuleFormDialog` (nuevo, ver [research.md](research.md)
R1) solo **lee** este valor para decidir si el `Dialog` está `open` y qué contenido mostrar; no
agrega un campo nuevo ni cambia cómo se serializa en la URL (`?edit=`/`?new=1` siguen siendo los
mismos parámetros).

## `ModuleFormValues` (existente, `schemas/moduleForm.ts`, sin cambios)

El esquema del formulario (nombre, descripción, orden, acciones) no cambia: lo sigue llenando
`ModuleCreatePanel`/`ModuleEditPanel`, ahora solo con un JSX raíz distinto (`DialogTitle`/
`DialogContent`/`DialogActions` en vez de `Paper`), ver [research.md](research.md) R1.

## Estados y transiciones

El único "estado" que esta feature introduce es puramente visual, no de datos: si el `Dialog`
compartido (`ModuleFormDialog`) está abierto o cerrado, y con qué contenido — y ese estado ya vive,
sin cambios, en `ModulesLocation.panel`. No hay una transición nueva que documentar aquí: crear →
editar el módulo recién creado (FR-007) es el mismo cambio de `location.panel` que ya hace
`ModuleCreatePanel.onCreated` hoy (research.md R1), ahora mostrado dentro del mismo `Dialog` en vez
de dentro de la misma columna del `Grid`.
