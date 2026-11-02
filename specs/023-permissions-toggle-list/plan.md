# Implementation Plan: Permisos de un role como lista con botones de alternancia

**Branch**: `023-permissions-toggle-list` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/023-permissions-toggle-list/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

El detalle de un role deja de mostrar sus permisos como una tabla de casillas (Módulo × Ver / Crear /
Modificar / Eliminar) y pasa a mostrarlos como una **lista**: un elemento por módulo, con un botón de
alternancia por cada acción que el módulo tiene y un botón «Todo el módulo». Es un cambio de
**presentación y de control de edición**: las reglas (Ver obligatorio, «Todo el módulo», guardar/
descartar, aviso de cambios sin guardar, guardado parcial), los datos y las APIs no cambian.

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Solo cambian dos componentes de presentación** (D1): `PermissionsMatrix` → `PermissionsList` y
   `PermissionsMatrixRow` → `PermissionsListItem`, con sus pruebas. `schemas/permissionMatrix.ts`,
   `useEditablePermissionMatrix` y el guardado no se tocan (D8), así que FR-005, FR-007 y SC-003 se
   cumplen por construcción.
2. **El control es el `ToggleButtonGroup` de MUI** que ya usan Módulos y Suscripciones (D2), no
   excluyente, con `selected` y `onClick` por botón; «Todo el módulo» es un `ToggleButton` suelto fuera
   del grupo (D3).
3. **El estado pulsado lleva una marca de verificación** con el hueco reservado (D4): el tinte por
   defecto de MUI (~8 %) no cumple WCAG 1.4.1/1.4.11, y reservar el hueco evita que los botones se
   muevan al alternar.
4. **Semántica de lista nativa** (D5): `List`/`ListItem`, subencabezados por tipo (015) y el texto de
   ayuda —hoy invisible— mostrado encima, con la lista referenciándolo.
5. **MUI 9.5.0 usa tabindex móvil en el grupo** (hallazgo 3): Tab entra al grupo de cada módulo y las
   flechas mueven entre acciones. El spec (US4) se ajustó para decirlo.
6. **Migración mecánica de pruebas** (D10): se conservan los nombres accesibles y cambian el rol
   (`checkbox` → `button`) y la aserción (`checked` → `aria-pressed`).
7. Piezas que cambian: ver [Project Structure](#project-structure).

### Ajustes al spec detectados durante el plan

Al leer el código de MUI y de la pantalla se corrigieron cuatro puntos del propio spec, ya aplicados en
[spec.md](spec.md): **FR-011/FR-012/SC-007** (el pulsado idéntico al de los filtros contradecía «no
depender solo del color»; ahora se pide la misma forma, tamaño y tipografía, y la marca ✓ como única
diferencia), **FR-014** (la ayuda hoy solo es un nombre accesible: se muestra a la vista y se corrige
también el texto «la tabla» del alta de role) y el escenario 1 de **US4** (tabindex móvil del grupo).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js ≥ 24.15.0 (`engines`), sin cambios.

**Primary Dependencies**: las mismas ya en uso, sin dependencias nuevas ni cambios de versión. MUI 9.5.0: `ToggleButton` y `ToggleButtonGroup` (ya usados por `ModulesFilters`, `PriceCycleToggle`, `ComparisonTypeFilter`), `List`/`ListItem`/`ListSubheader`; el icono sale del registro único (`Icon name="included"`, ya existe). Zod y TanStack Query: sin cambios.

**Storage**: N/A. Ningún estado de servidor ni de navegador nuevo; los cambios pendientes siguen siendo el `Map<permissionId, boolean>` local de `useEditablePermissionMatrix`.

**Testing**: la infraestructura existente (Vitest 5.0.5, Testing Library, user-event, vitest-axe, MSW 3.0.3, Playwright 1.64.1); ningún simulador nuevo. Se migran las pruebas que consultan casillas (research D10). Cobertura mínima del 80 % en `api`/`schemas`/`policy`/`hooks` sin cambios: ninguna de esas capas se modifica. En esta fase no se escriben ni se ejecutan pruebas (se hacen en `/speckit-implement`).

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, claro y oscuro, sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: ninguno nuevo. Una lista de decenas de módulos con ≤ 5 botones cada uno es un render trivial; no se memoiza (constitución I). La ruta de Roles ya se carga de forma diferida y los componentes de MUI usados ya están en el bundle, que no debería crecer; se mide al final de la implementación (presupuesto de 320 KB gzip).

**Constraints**: cero cambios de comportamiento en las reglas de permisos; el estado pulsado no puede depender solo del color; los nombres accesibles se conservan (`{Acción} de {Módulo}`); ningún componente supera 250 líneas (`RoleDetailPanel.tsx` está en 243, ver D9); los botones tienen la misma forma, tamaño y tipografía que los de Módulos y Suscripciones.

**Scale/Scope**: 2 componentes reemplazados, 1 modificado (`RoleDetailPanel`), un bloque de textos en `es.ts`, ≈ 8 archivos de pruebas migrados (unitarias, integración, e2e). Cero rutas nuevas, cero operaciones de API nuevas, cero entidades nuevas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Solo se listan las reglas que esta feature toca; «Antes» es el
estado al iniciar la investigación y «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Estructura por features; una feature no importa los internos de otra | Todo vive en `features/roles`; el icono sale de `shared/ui` (`Icon`) y los textos de `shared/messages`; sin imports nuevos entre features | ✅ | ✅ |
| I. Componentes pequeños, de responsabilidad única | `PermissionsList` (lista, grupos, estados vacío y ayuda) y `PermissionsListItem` (un módulo) quedan por debajo de las ~100 líneas; el elemento solo pinta y delega las reglas en las funciones puras | ✅ | ✅ |
| I. Archivo de componente ≤ 250 líneas | `RoleDetailPanel.tsx` (243) solo renombra el componente y añade la prop `label`; la ayuda vive en `PermissionsList` (research D9) | ✅ | ✅ |
| I. Sin `useEffect` para derivar estado; sin memoización preventiva | Todo es derivado en render (botón pulsado, `allGranted`, agrupar por tipo); `useId` para los ids de ayuda; sin `useMemo`/`useCallback` | ✅ | ✅ |
| II. Sin `any`/`as`; Zod en la frontera | Sin esquemas ni tipos nuevos; se reutilizan `ActionKey`, `ACTION_KEYS`, `PermissionMatrix*` | ✅ | ✅ |
| III. Estado de servidor separado del de cliente | Sin cambios: el estado pendiente sigue en `useEditablePermissionMatrix`; ningún dato remoto se copia a otro estado | ✅ | ✅ |
| IV. Contratos REST; el backend es la fuente de verdad | Sin llamadas nuevas ni modificadas; las reglas (Ver) siguen en la función pura ya existente y el 403 de la API sigue mandando | ✅ | ✅ |
| V. Autorización por el módulo de políticas | `capabilities.canEdit` (módulo de políticas de roles) sigue decidiendo si los botones son operables; no se comparan nombres de role en componentes | ✅ | ✅ |
| VI. UI con MUI y theme centralizado | Solo `ToggleButton`/`ToggleButtonGroup`/`List` de MUI y el sistema de estilos `sx`; ningún CSS global; la marca ✓ usa el registro de iconos | ✅ | ✅ |
| VI. Estados cargando, vacío, error y éxito | Se conservan: carga y error con reintento acotados a la zona de permisos (FR-010), vacío con `roles.detail.emptyModules`, éxito con la notificación existente | ✅ | ✅ |
| VI. Textos en español, centralizados | `roles.detail.columns` → `actions`, ayuda reformulada y «lista» en vez de «tabla» (research D7); sin literales en JSX | ✅ | ✅ |
| VI. Accesibilidad WCAG 2.1 AA | Botones con `aria-pressed` y nombre `{Acción} de {Módulo}`, operables por teclado (tabindex móvil de MUI), estado pulsado con marca además del color (D4), lista nativa, axe en `RolesPage.test.tsx` | ✅ | ✅ |
| VI. Responsive desktop-first | Contenedor flex con `flex-wrap`: de 1024 a 320 px sin scroll horizontal (D6); verificado a mano (quickstart V16) | ✅ | ✅ |
| VI. Patrón maestro-detalle de Roles | Se conserva sin cambios (esta feature solo toca la zona de permisos del detalle) | ✅ | ✅ |
| VII. Pruebas en el mismo PR, sin mockear `fetch` | Se migran las pruebas de componentes, integración y e2e (D10); MSW sin cambios; axe se mantiene | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks` | Ninguna de esas capas cambia | ✅ | ✅ |
| Stack: dependencias mínimas | Ninguna dependencia nueva | ✅ | ✅ |
| Puertas de CI y presupuesto de bundle | `typecheck`, `lint` (0 advertencias), `format:check`, `test`, `build`; el bundle no crece (quickstart §1) | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, errores uniformes, reintentos, configuración
por entorno, paginación en servidor, observabilidad): sin cambios; esta feature no introduce nada que
las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. No hay ningún desvío de la
constitución que registrar en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/023-permissions-toggle-list/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── permissions-list-ui.md   # Phase 1 output: contrato de UI (no hay contrato HTTP nuevo)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No se genera un contrato HTTP: ningún endpoint nuevo o modificado. Los de
[../014-roles-permisos/contracts/roles-service.md](../014-roles-permisos/contracts/roles-service.md)
siguen vigentes.

### Source Code (repository root)

```text
src/
├── features/roles/
│   └── components/
│       ├── PermissionsMatrix.tsx           # RENOMBRADO → PermissionsList.tsx (lista, grupos, vacío, ayuda; D1, D5)
│       ├── PermissionsMatrix.test.tsx      # RENOMBRADO → PermissionsList.test.tsx (D10)
│       ├── PermissionsMatrixRow.tsx        # RENOMBRADO → PermissionsListItem.tsx (grupo de botones + «Todo»; D2, D3, D4, D6)
│       ├── PermissionsMatrixRow.test.tsx   # RENOMBRADO → PermissionsListItem.test.tsx (D10)
│       ├── RoleDetailPanel.tsx             # usa PermissionsList; + prop label (D9)
│       ├── RoleDetailPanel.test.tsx        # 7 consultas checkbox → button (D10)
│       └── RolesPage.test.tsx              # prueba de teclado (tabindex móvil) y axe (D10)
├── shared/
│   └── messages/es.ts                      # roles.detail.columns → actions (−module); matrixHelper y matrixError
│                                           #   reformulados; roles.form.copyFromHelper: «lista» (D7)
└── app/router/roles/
    ├── viewAndEditPermissions.integration.test.tsx   # checkbox → button/aria-pressed (D10)
    └── duplicateRole.integration.test.tsx            # 1 consulta (D10)
e2e/roles.spec.ts                                     # «W3 to W7»: checkbox → button con pressed (D10)
```

No se tocan: `schemas/permissionMatrix.ts` (y su prueba), `hooks/useEditablePermissionMatrix.ts`,
`useSaveRoleDetail.ts`, `RoleDetailActions.tsx`, `RolesList.tsx` (la lista de roles de la izquierda,
FR-015), `RoleFormDialog.tsx`, `DeleteRoleDialog.tsx`, `RoleTypeTabs.tsx`, la API, las rutas y el tema
(`app/theme`); tampoco `features/modules` ni `features/subscriptions`, de donde solo se toma como
referencia visual el `ToggleButtonGroup`.

**Structure Decision**: se mantiene la estructura por features vigente (`app → features → shared`).
Todo lo nuevo vive en `features/roles/components`; ningún archivo nuevo en `app` ni en `shared`
(el icono y los textos ya tienen su lugar). No se toca el tema global: el estilo de los botones es el
de MUI ya en uso, con los pocos ajustes de `sx` (hueco de la marca, disposición del elemento) dentro
de los dos componentes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Ninguna violación que justificar: el Constitution Check no encontró desvíos, antes ni después del
diseño.
