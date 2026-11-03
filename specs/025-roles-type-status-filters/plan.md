# Implementation Plan: Lista de roles con filtros de Tipo y Estatus, y bloqueo de roles

**Branch**: `025-roles-type-status-filters` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/025-roles-type-status-filters/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

«Roles y permisos» deja de tener las pestañas CLÍNICA y SISTEMA. Encima de la lista aparecen dos
grupos de botones de alternancia iguales a los de Módulos —**Tipo** (Todos | Sistema | Clínica) y
**Estatus** (Activos | Bloqueados), con Todos y Activos por omisión—, la lista muestra los roles que
cumplen ambos filtros (con su tipo en cada elemento) y el detalle ofrece **Bloquear role** (con
confirmación) en un role activo y **Desbloquear role** (inmediato) en uno bloqueado. El detalle de un
role bloqueado explica por qué no se ven sus permisos, porque la API no los entrega.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Ningún cambio de API** (D1): `GET /roles?status_id=2`, `POST /roles/{id}/block` y `/unblock` ya
   existen (desde antes de la 5.4.0), así que la feature no depende de la 024.
2. **La dirección conserva `type=sistema|clinica`** y gana `status=bloqueados` (D2): los enlaces
   anteriores son la forma canónica, sin migración; sin `type` ahora es Todos.
3. **Una consulta por estatus** con clave `roleKeys.list(status)`; el tipo se filtra en el cliente con
   una función pura; las mutaciones invalidan el prefijo `roleKeys.lists()` (D3).
4. **Qué detalle se muestra lo decide una función pura** (D4): activo → `RoleDetailPanel` (intacto,
   FR-019); bloqueado → `BlockedRoleDetail` nuevo, que no consulta nada (D5); un role que el filtro no
   muestra → «elige un role» (FR-011); un role que desaparece mientras está abierto → el «no
   encontrado» de siempre.
5. **Bloquear/desbloquear** con `useChangeRoleStatus` + `useChangeRoleStatusAction` (avisos de éxito,
   «ya estaba» informativo y error) y `BlockRoleAction` (botón + confirmación) (D6); el foco vuelve al
   título cuando el detalle se cierra (D7).
6. **`RolesFilters`** repite las props de `ModulesFilters` (D8) sin importar de `features/modules`.
7. **`RoleDetailPanel` sigue ≤ 250 líneas** extrayendo `RolePermissionsSection` (D9).
8. **Simulador MSW** con `status_id`, `block` y `unblock` (D10) y **enmienda PATCH** de la constitución
   (1.7.0 → 1.7.1) en la frase de las pestañas (D11).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js ≥ 24.15.0 (`engines`), sin cambios.

**Primary Dependencies**: las ya en uso, sin dependencias nuevas. MUI 9.5.0 (`ToggleButton`/`ToggleButtonGroup` como en `ModulesFilters`, `List`, `Alert`, `Dialog` vía `ConfirmDialog`), React Router 7 (`useSearchParams`, `useBlocker`), TanStack Query 5, Zod 4.

**Storage**: N/A. Estado de servidor en TanStack Query (dos listas por estatus); estado navegable (tipo, estatus, role) en la dirección (constitución III); sin almacenamiento en el navegador.

**Testing**: Vitest 5.0.5, Testing Library, user-event, vitest-axe, MSW 3.0.3 (simulador `usersDirectory` + `rolesCatalog` ampliado), Playwright 1.64.1 (e2e migrado, se ejecuta solo con cuentas de prueba). Pruebas en esta máquina con `--maxWorkers=2 --testTimeout=60000`.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, claro y oscuro.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio.

**Performance Goals**: ninguno nuevo. Decenas de roles sin paginar (la API no pagina roles, como hasta ahora); con «Todos» la lista pide el contador de permisos de todos los roles activos (≈ 9 consultas en la semilla, compartidas con el detalle). La ruta de Roles ya es diferida; el bundle de entrada no debería crecer (presupuesto 320 KB gzip).

**Constraints**: `RoleDetailPanel` sigue funcionando exactamente igual (FR-019) y ≤ 250 líneas; los filtros, indistinguibles de los de Módulos (FR-020); sin consultas de permisos para roles bloqueados (FR-012); siempre un botón pulsado por grupo (FR-003); no tocar `features/modules` ni `specs/024-*` (trabajo en paralelo).

**Scale/Scope**: 4 componentes nuevos (`RolesFilters`, `BlockedRoleDetail`, `BlockRoleAction`, `RolePermissionsSection`), 4 modificados (`RolesPage`, `RolesList`, `RoleDetailPanel`, `RoleDetailActions`), 1 eliminado (`RoleTypeTabs`); 2 hooks nuevos (`useChangeRoleStatus`, `useChangeRoleStatusAction`) y 3 modificados (`useRolePermissionsLocation`, `useRolesCatalog`, `roleKeys`); 2 operaciones HTTP nuevas en el cliente (`blockRole`, `unblockRole`) y 1 parámetro nuevo (`status_id`); un bloque de textos en `es.ts`; simulador MSW; ≈ 15 archivos de pruebas nuevos o migrados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0 (y v1.7.1 tras la enmienda de D11). «Antes» es el estado al
iniciar la investigación y «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Estructura por features; sin importar internos de otra | Todo en `features/roles`; los filtros no importan `ModulesFilters` (D8); textos en `shared/messages`, diálogo en `shared/ui` | ✅ | ✅ |
| I. Componentes pequeños; archivo ≤ 250 líneas | `RoleDetailPanel` (245) extrae `RolePermissionsSection` antes de añadir la acción (D9); los nuevos quedan < 120 | ⚠️ | ✅ |
| I. Sin `useEffect` para derivar estado | «Ya se mostró» se deriva ajustando estado en render (D4); el único efecto nuevo mueve el foco al título (sincroniza con el DOM, D7) | ✅ | ✅ |
| II. Datos validados en la frontera | Respuestas de `block`/`unblock` con `roleSchema`; la dirección se lee con Zod (`catch` al valor por omisión) | ✅ | ✅ |
| III. Estado de servidor en TanStack Query; claves por factoría | `roleKeys.list(status)`; nada se copia a `useState`; las mutaciones invalidan `roleKeys.lists()` | ✅ | ✅ |
| III. Estado navegable de listados en la URL | `type`, `status` y `roleId` en los search params; valores no válidos → omisión con `replace` (D2) | ✅ | ✅ |
| IV. Contratos REST, backend fuente de verdad | Solo operaciones existentes de la API; sin actualización optimista; 404/409 tratados por código, nunca por el `message` | ✅ | ✅ |
| IV. Mutaciones sin reintento y sin doble envío | `useMutation` sin `retry`; botones con `loading` y deshabilitados mientras trabajan (FR-016) | ✅ | ✅ |
| IV. Paginación en servidor | Roles sigue sin paginar porque la API no pagina esta colección (variante heredada de la 014, sin cambios) | ✅ | ✅ |
| V. Autorización por el módulo de políticas | «Bloquear»/«Desbloquear» se gobiernan con `capabilities.canEdit` (`roles:update`, lo que pide la API); el 403 se trata en `describeRoleError` | ✅ | ✅ |
| VI. Estados cargando, vacío, error y éxito | En la zona de la lista, sin ocultar filtros ni título (FR-018); avisos de éxito, «ya estaba» e error en las mutaciones | ✅ | ✅ |
| VI. Patrón maestro-detalle de Roles «con pestañas por tipo» | La pantalla sustituye las pestañas por filtros: requiere enmendar la frase (D11, PATCH 1.7.1) | ⚠️ | ✅ |
| VI. Confirmación que nombra el recurso | «Bloquear role» confirma con el nombre del role y las consecuencias; desbloquear no (restituye el estado, Assumption del spec) | ✅ | ✅ |
| VI. Textos en español y centralizados | Bloque `roles.filters`, `roles.list`, `roles.status`, `roles.blocked` en `es.ts`; sin literales en JSX | ✅ | ✅ |
| VI. WCAG 2.1 AA | Grupos con nombre accesible y `aria-pressed`; tabindex móvil; foco gestionado en la confirmación y tras cerrarse el detalle (D7); axe en `RolesPage.test.tsx` | ✅ | ✅ |
| VI. Responsive | Filtros y acciones con `flexWrap`, sin scroll horizontal a 320 px | ✅ | ✅ |
| VII. Pruebas en el mismo PR; MSW, sin mockear `fetch` | Simulador ampliado (D10); pruebas unitarias, de componentes, de integración y e2e migradas | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks` | Pruebas nuevas para `rolesApi` (block/unblock/status), `roleErrors`, `rolePermissionsLocation`, `roleKeys`, `useChangeRoleStatus` y la acción | ✅ | ✅ |
| Stack y presupuesto de bundle | Ninguna dependencia nueva; la ruta es diferida | ✅ | ✅ |

Filas no listadas (Auth0, cliente HTTP único, configuración por entorno, observabilidad): sin cambios.

**Resultado**: dos puntos marcados antes del diseño (el tamaño de `RoleDetailPanel` y la frase de las
pestañas en el Principio VI) quedan resueltos por el diseño: una extracción (D9) y una enmienda PATCH
(D11). Nada que registrar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/025-roles-type-status-filters/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── roles-status-service.md   # GET /roles?status_id, POST block/unblock y sus errores (D1)
│   └── roles-list-ui.md          # dirección, filtros, lista, detalle bloqueado, acciones y textos
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── features/roles/
│   ├── api/
│   │   ├── rolesApi.ts                      # listRoles({ statusId }), blockRole, unblockRole (D1, D6)
│   │   └── roleErrors.ts                    # + resultado alreadyInStatus (409 ya bloqueado/activo)
│   ├── hooks/
│   │   ├── roleKeys.ts                      # + list(status) bajo lists() (D3)
│   │   ├── useRolesCatalog.ts               # useRolesCatalog(status = 'active') (D3)
│   │   ├── useRolePermissionsLocation.ts    # type/status/roleId; setStatus; selectCreated (FR-010)
│   │   ├── useChangeRoleStatus.ts           # NUEVO: mutación block/unblock (D6)
│   │   ├── useChangeRoleStatusAction.ts     # NUEVO: avisos de éxito / ya estaba / error (D6)
│   │   ├── useCreateRole.ts, useDeleteRole.ts, useSaveRoleDetail.ts   # invalidan lists() sin exact (D3)
│   ├── schemas/
│   │   └── rolePermissionsLocation.ts       # filtros, parse/serialize, rolesOfType, detailOf (D2, D4)
│   └── components/
│       ├── RolesPage.tsx                    # filtros, detalle según detailOf, foco al título (D4, D7)
│       ├── RolesFilters.tsx                 # NUEVO: Tipo y Estatus (D8)
│       ├── RolesList.tsx                    # lista filtrada, tipo por elemento, vacíos, sin contador si bloqueado
│       ├── BlockedRoleDetail.tsx            # NUEVO: detalle de un role bloqueado + Desbloquear (D5)
│       ├── BlockRoleAction.tsx              # NUEVO: botón + confirmación de Bloquear (D6)
│       ├── RolePermissionsSection.tsx       # NUEVO: extraído de RoleDetailPanel (D9)
│       ├── RoleDetailPanel.tsx              # + onBlocked y BlockRoleAction; usa RolePermissionsSection
│       ├── RoleDetailActions.tsx            # + children antes de «Eliminar role» (D9)
│       └── RoleTypeTabs.tsx                 # ELIMINADO (con su prueba)
├── shared/messages/es.ts                    # roles: −tabs, +filters, list.*, status.*, blocked.*
└── test/handlers/
    ├── usersDirectory/model.ts, catalog.ts  # status_id, blockRole, unblockRole (D10)
    └── rolesCatalog/roles.ts                # POST /roles/:id/block|unblock (D10)
src/app/router/roles/                        # integraciones migradas + filterRoles y blockRole nuevas
e2e/roles.spec.ts                            # pestañas → botones de Tipo; bloquear/desbloquear
.specify/memory/constitution.md              # 1.7.1: Principio VI sin «pestañas» (D11)
```

**Structure Decision**: se mantiene la estructura por features (`app → features → shared`). Todo lo
nuevo vive en `features/roles`; `app` (ruta, capacidades) no cambia; en `shared` solo cambian los
textos. **Archivos compartidos con la feature 024** (posible conflicto al fusionar): `src/shared/messages/es.ts`
(bloques distintos: `roles` aquí, `modules` allí) y `.specify/memory/constitution.md` (si la 024 la
enmendara). Ningún archivo de `features/modules`, `test/handlers/modulesCatalog` ni `test/factories.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación que justificar: los dos puntos del Constitution Check se resuelven con una
extracción (D9) y una enmienda PATCH de redacción (D11).
