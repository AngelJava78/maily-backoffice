# Contrato de interfaz: tabla de roles y pantalla de detalle

**Feature**: `027-roles-grid-list` | **Plan**: [../plan.md](../plan.md)

Lo que «Roles y permisos» promete a quien la usa y a las pruebas: orden de los elementos, nombres
accesibles, textos exactos (todos en `messages.roles` de `src/shared/messages/es.ts`) y
comportamiento. Las direcciones están en [app-routes.md](app-routes.md). Las pruebas consultan por
estos nombres y roles accesibles.

## 1. La tabla (`/roles`)

### 1.1 Orden en la página

`h1` «Roles y permisos» con «Nuevo role» a su derecha (si la persona puede crear) → grupos de filtros
«Tipo» y «Estatus» → zona de la tabla → región de anuncios (`role="status"`, no se ve). En pantallas
angostas, el encabezado y los filtros se reacomodan en varias líneas. Ya no existen la lista
estrecha, el panel de detalle ni el mensaje «Elige un role…».

### 1.2 Filtros (`RolesFilters`, sin cambios respecto a la 025)

Grupos «Tipo» (Todos, Sistema, Clínica; pulsado «Todos») y «Estatus» (Activos, Bloqueados; pulsado
«Activos»), con las mismas props que los de Módulos. «Estatus» no tiene «Todos» ni «Eliminados».
Cambiar cualquiera lleva la tabla a la página 1 y conserva el tamaño de página. Ya no hay aviso de
cambios sin guardar al cambiar un filtro (la tabla no tiene formulario).

### 1.3 Tabla (`RolesGrid`)

`role="grid"` con nombre accesible `list.gridLabel` = «Roles». Columnas, en este orden:

| Encabezado (`list.columns`) | Celda | Reglas |
|---|---|---|
| Nombre | enlace con el nombre del role a `/roles/{id}` | el resto de la fila no es un enlace; un nombre largo se corta con puntos suspensivos |
| Estatus | `list.status.active` = «Activo» o `list.status.blocked` = «Bloqueado» | según `status.id`; con «Activos» todas dicen «Activo», con «Bloqueados» todas «Bloqueado» |
| Tipo | «Sistema» o «Clínica» (`filters.type`) | |
| Permisos | `list.permissionsCount(n)` = «n permisos» («1 permiso») | «—» (`list.noValue`) con «Bloqueados», mientras el total carga y si su consulta falla; sin romper la fila |

- Orden: el de la API (por nombre). Sin ordenar ni filtrar por columna, sin menú de columna, sin
  selección de fila y sin buscador de texto (FR-005).
- Aspecto: el de `UsersGrid` (`GRID_APPEARANCE_STYLES`: encabezado, separador de fila, resaltado al
  pasar el cursor, enlace subrayado), en los temas claro y oscuro (FR-006).
- Pie (`GRID_PAGINATION_STYLES`, textos de la localización en español de la rejilla): «Filas por
  página» con 10, 25 y 50 (10 por omisión), el rango («1–7 de 7») y los botones de página anterior y
  siguiente. La rejilla solo contiene las filas de la página (D4).
- En anchos pequeños la rejilla se desplaza por dentro de su marco, sin scroll horizontal de la
  página; el pie conserva «Filas por página» y se parte en varias líneas.

### 1.4 Estados (en la zona de la tabla; nunca ocultan el título, los filtros ni «Nuevo role»)

| Estado | Qué se ve |
|---|---|
| Cargando | la rejilla con su indicador de carga y sin filas |
| Error | `ErrorState` con `list.loadError.title` = «No se pudieron cargar los roles», `list.loadError.message` = «Ocurrió un problema al consultar los roles. Puedes reintentar.» y el botón de reintentar, en lugar de la rejilla |
| Vacío | `EmptyState` dentro de la rejilla con el texto de la tabla de abajo (el mismo texto se anuncia en la región de §1.5, así que las pruebas lo buscan dentro de la rejilla); con «Activos» también «Nuevo role» (si la persona puede crear) |

| Filtros | Texto del vacío |
|---|---|
| Todos + Activos | `list.emptyAll` = «Todavía no hay roles. Crea el primero.» |
| Sistema + Activos | `list.emptySistema` = «Todavía no hay roles de Sistema. Crea el primero.» |
| Clínica + Activos | `list.emptyClinica` = «Todavía no hay roles de Clínica. Crea el primero.» |
| cualquier tipo + Bloqueados | `list.emptyBlocked` = «No hay roles bloqueados.» |

### 1.5 Anuncios (`LiveStatus`, FR-021)

Al cambiar de página, de tamaño o de filtro: `list.pageStatus(desde, hasta, total)` =
«Mostrando {desde} a {hasta} de {total} roles.»; con cero roles, el texto del vacío; mientras carga y
al corregir una página inexistente, nada. El foco no se mueve.

### 1.6 «Nuevo role»

Botón `newRole` = «Nuevo role» junto al título, solo con `canCreate`, con cualquier combinación de
filtros. Abre el `RoleFormDialog` de siempre. Al crear: se cierra el diálogo y se abre el detalle del
role nuevo (§2.4).

## 2. El detalle (`/roles/:roleId`)

### 2.1 Orden en la página

`h1` con el nombre del role (`role.name`) cuando ya se conoce y `detail.title` = «Detalle del role»
mientras carga → «Volver al listado» (`detail.backToList`, botón con el icono de flecha) → contenido
según la vista → diálogo de cambios sin guardar. El foco va al `h1` al abrir la pantalla.

### 2.2 Contenido según la vista (`RoleView`)

| Vista | Contenido |
|---|---|
| `loading` | indicador de carga (`common.loading`) bajo el título genérico |
| `error` | `ErrorState` con `detail.loadError.title` = «No se pudo cargar el role», `detail.loadError.message` = «Ocurrió un problema al consultar el role. Puedes reintentar.» y reintentar |
| `active` | `RoleDetailPanel`: igual que en la 023 y la 025 (FR-011): nombre y descripción, tipo, «X de Y permisos», Guardar cambios, Descartar cambios, Duplicar, Bloquear role, Eliminar role (según capacidades) y la lista de permisos con botones |
| `blocked` | `BlockedRoleDetail`: descripción (si tiene), «Tipo: …», «Estatus: Bloqueado», la explicación (`blocked.explanation`) y «Desbloquear role» (con `canEdit`); sin `h2` de nombre (lo es el `h1`), sin permisos, sin guardar, descartar, duplicar ni eliminar y sin ninguna consulta de permisos |
| `notFound` | solo `ErrorState` con `detail.notFound.title` = «Este role ya no existe», `detail.notFound.message` = «Puede que se haya eliminado o bloqueado desde otra sesión. Vuelve al listado para ver los roles que hay.» y, como acción, «Volver al listado» a `/roles`; sin la barra de «Volver al listado» (como el detalle de un usuario) |

Sin `roles:update` el detalle de un role activo se ve con campos y botones de permisos
deshabilitados y sin las acciones que no corresponden, como hoy en el panel (US2-4).

### 2.3 «Volver al listado» y Atrás

«Volver al listado» lleva a `/roles{listSearch}` (§4 de app-routes); el botón Atrás del navegador, a
la entrada anterior. En los dos casos la tabla conserva filtros, página y tamaño (FR-013), salvo tras
crear o duplicar (§2.4).

### 2.4 Qué pasa tras cada acción

| Acción | Éxito | Destino | Aviso | Foco |
|---|---|---|---|---|
| Crear (desde la tabla) | role nuevo | `/roles/{id}`; la tabla de «Volver» y de Atrás muestra el role: Estatus «Activos», Tipo solo si hacía falta, página donde está (FR-017) | los de hoy (si no se copiaron todos los permisos) | `h1` del detalle |
| Duplicar | copia | `/roles/{copiaId}`; «Volver» a la tabla que muestra la copia | los de hoy | campo «Nombre» de la copia |
| Bloquear (con confirmación) | role bloqueado | tabla con los mismos filtros (o la última página que exista), con `replace` | `status.blocked(name)` = «{name} quedó bloqueado. Ahora está en «Bloqueados».» (éxito) | `h1` de la tabla |
| Desbloquear (inmediato) | role activo | igual | `status.unblocked(name)` = «{name} quedó desbloqueado. Ahora está en «Activos».» (éxito) | `h1` de la tabla |
| Eliminar (con confirmación) | role eliminado | igual | ninguno nuevo | `h1` de la tabla |
| Cualquier fallo | — | la persona se queda en el detalle | el mensaje de error de hoy (`describeRoleError`) | donde estaba |

«Ya estaba bloqueado/activo» (409) se trata como hoy: aviso informativo y vuelta a la tabla.

### 2.5 Cambios sin guardar (FR-020)

Con el role mostrado como activo y cambios sin guardar (nombre, descripción o permisos), cualquier
salida del detalle —«Volver al listado», el menú de secciones, Atrás o duplicar— abre `ConfirmDialog`:

| Elemento | Texto |
|---|---|
| Título | `detail.unsavedChangesTitle` = «Tienes cambios sin guardar» |
| Cuerpo | `detail.unsavedChangesBody` = «Si continúas, perderás los cambios que no has guardado.» |
| Confirmar | `detail.unsavedChangesDiscard` = «Descartar y continuar» |
| Cancelar | `detail.unsavedChangesStay` = «Quedarme» |

Quedarse conserva la edición y el role abierto. Tras un **eliminar** confirmado la salida no pregunta.
«Bloquear role» sigue deshabilitado mientras haya cambios o un guardado en curso (025).

## 3. Textos nuevos y retirados (`src/shared/messages/es.ts`)

| Clave | Estado | Texto |
|---|---|---|
| `titles.roleDetail` | nueva | Detalle del role |
| `roles.list.gridLabel` | nueva | Roles |
| `roles.list.columns` | nueva | `{ name: 'Nombre', status: 'Estatus', type: 'Tipo', permissions: 'Permisos' }` |
| `roles.list.status` | nueva | `{ active: 'Activo', blocked: 'Bloqueado' }` |
| `roles.list.noValue` | nueva | — |
| `roles.list.pageStatus(from, to, total)` | nueva | Mostrando {from} a {to} de {total} roles. |
| `roles.list.loadError` | nueva | título y mensaje de §1.4 |
| `roles.list.permissionsCount(n)` | cambia | «1 permiso» con 1; «n permisos» en el resto |
| `roles.list.label` | se retira | Lista de roles |
| `roles.detail.title`, `backToList`, `notFound`, `loadError` | nuevas | §2 |
| `roles.detail.emptySelection` | se retira | Elige un role… |

## 4. Accesibilidad

- La rejilla tiene nombre accesible y encabezados de columna; cada fila se lee con sus celdas; el
  nombre es un enlace alcanzable con Tab y activable con Enter; el pie se opera con el teclado.
- Los grupos de filtros mantienen nombre accesible y `aria-pressed` (025).
- Al cambiar de pantalla, el foco va al `h1` (efecto de ruta); al duplicar, al campo «Nombre» después.
- `RolesPage.test.tsx` y `RoleDetailPage.test.tsx` incluyen `axe` con la tabla, con «Bloqueados»,
  con un detalle activo, con uno bloqueado y con el aviso de cambios sin guardar abierto.
- Sin `console.*`, sin `dangerouslySetInnerHTML` y sin datos personales en logs (constitución V).
