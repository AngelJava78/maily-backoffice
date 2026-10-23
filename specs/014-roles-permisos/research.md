# Research: Roles y permisos

Investigación hecha leyendo directamente el código fuente de `C:\Maily\code\mailySoft-usuarios` (routers, DTOs, modelos y `project-definition/create_database.sql`), no su documentación, y el código ya existente en `maily-backoffice` (`features/users`, `features/subscriptions`, `features/auth/policy`, `app/navigation`, `app/providers`). Resuelve las únicas ambigüedades reales que quedaban tras el spec: cómo orquestar, en el frontend, operaciones que la API no ofrece como una sola llamada.

## D1. Reutilizar el cliente HTTP `users` ya existente; sin cliente nuevo

**Decisión**: toda la feature usa `useHttpClients().users` (`app/providers/HttpClientsProvider.tsx`), que ya apunta a `VITE_USERS_API_URL`, el mismo backend (`mailySoft-usuarios`) que expone roles, permisos y módulos.

**Alternativas consideradas**: un cliente propio para "roles" — descartado, es el mismo backend que `features/users` ya consume; duplicarlo rompería el Principio IV (un único cliente HTTP tipado por backend).

## D2. Feature nueva `src/features/roles`, sin tocar `features/users`

**Decisión**: `src/features/roles/{api,hooks,components,schemas}` + `index.ts`, en paralelo a `features/users` y `features/subscriptions`, con su propio `schemas/role.ts` (incluye `type`, a diferencia del `Role` de `features/users` que solo sirve para asignar un rol a una persona).

**Alternativas consideradas**: ampliar `features/users/api/rolesApi.ts` y su `schemas/role.ts` — descartado: ese módulo representa el rol como lo ve el combo de "asignar rol a usuario" (sin tipo, sin permisos) y lo usan los tests e hooks de esa feature (`useRolesCatalog`, `AddRoleDialog`); cambiar su forma para añadir `type`/permisos afectaría esa feature y la spec 012 que corre en paralelo en otro worktree, justo lo que esta spec debe evitar.

## D3. La tabla de permisos se arma agrupando el catálogo de permisos; no hay un catálogo de "módulo con sus acciones"

**Decisión**: `GET /permissions?status_id=1` devuelve cada permiso con su `module` (`{id,key,name,type}` o `null`) y su `action` (`{id,key,name}` o `null`) ya resueltos por el backend a partir de `name` (`recurso:accion`). El frontend agrupa esa lista por `module.key`, descarta las filas con `module: null` (recursos sin módulo activo) o `module.type.id` distinto del tipo del rol, y usa qué `action.key` aparece en cada grupo (`read`→Ver, `write`→Crear, `update`→Modificar, `delete`→Eliminar) para decidir qué columnas tiene esa fila. `GET /modules?type_id=` solo aporta nombre, `sort_order` y estatus del módulo (no sus permisos), así que se cruza con lo anterior por `key`.

**Alternativas consideradas**: pedir que la API exponga un endpoint de "módulos con sus acciones" — fuera de alcance, no existe hoy y esta spec no modifica `mailySoft-usuarios`; hardcodear la lista de acciones por módulo en el frontend (como hace `clinicModuleCatalog.ts` de la 012 con su catálogo de módulos de suscripción) — descartado, porque aquí el catálogo de módulos es administrable (futura spec "Módulos") y cambia con los datos reales de cada entorno (hoy, local, solo hay 4 módulos de tipo Sistema).

## D4. La sección se gatea con un único recurso de permiso, `roles`

**Decisión**: `features/auth/policy/permissions.ts` ya reserva `'roles'` en `PERMISSION_RESOURCES`; se agrega también a `SECTION_RESOURCES` para que `can()`/`RequirePermission`/la navegación funcionen igual que con `users`, `subscriptions` y `token` (`resource: 'roles'`, acciones `read`/`write`/`update`/`delete` calcadas de los scopes del backend). Si al cargar la tabla de permisos faltan los scopes `permissions:read` o `modules:read` (de catálogos distintos en el backend), el detalle del rol se sigue mostrando y solo la tabla señala el error puntual (FR-020) — no se bloquea toda la sección por eso.

**Alternativas consideradas**: condicionar toda la sección a tener los tres recursos de permiso (`roles`+`permissions`+`modules`) — descartado: no hay precedente de una sección que combine varios recursos de permiso en este repo, y haría que alguien con `roles:read` pero sin los otros dos (una combinación de scopes que el backend sí permite) se quedara sin poder siquiera ver la lista de roles, que no depende de esos catálogos.

## D5. Pantalla maestro-detalle de una sola ruta, con el rol y la pestaña en la URL

**Decisión**: una ruta `/roles`, con el tipo de pestaña (`clinica`/`sistema`) y el id del rol elegido como search params (p. ej. `?type=clinica&roleId=6`), siguiendo el Principio III (estado navegable de listados en la URL) igual que `page`/`page_size`/`tab` en Usuarios y en la 012. Es la variante de patrón para Roles que ya reconoce la constitución v1.5.0 (Principio VI): lista + detalle en una sola pantalla en vez de rutas separadas.

**Alternativas consideradas**: rutas separadas `/roles` y `/roles/:id` como en Usuarios/Suscripciones — descartado porque el propio mockup (páginas 15-18) muestra lista y detalle siempre visibles a la vez, no una navegación de ida y vuelta; mantener la selección solo en estado local (sin URL) — descartado, rompe enlaces compartibles y el botón Atrás para algo que ya tiene un patrón establecido en el repo para selección de pestaña/filtros.

## D6. Guardar cambios del detalle: PATCH de nombre/descripción + diff de permisos, con fallos parciales explícitos

**Decisión**: "Guardar cambios" (FR-010, FR-021) junta dos operaciones independientes del backend, en este orden: 1) si el nombre o la descripción cambiaron, `PATCH /roles/{id}` primero (falla rápido y barato: un solo error de validación o de nombre repetido, antes de tocar permisos); si falla, no se intenta ningún permiso y la persona corrige el campo. 2) Si el PATCH no hacía falta o ya se aplicó, el diff de permisos: se compara el conjunto ya asociado (cargado al entrar, `GET /roles/{id}/permissions`) contra el marcado en la tabla, y se disparan solo las llamadas necesarias (`POST .../permissions` por cada alta, `DELETE .../permissions/{id}` por cada baja), en paralelo con concurrencia acotada. Si alguna de estas falla, la mutación no se reporta como éxito total: se refresca el rol y sus permisos desde el servidor (fuente de verdad) y se señalan por nombre los permisos que no se aplicaron, dejando reintentar solo esos (FR-018) — el nombre/descripción, si su PATCH ya había tenido éxito, queda guardado de todos modos. Un 409 `role_permission_already_associated` (al asociar) o `role_permission_not_associated` (al desasociar) se trata como éxito silencioso para ese permiso puntual: el estado deseado ya es el real, típicamente por una recarga con datos obsoletos.

**Alternativas consideradas**: un endpoint de "reemplazar todos los permisos" — no existe en la API y esta spec no la modifica; reportar éxito u error de forma binaria para todo el guardado — descartado, viola el Principio IV (la UI nunca debe aparentar éxito antes del estado terminal de cada operación) cuando varias llamadas independientes pueden fallar por separado.

## D7. Crear copiando permisos y Duplicar: mismo mecanismo, sin reversión si falla a medias

**Decisión**: ambos flujos son 1) `POST /roles` (crea el rol vacío, con el nombre nuevo) y, si se eligió copiar u duplicar, 2) `GET /roles/{origenId}/permissions` seguido de una asociación por cada permiso obtenido (mismo mecanismo de D6). Si el paso 1 falla, no se asocia nada. Si el paso 2 falla a medias, el rol creado en el paso 1 **no se revierte** ni se borra automáticamente: queda creado con los permisos que sí se aplicaron, y la persona lo completa o corrige desde su propio detalle (mismo flujo de la Historia 1), igual que exige FR-019.

**Alternativas consideradas**: deshacer (borrar) el rol recién creado si falla alguna asociación — descartado: añade una tercera operación que también puede fallar, y el Principio IV pide definir una compensación solo si hace falta una; aquí "dejarlo a medias y permitir corregirlo" ya es una compensación válida y más simple, porque el mismo detalle de rol de la Historia 1 sirve para terminarlo.

## D8. El simulador de roles se apoya en el `DirectoryModel` de `usersDirectory`; no duplica el catálogo de roles

Investigado leyendo `src/test/handlers/usersDirectory/{model,catalog,seed}.ts`: ese simulador **ya** modela `DirectoryRole` con `id`, `name`, `description`, `createdAt`, `statusId`, `typeId` y `permissions: readonly string[]` (nombres `recurso:accion` planos) — es la misma base de datos simulada que usa todo el sistema de capacidades (`accessOf`, `permissionsOf`) y la feature de Usuarios (`GET /api/v1/roles` vía `catalogHandlers`, que hoy responde sin `type`). Duplicar un segundo catálogo de "roles" para esta feature produciría dos fuentes de verdad del mismo dato y, peor, dos handlers MSW compitiendo por la misma ruta (`GET /api/v1/roles`) en cualquier prueba que monte los dos simuladores a la vez (toda prueba de integración ya monta `usersDirectory`, porque de ahí sale `/me` para resolver capacidades).

**Decisión**:

1. `usersDirectory/model.ts` gana `type` en `toRoleRecordDto` (campo aditivo; nada que ya lea ese DTO sin usar `.type` se rompe) y tres operaciones nuevas que **sí aplican reglas**, paralelas a `createUser`/`updateUser`/`blockUser`: `createRole({ name, description, typeId })`, `updateRole(id, changes)` y `deleteRole(id)` (baja lógica, sin bloquear por uso — igual que el backend real). Reglas verificadas contra el backend real (contracts/roles-service.md): nombre de 1 a 50, único entre roles con `statusId !== DELETED` sin distinguir mayúsculas (sea cual sea el tipo); `typeId` obligatorio y fijo al crear, ninguna operación de modificación lo acepta. Las operaciones libres de reglas que ya existían (`addRole`, `setRoleStatus`) siguen igual, para sembrar datos de prueba sin pasar por las reglas.
2. `src/test/handlers/rolesCatalog/` (nuevo) **no** vuelve a guardar la lista de roles: recibe por parámetro el mismo `DirectoryModel` que ya use `usersDirectory` en esa prueba (`createRolesCatalogMock(model, initial)`) y solo añade su propio estado nuevo — el catálogo de `Module` (id, key, name, type, sortOrder) y de `Permission` (id, name `recurso:accion`, módulo/acción resueltos agrupando por `key`, igual que D3) — más los handlers HTTP que faltan: `POST/PATCH/DELETE /roles` (llaman a `model.createRole`/`updateRole`/`deleteRole`), `GET/POST/DELETE /roles/:id/permissions`, `GET /permissions`, `GET /modules`, `GET /role-types`.
3. **Asociar/desasociar un permiso no crea una tabla de asociación nueva**: reutiliza `model.grant(roleName, permissionName)`/`model.revoke(roleName, permissionName)`, que ya es exactamente "esta `DirectoryRole` tiene/no tiene este `recurso:accion`". `GET /roles/:id/permissions` resuelve cada nombre de `role.permissions` contra el catálogo de `Permission` de este simulador (una sola fuente de verdad: si no hay módulo activo para ese nombre, no aparece, igual que D3 en producción). Así, una prueba que asocie `patients:read` a un role y luego inicie sesión como alguien con ese role ve el efecto en sus capacidades sin ningún paso de sincronización aparte.
4. El seed por omisión de este simulador reproduce el estado real de `create_database.sql` (research, contracts/roles-service.md): 4 módulos de Sistema (`users`, `roles`, `permissions`, `modules`) con sus 16 permisos, y 0 módulos de Clínica — el caso "pobre" real. Un seed "rico" alternativo (`richClinicModulesSeed`, varios módulos de Clínica con columnas desiguales como el mockup) se exporta aparte para las pruebas que necesitan ejercitar la tabla a fondo; ninguna prueba depende del seed por omisión de `usersDirectory` (`defaultDirectory`, con sus propios permisos de prueba para Administrator, que no se tocan).

**Alternativas consideradas**: un catálogo de roles independiente en `rolesCatalog/model.ts` — descartado, por la colisión de rutas y la duplicación de datos explicadas arriba; sincronizar dos listas de permisos (una de ids, otra de nombres) con un paso de propagación manual — descartado frente a reutilizar `grant`/`revoke` directamente, que ya es la única fuente de verdad y ya está probado.

## D9. Navegación, textos e ícono

**Decisión**: nueva entrada `{ id: 'roles', path: '/roles', labelKey: 'roles', resource: 'roles', icon: 'roles' }` **al inicio** de `sections` en `app/navigation/sections.ts` (antes de `users`); clave `roles: 'Roles y permisos'` en `shared/messages/es.ts` → `nav.sections` (junto a la ya reservada `clinics`); un ícono nuevo en `shared/ui/iconRegistry.ts` (`ShieldCheck` de `lucide-react`, ya dependencia del proyecto; se evita `KeyRound`, ya usado por `token`). Con esto el menú queda Panel, Roles y permisos, Usuarios, Suscripciones, Token — el orden que pide el spec (FR-002) mientras Módulos y Clínicas no sean todavía secciones.

**Alternativas consideradas**: insertar la sección después de Usuarios (más cerca del orden literal del mockup) — descartado, el spec pide explícitamente el orden final Panel/Módulos/Roles y Permisos/Usuarios/…, y la única posición que lo cumple hoy (sin Módulos aún) es antes de Usuarios.

## D10. Catálogo de errores de negocio nuevos para `describeRoleError`/`describePermissionAssociationError`

**Decisión**: además de los genéricos (401/403/404/422/5xx) que ya resuelve el cliente HTTP compartido, se mapean los códigos propios de este dominio a mensajes de campo o de negocio: `role_name_already_exists` (409, al nombre), `role_permission_already_associated` y `role_permission_not_associated` (409, tratados como D6), `role_permission_module_type_conflict` (409, no debería ocurrir si la UI ya filtra por tipo, pero se maneja por si hay una condición de carrera con el catálogo).

**Alternativas consideradas**: ninguna — es la misma técnica que ya usan `userErrors.ts` y el manejo de errores de la 012 (`describeSubscriptionError`), solo con el catálogo de códigos de este dominio.

## D11. Piezas nuevas o que cambian

Ver [Project Structure](plan.md#project-structure) en plan.md.
