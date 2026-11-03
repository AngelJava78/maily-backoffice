# Research: Lista de roles con filtros de Tipo y Estatus, y bloqueo de roles

**Feature**: `025-roles-type-status-filters` | **Date**: 2026-11-02 | **Plan**: [plan.md](plan.md)

Decisiones tomadas al planear, cada una con su razón y las alternativas descartadas. Los hechos de la
API se leyeron en el código de `mailySoft-usuarios` (commit `2e17ecb`, versión 5.4.0) el 2026-11-02.

## D1 — La API ya ofrece todo lo necesario, desde antes de la 5.4.0

**Decision**: no se pide ningún cambio a la API de usuarios. Se usan:

- `GET /api/v1/roles` con `status_id` opcional (`1` Activo por omisión, `2` Bloqueado; otro valor →
  422). Devuelve los roles de **ambos tipos**, ordenados por nombre sin distinguir mayúsculas.
- `POST /api/v1/roles/{id}/block` y `POST /api/v1/roles/{id}/unblock` (permiso `roles:update`): 200
  con el role en su nuevo estatus; 409 `role_already_blocked` / `role_already_active`; 404
  `role_not_found` si no existe, está eliminado o tiene otro estatus.
- Para un role bloqueado, `GET /roles/{id}/permissions`, `PATCH`/`DELETE /roles/{id}` y las
  asociaciones de permisos responden 404 `role_not_found`.

**Rationale**: `block`/`unblock` existen desde el primer commit de la API (`f6b2208`, 2026-10-15) y el
filtro `status_id` desde su spec 013 (`0ba6335`, 2026-10-23), que el Backoffice ya exige desde su
feature 013. Así que esta feature **no depende de la 5.4.0** ni de la feature 024.

**Alternatives considered**: pedir a la API un filtro por tipo (`type_id`) en la lista: innecesario,
porque la lista no se pagina (decenas de roles) y filtrar por tipo en el cliente es exacto (D3).

## D2 — Los filtros viven en la dirección con el parámetro `type` de siempre y uno nuevo, `status`

**Decision**: la dirección de `/roles` pasa de `type` + `roleId` a `type` + `status` + `roleId`:

| Estado | Parámetro | Valores | Por omisión (se omite) |
|---|---|---|---|
| Tipo | `type` | `sistema`, `clinica` | Todos |
| Estatus | `status` | `bloqueados` | Activos |
| Role elegido | `roleId` | entero ≥ 1 sin ceros a la izquierda | ninguno |

Un valor no válido se sustituye por el de omisión y la dirección se reescribe con `replace` (el mismo
efecto de canonización que ya tiene `useRolePermissionsLocation`). Dentro del código los valores son
`'all' | 'system' | 'clinic'` y `'active' | 'blocked'` (identificadores en inglés, constitución I);
solo la conversión a la dirección conoce `sistema`, `clinica` y `bloqueados`.

**Rationale**: FR-009 pide que los enlaces anteriores (`?type=clinica`, `?type=sistema`) sigan
abriendo el tipo pedido. Con el mismo parámetro y los mismos valores, esos enlaces **no son
antiguos**: son la forma canónica, sin código de migración. El único cambio de significado es la
dirección sin `type`, que antes abría Clínica y ahora abre Todos (lo pide FR-004 y lo asume el spec).

**Alternatives considered**: los parámetros de Módulos (`type_id=1|2`, `status_id=2`). Habrían
unificado las dos pantallas, pero convertían cada enlace guardado en uno antiguo que hay que leer y
reescribir, con un caso más para probar (ambos parámetros a la vez). Se descarta.

## D3 — Una consulta por estatus; el tipo se filtra en el cliente

**Decision**: `roleKeys.list(status)` = `['roles', 'list', status]`, con `useRolesCatalog(status)` que
llama a `GET /roles` (sin parámetro para Activos, con `status_id=2` para Bloqueados). El filtro de
tipo es una función pura (`rolesOfType`) sobre la lista del estatus elegido. Toda mutación que cambia
la lista invalida el prefijo `roleKeys.lists()` (ambos estatus), sin `exact`.

**Rationale**: la API no filtra por tipo y la lista no se pagina; un cambio de Tipo no repite la
consulta y un cambio de Estatus la hace una vez (luego queda en caché). Pedir Activos **sin**
`status_id` deja la petición idéntica a la de antes (la que también usa la sección de Usuarios),
así que nada más cambia. El orden por nombre lo da la API (Assumption del spec: una sola lista
ordenada por nombre, sin grupos).

**Alternatives considered**: una sola consulta de «todos los estatus»: la API no la ofrece. Ordenar en
el cliente: innecesario, la API ya ordena igual que el simulador.

## D4 — Qué detalle se muestra: activo, bloqueado, desaparecido o ninguno

**Decision**: `RolesPage` decide qué hay a la derecha con una función pura, `detailOf(...)`:

1. Sin `roleId` → mensaje de elegir un role.
2. La lista del estatus aún carga → indicador de carga.
3. El role está en la lista **filtrada** → con Activos, `RoleDetailPanel` (sin cambios de
   comportamiento, FR-019); con Bloqueados, `BlockedRoleDetail` (FR-012).
4. El role **ya se había mostrado** abierto y desapareció de la lista (otra sesión lo eliminó o lo
   bloqueó) → `RoleDetailPanel`, que conserva su manejo de «no encontrado» (edge case del spec).
5. Cualquier otro caso (la dirección pide un role que el filtro no muestra, o la lista falló) →
   mensaje de elegir un role, sin error (FR-011).

«Ya se había mostrado» es estado derivado con el patrón de React de ajustar el estado durante el
render (`useState` del último `roleId` visible, actualizado cuando cambia), sin efectos ni refs
escritas en el render (constitución I).

**Rationale**: FR-011 (un role que el filtro no muestra no se abre) y el edge case de «no encontrado»
piden respuestas distintas para el mismo dato («el role no está en la lista»); solo la historia de la
pantalla las distingue. Sin el punto 4, un role eliminado por otra sesión mientras se edita haría
desaparecer el formulario y su aviso de error para mostrar «elige un role».

**Alternatives considered**: mostrar «no encontrado» siempre que el role no esté en la lista (rompe
FR-011: el ejemplo del spec es un role bloqueado pedido con «Activos»); pedir la lista del otro
estatus para averiguar dónde está el role (una consulta más solo para elegir un texto).

## D5 — Un role bloqueado tiene su propio detalle, que no consulta nada

**Decision**: `BlockedRoleDetail` recibe el role de la lista de Bloqueados y muestra nombre,
descripción (si tiene), tipo y estatus «Bloqueado», más un `Alert` informativo con la explicación de
FR-012 y, a quien puede editar roles, «Desbloquear role». No llama a `useRoleDetail` ni a los
catálogos de permisos o módulos, y la lista no pide el contador de permisos de los bloqueados
(`useRolePermissionCounts` recibe una lista vacía con Bloqueados).

**Rationale**: la API responde 404 a todo lo que haría falta para mostrar permisos (D1); FR-012 exige
no consultarlo ni mostrar un error, y SC-004 que nunca se vea una lista de permisos vacía. Un
componente aparte evita meter ramas de «bloqueado» en `RoleDetailPanel` (245 líneas, FR-019).

**Alternatives considered**: reutilizar `RoleDetailPanel` en solo lectura: imposible sin los permisos,
y lo complicaría para un caso que no comparte casi nada con él.

## D6 — Bloquear y desbloquear: una mutación, una acción con avisos, una confirmación solo al bloquear

**Decision**:

- `rolesApi`: `blockRole` y `unblockRole` (`POST …/block|unblock`, respuesta validada con
  `roleSchema`).
- `useChangeRoleStatus()`: `useMutation` con `{ roleId, action: 'block' | 'unblock' }`, sin
  actualización optimista (constitución III/IV), que en `onSettled` invalida `roleKeys.lists()` con
  `atMost(REFRESH_WAIT_MS, …)`, igual que `useDeleteRole`: el aviso y el cierre del detalle llegan
  cuando la lista ya se actualizó, así que el role aparece enseguida en el otro estatus (SC-005).
- `useChangeRoleStatusAction(role, action, onChanged)`: aplica los avisos de FR-015/FR-016. Éxito →
  aviso de éxito que nombra el role y dice dónde está ahora, y `onChanged()`. 409
  `role_already_blocked`/`role_already_active` → aviso **informativo** («ya estaba…») y
  `onChanged()` (la lista ya se actualizó). Cualquier otra falla → aviso de error con el texto de
  `describeRoleError`, sin cerrar nada (se puede reintentar).
- `describeRoleError` gana el resultado `alreadyInStatus` para esos dos códigos; el texto lo arma la
  acción, porque necesita el nombre del role.
- «Bloquear role» (`BlockRoleAction`): botón y `ConfirmDialog` con `tone="danger"`, título y cuerpo
  que nombran el role y explican las consecuencias (FR-013, constitución VI). Deshabilitado mientras
  hay cambios sin guardar o un guardado en curso; mientras bloquea, el diálogo no se puede cerrar y su
  botón muestra que trabaja (FR-016).
- «Desbloquear role» (en `BlockedRoleDetail`): inmediato, sin confirmación, con `loading` y
  deshabilitado mientras trabaja.
- Ambos los ve solo quien tiene `canEdit` (`roles:update`): no se añade una capacidad nueva porque la
  API pide exactamente ese permiso (Assumption del spec).

**Rationale**: es el mismo esquema de `useDeleteRole`/`useDeleteRoleAction` y de
`useChangeModuleStatus` en Módulos, ya probado. Bloquear no puede chocar con la guarda de cambios sin
guardar: la acción no está disponible mientras hay cambios (FR-013), así que cerrar el detalle tras
bloquear nunca la dispara (punto abierto del checklist del spec).

**Alternatives considered**: una capacidad `canBlock` aparte en el módulo de políticas: el spec dice
«quien puede editar roles» y la API pide `roles:update`; añadirla tocaría `features/auth` y los
dobles de capacidades sin cambiar nada. Desbloquear con confirmación: el spec la descarta (devuelve el
estado anterior y se deshace bloqueando).

## D7 — Foco tras bloquear o desbloquear: al título de la pantalla

**Decision**: tras un cambio de estatus (éxito o «ya estaba»), `RolesPage` cierra el detalle y pide
llevar el foco al título (`h1`, que ya tiene `tabIndex={-1}`). La petición es una ref booleana que un
efecto sin dependencias consume después del commit en el que el detalle se desmonta.

**Rationale**: US5-3 pide devolver el foco al control que abrió la confirmación o, si ya no existe, al
título. Tras bloquear, el botón desaparece con el detalle. MUI devuelve el foco al botón al cerrar el
diálogo, pero en ese commit el botón ya no está en el documento; los efectos de montaje de React
corren después de las limpiezas de desmontaje (donde MUI restaura el foco), así que el efecto de
`RolesPage` es el último en mover el foco. Mover el foco es sincronizar con el DOM, un uso legítimo de
`useEffect` (constitución I). Al cancelar la confirmación, el botón sigue y MUI le devuelve el foco.

**Alternatives considered**: `setTimeout(0)` tras la navegación: depende del orden entre el
planificador de React y los temporizadores. Enfocar el título en el mismo manejador: la trampa de foco
del diálogo, aún abierto, lo devolvería al diálogo.

## D8 — Los filtros son un componente propio de Roles con las mismas props que los de Módulos

**Decision**: `RolesFilters` repite la estructura de `ModulesFilters` (dos `Stack` con la etiqueta
`body2`/`text.secondary` encima de un `ToggleButtonGroup` `exclusive`, `size="small"`, con
`aria-label` igual a la etiqueta; ignora el `null` de MUI para que siempre haya un botón pulsado),
sin el buscador. Los textos van en `messages.roles.filters`, con los mismos valores que
`messages.modules.filters`.

**Rationale**: FR-020/SC-011 piden un aspecto idéntico; con los mismos componentes de MUI, las mismas
props y el mismo theme, lo es por construcción. Una feature no puede importar los internos de otra
(constitución I) y mover `ModulesFilters` a `shared/ui` tocaría `features/modules`, que la feature 024
está cambiando en paralelo. MUI 9.5.0 da al grupo tabindex móvil (hallazgo de la 023): Tab entra al
grupo y las flechas mueven entre botones, como pide US5-1, y cada botón expone `aria-pressed`.

**Alternatives considered**: extraer un `FilterToggleGroup` a `shared/ui` para ambas pantallas: buena
idea para después de fusionar la 024 (queda como posible mejora), no ahora.

## D9 — `RoleDetailPanel` debe seguir por debajo de 250 líneas

**Decision**: se extrae la sección de permisos (título `h2`, error con reintento, carga y
`PermissionsList`) a `RolePermissionsSection`, un componente de presentación sin estado, y
`RoleDetailActions` acepta `children` para la acción nueva, que se pinta antes de «Eliminar role».
`RoleDetailPanel` solo gana la prop `onBlocked` y el `BlockRoleAction` dentro de sus acciones.

**Rationale**: el archivo está en 245 líneas (constitución I: más de 250 se divide). La sección de
permisos es el bloque más autocontenido; moverla no cambia nada de lo que ve o hace la persona
(FR-019), y las pruebas de la 023 la siguen cubriendo por sus nombres accesibles.

**Alternatives considered**: sacar el guardado (`onSave`) a un hook: toca la lógica de la 023 y su
manejo de errores por campo; más riesgo para el mismo resultado.

## D10 — El simulador MSW aprende los estatus de roles

**Decision**: en `src/test/handlers/usersDirectory`, el modelo gana `listRolesWithStatus(statusId)`,
`blockRole(id)` y `unblockRole(id)` con las reglas de D1 (404 si no existe, está eliminado o tiene
otro estatus; 409 si ya está en el estatus pedido), y `GET /roles` lee `status_id` (ausente → 1;
`1`/`2`; cualquier otro valor → 422 `validation_error`). Los manejadores
`POST /roles/:id/block|unblock` (permiso `roles:update`) van con los demás de roles en
`src/test/handlers/rolesCatalog/roles.ts`. La semilla no cambia: las pruebas bloquean roles con
`setRoleStatus` o con las operaciones nuevas.

**Rationale**: constitución VII (simular a nivel de red). `rolesCatalog` ya delega en el modelo del
directorio («una sola fuente de verdad de qué roles existen»), y las reglas de 404 para roles no
activos (permisos, PATCH, DELETE) ya están implementadas.

**Alternatives considered**: un simulador de roles separado: duplicaría el estado de los roles.

## D11 — Enmienda PATCH de la constitución (1.7.0 → 1.7.1)

**Decision**: en el Principio VI, «lista maestro-detalle en una sola pantalla, con pestañas por tipo
(Clínica/Sistema)» pasa a «lista maestro-detalle en una sola pantalla, filtrada por tipo y estatus».
Versión 1.7.1, «Last Amended» 2026-11-02.

**Rationale**: el spec lo deja para el plan. Es una corrección de redacción de la variante ya
aprobada (la pantalla sigue siendo maestro-detalle en una sola ruta), no un principio nuevo ni una
redefinición: PATCH según la gobernanza. La aprobación del responsable llega con el PR.

**Alternatives considered**: registrarlo como desviación en Complexity Tracking: es permanente, así
que la gobernanza pide enmienda.

## D12 — Lo que no cambia

- `features/auth` (capacidades), las rutas y el menú: sin cambios.
- La creación, la edición del nombre y la descripción, la eliminación de roles activos, la lista de
  permisos con botones y el duplicado (FR-019, FR-023).
- La sección de Usuarios sigue pidiendo `GET /roles` sin parámetros (solo roles activos): un role
  bloqueado no se puede asignar, como antes.
- Los textos sin uso `roles.list.clinicaDescription`/`sistemaDescription` se dejan como están (no los
  toca esta feature).
- Bloquear el propio role de la persona (p. ej. su único role de Sistema) le quitaría el acceso; la
  API no lo impide y el spec no lo trata, igual que con eliminar. Queda fuera de alcance.
