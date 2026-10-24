# Data Model: Permisos de Módulos de Sistema para Roles de Clínica (Backoffice)

Diferencia con el modelo vigente de la spec
[`014-roles-permisos`](../014-roles-permisos/data-model.md). Ninguna entidad ni tipo nuevo:
`PermissionMatrix`, `PermissionMatrixRow`, `Module`, `ModuleType` siguen siendo exactamente los
mismos tipos que ya describe esa spec (secciones `Module` y `PermissionMatrix`). Lo único que cambia
es **de qué catálogo de módulos se construye** la matriz de un role de Clínica y **cómo se agrupan
sus filas en la tabla** — ninguno de los dos es un cambio de tipo (ver [research.md](research.md),
R1 y R3).

## `PermissionMatrix` — construcción para un role de Clínica (cambia; `useRolePermissionMatrix.ts`)

Antes de esta feature (spec `014`, research D3): `buildPermissionMatrix(modules, permissions,
grantedPermissionIds, roleTypeId)` se llamaba una sola vez, con el catálogo de un único
`GET /modules?type_id={roleTypeId}` — el mismo `roleTypeId` que el role.

Después de esta feature, `GET /modules?type_id=1` y `GET /modules?type_id=2` se piden **siempre
los dos**, sin importar `role.type.id` (research R2: `RoleDetailPanel` no se remonta al cambiar de
role, así que el número de Hooks llamados no puede depender de su tipo); lo que cambia es cuál(es)
resultado(s) usa y cuántas veces llama a `buildPermissionMatrix`:

| `role.type.id` | Catálogos de módulos usados | Llamadas a `buildPermissionMatrix` | Resultado |
|---|---|---|---|
| 1 (Sistema) | Solo el de `type_id=1` (el de `type_id=2` se pide pero se descarta) | Una, con `roleTypeId=1` | Igual que hoy: solo filas de Sistema. |
| 2 (Clínica) | Los dos | Dos: `roleTypeId=2` y `roleTypeId=1` | Filas de Clínica seguidas de las de Sistema, concatenadas en un único `PermissionMatrix` plano. |

`PermissionMatrixRow` no cambia de forma: sigue siendo `{ module: Module; cells: ... }`, y
`module.type` (ya presente, `{id, name}`) es lo único que la presentación necesita para saber a qué
grupo pertenece cada fila — no se agrega un campo `group`/`section` al tipo.

## Agrupamiento visual (nuevo; solo en `PermissionsMatrix.tsx`, no es un tipo de datos)

No es una entidad: es una regla de presentación sobre el `PermissionMatrix` ya construido.

- Si todas las filas tienen el mismo `module.type.id` (el caso de un role de Sistema, siempre; el de
  un role de Clínica tal como se veía antes de esta feature): la tabla se renderiza igual que hoy,
  sin ningún encabezado de grupo (FR-005 de [spec.md](spec.md)).
- Si hay más de un `module.type.id` distinto entre las filas (el caso de un role de Clínica después
  de esta feature): antes de las filas de cada tipo se inserta una fila de encabezado (una celda con
  `colSpan` sobre todas las columnas), con el texto "Módulos de {`module.type.name`}", tomando
  `type.name` tal cual lo da el catálogo — no dos literales "Sistema"/"Clínica" fijos por separado
  (FR-004). El orden de los grupos es el mismo que entrega `useRolePermissionMatrix` (Clínica
  primero, Sistema después, ver tabla arriba).

## `countGranted` / `countTotal` (sin cambios de firma)

Ambas (`src/features/roles/schemas/permissionMatrix.ts`) ya suman sobre el array plano completo de
`PermissionMatrix`, sin distinguir módulos por tipo; al recibir, para un role de Clínica, un array
que ahora incluye también las filas de Sistema, su resultado crece para cubrirlas sin que su código
cambie (FR-007 de [spec.md](spec.md)).

## `useEditablePermissionMatrix`, "Copiar permisos de", "Duplicar" (sin cambios)

Los tres ya operan de forma genérica sobre "lo que haya en la matriz" (`toggle`/`toggleAll` por
`moduleId`; copiar/duplicar reenvía cada `permissionId` ya asociado al role de origen) sin conocer
el tipo de módulo de cada fila; heredan el comportamiento nuevo sin que su código cambie (FR-008 de
[spec.md](spec.md)).

## Documentación existente a corregir (no es un cambio de datos, pero queda desactualizada)

- `src/shared/messages/es.ts`, `messages.roles.detail.matrixHelper`: el texto visible en pantalla
  (es también el `aria-label` de la tabla) dice hoy "...Solo aparecen los módulos del tipo de este
  role.", falso para un role de Clínica después de esta feature; se corrige en el mismo cambio que
  agrega el mensaje nuevo del encabezado de grupo.
- `specs/014-roles-permisos/spec.md`, FR-006: pasa de la regla simétrica a la asimétrica (FR-003 de
  [spec.md](spec.md) de esta feature).
- `specs/014-roles-permisos/data-model.md`, sección `Module` (fila `type`): dice hoy "La matriz de
  un rol solo incluye módulos cuyo `type.id` sea igual al `type.id` del rol (FR-006)" — queda
  incompleta para un role de Clínica y se corrige junto con el FR-006 que cita.
- `specs/014-roles-permisos/data-model.md`, sección `RolePermission`, nota sobre
  `role_permission_module_type_conflict`: sigue siendo cierta en espíritu ("la matriz ya solo ofrece
  módulos del tipo correcto"), pero "del tipo correcto" pasa a significar "de un tipo permitido para
  ese role" en vez de "del mismo tipo que el role"; se precisa en el mismo cambio.

## Estados y transiciones

Sin cambios: ni `Role` ni `Module` ganan un estado o transición nuevos; lo único nuevo es qué filas
arma la matriz y cómo se presentan, no el ciclo de vida de ninguna entidad.
