# Data Model: Módulos y submódulos en árbol jerárquico

**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

No hay almacenamiento propio: los datos son los del catálogo de módulos del servicio de usuarios. Este
documento define cómo se ven en el Backoffice (modelo de dominio, formulario y cuerpos), el modelo de
filas del árbol, las funciones puras que lo arman y el estado de interfaz. Todo lo nuevo vive en
`src/features/modules`.

## 1. Modelo de dominio (capa `schemas`)

### `ParentModuleRef` (nuevo)

La referencia al padre que trae cada submódulo.

| Campo | Tipo | Origen |
|---|---|---|
| `id` | entero positivo | `parent_module.id` |
| `key` | texto | `parent_module.key` |
| `name` | texto | `parent_module.name` |

### `SystemModuleBase` / `SystemModule` (cambia)

`systemModuleSchema` añade, a lo que ya tiene (id, key, name, description, sortOrder, createdAt,
statusId, typeId, activePermissionsCount):

| Campo | Tipo | Origen | Regla |
|---|---|---|---|
| `parentModule` | `ParentModuleRef \| null` | `parent_module` | **Obligatorio y anulable** en la respuesta (research D2): `null` = módulo de primer nivel; si la clave falta, la respuesta no es válida |

`SystemModule` sigue añadiendo `actions` y `permissionIdByAction` (013). Una `PROTECTED_MODULE_KEYS`
(`users`, `roles`, `permissions`, `modules`) no cambia.

**Derivados** (no se guardan): un módulo es **submódulo** si `parentModule !== null`, y de **primer
nivel** si es `null`. «Tiene submódulos a la vista» se calcula con `submoduleCountOf` (§3).

## 2. Formulario y cuerpos

### `ModuleFormValues` (cambia)

| Campo | Tipo | Notas |
|---|---|---|
| `parentModuleId` | `string` | Nuevo. `''` = «Ninguno (módulo de primer nivel)»; si no, el id del padre como texto. Sin validación local: solo se puede elegir de las opciones (el servicio valida el resto) |

`initialModuleFormValues.parentModuleId = ''`; `toFormValues(module)` da `''` o
`String(module.parentModule.id)`.

### Cuerpos de las operaciones

| Cuerpo | Campo nuevo | Cuándo se envía |
|---|---|---|
| `CreateModuleBody` | `parent_module_id?: number` | Solo si el formulario tiene un padre elegido |
| `UpdateModuleBody` | `parent_module_id?: number \| null` | Solo si cambió respecto de `initial.parentModule?.id`; `null` quita el padre |

`toUpdateModuleBody` devuelve `null` (nada que enviar) si no cambió ningún campo, como hoy; un cambio
solo de padre ya cuenta. `key` y `type_id` siguen sin viajar nunca en una modificación.

## 3. Funciones puras (capa `policy`)

### `buildModuleTree(modules, { type, search }) → ModuleTreeGroup[]`

Reemplaza a `filterModules`. Devuelve siempre los dos grupos de tipo (Sistema, Clínica) que tengan al
menos una fila, en ese orden.

1. **Tipo**: se conservan los módulos del tipo pedido (`all` = ambos). Un submódulo y su padre son del
   mismo tipo, así que filtrar por tipo no los separa.
2. **Colocación**: raíces = módulos sin padre **o** con un padre que no está en la lista cargada.
   Los hijos se agrupan por `parentModule.id`. El armado es recursivo, por si el servicio entregara
   un submódulo cuyo padre es a su vez submódulo; todo módulo que no quede colocado (un ciclo) se
   agrega al final como de primer nivel.
3. **Búsqueda** (`search` sin espacios sobrantes, sin distinguir mayúsculas, sobre `name` y `key`):
   - un padre que **coincide** se muestra completo, con todos sus submódulos;
   - un padre que **no coincide** pero tiene submódulos que sí → fila `context` con motivo `search` y
     solo esos submódulos;
   - un submódulo que coincide con el padre fuera de la lista → fila `context` con motivo
     `otherView` (armada con su `parentModule`) y solo los submódulos que coinciden;
   - sin coincidencias en ninguna parte, el módulo no aparece.
   Sin búsqueda, todo lo cargado se muestra y las raíces con padre ausente llevan su fila de
   contexto `otherView`.
4. **Orden** (FR-005): raíces y hermanos por `sortOrder` y luego por nombre (`localeCompare` en
   español). Una fila de contexto `otherView` se ordena entre las raíces por el menor `sortOrder`
   de sus submódulos a la vista.
5. **Conteos** de cada grupo: `moduleCount` = filas `module`; `submoduleCount` = filas `submodule`.
   Las filas `context` no cuentan (FR-007).

### Tipos que devuelve

```text
ModuleTreeGroup = { typeId: 1 | 2, moduleCount, submoduleCount, nodes: ModuleTreeNode[] }
ModuleTreeNode  = { row: ModuleTreeRow, children: ModuleTreeNode[] }

ModuleTreeRow =
  | { kind: 'module',    module: SystemModule, childCount }                       // primer nivel
  | { kind: 'submodule', module: SystemModule, childCount, parent: ParentModuleRef }
  | { kind: 'context',   parent: ParentModuleRef, reason: 'otherView' | 'search', childCount }
```

`childCount` es la cantidad de submódulos que tiene el módulo en la lista **cargada** (no solo los
que coinciden con la búsqueda): es lo que dice el control.

### `flattenModuleTree(nodes, { collapsed, searching }) → ModuleTreeRow[]`

La lista plana con la profundidad (`depth`) de cada fila, lista para pintar. Se salta a los
descendientes de un nodo cuyo id está en `collapsed`, **salvo** cuando `searching` es verdadero
(todo expandido, research D6). Una fila de contexto nunca se contrae.

### `submoduleCountOf(modules, moduleId) → number`

Cuántos módulos de la lista cargada tienen `parentModule.id === moduleId`. Alimenta la zona de bloqueo,
la de eliminación y el bloqueo del campo del padre (D9, D12).

### `eligibleParents(modules, { typeId, excludeModuleId }) → ParentModuleRef[]`

De la lista de **Activos**: módulos de primer nivel (`parentModule === null`), del tipo pedido, con
clave no protegida y distintos de `excludeModuleId`, ordenados por `sortOrder` y nombre. Es lo que
ofrece el campo «Módulo padre» (FR-010).

## 4. Estado de interfaz (no es estado de servidor)

| Estado | Dónde vive | Reglas |
|---|---|---|
| Ids contraídos | `useCollapsedModules` en `ModulesPage` (`useState`) | Empieza vacío; no se guarda en la URL ni en almacenamiento (FR-004). `expand(id)` lo llaman los paneles tras asignar un padre (FR-013). Se ignora mientras hay una búsqueda |
| Filtros, búsqueda y panel abierto | La dirección (`useModulesLocation`) | **Sin cambios** |
| Estado del formulario | React Hook Form en cada panel | Gana `parentModuleId`; en el alta, cambiar el tipo lo vuelve `''` si tenía valor |

## 5. Estado de servidor

Sin claves nuevas. `moduleKeys.catalog(statusId)` sigue siendo la única: el árbol se deriva de ella.
Las opciones del padre usan la clave del catálogo **Activo**, que ya existe. Toda mutación sigue
invalidando `moduleKeys.all`, ahora también cuando falla (research D13).

## 6. Resultado de un error del servicio (capa `api`)

`ModuleFormField` gana `'parentModuleId'`; los códigos nuevos devuelven `kind: 'field'` sobre ese campo
(o un mensaje general para la eliminación). Tabla completa en
[contracts/modules-service-changes.md](contracts/modules-service-changes.md).

## 7. Simulador de la API en las pruebas

`CatalogModule` (en `src/test/handlers/modulesCatalog/model.ts`) gana `parentModuleId: number | null`
(por omisión `null`); el simulador aplica las reglas de la 5.4.0 y devuelve `parent_module` en cada
respuesta (research D14). `catalogModule({ parentModuleId: 6 })` es la forma de armar una jerarquía en
una prueba.

## 8. Transiciones que importan

| Acción | Efecto en el árbol |
|---|---|
| Crear con padre | El módulo nace submódulo; la lista lo muestra bajo su padre, que queda expandido |
| Asignar o cambiar padre | El módulo se mueve bajo el nuevo padre, que queda expandido; si era de primer nivel pasa a submódulo |
| Quitar el padre | El módulo pasa a primer nivel dentro de su grupo |
| Bloquear un padre | Él y sus submódulos Activos salen de «Activos»; sus submódulos Bloqueados siguen en «Bloqueados» bajo una fila de contexto |
| Desbloquear un padre | Todo vuelve a su lugar |
| Eliminar un módulo sin submódulos | Sale de la lista como hoy |
| Eliminar/bloquear un submódulo | Su padre no cambia; si era el único hijo, pierde el control de contraer |
