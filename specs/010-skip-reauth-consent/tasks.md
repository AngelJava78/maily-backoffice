---

description: "Task list template for feature implementation"
---

# Tasks: Evitar la Pantalla de Autorización al Recuperar una Sesión Activa

**Input**: Design documents from `/specs/010-skip-reauth-consent/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: esta feature no tiene código de producción que probar con test-first (plan.md: la causa
raíz ya se corrigió fuera del repositorio) — el único entregable de código **es** una prueba E2E.
No hay fases de Setup ni Foundational: con una sola historia de usuario y sin estado ni dependencias
compartidas que preparar, agregarlas sería ceremonia sin contenido.

**Organization**: Una sola historia de usuario (US1, P1, la única que tiene `spec.md`), más Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único existente: `e2e/` en la raíz del repo (`C:\Maily\code\maily-backoffice`). Esta
feature no toca `src/` (plan.md → Project Structure).

---

## Phase 1: User Story 1 - Recuperar una pantalla sin re-autorizar lo ya concedido (Priority: P1) 🎯 MVP

**Goal**: que ningún spec E2E que inicia sesión quede varado en la pantalla de autorización del
proveedor de identidad, sea que aparezca (siempre en `localhost`, research.md D5) o no (lo esperado
en un entorno desplegado una vez confirmado FR-001 ahí) — sin romper la suite en ningún caso.

**Independent Test**: `npx playwright test e2e/access.spec.ts` (u otro spec que inicie sesión) con
`E2E_AUTH0_USER_A1`/`E2E_AUTH0_PASSWORD_A1` — debe llegar a la pantalla protegida sin quedar varado,
tanto si aparece la pantalla de autorización como si no.

- [X] T001 [US1] **Prerrequisito, no depende de código**: confirmar manualmente
      (quickstart.md → "Verificar manualmente") si el flujo de "Iniciar sesión" ya no muestra
      "Authorize App". **Resultado**: en `localhost:5173` sigue apareciendo — confirma research.md
      D3/D5 (Auth0 muestra ese paso siempre que el `redirect_uri` no sea verificable, sin importar
      el ajuste de "Allow Skipping User Consent"). Esto **no es un fallo del ajuste**: solo prueba
      que la verificación concluyente de FR-001 no se puede hacer en `localhost`. Pendiente probar
      en un entorno con dominio real desplegado — ver T005.
- [X] T002 [US1] Modificar `e2e/fixtures/signIn.ts`: **replanteada tras T001** (la versión original,
      afirmar que la pantalla *no* aparece, habría roto todos los specs E2E que inician sesión en
      `localhost`, donde siempre aparece — research.md D5). En su lugar, `submitCredentials()`
      ahora acepta la pantalla de autorización si aparece (matchea el botón "Accept" por su
      `role`/nombre, no traducido — research.md D4) y sigue de largo si no, con una espera acotada
      (`CONSENT_SCREEN_TIMEOUT_MS = 2_000`) para no comerse el presupuesto de 5 s de `SC-001` de
      `access.spec.ts`. `npm run typecheck`, `npx eslint e2e/fixtures/signIn.ts` y
      `npx prettier --check` en verde.
- [ ] T003 [US1] Verificar, **con credenciales reales** (`E2E_AUTH0_USER_A1`/
      `E2E_AUTH0_PASSWORD_A1`), que los specs E2E que ya usan `signIn()`/`startSignIn()` +
      `submitCredentials()` (`access.spec.ts`, `dashboard.spec.ts`, `session.spec.ts`,
      `subscriptions.spec.ts`, `token.spec.ts`, `users.spec.ts`, `responsive.spec.ts`) siguen
      pasando sin modificar sus propias aserciones. **Pendiente de la persona solicitante**: este
      entorno no tiene esas credenciales configuradas (los 2 specs sin sesión siguen pasando: 2
      passed, 20 skipped, igual que antes de T002 — sin regresión visible, pero sin poder correr el
      camino con sesión real). Depende de T002.

**Checkpoint**: User Story 1 completa en el código que puede escribirse desde este repositorio
(T002); T001 y T003 quedan documentados como pendientes de verificación con credenciales/dominio
real, no como bloqueados por falta de trabajo.

---

## Phase 2: Polish & Cross-Cutting Concerns

**Purpose**: cerrar el registro de la feature.

- [ ] T004 Recorrer el checklist de aceptación rápida completo de `quickstart.md` (FR-001 a FR-004,
      SC-001 a SC-003) y confirmar cada fila **en un entorno con dominio real desplegado**, no en
      `localhost` (T001 ya mostró que ahí no es concluyente).
- [ ] T005 Actualizar `specs/010-skip-reauth-consent/spec.md`: agregar una nota de resolución
      (fecha, qué se confirmó, en qué entorno) una vez la persona solicitante confirme explícitamente
      que la pantalla de autorización ya no aparece en un entorno desplegado — no antes, y no con
      una prueba en `localhost` (T001), para no documentar como "verificado" algo que todavía no se
      confirmó de forma concluyente.

**Nota (2026-10-23)**: T004 y T005 quedan pendientes indefinidamente por ahora — el proyecto no
tiene, por el momento, ningún entorno desplegado (staging/producción) disponible para probar; solo
`localhost`. El código de esta feature (T002) y la configuración del proveedor de identidad ya
están aplicados; falta únicamente ese entorno para cerrar la verificación.

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Story 1 (Phase 1)**: sin dependencias de Setup/Foundational (no existen en esta feature,
  ver Tests arriba). T001 informó el diseño de T002 (no lo bloqueó: su resultado fue "inconcluso en
  `localhost`", no "confirmado", así que T002 se replanteó en vez de esperar); T002 bloquea T003.
- **Polish (Phase 2)**: T004 depende de poder probar en un entorno desplegado (no solo de que T003
  termine); T005 depende de la confirmación explícita de la persona solicitante ahí.

### Parallel Opportunities

- Ninguna: con 3 tareas estrictamente secuenciales en una sola historia, no hay nada que paralelizar
  de verdad (T001→T002→T003 son prerrequisito-implementación-verificación del mismo cambio).

---

## Implementation Strategy

### MVP First (User Story 1 — la única)

1. Completar Phase 1 (User Story 1): confirmar manualmente, agregar la aserción E2E, verificar que
   no rompe los specs existentes.
2. **Detener y validar**: correr `npx playwright test` completo antes de Polish.

### Incremental Delivery

No aplica con una sola historia: Phase 1 entrega todo el valor de la feature; Phase 2 solo cierra el
registro (checklist y nota de resolución en el spec).

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes entre sí (no aplica a ninguna tarea de
  esta feature: ver Parallel Opportunities).
- `[Story]` ubica cada tarea en su historia de usuario para trazabilidad con `spec.md`.
- Ningún archivo de `src/` se modifica en esta feature (plan.md → Project Structure).
