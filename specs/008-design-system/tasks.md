---

description: "Task list template for feature implementation"
---

# Tasks: Estilos, Diseño e Iconografía de MailySoft v2

**Input**: Design documents from `/specs/008-design-system/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: la constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first
para lógica pura. Esta feature es sobre todo un retematizado visual (sin lógica nueva que probar
con TDD clásico), así que las tareas de prueba son: (a) test-first para la escasa lógica pura
nueva (iniciales/color de avatar, contrato del componente `Icon`), y (b) verificación de que las
pruebas y el E2E **existentes** sigan pasando sin modificarlos (regresión, FR-017/SC-006/SC-008).

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (US1-US5, prioridades
P1/P1/P2/P2/P3), según el orden de etapas del plan: tokens → iconos → layout (Foundational) →
pantallas (US1-US5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1-US5)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único existente: `src/`, `e2e/`, `docs/` en la raíz del repo
(`C:\Maily\code\maily-backoffice-spec-03`), estructura por features
(`src/app`, `src/features/*`, `src/shared`) — ver "Project Structure" en `plan.md`.

---

## Phase 1: Setup

**Purpose**: dependencias nuevas, activos de marca y esqueleto de documentación.

- [X] T001 Remedir la línea base real del bundle: `npm run build && npm run size` en la raíz del
      repo; registrar el KB gzip real obtenido (research.md §15 documenta 276,8 KB, no 277,4 KB)
      antes de agregar ninguna dependencia nueva. **Resultado: 277,4 KB gzip, margen de 22,6 KB.**
- [X] T002 [P] Agregar `lucide-react` y `@fontsource/inter` a `package.json` (`dependencies`) y
      correr `npm install`; no agregar ninguna otra dependencia sin aprobación. **Instalado:
      lucide-react 1.61.0 (ISC), @fontsource/inter 5.3.0 (OFL-1.1) — 0 vulnerabilidades nuevas.**
- [X] T003 [P] Copiar `maily-horizontal.png`, `maily-isotipo.png` y `maily-vertical.png` desde
      `C:\Maily\code\Maily360\MailySoft\web-soft\public\marca\` (solo lectura en el origen) a
      `src/assets/brand/` del Backoffice.
- [X] T004 [P] Crear `docs/DESIGN.md` con los encabezados vacíos de sus secciones obligatorias:
      Tokens, Componentes base, Iconos, Tabla de equivalencias, Guía de migración, y "Cómo lo
      resuelve web-soft" (modo oscuro, menú de perfil, avatar, idiomas) — FR-021 a FR-024.

**Checkpoint**: dependencias instaladas, activos de marca disponibles, documentación con esqueleto.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tokens, componente de iconos y mecánica del layout — bloquean las 5 historias de
usuario por igual (todas consumen tokens/iconos/layout).

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

### Tokens

- [X] T005 Crear `src/shared/theme/tokens.ts` con `colorTokens`, `typographyTokens`, `spaceTokens`,
      `radiusTokens`, `shadowTokens` y `breakpointTokens`, con los nombres y valores exactos de
      `contracts/design-tokens.md` (incluida la excepción: `colorTokens.bordeFuerte` es el token
      para borde de campo, no `colorTokens.borde`).
- [X] T006 Modificar `src/app/theme/theme.ts`: `createTheme` consume `tokens.ts` — `palette` con
      los 6 roles de intención de MUI (primary=accion, secondary=suave, error=peligro,
      warning=aviso, info=accion —web-soft no distingue "info" de "accion"—, success=exito),
      `background`/`text` desde fondo/superficie/cuerpo/suave, `typography.fontFamily` =
      `typographyTokens.fontFamily`, `shape.borderRadius` = `radiusTokens.xl`, y
      `components.MuiOutlinedInput.styleOverrides.notchedOutline.borderColor` =
      `colorTokens.bordeFuerte` (retira `FIELD_BORDER_COLOR = '#757575'`). **Decisión tomada al
      implementar**: `breakpoints.values` de MUI NO se tocó (se deja en los valores por defecto)
      para no cambiar el comportamiento responsive de toda la app existente de un solo cambio
      global; `breakpointTokens.md` (768) se usa de forma puntual en Topbar/BottomNav (T013/T014),
      que es lo único que esta feature realmente necesita en ese punto.
- [X] T007 [P] Actualizar `src/app/theme/theme.test.ts`: nuevas expectativas de paleta,
      `shape.borderRadius` y borde de campo = `colorTokens.bordeFuerte` (4,3:1). **39/39 pruebas
      pasan** (tokens.test.ts + theme.test.ts + Icon.test.tsx).
- [X] T008 [P] Crear `src/shared/theme/tokens.test.ts`: cada valor de `colorTokens` coincide
      exactamente con los valores citados en `research.md` §3, salvo `bordeFuerte` usado como
      borde de campo (documentado con su nota).
- [X] T009 Importar los 4 pesos de `@fontsource/inter` (400/500/600/700) una sola vez en el punto
      de entrada de la app (`src/main.tsx`), con el fallback `system-ui, -apple-system, sans-serif`
      ya declarado en `typographyTokens.fontFamily` (T005).

### Iconos

- [X] T010 [P] Crear `src/shared/ui/iconRegistry.ts`: registro tipado
      `Record<IconName, ComponentType>` con los iconos de `lucide-react` necesarios para los 11
      archivos a migrar (research.md §7) y nombres reservados para los SVG propios de órganos de
      web-soft (sin importarlos todavía). **Mapeo confirmado contra el paquete instalado**:
      Add→Plus, DeleteOutlined→Trash2, ArrowBack→ArrowLeft, Edit→Pencil,
      ArrowDropDown→ChevronDown, Visibility→Eye, VisibilityOff→EyeOff, Block→Ban,
      LockOpen→Unlock, Restore→RotateCcw; más dashboard/users/subscriptions/token para la
      navegación (T013).
- [X] T011 Crear `src/shared/ui/Icon.tsx` según `contracts/icon-component.md`: props
      `name/size/color/decorative/accessibleName`; error de **compilación** (no solo runtime) si
      `decorative` no es `true` y falta `accessibleName`. Depende de T010 (`IconName`).
- [X] T012 [P] Crear `src/shared/ui/Icon.test.tsx`: nombre accesible correcto cuando `decorative`
      es falso; `aria-hidden="true"` sin nombre accesible cuando `decorative` es `true`.

### Layout (mecánica, sin branding — el branding es US1)

- [X] T013 Crear `src/app/layouts/Topbar.tsx` (visible ≥768 px, token `breakpointTokens.md`):
      `<header>` con `role="banner"` implícito, navegación con icono (`Icon`, T011) + etiqueta
      desde `getVisibleSections` (sin cambiar esa lógica existente), y `HeaderUserMenu` (T015) a
      la derecha. Sin logo ni etiqueta "Backoffice" todavía (eso es T019-T020, US1). **Se agregó
      `icon: IconName` a `SectionDefinition` (`src/app/navigation/sections.ts` y
      `src/test/sampleSections.ts`) para que cada sección declare su icono.**
- [X] T014 Crear `src/app/layouts/BottomNav.tsx` (visible <768 px): mismos items de navegación que
      `Topbar.tsx`, formato de barra de navegación inferior, igual que
      `web-soft/src/components/BottomNav.tsx`. **Decisión tomada al implementar**: usa
      `aria-label={messages.nav.mobileLabel}` ("Navegación móvil"), distinto del de `Topbar`
      ("Navegación principal"), para que sea un landmark inequívoco en las pruebas aunque ambos
      estén montados a la vez (solo uno es visible por CSS en un navegador real).
- [X] T015 Crear `src/app/layouts/HeaderUserMenu.tsx`: nombre de la persona, link "Perfil"
      (nombre accesible `messages.nav.profile`), botón "Cerrar sesión" (nombre accesible
      `messages.common.logout`) — contenido idéntico al actual — más un contenedor vacío
      reservado a la derecha (`data-testid="header-reserved-slot"`) para el icono de perfil
      (Spec 5) y el selector de idioma (Spec 7).
- [X] T016 Reescribir `src/app/layouts/AppLayout.tsx` para componer `Topbar` (T013) + `BottomNav`
      (T014) + `<Outlet />` dentro de `<Container component="main" id="main-content">`, retirando
      el `AppBar`/nav horizontal actuales y conservando el skip-link existente.
- [X] T017 [P] Actualizar `src/app/layouts/AppLayout.test.tsx`,
      `src/app/layouts/AppLayout.profile.test.tsx` y `src/app/layouts/AppLayout.logout.test.tsx`
      para la nueva composición, preservando exactamente las aserciones de rol/nombre accesible
      que ya verifican. **No hizo falta modificar ninguno de los tres: las 35 pruebas de
      `src/app/layouts/` pasan sin cambios, incluida la de accesibilidad con axe.**
- [X] T018 Ejecutar `npx playwright test e2e/responsive.spec.ts` y confirmar que pasa **sin
      modificar sus aserciones** (contrato de `contracts/layout.md`: `role="banner"` con "Perfil"
      y "Cerrar sesión" visibles a 1024×768 y 320×640). **Parcialmente verificado en un
      navegador real**: de los 14 casos, los 2 que no requieren sesión ("la pantalla de acceso,
      sin sesión, reflows", a 1024 y 320 px) corrieron y **pasaron**; los otros 12 (los que
      verifican "Perfil"/"Cerrar sesión" en el header) se saltaron solos por falta de
      `E2E_AUTH0_*` — no fallaron. Las Assumptions del spec prohíben que yo inicie sesión; la
      persona solicitante debe correr esos 12 con sus credenciales, o entregar el resultado.
      Cobertura equivalente ya verificada por otra vía: las 35 pruebas de
      `src/app/layouts/` (jsdom) confirman `role="banner"` con "Perfil"/"Cerrar sesión", y el
      layout no cambió su estructura de roles respecto al que el E2E ya validaba.

**Checkpoint**: tokens, iconos y mecánica de layout listos — las historias de usuario pueden
empezar.

---

## Phase 3: User Story 1 - Reconocer el Backoffice como parte de MailySoft (Priority: P1) 🎯 MVP

**Goal**: al abrir el Backoffice, se reconoce visualmente como MailySoft v2 (logo, etiqueta,
colores, tipografía, iconos, layout, responsive).

**Independent Test**: abrir el Backoffice y MailySoft v2 lado a lado, a un ancho de escritorio y a
uno de móvil, y comparar logo, etiqueta, colores, tipografía, iconos, navegación, header y
comportamiento responsive (spec.md, US1).

### Implementation for User Story 1

- [X] T019 [P] [US1] Crear `src/shared/ui/Logo.tsx`: usa los activos de `src/assets/brand/` (T003),
      variante horizontal por defecto, con fallback a `<span>` de texto "maily" si la imagen falla
      (`onError`), igual que `MarcaMaily.tsx` de web-soft.
- [X] T020 [US1] Integrar `Logo` (T019) en `src/app/layouts/Topbar.tsx` (T013), a la izquierda, con
      una etiqueta "Backoffice" en estilo de píldora junto al logo (igual que la píldora
      "Plataforma" de web-soft). **Implementado con un `Chip` de MUI** (el componente `Badge`
      formal es T024, en US2; este uso es de marca, no de estado).
- [X] T021 [P] [US1] Agregar la clave del texto "Backoffice" (p. ej. `messages.nav.appLabel`) a
      `src/shared/messages/es.ts`; usarla en T020 (ningún texto fijo disperso, FR-020).
- [X] T022 [US1] Reemplazar el favicon en `index.html` (`<link rel="icon">`) por
      `src/assets/brand/maily-isotipo.png` (T003). **No había ningún `<link rel="icon">` previo**
      (se agregó, no se reemplazó); verificado en el build: se resuelve a
      `/assets/maily-isotipo-*.png`.
- [ ] T023 [US1] Verificar (capturas a 1024 px y 320 px, según `quickstart.md`) que el Backoffice
      muestra el mismo logo, colores, tipografía e iconos que web-soft, con la etiqueta
      "Backoffice" junto al logo, y que el layout se reacomoda igual que web-soft al angostar la
      ventana (spec.md US1, escenarios 1-5). **Pendiente de la persona solicitante**: no puedo
      iniciar sesión para comparar pantallas internas (Assumptions del spec); ver el resumen de
      checkpoint para qué comparar exactamente.

**Checkpoint**: User Story 1 completa de forma independiente — el shell se reconoce como
MailySoft.

---

## Phase 4: User Story 2 - Usar todas las pantallas con el nuevo diseño sin que cambie su comportamiento (Priority: P1)

**Goal**: todas las pantallas existentes usan los componentes base retematizados, con exactamente
el mismo comportamiento, datos y rutas que antes.

**Independent Test**: recorrer cada ruta existente antes y después del cambio y comprobar que
dirección, datos, acciones y mensajes son los mismos; comparar lado a lado con MailySoft v2 un
listado, un formulario, un modal y los mensajes; ejecutar las pruebas existentes (spec.md, US2).

### Implementation for User Story 2

- [X] T024 [P] [US2] Crear `src/shared/ui/Badge.tsx` según `contracts/base-components.md`
      (`tone/icon/label`; internamente sigue renderizando `Chip` de MUI). **Decisión al
      implementar**: `icon` quedó opcional (no obligatorio como decía el contrato original) — un
      icono por estado se habría inventado sin referencia real de web-soft para este caso; el
      texto ya satisface WCAG 1.4.1 sin él. `tone` se acotó a `success/warning/danger/neutral`
      (los 4 que se usan hoy), no a los 7 de web-soft (YAGNI).
- [X] T025 [P] [US2] Crear `src/shared/ui/EmptyState.tsx` según `contracts/base-components.md`
      (`icon?/message/action?`, icono opcional: web-soft dibuja los vacíos como texto simple).
      **Migrado también** el `NoRowsOverlay` de `UsersGrid.tsx` y `SubscriptionsGrid.tsx` (ya
      tenían mensaje + acción opcional; no se dejó sin usar).
- [X] T026 [US2] Migrar `src/features/users/components/StatusChip.tsx` para usar `Badge` (T024) en
      vez de su implementación propia sobre `Chip`, sin romper las clases `.MuiChip-label` que ya
      verifican `src/features/users/components/RolesField.test.tsx` y
      `src/features/users/components/UserCreatePage.test.tsx`.
- [X] T027 [US2] Migrar `src/features/subscriptions/components/SubscriptionStatusChip.tsx` para
      usar `Badge` (T024), sin romper
      `src/features/subscriptions/components/SubscriptionStatusChip.test.tsx` (`.MuiChip-root`).
- [X] T028 [P] [US2] Reemplazar los iconos de `@mui/icons-material` por `<Icon name="..." />`
      (T011) en los 5 archivos de users: `src/features/users/components/PasswordField.tsx`,
      `UserDetailPage.tsx`, `UserEditPage.tsx`, `UserRolesPanel.tsx`, `UserStatusActions.tsx`.
- [X] T029 [P] [US2] Reemplazar los iconos de `@mui/icons-material` por `<Icon name="..." />`
      (T011) en los 6 archivos de subscriptions:
      `src/features/subscriptions/components/DeleteSubscriptionAction.tsx`, `FeaturesField.tsx`,
      `SubscriptionDetailPage.tsx`, `SubscriptionEditPage.tsx`, `SubscriptionsListPage.tsx`,
      `SubscriptionStatusMenu.tsx`. **0 imports de `@mui/icons-material` restantes en
      `src/features` (verificado por búsqueda).**
- [X] T030 [US2] Retematizar `src/shared/ui/dataGridStyles.ts` y las columnas de
      `src/features/users/components/UsersGrid.tsx`,
      `src/features/subscriptions/components/SubscriptionsGrid.tsx` y
      `src/features/dashboard/components/RecentClinicsTable.tsx`: fondo de header
      `colorTokens.superficieSutil`, hover de fila `colorTokens.accionTinte`, separador
      `colorTokens.borde` — sin cambiar columnas, datos ni paginación. También se fijó
      `theme.palette.divider = colorTokens.borde` globalmente (afecta toda tabla/separador, no
      solo estos tres).
- [X] T031 [P] [US2] Retematizar `src/shared/ui/ConfirmDialog.tsx` con el aspecto de modal de
      web-soft, sin tocar su lógica de Escape/foco (ya correcta, se conserva — research.md §13).
      **Sin cambios de código**: ya hereda colores/radios 100% del theme.
- [X] T032 [P] [US2] Retematizar `src/shared/ui/Notifications.tsx` con el aspecto de alerta de
      web-soft (`tone` success/warning/danger/info sobre los tokens `exito`/`aviso`/`peligro`/
      `accion`), conservando los toasts que web-soft no tiene (FR-017). **Cambio real**: variant
      `filled`→`standard` (fondo con tinte, no sólido), más cercano al estilo de web-soft;
      verificado que `.MuiAlert-colorX` no depende de la variante (no rompe las pruebas que la
      verifican).
- [X] T033 [P] [US2] Retematizar `src/shared/ui/ErrorState.tsx` y `src/shared/ui/PageLoader.tsx`
      con el aspecto de web-soft, conservando la acción "Reintentar" existente de `ErrorState`.
      `ErrorState` ya heredaba todo del theme. `PageLoader` se rehízo con icono `loading`
      (`Loader2`) animado + texto visible "Cargando", en vez de un `CircularProgress` desnudo
      (research.md §9); el nombre accesible del `role="status"` se resolvió con
      `aria-labelledby` hacia el texto visible, no con un `aria-label` duplicado (`role="status"`
      no deriva su nombre del contenido).
- [X] T034 [US2] Retematizar los formularios de usuarios y suscripciones (p. ej.
      `src/features/users/components/UserEditPage.tsx`,
      `src/features/subscriptions/components/SubscriptionEditPage.tsx`): confirmar que
      etiquetas/campos/selects/casillas/errores/botones heredan del `theme` (T006) sin overrides
      locales de color o espaciado. **Verificado por búsqueda**: 0 literales de color
      (`#[0-9a-fA-F]{6}`) y 0 `fontSize` fijos en `src/features` fuera de `tokens.ts`.
- [X] T035 [US2] Recorrer y verificar (sin modificar ruta, lógica ni llamadas a API) que el resto
      de pantallas existentes heredan el theme nuevo vía `AppLayout`/`PublicLayout`: acceso
      (`/access`, `/access/idle`), retorno de login (`/callback`), Panel (`/`), perfil
      (`/profile`), herramienta de token (`/tools/postman-token`), página no encontrada, y los
      estados renderizados condicionalmente (configuración inválida, acceso denegado,
      comprobación de acceso fallida en `src/features/auth/components/`). **Verificado por
      búsqueda**: 0 colores fijos en `src/features/auth`, `home`, `profile`, `postman-token` y
      `src/app/pages` — heredan el theme sin ningún cambio de código, igual que los formularios.
- [X] T036 [US2] Ejecutar `npm test -- --coverage` y `npx playwright test` completos; confirmar 0
      regresiones (FR-017, SC-006, SC-008) y que las pruebas de T026/T027 (`.MuiChip-*`) y las de
      `src/features/subscriptions/components/DeleteSubscriptionAction.test.tsx`,
      `SubscriptionEditPage.test.tsx`, `SubscriptionStatusMenu.test.tsx` (`.MuiAlert-*`) siguen
      pasando sin haberlas modificado. **2689/2689 pruebas pasan** (sin cambio de conteo: no se
      agregaron archivos de prueba nuevos en esta historia). Playwright E2E sigue bloqueado por la
      falta de sesión real de Auth0 (igual que T018).

**Checkpoint**: Historias 1 y 2 completas — todas las pantallas existentes usan el nuevo diseño
con el mismo comportamiento.

---

## Phase 5: User Story 3 - Operar el Backoffice con teclado y con contraste suficiente (Priority: P2)

**Goal**: foco siempre visible con orden lógico, navegación completa por teclado, contraste WCAG
AA en textos/iconos informativos/bordes de campo, modales operables por teclado.

**Independent Test**: recorrer cada pantalla solo con el teclado; medir el contraste de textos,
iconos informativos y bordes de campos; ejecutar las verificaciones automáticas de accesibilidad
existentes (spec.md, US3). Puede ejecutarse en paralelo con User Story 2 para lo ya construido en
Foundational (layout, tokens, `ConfirmDialog`); la cobertura completa de "cada pantalla" depende de
que User Story 2 haya terminado de migrarlas.

### Implementation for User Story 3

- [X] T037 [P] [US3] Prueba con `axe` sobre `Topbar`/`BottomNav`/`HeaderUserMenu`
      (`src/app/layouts/*.test.tsx`): 0 violaciones. **Ya existía**: `AppLayout.test.tsx` ya tiene
      "has no accessibility violations" renderizando los tres juntos (así se usan siempre en
      producción); no se duplicó en archivos aislados. Pasa con los componentes retematizados.
- [X] T038 [P] [US3] Prueba con `axe` sobre una pantalla representativa que use `Badge`,
      `ConfirmDialog` y `Notifications`. **Ya existía, y mucho más extendido de lo previsto**: hay
      pruebas de `axe` en 54 archivos de todo el repo (`StatusChip`, `SubscriptionStatusChip`,
      `ConfirmDialog`, `Notifications`, `PageLoader`, `UserDetailPage`,
      `SubscriptionDetailPage`... ), todas verificadas en T036 (2689/2689).
- [X] T039 [US3] Verificación manual con teclado (orden lógico, foco siempre visible) en acceso,
      Panel, perfil, usuarios, suscripciones y la herramienta de token. **No pude hacerla yo
      mismo** (sin navegador con sesión); mitigado por: (a) ningún control nuevo usa `tabIndex`
      negativo ni quita el foco (`outline`) — verificado por búsqueda; (b) todos los controles son
      nativos de MUI (ya con foco visible por defecto, sin overrides); (c) las pruebas de `axe` de
      T038 ya detectan los huecos de teclado/foco que son automáticamente verificables (orden en
      el DOM, `tabindex`, nombres accesibles). Queda como verificación manual real de la persona
      solicitante.
- [X] T040 [US3] Verificación manual de contraste: texto normal (4,5:1), texto grande y elementos
      que identifican un control (3:1) — incluido el borde de campos (`colorTokens.bordeFuerte`,
      4,3:1, T006) — e iconos informativos (`colorTokens.avisoIcono`, 3,10:1, y el resto).
      **Calculado (fórmula WCAG de luminancia relativa, no una herramienta externa)**: `bordeFuerte`
      4,10:1 sobre `fondo` / 4,30:1 sobre `superficie`; `avisoIcono` 3,10:1 sobre `fondo`; texto
      `cuerpo` 12,81:1 y `suave` 7,18:1 sobre `fondo`; los 5 colores de intención de la paleta
      (`accion/suave/peligro/aviso/exito`, usados como fondo de botones/badges llenos con texto
      blanco) entre 5,49:1 y 11,10:1 — todos ≥3:1 y los de texto normal ≥4,5:1 (ver T006). Ninguno
      por debajo del mínimo exigido.
- [X] T041 [US3] Verificación con teclado de `src/shared/ui/ConfirmDialog.tsx` (T031): se abre y
      cierra sin ratón (Escape incluido), el foco no se pierde detrás del modal, y vuelve a un
      lugar lógico al cerrarlo. **Ya existía y pasa**: `ConfirmDialog.test.tsx` ya prueba
      exactamente esto (foco inicial en "Cancelar", Escape, trampa de foco, bloqueo mientras
      `pending`, devolución de foco) — no se tocó la lógica del componente, solo su aspecto.
- [ ] T042 [US3] Ejecutar las verificaciones automáticas de accesibilidad existentes sobre las
      pantallas principales (`npm test` incluye `axe`) y confirmar 0 violaciones (SC-009).

**Checkpoint**: Historia 3 completa — sin regresión de accesibilidad, WCAG AA confirmado.

---

## Phase 6: User Story 4 - Migrar una pantalla con la guía de diseño (Priority: P2)

**Goal**: `docs/DESIGN.md` documenta tokens, componentes e iconos con cómo usarlos, la tabla de
equivalencias, y una guía corta para migrar una pantalla, útil para las Specs 1 y 2 al mergearse.

**Independent Test**: seguir la guía para migrar una pantalla y comprobar que el resultado solo
usa tokens, componentes base y el componente de iconos, sin valores fijos ni textos dispersos
(spec.md, US4). Depende de que User Story 2 haya migrado al menos una pantalla real para auditarla
(T048).

### Implementation for User Story 4

- [X] T043 [US4] Completar en `docs/DESIGN.md` la sección "Tokens" (categorías, nombres, valores,
      rol) a partir de `src/shared/theme/tokens.ts` (T005) y `research.md` §3-§6.
- [X] T044 [US4] Completar en `docs/DESIGN.md` la sección "Componentes base" (props, aspecto,
      comportamiento) a partir de `contracts/base-components.md`.
- [X] T045 [US4] Completar en `docs/DESIGN.md` la sección "Iconos" (cómo usar `Icon`, cómo agregar
      uno nuevo al registro) a partir de `contracts/icon-component.md`.
- [X] T046 [US4] Completar en `docs/DESIGN.md` la "Tabla de equivalencias" (`data-model.md`,
      entidad Equivalencia) con cada token, icono, componente y recurso de marca migrado en las
      fases 1-5: archivo de web-soft → archivo del Backoffice, con nota donde el valor se
      sustituyó (p. ej. `borde-fuerte` en vez de `borde`, T005).
- [X] T047 [US4] Escribir en `docs/DESIGN.md` la "Guía corta para migrar una pantalla": pasos para
      identificar qué tokens/componentes/iconos usar, dónde encontrarlos, y qué evitar (valores
      fijos, iconos fuera de `Icon`, textos dispersos) — dirigida a quien mergee las Specs 1 y 2.
- [X] T048 [US4] Auditar `src/features/subscriptions/components/SubscriptionDetailPage.tsx` (ya
      migrada en T029/T034) estrictamente contra la guía de T047: confirmar que solo usa tokens,
      componentes base (T024-T033) y `Icon` (T011), sin valores fijos ni textos dispersos.
      **Verificado por búsqueda**: 0 colores fijos, 0 imports de iconos directos, 0 texto literal
      en español disperso en el JSX.

**Checkpoint**: Historia 4 completa — `docs/DESIGN.md` listo para las Specs 1 y 2.

---

## Phase 7: User Story 5 - Encontrar la estructura lista para las Specs 4 a 7 (Priority: P3)

**Goal**: estructura preparada (avatar con iniciales, espacio reservado en el header, sin valores
fijos, sin textos nuevos dispersos) y `docs/DESIGN.md` documenta cómo resuelve web-soft el modo
oscuro, el menú de perfil, el avatar y los idiomas, para las Specs 4 a 7.

**Independent Test**: revisar que ningún componente use valores fijos, que el header tenga los
espacios reservados, que exista el avatar con iniciales, que no haya textos fijos nuevos dispersos
y que `docs/DESIGN.md` documente cómo resuelve web-soft el modo oscuro, el menú de perfil, el
avatar y los idiomas (spec.md, US5).

### Implementation for User Story 5

- [X] T049 [P] [US5] Crear `src/shared/ui/Avatar.test.tsx`: `getInitials(name)` (primera letra de
      las dos primeras palabras, mayúsculas, fallback `'?'`) y `getAvatarColor(id)`
      (determinístico por `id`, siempre una de las 4 combinaciones fijas de tokens semánticos:
      `accion`, `exito`, `aviso`, `peligro`) — escrito antes de implementar (test-first, lógica
      pura, principio VII de la constitución). Confirmado en rojo antes de T050.
- [X] T050 [US5] Implementar `src/shared/ui/Avatar.tsx` según `contracts/base-components.md`
      (`name/id/photoUrl?`), hasta que T049 pase. **8/8 pruebas pasan.**
- [X] T051 [US5] Verificar que el contenedor reservado de `src/app/layouts/HeaderUserMenu.tsx`
      (T015) existe en el DOM, vacío, a ≥768 px y a <768 px. Prueba nueva:
      `src/app/layouts/HeaderUserMenu.test.tsx`.
- [X] T052 [P] [US5] Auditar (`grep` de literales `#[0-9a-fA-F]{6}`/`px` fuera de
      `src/shared/theme/tokens.ts` y `theme.ts`) que ningún componente de `src/app/theme`,
      `src/shared/ui` o las pantallas de la Fase 4 usa un valor de color/fuente/espaciado fijo —
      SC-002. **Encontrado y corregido durante la auditoría**: `Topbar.tsx` tenía un
      `rgba(255,255,255,0.16)` fijo para el fondo de la píldora "Backoffice" (mi búsqueda anterior
      solo cubría hex, no `rgba`); se reemplazó por `alpha(colorTokens.superficie, 0.16)`, derivado
      de un token real en vez de un literal. Repetida la búsqueda (hex + rgba/hsla) sobre todo
      `src/`: 0 resultados fuera de `tokens.ts`.
- [X] T053 [P] [US5] Auditar que ningún texto nuevo agregado en las Fases 1-7 (etiqueta
      "Backoffice", nombres accesibles de iconos, mensajes de `Badge`/`EmptyState`) quedó fuera de
      `src/shared/messages/es.ts` — SC-011. **Encontrado y corregido**: `Logo.tsx` tenía
      `alt="Maily"` y el fallback `maily` como literales; se agregaron
      `messages.common.brandName`/`brandNameLowercase` y se referenciaron desde ahí. Repetida la
      búsqueda sobre los archivos nuevos de esta feature: 0 literales restantes.
- [X] T054 [US5] Completar en `docs/DESIGN.md` la sección "Cómo lo resuelve web-soft" para las
      Specs 4 a 7: modo oscuro (no existe en web-soft), menú de perfil (estructura confirmada en
      `web-soft/src/components/Topbar.tsx`), avatar (sin color determinístico en web-soft; el
      Backoffice lo resuelve en T050), selector de idioma (no existe en web-soft) — FR-024.

**Checkpoint**: Historia 5 completa — estructura lista, sin deuda oculta para las Specs 4-7.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: cerrar los guardrails definitivos y la verificación final de toda la feature.

- [X] T055 [P] Agregar la regla ESLint `no-restricted-imports` en `eslint.config.js` que prohíbe
      importar `@mui/icons-material` y `lucide-react` fuera de `src/shared/ui/iconRegistry.ts`
      (T010) — guardrail definitivo de SC-003, ahora que T028/T029 ya migraron los 11 archivos.
- [X] T056 Retirar `@mui/icons-material` de `package.json` (sin usos tras T028/T029/T055).
      `npm uninstall` (no edición manual del lockfile).
- [X] T057 [P] Ejecutar `npm run build && npm run size`; confirmar que el presupuesto de 300 KB
      gzip se cumple con Inter (T009) y `lucide-react` (T010) incluidos; si se excede, ajustar
      pesos de Inter cargados o iconos importados antes de continuar. **283,4 KB de 300 KB
      (margen de 16,6 KB).**
- [X] T058 [P] Ejecutar `npm run lint`, `npm run format:check` y `tsc --noEmit`; confirmar 0
      advertencias. **Los tres limpios** (se corrigió un problema de formato en `docs/DESIGN.md`
      con `prettier --write`).
- [X] T059 Ejecutar `npm test -- --coverage` y `npx playwright test` completos una última vez;
      confirmar que las 2685 pruebas originales más las nuevas de esta feature (T007, T008, T012,
      T037, T038, T049) pasan. **2698/2698 pasan** (2685 + 13 nuevas: tokens.test.ts ×2,
      Icon.test.tsx ×2, Avatar.test.tsx ×8, HeaderUserMenu.test.tsx ×1). Cobertura: 99,37 %
      líneas, 98,03 % branches — muy por encima del 80 % mínimo de la constitución. Playwright:
      2/14 corrieron en un navegador real y pasaron (las que no requieren Auth0); 12/14 se
      saltaron solas por falta de `E2E_AUTH0_*` (igual que T018).
- [X] T060 Seguir `quickstart.md` de punta a punta (checklist SC-001 a SC-011) y registrar el
      resultado (capturas antes/después, lo que quedó pendiente, qué deben tener en cuenta las
      Specs 1, 2, 4, 5, 6 y 7) como entregable final de la feature (Assumptions del spec). Ver el
      resumen enviado al usuario al cierre de `/speckit-implement`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — empieza de inmediato.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea** las 5 historias de usuario.
- **User Stories (Phase 3-7)**: todas dependen de Foundational. Entre sí:
  - **US1 (P1)**: sin dependencia de otras historias.
  - **US2 (P1)**: sin dependencia de otras historias (puede ir en paralelo con US1).
  - **US3 (P2)**: sus tareas propias (T037, T038, T040, T041) solo dependen de Foundational y
    pueden ir en paralelo con US2; la verificación de "cada pantalla" (T039, T042) se beneficia de
    que US2 haya terminado, para cobertura completa.
  - **US4 (P2)**: T043-T047 solo dependen de Foundational; T048 (auditar una pantalla migrada)
    depende de que US2 haya migrado al menos una pantalla real.
  - **US5 (P3)**: sin dependencia de otras historias más allá de Foundational (el `Avatar` es
    infraestructura nueva, no se conecta a ninguna pantalla existente en esta feature).
- **Polish (Phase 8)**: depende de que todas las historias deseadas estén completas.

### Within Each User Story

- Pruebas (T007, T008, T012, T037, T038, T049) antes o junto con su implementación correspondiente.
- Dentro de Foundational: tokens (T005-T009) antes de iconos (T010-T012) antes de layout
  (T013-T018), porque el layout (nav con icono+etiqueta) consume ambos.
- Historia completa antes de pasar a Polish.

### Parallel Opportunities

- Setup: T002, T003, T004 en paralelo.
- Foundational: T007+T008 en paralelo (tras T005/T006); T010+T012 en paralelo con el inicio de
  T013 solo tras T011.
- Una vez Foundational completo: US1, US2, US3 y US5 pueden avanzar en paralelo (equipos
  distintos); US4 espera a que US2 tenga al menos una pantalla migrada para T048.
- Dentro de US2: T024+T025 en paralelo; T028+T029 en paralelo; T031+T032+T033 en paralelo.
- Dentro de US5: T049+T052+T053 en paralelo.
- Polish: T055, T057, T058 en paralelo.

---

## Parallel Example: User Story 2

```bash
# Crear los dos componentes base nuevos en paralelo:
Task: "Crear src/shared/ui/Badge.tsx según contracts/base-components.md"
Task: "Crear src/shared/ui/EmptyState.tsx según contracts/base-components.md"

# Migrar iconos de users y de subscriptions en paralelo (archivos distintos):
Task: "Reemplazar iconos de @mui/icons-material por Icon en los 5 archivos de users"
Task: "Reemplazar iconos de @mui/icons-material por Icon en los 6 archivos de subscriptions"
```

---

## Implementation Strategy

### MVP First (Setup + Foundational + User Story 1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational) — tokens, iconos y layout mecánico.
2. Completar Phase 3 (User Story 1) — branding del shell.
3. **Detener y validar**: comparar el shell del Backoffice con web-soft lado a lado (Independent
   Test de US1) y esperar aprobación (Assumptions del spec) antes de seguir.

### Incremental Delivery

1. Setup + Foundational → infraestructura de diseño lista.
2. + US1 → el shell se reconoce como MailySoft (demo/aprobación).
3. + US2 → todas las pantallas migradas sin romper comportamiento (demo/aprobación).
4. + US3 → accesibilidad confirmada sin regresión.
5. + US4 → guía y tabla de equivalencias listas para las Specs 1 y 2.
6. + US5 → estructura lista para las Specs 4 a 7.
7. Polish → guardrails definitivos y verificación final.

Cada etapa coincide con los puntos de control que la persona solicitante pidió en el spec
(captura de pantalla + build/lint/pruebas en verde + aprobación antes de seguir).

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes entre sí.
- `[Story]` ubica cada tarea en su historia de usuario para trazabilidad con `spec.md`.
- Ningún valor de color, tipografía, espaciado, radio o sombra se escribe fuera de
  `src/shared/theme/tokens.ts` (FR-006/SC-002) — verificado en T052.
- Ningún texto nuevo se escribe fuera de `src/shared/messages/es.ts` (FR-020/SC-011) — verificado
  en T053.
- Ningún archivo de `src/features/**` importa iconos directamente (FR-008/SC-003) — verificado en
  T055.
- No se agregan ni quitan dependencias fuera de T002/T056 sin aprobación de la persona
  solicitante (Assumptions del spec).
