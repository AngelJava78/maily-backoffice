# Research: Lista de roles y permisos en tabla, como la de Usuarios

**Feature**: `027-roles-grid-list` | **Date**: 2026-11-03 | **Plan**: [plan.md](plan.md)

Decisiones tomadas al planear, cada una con su razón y las alternativas descartadas. Los hechos de la
API se leyeron en el código local de `mailySoft-usuarios` (HEAD `4fe6935`, spec 018) y en el cliente
del Backoffice el 2026-11-03; el comportamiento de Usuarios, en el código de la feature 026 ya
fusionada (`4c9ecd3`), que es la referencia de esta tabla.

## D1 — La API no cambia; la columna Estatus solo puede decir Activo o Bloqueado

**Decision**: no se pide ningún cambio a la API de usuarios. Se usa lo que ya existe:

- `GET /api/v1/roles` con `status_id` opcional: `1` Activo por omisión, `2` Bloqueado; cualquier otro
  valor responde 422 (`ge=1, le=2` en `src/routers/roles.py`). Devuelve, «en una sola respuesta y sin
  paginación», los roles de **ambos tipos** de ese estatus ordenados por nombre sin distinguir
  mayúsculas. Cada role trae `id`, `name`, `description`, `created_at`, `status` y `type`.
- `GET /api/v1/roles/{id}/permissions` (uno por role, solo activos) da el total de permisos; para un
  role bloqueado responde 404 `role_not_found`, como el detalle, la edición y la eliminación.

**Rationale**: por eso «Eliminado» nunca llega a la tabla (aclaración 2 del spec, opción A) y por eso
la tabla pagina en pantalla (D4). No hace falta tocar `features/auth`, el cliente HTTP ni los
simuladores de MSW: el filtro `status_id` y `block`/`unblock` ya están desde la 025.

**Alternatives considered**: pedir a la API `status_id=3`, un filtro por tipo o paginación en
`GET /roles`: cambios entre repositorios para un catálogo de decenas de roles, y la persona eligió no
mostrar eliminados.

## D2 — Dos rutas: la tabla en `/roles` y el detalle en `/roles/:roleId`

**Decision**: bajo la misma guarda `RequirePermission resource="roles"`, `routes.tsx` tiene

| Ruta | Pantalla | `handle` |
|---|---|---|
| `/roles` (índice) | `RolesRoute` → `RolesPage` | `{ titleKey: 'roles' }` |
| `/roles/:roleId` | `RoleDetailRoute` → `RoleDetailPage` | `{ titleKey: 'roleDetail', roleIdParam: 'roleId' }` |

`RoleDetailRoute` hace lo que `UserDetailRoute`: calcula las capacidades con `getRoleCapabilities` y,
si el id no es válido (`parseRoleId`: dígitos sin ceros a la izquierda, hasta 10), muestra
`NotFoundPage`. `useRouteAccessibility` gana la clave `roleDetail` y el parámetro `roleIdParam`, así
que un id que no lo es titula la pestaña como «Página no encontrada».

**Rationale**: FR-011 pide una pantalla propia y la constitución (VI) el patrón general de listado y
detalle en rutas separadas. El menú resalta «Roles y permisos» también en `/roles/7` (`NavLink` sin
`end`). Pasar de `/roles` a `/roles/7` cambia el `pathname`, y `useRouteAccessibility` ya lleva el
foco al `h1` en ese caso —y solo en ese caso: cambiar página o filtro (solo la query) deja el foco
donde estaba (FR-022).

**Alternatives considered**: dejar el detalle en un parámetro (`/roles?roleId=7`): no cambia el
`pathname`, así que no hay foco ni título de pestaña propios, y el spec pide una pantalla con su
dirección. Rutas anidadas con un `Outlet` dentro de la tabla: la tabla y el detalle no deben
compartir pantalla.

## D3 — La dirección de la tabla: `type`, `status`, `page`, `page_size`; `roleId` es un enlace antiguo

**Decision**: la dirección de `/roles` conserva `type` y `status` de la 025 y gana los parámetros de
paginación de Usuarios:

| Estado | Parámetro | Valores | Por omisión (se omite) |
|---|---|---|---|
| Tipo | `type` | `sistema`, `clinica` | Todos |
| Estatus | `status` | `bloqueados` | Activos |
| Página | `page` | entero ≥ 1 sin ceros a la izquierda | 1 |
| Tamaño | `page_size` | `10`, `25`, `50` | 10 |

Un valor no válido se sustituye por el de omisión y la dirección se reescribe con `replace` (el
efecto de canonización que ya tiene `useRolePermissionsLocation`). `roleId` ya no es parte de la
forma canónica: `RolesPage` es una envoltura fina que lo lee antes que nada. Si es válido, devuelve
`<Navigate replace to="/roles/{id}" state={{ listSearch }} />`, donde `listSearch` es el `type` y el
`status` de esa misma dirección en su forma canónica, para que «Volver al listado» regrese a los
mismos filtros (FR-019). Si no es válido (`007`, `abc`), se ignora y la canonización lo quita.

**Rationale**: los enlaces anteriores con `type`/`status` ya son la forma canónica (como en la 025,
D2): no hay código de migración para ellos, solo para `roleId`. La envoltura separa el redireccionar
del hook de la tabla, que no debe correr su efecto de canonización sobre una dirección que se va a
abandonar.

**Alternatives considered**: los nombres de Usuarios (`type_id`, `status_id`): convertirían todos los
enlaces guardados en antiguos (el mismo argumento que la 025). Redirigir en un `loader`: la
aplicación no usa loaders.

## D4 — La tabla pagina en pantalla la lista completa y pide los permisos solo de su página

**Decision**: `useVisibleRoles({ type, status })` sigue siendo una consulta por estatus
(`roleKeys.list(status)`) con el tipo filtrado por la función pura `rolesOfType`. Sobre esa lista:

1. `pageOfRoles(roles, page, pageSize)` corta las filas de la página y `lastPageOf(total, pageSize)`
   da la última (1 aunque no haya roles).
2. `RolesGrid` recibe **solo esas filas** y el total (`rowCount`), con `paginationMode="server"`: el
   mismo contrato que `UsersGrid`, de modo que la rejilla nunca tiene más filas que una página
   (constitución, rendimiento) y el pie, el aspecto y los estilos son los de Usuarios
   (`GRID_APPEARANCE_STYLES`, `GRID_PAGINATION_STYLES`, `PAGE_SIZE_OPTIONS` 10/25/50).
3. `RolesTable` (la zona de la tabla) corrige una página posterior a la última con `setPage(last,
   { replace: true })` cuando ya hay datos —el mismo efecto sobre la dirección que `UsersList`—.
4. `useRolePermissionCounts(ids)` recibe solo los ids de la página y solo con «Activos». Comparte la
   clave `roleKeys.permissions(id)` con el detalle: abrir un role no repite la consulta.

**Rationale**: FR-004 pide el mismo pie que Usuarios y la API entrega todo de una vez (D1); el catálogo
es pequeño y acotado, y hoy ya se descarga completo, así que no hay una descarga nueva. Lo que cambia
es mejor que antes: el contador se pide para ≤ `page_size` roles (10 por omisión) y no para cada role
activo. El Principio IV dice «NO DEBE descargarse una colección completa para paginarla en el
cliente»; como esta variante es permanente, se reconoce en la enmienda de la constitución (D13) y no
como fila de Complexity Tracking.

**Alternatives considered**: no paginar y quitar el pie (el spec y la persona lo piden); pedir a la
API que pagine roles (D1); `paginationMode="client"` con todas las filas: la rejilla corta
internamente, pero entonces el componente no sabría qué filas son visibles para pedir sus contadores
sin repetir el corte.

## D5 — Qué muestra el detalle: una función pura sobre las dos listas

**Decision**: `resolveRoleView(...)` (en `schemas/roleView.ts`) decide la vista de `/roles/:roleId` y
`useRoleView(roleId)` la alimenta:

| Lista de activos | ¿Está en ella? | ¿Se mostró ya como activo? | Lista de bloqueados | Vista |
|---|---|---|---|---|
| carga | — | — | — | `loading` |
| falla | — | — | — | `error` (reintentar) |
| ok | sí | — | no se pide | `active` → `RoleDetailPanel` |
| ok | no | sí | no se pide | `notFound` |
| ok | no | no | carga (se pide ahora) | `loading` |
| ok | no | no | falla | `error` |
| ok | no | no | ok y está | `blocked` → `BlockedRoleDetail` |
| ok | no | no | ok y no está | `notFound` |

La lista de bloqueados solo se pide cuando el role no está entre los activos y nunca se mostró como
activo. «Ya se mostró como activo» es el patrón de React de ajustar estado durante el render
(`useState` del último `roleId` visto activo, comparado con el actual), el mismo de la 025 (D4).
`RoleDetailPanel` y `useRoleDetail` siguen como están (FR-011): el role activo se sigue sacando del
catálogo ya cargado, sin una consulta más.

**Rationale**: la API no da el detalle de un role bloqueado (D1), así que un enlace directo a uno solo
puede resolverse mirando la lista de bloqueados. El segundo renglón del cuadro implementa el edge case
del spec (FR-014): un role que se elimina o se bloquea desde otra sesión con su detalle abierto
muestra «ya no existe», aunque ahora esté en la otra lista, y no cambia de pantalla bajo los pies de
quien edita. La misma consulta del catálogo se comparte con la tabla y con el formulario de alta
(sin peticiones nuevas en el caso normal).

**Alternatives considered**: pedir siempre las dos listas (una petición más por cada detalle de un
role activo); pasar el estatus en la dirección del detalle (`/roles/7?status=bloqueados`: una
dirección más que los enlaces antiguos y compartidos no tendrían); llamar a `GET /roles/{id}`: no
sirve para roles bloqueados y duplica lo que el catálogo ya trae.

## D6 — «Volver al listado» vuelve a la tabla de la que se salió

**Decision**: cada enlace a un detalle lleva `state={{ listSearch }}`, donde `listSearch` es la
dirección canónica de la tabla (`''` o, por ejemplo, `?type=sistema&page=2`). `RoleDetailPage` lo lee
con `parseRoleDetailState(location.state)` —Zod: solo acepta cadenas de ≤ 300 caracteres que empiezan
por `?` y cuyas claves son `type`, `status`, `page` y `page_size`; lo demás se descarta, nunca lanza—
y arma `/roles${listSearch ?? ''}`. Sin estado (un enlace directo), vuelve a `/roles`. El botón Atrás
del navegador no necesita estado: es la entrada anterior del historial.

**Rationale**: es lo que hace Usuarios (`parseUserDetailState`, 026 FR-012) y cumple FR-013. El estado
de una entrada del historial no es de fiar (constitución II): se reconstruye una dirección, así que
solo se acepta lo que la tabla escribe.

**Alternatives considered**: la tabla en un parámetro del detalle (`/roles/7?from=...`): ensucia la
dirección que se comparte. `navigate(-1)`: falla con enlaces directos y con recargas.

## D7 — Crear y duplicar: la tabla a la que se vuelve muestra el role nuevo

**Decision**: una función pura, `locationAfterCreate(location, role, activeRoles)`, devuelve el estado
de la tabla que muestra el role: `status: 'active'`; `type` solo cambia si el actual esconde el tipo
del role (FR-010 de la 025); `page` es `pageOfRole(rolesOfType(activeRoles, type), role.id, pageSize)`
(1 si no está). El hook `useRevealRole()` devuelve `(location, role) => { search }` leyendo la lista
de activos con `queryClient.getQueryData(roleKeys.list('active'))` en el momento de la llamada, no al
renderizar: para entonces la mutación ya esperó a que las listas se refrescaran (su `onSettled`
invalida `roleKeys.lists()` y espera hasta `REFRESH_WAIT_MS`).

- **Crear** (desde la tabla, `onCreated`): `await navigate('/roles' + search, { replace: true })` y
  luego `navigate('/roles/{id}', { state: { listSearch: search } })`. Así, «Volver al listado» **y** el
  botón Atrás caen en una tabla que muestra el role (FR-017 prevalece sobre FR-013). Si `search` ya
  es la dirección actual, se omite el reemplazo.
- **Duplicar** (desde el detalle de A, `onDuplicated`): `navigate('/roles/{copiaId}', { state: {
  listSearch: search } })`, con `search` calculado igual a partir del `listSearch` de A. Atrás
  regresa al detalle de A, como es natural; «Volver al listado» a la tabla que muestra la copia. El
  foco en el nombre sigue en `RoleDetailPanel` (sin cambios): el efecto de ruta lleva el foco al `h1`
  primero y el temporizador del panel lo pasa después al campo.

**Rationale**: SC-007 pide que el role aparezca al volver en el 100 % de las combinaciones, y el orden
por nombre hace que su página no sea la primera. Leer la caché en un manejador de eventos no copia
estado de servidor a otro lugar (constitución III). Esperar el reemplazo antes de empujar el detalle
evita que dos navegaciones seguidas se interrumpan en el enrutador de datos.

**Alternatives considered**: calcular la página al pintar «Volver al listado» (arregla el enlace pero
no Atrás); un parámetro `?locate=7` en la tabla (vocabulario nuevo en la dirección para un solo uso);
dejar los filtros como estaban (incumple FR-017 y SC-007).

## D8 — Bloquear, desbloquear y eliminar vuelven a la tabla; el foco lo mueve la ruta

**Decision**: `onBlocked`, `onUnblocked` y `onDeleted` de `RoleDetailPage` hacen
`navigate('/roles' + (listSearch ?? ''), { replace: true })`. Las acciones y sus avisos
(`useChangeRoleStatusAction`, `useDeleteRoleAction`) no cambian. `RoleDetailPanel` recibe `onDeleted`
y deja de usar `useRolePermissionsLocation`.

**Rationale**: reemplazar la entrada hace que Atrás nunca caiga en el detalle de un role que ya no
está donde estaba. Como `/roles/7` pasa a `/roles`, `useRouteAccessibility` lleva el foco al título
(US3-5/6, FR-016) y desaparecen la ref y el efecto de foco que la 025 puso en `RolesPage` (D7 de
aquella feature).

**Alternatives considered**: `navigate(-1)` (falla con enlaces directos); empujar la tabla (Atrás cae
en un detalle que dice «ya no existe»).

## D9 — La guarda de cambios sin guardar sube a la pantalla de detalle

**Decision**: `useBlocker` y su `ConfirmDialog` (textos de `roles.detail.unsavedChanges*`, sin
cambios) pasan de `RolesPage` a `RoleDetailPage`, activos mientras el role se muestra como activo y el
panel informa cambios (`onDirtyChange`). Protegen todas las salidas del detalle: «Volver al listado»,
el menú, Atrás y duplicar. La tabla no tiene formulario, así que ya no necesita guarda. Tras un
**eliminar** confirmado no se pregunta: `shouldBlock` es una función que lee una ref que el
manejador de `onDeleted` activa justo antes de navegar.

**Rationale**: FR-020. Preguntar «¿descartar los cambios?» tras eliminar el role que se editaba sería
absurdo (el diálogo de eliminar ya advierte que no se puede deshacer). La ref se lee al navegar, no al
renderizar, así que no rompe las reglas de los Hooks.

**Alternatives considered**: `flushSync(() => setDirty(false))` antes de navegar (un render síncrono
dentro de un manejador, más frágil que una ref); preguntar también tras eliminar (comportamiento
absurdo).

## D10 — Columnas y celdas

**Decision**: `RolesGrid` define exactamente cuatro columnas (FR-002), en este orden:

| Columna | Contenido | Ancho |
|---|---|---|
| Nombre | enlace a `/roles/{id}` con `state={{ listSearch }}`; el resto de la fila no es un enlace | `flex: 1`, mín. 200 |
| Estatus | `roles.list.status.active` / `blocked` según `status.id` (1 / 2) | mín. 130 |
| Tipo | `roles.filters.type[typeFilterOfRoleTypeId(type.id)]` | mín. 130 |
| Permisos | `roles.list.permissionsCount(n)` = «n permisos» («1 permiso»); «—» si el role está bloqueado, el total aún no se conoce o falló | mín. 150 |

Sin ordenar, filtrar por columna, menú de columnas ni selección de filas, como `UsersGrid`; autoalto;
el nombre largo se corta con puntos suspensivos (celda por omisión de la rejilla). Descripción y fecha
de alta no son columnas (aclaración 1).

**Rationale**: el texto del estatus sale de `messages` según el id, no del `status.name` de la API
(constitución VI: textos centralizados), igual que el tipo. Un `Chip` como el de Usuarios exigiría un
componente compartido (el `StatusChip` es de otra feature) para un valor que la spec pide como texto.

**Alternatives considered**: `Chip` de estatus (queda como mejora posterior, con un componente en
`shared/ui`); usar el nombre del estatus de la API; todas las filas como enlace (Usuarios no lo hace).

## D11 — Textos, títulos y la clave de ruta

**Decision**: todo en `src/shared/messages/es.ts`, sin literales en JSX:

- `titles.roleDetail` = «Detalle del role», y `roleDetail` en el esquema del `handle` de
  `useRouteAccessibility`, con `roleIdParam`.
- `roles.list`: + `gridLabel` («Roles»), `columns`, `status`, `pageStatus`, `noValue` («—»);
  `permissionsCount` pasa a singular con 1; − `label` («Lista de roles»).
- `roles.detail`: + `title`, `backToList` («Volver al listado») y `notFound`; − `emptySelection`.
- `parseRoleId` se exporta desde `features/roles/index.ts`, junto a la `RolesPage` y la nueva
  `RoleDetailPage`, ambas diferidas con `lazy` en ese mismo archivo.

Los textos exactos están en [contracts/roles-ui.md](contracts/roles-ui.md).

## D12 — Componentes: qué nace, qué cambia y qué se va

- **Nuevos**: `RolesGrid`, `RolesTable` (la zona de la tabla: estados, anuncio, página inexistente),
  `RoleDetailPage`; `RoleDetailRoute` en `app`; hooks `useRoleView` y `useRevealRole`; esquemas
  `roleView.ts` y `roleDetailState.ts`.
- **Reescritos**: `RolesPage` (envoltura de enlaces antiguos + pantalla de la tabla),
  `rolePermissionsLocation.ts` y `useRolePermissionsLocation` (`type`, `status`, `page`, `page_size`,
  `search`, `setType`, `setStatus`, `setPage`, `setPageSize`).
- **Cambiados**: `RoleDetailPanel` (246 líneas: deja el hook de la dirección y gana `onDeleted`, así
  que no pasa de 250), `BlockedRoleDetail` (sin su `h2`: el título de la pantalla ya es el nombre),
  `useVisibleRoles` (recibe `type` y `status` en vez de leer la dirección).
- **Eliminados**: `RolesList` (y su prueba), `detailOf`, `RoleDetailView`, `selectCreated` y el
  `roleId` del estado.

**Rationale**: constitución I (componentes pequeños, un archivo > 250 líneas se divide). El `h1` de
`RoleDetailPage` es el nombre del role cuando ya se conoce y «Detalle del role» mientras carga, para
que el foco tenga un título desde el primer render (como `UserDetailPage`).

## D13 — Enmienda de la constitución: 1.7.1 → 1.8.0 (MINOR)

**Decision**: en el Principio VI, la frase de la variante de Roles pasa de

> El recurso de Roles sigue este patrón con una variante de presentación: lista maestro-detalle en una
> sola pantalla, filtrada por tipo y estatus, en vez de listado y detalle en rutas separadas; esta
> variante es parte normal del patrón para ese recurso y no requiere Complexity Tracking.

a

> El recurso de Roles sigue este patrón con una variante: su listado es una tabla paginada en
> pantalla, filtrada por tipo y estatus, porque la API de roles entrega todos los roles de un estatus
> en una sola respuesta, sin paginar (excepción acotada a la paginación de servidor del Principio IV;
> son pocos y el contrato lo documenta así); su detalle es una ruta propia, como el de los demás
> recursos; y su alta es un diálogo y la edición del nombre, la descripción y los permisos se hace en
> la propia pantalla de detalle, en lugar de un formulario compartido. Esta variante es parte normal
> del patrón para ese recurso y no requiere Complexity Tracking.

Versión **1.8.0**, «Last Amended» 2026-11-03. La enmienda va en el mismo PR (como la 025) y la aprueba
el responsable del proyecto.

**Rationale**: el spec dice que la variante maestro-detalle «se retira en el plan». Se retira, pero
quitarla sin más dejaría a Roles incumpliendo dos reglas del patrón general que esta feature no
cambia: el formulario compartido para crear y editar (el alta es un diálogo; la edición, el propio
detalle) y la paginación de servidor (D4). La gobernanza pide que las desviaciones permanentes sean
enmienda y no filas de Complexity Tracking (la 014 y la 025 siguieron la misma lógica). MINOR y no
PATCH porque cambia lo que se permite para un recurso, no solo su redacción; el responsable decide.
**Impacto**: las partes de maestro-detalle de las specs 014 y 025 quedan reemplazadas (el spec 027 lo
dice); ninguna tarea abierta depende de ellas. **Migración**: ninguna.

**Alternatives considered**: solo retirar la variante y registrar dos filas en Complexity Tracking
(son permanentes, así que la gobernanza pide enmienda); una excepción general de «catálogos acotados»
en el Principio IV, que también legitimaría las filas de la 013 (Módulos y permisos): es más amplia
que esta feature y queda como limpieza posterior.

## D14 — Pruebas y simulador

- **Simuladores de MSW**: sin cambios (`GET /roles?status_id`, `block`, `unblock` y el 404 de roles
  bloqueados ya están desde la 025). Las pruebas de paginación añaden roles a
  `scenario.directory.roles` antes de arrancar los simuladores: la semilla tiene 9 y el tamaño mínimo
  de página es 10.
- **Primero las pruebas de la lógica pura** (constitución VII): `rolePermissionsLocation` (lectura y
  escritura con `page`/`page_size`, `legacyRoleIdOf`, `parseRoleId`, `pageOfRoles`, `lastPageOf`,
  `pageOfRole`, `locationAfterCreate`, `emptyRolesMessage`), `roleView` y `roleDetailState`.
- **Hooks**: `useRolePermissionsLocation`, `useRoleView`, `useRevealRole`, `useVisibleRoles`.
- **Componentes**: `RolesGrid` (columnas, enlace, pie, vacío, axe), `RolesTable` (cargando, error,
  vacío por caso, anuncio, página inexistente, contadores solo de la página), `RolesPage` (reescrita:
  encabezado, filtros, enlace antiguo, crear), `RoleDetailPage` (vistas, volver, guarda, acciones),
  y los cambios en `RoleDetailPanel` y `BlockedRoleDetail`.
- **Integración con `renderApp`**: se migran las seis de `src/app/router/roles/` (elegir un role pasa
  a pulsar su nombre en la tabla y esperar el detalle) y se añade `rolesTable.integration.test.tsx`
  (paginación, enlaces antiguos, volver y Atrás, recarga). `useRouteAccessibility.roles.test.tsx`
  cubre el título del detalle y el id que no lo es.
- **E2E** (`e2e/roles.spec.ts`): elegir un role es pulsar su nombre en la tabla, y cada paso que
  hoy espera el panel espera la pantalla de detalle; solo corre con cuentas de prueba.

## D15 — Lo que no cambia

- `features/auth` (capacidades), el menú y la guarda de la sección.
- Qué es un role, la creación (`RoleFormDialog`), la edición del nombre y la descripción, la lista de
  permisos con botones (023), el duplicado, bloquear, desbloquear y eliminar y sus avisos (FR-024).
- Los filtros `RolesFilters`, sus textos y su aspecto (025).
- La sección de Usuarios sigue pidiendo `GET /roles` sin parámetros.
- No se añade buscador, ordenación por columna ni exportación.
- Bloquear el propio role de la persona (p. ej. su único role de Sistema) le quitaría el acceso; la
  API no lo impide y ninguna spec lo trata. Fuera de alcance, como en la 025.
