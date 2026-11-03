# Implementation Plan: Lista de roles y permisos en tabla, como la de Usuarios

**Branch**: `027-roles-grid-list` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/027-roles-grid-list/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

«Roles y permisos» deja de ser una pantalla maestro-detalle. `/roles` pasa a ser una **tabla a todo
lo ancho** como la de Usuarios —columnas Nombre, Estatus, Tipo y «n permisos», pie «Filas por página»
y, encima, los filtros de Tipo y Estatus de la 025— y el detalle de un role pasa a su **propia ruta**,
`/roles/:roleId`, a la que se llega con el nombre del role y de la que se vuelve a la misma tabla con
«Volver al listado». Lo que ocurre dentro del detalle (permisos con botones, guardar, duplicar,
bloquear, eliminar) no cambia.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Ningún cambio de API** (D1): `GET /roles` ya devuelve todos los roles de un estatus, sin
   paginar y con su estatus, y no deja pedir los eliminados, así que la columna Estatus solo dice
   Activo o Bloqueado.
2. **Dos rutas** (D2): la tabla en `/roles` y el detalle en `/roles/:roleId`, con su título de pestaña
   y un id no válido como «Página no encontrada».
3. **La dirección de la tabla** (D3): `type` y `status` de la 025, más `page` y `page_size` como en
   Usuarios; `roleId` pasa a ser un enlace antiguo que `RolesPage` redirige al detalle.
4. **La tabla pagina en pantalla la lista completa** (D4): `rolesOfType` y `pageOfRoles` cortan la
   página, `RolesGrid` (la rejilla de Usuarios, en modo «servidor» con `rowCount`) recibe solo esas
   filas, y los permisos se piden solo para ellas.
5. **Qué detalle se muestra** (D5): `resolveRoleView` decide entre activo, bloqueado, «ya no existe»,
   cargando y error a partir de las dos listas por estatus; la de bloqueados solo se pide si hace
   falta.
6. **«Volver al listado»** (D6): el nombre de la tabla lleva la dirección de la tabla en el estado
   del historial, validada con Zod, como el detalle de un usuario.
7. **Crear y duplicar** (D7): la tabla a la que se vuelve muestra el role (Estatus Activos, Tipo si
   hacía falta, la página donde está); al crear se reemplaza la entrada de la tabla antes de empujar
   el detalle, para que también Atrás lo muestre.
8. **Bloquear, desbloquear y eliminar** (D8) vuelven a la tabla con `replace`, y el foco al título lo
   mueve `useRouteAccessibility`: desaparece el efecto de foco de la 025.
9. **Cambios sin guardar** (D9): la guarda y su diálogo suben a la pantalla de detalle.
10. **Enmienda MINOR de la constitución** (D13, 1.7.1 → 1.8.0): el spec dice que la variante
    maestro-detalle «se retira»; se **sustituye** por una variante que describe lo que queda de
    permanente (listado paginado en pantalla porque la API no pagina, alta en diálogo y edición en el
    detalle), porque quitarla sin más dejaría a Roles incumpliendo dos reglas del patrón general.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js ≥ 24.15.0 (`engines`), sin cambios.

**Primary Dependencies**: las ya en uso, sin dependencias nuevas. MUI 9.5.0, MUI X Data Grid 9.15.0 (community, ya usado por Usuarios, Suscripciones y Salud), React Router 8.4.0 (`useSearchParams`, `useBlocker`, `Navigate`, `useLocation`), TanStack Query 5.104.4, Zod 4.6.7.

**Storage**: N/A. Estado de servidor en TanStack Query (las dos listas por estatus, sin cambios); estado navegable (tipo, estatus, página y tamaño) en la dirección (constitución III); `listSearch` en el estado de la entrada del historial, derivado de la dirección y validado; sin almacenamiento en el navegador.

**Testing**: Vitest 5.0.5, Testing Library 16.3.3, user-event 14.6.8, vitest-axe 0.1.0, MSW 3.0.3 (simuladores `usersDirectory` y `rolesCatalog`, sin cambios), Playwright 1.64.1 (e2e migrado, solo con cuentas de prueba). Pruebas en esta máquina con `--maxWorkers=2 --testTimeout=60000`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, claro y oscuro.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio.

**Performance Goals**: SC-010: los nombres de la primera página en menos de 2 s hasta con 100 roles. Los permisos se piden solo para las filas de la página (≤ `page_size`, 10 por omisión; hoy, una consulta por role activo) y comparten clave con el detalle. Las dos pantallas son rutas diferidas: el bundle de entrada no debería crecer (presupuesto 320 KB gzip).

**Constraints**: `RoleDetailPanel` sigue funcionando exactamente igual (FR-011) y ≤ 250 líneas; los filtros no cambian (FR-007); la tabla, indistinguible de la de Usuarios en su aspecto (FR-006, SC-004); sin consultas de permisos para roles bloqueados; sin peticiones nuevas en el caso normal (D5); la guarda de cambios sin guardar cubre toda salida del detalle (FR-020); no tocar `features/users` ni `features/modules` (la tabla de Usuarios es solo la referencia).

**Scale/Scope**: 3 componentes nuevos (`RolesGrid`, `RolesTable`, `RoleDetailPage`) y 1 ruta de `app` (`RoleDetailRoute`); 2 hooks nuevos (`useRoleView`, `useRevealRole`) y 2 modificados (`useRolePermissionsLocation`, `useVisibleRoles`); 2 esquemas nuevos (`roleView`, `roleDetailState`) y 1 reescrito (`rolePermissionsLocation`); 3 componentes modificados (`RolesPage` reescrito, `RoleDetailPanel`, `BlockedRoleDetail`) y 1 eliminado (`RolesList`); un bloque de textos en `es.ts`; la clave de título y el parámetro de ruta en `useRouteAccessibility`; ≈ 20 archivos de pruebas nuevos o migrados y el e2e.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.1 (y v1.8.0 tras la enmienda de D13). «Antes» es el estado al
iniciar la investigación y «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Estructura por features; sin importar internos de otra | Todo en `features/roles`; las constantes de paginación se repiten, como ya hacen Usuarios, Suscripciones y Salud; los estilos de la rejilla vienen de `shared/ui`; `app` solo importa `parseRoleId` y las pantallas por el `index.ts` | ✅ | ✅ |
| I. Componentes pequeños; archivo ≤ 250 líneas | `RoleDetailPanel` (246) pierde el hook de la dirección y gana `onDeleted` (D12); los nuevos quedan por debajo de 180 | ⚠️ | ✅ |
| I. Sin `useEffect` para derivar estado | «Ya se mostró como activo» se deriva ajustando estado en el render (D5); los efectos que quedan sincronizan con la dirección (canonizar, corregir página) y con el foco (el de la 025 se retira, D8) | ✅ | ✅ |
| II. Datos validados en la frontera | La dirección y el estado del historial se leen con Zod (valor por omisión o descarte); la API no cambia | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; claves por factoría | `roleKeys.list(status)` y `roleKeys.permissions(id)` sin cambios; nada se copia a `useState`; leer la caché en un manejador (D7) no es copiarla | ✅ | ✅ |
| III. Estado navegable de listados en la URL | `type`, `status`, `page` y `page_size` en los search params; valores no válidos → omisión con `replace` (D3) | ✅ | ✅ |
| IV. Contratos REST, backend fuente de verdad | Ninguna operación nueva; el detalle de un role bloqueado sale de la lista de bloqueados porque la API no lo da (D5) | ✅ | ✅ |
| IV. Mutaciones sin reintento y sin doble envío | Las mutaciones y sus acciones no cambian | ✅ | ✅ |
| IV. Paginación en servidor; no descargar la colección completa para paginarla en el cliente | La API de roles no pagina; la tabla pagina en pantalla la lista que ya se descargaba completa (D4). Variante permanente: se reconoce en la enmienda D13, no en Complexity Tracking | ⚠️ | ✅ (con la enmienda aprobada en el PR) |
| IV. Fechas en ISO, formateo solo en presentación | La tabla ya no muestra fechas | ✅ | ✅ |
| V. Autorización por el módulo de políticas; rutas protegidas | Las dos rutas bajo `RequirePermission resource="roles"`; las acciones se gobiernan con `RoleCapabilities` (sin cambios); el 403 sigue en `describeRoleError` | ✅ | ✅ |
| VI. Mismo patrón Listar/Mostrar/Crear/Modificar/Eliminar | Tabla paginada y detalle en ruta propia; el alta en diálogo y la edición en el detalle son la variante reconocida por D13 | ⚠️ | ✅ (con la enmienda aprobada en el PR) |
| VI. Estados cargando, vacío, error y éxito | En la zona de la tabla, sin ocultar título, filtros ni «Nuevo role» (FR-009); avisos de éxito, «ya estaba» y error como hoy | ✅ | ✅ |
| VI. Confirmación que nombra el recurso | Bloquear y eliminar sin cambios; aviso de cambios sin guardar al salir del detalle (D9) | ✅ | ✅ |
| VI. Textos en español y centralizados; Data Grid localizado | Claves nuevas en `messages.roles` y `messages.titles`; sin literales en JSX; la rejilla usa la localización de siempre | ✅ | ✅ |
| VI. WCAG 2.1 AA | Rejilla con nombre accesible y enlaces con teclado, foco por el efecto de ruta, anuncio del cambio de página, `axe` en las dos pantallas | ✅ | ✅ |
| VI. Responsive | Rejilla con desplazamiento interno, pie en varias líneas, encabezado y filtros con `flexWrap` | ✅ | ✅ |
| VII. Pruebas en el mismo PR; MSW, sin mockear `fetch`; lógica pura primero | D14: esquemas y funciones puras antes que componentes; simuladores sin cambios | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks` | Pruebas nuevas para `rolePermissionsLocation`, `roleView`, `roleDetailState`, `useRolePermissionsLocation`, `useRoleView` y `useRevealRole` | ✅ | ✅ |
| Stack y presupuesto de bundle | Ninguna dependencia nueva; las dos pantallas son diferidas | ✅ | ✅ |

Filas no listadas (Auth0, cliente HTTP único, configuración por entorno, observabilidad): sin cambios.

**Resultado**: tres puntos marcados antes del diseño. El tamaño de `RoleDetailPanel` queda resuelto
por el propio diseño (D12) y se comprueba al implementar; la paginación en pantalla (IV) y el patrón
de Roles (VI) se resuelven con una sola enmienda MINOR (D13), que va en el mismo PR y que aprueba el
responsable del proyecto. Nada que registrar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/027-roles-grid-list/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── app-routes.md    # rutas, direcciones, enlaces antiguos, estado e historial (D2, D3, D6)
│   └── roles-ui.md      # tabla, detalle, destinos tras cada acción, textos y accesibilidad
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── router/
│   │   ├── routes.tsx                       # /roles: índice + ':roleId' (D2)
│   │   └── roles/
│   │       ├── RoleDetailRoute.tsx          # NUEVO: capacidades + id válido (D2)
│   │       └── *.integration.test.tsx       # seis migradas + rolesTable nueva (D14)
│   └── layouts/
│       ├── useRouteAccessibility.ts         # + clave roleDetail y roleIdParam (D2, D11)
│       └── useRouteAccessibility.roles.test.tsx
├── features/roles/
│   ├── index.ts                             # + RoleDetailPage (lazy) y parseRoleId (D11)
│   ├── schemas/
│   │   ├── rolePermissionsLocation.ts       # type/status/page/page_size, legacyRoleIdOf, parseRoleId, pageOfRoles, lastPageOf, pageOfRole, locationAfterCreate, emptyRolesMessage (D3, D4, D7)
│   │   ├── roleView.ts                      # NUEVO: resolveRoleView (D5)
│   │   └── roleDetailState.ts               # NUEVO: parseRoleDetailState (D6)
│   ├── hooks/
│   │   ├── useRolePermissionsLocation.ts    # type, status, page, page_size, search (D3)
│   │   ├── useVisibleRoles.ts               # recibe { type, status } (D4)
│   │   ├── useRoleView.ts                   # NUEVO: las dos listas y «ya se mostró» (D5)
│   │   └── useRevealRole.ts                 # NUEVO: la tabla que muestra un role nuevo (D7)
│   └── components/
│       ├── RolesPage.tsx                    # REESCRITO: envoltura de enlaces antiguos + pantalla de la tabla
│       ├── RolesTable.tsx                   # NUEVO: zona de la tabla: estados, anuncio, página inexistente (D4)
│       ├── RolesGrid.tsx                    # NUEVO: columnas y pie, como UsersGrid (D10)
│       ├── RoleDetailPage.tsx               # NUEVO: título, volver, vistas, guarda y destinos (D5–D9)
│       ├── RoleDetailPanel.tsx              # + onDeleted; sin useRolePermissionsLocation (D8)
│       ├── BlockedRoleDetail.tsx            # sin su h2 de nombre (D12)
│       └── RolesList.tsx                    # ELIMINADO (con su prueba)
└── shared/messages/es.ts                    # roles.list, roles.detail y titles.roleDetail (D11)
.specify/memory/constitution.md              # 1.8.0: variante de Roles en el Principio VI (D13)
e2e/roles.spec.ts                            # migrado: elegir un role es pulsar su nombre (D14)
```

**Structure Decision**: se mantiene la estructura por features (`app → features → shared`). Todo lo
nuevo vive en `features/roles`; `app` solo gana la ruta del detalle y la clave de título; en `shared`
solo cambian los textos. **Archivos compartidos con otro trabajo** (posible conflicto al fusionar):
`src/shared/messages/es.ts` (el bloque `roles` es de esta feature) y `.specify/memory/constitution.md`.
Ningún archivo de `features/users` ni de `features/modules`, ni de `src/test/handlers`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación que justificar: los tres puntos del Constitution Check se resuelven con un tamaño
de archivo que el diseño mantiene (D12) y con una enmienda MINOR de la constitución (D13) que
reconoce las dos variantes permanentes de Roles. Si el responsable no aprobara la enmienda, la
paginación en pantalla y el patrón de Roles pasarían a ser dos filas de esta tabla.
