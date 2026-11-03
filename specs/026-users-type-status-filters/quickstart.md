# Quickstart: validar la lista de usuarios con filtros de Tipo y Estatus

**Feature**: `026-users-type-status-filters` | **Plan**: [plan.md](plan.md)

## 1. Comprobaciones automáticas

```bash
npm run typecheck
npm run lint
npm run format:check
npm test -- src/features/users src/app/router/users src/test/handlers/usersDirectory --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000
npm run build
npm run size
```

Esperado: todo en verde; `size` dentro del presupuesto de la ruta de entrada (la de Usuarios es
diferida).

E2E (solo con las cuentas de prueba de Auth0 configuradas, como el resto de `e2e/users.spec.ts`):

```bash
npm run test:e2e -- e2e/users.spec.ts
```

## 2. Recorrido manual

**Requisitos**: el Backoffice con `VITE_USERS_API_URL` apuntando a una API de usuarios **5.5.0 o
posterior** (ver [contracts/users-list-service.md](contracts/users-list-service.md); con una anterior
la tabla muestra el error de carga, D2) y una persona con `users:read` (y `users:update` para el
paso 6). Datos mínimos: un usuario activo de Sistema, uno activo de Clínica, uno activo sin roles, uno
bloqueado de cada tipo y, si se puede, uno con roles Activos de ambos tipos.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir `/users` | Grupos «Tipo» y «Estatus» con **Todos** y **Activos** pulsados; tabla de activos con la columna «Tipo»; el usuario sin roles muestra «—» (SC-002, US1-1, US1-5) |
| 2 | Pulsar **Sistema**, luego **Clínica**, luego **Todos** | Cada tabla muestra solo ese tipo, con su total; el usuario con ambos tipos aparece en las dos y dice «Sistema y Clínica»; la dirección cambia a `type_id=1`, `type_id=2` y sin `type_id` (US1-2, US1-3) |
| 3 | Pulsar **Bloqueados** y combinar con cada Tipo | Solo usuarios bloqueados, cada uno con el chip «Bloqueado» junto al nombre; ningún activo (US2-1 a US2-3, SC-001, SC-003) |
| 4 | Con un filtro sin resultados (p. ej. Bloqueados + Sistema sin nadie) | «No hay usuarios bloqueados de Sistema», sin «Crear usuario» en el vacío; filtros, buscador y título visibles (US2-5, FR-013) |
| 5 | Ir a la página 2 (si hay) y cambiar un filtro | Vuelve a la página 1 con el mismo tamaño (US3-2) |
| 6 | Abrir un bloqueado, **Desbloquearlo** y volver con «Volver al listado» | La lista conserva filtros, página y tamaño; el usuario ya no está en Bloqueados y sí en Activos (US2-4, SC-007) |
| 7 | Recargar con filtros, página y tamaño elegidos | Todo sigue igual (US3-1, SC-005) |
| 8 | Abrir `/users?page=2&page_size=25` | Página 2 de activos de ambos tipos, 25 por página (US3-3, SC-004) |
| 9 | Abrir `/users?type_id=7&status_id=3` | Abre con Todos + Activos y la dirección queda `/users`, sin error (US3-4) |
| 10 | Con **Activos** pulsado, buscar el correo de un bloqueado | Lo encuentra; la dirección conserva los filtros (US3-5, SC-006) |
| 11 | **Limpiar** la búsqueda | Vuelve a la tabla con los mismos filtros (US3-6) |
| 12 | Buscar un correo y pulsar **Bloqueados** | Termina la búsqueda y muestra la tabla de bloqueados (D4) |
| 13 | Quitar en otra pestaña el único role de un usuario (o bloquear ese role en Roles) y volver a Usuarios | El usuario aparece con «—» y deja de salir al filtrar por su tipo (D5) |
| 14 | Recorrer los filtros solo con el teclado y con un lector de pantalla | Tab entra a cada grupo, flechas entre botones, Espacio/Enter elige; se anuncian «Tipo»/«Estatus», el texto y si está pulsado, y tras cada cambio «Mostrando X a Y de Z usuarios.» o el texto del vacío (US4-1 a US4-3) |
| 15 | Reducir la ventana a 320 px (claro y oscuro) | Filtros y buscador en varias líneas, sin desplazamiento horizontal ni texto cortado; los grupos se ven iguales que en Módulos y Roles (US4-4, SC-009) |
