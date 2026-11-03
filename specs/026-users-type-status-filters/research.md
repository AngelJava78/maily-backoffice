# Research: Lista de usuarios con filtros de Tipo y Estatus

**Feature**: `026-users-type-status-filters` | **Date**: 2026-11-03 | **Plan**: [plan.md](plan.md)

Cada decisión dice qué se eligió, por qué y qué se descartó. El código citado es el de `main` en
`0fb57ce` (con la 025 integrada) y el de la API de usuarios en `4fe6935` (5.5.0, su spec 018).

## D1. Contrato: la lista de la API de usuarios 5.5.0, sin otras operaciones

**Decision**: la feature consume solo `GET /api/v1/users` (U1) con sus dos parámetros nuevos,
`status_id` (1 Activo, 2 Bloqueado) y `role_type_id` (1 Sistema, 2 Clínica), y lee el campo nuevo
`role_types` de cada elemento ([contracts/users-list-service.md](contracts/users-list-service.md)).
`listUsers` pasa a recibir `statusId` y `roleTypeId`; envía **siempre** `status_id` y solo envía
`role_type_id` con Sistema o Clínica. Ninguna otra operación cambia: `by-email`, el detalle,
`/users/{id}/roles` y las acciones siguen devolviendo `UserRead`, sin `role_types` (FR-017 de la 018).

**Rationale**: la API ya hace el filtrado, el conteo y la paginación en el servidor (constitución IV);
el Backoffice solo traduce los botones a parámetros. Enviar `status_id=1` explícito no cambia nada en
la 5.5.0 (es su valor por omisión) y deja cada petición autoexplicada en la red y en las pruebas.

**Alternatives considered**: omitir `status_id` cuando es 1 (como hace la dirección): ahorra unos
bytes, pero mezcla la regla «lo que es por omisión no se escribe» de la dirección con la del cliente
HTTP; descartado. Pedir los roles de cada usuario (`/users/{id}/roles`): una consulta por fila, y la
API responde 409 con un usuario bloqueado; era el motivo de esperar a la 5.5.0.

## D2. `role_types` obligatorio: una API anterior falla de forma visible

**Decision**: el esquema del elemento de la lista exige `role_types` (arreglo, puede venir vacío).

**Rationale**: FastAPI ignora los parámetros que no conoce. Contra una API 5.4.0, «Bloqueados»
devolvería a los usuarios **activos** sin ningún error: la pantalla mentiría. Como la 5.4.0 no trae
`role_types`, la validación en la frontera (constitución II) convierte esa respuesta en el estado de
error con reintento: el desajuste de versiones se ve en vez de mostrar datos falsos.

**Alternatives considered**: `role_types` opcional con `[]` por omisión: toleraría la 5.4.0, pero con
el problema descrito; descartado. Consultar `/info` para comprobar la versión: una llamada más y una
regla de versiones en el cliente; innecesario si el esquema ya lo detecta.

## D3. La dirección: `type_id` y `status_id`, como Módulos

**Decision**: la dirección de `/users` gana `type_id=1|2` (Sistema | Clínica) y `status_id=2`
(Bloqueados), con los mismos nombres y valores que la de Módulos y que la API. Lo que es por omisión
(Todos, Activos, página 1, 10 por página) no se escribe, así que un enlace anterior a la feature
(`?page=3&page_size=25`) ya es la forma canónica (FR-010). Un valor no válido se sustituye por el de
omisión y la dirección se corrige con `replace`, como hoy hace `useUsersLocation` (FR-009).

**Rationale**: la dirección de Usuarios ya usa los nombres de la API (`page`, `page_size`); Módulos
también (`type_id`, `status_id`). Roles usa `type=sistema|clinica` y `status=bloqueados` solo porque
heredaba los enlaces de sus pestañas (D2 de la 025); Usuarios no tiene enlaces antiguos con tipo.

**Alternatives considered**: los valores de Roles (`type=sistema`): más legibles, pero inventan una
tercera convención para un listado que ya habla en `snake_case` de la API; descartado.

## D4. La búsqueda por correo conserva los filtros; pulsar un filtro termina la búsqueda

**Decision**: el modo búsqueda de la dirección guarda también `type_id` y `status_id`
(`?email=ana@x.com&status_id=2`), pero no la página ni el tamaño (como hoy). Durante una búsqueda:

- el resultado no depende de los filtros: se busca por correo como hoy (FR-011);
- los grupos siguen visibles, habilitados y con su valor;
- **pulsar un botón termina la búsqueda** y muestra la tabla con el filtro nuevo en la página 1,
  igual que «Limpiar» pero con el filtro elegido;
- «Limpiar» vuelve a la tabla con los filtros que había, en la página 1 y con 10 por página (hoy
  también vuelve a la página 1 con el tamaño por omisión).

**Rationale**: FR-011 pide que los filtros no oculten el resultado y que se conserven al limpiar.
Si pulsar un filtro durante la búsqueda no hiciera nada visible, el botón parecería roto; si lo
deshabilitáramos, la persona no sabría cómo volver a la tabla filtrada. Que pulsarlo signifique «quiero
ver la tabla así» es lo que espera quien lo pulsa. El campo de correo se vacía solo, porque
`UserSearchForm` toma su valor de `initialEmail` (`values` de react-hook-form).

**Alternatives considered**: deshabilitar los filtros durante la búsqueda (cumple FR-011, pero
obliga a dos pasos para algo que se pide con uno); aplicar el filtro al resultado de la búsqueda
(contradice FR-011: el buscador encuentra a cualquier usuario «sin que los filtros lo oculten").

## D5. Una consulta por combinación, con la clave de TanStack Query que la describe

**Decision**: `UserListParams` pasa a ser `{ page, pageSize, type, status }` y la clave
`userKeys.list(params)` lo incluye entero (sigue bajo `userKeys.lists()`, así que las invalidaciones
por prefijo de `refreshUser` alcanzan todas las combinaciones). Además:

- `refreshAfterRoleChange` (asignar o quitar roles desde el detalle o al crear) **también invalida
  `userKeys.lists()`**, porque ahora la lista muestra el tipo, que depende de los roles (constitución
  III: toda mutación invalida lo que afecta). La lista no está montada mientras se ve el detalle, así
  que solo queda marcada como vieja: no alarga la espera de la mutación.
- `useUsersPage` conserva `placeholderData: keepPreviousData` y añade `refetchOnMount: 'always'`.

**Rationale**: cada combinación es una respuesta distinta del servidor; mezclarlas bajo una misma clave
mostraría datos de otro filtro. `keepPreviousData` evita el parpadeo al cambiar de filtro, como ya lo
evita al cambiar de página (la zona de la tabla muestra el indicador de carga del DataGrid).

`refetchOnMount: 'always'` cubre el caso límite de los roles que la invalidación no alcanza: el tipo
de un usuario también cambia cuando la sección **Roles** bloquea, desbloquea o elimina un role, y esa
es otra feature, que no puede invalidar claves de `features/users`. Con el `staleTime` global de
30 s, volver a la lista en ese lapso mostraría el tipo anterior. Pedir la página de nuevo cada vez que
se abre la lista cuesta una sola petición y deja los datos guardados en pantalla mientras llega la
respuesta.

**Alternatives considered**: solo invalidar en `refreshAfterRoleChange`: no alcanza los cambios hechos
en Roles; exportar las claves de usuarios a Roles rompe el principio I. `staleTime: 0` en la lista:
equivalente al montar, pero además repetiría la consulta en cada foco de ventana; `refetchOnMount` es
más acotado.

## D6. El elemento de la lista: `PlatformUser` + los tipos de sus roles Activos

**Decision**: `schemas/user.ts` exporta el objeto DTO de `UserRead` (`platformUserDtoSchema`) y la
transformación (`toPlatformUser`), para que `schemas/userListItem.ts` defina
`userListItemSchema = platformUserDtoSchema.extend({ role_types })` con la misma transformación más
`roleTypes`. El modelo de dominio `UserListItem` es `PlatformUser & { roleTypes: readonly RoleType[] }`
(`RoleType = { id: number; name: string }`). `userPageSchema.items` pasa a `userListItemSchema`.

**Rationale**: en Zod 4 un esquema con `.transform()` ya no se puede extender; partir del objeto DTO
evita duplicar los nueve campos de `UserRead` (y que diverjan). Los componentes que hoy reciben
`PlatformUser` (búsqueda, detalle) no cambian; la tabla recibe `UserListItem`, que lo es también.

**Alternatives considered**: duplicar los campos en un esquema propio de la lista: dos fuentes de
verdad para el mismo DTO; descartado. Guardar en el dominio solo los ids (`roleTypeIds`): obligaría a
inventar un nombre para un tipo desconocido; con `{ id, name }` el respaldo es el nombre del catálogo.

## D7. Cómo se muestra el tipo: una función pura por id

**Decision**: `describeUserType(roleTypes)` en `schemas/userListItem.ts` devuelve el texto de la celda:
`[]` → «—»; solo 1 → «Sistema»; solo 2 → «Clínica»; 1 y 2 → «Sistema y Clínica». Las decisiones
usan el `id` y los textos salen de `messages.users.filters.type`; un id que el Backoffice no conoce
se muestra con el `name` que manda la API (el catálogo se edita a mano), unido con « y ».

**Rationale**: la constitución pide decidir por id, nunca por nombre, y los textos en `es.ts`; las
mismas palabras que los botones («Sistema», «Clínica») hacen evidente qué filtro muestra a quién.
Es texto plano en la celda, como el tipo de cada role en la lista de Roles de la 025.

**Alternatives considered**: un `Chip` por tipo: ruido visual en cada fila de una tabla y sin
precedente en Roles; descartado. Mostrar `name` siempre: dependería del texto del catálogo para
algo que el Backoffice ya nombra.

## D8. La tabla: columna «Tipo» y aviso de bloqueado junto al nombre

**Decision**: `UsersGrid` recibe `UserListItem` y gana la columna **Tipo** (entre «Correo electrónico»
y «Fecha de alta»; sin ordenar ni filtrar, como las demás). En la celda del nombre, un usuario que no
está activo lleva el `StatusChip` existente («Bloqueado») después del enlace, como en el resultado de
la búsqueda (FR-006, US2-3). El mensaje de la tabla vacía y su acción llegan por props.

**Rationale**: el chip ya existe, es accesible y es el que la persona ve en el detalle y en la búsqueda;
ponerlo junto al nombre lo lee el lector de pantalla con la fila. Una columna «Estatus» repetiría
«Activo» en todas las filas de la vista por omisión.

**Alternatives considered**: una columna «Estatus» solo con «Bloqueados» (columnas que aparecen y
desaparecen); un texto en la celda del tipo (mezcla dos datos); descartados.

## D9. Los filtros: `UsersFilters`, copia de `RolesFilters`, junto al buscador

**Decision**: componente nuevo `features/users/components/UsersFilters.tsx` con las mismas props,
grupos, tamaño (`size="small"`), etiquetas y manejo del `null` que `RolesFilters` y `ModulesFilters`
(FR-003, FR-015, FR-016). Textos en `messages.users.filters`, con los mismos valores que
`roles.filters`. En `UsersListPage`, los filtros van en su propia fila, justo encima de
`UserSearchForm`: el texto de ayuda bajo el campo de correo impide alinear ambos en una sola fila
(cambio hecho al implementar; se había previsto una fila compartida). Los dos grupos se reparten en
varias líneas en pantallas angostas (FR-017).

**Rationale**: el principio I prohíbe importar internos de otra feature, y la spec no obliga a
compartir componentes (Assumptions). Con esta son tres copias idénticas: el sitio natural sería
`shared/ui`, pero moverlo ahora tocaría `features/modules`, donde la 024 tiene trabajo sin integrar.

**Alternatives considered**: extraer ya `TypeStatusFilters` a `shared/ui` y usarlo en las tres
pantallas: correcto a largo plazo, pero choca con la 024; queda como seguimiento cuando la 024 esté en
`main`. Importar `RolesFilters` desde `features/roles`: viola el principio I.

## D10. Estados vacíos, carga, error y anuncios

**Decision**:

- **Vacío**: `emptyUsersMessage(type, status)` elige entre seis textos: «No hay usuarios activos»
  (hoy), «No hay usuarios activos de Sistema», «… de Clínica», «No hay usuarios bloqueados», «No hay
  usuarios bloqueados de Sistema» y «… de Clínica» (FR-013). La invitación «Crear usuario» solo
  acompaña a los vacíos de **Activos** (US2-5).
- **Carga y error**: los de hoy, en la zona de la tabla (`ErrorState` con reintento), sin tocar
  título, buscador ni filtros, que están fuera de `UsersList` (FR-013).
- **Anuncio**: el `LiveStatus` existente dice «Mostrando X a Y de Z usuarios.» y, si la tabla queda
  vacía tras cargar, el mismo texto del vacío (FR-014); no mueve el foco.
- **Página inexistente**: la corrección actual a la última página sigue igual (US3-7).

**Rationale**: reutiliza lo que ya cumple la constitución VI; solo cambian los textos y cuándo se
anuncian. Hoy el vacío no se anuncia porque solo ocurría con cero usuarios activos; con filtros es
frecuente y sin anuncio el lector de pantalla no sabría qué pasó tras pulsar un botón.

## D11. El simulador MSW habla la 5.5.0

**Decision**: el manejador `GET /api/v1/users` de `test/handlers/usersDirectory` valida `status_id`
(1 o 2, por omisión 1) y `role_type_id` (1 o 2, opcional) con 422 y el mismo formato de errores que
ya usa para `page`, y responde con `model.listUsers(page, pageSize, { statusId, roleTypeId })`, que
calcula `role_types` con la regla de la API (tipos distintos de los roles **Activos**, ordenados por
`id`) y nunca devuelve Eliminados. `listActiveUsers` se sustituye. `test/factories.ts` añade
`userListItemDto()` (con `role_types: []`) y `userPageDto` y `userPageDtoOf` lo usan.

**Rationale**: la constitución VII pide probar contra MSW, no mockear `fetch`; el modelo ya guarda los
roles de cada usuario con su tipo y su estatus, así que la regla cabe en una función.

## D12. Pruebas y e2e

**Decision**: pruebas unitarias de `usersLocation` (modos, valores no válidos, enlaces antiguos),
`describeUserType`, `emptyUsersMessage`, `userListItemSchema`/`userPageSchema` (incluido el rechazo
sin `role_types`), `userKeys`, `listUsers` (parámetros enviados) y `useUsersPage`; de componentes
para `UsersFilters` (un botón siempre pulsado, teclado, axe) y `UsersGrid` (columna, chip); de
integración en `src/app/router/users/` (filtrar, combinar, volver desde el detalle, buscar con
filtros, enlaces antiguos) y la prueba e2e `e2e/users.spec.ts` ampliada (se ejecuta solo con cuentas
de prueba). En esta máquina: `--maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`.

## D13. `UsersListPage` se divide antes de crecer

**Decision**: `UsersList` (la zona de la tabla: consulta, corrección de página, vacío, error y
anuncio) sale de `UsersListPage.tsx` (196 líneas hoy) a `components/UsersList.tsx`, y recibe los
filtros. Los textos del vacío se eligen con `emptyUsersMessage(type, status)` en
`schemas/usersLocation.ts`, una función pura que se prueba sola.

**Rationale**: la constitución I pide dividir los componentes de más de 250 líneas; los filtros, la
fila de filtros y buscador y los vacíos por combinación harían crecer el archivo por encima de ese
límite. Separar la zona de la tabla de la página deja a cada uno con una sola responsabilidad.

## Seguimientos fuera de esta feature

- Extraer el par de grupos Tipo/Estatus a `shared/ui` y usarlo en Módulos, Roles y Usuarios cuando la
  024 esté integrada (D9).
- El contrato `specs/002-manage-users/contracts/users-service.md` sigue describiendo U1 sin filtros; el
  de esta feature lo amplía y es el que manda para U1 a partir de la 026.
