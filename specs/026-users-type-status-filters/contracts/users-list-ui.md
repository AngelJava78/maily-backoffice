# Contrato de interfaz: pantalla «Usuarios» con filtros de Tipo y Estatus

**Feature**: `026-users-type-status-filters` | **Ruta**: `/users` (sin cambios de ruta ni de permisos)

## Dirección

`/users?[type_id=1|2][&status_id=2][&page=N][&page_size=25|50]` en modo lista, y
`/users?email=…[&type_id=1|2][&status_id=2]` en modo búsqueda. Lo que es por omisión no se escribe;
valores no válidos se corrigen con `replace` (detalle en [data-model.md §3](../data-model.md)).

| Dirección | Filtros | Página | Tamaño |
|---|---|---|---|
| `/users` | Todos + Activos | 1 | 10 |
| `/users?page=3&page_size=25` (enlace anterior a la 026) | Todos + Activos | 3 | 25 |
| `/users?type_id=2&status_id=2` | Clínica + Bloqueados | 1 | 10 |
| `/users?type_id=9&status_id=1&page=abc` | → `/users` (con `replace`) | 1 | 10 |
| `/users?email=ana@x.com&status_id=2` | Bloqueados (se conservan) | — | — |

## Disposición

```text
Usuarios                                                [Crear usuario]
Tipo                          Estatus                  Buscar por correo electrónico
[Todos|Sistema|Clínica]       [Activos|Bloqueados]     [______________] [Buscar] [Limpiar]
┌──────────────────────────────────────────────────────────────────────┐
│ Nombre                │ Correo electrónico │ Tipo    │ Fecha de alta  │
│ Gabi López [Bloqueado]│ gabi@clinica.mx    │ Clínica │ 3 oct 2026 …   │
└──────────────────────────────────────────────────────────────────────┘
                                       Filas por página: 10 ▾   1–1 de 1
```

- Filtros y buscador en una fila con `flexWrap` (`alignItems: flex-end`); a 320 px se reparten en
  varias líneas sin desplazamiento horizontal (FR-017).
- «Crear usuario» sigue en la cabecera con cualquier combinación, si hay permiso (US3-8).

## `UsersFilters`

| Grupo | `aria-label` | Botones (valor → texto) | Por omisión |
|---|---|---|---|
| Tipo | «Tipo» | `all` → Todos, `system` → Sistema, `clinic` → Clínica | `all` |
| Estatus | «Estatus» | `active` → Activos, `blocked` → Bloqueados | `active` |

- `ToggleButtonGroup exclusive size="small"`, etiqueta visible encima de cada grupo
  (`Typography variant="body2" color="text.secondary"`), igual que `RolesFilters` y `ModulesFilters`
  (FR-015, SC-009).
- Pulsar el botón ya pulsado no cambia nada (MUI entrega `null` y se ignora) (FR-003).
- Teclado: Tab entra al grupo, flechas entre botones, Espacio o Enter elige; `aria-pressed` en cada
  botón (FR-016).
- En modo lista: cambiar un filtro lleva a la página 1 con el mismo tamaño (FR-008). En modo
  búsqueda: termina la búsqueda y muestra la tabla filtrada (D4).

## Tabla (`UsersGrid`)

| Columna | Contenido |
|---|---|
| Nombre | Enlace al detalle (`/users/:id`, con `state.listSearch` = dirección actual) y, si el usuario no está activo, `StatusChip` («Bloqueado») detrás |
| Correo electrónico | Sin cambio |
| **Tipo** (nueva) | `describeUserType(roleTypes)`: «Sistema», «Clínica», «Sistema y Clínica» o «—» |
| Fecha de alta | Sin cambio |

Paginación en el servidor con 10, 25 o 50 por página; sin ordenar ni filtrar columnas (sin cambio).

## Estados de la zona de la tabla

| Caso | Texto | Acción en el vacío |
|---|---|---|
| Todos + Activos, vacío | No hay usuarios activos | «Crear usuario» (si hay permiso) |
| Sistema + Activos, vacío | No hay usuarios activos de Sistema | «Crear usuario» (si hay permiso) |
| Clínica + Activos, vacío | No hay usuarios activos de Clínica | «Crear usuario» (si hay permiso) |
| Todos + Bloqueados, vacío | No hay usuarios bloqueados | ninguna |
| Sistema + Bloqueados, vacío | No hay usuarios bloqueados de Sistema | ninguna |
| Clínica + Bloqueados, vacío | No hay usuarios bloqueados de Clínica | ninguna |
| Error | «No se pudieron cargar los usuarios» + reintentar (sin cambio) | — |

Anuncio cortés sin mover el foco (FR-014): «Mostrando X a Y de Z usuarios.» o el texto del vacío.

## Textos nuevos (`messages.users`)

```text
filters: { typeLabel: 'Tipo', type: { all: 'Todos', system: 'Sistema', clinic: 'Clínica' },
           statusLabel: 'Estatus', status: { active: 'Activos', blocked: 'Bloqueados' } }
list.columns.type: 'Tipo'
list.noType: '—'
list.typeJoin: (a, b) => `${a} y ${b}`              // «Sistema y Clínica»
list.empty: 'No hay usuarios activos'               // ya existe, sin cambio
list.emptyActiveOfType:  (type) => `No hay usuarios activos de ${type}`
list.emptyBlocked:       'No hay usuarios bloqueados'
list.emptyBlockedOfType: (type) => `No hay usuarios bloqueados de ${type}`
```

## Lo que no cambia

Detalle del usuario y sus acciones, creación, resultado de la búsqueda por correo (sin tipo), permisos
de la sección y protecciones sobre el propio usuario (FR-018).
