# Contrato de interfaz: lista de roles con filtros y bloqueo

**Feature**: `025-roles-type-status-filters` | **Plan**: [../plan.md](../plan.md)

Lo que la pantalla «Roles y permisos» (`/roles`) promete a quien la usa y a las pruebas: dirección,
nombres accesibles, textos exactos (todos en `messages.roles` de `src/shared/messages/es.ts`) y
comportamiento. Las pruebas consultan por estos nombres y roles accesibles.

## 1. Dirección

| Dirección | Tipo | Estatus | Role |
|---|---|---|---|
| `/roles` | Todos | Activos | ninguno |
| `/roles?type=sistema` | Sistema | Activos | ninguno |
| `/roles?type=clinica&roleId=7` | Clínica | Activos | 7 (si cumple el filtro) |
| `/roles?status=bloqueados` | Todos | Bloqueados | ninguno |
| `/roles?type=sistema&status=bloqueados&roleId=3` | Sistema | Bloqueados | 3 (si cumple el filtro) |
| `/roles?type=xyz&status=borrados&roleId=007` | → se reescribe a `/roles` (con `replace`) | | |

Elegir un filtro escribe la dirección (entrada nueva en el historial, para Atrás) y quita `roleId`.

## 2. Encabezado y filtros (`RolesFilters`)

Orden en la página: título `h1` «Roles y permisos» → grupos de filtros → lista (izquierda) y detalle
(derecha); en pantallas angostas, uno debajo del otro.

| Grupo (`role="group"`, nombre accesible) | Etiqueta visible encima | Botones (en este orden) | Pulsado por omisión |
|---|---|---|---|
| «Tipo» | `filters.typeLabel` = «Tipo» | «Todos», «Sistema», «Clínica» | «Todos» |
| «Estatus» | `filters.statusLabel` = «Estatus» | «Activos», «Bloqueados» | «Activos» |

- `ToggleButtonGroup` `exclusive`, `size="small"`, las mismas props que `ModulesFilters`; cada botón
  expone `aria-pressed`. Pulsar el botón ya pulsado no cambia nada (siempre hay uno pulsado).
- Teclado: Tab entra a cada grupo (una sola parada), flechas entre botones, Espacio/Enter elige.
- Con cambios sin guardar en el role abierto, cambiar un filtro abre el aviso «Tienes cambios sin
  guardar» de siempre (`detail.unsavedChangesTitle`).
- Ya no existe ningún elemento con `role="tab"` en la pantalla.

## 3. Lista (`RolesList`)

- «Nuevo role» (botón, `roles.newRole`) encima de la lista con cualquier combinación de filtros, si
  la persona puede crear roles.
- Lista con nombre accesible `list.label` = «Lista de roles»; un `ListItemButton` por role, en el
  orden de la API (por nombre); el elegido, `selected`.
- Texto secundario de cada elemento, unido con « · »: tipo («Sistema» o «Clínica», de
  `filters.type`), descripción (si tiene) y, **solo con Activos**, `list.permissionsCount(n)` =
  «n permisos» cuando se conoce.
- Carga: indicador con `common.loading`. Error: `ErrorState` con reintento. En ambos casos los
  filtros y el título siguen a la vista.
- Vacío (`EmptyState`):

| Filtros | Texto |
|---|---|
| Todos + Activos | `list.emptyAll` = «Todavía no hay roles. Crea el primero.» |
| Sistema + Activos | `list.emptySistema` = «Todavía no hay roles de Sistema. Crea el primero.» |
| Clínica + Activos | `list.emptyClinica` = «Todavía no hay roles de Clínica. Crea el primero.» |
| cualquier tipo + Bloqueados | `list.emptyBlocked` = «No hay roles bloqueados.» |

## 4. Detalle de un role activo (`RoleDetailPanel`)

Igual que en la feature 023 (FR-019), más «Bloquear role» (`status.block`) entre «Duplicar» y
«Eliminar role», solo con `canEdit`. Deshabilitado mientras hay cambios sin guardar o un guardado en
curso.

Confirmación (`ConfirmDialog`, `tone="danger"`):

| Elemento | Texto |
|---|---|
| Título | `status.confirmTitle(name)` = «¿Bloquear {name}?» |
| Cuerpo | `status.confirmBody(name)` = «Mientras {name} esté bloqueado, las personas que lo tienen asignado dejan de recibir lo que concede y sus permisos no se podrán ver ni cambiar. Podrás volver a activarlo desbloqueándolo.» |
| Cancelar (foco inicial) | `status.cancel` = «Cancelar» |
| Confirmar | `status.confirm` = «Bloquear role» |

Mientras bloquea, el diálogo no se puede cerrar y su botón muestra que trabaja.

## 5. Detalle de un role bloqueado (`BlockedRoleDetail`)

- `h2` con el nombre del role; la descripción (si tiene); «Tipo: {Sistema|Clínica}»
  (`detail.fields.type`); «Estatus: Bloqueado» (`blocked.statusLabel`, `blocked.statusValue`).
- `Alert` informativo con `blocked.explanation` = «Mientras esté bloqueado, sus permisos no se pueden
  ver ni cambiar y no se puede eliminar. Para hacerlo, primero desbloquéalo.»
- «Desbloquear role» (`status.unblock`) solo con `canEdit`; sin confirmación; `loading` y
  deshabilitado mientras trabaja.
- Sin lista de permisos, sin «Guardar», «Descartar», «Duplicar» ni «Eliminar role», sin campos
  editables y sin ninguna consulta de permisos.

## 6. Avisos (notificaciones)

| Situación | Texto | Severidad |
|---|---|---|
| Bloqueado | `status.blocked(name)` = «{name} quedó bloqueado. Ahora está en «Bloqueados».» | success |
| Desbloqueado | `status.unblocked(name)` = «{name} quedó desbloqueado. Ahora está en «Activos».» | success |
| Ya estaba bloqueado (409) | `status.alreadyBlocked(name)` = «{name} ya estaba bloqueado. La lista se actualizó.» | info |
| Ya estaba activo (409) | `status.alreadyActive(name)` = «{name} ya estaba activo. La lista se actualizó.» | info |
| 404 | `errors.notFound` = «Este role ya no existe.» | error |
| 403 | `forbidden.action` | error |
| Red/5xx | `errors.retryable` | error |

Tras un éxito o un «ya estaba», el detalle se cierra (sin `roleId`), la lista ya está actualizada y el
foco va al título `h1`. Tras un error, el detalle sigue abierto y se puede reintentar.

## 7. Crear y duplicar

El role nuevo queda elegido: `status` pasa a Activos y `type` cambia solo si no incluía el tipo del
role nuevo (Todos lo incluye siempre).
