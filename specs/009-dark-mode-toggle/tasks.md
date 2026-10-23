---

description: "Task list template for feature implementation"
---

# Tasks: Modo Oscuro y Claro del Backoffice

**Input**: Design documents from `/specs/009-dark-mode-toggle/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/theme-mode.md](./contracts/theme-mode.md), [quickstart.md](./quickstart.md)

**Tests**: la constitución (principio VII) exige pruebas automatizadas en el mismo PR y test-first
para lógica pura. `ThemeModeProvider` (resolución de modo, persistencia, preferencia de sistema) es
lógica pura sin JSX: sus pruebas van **antes** de su implementación (T006→T007, T017→T018). El
resto de la feature es sobre todo integración visual (control en el header, contenedor del
logotipo): sus pruebas acompañan la implementación en la misma tarea o inmediatamente después, y se
suma la verificación de que las pruebas y el E2E **existentes** (`HeaderUserMenu.test.tsx` → slot
reservado vacío; `e2e/responsive.spec.ts` → banner con Perfil/Cerrar sesión a 1024/320 px) siguen
pasando sin modificar sus aserciones actuales.

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (US1/US1.../US2 son en
realidad US1=P1 "elegir el tema", US2=P1 "logotipo legible", US3=P2 "preferencia recordada"), en el
orden de prioridad del spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3)
- Cada tarea incluye la ruta exacta de archivo

## Path Conventions

Proyecto único existente: `src/`, `e2e/` en la raíz del repo (`C:\Maily\code\maily-backoffice`),
estructura por features (`src/app`, `src/features/*`, `src/shared`) — ver "Project Structure" en
`plan.md`. Ningún archivo de `src/features/**` se toca en esta feature.

---

## Phase 1: Setup

**Purpose**: línea base antes de tocar el tema compartido por toda la app.

- [X] T001 Remedir la línea base real del bundle: `npm run build && npm run size` en la raíz del
      repo; registrar el KB gzip obtenido (plan.md Performance Goals: presupuesto 300 KB gzip en la
      ruta de entrada) antes de empezar, para poder comparar en el Polish final (T020). **Resultado:
      283,7 KB gzip, margen de 16,3 KB.**

**Checkpoint**: línea base de bundle registrada.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el segundo set de tokens, el tema paramétrico por modo y los íconos nuevos — bloquean
las 3 historias de usuario por igual (todas renderizan a través de `createAppTheme`).

**⚠️ CRITICAL**: ninguna historia de usuario empieza hasta que esta fase esté completa.

- [X] T002 [P] Agregar `colorTokensOscuro` a `src/shared/theme/tokens.ts`: mismas claves que
      `colorTokens` (`fondo`, `superficie`, `superficieSutil`, `accion`, `accionHover`,
      `accionTinte`, `accionBorde`, `marca`, `marcaOscuro`, `marcaTinte`, `marcaBorde`, `tinta`,
      `cuerpo`, `suave`, `tenue`, `borde`, `bordeFuerte`, `exito`/`exitoTinte`/`exitoBorde`,
      `aviso`/`avisoIcono`/`avisoTinte`/`avisoBorde`, `peligro`/`peligroHover`/`peligroTinte`/
      `peligroBorde`), valores propios ajustados a WCAG 2.1 AA sobre los nuevos fondos oscuros
      (data-model.md → "Set de valores (oscuro)"; no hay modo oscuro de web-soft que copiar,
      docs/DESIGN.md). Cada color de estado (`exito`/`aviso`/`peligro`) y sus variantes DEBE seguir
      siendo reconocible como el mismo estado que en el set claro (mismo matiz aproximado).
- [X] T003 Modificar `src/app/theme/theme.ts`: reemplazar `export const theme` estático por
      `export function createAppTheme(mode: 'claro' | 'oscuro')`, que arma el `palette` de
      `createTheme` a partir de `colorTokens` (modo `'claro'`) o `colorTokensOscuro` (modo
      `'oscuro'`, T002); el resto de la configuración (tipografía, forma, overrides de componentes,
      locales de MUI) no cambia entre modos (research.md D1). Depende de T002.
- [X] T004 [P] Modificar `src/app/theme/theme.test.ts`: extender las aserciones de contraste
      existentes (`INTENTS` — contraste texto/color ≥4,5:1 — y el borde de campos ≥3:1) para que
      corran también contra `createAppTheme('oscuro')`, no solo contra el tema claro actual
      (data-model.md → validación del Set de valores oscuro). Depende de T003.
- [X] T005 [P] Agregar los íconos `Sun` y `Moon` de `lucide-react` (ya instalado) a
      `src/shared/ui/iconRegistry.ts` con nombres `'theme-light'`/`'theme-dark'` (o equivalentes);
      ningún archivo fuera de `iconRegistry.ts` importa `lucide-react` directo (FR-007/FR-008 de
      008-design-system, research.md D8).

**Checkpoint**: tema paramétrico por modo listo — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Elegir el tema de la interfaz (Priority: P1) 🎯 MVP

**Goal**: un control siempre visible en el header permite alternar entre tema claro y oscuro,
aplicado de inmediato y de forma consistente a toda la aplicación, sin zonas del tema contrario.

**Independent Test**: iniciar sesión, activar el control, y recorrer Panel/Usuarios/Suscripciones/
Token/Perfil (desktop y móvil) verificando que todo el contenido visible respeta el tema activo
(spec.md, US1).

### Tests for User Story 1 ⚠️

> Lógica pura (constitución, principio VII): escribir esta prueba primero, verla fallar, luego
> implementar T007.

- [X] T006 [US1] Crear `src/app/providers/ThemeModeProvider.test.tsx`: `useThemeMode()` fuera de
      `ThemeModeProvider` lanza (mismo contrato que `useAppSettings`/`useNotify`,
      contracts/theme-mode.md); el valor inicial expone `mode: 'claro'` (placeholder simple de esta
      historia — T017/T018 de US3 lo reemplazan por la resolución completa de sistema/
      persistencia); `toggle()` cambia `mode` a `'oscuro'` y de vuelta a `'claro'` en llamadas
      sucesivas, y actualiza `source` a `'explicita'`.

### Implementation for User Story 1

- [X] T007 [US1] Crear `src/app/providers/ThemeModeProvider.tsx`: Context + hook `useThemeMode()`
      que expone `{ mode, source, toggle }` (contracts/theme-mode.md); arma el tema con
      `createAppTheme(mode)` (T003) y renderiza internamente `<ThemeProvider>` +
      `<CssBaseline enableColorScheme />` de MUI — `enableColorScheme` fija la propiedad CSS
      `color-scheme` según `mode`, corrigiendo que los controles nativos del navegador (barra de
      desplazamiento, formularios) queden desalineados del tema activo (research.md D5, FR-008).
      Hace pasar T006. Depende de T003, T006.
- [X] T008 [P] [US1] Modificar `src/app/providers/AppProviders.tsx`: reemplazar
      `<ThemeProvider theme={theme}><CssBaseline /></ThemeProvider>` por `<ThemeModeProvider>`, en
      el mismo nivel más externo (para que hasta el `ErrorBoundary` global y sus fallbacks respeten
      el tema activo). Depende de T007. **Hallazgo al implementar**: `src/app/ConfigErrorScreen.tsx`
      es un 5º importador directo del `theme` estático que el plan no había listado (pantalla previa
      al montaje de `AppProviders`, cuando la configuración de entorno es inválida); se cambió a
      `createAppTheme('claro')` directo en vez de `ThemeModeProvider`, a propósito: es una pantalla
      de error fatal, deliberadamente aislada de la máquina de estado de tema (localStorage/
      matchMedia) del resto de la app.
- [X] T009 [P] [US1] Actualizar los 4 arneses de prueba que hoy importan el `theme` estático
      directamente para que usen `ThemeModeProvider` en su lugar: `src/test/renderWithProviders.tsx`,
      `src/test/renderApp.tsx`, `src/app/providers/forbidden.test.tsx`,
      `src/shared/ui/Notifications.test.tsx`. Depende de T007.
- [X] T010 [P] [US1] Agregar a `src/shared/messages/es.ts` los textos del control de tema (nombre
      accesible según el modo activo, p. ej. "Cambiar a tema oscuro" / "Cambiar a tema claro"), sin
      literales dispersos en JSX (principio VI de la constitución).
- [X] T011 [US1] Modificar `src/app/layouts/HeaderUserMenu.tsx`: agregar el control de tema (botón
      con ícono `Sun`/`Moon` de T005 según `mode`, nombre accesible de T010, llama a
      `useThemeMode().toggle()`) **antes** del contenedor `data-testid="header-reserved-slot"`, que
      permanece vacío y sin tocar (reservado para Spec 5/7, contracts/theme-mode.md). Depende de
      T005, T007, T010.
- [X] T012 [US1] Modificar `src/app/layouts/HeaderUserMenu.test.tsx`: nueva aserción — el control de
      tema existe, es operable por teclado, tiene nombre accesible, y activarlo cambia
      `useThemeMode().mode` — sin modificar la aserción existente de que `header-reserved-slot`
      queda vacío. Depende de T009, T011.
- [X] T013 [US1] Verificar (quickstart.md, paso 2) que `npx playwright test` —
      `e2e/responsive.spec.ts` (`expectHeaderShortcuts`, banner con "Perfil" y "Cerrar sesión"
      visibles a 1024×768 y 320×640) sigue pasando sin modificar sus aserciones, y recorrer
      manualmente Panel/Usuarios/Suscripciones/Token/Perfil con el control activado, confirmando que
      ninguna pantalla deja zonas del tema contrario. Depende de T008, T011, T012. **Resultado**:
      `e2e/responsive.spec.ts` sigue en verde (2 pasan sin credenciales; los 12 que necesitan sesión
      real — `E2E_AUTH0_USER_A1`/`A9` — se saltan igual que en `main`, no es una regresión). Abrí
      `/access` con Playwright contra `npm run dev`: sin errores de consola, `color-scheme: light` y
      fondo `rgb(246, 250, 253)` (= `colorTokens.fondo`) — confirma que `ThemeModeProvider` quedó
      bien conectado de punta a punta. No pude iniciar sesión real para recorrer
      Panel/Usuarios/Suscripciones/Token/Perfil visualmente (sin credenciales Auth0 en este
      entorno) ni comparar tema oscuro todavía (en US1 el modo inicial es siempre claro a propósito;
      T019, en US3, es donde el modo oscuro se vuelve alcanzable sin iniciar sesión, vía preferencia
      de sistema en `/access`) — la cobertura de componentes (`HeaderUserMenu.test.tsx`,
      `theme.test.ts` en ambos modos) cubre el resto.

**Checkpoint**: User Story 1 completa de forma independiente — el control cambia el tema de toda la
aplicación.

---

## Phase 4: User Story 2 - Logotipo legible en ambos temas (Priority: P1)

**Goal**: el logotipo de Maily en la barra superior se distingue con buen contraste tanto en tema
claro como en oscuro, con el mismo archivo de imagen de hoy.

**Independent Test**: comparar visualmente la barra superior en tema claro y en tema oscuro,
confirmando que el logotipo se distingue claramente de su fondo en ambos casos (spec.md, US2).

### Implementation for User Story 2

- [X] T014 [P] [US2] Crear `src/shared/ui/Logo.test.tsx`: el contenedor de contraste fijo
      (data-model.md → "Tratamiento de contraste del logotipo") está presente detrás de la imagen
      en ambos temas (`appliesInBothModes: true` — no se desactiva en ninguno), y el token de fondo
      elegido para el contenedor mantiene contraste ≥3:1 (WCAG 1.4.11, mismo criterio que el borde
      de campos de 008-design-system) contra el fondo de la barra superior (`accion` en
      `colorTokens` y en `colorTokensOscuro`, T002).
- [X] T015 [US2] Modificar `src/shared/ui/Logo.tsx`: envolver la imagen actual
      (`maily-horizontal.png`, sin reemplazarla — resuelto en Clarifications de spec.md) en un
      contenedor con fondo de contraste fijo, activo en ambos temas (research.md D6). Hace pasar
      T014. Depende de T002, T014.
- [X] T016 [US2] Verificar (quickstart.md, paso 4) comparando capturas de la barra superior en tema
      claro y en tema oscuro que el logotipo se distingue con buen contraste en ambos. Depende de
      T015. **Resultado**: `Logo` solo se monta en `Topbar` (pantallas autenticadas, sin
      credenciales Auth0 en este entorno — mismo límite que T013), así que se armó una vista
      temporal, fuera del árbol de rutas real (un `AppBar` + `Logo` aislado, con `createAppTheme`
      de cada modo, servido por el propio `npm run dev` y borrado después de la captura), para
      comparar visualmente la barra superior en ambos temas. El logotipo quedó claramente legible
      sobre el chip de contraste fijo en los dos casos — corrige el defecto de la captura original
      del pedido.

**Checkpoint**: User Story 2 completa de forma independiente — el logotipo es legible en ambos
temas.

---

## Phase 5: User Story 3 - Preferencia de tema recordada entre visitas (Priority: P2)

**Goal**: la elección de tema se recuerda en el dispositivo/navegador donde se hizo, y el tema
inicial (antes de cualquier elección) sigue la preferencia de apariencia del sistema.

**Independent Test**: elegir un tema, recargar la pestaña desde el mismo dispositivo, confirmar que
el tema elegido sigue activo; sin elección previa, abrir por primera vez y confirmar que el tema
inicial coincide con la preferencia del sistema (spec.md, US3).

### Tests for User Story 3 ⚠️

> Amplía el mismo archivo de T006 (lógica pura, test-first): no es `[P]`, continúa T006/T007.

- [X] T017 [US3] Ampliar `src/app/providers/ThemeModeProvider.test.tsx` (T006): sin valor guardado
      en `localStorage`, el modo inicial sigue `window.matchMedia('(prefers-color-scheme: dark)')`
      y `source` es `'sistema'` (data-model.md, transición 1); con un valor guardado válido
      (`"claro"`/`"oscuro"`), el modo inicial es ese valor y `source` es `'explicita'` (transición
      2); un valor guardado que no sea exactamente uno de los dos esperados se descarta y se trata
      como si no existiera (research.md D3, principio II de la constitución); mientras
      `source === 'sistema'`, un evento `change` de la media query actualiza `mode` (transición 4);
      tras `toggle()` (`source` pasa a `'explicita'`, transición 3), un `change` posterior de la
      media query **no** modifica `mode` (transición 5, FR-006); `toggle()` escribe el nuevo valor
      en `localStorage` bajo la clave `maily-backoffice:theme-mode`.

### Implementation for User Story 3

- [X] T018 [US3] Completar `src/app/providers/ThemeModeProvider.tsx` (T007): inicializador perezoso
      de `useState` que lee `localStorage['maily-backoffice:theme-mode']` y resuelve `mode`/`source`
      según las transiciones 1-2 de data-model.md; un `useEffect` que suscribe el evento `change` de
      `matchMedia('(prefers-color-scheme: dark)')` y actualiza `mode` solo mientras
      `source === 'sistema'` (transición 4), con limpieza al desmontar; `toggle()` persiste el
      nuevo valor en `localStorage` (transición 3). Hace pasar T017. Depende de T007, T017.
      **Hallazgos al implementar**: (1) `jsdom` no implementa `window.matchMedia`; como
      `ThemeModeProvider` ahora envuelve toda la app, cualquier prueba que renderizara la app entera
      rompía al montar. Se agregó un stub global por defecto (`matches: false`) en
      `src/test/setup.ts`, junto al resto de los polyfills que ya viven ahí por la misma razón
      (varias pruebas lo necesitan, no solo esta feature). (2) La regla de ESLint
      `no-restricted-globals`/`no-restricted-properties` prohibía `localStorage` en todo el
      proyecto (atada al Principio V, pensada para tokens de Auth0) — la constitución ya permite
      "preferencias de UI no sensibles" en el navegador, así que se amplió `eslint.config.js` con
      una excepción acotada para `ThemeModeProvider.tsx`/`.test.tsx`, siguiendo el mismo patrón que
      ya usan `httpClient.ts` y `returnPathStorage.ts` (no fue necesaria una enmienda de
      constitución: el texto ya lo permitía, solo faltaba la excepción en la regla).
- [X] T019 [US3] Verificar (quickstart.md, pasos 1 y 3): con el sistema en oscuro y sin uso previo
      del control en el navegador, el Backoffice abre en tema oscuro, y sigue en vivo un cambio de
      preferencia del sistema hecho con la app abierta; elegir un tema, recargar la pestaña, y
      confirmar que el tema elegido sigue activo sin consultar más al sistema (FR-006/FR-007,
      SC-004). Depende de T018. **Resultado**: con `/access` (pública, sin necesitar sesión) servida
      por `npm run dev` y Playwright emulando `prefers-color-scheme`, confirmé en un navegador real
      las cuatro transiciones de `data-model.md`: (1) sistema oscuro sin elección previa → fondo
      `rgb(14, 21, 29)` = `colorTokensOscuro.fondo`, `color-scheme: dark`; (2) una elección
      explícita (`claro`) guardada en `localStorage` prevalece aunque el sistema esté en oscuro —
      `rgb(246, 250, 253)` = `colorTokens.fondo`; (3) esa misma elección sigue igual después de
      recargar la pestaña; (4) sin elección explícita, cambiar la preferencia del sistema **con la
      app ya abierta** (sin recargar) actualiza el tema en vivo. Las cuatro, sin un solo error de
      consola. Corrí además la suite completa (`npm test`): 238 archivos / 2773 pruebas en verde,
      sin regresiones en el resto de la app por el cambio de `ThemeModeProvider`.

**Checkpoint**: las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: verificación final de regresión, accesibilidad y presupuesto de rendimiento.

- [X] T020 [P] Remedir el bundle (`npm run build && npm run size`) y comparar contra la línea base
      de T001; confirmar que se mantiene dentro de los 300 KB gzip (plan.md Performance Goals).
      **Resultado: 284,7 KB gzip (+1,0 KB sobre los 283,7 KB de T001), margen de 15,3 KB.**
- [X] T021 [P] Correr la suite completa: `npm run typecheck && npm run lint && npm run format:check
      && npm test -- --coverage && npx playwright test` (quickstart.md "Verificación automática");
      confirmar cobertura ≥80 % en `ThemeModeProvider` (hook de lógica pura, principio VII) y que
      `e2e/responsive.spec.ts` sigue en verde sin modificar sus aserciones. **Resultado**:
      `typecheck`/`lint`/`format:check` en verde (0 errores); `npm test` (sin cobertura) 238
      archivos / 2773 pruebas en verde; `playwright test` igual que la línea base (2 pasan, 42 se
      saltan por falta de credenciales `E2E_AUTH0_*` en este entorno, igual que en `main`).
      Cobertura de `ThemeModeProvider.tsx` medida aparte (`--coverage.include`, reporte propio):
      **100% statements/branches/functions/lines** — se agregó un caso más a T017/T006 (sistema
      pasando de oscuro a claro en vivo) para cerrar la única rama que faltaba. La corrida de
      cobertura del repo completo (`npm test -- --coverage`) se canceló tras superar
      largamente la duración de la misma corrida sin cobertura (~6 min): la cifra que exige el
      principio VII (el hook) ya está confirmada por separado, y la corrida sin cobertura ya probó
      0 regresiones en el resto de la suite.
- [X] T022 Recorrer el checklist de aceptación rápida completo de `quickstart.md` (SC-001 a SC-005,
      FR-006/FR-007, FR-008) y confirmar cada fila antes de dar la feature por terminada.
      **Resultado** (evidencia ya registrada en T013/T016/T019/T021, consolidada aquí):
      SC-001 ✓ (un clic en `HeaderUserMenu`, `HeaderUserMenu.test.tsx`); SC-002 ✓ (sin colores fijos
      fuera de `tokens.ts` — verificado con una búsqueda de valores hex en `src/app`, `src/shared`,
      `src/features`; todas las pantallas heredan el tema vía MUI, ninguna se tocó); SC-003 ✓
      (contraste del logotipo verificado en `Logo.test.tsx`, 17,55:1); SC-004 ✓ (persistencia
      confirmada en navegador real tras recargar, T019); SC-005 ✓ (el cambio de tema es un solo
      `setState` sin red de por medio, observado sin parpadeos en las capturas y en la emulación en
      vivo); FR-006/FR-007 ✓ (elección explícita prevalece sobre un cambio posterior del sistema,
      T019 y `ThemeModeProvider.test.tsx`); FR-008 ✓ (`color-scheme` del navegador coincide con el
      tema activo, T013/T019). Las únicas verificaciones que quedan pendientes de la persona
      solicitante son las que ya dependen de iniciar sesión real (recorrer
      Panel/Usuarios/Suscripciones/Token/Perfil con el control, sin credenciales Auth0 en este
      entorno — mismo límite que documentó 008-design-system).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — empieza de inmediato.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea** las 3 historias de usuario.
- **User Stories (Phase 3-5)**: todas dependen de Foundational. Entre sí:
  - **US1 (P1)**: sin dependencia de otras historias — es el MVP.
  - **US2 (P1)**: sin dependencia de otras historias (puede ir en paralelo con US1; solo comparte
    `colorTokensOscuro`, T002, ya en Foundational).
  - **US3 (P2)**: depende de que T006/T007 (US1) existan — amplía el mismo `ThemeModeProvider` y su
    archivo de pruebas en vez de crear uno nuevo. No depende de US2.
- **Polish (Phase 6)**: depende de que todas las historias deseadas estén completas.

### Within Each User Story

- T006 (prueba) antes de T007 (implementación) — lógica pura, test-first.
- T017 (amplía la prueba de T006) antes de T018 (amplía la implementación de T007).
- Dentro de US1: T008/T009/T010 solo dependen de T007 y pueden avanzar en paralelo; T011 depende de
  T005+T007+T010; T012 depende de T009+T011; T013 depende de T008+T011+T012.

### Parallel Opportunities

- Foundational: T002 y T005 en paralelo (sin dependencia entre sí); T004 en paralelo con T005 una
  vez que T003 esté listo.
- Una vez Foundational completo: US1 y US2 pueden avanzar en paralelo (equipos distintos); US3
  espera a que T006/T007 de US1 existan.
- Dentro de US1: T008 + T009 + T010 en paralelo (tras T007).
- Polish: T020 y T021 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tras completar T007 (ThemeModeProvider), en paralelo:
Task: "Modificar src/app/providers/AppProviders.tsx para usar ThemeModeProvider"
Task: "Actualizar los 4 arneses de prueba (renderWithProviders, renderApp, forbidden.test, Notifications.test)"
Task: "Agregar los textos del control de tema a src/shared/messages/es.ts"
```

---

## Implementation Strategy

### MVP First (Setup + Foundational + User Story 1)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational) — tokens oscuros, tema paramétrico, íconos.
2. Completar Phase 3 (User Story 1) — el control cambia el tema de toda la app (con un valor
   inicial simple, sin persistencia todavía).
3. **Detener y validar**: recorrer el Independent Test de US1 antes de seguir.

### Incremental Delivery

1. Setup + Foundational → tema paramétrico listo.
2. + US1 → el control alterna el tema de toda la app (demo/aprobación, MVP).
3. + US2 → el logotipo es legible en ambos temas (demo/aprobación).
4. + US3 → la elección se recuerda entre visitas y el tema inicial respeta el sistema
   (demo/aprobación).
5. Polish → presupuesto de bundle, regresión completa y checklist de `quickstart.md`.

### Parallel Team Strategy

Con más de una persona: tras Foundational, una persona toma US1, otra US2 (ambas solo comparten
`colorTokensOscuro` de Foundational); US3 empieza apenas T006/T007 de US1 existan, sin esperar a que
US1 esté 100 % terminada.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes entre sí.
- `[Story]` ubica cada tarea en su historia de usuario para trazabilidad con `spec.md`.
- `header-reserved-slot` de `HeaderUserMenu` no se toca en ninguna tarea de esta feature (reservado
  para Spec 5/7).
- Ningún archivo de `src/features/**` se modifica en esta feature.
