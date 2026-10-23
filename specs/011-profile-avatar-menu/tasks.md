---

description: "Task list template for feature implementation"
---

# Tasks: Menú de Perfil con Avatar en el Encabezado

**Input**: Design documents from `/specs/011-profile-avatar-menu/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/profile-menu.md](./contracts/profile-menu.md), [quickstart.md](./quickstart.md)

**Tests**: la constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first
para lógica pura. `useOperatorIdentity` (T002/T003) es lógica pura sin JSX: su prueba va **antes**
de su implementación. El resto (`ProfileMenu`, `ProfilePage`) es integración visual: su prueba
acompaña la implementación en la misma historia, escrita primero para que falle antes de
implementar (mismo criterio que 009/010). Se suma la verificación de que los specs E2E
**existentes** no queden rotos por el cambio de contrato de accesibilidad (research.md D7,
contracts/profile-menu.md) — no es opcional, es parte del Checkpoint de US1.

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (US1=P1 "el menú", US2=P1
"avatar consistente en Mi perfil", US3=P3 "aviso de cambiar foto"), en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único existente: `src/`, `e2e/` en la raíz del repo (`C:\Maily\code\maily-backoffice`),
estructura por features (`src/app`, `src/features/*`, `src/shared`) — ver "Project Structure" en
`plan.md`. Solo se tocan las features `auth` y `profile`; ninguna otra feature se modifica.

---

## Phase 1: Setup

**Purpose**: línea base antes de tocar el encabezado compartido por toda la app.

- [X] T001 Remedir la línea base real del bundle: `npm run build && npm run size` en la raíz del
      repo; registrar el KB gzip obtenido (línea base previa: 284,7 KB tras 009/010) para comparar
      en el Polish final (T022). **Resultado: 284,8 KB gzip, margen de 15,2 KB.**

**Checkpoint**: línea base de bundle registrada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `useOperatorIdentity()` necesita exponer `id` antes de que cualquier historia pueda
usar `Avatar` (US1 en el encabezado, US2 en "Mi perfil") — bloquea ambas por igual.

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

- [X] T002 Actualizar `src/features/auth/hooks/useOperatorIdentity.test.tsx` (test-first, lógica
      pura): agregar un caso que confirme que `identity.id` es igual al `id` del `PlatformUser` de
      la cuenta concedida en la prueba (mismo mecanismo que ya usa `useGrantedAccess`/
      `accessKeys.operator`, ver fixtures existentes de la prueba); quitar o reemplazar el caso que
      hoy prueba `identity.initials` (data-model.md: ese campo se retira). Debe fallar contra el
      hook actual.
- [X] T003 Modificar `src/features/auth/hooks/useOperatorIdentity.ts` (research.md D1/D2):
      agregar `id: string` a `OperatorIdentity`, tomado del `id` del `PlatformUser` que ya devuelve
      `useGrantedAccess().user`; quitar el campo `initials` (y el import de `getInitials` de
      `@/features/users` si queda sin otro uso en este archivo). Hace pasar T002. Depende de T002.

**Checkpoint**: `useOperatorIdentity()` listo — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - El menú de perfil (Priority: P1) 🎯 MVP

**Goal**: un botón de avatar en la esquina superior derecha del encabezado abre un menú con
nombre, correo, role(s), "Mi perfil" y "Cerrar sesión" — sin ninguna acción para cambiar role ni
cuenta — y ningún spec E2E existente queda roto por el nuevo contrato de accesibilidad
(contracts/profile-menu.md).

**Independent Test**: iniciar sesión, abrir el menú desde cualquier pantalla, confirmar su
contenido (FR-002), que "Mi perfil" y "Cerrar sesión" funcionan igual que antes, y que
`npx playwright test` sigue en verde para los specs que no necesitan credenciales.

### Tests for User Story 1 ⚠️

> Escribir esta prueba primero, verla fallar, luego implementar T006 (principio VII).

- [X] T004 [P] [US1] Agregar a `src/shared/messages/es.ts` el nombre accesible del botón de avatar:
      una función en `nav` (p. ej. `profileMenu: (displayName: string) => \`Menú de ${displayName}\``),
      sin literales dispersos en JSX (principio VI).
- [X] T005 [US1] Crear `src/app/layouts/ProfileMenu.test.tsx`: el menú empieza cerrado; al
      activar el botón de avatar (clic y con teclado: Enter/Espacio) se abre y muestra el nombre,
      el correo y todas las role(s) activas de la identidad (no interactivos), más "Mi perfil"
      (enlace a `/profile`) y "Cerrar sesión" (acción); confirma que **no** existe ningún control
      para cambiar de role activo ni de cuenta/usuario (FR-002, SC-003); Escape cierra el menú y
      devuelve el foco al botón (mismo patrón que `SubscriptionStatusMenu.test.tsx`, si existe, o
      el propio componente); `axe` sin violaciones con el menú cerrado y abierto.

### Implementation for User Story 1

- [X] T006 [US1] Crear `src/app/layouts/ProfileMenu.tsx` (research.md D3/D4/D5,
      contracts/profile-menu.md): botón disparador con `Avatar` (`src/shared/ui/Avatar.tsx`,
      `name`/`id` de `useOperatorIdentity()`) y nombre accesible de T004; `Menu`/`MenuItem` de MUI
      con el mismo patrón de accesibilidad que `SubscriptionStatusMenu.tsx` (estado `anchor`,
      `aria-haspopup="menu"`, `aria-controls`/`aria-expanded`, `useId()`); contenido: nombre +
      correo + role(s) (texto, no `MenuItem`) → `Divider` → "Mi perfil" (`MenuItem` con
      `component={NavLink}` a `/profile`) → `Divider` → "Cerrar sesión" (`MenuItem`, tono de
      peligro, `onClick` llama a `useLogout()` directo — no `<LogoutButton/>`, research.md D5).
      Hace pasar T005. Depende de T003, T004, T005.
- [X] T007 [US1] Modificar `src/app/layouts/HeaderUserMenu.tsx`: quitar el `Typography` del
      nombre, el `Button` "Perfil" y `<LogoutButton/>`; agregar `<ProfileMenu/>` donde vivía el
      `data-testid="header-reserved-slot"` original; agregar un contenedor vacío nuevo (mismo
      `data-testid="header-reserved-slot"` o uno renombrado, p. ej. `"language-reserved-slot"`)
      reservado para Spec 7, junto a `ProfileMenu` (research.md D6). Conserva el toggle de tema
      (009) sin cambios. Depende de T006. **Hecho**: el contenedor quedó renombrado a
      `language-reserved-slot` (Spec 5 ya no está "reservado", lo ocupa `ProfileMenu`).
- [X] T007b [US1] Alcance descubierto al ejecutar T007 (no estaba en el plan original — ver Notes
      al final): quitar `messages.nav.profile` ("Perfil") de `src/shared/messages/es.ts` como
      código muerto (su único uso en producción era el `Button` que T007 retiró), y actualizar
      **7 archivos de prueba de Vitest** (no solo `e2e/**`) que afirmaban el contrato viejo
      ("Perfil"/"Cerrar sesión" visibles sin abrir ningún menú, o el nombre como texto plano en el
      `banner`): `src/app/layouts/AppLayout.test.tsx`, `AppLayout.logout.test.tsx`,
      `AppLayout.profile.test.tsx`, `src/app/authFlow.integration.test.tsx`,
      `src/app/router/accessFlow.test.tsx` (2 puntos: aserción de logout y 2 aserciones del nombre
      como texto plano del `banner`), `src/app/router/dashboard/refresh.integration.test.tsx`,
      `src/app/router/users/editUser.integration.test.tsx` (2 puntos: nombre vivo en el header).
      Se creó `src/test/profileMenu.ts` (helper compartido: `profileMenuButton`, `openProfileMenu`,
      `logOutFromHeader`, `goToProfileFromHeader`) para no repetir la interacción "abrir menú → clic
      en la acción" en cada archivo. Verificado con la suite completa (`npx vitest run src`):
      238/239 archivos en verde, la única falla esperada es `ProfilePage.test.tsx` (US2, T013/T014).
- [X] T008 [US1] Modificar `src/app/layouts/HeaderUserMenu.test.tsx`: la aserción existente sobre
      el contenedor reservado pasa a probar el **nuevo** contenedor (Spec 7), que sigue vacío;
      quitar o mover a `ProfileMenu.test.tsx` cualquier aserción que ya no aplique aquí. Depende de
      T007. **Hecho**: también se agregó una aserción de que `ProfileMenu` (el botón de avatar) se
      renderiza dentro de `HeaderUserMenu`.
- [X] T009 [US1] Crear `e2e/fixtures/profileMenu.ts` (mismo patrón que `e2e/fixtures/signIn.ts` de
      010-skip-reauth-consent): `openProfileMenu(page)` (abre el menú desde el botón de avatar),
      `goToProfile(page)` (abre el menú y hace clic en "Mi perfil"), `logOut(page)` (abre el menú y
      hace clic en "Cerrar sesión") — contracts/profile-menu.md. Depende de T007 (necesita el DOM
      real para verificar los selectores). **Hecho**: también se exporta `profileMenuButton(page)`
      para los specs que solo necesitan comprobar que el botón está visible/oculto.
- [X] T010 [US1] Modificar `e2e/responsive.spec.ts`: `expectHeaderShortcuts` pasa a comprobar que
      el botón de avatar está visible en `role="banner"` (no "Perfil"/"Cerrar sesión" directos);
      donde el archivo ya abre el menú para interactuar (p. ej. ir a "Mi perfil"), usa
      `goToProfile(page)` de T009 en vez de `page.getByRole('link', {name: messages.nav.profile})`
      directo. Depende de T009.
- [X] T011 [US1] Modificar los puntos de interacción directa con "Perfil"/"Cerrar sesión" que
      quedan en `e2e/access.spec.ts`, `e2e/session.spec.ts` (1: cerrar sesión) y `e2e/token.spec.ts`
      (1: ir a "Mi perfil") para que usen `goToProfile(page)`/`logOut(page)` de T009 en vez de una
      consulta directa. Depende de T009. **Corrección sobre el plan original**: en
      `e2e/access.spec.ts` solo 2 de los 3 puntos usan el fixture (V10 de la cuenta autorizada, y el
      enlace "Perfil" oculto en "Sin acceso" ×1, que ahora comprueba `profileMenuButton(page)` en
      vez del enlace); el tercero (V10 de feature 006, cerrar sesión **desde** "Sin acceso") **no**
      cambia: ese botón es el `<LogoutButton/>` standalone de `AccessDeniedPage`, sin `ProfileMenu`
      de por medio (no hay `banner` en esa pantalla), así que sigue siendo una consulta directa.
- [X] T012 [US1] Verificar: `npm run typecheck && npm run lint && npm run format:check`, la suite
      de componentes completa (`npm test`) y `npx playwright test` — los specs que no necesitan
      `E2E_AUTH0_*` deben seguir en verde (línea base: 2 pasan, el resto se salta, igual que en
      main); confirmar que no hay fallas de compilación ni de lint en ninguno de los specs E2E
      tocados. Depende de T008, T010, T011. **Hecho**: typecheck/lint/format limpios; Playwright en
      la línea base exacta (2 pasan, 42 se saltan); Vitest completo verificado en T007b.

**Checkpoint**: User Story 1 completa de forma independiente — el menú funciona y ningún spec E2E
existente quedó roto por el cambio de contrato.

---

## Phase 4: User Story 2 - Avatar consistente en "Mi perfil" (Priority: P1)

**Goal**: "Mi perfil" muestra el mismo avatar (mismo criterio) que el encabezado, en vez de un
`Avatar` de MUI con un color fijo.

**Independent Test**: comparar el avatar del encabezado (de US1) con el de "Mi perfil" para la
misma persona — mismas iniciales, mismo color.

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] Modificar `src/features/profile/ProfilePage.test.tsx`: la pantalla renderiza
      el `Avatar` compartido (`src/shared/ui/Avatar.tsx`) con `name`/`id` de la identidad, no un
      `Avatar` de MUI con `bgcolor: 'primary.main'` fijo (data-model.md → Avatar). Debe fallar
      contra la implementación actual. **Hecho**: la prueba existente ("shows the initials in a
      decorative avatar...") ya fallaba sola tras T003 (`identity.initials` ya no existe); se
      renombró para citar FR-005 y 011. No se agregó una aserción de color aparte — data-model.md
      ya documenta que la consistencia de color "se cumple por construcción, no por una
      comprobación aparte" (mismo componente, mismos props).

### Implementation for User Story 2

- [X] T014 [US2] Modificar `src/features/profile/ProfilePage.tsx`: reemplazar el `<Avatar>` de MUI
      (`sx={{ bgcolor: 'primary.main' }}`, iniciales de `identity.initials`) por el `<Avatar>`
      compartido, pasando `name={identity.displayName}` e `id={identity.id}` (sin `photoUrl`, FR-004).
      Hace pasar T013. Depende de T003, T013. **Hecho**: también se agregó un prop opcional
      `decorative` a `src/shared/ui/Avatar.tsx` (mismo convenio que `Icon.tsx`) para que
      `ProfilePage` pueda seguir ocultando el avatar de lectores de pantalla junto al `<h1>`, algo
      que el `<Avatar>` compartido no permitía antes (no reenviaba `aria-hidden`); cubierto con una
      prueba nueva en `Avatar.test.tsx`.
- [ ] T015 [US2] Verificar (quickstart.md, paso 2): con la misma sesión, comparar visualmente el
      avatar del encabezado (US1) y el de "Mi perfil" — deben verse idénticos (mismas iniciales,
      mismo color). Depende de T014. **Pendiente de tu confirmación**: no hay credenciales reales
      de Auth0 en este entorno (igual que en 010), así que no pude abrir una sesión real para
      comparar visualmente las dos pantallas. La consistencia está garantizada por construcción
      (mismo componente, mismos `name`/`id`, data-model.md), pero la comprobación visual en
      `localhost` queda para cuando tú inicies sesión.

**Checkpoint**: User Story 2 completa de forma independiente — el avatar es consistente en las dos
pantallas que lo muestran.

---

## Phase 5: User Story 3 - Saber que cambiar la foto está planeado (Priority: P3)

**Goal**: "Mi perfil" ofrece una opción de "Cambiar foto" que, al activarse, avisa con claridad que
todavía no está disponible.

**Independent Test**: en "Mi perfil", activar "Cambiar foto" y confirmar que aparece un aviso claro
de que no está disponible, sin fallar en silencio ni simular un cambio.

### Prerequisites for User Story 3

> Constantes que la prueba de abajo necesita para poder escribir aserciones concretas — no son la
> implementación bajo prueba (esa es T019).

- [X] T016 [P] [US3] Agregar `Camera` de `lucide-react` a `src/shared/ui/iconRegistry.ts`
      (`'change-photo': Camera` o nombre equivalente) — ningún archivo fuera de `iconRegistry.ts`
      importa `lucide-react` directo (FR-007/FR-008 de 008-design-system, vigente).
- [X] T017 [P] [US3] Agregar a `src/shared/messages/es.ts`, en `profile`: `changePhoto` ("Cambiar
      foto", la etiqueta/nombre accesible del control) y `changePhotoUnavailable` (p. ej. "Cambiar
      la fotografía todavía no está disponible.", el texto del aviso).

### Tests for User Story 3 ⚠️

- [X] T018 [US3] Modificar `src/features/profile/ProfilePage.test.tsx`: existe un control
      "Cambiar foto" junto al avatar; al activarlo, se muestra (vía `useNotify()`, igual que el
      resto de avisos de la app) un mensaje de severidad informativa que dice con claridad que
      todavía no está disponible (FR-006, SC-004). Debe fallar contra la implementación actual.
      Depende de T014, T016, T017. **Hecho**: también se actualizó "offers nothing to edit (US5-2)"
      (ahora "...except the (not yet working) photo"), que afirmaba que no existía **ningún**
      botón en la pantalla — dejó de ser cierto en cuanto se agregó este control.

### Implementation for User Story 3

- [X] T019 [US3] Modificar `src/features/profile/ProfilePage.tsx`: agregar un control "Cambiar
      foto" (ícono de T016 + texto de T017) junto al avatar; su `onClick` llama a `useNotify()` con
      `severity: 'info'` y el mensaje de T017 — sin navegar, sin llamar a ninguna API
      (research.md D8). Hace pasar T018. Depende de T018.
- [ ] T020 [US3] Verificar (quickstart.md, paso 3): activar "Cambiar foto" en "Mi perfil" y
      confirmar que el aviso aparece con el texto esperado. Depende de T019. **Pendiente de tu
      confirmación** (mismo motivo que T015: sin credenciales reales de Auth0 en este entorno).
      Cubierto por una prueba automatizada (T018) que sí corre en este entorno.

**Checkpoint**: las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: verificación final de regresión y presupuesto de rendimiento.

- [X] T021 [P] Remedir el bundle (`npm run build && npm run size`) y comparar contra la línea base
      de T001; confirmar que se mantiene dentro de los 300 KB gzip (plan.md Performance Goals).
      **Resultado: 294,8 KB gzip (línea base T001: 284,8 KB; +10 KB por `Menu`/`MenuItem` de MUI,
      nuevos en el bundle principal para `ProfileMenu`) — dentro del presupuesto, margen de 5,2 KB.**
- [X] T022 [P] Correr la suite completa con cobertura: `npm test -- --coverage`; confirmar que
      `useOperatorIdentity` (hook de lógica pura, principio VII) mantiene ≥80 % de cobertura, y que
      `npx playwright test` sigue en el mismo estado de la línea base (los specs sin credenciales
      pasan, el resto se salta). **Resultado: 239/239 archivos de prueba en verde (2781/2781
      pruebas); `features/auth/hooks` (incluye `useOperatorIdentity.ts`, sin líneas sin cubrir en
      el reporte) al 97,82 %/96,07 %/95,74 %/98,51 % (stmts/branch/funcs/lines) — muy por encima
      del 80 % mínimo. Playwright: 2 pasan, 42 se saltan, línea base intacta.**
- [X] T023 Recorrer el checklist de aceptación rápida completo de `quickstart.md` (SC-001 a
      SC-004, FR-007, contracts/profile-menu.md) y confirmar cada fila antes de dar la feature por
      terminada. **Resultado**: SC-001, SC-003 y SC-004 confirmados por prueba automatizada
      (`ProfileMenu.test.tsx`: contenido del menú y "sin cambiar role/cuenta"; `ProfilePage.test.tsx`:
      aviso de "Cambiar foto") en este entorno; FR-007 confirmado por `ProfileMenu.test.tsx`
      (teclado + `axe`, cerrado y abierto); SC-002 garantizado por construcción (data-model.md:
      mismo componente, mismos props `name`/`id`) y por `Avatar.test.tsx`. El contrato de
      `contracts/profile-menu.md` está codificado en `e2e/responsive.spec.ts`/`e2e/access.spec.ts`,
      pero ningún spec que lo ejercita corre en este entorno sin `E2E_AUTH0_*` (misma limitación que
      010-skip-reauth-consent). Los 5 pasos manuales de "Levantar y probar manualmente" en
      `quickstart.md` (comparación visual del avatar, recorrido de teclado en una sesión real, el
      slot reservado en las herramientas de desarrollo) quedan pendientes de tu confirmación en
      `localhost` con una cuenta real, igual que T015/T020.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — empieza de inmediato.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea** las 3 historias de usuario (ambas
  necesitan `identity.id`; US3 depende de US2 por compartir archivo, ver abajo).
- **User Stories (Phase 3-5)**: todas dependen de Foundational. Entre sí:
  - **US1 (P1)**: sin dependencia de otras historias — es el MVP.
  - **US2 (P1)**: sin dependencia de US1 más allá de Foundational (toca un archivo distinto,
    `ProfilePage.tsx`, no `HeaderUserMenu`/`ProfileMenu`) — puede ir en paralelo con US1.
  - **US3 (P3)**: depende de que US2 (T014) haya tocado `ProfilePage.tsx` primero, porque agrega
    el control "Cambiar foto" en la misma zona del mismo archivo (evita conflicto de edición, no
    es una dependencia funcional real).
- **Polish (Phase 6)**: depende de que todas las historias deseadas estén completas.

### Within Each User Story

- T002 (prueba) antes de T003 (implementación) — lógica pura, test-first.
- T005 (prueba) antes de T006 (implementación) de `ProfileMenu`.
- T013 (prueba) antes de T014 (implementación) de US2.
- T018 (prueba) antes de T019 (implementación) de US3 — T018 depende de que T016/T017 (ícono y
  mensajes) ya existan para poder escribir la aserción.
- Dentro de US1: T004 puede ir en paralelo con T005 (archivos distintos); T009-T011 (E2E) solo
  después de T007 (necesitan el DOM real).

### Parallel Opportunities

- Foundational: ninguna (T002→T003 estrictamente secuencial, lógica pura).
- Una vez Foundational completo: US1 y US2 pueden avanzar en paralelo (equipos distintos, archivos
  distintos); US3 espera a que US2 termine T014.
- Dentro de US1: T004 en paralelo con T005.
- Dentro de US3: T016 en paralelo con T017.
- Polish: T021 y T022 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Antes de implementar ProfileMenu, en paralelo:
Task: "Agregar el nombre accesible del botón de avatar a src/shared/messages/es.ts"
Task: "Escribir src/app/layouts/ProfileMenu.test.tsx (debe fallar)"
```

---

## Implementation Strategy

### MVP First (Setup + Foundational + User Story 1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational) — `useOperatorIdentity().id` listo.
2. Completar Phase 3 (User Story 1) — el menú funciona y el E2E existente no se rompe.
3. **Detener y validar**: recorrer el Independent Test de US1 antes de seguir.

### Incremental Delivery

1. Setup + Foundational → `id` disponible para cualquier avatar.
2. + US1 → el menú de perfil reemplaza los controles sueltos (demo/aprobación, MVP).
3. + US2 → el avatar de "Mi perfil" queda consistente con el del encabezado (demo/aprobación).
4. + US3 → "Cambiar foto" avisa con claridad que no está disponible (demo/aprobación).
5. Polish → presupuesto de bundle, regresión completa y checklist de `quickstart.md`.

### Parallel Team Strategy

Con más de una persona: tras Foundational, una persona toma US1 (el menú y el E2E), otra toma US2
(`ProfilePage.tsx`); US3 espera a que la persona de US2 termine T014, porque agrega el control de
cambiar foto en la misma zona del mismo archivo.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes entre sí.
- `[Story]` ubica cada tarea en su historia de usuario para trazabilidad con `spec.md`.
- `e2e/access.spec.ts` conserva, sin cambios, el `click()` de "Cerrar sesión" **desde la pantalla
  "Sin acceso"** (V10 de feature 006): ahí no hay `banner` ni `ProfileMenu`, es el
  `<LogoutButton/>` standalone de `AccessDeniedPage` — no es parte del contrato que esta feature
  reemplaza. Sí cambia, en el mismo archivo, la aserción de que el botón de avatar está oculto ahí
  (antes era el enlace "Perfil").
- **Corrección post-T007 (ver T007b)**: el alcance real terminó siendo más amplio de lo que decía
  esta nota originalmente. Además de `src/app/layouts/**`,
  `src/features/auth/hooks/useOperatorIdentity*`, `src/features/profile/**`,
  `src/shared/messages/es.ts`, `src/shared/ui/{iconRegistry,Avatar}.tsx` y `e2e/**`, se modificaron
  7 pruebas de Vitest fuera de `src/app/layouts/**` que afirmaban el contrato de 008 contra el
  `AppLayout`/router completo, no solo contra `HeaderUserMenu` en aislamiento:
  `src/app/authFlow.integration.test.tsx`, `src/app/router/accessFlow.test.tsx`,
  `src/app/router/dashboard/refresh.integration.test.tsx` y
  `src/app/router/users/editUser.integration.test.tsx`; y se creó `src/test/profileMenu.ts` (helper
  de prueba compartido, análogo a `e2e/fixtures/profileMenu.ts` pero para Vitest/RTL). Ninguna otra
  feature ni archivo de producción fuera de la lista anterior se modifica.
