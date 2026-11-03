# Implementation Plan: Lista de usuarios con filtros de Tipo y Estatus

**Branch**: `026-users-type-status-filters` (rama de trabajo `claude/026-users-type-status-filters-dd6978`) | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/026-users-type-status-filters/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La pantalla «Usuarios» gana, junto al buscador por correo, los mismos dos grupos de botones de
alternancia que Módulos y Roles —**Tipo** (Todos | Sistema | Clínica) y **Estatus** (Activos |
Bloqueados), con Todos y Activos por omisión—. La tabla, paginada en el servidor como hoy, muestra los
usuarios que cumplen ambos filtros, con una columna **Tipo** («Sistema», «Clínica», «Sistema y
Clínica» o «—») y el chip «Bloqueado» junto al nombre de los bloqueados. El tipo de un usuario es el de
sus roles Activos y el estatus es el suyo propio (Clarifications del 2026-11-03).

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Contrato: la API de usuarios 5.5.0** (spec 018, `4fe6935`), ya implementada (D1):
   `GET /api/v1/users?status_id&role_type_id` y `role_types` en cada usuario. Ninguna otra operación
   cambia.
2. **`role_types` obligatorio al validar** (D2): contra una API anterior, que ignoraría los filtros, la
   tabla muestra el error de carga en vez de datos equivocados.
3. **La dirección gana `type_id=1|2` y `status_id=2`**, como Módulos (D3); lo que es por omisión no se
   escribe, así que los enlaces anteriores (`?page&page_size`) siguen siendo canónicos.
4. **La búsqueda por correo conserva los filtros** en la dirección y no los aplica; pulsar un filtro
   durante la búsqueda la termina y muestra la tabla filtrada (D4).
5. **Una consulta por combinación** (`userKeys.list({ page, pageSize, type, status })`),
   `refreshAfterRoleChange` invalida también las listas y `useUsersPage` vuelve a pedir la página al
   montarse, para que el tipo esté al día tras cambios de roles hechos en otra pantalla (D5).
6. **`UserListItem`** = `PlatformUser` + `roleTypes`, construido desde el objeto DTO de `UserRead` (D6);
   el texto del tipo lo decide una función pura por id (D7).
7. **`UsersGrid`** con columna Tipo y chip de estatus (D8); **`UsersFilters`** copia de `RolesFilters`
   (D9); vacíos por combinación y anuncio en `LiveStatus` (D10); **`UsersList`** sale a su propio
   archivo (D13).
8. **Simulador MSW** con la regla de la 5.5.0 (D11) y pruebas unitarias, de componentes, de
   integración y e2e (D12).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js ≥ 24.15.0 (`engines`), sin cambios.

**Primary Dependencies**: las ya en uso, sin dependencias nuevas. MUI 9.5.0 (`ToggleButton`/`ToggleButtonGroup` como en `ModulesFilters` y `RolesFilters`), MUI X Data Grid 9.15.0 (paginación en servidor), React Router 8.4.0 (`useSearchParams`), TanStack Query 5.104.4, Zod 4.6.7, React Hook Form 7.90.0 (el buscador, sin cambios).

**Storage**: N/A. Estado de servidor en TanStack Query (una página por combinación de filtros); estado navegable (tipo, estatus, página, tamaño, correo buscado) en la dirección (constitución III); sin almacenamiento en el navegador.

**Testing**: Vitest 5.0.5, Testing Library, user-event, vitest-axe, MSW 3.0.3 (simulador `usersDirectory` ampliado), Playwright 1.64.1 (`e2e/users.spec.ts`, solo con cuentas de prueba). En esta máquina: `--maxWorkers=2 --testTimeout=60000 --hookTimeout=60000`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, claro y oscuro.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio.

**Performance Goals**: cambiar de filtro actualiza la tabla en < 2 s para hasta 1 000 usuarios (SC-010): una sola petición por cambio de botón o de página, resuelta por la API sin una consulta por usuario (FR-019/FR-020 de la 018). La ruta de Usuarios ya es diferida; el bundle de entrada no debería crecer (presupuesto 320 KB gzip).

**Constraints**: la API desplegada debe ser 5.5.0 o posterior (D2); siempre un botón pulsado por grupo (FR-003); filtros indistinguibles de los de Módulos y Roles (FR-015); no cambiar el detalle, sus acciones, la creación ni el resultado de la búsqueda (FR-018); archivos de componente ≤ 250 líneas; no tocar `features/modules` ni `features/roles` (la 024 tiene trabajo sin integrar en Módulos).

**Scale/Scope**: 2 componentes nuevos (`UsersFilters`, `UsersList` extraído) y 2 modificados (`UsersListPage`, `UsersGrid`); 1 esquema nuevo (`userListItem`) y 3 modificados (`user`, `userPage`, `usersLocation`); 4 hooks modificados (`useUsersLocation`, `useUsersPage`, `userKeys`, `refreshUser`); `listUsers` con 2 parámetros nuevos; un bloque de textos en `es.ts`; simulador MSW y fábricas de pruebas; ≈ 12 archivos de pruebas nuevos o ampliados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.1. «Antes» es el estado al iniciar la investigación y «Después»,
tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Estructura por features; sin importar internos de otra | Todo en `features/users`; `UsersFilters` no importa `RolesFilters` ni `ModulesFilters` (D9); textos en `shared/messages` | ✅ | ✅ |
| I. Componentes pequeños; archivo ≤ 250 líneas | `UsersListPage` (196) crecería: `UsersList` sale a su archivo y los vacíos a una función pura (D13) | ⚠️ | ✅ |
| I. Sin `useEffect` para derivar estado | Ningún efecto nuevo; los existentes (corregir la dirección y la página inexistente) sincronizan con la URL, un sistema externo | ✅ | ✅ |
| II. Datos validados en la frontera | `userListItemSchema` exige `role_types` (D2, D6); la dirección se lee con Zod y `catch` al valor por omisión (D3) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; claves por factoría | `userKeys.list({ page, pageSize, type, status })`; nada se copia a `useState` (D5) | ✅ | ✅ |
| III. Toda mutación invalida lo que afecta | Asignar o quitar roles cambia el tipo: `refreshAfterRoleChange` invalida también `userKeys.lists()` (D5) | ⚠️ | ✅ |
| III. Estado navegable de listados en la URL | `type_id`, `status_id`, `page`, `page_size` y `email` en los search params; valores no válidos → omisión con `replace` (D3, D4) | ✅ | ✅ |
| IV. Contratos REST; backend fuente de verdad | Filtrado, conteo, paginación y tipo los resuelve la API 5.5.0; el cliente no recalcula el tipo (D1, D7) | ✅ | ✅ |
| IV. Paginación y filtros en servidor | `page`, `page_size`, `status_id`, `role_type_id` viajan a la API; nunca se descarga la colección (D1) | ✅ | ✅ |
| V. Autorización por el módulo de políticas | Sin cambios: misma ruta, mismo permiso `users:read`, «Crear usuario» con `capabilities.canCreate` | ✅ | ✅ |
| VI. Estados cargando, vacío, error y éxito | En la zona de la tabla, sin ocultar título, buscador ni filtros; vacíos por combinación (D10) | ✅ | ✅ |
| VI. Patrón Listar/Mostrar/Crear/Modificar/Eliminar | El listado sigue paginado con detalle en su ruta; solo gana filtros | ✅ | ✅ |
| VI. Textos en español y centralizados | `users.filters`, `users.list.columns.type`, `noType`, `typeJoin` y vacíos en `es.ts` | ✅ | ✅ |
| VI. WCAG 2.1 AA | Grupos con nombre accesible, `aria-pressed`, flechas; chip legible en la fila; anuncio sin mover el foco (D10); axe en `UsersListPage.test.tsx` y `UsersFilters.test.tsx` | ✅ | ✅ |
| VI. Responsive | Fila de filtros y buscador con `flexWrap`, sin desplazamiento horizontal a 320 px (D9) | ✅ | ✅ |
| VII. Pruebas en el mismo PR; MSW, sin mockear `fetch` | Simulador con la regla de la 5.5.0 (D11); pruebas unitarias, de componentes, de integración y e2e (D12) | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks` | Pruebas nuevas o ampliadas para `usersApi`, `userListItem`, `userPage`, `usersLocation`, `userKeys`, `useUsersPage`, `useUsersLocation`, `refreshUser` | ✅ | ✅ |
| Stack y presupuesto de bundle | Ninguna dependencia nueva; la ruta es diferida | ✅ | ✅ |

Filas no listadas (Auth0, cliente HTTP único, configuración por entorno, observabilidad): sin cambios.

**Resultado**: dos puntos marcados antes del diseño (el tamaño de `UsersListPage` y la invalidación
tras cambiar roles, ahora que la lista muestra el tipo) quedan resueltos por el diseño (D13, D5). Nada
que registrar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/026-users-type-status-filters/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── users-list-service.md   # U1 de la API de usuarios 5.5.0: status_id, role_type_id, role_types (D1, D2)
│   └── users-list-ui.md        # dirección, filtros, tabla, vacíos, anuncios y textos
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── features/users/
│   ├── api/
│   │   └── usersApi.ts                   # listUsers({ page, pageSize, statusId, roleTypeId }) (D1)
│   ├── schemas/
│   │   ├── user.ts                       # exporta platformUserDtoSchema y toPlatformUser (D6)
│   │   ├── userListItem.ts               # NUEVO: userListItemSchema, UserListItem, describeUserType (D6, D7)
│   │   ├── userPage.ts                   # items: userListItemSchema
│   │   └── usersLocation.ts              # filtros en ambos modos, parse/serialize, emptyUsersMessage (D3, D4, D13)
│   ├── hooks/
│   │   ├── userKeys.ts                   # UserListParams + type, status (D5)
│   │   ├── useUsersPage.ts               # filtros → statusId/roleTypeId; refetchOnMount 'always' (D5)
│   │   ├── useUsersLocation.ts           # setType, setStatus; búsqueda y limpiar conservan filtros (D4)
│   │   └── refreshUser.ts                # refreshAfterRoleChange invalida también lists() (D5)
│   └── components/
│       ├── UsersListPage.tsx             # fila de filtros + buscador; delega la tabla en UsersList (D9, D13)
│       ├── UsersList.tsx                 # NUEVO (extraído): consulta, página inexistente, vacío, error, anuncio (D10, D13)
│       ├── UsersFilters.tsx              # NUEVO: Tipo y Estatus (D9)
│       └── UsersGrid.tsx                 # UserListItem; columna Tipo; chip de estatus; vacío por props (D8)
├── shared/messages/es.ts                 # users: + filters, list.columns.type, noType, typeJoin, vacíos
├── shared/ui/dataGridAugmentation.d.ts   # NoRowsOverlayPropsOverrides + message (al implementar)
└── test/
    ├── factories.ts                      # userListItemDto(); userPageDto y userPageDtoOf con role_types
    └── handlers/usersDirectory/
        ├── reads.ts                      # GET /users con status_id y role_type_id (422 si no válidos) (D11)
        └── model.ts                      # listUsers(page, pageSize, { statusId, roleTypeId }) con role_types (D11)
src/app/router/users/                     # usersList.integration ampliada + filterUsers.integration nueva (D12)
e2e/users.spec.ts                         # filtrar por tipo y estatus, combinar, volver desde el detalle (D12)
```

**Structure Decision**: se mantiene la estructura por features (`app → features → shared`). Todo lo
nuevo vive en `features/users`; `app` (ruta, capacidades) no cambia; en `shared` cambian los
textos y, al implementar, `shared/ui/dataGridAugmentation.d.ts` (el overlay vacío del Data Grid
recibe también su texto, `message`). **Archivos compartidos con otras features en curso** (posible conflicto al integrar):
`src/shared/messages/es.ts` (bloque `users` aquí; `modules` en la 024) y `src/test/factories.ts`.
Ningún archivo de `features/modules`, `features/roles` ni `test/handlers/modulesCatalog`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación que justificar: los dos puntos del Constitution Check se resuelven con una
extracción (D13) y una invalidación más (D5).
