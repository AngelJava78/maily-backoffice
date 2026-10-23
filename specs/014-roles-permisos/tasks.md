---

description: "Task list template for feature implementation"
---

# Tasks: Roles y permisos

**Input**: Design documents from `/specs/014-roles-permisos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/roles-service.md](./contracts/roles-service.md), [contracts/app-routes.md](./contracts/app-routes.md), [quickstart.md](./quickstart.md), [.specify/memory/constitution.md](../../.specify/memory/constitution.md) (v1.5.0).

**Tests**: incluidas. La constitución (Principio VII) exige pruebas automatizadas en el mismo PR y test-first para lógica pura (esquemas, políticas); la spec deja las pruebas para `/speckit-implement` (Assumptions). Dentro de cada fase, la prueba de cada pieza nueva se escribe ANTES que su implementación y DEBE fallar al principio. Las APIs se simulan a nivel de red con MSW (nunca se mockea `fetch` ni el cliente HTTP); Auth0, con el doble centralizado ya existente.

**Organization**: tareas agrupadas por historia de usuario de spec.md — US1=P1 "ver y ajustar permisos de un role existente (incl. nombre/descripción)", US2=P2 "crear un role nuevo", US3=P3 "eliminar un role", US4=P4 "duplicar un role existente" —, en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede ejecutar en paralelo (archivos distintos, sin depender de tareas incompletas)
- **[Story]**: historia a la que pertenece la tarea (US1 a US4); solo en las fases de historias
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único en la raíz del repositorio (`C:\Maily\code\maily-backoffice`): `src/`, `e2e/`. Alias `@/` → `src/`. Dependencias permitidas: `app → features → shared`; una feature solo importa de otra por su `index.ts`. Código, nombres de archivo y mensajes de commit en inglés; documentación y textos de interfaz en español, estos últimos solo en `src/shared/messages/es.ts`. Sin aserciones `as` (salvo `as const`), sin `any`, sin `console.*`; componentes `.tsx` de 250 líneas como máximo. Los archivos nuevos de `api`, `hooks` y `schemas` de `features/roles`, más la extensión de `usersDirectory/model.ts` y el nuevo `rolesCatalog/`, cuentan para el umbral de cobertura de 80 %.

## Prerrequisitos manuales (fuera de las tareas)

- `mailySoft-usuarios` corriendo en local, con su base `create_database.sql` aplicada (quickstart.md, «Requisitos previos»); ya es un prerrequisito de las specs 002 y 006, sin cambios aquí.
- Para el recorrido E2E (T087): cuentas `E2E_AUTH0_*` ya existentes (spec 001) con un usuario cuyo rol de Sistema tenga `roles:*` real en el backend (p. ej. Administrator, ver `bootstrap_admin.sql`).

---

## Phase 1: Setup

**Purpose**: línea base antes de agregar una feature nueva. Sin dependencias que instalar ni variables de entorno nuevas (research D1; `VITE_USERS_API_URL` ya existe y ya apunta al backend correcto).

- [ ] T001 Medir la línea base real del bundle: `npm run build && npm run size` en la raíz del repo; registrar el KB gzip obtenido, para compararlo en el Polish final (T090). **Bloqueada**: `npm run build` (vía `tsc -b`) falla hoy por errores de TypeScript preexistentes y ajenos a esta feature, en `src/features/subscriptions/*` (spec 012, en curso en otro worktree/sesión en paralelo — confirmado con `git stash`/`tsc -b` en HEAD antes de cualquier cambio de esta spec). Repetir en cuanto esa spec deje `main` en verde.

**Checkpoint**: línea base de bundle registrada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: todo lo que CUALQUIER historia necesita: el simulador de pruebas (extensión de `usersDirectory` + `rolesCatalog` nuevo, research D8), los esquemas de dominio, la capa `api`, los hooks de lectura, y los puntos de integración compartidos (política de acceso, navegación, textos, ícono, ruta, cascarón de la pantalla).

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

### Simulador de pruebas: extender `usersDirectory`, crear `rolesCatalog` (research D8)

- [X] T002 [P] Ampliar `src/test/handlers/usersDirectory/model.test.ts` (debe fallar primero; research D8; contracts/roles-service.md).
  - `toRoleRecordDto(role)` incluye `type: { id: role.typeId, name: 'Sistema' | 'Clínica' }`.
  - `createRole({ name, description, typeId })`: `name` recortado, de 1 a 50 caracteres, obligatorio; rechaza (mismo `DirectoryError` 409 `role_name_already_exists`) un nombre que ya tenga otro rol con `statusId !== DELETED`, sin distinguir mayúsculas, **sea cual sea su `typeId`**; `typeId` debe ser `1` o `2`; devuelve el rol creado, Activo.
  - `updateRole(id, { name?, description? })`: al menos un campo; mismas reglas de nombre único; 404 `role_not_found` si no existe o no está Activo; conserva `typeId` sin importar lo que se envíe (esta función no acepta `typeId` en su firma, ni como `undefined` explícito).
  - `deleteRole(id)`: pasa el rol a `statusId: DELETED`; **no comprueba asignaciones** (se permite aunque el rol esté en `links` o tenga `permissions`); 404 si no existe o ya no está Activo; libera el nombre (una llamada posterior a `createRole` con el mismo nombre ya no choca).
- [X] T003 Implementar (tras T002) en `src/test/handlers/usersDirectory/model.ts`: agregar `type` a `toRoleRecordDto`; agregar `createRole`, `updateRole`, `deleteRole` al objeto devuelto por `createDirectoryModel`, con las reglas de T002 (mismo estilo que `createUser`/`updateUser`/`blockUser`: funciones que SÍ aplican reglas, junto a `addRole`/`setRoleStatus`, que siguen sin aplicarlas). Hace pasar T002; no rompe `src/test/handlers/usersDirectory/catalog.test.ts` ni cualquier otra prueba que lea `toRoleRecordDto` sin usar `.type`.
- [X] T004 [P] Escribir `src/test/handlers/rolesCatalog/model.test.ts` (debe fallar primero; research D3, D8; data-model.md, `PermissionMatrix`).
  - Construir el catálogo de `Module`/`Permission` a partir de listas de módulos (`{id,key,name,type,sortOrder}`) y nombres de permiso (`"recurso:accion"`): cada permiso se resuelve a `{module, action}` si existe un módulo con ese `key` y una acción con esa segunda parte; si no, `module`/`action` quedan `null` (igual que el backend real, research D3).
  - `permissionsOfRole(role, type)`: cruza `role.permissions` (los nombres planos del `DirectoryRole`) contra el catálogo, devuelve solo los que resuelven a un módulo Activo de ese `type`.
  - `associate(directoryModel, role, permission)`: si `permission.module.type.id !== role.typeId`, lanza el conflicto 409 `role_permission_module_type_conflict` **sin** llamar a `grant`; si `role.permissions` ya incluye `permission.name`, lanza 409 `role_permission_already_associated`; si no, llama a `directoryModel.grant(role.name, permission.name)`.
  - `disassociate(directoryModel, role, permission)`: si `role.permissions` no incluye `permission.name`, lanza 409 `role_permission_not_associated`; si no, llama a `directoryModel.revoke(role.name, permission.name)`.
- [X] T005 Implementar (tras T004) `src/test/handlers/rolesCatalog/model.ts` con las reglas de T004 (recibe el `DirectoryModel` de `usersDirectory` como parámetro; no guarda su propia copia de la lista de roles). Hace pasar T004.
- [X] T006 [P] Implementar `src/test/handlers/rolesCatalog/seed.ts` (sin prueba propia, dato fijo): `rolesCatalogScenario()` → `{ directory: DirectoryInitial, modules: Module[], permissions: Permission[] }` que reproduce el estado real de `create_database.sql` (contracts/roles-service.md): 9 roles (Administrator, Developer, Support, Marketing, Billing de tipo Sistema; Owner, Doctor, Nurse, Receptionist de tipo Clínica), 4 módulos de Sistema (`users`, `roles`, `permissions`, `modules`, con sus 16 permisos Ver/Crear/Modificar/Eliminar), 0 módulos de Clínica; `permissions: [...]` de Administrator con los 16 nombres completos. Exportar también `richClinicModulesScenario()`: la misma base más 3 módulos de Clínica desiguales (`patients` con las 4 acciones, `appointments` con las 4, `reminders` solo con Ver y Modificar — como el mockup), para las pruebas que pidan explícitamente el caso rico.
- [X] T007 [P] Escribir `src/test/handlers/rolesCatalog/roles.test.ts` (debe fallar primero; contracts/roles-service.md): `POST /api/v1/roles` (201 con `Location`, 422 sin `name`/`type_id` o `type_id` fuera de `{1,2}`, 409 nombre repetido), `PATCH /api/v1/roles/:id` (200, 422 si manda `type`/`type_id`, 404 si no existe), `DELETE /api/v1/roles/:id` (204 siempre que exista y esté Activo, incluso con permisos asociados).
- [X] T008 Implementar (tras T007, T003) `src/test/handlers/rolesCatalog/roles.ts` con los tres handlers, usando `model.createRole`/`updateRole`/`deleteRole` y los códigos de error de contracts/roles-service.md. Hace pasar T007.
- [X] T009 [P] Escribir `src/test/handlers/rolesCatalog/permissions.test.ts` (debe fallar primero): `GET /api/v1/roles/:id/permissions` (los permisos activos del rol, resueltos), `POST .../permissions` (201 `{role,permission}`, 409 ya asociado o conflicto de tipo, 404 rol o permiso inexistente), `DELETE .../permissions/:permissionId` (204, 409 si no estaba asociado).
- [X] T010 Implementar (tras T009, T005) `src/test/handlers/rolesCatalog/permissions.ts`. Hace pasar T009.
- [X] T011 [P] Escribir `src/test/handlers/rolesCatalog/catalogs.test.ts` (debe fallar primero): `GET /api/v1/permissions?status_id=1`, `GET /api/v1/modules?type_id=&status_id=1` (ordenado por `sortOrder`, luego nombre), `GET /api/v1/role-types` (`[{id:1,name:'Sistema'},{id:2,name:'Clínica'}]`).
- [X] T012 Implementar (tras T011, T005) `src/test/handlers/rolesCatalog/catalogs.ts`. Hace pasar T011.
- [X] T013 Implementar (tras T006, T008, T010, T012) `src/test/handlers/rolesCatalog/index.ts`: `createRolesCatalogMock(directoryModel, scenario = rolesCatalogScenario())`, registra los ocho handlers nuevos en el `server` compartido (mismo estilo que `createUsersDirectoryMock`), expone `state` (módulos, permisos del catálogo, y `permissionsOfRole`) y helpers libres de reglas (`addModule`, `addPermission`) para preparar datos de una prueba.
- [X] T014 Revisado `src/test/renderApp.tsx`/`renderWithProviders.tsx`: no montan `usersDirectory`/`subscriptionsCatalog` por omisión — cada prueba de integración ya crea explícitamente su propio `createUsersDirectoryMock(...)` (confirmado en `createUser.integration.test.tsx` y otros). `createRolesCatalogMock` ya sigue ese mismo patrón (recibe el `DirectoryModel` de la prueba); no hace falta tocar ninguno de los dos archivos. Punto de control: `npm run test -- src/test/handlers` en verde (137 pruebas).

### Esquemas de dominio

- [X] T015 [P] Escribir `src/features/roles/schemas/role.test.ts` (debe fallar primero; data-model.md, `Role`/`RoleCreateInput`). `roleSchema` convierte `RoleRead`: `type_id`→dentro de `type.id`, `created_at`→`createdAt`; `roleTypeSchema` acepta solo `id: 1|2`. `roleCreateInputSchema` (del lado del formulario, no del DTO): `name` recortado, de 1 a 50 caracteres, obligatorio; `description` opcional; `typeId` obligatorio, `1|2`.
- [X] T016 Implementar (tras T015) `src/features/roles/schemas/role.ts`. Hace pasar T015.
- [X] T017 [P] Escribir `src/features/roles/schemas/module.test.ts` (debe fallar primero; data-model.md, `Module`). `moduleSchema` convierte `key` (`^[a-z][a-z0-9_]*$`), `sort_order`→`sortOrder`, `type` (`id: 1|2`).
- [X] T018 Implementar (tras T017) `src/features/roles/schemas/module.ts`. Hace pasar T017.
- [X] T019 [P] Escribir `src/features/roles/schemas/permission.test.ts` (debe fallar primero; data-model.md, `Permission`/`Action`). `permissionSchema` acepta `module`/`action` nulos; `actionSchema.key` restringido a `'read'|'write'|'update'|'delete'` (cualquier otro valor se trata como ninguna columna, no como error de parseo).
- [X] T020 Implementar (tras T019) `src/features/roles/schemas/permission.ts`. Hace pasar T019.
- [X] T021 [P] Escribir `src/features/roles/schemas/permissionMatrix.test.ts` (debe fallar primero; data-model.md, `PermissionMatrix`/`withPermissionToggled`; FR-006, FR-007, FR-008, FR-009).
  - `buildPermissionMatrix(modules, permissions, grantedPermissionIds, roleTypeId)`: una fila por módulo de `modules` cuyo `type.id === roleTypeId`, en `sortOrder`; cada celda solo para las `action.key` presentes en `permissions` de ese módulo; un módulo sin ninguna fila de permisos da `cells: {}`; descarta permisos con `module: null` o de otro tipo.
  - `withPermissionToggled(row, actionKey, checked)`: marcar `'write'|'update'|'delete'` marca también `'read'` si faltaba; desmarcar `'read'` desmarca las demás celdas presentes de la fila; no muta `row`.
  - "Todo el módulo": marcar/desmarcar en una sola llamada todas las `cells` presentes de una fila (helper `withAllPermissionsToggled` o equivalente), nunca una acción que no esté en `cells`.
- [X] T022 Implementar (tras T018, T020, T021) `src/features/roles/schemas/permissionMatrix.ts`. Hace pasar T021.
- [X] T023 [P] Escribir `src/features/roles/schemas/rolePermissionsLocation.test.ts` (debe fallar primero; data-model.md, `RolePermissionsLocation`; research D5). `type`: `'clinica'|'sistema'`, por omisión `'clinica'`, cualquier otro valor se trata como ausente. `roleId`: entero o ausente. `toRolePermissionsSearchParams`/`parseRolePermissionsSearchParams` en espejo de `subscriptionsLocation.ts`.
- [X] T024 Implementar (tras T023) `src/features/roles/schemas/rolePermissionsLocation.ts`. Hace pasar T023.

### Capa `api`

- [X] T025 [P] Escribir `src/features/roles/api/roleErrors.test.ts` (debe fallar primero; data-model.md, «Mensajes de error de dominio»). `describeRoleError`: `role_name_already_exists` → `kind:'field', field:'name'`; `validation_error` con `errors[].field` → `kind:'field'` con ese campo; genéricos (404, 5xx) → igual que el resto del repo. `describeRolePermissionAssociationError`: `role_permission_already_associated`/`role_permission_not_associated` → `kind:'alreadyDesired'` (éxito silencioso, research D6); `role_permission_module_type_conflict` → `kind:'conflict'`.
- [X] T026 Implementar (tras T025) `src/features/roles/api/roleErrors.ts`. Hace pasar T025.
- [X] T027 [P] Escribir `src/features/roles/api/rolesApi.test.ts` (debe fallar primero; contracts/roles-service.md). Nota: usa `server.use(http.*(...))` directo (patrón de `features/users/api/rolesApi.test.ts`), no el simulador completo `rolesCatalog` — más aislado para probar solo construcción de la petición/parseo de la respuesta de esta capa. `listRoles()` → `GET /api/v1/roles?status_id=1`; `createRole(input)` → `POST`, body `{name,description,type_id}`; `updateRole(id, changes)` → `PATCH`, body solo con los campos enviados; `deleteRole(id)` → `DELETE`, sin cuerpo de respuesta.
- [X] T028 Implementar (tras T016, T026, T014) `src/features/roles/api/rolesApi.ts`. Hace pasar T027.
- [X] T029 [P] Escribir `src/features/roles/api/rolePermissionsApi.test.ts` (debe fallar primero). `listRolePermissions(roleId)` → `GET`; `associateRolePermission(roleId, permissionId)` → `POST` body `{permission_id}`; `disassociateRolePermission(roleId, permissionId)` → `DELETE`.
- [X] T030 Implementar (tras T020, T026, T014) `src/features/roles/api/rolePermissionsApi.ts`. Hace pasar T029.
- [X] T031 [P] Escribir `src/features/roles/api/permissionsApi.test.ts` (debe fallar primero). `listPermissions()` → `GET /api/v1/permissions?status_id=1`.
- [X] T032 Implementar (tras T020, T014) `src/features/roles/api/permissionsApi.ts`. Hace pasar T031.
- [X] T033 [P] Escribir `src/features/roles/api/modulesApi.test.ts` (debe fallar primero). `listModules(typeId)` → `GET /api/v1/modules?type_id=&status_id=1`.
- [X] T034 Implementar (tras T018, T014) `src/features/roles/api/modulesApi.ts`. Hace pasar T033.
- [X] T035 [P] Escribir `src/features/roles/api/roleTypesApi.test.ts` (debe fallar primero). `listRoleTypes()` → `GET /api/v1/role-types`.
- [X] T036 Implementar (tras T016, T014) `src/features/roles/api/roleTypesApi.ts`. Hace pasar T035.

### Hooks de lectura

- [X] T037 [P] Escribir `src/features/roles/hooks/roleKeys.test.ts` (debe fallar primero). Factoría con llaves estables y distintas para: lista de roles por tipo, detalle de un rol, permisos de un rol, catálogo de permisos, catálogo de módulos por tipo, tipos de rol.
- [X] T038 Implementar (tras T037) `src/features/roles/hooks/roleKeys.ts`. Hace pasar T037.
- [X] T039 [P] Escribir `src/features/roles/hooks/useRoleDetail.test.ts` (debe fallar primero; usa MSW/`rolesCatalog`). **Ajuste de diseño sobre el plan**: no hay `GET /roles/:id` en la API real (solo `GET /roles` y `GET /roles/:id/permissions`); el rol se deriva de la lista ya cacheada (`useRolesCatalog`, misma query key) en vez de pedirlo de nuevo — un rol que ya no está en la lista (eliminado) da `data: undefined` sin error, no un 404 aparte.
- [X] T040 Implementar (tras T028, T030, T038) `src/features/roles/hooks/useRoleDetail.ts`. Hace pasar T039.
- [X] T041 [P] Escribir `src/features/roles/hooks/useRolePermissionMatrix.test.ts` (debe fallar primero; FR-020). Firma ajustada: `(typeId, grantedPermissionIds)` en vez de recibir todo `RoleDetailData` — el tipo es el de la pestaña activa (ya conocido antes de elegir un rol), así que el catálogo de módulos/permisos puede empezar a cargar sin esperar a `useRoleDetail`; `grantedPermissionIds: undefined` (sin rol elegido aún) da "sin matriz" sin error.
- [X] T042 Implementar (tras T022, T032, T034, T040, T038) `src/features/roles/hooks/useRolePermissionMatrix.ts`. Hace pasar T041.
- [X] T043 [P] Implementar `src/features/roles/hooks/useRolesCatalog.ts` (TanStack Query; lista de roles de un tipo, derivada de `listRoles()` filtrando por `type.id` en el cliente **solo para separar las dos pestañas** — la propia llamada ya trae todos los roles Activos, sin parámetro de tipo en la API).
- [X] T044 [P] Implementar `src/features/roles/hooks/usePermissionsCatalog.ts` y `src/features/roles/hooks/useModulesCatalog.ts` (TanStack Query, wrappers delgados de T032/T034) y `src/features/roles/hooks/useRoleTypes.ts` (wrapper de T036).
- [X] T045 Punto de control: lint y tests de `src/features/roles` en verde (89 pruebas); `tsc -b` sin errores nuevos (los 20 existentes son de la spec 012 en paralelo, ver T001).

### Política de acceso, navegación, textos, ícono y ruta (compartidos)

- [X] T046 Actualizar `src/features/auth/policy/permissions.ts`: agregar `'roles'` a `SECTION_RESOURCES` (hoy solo tiene `'users' | 'subscriptions' | 'tenants' | 'token'`); quitar/actualizar el comentario junto a `'roles'` en `PERMISSION_RESOURCES` que dice que hoy no tiene sección propia (research D4; `GrantedAccess`/`can()` no cambian de forma).
- [X] T047 [P] `permissions.test.ts` sí enumeraba `SECTION_RESOURCES`/`PERMISSION_RESOURCES` (y asumía explícitamente que "roles" no tenía sección, en varios `it` de `hasAnythingToSee` y en el describe "the roles resource"): ampliado y corregido. También se encontró y corrigió `src/app/navigation/sections.roles.test.ts`, que dependía de `SECTION_RESOURCES` para una lista de permisos ajena a esta feature — se desacopló a una constante local `SAMPLE_RESOURCES` para que no vuelva a romperse con un recurso nuevo.
- [X] T048 Agregar a `src/shared/messages/es.ts`: `nav.sections.roles: 'Roles y permisos'`; un bloque `roles` nuevo con todos los textos de contracts/app-routes.md y data-model.md — títulos de página/diálogos, `fields: { name, description, type }`, `validation: { nameRequired, nameTooLong, nameAlreadyExists, typeRequired }`, `matrix: { columns: { read: 'Ver', write: 'Crear', update: 'Modificar', delete: 'Eliminar' }, allModule: 'Todo el módulo', countLabel: (granted, total) => \`${granted} de ${total} permisos\` }`, `tabs: { clinica: 'Clínica', sistema: 'Sistema' }`, `actions: { new: 'Nuevo role', duplicate: 'Duplicar', save: 'Guardar cambios', discard: 'Descartar cambios', delete: 'Eliminar role', cancel: 'Cancelar', create: 'Crear role' }`, `delete: { warning: 'Eliminar role', body: 'Eliminar borra el role y no se puede deshacer.' }`, `copyFrom: { label: 'Copiar permisos de', helper: 'Opcional. Llena la tabla con los permisos de otro role; después la puedes ajustar.' }`, `empty: { noRolesOfType: 'Elige un role para ver y cambiar lo que puede hacer en cada módulo.', noModulesOfType: '…' }`, mensajes de error puntuales de FR-020.
- [X] T049 [P] Agregar a `src/shared/ui/iconRegistry.ts` un ícono `roles` (`ShieldCheck` de `lucide-react`; no reutilizar `KeyRound`, ya usado por `token`).
- [X] T050 Agregar la sección en `src/app/navigation/sections.ts`: `{ id: 'roles', path: '/roles', labelKey: 'roles', resource: 'roles', icon: 'roles' }` **al inicio** del array `sections` (antes de `users`), para que el menú quede Panel, Roles y permisos, Usuarios, Suscripciones, Token (FR-002).
- [X] T051 [P] `sections.test.ts` y `sections.token.test.ts` sí tenían el array completo hardcodeado: ambos ampliados con `roles` al inicio.
- [X] T052 Agregar la ruta en `src/app/router/routes.tsx`: `/roles` con `React.lazy`, anidada bajo `<RequirePermission resource="roles">` (mismo patrón que `/users`), con `handle: { titleKey: 'roles' }`. `RolesPage`/`features/roles/index.ts` creados como cascarón mínimo (`return null`) solo para que la ruta compile; T057/T058 lo reemplazan por la pantalla real. Verificación de impacto más amplia: `npx vitest run` (suite completa, 259 archivos/3011 pruebas) confirma 0 regresiones — los 16 archivos/89 pruebas que fallan son 100 % de `subscriptionsCatalog`/`features/subscriptions` (spec 012 en paralelo, ya roto en el commit del que parte este worktree).
- [X] T053 [P] [shared] Escribir `src/features/roles/components/RoleTypeTabs.test.tsx` (debe fallar primero): dos pestañas accesibles (Clínica por omisión), cambiarla actualiza `type` en la URL.
- [X] T054 Implementar (tras T053) `src/features/roles/components/RoleTypeTabs.tsx`. Hace pasar T053. Agrega también `src/features/roles/hooks/useRolePermissionsLocation.ts` (no estaba listado por separado en el plan): el hook de React que envuelve `schemas/rolePermissionsLocation.ts` con `useSearchParams`, mismo patrón que `useSubscriptionsLocation`.
- [X] T055 [P] [shared] Escribir `src/features/roles/components/RolesList.test.tsx`. Agrega también `src/features/roles/hooks/useRolePermissionCounts.ts` (no estaba listado por separado): el "X permisos" por role de la lista (FR-004) no viene en `GET /roles`, así que se deriva con un `useQueries` (uno por role visible, mismo query key que `useRoleDetail` → comparten caché).
- [X] T056 Implementar (tras T055, T043) `src/features/roles/components/RolesList.tsx`. Hace pasar T055.
- [X] T057 [P] [shared] Escribir `src/features/roles/components/RolesPage.test.tsx`.
- [X] T058 Implementar (tras T054, T056) `src/features/roles/components/RolesPage.tsx` y `src/features/roles/index.ts`. Hace pasar T057. Agrega también, siguiendo el patrón ya establecido por `features/users`/`features/subscriptions` (research D2: la feature no importa `@/features/auth`): `src/features/roles/policy/roleCapabilities.ts` (tipo `RoleCapabilities`), `src/features/auth/policy/roleCapabilities.ts` (`getRoleCapabilities`, exportado desde `features/auth/index.ts`) y `src/app/router/roles/RolesRoute.tsx` (adaptador que junta `RolesPage` con las capacidades de `auth`, como `UsersListRoute`). `routes.tsx` usa `RolesRoute` (import estático, igual que `/users` y `/subscriptions` — ninguna de esas dos secciones usa `React.lazy` hoy; solo `/profile` y `/tools/postman-token` lo hacen), no el cascarón de T052.
- [X] T059 Punto de control de la fase Foundational: `npx vitest run src/features/roles src/app/router/roles` → 17 archivos, 99 pruebas, todas en verde; `tsc -b` y `eslint` sin errores nuevos (limpios en las carpetas tocadas). Pendiente de verificar manualmente contra el entorno local real (sin bloqueo): entrar a `/roles` con `roles:read` muestra la pantalla; sin el permiso, no aparece en el menú ni se puede entrar a la ruta (cubierto por prueba automatizada, `RequirePermission` ya probado en otras specs).

**Checkpoint**: infraestructura lista — las cuatro historias pueden empezar.

---

## Phase 3: User Story 1 - Ver y ajustar los permisos de un role existente (Priority: P1) 🎯 MVP

**Goal**: abrir cualquier rol ya sembrado, ver su matriz de permisos completa, cambiar nombre/descripción/permisos y guardarlo o descartarlo (FR-003 a FR-010, FR-017, FR-018, FR-020, FR-021).

**Independent Test**: con los roles reales del entorno local (quickstart.md, W2 a W7), entrar a la sección, cambiar de pestaña, elegir distintos roles, aplicar la regla Ver-prerequisito y «Todo el módulo», guardar y confirmar que persiste tras recargar, descartar sin guardar.

### Implementación para la Historia 1

- [X] T060 [P] [US1] Escribir `src/features/roles/components/PermissionsMatrixRow.test.tsx`. Hallazgo importante de MUI v9 (afecta a todos los controles con aria-label de esta feature): `Checkbox`/`TextField` ya no aceptan `inputProps`, usan `slotProps={{ input: {...} }}`. (debe fallar primero; FR-007, FR-008, FR-009). Fila con encabezado `scope="row"`; solo pinta casillas para las `cells` presentes; marcar Crear/Modificar/Eliminar marca Ver; desmarcar Ver desmarca el resto; «Todo el módulo» marca/desmarca todas las presentes; celdas deshabilitadas mientras `pending`.
- [X] T061 [US1] Implementar (tras T060) `src/features/roles/components/PermissionsMatrixRow.tsx`. Hace pasar T060. Ajuste: recibe `columns` (las columnas de toda la tabla) además de `row`, para que una acción que ningún módulo tiene se omita como columna completa (T062), no solo como celda vacía.
- [X] T062 [P] [US1] Escribir `src/features/roles/components/PermissionsMatrix.test.tsx` (debe fallar primero). Encabezado de columna `scope="col"` solo para las acciones presentes en al menos un módulo; fila sin ninguna acción (módulo sin permisos en el catálogo, edge case de spec.md); tabla vacía (0 módulos del tipo) con el mensaje de `messages.roles.empty.noModulesOfType`, no un error.
- [X] T063 [US1] Implementar (tras T061, T062) `src/features/roles/components/PermissionsMatrix.tsx`. Hace pasar T062.
- [X] T064 [P] [US1] Escribir `src/features/roles/hooks/useSaveRoleDetail.test.ts` (debe fallar primero; research D6; FR-010, FR-018, FR-021).
  - Si `name`/`description` cambiaron, llama primero a `updateRole` (T028); si falla (409/422), no dispara ninguna llamada de permisos y expone el error en el campo `name`.
  - Si no hace falta `PATCH` o ya tuvo éxito, calcula el diff entre los permisos marcados y los ya asociados (cargados por `useRoleDetail`) y dispara solo las llamadas de alta/baja necesarias, en paralelo.
  - Si alguna asociación/desasociación falla, el resultado NO es «éxito total»: se refrescan `useRoleDetail`/`useRolePermissionMatrix` desde el servidor y se listan los `permissionId` que no se aplicaron.
  - Un 409 `role_permission_already_associated` o `role_permission_not_associated` en una de esas llamadas se trata como éxito para ese `permissionId` puntual (no aparece entre los fallidos).
  - Invalida `roleKeys` de la lista (para el contador) y del detalle tras un guardado con éxito, parcial o total.
- [X] T065 [US1] Implementar (tras T026, T028, T030, T038, T064) `src/features/roles/hooks/useSaveRoleDetail.ts`. Hace pasar T064. Verificado: lint y typecheck limpios, 5/5 pruebas en verde.

**Retomado (2026-10-23)**: T001-T065 ya estaban implementados, probados y commiteados antes de la pausa; T066-T070 se completaron en esta sesión. `/speckit-analyze` corrido antes de retomar había señalado dos huecos (FR-017 sin tarea de verificación dedicada, y el edge case de conflicto de edición concurrente de spec.md:91 sin FR ni diseño); el segundo queda para una nota de alcance aparte (fuera de tasks.md), el primero se resolvió integrándolo en T069 y quickstart.md (W16) en vez de crear una tarea nueva.
- [X] T066 [P] [US1] Escribir `src/features/roles/components/RoleDetailPanel.test.tsx` (debe fallar primero; FR-005, FR-010, FR-020, FR-021). Nombre y descripción editables; tipo mostrado como texto, no como campo; contador «X de Y permisos»; «Guardar cambios»/«Descartar cambios» deshabilitados sin cambios pendientes; si `useRolePermissionMatrix` falla pero el rol cargó, el resto del panel se ve igual y solo la tabla muestra el aviso (FR-020); «Descartar cambios» repone nombre, descripción y tabla al último estado guardado. 6 pruebas.
- [X] T067 [US1] Implementar (tras T063, T065) `src/features/roles/components/RoleDetailPanel.tsx`. Hace pasar T066. Ajuste de diseño: la matriz editable (toggle/toggleAll/diff/reset, con la regla Ver-prerequisito y "todo el módulo" aplicadas sobre una copia local) se extrajo a un hook nuevo no listado en el plan, `src/features/roles/hooks/useEditablePermissionMatrix.ts` (+ test, 8 pruebas), para mantener el componente dentro del límite de 250 líneas y que la lógica pura sea probable por separado. También se agregó `schemas/role.ts#roleEditInputSchema` (+ 4 pruebas) para el formulario de nombre/descripción (RHF + Zod, Principio II). Deliberadamente sin los botones "Duplicar"/"Eliminar role" todavía: esos llegan con T083/T087 (Historias 3 y 4).
- [X] T068 [US1] Wire: sustituido el cascarón de detalle de `RolesPage.tsx` (T058) por `RoleDetailPanel`. El aviso de cambios sin guardar (FR-017, edge case de spec.md) se implementó con `useBlocker` (react-router 8, data router) sobre un único booleano `dirty` que `RoleDetailPanel` reporta vía `onDirtyChange`: cambiar de pestaña, elegir otro role y salir de `/roles` (incluido un enlace del menú principal) son, los tres, la misma clase de navegación para el router, así que un solo `useBlocker(dirty)` los cubre sin lógica distinta por caso. El diálogo reutiliza `ConfirmDialog`, al que se le agregó una prop opcional `cancelLabel` (por omisión "Cancelar") para poder decir "Quedarme" en vez de poner un texto nuevo; `ConfirmDialog.test.tsx` ampliado (+1 prueba). `RolesPage.test.tsx` ampliado con 4 pruebas del aviso.
- [X] T069 [P] [US1] Escribir `src/app/router/roles/viewAndEditPermissions.integration.test.tsx` (debe fallar primero; `renderApp`, MSW `rolesCatalog` con `richClinicModulesScenario()` — así Clínica también tiene filas reales que ejercitar). Cubre los nueve escenarios de aceptación de la Historia 1 **más** un caso explícito de FR-017 (avisar al salir de la sección desde el menú principal, con "Quedarme"/"Descartar y continuar") que el hallazgo de `/speckit-analyze` había señalado sin cobertura. 9 pruebas; requirió el mismo `asyncUtilTimeout`/`describe(…, {timeout: 30_000})` ya usado en los demás `*.integration.test.tsx` de la app completa. Documentado también como W16 en quickstart.md.
- [X] T070 [US1] Pasada de accesibilidad: `vitest-axe` sobre `RolesPage` con un rol seleccionado (sin violaciones); navegación por teclado verificada con un helper `tabUntil` (pulsa Tab hasta que el foco cumple una condición, con un tope) que llega a una pestaña, a un role de la lista y a una casilla de la tabla, y confirma que Espacio la conmuta. 2 pruebas añadidas a `RolesPage.test.tsx`.

**Checkpoint**: la Historia 1 es funcional y probable de forma independiente — MVP entregable.

---

## Phase 4: User Story 2 - Crear un role nuevo (Priority: P2)

**Goal**: dar de alta un rol desde cero o copiando los permisos de otro del mismo tipo (FR-011, FR-012, FR-013, FR-018, FR-019).

**Independent Test**: quickstart.md W8 a W11 — crear sin copiar, crear copiando de otro rol, el selector de copia filtrado por tipo, nombre repetido rechazado.

### Implementación para la Historia 2

- [X] T071 [P] [US2] Escribir `src/features/roles/components/CopyPermissionsFromField.test.tsx` (debe fallar primero; FR-012, FR-006). Autocomplete que solo ofrece roles cuyo `type.id` coincide con el tipo elegido en el formulario; cambia sus opciones si el tipo del formulario cambia; vacío por omisión. 5 pruebas.
- [X] T072 [US2] Implementar (tras T071, T043) `src/features/roles/components/CopyPermissionsFromField.tsx`. Hace pasar T071.
- [X] T073 [P] [US2] Escribir `src/features/roles/components/RoleFormDialog.test.tsx` (debe fallar primero; FR-011). Nombre obligatorio (hasta 50 caracteres), tipo obligatorio (Clínica/Sistema); «Crear role» deshabilitado mientras la mutación está pendiente; «Cancelar» cierra sin llamar a nada. 9 pruebas.
- [X] T074 [US2] Implementar (tras T072, T073) `src/features/roles/components/RoleFormDialog.tsx`. Hace pasar T073. Ajuste de diseño: a diferencia de los diálogos "dumb" de otras features (p. ej. `AddRoleDialog`), este sí posee su propia mutación (`useCreateRole`) en un componente interno `RoleFormBody` que remonta cada vez que el diálogo abre (mismo truco que `AddRoleBody`: MUI desmonta los hijos de `Dialog` al cerrar), con `onPendingChange` reportando el estado a la envoltura externa para que Escape/clic afuera no cierren a mitad de un guardado. Así, un nombre repetido (409) deja el diálogo abierto con el error en el campo y lo demás ya escrito, en vez de perderlo con un toast que cierra el diálogo. Se agregó también `schemas/roleForm.ts` (`roleFormSchema`/`toCreateRoleVariables`, con `typeId: 1|2|null` para poder representar "sin elegir" sin usar `z.transform`/`refine` que narrowean el tipo — mismo problema que ya se evitó en `roleEditInputSchema`) y se extrajo `realAssociationFailureIds` de `useSaveRoleDetail.ts` a `api/roleErrors.ts` para reutilizarla en `useCreateRole`.
- [X] T075 [P] [US2] Escribir `src/features/roles/hooks/useCreateRole.test.ts` (debe fallar primero; research D7; FR-012, FR-019). `createRole` (T028) primero; si falla, no se asocia nada. Si se indicó `copyPermissionsFromRoleId`, tras crear: `listRolePermissions` (T030) del rol origen y una asociación por cada uno (T030), en paralelo; si alguna falla, el rol creado en el primer paso **no se revierte** (sigue existiendo con lo que sí se aplicó) y se informa cuáles `permissionId` fallaron. Invalida la lista de roles de ese tipo al terminar (con éxito total o parcial). 4 pruebas.
- [X] T076 [US2] Implementar (tras T026, T028, T030, T038, T075) `src/features/roles/hooks/useCreateRole.ts`. Hace pasar T075.
- [X] T077 [US2] Wire: botón «Nuevo role» en `RolesList` (antes solo visible en la lista vacía; ahora siempre arriba de la lista cuando `canCreate`, T054/T055 no lo cubrían) que abre `RoleFormDialog` desde `RolesPage`; al crear con éxito (`onCreated`), selecciona el rol nuevo y cambia de pestaña si su tipo no es el de la pestaña activa, con un setter nuevo `selectInType(type, roleId)` en `useRolePermissionsLocation` (+ `tabOfRoleTypeId`, el inverso de `ROLE_TYPE_ID_OF_TAB`, en `schemas/rolePermissionsLocation.ts`).
- [X] T078 [P] [US2] Escribir `src/app/router/roles/createRole.integration.test.tsx` (debe fallar primero). Cubre los siete escenarios de aceptación de la Historia 2: alta sin tocar la tabla, alta copiando permisos de otro rol, filtro por tipo en «Copiar permisos de», nombre vacío bloquea el envío, nombre repetido (de cualquier tipo) rechazado con mensaje, «Cancelar» no crea nada, el rol creado aparece en su pestaña y se puede abrir como cualquier otro. 7 pruebas.

**Checkpoint**: las Historias 1 y 2 funcionan juntas e independientes.

---

## Phase 5: User Story 3 - Eliminar un role (Priority: P3)

**Goal**: eliminar un rol con confirmación explícita, sin que una asignación existente lo bloquee (FR-015).

**Independent Test**: quickstart.md W13, W14 — confirmar nombrando el rol, desaparece de la lista; cancelar no borra nada.

### Implementación para la Historia 3

- [X] T079 [P] [US3] Escribir `src/features/roles/components/DeleteRoleDialog.test.tsx` (debe fallar primero; FR-015). Nombra el rol en el texto del diálogo; advierte que no se puede deshacer (texto del mockup); «Eliminar role» deshabilitado mientras está pendiente; cerrar sin confirmar no dispara nada. 4 pruebas.
- [X] T080 [US3] Implementar (tras T079) `src/features/roles/components/DeleteRoleDialog.tsx`. Hace pasar T079. Es una envoltura delgada de `ConfirmDialog` (`tone="danger"`); `ConfirmDialog` ganó una prop opcional `cancelLabel` en T068, ya reutilizada aquí sin cambios.
- [X] T081 [P] [US3] Escribir `src/features/roles/hooks/useDeleteRole.test.ts` (debe fallar primero). Llama a `deleteRole` (T028); invalida la lista de roles. 3 pruebas. Ajuste de diseño: limpiar `roleId` de la URL si el rol eliminado era el seleccionado NO vive en este hook (acoplaría una mutación de datos al router) — es responsabilidad de quien lo llama, ver T083.
- [X] T082 [US3] Implementar (tras T026, T028, T038, T081) `src/features/roles/hooks/useDeleteRole.ts`. Hace pasar T081.
- [X] T083 [US3] Wire: botón «Eliminar role» en `RoleDetailPanel` que abre `DeleteRoleDialog`; al confirmar, ejecuta `useDeleteRole` y vuelve al cascarón «elige un role» (`setRoleId(null)`). La orquestación (abrir/confirmar/cancelar + notificar el error) se extrajo a `src/features/roles/hooks/useDeleteRoleAction.ts` (+ 4 pruebas) en vez de dejarla en línea, para que `RoleDetailPanel.tsx` no se acerque al límite de 250 líneas antes de que la Historia 4 agregue "Duplicar". De paso se cerró un hueco: `RoleDetailPanel` no recibía `capabilities` y por lo tanto nunca respetaba `canEdit`/`canDelete` (FR-010/FR-021 ya reclamaban cubrir esto en T066/T067, pero solo T083 lo conectó); ahora `RolesPage` le pasa `capabilities` y los campos/tabla/«Guardar cambios» se deshabilitan sin `canEdit`, igual que «Eliminar role» sin `canDelete`. 6 pruebas nuevas en `RoleDetailPanel.test.tsx`.
- [X] T084 [P] [US3] Escribir `src/app/router/roles/deleteRole.integration.test.tsx` (debe fallar primero). Cubre los tres escenarios de aceptación de la Historia 3, incluido eliminar un rol con usuarios/clínicas asignados en el simulador (no se bloquea, research confirmado contra `role_service.py`). 2 pruebas.

**Checkpoint**: las Historias 1, 2 y 3 funcionan juntas e independientes.

---

## Phase 6: User Story 4 - Duplicar un role existente (Priority: P4)

**Goal**: partir de un rol ya configurado sin pasar por el formulario de alta (FR-014).

**Independent Test**: quickstart.md W12 — duplicar dentro de la pestaña actual, nombre editable de inmediato, independiente del original.

### Implementación para la Historia 4

- [X] T085 [P] [US4] Escribir `src/features/roles/hooks/useDuplicateRole.test.ts` (debe fallar primero; research D7). Crea un rol del mismo `typeId` que el original, con un nombre derivado (p. ej. `"${original.name} (copia)"`, ajustado si ya existe) y `copyPermissionsFromRoleId` igual al id del original — reutiliza exactamente la orquestación de `useCreateRole` (T076), no la reimplementa. Cambiar los permisos del duplicado después no afecta al original (son asociaciones independientes, research D8). 3 pruebas. La derivación del nombre se escribió como función pura `nextDuplicateName` en `schemas/role.ts` (+ 4 pruebas), junto con `nameChangesOf` (movida ahí desde `RoleDetailPanel.tsx`, + 4 pruebas) — ambas ya probadas por separado en vez de solo a través del componente.
- [X] T086 [US4] Implementar (tras T076, T085) `src/features/roles/hooks/useDuplicateRole.ts`. Hace pasar T085.
- [X] T087 [US4] Wire: botón «Duplicar» en `RoleDetailPanel`; al terminar, selecciona el duplicado (`roleId` en la URL, con `selectRole`/`selectInType` ya compartido con T077) y pone el foco en su campo nombre (`setFocus('name')` de react-hook-form, diferido un tick porque compite con el `reset()` del mismo efecto). La orquestación propia se extrajo a `useDuplicateRoleAction` (+ 4 pruebas), igual que T083 hizo con la de eliminar; y los cuatro botones de acción (Guardar/Descartar/Duplicar/Eliminar) se extrajeron a un componente nuevo `RoleDetailActions.tsx` (+ 4 pruebas) para que `RoleDetailPanel.tsx` no superara las 250 líneas. 3 pruebas nuevas en `RoleDetailPanel.test.tsx`.
- [X] T088 [P] [US4] Escribir `src/app/router/roles/duplicateRole.integration.test.tsx` (debe fallar primero). Cubre los dos escenarios de aceptación de la Historia 4. 2 pruebas (el foco exacto del campo nombre, ya cubierto de forma fiable a nivel de componente, no se reafirma aquí para no depender de temporización de un diálogo + checkbox en la app completa).

**Checkpoint**: las cuatro historias de usuario funcionan de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: validación de punta a punta, accesibilidad final, cobertura y presupuesto de bundle.

- [X] T089 [P] E2E Playwright `e2e/roles.spec.ts`: iniciar sesión con una cuenta con `roles:*` real (prerrequisito manual), abrir «Roles y permisos», editar permisos de un rol de Sistema existente, crear uno nuevo copiando permisos, duplicarlo, eliminar el duplicado — subconjunto de quickstart.md alcanzable solo por la interfaz (sin pasos de SQL). Escrito siguiendo el mismo patrón que `e2e/users.spec.ts` (`account('A1')`, `hasAccounts`, `confirm`); `npx playwright test e2e/roles.spec.ts --list` confirma que los 3 tests se registran bien. **No ejecutado de verdad**: esta sesión no tiene acceso a `mailySoft-usuarios` en local ni a credenciales `E2E_AUTH0_*` reales — pendiente de una corrida real antes de confiar en él. El paso de editar permisos deja el entorno real como lo encontró (marca y desmarca la misma casilla); el rol de prueba que crea se nombra con una marca de tiempo y se elimina (junto con su duplicado) al final del mismo spec.
- [ ] T090 Ejecutar manualmente quickstart.md (W1 a W15) contra `mailySoft-usuarios` en local; registrar cualquier discrepancia con lo implementado. **No realizado en esta sesión**: requiere un `mailySoft-usuarios` real corriendo en local y clics manuales en el navegador, ninguno de los dos disponibles aquí. Sigue pendiente para quien pueda correrlo contra el entorno real.
- [ ] T091 Medir el bundle de nuevo (`npm run build && npm run size`) y comparar contra la línea base de T001; confirmar que la ruta de entrada sigue en 300 KB gzip o menos. **Sigue bloqueada** como T001: `npm run build` (vía `tsc -b`) todavía falla hoy por los mismos errores de TypeScript preexistentes y ajenos a esta feature en `src/features/subscriptions/*` (spec 012, confirmado otra vez en esta sesión). Repetir en cuanto esa spec deje `main` en verde.
- [X] T092 Puertas finales: `npm run typecheck` (limpio, solo quedan los 20 errores preexistentes de la 012), `npm run lint` (limpio, solo quedan los 25 errores preexistentes de la 012), `npm run format:check` (en verde — se encontraron y corrigieron 29 archivos de esta feature, ya escritos antes de la pausa de la sesión, que habían quedado sin pasar por Prettier), `npm audit --omit=dev` (0 vulnerabilidades). Cobertura (`vitest run --coverage src/features/roles`): `features/roles/api` 96.55 % líneas, `features/roles/hooks` 95.65 %, `features/roles/schemas` 100 % — los tres por encima del 80 % exigido; `features/roles/policy/roleCapabilities.ts` es solo una interfaz (sin código ejecutable), por lo que la herramienta de cobertura no le genera fila. `npm run build` no se pudo completar: mismo bloqueo de T001/T091 (errores de TypeScript preexistentes de la spec 012 en paralelo).
- [X] T093 Revisar que no quede `console.*`, código muerto ni `TODO` sin issue asociado en los archivos de esta feature (Definición de Terminado de la constitución). Sin coincidencias de `console.*` ni `TODO/FIXME` en `features/roles`, `app/router/roles` ni `test/handlers/rolesCatalog`; sin usos de `any` ni aserciones `as` fuera de `as const` (ya exigido por ESLint, limpio en todas las corridas de esta sesión).
- [X] T094 [P] Actualizar `README.md` solo si algo de configuración cambió (no se espera ninguno: sin variables de entorno ni dependencias nuevas — confirmar y, si no cambió nada, no tocar el archivo). Confirmado (research D1): sin variables de entorno ni dependencias nuevas. La línea «Estado» del README tampoco lista ya las features 008-013 (todas en paralelo, aún no fusionadas a `main`), así que, siguiendo ese mismo patrón ya establecido, no se tocó el archivo.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; **bloquea** las cuatro historias. Dentro de ella: Simulador → Esquemas → API → Hooks de lectura → Política/Navegación/Textos/Ícono/Ruta → Componentes compartidos (`RoleTypeTabs`, `RolesList`, `RolesPage`), en ese orden de datos (cada grupo usa al anterior).
- **Historias (Phase 3-6)**: todas dependen de Foundational completo. US1 es la base de la pantalla (MVP); US2, US3 y US4 reutilizan `RoleDetailPanel`/`RolesPage` de US1 pero cada una agrega su propio hook y componente, y es independientemente probable con lo que US1 ya dejó funcionando.
- **US4 depende de US2** en la práctica (`useDuplicateRole` reutiliza `useCreateRole`, T085/T086), aunque sigue siendo una historia con su propio valor y su propia prueba de integración.
- **Polish (Phase 7)**: depende de las historias que se decida entregar.

### Parallel Opportunities

- Dentro de Foundational: T002/T004 en paralelo (archivos distintos); T015, T017, T019, T023 en paralelo entre sí; T025, T027, T029, T031, T033, T035 en paralelo entre sí (una vez listos los esquemas que cada uno necesita); T043/T044 en paralelo.
- Una vez completo Foundational, US1, US2 y US3 pueden repartirse entre personas distintas (US4 espera a que US2 tenga `useCreateRole` terminado, T076).
- Dentro de cada historia, las tareas de prueba marcadas [P] (distintos archivos) van en paralelo; cada implementación espera a su propia prueba.

## Implementation Strategy

### MVP primero (solo Historia 1)

1. Phase 1 (Setup) + Phase 2 (Foundational) completas — incluye ya una pantalla navegable con pestañas, lista y cascarón de detalle.
2. Phase 3 (US1): detalle interactivo completo (ver, editar permisos, renombrar, guardar, descartar).
3. **Parar y validar**: quickstart.md W1 a W7 contra el entorno local real.
4. Entregar/demostrar: ya es un módulo "Roles y permisos" útil de punta a punta, aunque los roles los haya sembrado solo la base de datos.

### Entrega incremental

1. Setup + Foundational → cascarón listo.
2. + US1 → MVP demostrable (ver/editar cualquier rol existente).
3. + US2 → se pueden dar de alta roles nuevos.
4. + US3 → se pueden retirar.
5. + US4 → atajo de "duplicar" sobre lo que ya construyó US2.

Cada historia agrega valor sin romper a las anteriores; US4 es la más prescindible si hubiera que recortar alcance (spec.md ya la marca P4, la de menor prioridad).
