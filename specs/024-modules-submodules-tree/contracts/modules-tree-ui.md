# Contrato de interfaz: la lista de módulos en árbol y el campo «Módulo padre»

Es el contrato de **presentación** de esta feature (no hay un contrato HTTP nuevo más allá de
[modules-service-changes.md](modules-service-changes.md)). Las decisiones y sus alternativas están en
[../research.md](../research.md) (D3 a D12). Todos los textos van en `shared/messages/es.ts`.

## 1. La tabla

Se mantiene la `Table` de MUI, con las mismas 5 columnas (Orden, Módulo, Tipo, Permisos, Acción) y el
mismo `aria-label`. Cada grupo de tipo sigue encabezado por una fila `th scope="row"` que abarca las 5
columnas.

### Encabezado de grupo y contador de la lista

| Caso | Encabezado de grupo (Clínica) | Contador de la lista (Activos) |
|---|---|---|
| Solo módulos | «Clínica, aplicación para clínicas · 9 módulos» | «23 módulos activos» |
| Con submódulos | «Clínica, aplicación para clínicas · 9 módulos y 4 submódulos» | «23 módulos y 5 submódulos activos» |
| Uno solo | «… · 1 módulo» | «1 módulo activo» / «1 módulo bloqueado» |

Las filas de contexto no se cuentan.

## 2. Anatomía de una fila

| Clase de fila | Celda «Módulo» | Resto de celdas |
|---|---|---|
| **Módulo** de primer nivel | nombre · marca «Base» · clave · `[control]` (en su propia línea, bajo la clave, solo si tiene submódulos) | Orden, Tipo, Permisos y «Editar» como hoy |
| **Submódulo** | sangría de un nivel · nombre, que empieza (solo para lector de pantalla) con «Submódulo de {Padre}» · clave · `[control]` si tiene submódulos | Igual que cualquier módulo: su propio orden, tipo, permisos y «Editar» |
| **Contexto** | texto atenuado: nombre y clave del padre, y debajo un aviso (abajo) | Vacías: sin orden, permisos ni acción |

Avisos de la fila de contexto:

| Motivo | Texto |
|---|---|
| `otherView` | «Está en «Activos»» (en la vista Bloqueados) o «Está en «Bloqueados»» (en la vista Activos) |
| `search` | «Su submódulo coincide con la búsqueda» |

La atenuación usa el color de texto secundario del tema (no «deshabilitado», que no cumple el contraste
AA) y cursiva; la fila **no** es interactiva.

## 3. El control de contraer y expandir

Solo en una fila con `childCount > 0` y **solo cuando no hay búsqueda** (con búsqueda, se muestra el
texto «{n} submódulos» sin botón).

| Propiedad | Valor |
|---|---|
| Elemento | `<button>` nativo (`Button` de MUI, tamaño pequeño, con icono) |
| Contenido | icono `arrow-drop-down` (giro de −90° si está contraído) + texto visible «{n} submódulo(s)» |
| Nombre accesible | «{n} submódulo(s) de {Módulo}» (contiene el texto visible) |
| Estado | `aria-expanded` verdadero/falso |
| Teclado | Tab llega; Enter y Espacio alternan; el foco no se mueve al alternar |
| Estado inicial | expandido (todos), en cada carga de la pantalla |

El control va en su propia línea, bajo la clave: así los nombres quedan alineados sin reservar ningún hueco (comprobado en Chromium, tarea T056).

## 4. Sangría y ancho

La sangría de un nivel es un relleno a la izquierda de la celda «Módulo» y no puede provocar
desplazamiento horizontal de la **página** (el contenedor de la tabla ya tiene su propio
`overflow-x`); a 320 px la sangría se reduce a la mitad.

## 5. El campo «Módulo padre»

`TextField select` con etiqueta «Módulo padre», en el alta y en la edición, debajo de «Orden» y antes
de las acciones.

| Aspecto | Comportamiento |
|---|---|
| Primera opción | «Ninguno (módulo de primer nivel)», valor vacío, elegida por omisión en el alta |
| Opciones | `eligibleParents(Activos, { typeId, excludeModuleId })`; en el alta siguen el tipo elegido |
| Cambio de tipo (alta) | Si había un padre elegido, se limpia y las opciones se actualizan |
| Padre actual ausente (edición) | Se agrega como opción, para que se vea (p. ej. un padre Bloqueado) |
| Cargando / error de las opciones | «Cargando módulos…» (deshabilitado) / «No se pudieron cargar los módulos padre.» (deshabilitado); el resto del formulario sigue operable y no se envía ningún padre nuevo |
| Deshabilitado (edición) | Con submódulos a la vista: «Este módulo tiene submódulos, así que no puede tener un módulo padre.» · Módulo base: «Los módulos base de administración no tienen módulo padre.» |
| Ayuda (alta, edición editable) | «Opcional. Un submódulo es del mismo tipo que su módulo padre.» |
| Error del servicio | Debajo del campo, con el foco en él si es el primer error (ver [modules-service-changes.md](modules-service-changes.md) §4) |

## 6. Zona de bloqueo y eliminación de un módulo con submódulos

| Situación | Se ve |
|---|---|
| Módulo **Activo** con `n > 0` submódulos a la vista | Bajo la ayuda del bloqueo: «Si lo bloqueas, {n} submódulo(s) dejarán de estar disponibles hasta que lo desbloquees; conservan su propio estatus.» |
| Módulo con `n > 0` submódulos a la vista | En lugar del botón «Eliminar módulo»: «Este módulo tiene submódulos. Para eliminarlo, primero elimina sus submódulos o cámbialos de padre.» |
| Servicio rechaza la eliminación (`module_has_submodules`) | Aviso de error con el mismo mensaje; no se elimina nada |
| Módulo sin submódulos | Igual que hoy |

## 7. Estados de la pantalla

Sin cambios: cargando (`PageLoader`), error con reintento, y los tres vacíos («No hay módulos
activos.», «No hay módulos bloqueados.», «Ningún módulo coincide con la búsqueda.»). Una lista cuyo
único contenido son filas de contexto no se considera vacía: nunca ocurre, porque una fila de contexto
solo existe junto a un submódulo.
