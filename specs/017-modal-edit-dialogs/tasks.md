---

description: "Task list template for feature implementation"
---

# Tasks: Crear y editar un módulo en un modal, no en un panel fijo

**Input**: Design documents from `/specs/017-modal-edit-dialogs/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md) (sin `contracts/`: no hay ningún cambio de API)

**Tests**: incluidas (Principio VII de la constitución). Algunas no son pares "falla primero →
implementa" estrictos: convertir el JSX raíz de un componente ya probado (`ModuleEditPanel`,
`ModuleCreatePanel`) no vuelve falsa ninguna aserción existente de contenido/comportamiento, así que
T004 y T008 solo ajustan el contexto de render (research R2) en vez de "fallar primero" — se marca
explícitamente en cada una. T001 y T005 sí son rojo→verde genuinos (un componente que no existe
todavía; una aserción sobre `role="dialog"` que hoy no puede cumplirse, porque `ModulesPage` no usa
ningún `Dialog`).

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (US1=P1, US2=P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único existente: `src/` en la raíz del repo, dentro de la feature ya existente
`src/features/modules` (spec `013`). Un solo archivo nuevo (`ModuleFormDialog.tsx` y su prueba); el
resto son archivos que ya existen.

---

## Phase 1: Setup

No aplica: sin dependencias nuevas, sin rutas ni carpetas nuevas (plan.md, Project Structure).

## Phase 2: Foundational

No aplica: el único componente compartido entre ambas historias (`ModuleFormDialog`, el shell del
modal) se crea dentro de la Historia 1 (T001-T002), que es la de prioridad más alta; la Historia 2
lo reutiliza sin tener que crear nada compartido de su parte.

---

## Phase 3: User Story 1 - Editar un módulo sin reducir la lista (Priority: P1) 🎯 MVP

**Goal**: pulsar "Editar" en un módulo abre su formulario en un modal, no en un panel fijo; la lista
usa todo el ancho de la pantalla (FR-001, FR-003, FR-004, FR-005, FR-006, FR-008).

**Independent Test**: abrir `/modules`, pulsar "Editar" en cualquier módulo: aparece un modal con su
formulario; la tabla detrás conserva todo el ancho.

### Tests for User Story 1

- [X] T001 [US1] Escribir `src/features/modules/components/ModuleFormDialog.test.tsx` (debe fallar primero: el componente no existe todavía): (a) con `open={false}`, no hay ningún `role('dialog')` en el documento, aunque se le pasen `children`; (b) con `open={true}`, hay un `role('dialog')` que contiene los `children` recibidos; (c) al cerrarlo (tecla Escape), se llama a la función `onClose` recibida por props.
- [X] T005 [US1] Actualizar `src/features/modules/components/ModulesPage.test.tsx` (debe fallar antes de T006; research R3): (a) invertir `'shows an empty panel until a module is opened or created'` → renombrarla para describir que, sin ningún modal abierto, el texto "Selecciona un módulo para editarlo, o crea uno nuevo." **no** aparece en ningún lado; (b) en `'opens the create panel from "+ Nuevo módulo" (US2)'` y en `'opens the edit panel from a row's "Editar"...'`, agregar `expect(screen.getByRole('dialog')).toBeInTheDocument()`.

### Implementation for User Story 1

- [X] T002 [US1] Implementar `src/features/modules/components/ModuleFormDialog.tsx` (research R1): un `Dialog` de MUI (`open`, `onClose`, `fullWidth`, `maxWidth="sm"`) que únicamente envuelve y muestra sus `children` — sin `DialogTitle`/`DialogContent`/`DialogActions` propios (esos los aporta el contenido que `ModulesPage` le pase). El título accesible del modal (`aria-labelledby`) debe quedar asociado al `DialogTitle` que el contenido renderice dentro; confirmar sin violaciones de `axe` (FR-008). Hace pasar T001. (depende de T001)
- [X] T003 [P] [US1] Convertir `src/features/modules/components/ModuleEditPanel.tsx` (research R1): cambiar su JSX raíz de `<Paper variant="outlined" sx={{p:3}}>` + `<Typography variant="h6" component="h2">{text.panel.editTitle}</Typography>` a `<DialogTitle>{text.panel.editTitle}</DialogTitle>` seguido de `<DialogContent>` (con el mismo contenido de siempre: `Alert` de error, Clave/Tipo, `ModuleFormFields`, `ModuleDangerZone`) y `<DialogActions>` con los botones Guardar/Descartar ya existentes (mismo `onClick`/`disabled`/`loading`). El `ConfirmDialog` de "retirar una acción" sigue como hermano del contenido, fuera de `DialogContent`. Ningún hook, validación ni handler cambia. Puede hacerse en paralelo con T001/T002 (archivo distinto).
- [X] T004 [US1] Actualizar `src/features/modules/components/ModuleEditPanel.test.tsx`: renderizar el componente dentro de un `<Dialog open>` mínimo (research R2), en vez de solo, para que `DialogTitle`/`DialogContent` tengan su contexto real; las aserciones de contenido, validación y envío no cambian. No es un rojo→verde: las aserciones existentes ya pasaban de todos modos (ajuste de contexto, no de comportamiento nuevo). Confirmar que la prueba de `axe` del archivo sigue sin violaciones. (depende de T003)
- [X] T006 [US1] Actualizar `src/features/modules/components/ModulesPage.tsx` (research R5): `panel()` deja de ir dentro del `Grid`; el `Grid` pasa a una sola columna para la tabla (`xs: 12`, sin el `md: 8` de hoy); fuera del `Grid`, renderizar `<ModuleFormDialog open={location.panel.kind !== 'none'} onClose={closePanel}>{panel()}</ModuleFormDialog>`. Dentro de `panel()`, el caso `panel.kind === 'none'` pasa de devolver `<EmptyState message={text.panel.emptyState} />` a devolver `null` (FR-003: ya no hay ninguna columna vacía que explicar). Hace pasar T005. (depende de T002, T003, T005)

**Checkpoint**: editar un módulo ya aparece en un modal limpio y la lista usa todo el ancho; crear
sigue funcionando (el modal lo envuelve también, vía T006) pero `ModuleCreatePanel` todavía muestra
su propio `Paper` por dentro hasta la Historia 2 — funcional, aunque con un marco duplicado.

---

## Phase 4: User Story 2 - Crear un módulo nuevo con el mismo mecanismo (Priority: P2)

**Goal**: "Nuevo módulo" deja de mostrar su propio panel con marco duplicado dentro del modal y pasa
a verse igual de limpio que "Editar" (FR-002, FR-007).

**Independent Test**: pulsar "+ Nuevo módulo": el modal ya no muestra un `Paper` anidado dentro de
sí mismo, solo el formulario de alta.

- [X] T007 [US2] Convertir `src/features/modules/components/ModuleCreatePanel.tsx` igual que T003 hizo con `ModuleEditPanel.tsx` (research R1): JSX raíz de `<Paper>` a `<DialogTitle>{text.panel.createTitle}</DialogTitle>` + `<DialogContent>` (Tipo, Clave, `ModuleFormFields`) + `<DialogActions>` con Crear/Cancelar. Ningún hook ni handler cambia; `onCreated`/`onCancel` se siguen llamando igual (FR-007 ya lo resuelve `ModulesPage` sin cambios adicionales, vía `openEdit`).
- [X] T008 [US2] Actualizar `src/features/modules/components/ModuleCreatePanel.test.tsx`: mismo ajuste de contexto de render que T004 (envolver en un `<Dialog open>` mínimo); no es un rojo→verde, igual que T004. (depende de T007)

**Checkpoint**: crear y editar un módulo se ven y se comportan como el mismo mecanismo, sin ningún
marco duplicado.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 [P] Punto de control: `npm run lint`, `npm run test -- src/features/modules` y `tsc -b` en verde, sin errores nuevos; confirmar que las pruebas de `axe` de `ModulesPage.test.tsx`, `ModuleEditPanel.test.tsx` y `ModuleCreatePanel.test.tsx` siguen sin violaciones (FR-008).
- [ ] T010 Ejecutar manualmente los escenarios W1-W9 de [quickstart.md](quickstart.md).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup/Foundational**: no aplica (ver Phase 1/2).
- **US1 (Phase 3)**: T001→T002 en secuencia; T003 en paralelo con T001/T002 (archivo distinto); T004 depende de T003; T005 es independiente desde el inicio (prueba, archivo distinto); T006 depende de T002, T003 y T005.
- **US2 (Phase 4)**: depende de que T002 (US1) ya exista — `ModuleFormDialog` es el mismo componente que US1 creó, no uno nuevo. T007→T008 en secuencia.
- **Polish (Phase 5)**: al final, tras completar las historias que se vayan a entregar.

### Parallel Opportunities

- T003 (convertir `ModuleEditPanel.tsx`) puede hacerse en paralelo con T001-T002 (`ModuleFormDialog`): archivos distintos, sin dependencia real entre ellos hasta T006.
- T009 (punto de control) puede empezar a prepararse en paralelo con el resto, pero su resultado final depende de que toda la feature esté implementada.

## Parallel Example: Historia 1

```bash
# Mientras se escribe y hace pasar ModuleFormDialog (T001-T002), en paralelo:
Task: "T003 [P] [US1] Convertir ModuleEditPanel.tsx a DialogTitle/DialogContent/DialogActions"
```

## Implementation Strategy

### MVP primero (Historia 1)

1. T001 → T002 (el shell del modal) y T003 en paralelo → T004 → T005 → T006.
2. Validar manualmente con W1-W2, W4-W6 de [quickstart.md](quickstart.md). Esto ya resuelve el caso
   de uso motivador (editar un módulo en un modal, sin reducir la lista), aunque "Nuevo módulo"
   todavía se vea con un marco duplicado hasta la Historia 2.

### Entrega incremental

1. Historia 1 (T001-T006) → MVP: editar ya es un modal limpio.
2. Historia 2 (T007-T008) → crear se ve igual de limpio, sin marco duplicado.
3. Polish (T009-T010) → toda la suite en verde y validación manual completa.

## Notes

- Un solo archivo nuevo (`ModuleFormDialog.tsx` + su prueba); todo lo demás modifica archivos que ya
  existen (plan.md, Project Structure).
- `useModulesLocation.ts`, `moduleForm.ts`, `ModuleDangerZone.tsx`, `ModuleFormFields.tsx` no
  aparecen en ninguna tarea: no cambian (research.md).
