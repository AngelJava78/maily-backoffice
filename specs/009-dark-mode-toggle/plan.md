# Implementation Plan: Modo Oscuro y Claro del Backoffice

**Branch**: `009-dark-mode-toggle` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-dark-mode-toggle/spec.md`

## Summary

El Backoffice gana un control, siempre visible en `HeaderUserMenu`, para alternar entre tema claro y
tema oscuro, aplicado a toda la aplicación sin dejar zonas del tema contrario; la preferencia se
guarda solo en el dispositivo/navegador (sin backend, resuelto en Clarifications) y, mientras la
persona no elija explícitamente, sigue en vivo la preferencia de apariencia del sistema operativo.
Enfoque técnico: un segundo "Set de valores" de tokens (`colorTokensOscuro`, con los mismos nombres
que `colorTokens`, ajustados a WCAG AA) que anticipó `specs/008-design-system`; un
`ThemeModeProvider` (Context, Principio III de la constitución) que arma el tema de MUI con
`createAppTheme(mode)` y fija `color-scheme` vía `CssBaseline enableColorScheme`, corrigiendo así el
defecto de fondo reportado (controles nativos del navegador desalineados del tema de la app); y un
contenedor de contraste fijo detrás del logotipo actual (mismo archivo, sin encargar uno nuevo, por
Clarification) para que siga siendo legible en ambos temas. Ningún componente de `src/features/**`
cambia: todos ya consumen colores solo a través del tema de MUI.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 (`.nvmrc`, `engines.node >=24.15.0`)

**Primary Dependencies**: MUI `@mui/material` 9.5.0 (palette/`createTheme`/`CssBaseline`, sin cambios de versión), `lucide-react` 1.61.0 (ya instalado, dos íconos nuevos vía `iconRegistry.ts`), Emotion 11.14.x. Sin dependencias nuevas.

**Storage**: `localStorage` del navegador, una clave (`maily-backoffice:theme-mode`), solo en el dispositivo donde se elige (Clarification de spec.md); sin backend ni cambios de API.

**Testing**: Vitest + React Testing Library + user-event (unit/componentes), `axe` (accesibilidad en ambos temas), Playwright (`e2e/responsive.spec.ts`, intocado en sus aserciones existentes).

**Target Platform**: SPA en navegador; responsive desktop-first; mismo breakpoint de 768 px que el resto del layout (008-design-system); Chrome/Edge/Firefox/Safari, dos últimas versiones.

**Project Type**: SPA frontend de un solo proyecto (sin monorepo).

**Performance Goals**: Sin metas nuevas — solo no empeorar las existentes. Presupuesto de JS inicial: 300 KB gzip en la ruta de entrada (`npm run size`); el cambio agrega un módulo de tokens, un Provider pequeño y dos íconos, impacto esperado mínimo.

**Constraints**: Ningún componente de `src/features/**` cambia su lógica ni sus colores fijos (ya no existen, por FR-006 de 008-design-system). El contenedor `data-testid="header-reserved-slot"` de `HeaderUserMenu` permanece vacío y sin tocar (Spec 5/7, prueba existente). El E2E de header a 1024/320 px (`e2e/responsive.spec.ts`) no cambia sus aserciones. Cumplir WCAG 2.1 AA en el set de tokens oscuro, igual que ya exige `theme.test.ts` para el claro.

**Scale/Scope**: Mismas ~15 rutas/pantallas de 008-design-system (todas heredan el tema vía MUI, ninguna se toca directamente) más los elementos compartidos de layout (`Topbar`, `BottomNav`, `HeaderUserMenu`, `Logo`). Un segundo set de ~45 tokens de color (mismo recuento que el set claro de 008). Un Provider nuevo, un hook nuevo, dos íconos nuevos, un componente de contenedor nuevo para el logotipo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Nota sobre el Principio I (nombres de tokens en español): la excepción de la enmienda v1.4.0 cubre
> nombres de token en español "cuando repliquen los nombres de un sistema de diseño de referencia
> externo". `colorTokensOscuro` usa exactamente los mismos nombres que `colorTokens` (que sí
> replican los de web-soft), no valores copiados de un modo oscuro de web-soft — web-soft no tiene
> uno (docs/DESIGN.md). `specs/008-design-system/data-model.md` (regla de extensión US5-1) ya
> anticipó y aprobó esta extensión como la forma correcta de agregar el modo oscuro sin romper la
> excepción: replicar los *nombres*, no requiere que la *implementación* oscura exista en web-soft.
> No se necesita una nueva enmienda de constitución para esta feature.

| Principio / Sección | Estado | Notas |
|---|---|---|
| I. Arquitectura por Features y React Idiomático | PASS | `ThemeModeProvider`/`useThemeMode` en `src/app/providers/` (patrón de `AppSettingsProvider`/`NotificationsProvider`); `colorTokensOscuro` en `src/shared/theme/tokens.ts`, mismas claves que `colorTokens`. Ningún componente de `src/features/**` se modifica. Archivos nuevos muy por debajo de 250 líneas. |
| II. TypeScript Estricto y Datos Validados en la Frontera | PASS | El valor leído de `localStorage` (frontera: dato mutable fuera del control de la app) se valida contra el conjunto cerrado `'claro' \| 'oscuro'`; un valor inesperado se descarta en vez de asumirse válido (research.md D3). `mode`/`source` tipados explícitamente en `useThemeMode()`. |
| III. Estado de Servidor Separado del Estado de Cliente | PASS | El tema es exactamente el caso que el principio nombra como ejemplo de Context ("sesión, tema, notificaciones"); no es estado de servidor. |
| IV. Integración con APIs REST por Contrato | N/A | Sin backend ni llamadas nuevas (Clarification: preferencia solo local). |
| V. Seguridad y Autenticación con Auth0 | PASS | `localStorage` solo guarda una preferencia de UI no sensible (el modo de tema), expresamente permitido por el principio. Sin tokens, secretos ni cambios de autenticación/autorización. |
| VI. Experiencia de Usuario, Accesibilidad y Consistencia | PASS | Es el objetivo central de la feature. Control operable por teclado con nombre accesible (`contracts/theme-mode.md`). WCAG AA verificado para el set oscuro igual que hoy para el claro (`theme.test.ts` extendido). Sigue usando solo MUI (sin CSS global ad hoc). |
| VII. Calidad Verificable mediante Pruebas | PASS | Pruebas unitarias nuevas para `ThemeModeProvider` (modo inicial por sistema, persistencia, precedencia de la elección explícita); pruebas de contraste extendidas en `theme.test.ts`; `HeaderUserMenu.test.tsx` gana una aserción sin tocar la existente del slot reservado; `axe` corre en ambos temas. |
| Stack obligatorio (licencias) | PASS | Sin dependencias nuevas: solo `@mui/material` y `lucide-react`, ya aprobados en 008-design-system. |
| Presupuesto de bundle (300 KB gzip) | PASS, con seguimiento | Se remide con `npm run size` al cerrar la feature; el añadido esperado (tokens, Provider, 2 íconos) es pequeño frente al margen que dejó 008. |

**Resultado**: PASS. Sin violaciones pendientes de justificar — ver Complexity Tracking.

**Re-chequeo post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/theme-mode.md` y
`quickstart.md` no introducen ninguna dependencia, estado de servidor, ruta ni librería nueva más
allá de lo ya evaluado arriba. El contrato de tema confirma que `header-reserved-slot` y el E2E de
layout existente quedan intactos. Sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/009-dark-mode-toggle/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── theme-mode.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único existente (sin monorepo), estructura por features ya vigente
(`app → features → shared`). Esta feature trabaja enteramente en `src/app` y `src/shared`; ningún
archivo de `src/features/**` se modifica.

```text
src/app/
├── theme/
│   ├── theme.ts                  # MODIFICADO — de `export const theme` estático a
│   │                              #   `export function createAppTheme(mode)`, que arma el
│   │                              #   palette con colorTokens o colorTokensOscuro (research.md D1)
│   └── theme.test.ts              # MODIFICADO — extiende las aserciones de contraste existentes
│                                  #   (INTENTS, borde de campos) también a `createAppTheme('oscuro')`
├── providers/
│   ├── ThemeModeProvider.tsx      # NUEVO — Context + hook `useThemeMode()` (research.md D2-D4);
│   │                              #   monta `<ThemeProvider>` + `<CssBaseline enableColorScheme />`
│   ├── ThemeModeProvider.test.tsx  # NUEVO — modo inicial por sistema, persistencia, precedencia
│   │                              #   de la elección explícita (contracts/theme-mode.md → Verificación)
│   └── AppProviders.tsx           # MODIFICADO — reemplaza `<ThemeProvider theme={theme}><CssBaseline /></ThemeProvider>`
│                                  #   por `<ThemeModeProvider>`
└── layouts/
    ├── HeaderUserMenu.tsx          # MODIFICADO — agrega el control de tema antes de
    │                              #   `header-reserved-slot` (research.md D7, contracts/theme-mode.md)
    └── HeaderUserMenu.test.tsx      # MODIFICADO — nueva aserción del control; la del slot reservado
                                   #   no cambia

src/shared/
├── theme/
│   └── tokens.ts                   # MODIFICADO — + `colorTokensOscuro` (mismas claves que
│                                  #   `colorTokens`, valores propios, research.md D1/D8)
└── ui/
    ├── Logo.tsx                     # MODIFICADO — contenedor de contraste fijo detrás de la imagen
    │                              #   actual (research.md D6, data-model.md → Tratamiento de
    │                              #   contraste del logotipo)
    ├── Logo.test.tsx                 # NUEVO — el contenedor de contraste está presente en ambos temas
    └── iconRegistry.ts                # MODIFICADO — + `Sun`/`Moon` de `lucide-react` (research.md D8)

src/test/
├── renderWithProviders.tsx          # MODIFICADO — usa `ThemeModeProvider` en vez del `ThemeProvider`
│                                  #   + `theme` estático, para que las pruebas de toda la app sigan
│                                  #   montando el árbol de providers real
└── renderApp.tsx                    # MODIFICADO — mismo cambio (monta la app completa en pruebas)

# Otros dos arneses de prueba que hoy importan el `theme` estático directamente, mismo cambio:
# src/app/providers/forbidden.test.tsx, src/shared/ui/Notifications.test.tsx
```

**Structure Decision**: se mantiene la estructura de proyecto único ya vigente
(`app → features → shared`). El tema y el control de alternarlo viven en `src/app` (infraestructura
de la aplicación, igual que `AppSettingsProvider`/`AppAuth0Provider`) y en `src/shared` (tokens e
`iconRegistry`, ya existentes ahí desde 008-design-system); ninguna feature importa internos de otra
ni se agrega una capa nueva fuera de esta estructura.

## Complexity Tracking

> Sin violaciones pendientes de justificar: ninguna decisión de `research.md` agrega una
> dependencia, un backend, un store global ni una ruta nueva. Tabla vacía a propósito.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
