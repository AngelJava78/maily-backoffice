# Research: Permisos de Módulos de Sistema para Roles de Clínica (Backoffice)

## R1 — `buildPermissionMatrix` no cambia; se invoca dos veces para un role de Clínica

**Decision**: `buildPermissionMatrix(modules, permissions, grantedPermissionIds, roleTypeId)`
(`src/features/roles/schemas/permissionMatrix.ts`) sigue filtrando `modules` por un único
`candidate.type.id === roleTypeId`, exactamente como hoy. Para un role de tipo Sistema,
`useRolePermissionMatrix` la invoca una sola vez (`roleTypeId = 1`), sin cambios. Para un role de
tipo Clínica, la invoca dos veces — una con `roleTypeId = 2` (sus propios módulos) y otra con
`roleTypeId = 1` (los de Sistema que ahora también puede recibir) — y concatena las dos listas de
filas resultantes (Clínica primero, Sistema después) en un único `PermissionMatrix` plano, el mismo
tipo que ya devolvía antes de esta feature.

**Rationale**: `buildPermissionMatrix` y sus pruebas (`permissionMatrix.test.ts`, en particular
"includes only modules of roleTypeId, ordered by sortOrder then name") documentan y verifican
exactamente el comportamiento de un único tipo que se sigue necesitando sin cambios para el caso
Sistema y para cada uno de los dos grupos del caso Clínica; no hay que enseñarle a filtrar "uno o
dos tipos a la vez" para lograrlo, solo invocarla más de una vez. Cumple el Principio I (sin
abstracciones especulativas): generalizar la función para N tipos sería resolver un problema que
esta feature no tiene (solo existen dos tipos y la combinación permitida es una sola, fija).

**Alternatives considered**: Modificar `buildPermissionMatrix` para aceptar un array de
`roleTypeId` (`[1, 2]`) y filtrar por "módulo cuyo tipo esté en la lista" — rechazada: cambia la
firma de una función con pruebas unitarias ya verdes y round-trip de módulo→rol que no necesita
generalizarse (hoy la combinación permitida es, como mucho, "mi propio tipo + Sistema", nunca una
lista arbitraria); además perdería el orden "Clínica primero, Sistema después" que pide FR-004 de
[spec.md](spec.md) sin una lógica de agrupamiento adicional de todos modos.

## R2 — Catálogo de módulos: siempre se piden los dos tipos; `typeId` decide cuáles se usan

**Decision**: `useModulesCatalog(typeId)` (`src/features/roles/hooks/useModulesCatalog.ts`) no
cambia de forma ni de firma. Dentro de `useRolePermissionMatrix`, **ambas** llamadas —
`useModulesCatalog(1)` y `useModulesCatalog(2)` — se hacen siempre, en cada render, sin importar el
`typeId` recibido; lo que cambia según `typeId` es solo qué resultado(s) se usan para construir la
matriz (R1), nunca cuántos Hooks se llaman. Esto no es opcional: `RoleDetailPanel` no desmonta su
`<RoleDetailPanel>` al cambiar de role (`RolesPage.tsx` lo renderiza sin `key={roleId}`), así que
`role?.type.id` puede cambiar de 1 a 2 entre dos renders de la misma instancia montada — llamar a
`useModulesCatalog` un número distinto de veces según `typeId` violaría las Reglas de los Hooks
(Principio I) en ese caso real, no solo en abstracto.

**Rationale**: con las reglas de los Hooks, la única forma correcta de que el número de llamadas no
dependa de `typeId` es llamar siempre a las mismas, y decidir con lógica plana (no con Hooks
condicionales) cuáles importan. El costo es una petición de más, siempre, incluso para un role de
Sistema que nunca usará el catálogo de Clínica — pero los catálogos de módulos son pequeños (hoy, 4
de Sistema en el entorno real; decenas como mucho) y ya se cachean 5 minutos por tipo
(`CATALOG_STALE_TIME_MS`, `modulesCatalogKeys.byType(typeId)`); no vale la pena una opción `enabled`
nueva ni restructurar `RolesPage` para forzar un remount por `roleId` (cambiaría foco/scroll de forma
no relacionada con esta feature) solo para ahorrar esa petición.

**Alternatives considered**: Agregar `key={roleId}` a `<RoleDetailPanel>` en `RolesPage.tsx` para
poder llamar a los Hooks condicionalmente dentro de una instancia que sí se remonta por role —
rechazada: cambia el comportamiento de montaje/desmontaje de todo el panel (foco, estado local,
animaciones) por una razón ajena a esta feature. Una opción `enabled: typeId === 2` en una segunda
llamada condicional, o una función `useModulesCatalogs(typeIds)` nueva — rechazadas por Principio I
(abstracción sin necesidad demostrada) y porque de todos modos no evitan el problema real: las dos
llamadas ya son incondicionales por las Reglas de los Hooks, así que una opción `enabled` solo
evitaría la petición de red, no la llamada al Hook en sí.

## R3 — El agrupamiento es solo de presentación; sin cambio de modelo de datos

**Decision**: `PermissionMatrix` sigue siendo `readonly PermissionMatrixRow[]` (plano, sin concepto
de "grupo" en el tipo). `PermissionsMatrix.tsx` decide si hay más de un `module.type.id` distinto
entre las filas que recibió; si los hay, inserta una fila de encabezado (`TableRow` con una celda
`colSpan` sobre todas las columnas) antes de las filas de cada tipo, usando el propio
`module.type.name` del catálogo (p. ej. "Sistema", "Clínica") en un texto genérico ("Módulos de
{nombre del tipo}", un solo mensaje nuevo en `shared/messages/es.ts`, no dos literales por tipo). Si
solo hay un tipo presente (el caso de un role de Sistema, y el de cualquier role antes de esta
feature), no se inserta ningún encabezado: la tabla se ve exactamente igual que hoy (FR-005).

**Rationale**: `PermissionMatrixRow.module.type` (`{id, name}`) ya viaja en cada fila desde la spec
`013`; agrupar en la capa de presentación, a partir de un dato que ya existe, evita cualquier cambio
a `useEditablePermissionMatrix` (`toggle`/`toggleAll`/`diff`/`reset` ya operan por `moduleId`, sin
conocer el tipo del módulo de cada fila) y a `RoleDetailPanel` (`countGranted`/`countTotal` siguen
sumando sobre el array plano completo, como pide FR-007 de [spec.md](spec.md)). Usar el nombre del
tipo tal como lo da el catálogo, en vez de un texto fijo "Sistema"/"Clínica" por separado, evita
duplicar en el cliente un nombre que el backend ya administra (consistente con que los tipos de
módulo son catálogo, no un enum del frontend).

**Alternatives considered**: Cambiar el tipo `PermissionMatrix` a una lista de secciones
(`{ type: ModuleType; rows: PermissionMatrixRow[] }[]`) — rechazada: habría propagado el cambio a
`useEditablePermissionMatrix`, a `countGranted`/`countTotal` y a cada prueba que ya construye un
`PermissionMatrix` plano a mano, para un problema que la presentación sola resuelve sin tocar
ninguno de ellos (Principio I).

## R4 — Sin cambios de contrato de API; no se crea `contracts/` para esta feature

**Decision**: Esta feature no agrega, quita ni modifica ningún endpoint, payload o esquema de
respuesta. El backend (`mailySoft-usuarios`) ya acepta asociar un permiso de un módulo de Sistema a
un role de Clínica desde su propia spec `015` (verificado ahí: la tabla de pares rol-módulo
permitidos ya incluye (Clínica, Sistema), sin ningún cambio en `POST /roles/{role_id}/permissions`
ni en ningún otro endpoint). El contrato consumido documentado en
[`specs/014-roles-permisos/contracts/roles-service.md`](../014-roles-permisos/contracts/roles-service.md)
sigue describiendo exactamente lo que el Backoffice consume; esta feature no crea una carpeta
`contracts/` propia porque no hay nada nuevo que documentar ahí.

**Rationale**: Principio IV (contratos documentados en `specs/<feature>/contracts/` como fuente de
verdad) — documentar un contrato que no cambió, por segunda vez, en una carpeta nueva, dejaría dos
documentos a sincronizar manualmente ante cualquier cambio futuro real de ese endpoint.

**Alternatives considered**: Copiar `roles-service.md` a esta spec para "dejar constancia" — rechazada
por la misma razón (duplicación sin necesidad; el repo ya tiene el precedente de referenciar, no
copiar, cuando dos specs comparten un contrato sin cambios).

## R5 — Qué pruebas existentes quedan desactualizadas o incompletas

**Decision**: Dos pruebas de `useRolePermissionMatrix.test.ts` verifican hoy, de forma indirecta, la
regla **simétrica**, y una de ellas queda francamente falsa (no solo incompleta) en cuanto se
implemente R1/R2:

- `'is empty for a type with no modules yet (Clínica, in the real local environment)'`
  (`useRolePermissionMatrix(2, new Set())` contra `rolesCatalogScenario()`, hoy espera
  `matrix: []`): deja de ser cierta — con R1/R2 ese mismo caso devuelve las filas de los 4 módulos de
  Sistema (`rolesCatalogScenario()` ya los trae), no un array vacío. Se reescribe para esperar esas
  4 filas, no se complementa con un caso nuevo aparte.
- `'builds a rich Clínica matrix when those modules exist'`
  (`useRolePermissionMatrix(2, new Set())` contra `richClinicModulesScenario()`, hoy espera
  `matrix?.length` igual a 3): pasa a ser incompleta, no falsa (3 sigue siendo el número de módulos
  de Clínica), pero deja de representar el resultado real de llamar a esta función — con R1/R2 el
  resultado tiene longitud 7 (3 de Clínica + 4 de Sistema, `richClinicModulesScenario()` ya combina
  ambos). Se actualiza la aserción de longitud y se añade una comprobación de que también incluye,
  por ejemplo, la fila `users`.
- `src/features/roles/components/PermissionsMatrix.test.tsx`: necesita un caso nuevo que verifique
  el encabezado de grupo cuando la matriz mezcla tipos, y uno que confirme que no aparece ningún
  encabezado cuando todas las filas son del mismo tipo (no regresión de FR-005); ninguno de los
  casos existentes hoy construye una matriz con más de un tipo de módulo a la vez.

`src/test/handlers/rolesCatalog/seed.ts` (simulador MSW, D8 de la spec `014`) **no** se toca:
`richClinicModulesScenario()` ya combina los 4 módulos de Sistema con sus 3 de Clínica
(`modules: [...base.modules, ...clinicModules]`) — exactamente la mezcla que esta feature necesita
para probar R1/R2, sembrada desde antes de esta spec. `buildPermissionMatrix`
(`permissionMatrix.test.ts`) tampoco se toca (R1): sigue probando, sin cambios, una función que no
cambia.

**Rationale**: sin precisar cuál de las dos pruebas del hook pasa a ser **falsa** (no solo
incompleta), `/speckit-tasks` podría limitarse a "agregar un caso nuevo" y dejar en verde, por
engaño, una prueba que ya no describe lo que la función hace — el mismo riesgo que la spec `015` del
backend documentó en su propia R3 para sus pruebas de servicio/contrato.
