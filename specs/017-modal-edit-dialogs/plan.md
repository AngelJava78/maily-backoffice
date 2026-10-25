# Implementation Plan: Crear y editar un módulo en un modal, no en un panel fijo

**Branch**: `017-modal-edit-dialogs` | **Date**: 2026-10-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-modal-edit-dialogs/spec.md`

## Summary

Cambia solo la presentación de crear/editar un módulo: de un panel fijo en la columna derecha de
`/modules` (`ModuleCreatePanel`/`ModuleEditPanel`, dentro de un `Grid` junto a la tabla) a un modal
de MUI superpuesto a la pantalla. El estado (qué módulo se edita, o si se está creando uno) sigue
viviendo en la URL exactamente igual que hoy (`useModulesLocation`, sin cambios); lo único que
cambia es cómo se renderiza ese estado.

Enfoque técnico, con detalle y alternativas en [research.md](research.md):

1. **Un `Dialog` compartido nuevo, `ModuleFormDialog`** (R1), es quien decide `open` (a partir de
   `location.panel.kind !== 'none'`), gestiona el cierre (`onClose` → `closePanel`, sin cambios en
   esa función) y muestra, dentro, el contenido de `ModuleCreatePanel` o `ModuleEditPanel` según el
   caso — una sola instancia de `Dialog`, no dos, para que pasar de crear a editar el módulo recién
   creado (FR-007) sea continuo y no un cierre seguido de una reapertura.
2. **`ModuleCreatePanel` y `ModuleEditPanel` dejan de ser paneles autocontenidos**: pierden su
   `<Paper>`/título propio y pasan a devolver `<DialogTitle>` + `<DialogContent>` + `<DialogActions>`
   (R1). Ningún hook, validación ni llamada a la API cambia: solo el JSX raíz que envuelve el mismo
   contenido de siempre.
3. **El foco del modal (FR-008) se apoya en el comportamiento ya incluido de `Dialog` de MUI**
   (atrapa el foco dentro y lo devuelve al control que lo abrió al cerrarse), el mismo que ya usa
   `RoleFormDialog` sin código adicional (R4) — no se escribe gestión de foco propia.
4. **`ModulesPage` deja de reservar una columna para el panel** (R5): el `Grid` de la tabla pasa a
   usar todo el ancho (`xs: 12`, sin el `md: 8` de hoy) y el modal se renderiza aparte, no dentro del
   `Grid`.
5. **Pruebas existentes que hay que ajustar** (R2, R3): `ModuleEditPanel.test.tsx` y
   `ModuleCreatePanel.test.tsx` pasan a renderizar el componente dentro de un `<Dialog open>` mínimo
   (contexto real, evita violaciones de `axe` por `DialogTitle`/`DialogContent` sin un `Dialog`
   alrededor); `ModulesPage.test.tsx` invierte su prueba "panel vacío por omisión" (ya no hay ningún
   panel que mostrar vacío) y gana una aserción de que el modal tiene `role="dialog"`.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, sin
cambios respecto al resto del proyecto.

**Primary Dependencies**: ninguna dependencia nueva. De `@mui/material`, ya presentes en el proyecto
(`RoleFormDialog`, `DeleteRoleDialog`, `ConfirmDialog`): `Dialog`, `DialogTitle`, `DialogContent`,
`DialogActions`.

**Storage**: N/A. Mismo estado en la URL que ya usa `useModulesLocation` (`openEdit`/`openCreate`/
`closePanel`, sin cambios de firma ni de comportamiento); sin estado nuevo.

**Testing**: misma infraestructura (Vitest, React Testing Library, user-event, vitest-axe, MSW).
Archivos que cambian: `ModuleEditPanel.test.tsx`, `ModuleCreatePanel.test.tsx` (R2),
`ModulesPage.test.tsx` (R3). `ModuleDangerZone.tsx` y su comportamiento (incluida su propia
`ConfirmDialog` anidada) no cambian: ya es un `<Stack component="section">` sin `Paper` propio, y
anidar un `ConfirmDialog` dentro de un `Dialog` ya es un patrón probado en el proyecto (`RolesPage`:
`DeleteRoleDialog` junto a `RoleFormDialog`).

**Target Platform**: SPA de escritorio en navegador, sin cambios. El modal usa `fullWidth` con un
`maxWidth` que deja ver cómodamente el formulario (mismo criterio de ancho que `RoleFormDialog`,
`sm`), sin desplazamiento horizontal de la página.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin
cambios.

**Performance Goals**: sin objetivo nuevo; abrir o cerrar el modal no agrega ninguna petición de red
que no existiera ya (research D10 de la spec `013`, sin cambios: el módulo en edición ya viene de la
lista cargada).

**Constraints**: el modal MUST seguir funcionando con `?edit=<id>`/`?new=1` en la URL exactamente
como hoy (compartir el enlace, recargar la página, usar el botón Atrás) — FR-004; cerrar el modal
sin guardar MUST descartar cambios sin ninguna advertencia nueva — FR-005 (fuera de alcance: agregar
una advertencia de "cambios sin guardar", a diferencia de Roles).

**Scale/Scope**: 3 archivos de componente que cambian (`ModulesPage.tsx`, `ModuleEditPanel.tsx`,
`ModuleCreatePanel.tsx`), 1 archivo de componente nuevo (`ModuleFormDialog.tsx`), 3 archivos de
prueba que cambian. Cero endpoints, cero cambios de esquema o de `useModulesLocation`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.5.0. Es un cambio de presentación acotado sobre una feature ya
existente (`013-manage-modules`); se listan solo las filas donde hay algo que verificar.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función, ≤ 250 líneas, responsabilidad única | `ModuleFormDialog` nuevo es solo el shell (abrir/cerrar/elegir contenido); `ModuleEditPanel`/`ModuleCreatePanel` conservan su propia lógica, solo cambia su JSX raíz | ✅ | ✅ |
| I. Sin abstracciones especulativas | Un único `Dialog` compartido para crear y editar (no dos), porque de verdad comparten la misma transición crear→editar (FR-007); nada más se generaliza | ✅ | ✅ |
| III. Estado navegable en la URL | `useModulesLocation` no cambia de forma; el modal solo lee `location.panel`, igual que hoy lee el panel el `Grid` | ✅ | ✅ |
| VI. Mismo patrón que otros modales del proyecto | Reutiliza `DialogTitle`/`DialogContent`/`DialogActions` tal como ya los usa `RoleFormDialog`/`DeleteRoleDialog`; no inventa una estructura de diálogo nueva | N/A | ✅ |
| VI. Gestión de foco en diálogos (WCAG 2.1 AA) | Se apoya en el comportamiento ya incluido de `Dialog` de MUI (R4), el mismo del que ya depende `RoleFormDialog` | ⚠️ | ✅ |
| VII. Pruebas en el mismo cambio | `ModuleEditPanel.test.tsx`/`ModuleCreatePanel.test.tsx` ajustan su contexto de render (R2); `ModulesPage.test.tsx` invierte la prueba que ya no aplica (R3) | ⚠️ | ✅ |

Filas no listadas (Auth0/sesión, TanStack Query, contratos de API, fechas, CI, el resto de los
principios de la `013` ya evaluados allí): sin cambios; esta feature no introduce nada que las
afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. Nada que registrar en
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/017-modal-edit-dialogs/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Sin carpeta `contracts/`: esta feature no agrega, quita ni cambia ningún endpoint ni esquema de
respuesta — es un cambio de presentación sobre datos que ya se piden igual.

### Source Code (repository root)

Solo lo que esta feature agrega o cambia dentro de `src/features/modules` (creada por la `013`);
todo lo demás de esa feature sigue igual.

```text
src/features/modules/components/
├── ModuleFormDialog.tsx        # NUEVO: el `Dialog` compartido (open/onClose/título accesible);
│                                 # decide, según `location.panel.kind`, si muestra el contenido de
│                                 # ModuleCreatePanel o de ModuleEditPanel
├── ModuleFormDialog.test.tsx   # NUEVO: abre/cierra el modal, confirma `role="dialog"` y el foco
│                                 # al abrir/cerrar (research R1, R4)
├── ModuleEditPanel.tsx          # Cambia su JSX raíz: de `<Paper>`+título a
│                                 # `<DialogTitle>`+`<DialogContent>`+`<DialogActions>` (R1); ningún
│                                 # hook, validación ni llamada a la API cambia
├── ModuleEditPanel.test.tsx     # Renderiza el componente dentro de un `<Dialog open>` mínimo (R2)
├── ModuleCreatePanel.tsx        # Mismo cambio de JSX raíz que ModuleEditPanel (R1)
├── ModuleCreatePanel.test.tsx   # Mismo ajuste de contexto de render que ModuleEditPanel.test.tsx (R2)
├── ModulesPage.tsx              # `panel()` pasa a devolver el `ModuleFormDialog` (fuera del
│                                 # `Grid`); el `Grid` de la tabla deja de reservar una columna fija
│                                 # (R5)
└── ModulesPage.test.tsx         # Invierte la prueba de "panel vacío" (R3) y agrega una aserción de
                                   # que el modal es un `role="dialog"` al abrirlo
```

**Structure Decision**: ajuste dentro de la feature `features/modules` ya existente (`013`); no se
crea ninguna carpeta, capa ni feature nueva. `ModuleDangerZone.tsx`, `ModuleFormFields.tsx`,
`applyModuleRefusal.ts` y toda la capa `api`/`hooks`/`schemas` de Módulos no aparecen porque no
cambian.

## Complexity Tracking

*Sin violaciones que justificar: ver Constitution Check.*
