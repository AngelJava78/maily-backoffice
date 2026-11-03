# Contrato de rutas: Roles y permisos

**Feature**: `027-roles-grid-list` | **Plan**: [../plan.md](../plan.md)

Las direcciones de la sección, qué escribe cada navegación en el historial y cómo se tratan los
enlaces anteriores a esta feature. Las pruebas de integración (`renderApp`) y los e2e abren estas
direcciones.

## 1. Rutas

Las dos van bajo la guarda `RequirePermission resource="roles"` (`roles:read`) y cada una con su
`ErrorBoundary`, como el resto de las secciones (`src/app/router/routes.tsx`).

| Dirección | Pantalla | `handle` | Título de la pestaña |
|---|---|---|---|
| `/roles` | tabla (`RolesRoute` → `RolesPage`) | `{ titleKey: 'roles' }` | Roles y permisos — MailySoft Backoffice |
| `/roles/:roleId` | detalle (`RoleDetailRoute` → `RoleDetailPage`) | `{ titleKey: 'roleDetail', roleIdParam: 'roleId' }` | Detalle del role — MailySoft Backoffice |
| `/roles/abc`, `/roles/007`, `/roles/0` | `NotFoundPage` (id no válido) | el mismo | Página no encontrada — MailySoft Backoffice |

- `:roleId` es válido si cumple `^[1-9]\d{0,9}$` (`parseRoleId`, exportado por `features/roles`).
- Las dos rutas calculan las capacidades con `getRoleCapabilities(useGrantedAccess())` en `app` y se
  las entregan a la pantalla (la feature `roles` no conoce `auth`), igual que antes.
- El menú resalta «Roles y permisos» en las dos (`NavLink` sin `end`).
- Cambiar de `/roles` a `/roles/7` y viceversa cambia el `pathname`: el foco va al `h1` de la
  pantalla nueva. Cambiar solo la query (página, tamaño o filtro) deja el foco donde estaba.

## 2. La dirección de la tabla

| Parámetro | Valores | Por omisión (se omite) |
|---|---|---|
| `type` | `sistema`, `clinica` | Todos |
| `status` | `bloqueados` | Activos |
| `page` | entero ≥ 1 sin ceros a la izquierda | 1 |
| `page_size` | `10`, `25`, `50` | 10 |

| Dirección | Tipo | Estatus | Página | Tamaño |
|---|---|---|---|---|
| `/roles` | Todos | Activos | 1 | 10 |
| `/roles?type=sistema` | Sistema | Activos | 1 | 10 |
| `/roles?type=clinica&page=2` | Clínica | Activos | 2 | 10 |
| `/roles?status=bloqueados&page_size=25` | Todos | Bloqueados | 1 | 25 |
| `/roles?type=xyz&status=otro&page=0&page_size=7` | → se reescribe a `/roles` (con `replace`) | | | |
| `/roles?page=9` con 7 roles | → se corrige a la última página (con `replace`) | | | |

Elegir un filtro o un tamaño de página escribe la dirección (entrada nueva en el historial, para
Atrás) y pone `page` en 1; cambiar de página escribe la dirección con la página nueva. La forma
canónica no contiene nunca `roleId`.

## 3. Enlaces anteriores a esta feature (FR-019, SC-005)

| Dirección guardada | Resultado |
|---|---|
| `/roles?type=sistema`, `/roles?type=clinica`, `/roles?status=bloqueados` | la tabla con esos filtros (ya son la forma canónica; no hay migración) |
| `/roles?roleId=7` | redirección con `replace` a `/roles/7`, sin `state` (una `listSearch` vacía equivale a ninguna: «Volver al listado» lleva a `/roles`) |
| `/roles?type=clinica&status=bloqueados&roleId=8` | `/roles/8` con `state: { listSearch: '?type=clinica&status=bloqueados' }` |
| `/roles?roleId=007`, `/roles?roleId=abc` | el valor se ignora: la tabla se abre y la dirección se reescribe a su forma canónica |
| `/roles/7` y el role 7 está bloqueado | su detalle de role bloqueado (sale de la lista de bloqueados) |
| `/roles/9999` o un role eliminado | el aviso «Este role ya no existe» con «Volver al listado» (`/roles`) |

La redirección la hace `RolesPage`, que lee `roleId` antes de montar la pantalla de la tabla.

## 4. Estado del historial (`location.state`)

`{ listSearch?: string }`, validado con Zod (`parseRoleDetailState`): cadena de ≤ 300 caracteres que
empieza por `?` y cuyas claves son solo `type`, `status`, `page` y `page_size`. Lo que no lo cumple se
descarta y el detalle vuelve a `/roles`. Sin estado (enlace directo, recarga en una pestaña nueva):
«Volver al listado» lleva a `/roles`.

## 5. Qué entrada del historial usa cada navegación

| Navegación | Tipo | `state` |
|---|---|---|
| Pulsar el nombre de un role en la tabla | push a `/roles/{id}` | `{ listSearch: <search de la tabla> }` |
| Cambiar filtro, página o tamaño de página | push a `/roles?…` | — |
| Corregir una dirección no válida o una página inexistente | replace de `/roles?…` | — |
| Enlace antiguo con `roleId` | replace a `/roles/{id}` | `{ listSearch }` con el `type` y el `status` antiguos (sin `state` si no traía ninguno) |
| «Volver al listado» | push a `/roles{listSearch}` | — |
| Crear un role (desde la tabla) | replace de `/roles?…` por la tabla que muestra el role (solo si no es ya la actual), y luego push a `/roles/{id}` | `{ listSearch: <esa tabla> }` (`''` si es la de por omisión) |
| Duplicar (desde el detalle) | push a `/roles/{copiaId}` | `{ listSearch: <tabla que muestra la copia> }` |
| Bloquear, desbloquear o eliminar | replace a `/roles{listSearch}` | — |
| Salir del detalle con cambios sin guardar | bloqueada hasta confirmar (§ roles-ui 2.5) | — |

La vuelta a la tabla tras bloquear, desbloquear o eliminar navega con `flushSync`: cuando se llama a
la acción, las listas ya se refrescaron sin el role, y sin él React pintaría un instante «Este role ya
no existe» antes de que el enrutador confirme la tabla. Crear y duplicar no lo necesitan.
