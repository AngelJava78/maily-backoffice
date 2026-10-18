# Contrato de la interfaz: rutas, capacidades y estados de la sección Usuarios

**Feature**: `002-manage-users` | **Fecha**: 2026-10-18 | **Spec**: [../spec.md](../spec.md)

Amplía [../../001-auth-session-profile/contracts/app-routes.md](../../001-auth-session-profile/contracts/app-routes.md) (guarda, avisos y accesibilidad de las pantallas). La sección se registra en `app/navigation/sections.ts` (`id` `users`, ruta `/users`, recurso `users`, texto `Usuarios`) y todas sus rutas viven dentro de la guarda `ProtectedRoute` y del layout con `RequirePermission resource="users"`.

## Rutas

| Ruta | Permisos para entrar | Pantalla | Parámetros |
|---|---|---|---|
| `/users` | `users:read` | Listado y búsqueda por correo | Búsqueda en la URL (abajo) |
| `/users/new` | `users:write`, `users:update` y `roles:read` | Crear usuario | — |
| `/users/:userId` | `users:read` | Detalle del usuario | `userId`: entero ≥ 1; cualquier otro valor muestra «Página no encontrada» |
| `/users/:userId/edit` | `users:read` y `users:update` | Editar nombre y apellidos | `userId` como arriba |

- Sin `users:read` la guarda de la sección manda a `/` con el aviso de siempre (001, FR-021). Sin el permiso extra de una ruta (`/users/new`, `/users/:userId/edit`) se vuelve a la pantalla de origen de la sección (`/users` o el detalle) con el aviso «No tienes permiso para realizar esta acción.»; el servicio sigue siendo quien decide (`403`).
- Cada ruta declara `handle.titleKey` (`users`, `userCreate`, `userDetail`, `userEdit`) y su `ErrorBoundary`; las pantallas se cargan con `React.lazy` y comparten el `Suspense` del layout. El foco va al `h1` tras cada cambio de ruta (001), por lo que cada pantalla pinta su `h1` desde el primer render, aunque los datos estén cargando.

## Estado del listado en la URL (constitución III)

| Parámetro | Valores | Por defecto | Notas |
|---|---|---|---|
| `page` | entero ≥ 1 (en la URL empieza en 1; el Data Grid usa 0) | 1 | Si es mayor que `pages` (por ejemplo, tras bloquear al último usuario de la última página) se reemplaza por la última página. |
| `page_size` | 10, 25 o 50 | 10 | Cambiarlo vuelve a `page=1` (spec, US1-2). |
| `email` | texto | — | Si está presente es una **búsqueda** y manda sobre `page` y `page_size`, que se descartan. |

Todo valor inválido se reemplaza por su valor por defecto (la URL se normaliza con `replace`, sin añadir entradas al historial). El correo buscado se valida igual que en el alta antes de consultar (vacío o sin formato = error junto al campo, sin llamada).

## Estado de navegación (no se muestra, se valida con Zod)

| Origen → destino | `location.state` | Uso |
|---|---|---|
| Listado o búsqueda → detalle | `{ listSearch: "?page=3&page_size=25" }` (solo claves `page`, `page_size`, `email`) | «Volver al listado» regresa a `/users` con esa búsqueda (US1-4). Sin estado (enlace directo o recarga sin historial) vuelve a `/users`. |
| Alta con fallo parcial → detalle | `{ rolesNotAssigned: [{ id, name }] }` | El detalle muestra el aviso de roles pendientes con «Reintentar» (spec US2-9, FR-023). Se limpia al terminar o descartar. |

## Pantallas y estados

| Pantalla | Cargando | Vacío | Error | Éxito |
|---|---|---|---|---|
| Listado | Data Grid con indicador de carga | «No hay usuarios activos» con «Crear usuario» (solo si puede crear) | Bloque de error con «Reintentar» (las lecturas se reintentan solas hasta 2 veces) | Filas con **nombre completo** (enlace al detalle), **correo** y **fecha de alta**; total, página y tamaño |
| Búsqueda | Indicador | «No se encontró ningún usuario con ese correo» (no es un error) con «Limpiar búsqueda» | Bloque de error con «Reintentar» | Tarjeta con nombre, correo, **estatus**, fecha de alta y enlace «Ver detalle» |
| Detalle | Indicador bajo el `h1` | — | `404`: «Usuario no encontrado» con enlace al listado; otros: bloque de error con «Reintentar» | Datos, estatus, roles y acciones |
| Roles del detalle (sección) | Indicador local | «Sin roles» | Error local con «Reintentar» (el resto del detalle sigue visible) | Lista de roles; para un usuario no activo, aviso «Los roles de este usuario no se muestran mientras no esté activo.» |
| Alta y edición | Catálogo de roles cargando: campo de roles deshabilitado con indicador | Catálogo vacío: aviso y «Guardar» deshabilitado | Catálogo con error: aviso con «Reintentar» y «Guardar» deshabilitado | Confirmación y navegación al detalle |

## Capacidades (permiso → acción)

La decisión siempre pasa por `can()` (módulo `features/auth/policy`); `app` la evalúa y entrega los resultados a las pantallas como propiedades (research D2 y D3). Todas exigen además `users:read` (regla de `can()`: sin `read` no se ofrece nada de la sección).

| Capacidad | Permisos |
|---|---|
| Ver listado, buscar, ver detalle y roles de un usuario | `users:read` |
| Crear usuario | `users:write` + `users:update` + `roles:read` |
| Editar nombre y apellidos | `users:update` |
| Agregar un role | `users:update` + `roles:read` |
| Quitar un role | `users:update` |
| Bloquear, desbloquear y reactivar | `users:update` |
| Eliminar | `users:delete` |

## Acciones disponibles por estatus (spec FR-019)

| Estatus del usuario | Acciones |
|---|---|
| Activo (1) | Editar, agregar role, quitar role, bloquear, eliminar |
| Bloqueado (2) | Desbloquear |
| Eliminado (3) | Reactivar |
| Cualquier otro | Ninguna (solo consulta) |

Una acción se ofrece si el **estatus** la admite **y** el operador tiene la **capacidad**. **Autoprotección** (FR-012, solo de interfaz): cuando el usuario del detalle es el propio operador no se ofrecen bloquear, eliminar, agregar ni quitar roles, y se muestra una nota que lo explica; editar su nombre sí se permite.

## Confirmaciones y avisos

| Acción | Confirmación (nombra al usuario) | Aviso de éxito |
|---|---|---|
| Bloquear | «La persona no podrá iniciar sesión mientras esté bloqueada.» | Usuario bloqueado |
| Desbloquear | «La persona podrá iniciar sesión de nuevo.» | Usuario desbloqueado |
| Eliminar | «Dejará de aparecer en el listado y no podrá iniciar sesión; podrás reactivarlo.» | Usuario eliminado |
| Reactivar | «Volverá a estar activo con sus roles anteriores y podrá iniciar sesión.» | Usuario reactivado |
| Agregar role | Diálogo con el role elegido y el usuario; el botón confirma | Role agregado |
| Quitar role | «Se quitará el role {role} a {usuario}.» | Role quitado |
| Crear / Editar | Sin diálogo (formulario con «Guardar» y «Cancelar») | Usuario creado / Datos guardados |

Los diálogos de confirmación llevan el foco a «Cancelar» al abrirse en las acciones que cambian si la persona puede iniciar sesión, se cierran con `Esc` y devuelven el foco al botón que los abrió. Mientras la mutación está pendiente ambos botones se deshabilitan. Los errores de cada acción siguen la tabla de [users-service.md](users-service.md) y nunca cambian lo mostrado hasta que el servicio responde.

## Accesibilidad

Mismas reglas que la 001 (regiones, título por ruta, foco al `h1`). Además: el formulario de búsqueda tiene su etiqueta y `role="search"`; el resultado de una búsqueda se anuncia en una región `aria-live="polite"`; los campos del formulario tienen etiqueta visible, marcan los obligatorios y asocian su error con `aria-describedby` (MUI); el campo de contraseña tiene un botón con nombre accesible para mostrarla u ocultarla; el estatus se muestra con texto (no solo con color); el listado se reacomoda hasta 320 px con desplazamiento horizontal dentro del propio recuadro de la tabla (WCAG 1.4.10 exceptúa las tablas de datos; 001, D20).
