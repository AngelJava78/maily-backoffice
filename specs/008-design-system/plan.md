# Implementation Plan: Estilos, Diseño e Iconografía de MailySoft v2

**Branch**: `008-design-system` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-design-system/spec.md`

## Summary

El Backoffice adopta el sistema de diseño de MailySoft v2 (repo de referencia `web-soft`, solo
lectura) retematizando MUI —sin reemplazarlo— para que ambas aplicaciones se vean como un mismo
producto, sin cambiar rutas, lógica ni llamadas a APIs (FR-017). El enfoque técnico: centralizar
colores/tipografía/espaciado/radios/sombras/breakpoints como tokens con los nombres y valores de
las pantallas de web-soft ya migradas a su sistema de tokens (no del área de plataforma, que aún
usa colores anteriores — resuelto en `/speckit-clarify`), inyectarlos en un único `theme` de MUI;
crear un componente `Icon` común sobre `lucide-react` que reemplace los 11 usos directos de
`@mui/icons-material`; extraer/unificar los componentes base hoy duplicados o ausentes (Badge,
Avatar con iniciales, EmptyState) y retematizar los existentes (Button/Input/Select/Checkbox vía
MUI, Table vía MUI X Data Grid, ConfirmDialog, Notifications, ErrorState, PageLoader); rehacer el
layout (barra superior fija + barra de navegación inferior en móvil bajo 768 px, con el espacio
reservado a la derecha para Spec 5/7) preservando el contrato de accesibilidad que ya exige el E2E
existente (`role="banner"` con "Perfil" y "Cerrar sesión" visibles a 1024 y 320 px); aplicar todo a
las pantallas existentes; y documentarlo en `docs/DESIGN.md` con la tabla de equivalencias. Etapas:
tokens → iconos → componentes base → layout → pantallas, con captura de pantalla y aprobación al
cerrar cada una (ver Assumptions del spec).

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 (`.nvmrc`, `engines.node >=24.15.0`)

**Primary Dependencies**: MUI `@mui/material` 9.5.0 + `@mui/x-data-grid` 9.15.0 (retematizados, no reemplazados — se retira `@mui/icons-material` 9.5.0), Emotion 11.14.x, `react-router` 8.4.0, TanStack Query 5.104.4, React Hook Form 7.90.0 + Zod 4.6.7, `@auth0/auth0-react` 2.28.2, Vite 8.3.4. Nuevas: `lucide-react` (ISC, misma librería que web-soft) e `@fontsource/inter` (OFL-1.1, permitida por la enmienda de constitución v1.4.0 aplicada junto con este plan).

**Storage**: N/A — feature de presentación, sin estado de servidor ni persistencia propia.

**Testing**: Vitest + React Testing Library + user-event (unit/componentes), MSW (red simulada, sin tocar), `axe` (accesibilidad en pruebas de componentes), Playwright (`e2e/`, incluido `responsive.spec.ts`, intocado en sus aserciones).

**Target Platform**: SPA en navegador; responsive desktop-first; breakpoint móvil en 768 px (igual que web-soft); Chrome/Edge/Firefox/Safari, dos últimas versiones.

**Project Type**: SPA frontend de un solo proyecto (sin monorepo; los backends viven fuera de este repo).

**Performance Goals**: Sin metas nuevas de rendimiento — solo no empeorar las existentes. Presupuesto de JS inicial: 300 KB gzip en la ruta de entrada (línea base real a remedir con `npm run build && npm run size` antes de empezar; el README documenta 276,8 KB al 2026-10-20, no 277,4 KB como asume la spec).

**Constraints**: No cambiar rutas, lógica de negocio ni llamadas a APIs (FR-017). No modificar la CSP documentada (`default-src 'self'`, sin `font-src` — por eso Inter se autoaloja). Cumplir WCAG 2.1 AA (contraste, foco visible, teclado). Al terminar, una sola librería de UI (MUI). Conservar sin tocarlas: las 2685 pruebas existentes (en particular las que dependen de `.MuiAlert-*`/`.MuiChip-*`, ver research.md) y el E2E de header a 1024/320 px. No agregar ni quitar dependencias sin aprobación (Assumptions del spec); las etapas requieren aprobación explícita antes de seguir.

**Scale/Scope**: ~15 rutas/pantallas existentes (acceso, retorno de login, Panel, perfil, usuarios ×4, suscripciones ×4, herramienta de token, 404) más 3 estados renderizados condicionalmente (configuración inválida, acceso denegado, comprobación de acceso fallida) y los elementos compartidos (layout, diálogos, notificaciones, estados de carga/vacío/error). 11 archivos con iconos a migrar. ~45 tokens de color (14 roles base × variantes) más tipografía, espaciado, radios, sombras y breakpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Se aplicó la enmienda de constitución **v1.4.0** (2026-10-21) junto con este plan, antes de esta
> evaluación: agrega al Principio I una excepción que permite nombres de tokens de diseño en
> español cuando repliquen un sistema de referencia externo (los de web-soft, FR-005), y agrega a
> "Stack obligatorio" la licencia OFL-1.1 para activos de fuente (Inter autoalojada). Con la
> enmienda aplicada, no quedan violaciones sin resolver.

| Principio / Sección | Estado | Notas |
|---|---|---|
| I. Arquitectura por Features y React Idiomático | PASS | Tokens e `Icon` viven en `src/app/theme` y `src/shared/ui` (no en una feature). Nombres de tokens en español cubiertos por la excepción v1.4.0; el resto de identificadores, archivos y rutas sigue en inglés. `AppLayout.tsx` se divide en `Topbar`/`BottomNav`/`HeaderUserMenu` para no superar 250 líneas. |
| II. TypeScript Estricto y Datos Validados en la Frontera | PASS (N/A mayormente) | Los tokens son constantes de compilación, no datos de frontera; no se valida con Zod. El registro de iconos se tipa como `Record<IconName, ComponentType>` para que un nombre inválido sea error de compilación, no runtime. |
| III. Estado de Servidor Separado del Estado de Cliente | N/A | Sin cambios de estado de servidor ni cliente. |
| IV. Integración con APIs REST por Contrato | N/A | FR-017: sin cambios de rutas, lógica ni llamadas a APIs. |
| V. Seguridad y Autenticación con Auth0 | PASS | Sin cambios de autenticación/autorización. Inter autoalojada mantiene la CSP documentada (`default-src 'self'`) sin ampliarla; sin secretos ni dependencias nuevas de red externa. |
| VI. Experiencia de Usuario, Accesibilidad y Consistencia | PASS | Es el objetivo central de la feature. Una sola librería (MUI, retematizada). WCAG AA resuelto para el borde de campos (`borde-fuerte`, 4,3:1, prevalece sobre el valor literal de web-soft y sobre el fix propio actual `#757575`). `eslint-plugin-jsx-a11y` y `axe` ya están activos; se extienden a los componentes nuevos. |
| VII. Calidad Verificable mediante Pruebas | PASS | No se tocan las pruebas que dependen de `.MuiAlert-*`/`.MuiChip-*` (siguen pasando porque Badge/Alert retematizados usan `Chip`/`Alert` de MUI por debajo). Nuevas pruebas unitarias para lógica pura nueva (generador de iniciales/color del avatar, registro de iconos). E2E de header a 1024/320 px intocado en sus aserciones. |
| Stack obligatorio (licencias) | PASS | `lucide-react` (ISC) y `@fontsource/inter` (OFL-1.1, permitida por la enmienda v1.4.0) son las únicas dependencias nuevas; ambas de licencia permisiva. Se retira `@mui/icons-material` (FR-008). |
| Presupuesto de bundle (300 KB gzip) | PASS, con seguimiento | A remedir la línea base real antes de la etapa de tokens/iconos; Inter (solo los 4 pesos usados, con `font-display: swap`) y `lucide-react` (tree-shakeable) se miden en cada etapa. |

**Resultado**: PASS. Sin violaciones pendientes de justificar — ver Complexity Tracking.

**Re-chequeo post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/` y
`quickstart.md` no introducen ninguna dependencia, estado de servidor, ruta ni librería nueva más
allá de lo ya evaluado arriba (`lucide-react`, `@fontsource/inter`). El contrato de layout
(`contracts/layout.md`) confirma que el E2E existente se preserva sin modificarlo. Sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/008-design-system/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/             # Phase 1 output (/speckit-plan command)
│   ├── design-tokens.md
│   ├── icon-component.md
│   ├── base-components.md
│   └── layout.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único existente (sin monorepo), estructura por features ya vigente
(`app → features → shared`). Esta feature trabaja casi enteramente en `src/app` y `src/shared`;
las carpetas de `src/features/*` solo se tocan para consumir los componentes/iconos nuevos, sin
cambiar su lógica.

```text
src/app/
├── theme/
│   ├── tokens.ts              # NUEVO — tokens por categoría (color, tipografía, espaciado,
│   │                          #   radio, sombra, breakpoint), nombres/valores de web-soft
│   ├── theme.ts                # MODIFICADO — createTheme consume tokens.ts (palette, typography,
│   │                          #   shape, shadows, breakpoints, overrides de componentes)
│   └── theme.test.ts            # MODIFICADO — expectativas contra los nuevos tokens
├── layouts/
│   ├── AppLayout.tsx            # MODIFICADO — compone Topbar + BottomNav + Outlet
│   ├── Topbar.tsx                # NUEVO — barra superior fija (≥768 px): logo, nav, HeaderUserMenu
│   ├── BottomNav.tsx             # NUEVO — barra de navegación inferior (<768 px)
│   ├── HeaderUserMenu.tsx         # NUEVO — nombre, perfil, cerrar sesión + slot reservado
│   │                          #   (icono de perfil Spec 5, selector de idioma Spec 7)
│   └── PublicLayout.tsx           # MODIFICADO — solo estilos (retematizado)
└── providers/styleCache.ts        # SIN CAMBIOS (nonce de Emotion/CSP)

src/shared/
├── ui/
│   ├── Icon.tsx                  # NUEVO — componente común de iconos (FR-007/008)
│   ├── iconRegistry.ts            # NUEVO — mapa de nombres → icono de lucide-react / SVG propio
│   ├── Avatar.tsx                 # NUEVO — avatar con iniciales (color determinístico, ver research.md)
│   ├── Badge.tsx                   # NUEVO — reemplaza StatusChip y SubscriptionStatusChip
│   ├── EmptyState.tsx              # NUEVO — hoy los vacíos son inline por feature
│   ├── ConfirmDialog.tsx            # MODIFICADO — solo estilos (ya cumple Escape/foco vía MUI Dialog)
│   ├── Notifications.tsx             # MODIFICADO — solo estilos (aspecto de alerta de web-soft)
│   ├── ErrorState.tsx                # MODIFICADO — solo estilos
│   ├── PageLoader.tsx                 # MODIFICADO — solo estilos
│   └── dataGridStyles.ts               # MODIFICADO — colores de header/fila/hover/borde del Data Grid
├── messages/es.ts                       # MODIFICADO — + etiqueta "Backoffice", nombres accesibles de iconos
└── assets/brand/                         # NUEVO — maily-horizontal, maily-isotipo (favicon), maily-vertical
                                       #   copiados desde web-soft `public/marca/`

src/features/
├── subscriptions/components/*.tsx        # MODIFICADO (6 archivos) — de @mui/icons-material a <Icon>;
│                                      #   StatusChip → Badge
├── users/components/*.tsx                  # MODIFICADO (5 archivos) — de @mui/icons-material a <Icon>;
│                                      #   StatusChip → Badge
└── (resto de features)                      # SIN CAMBIOS funcionales — solo heredan el theme nuevo

docs/
└── DESIGN.md                                # NUEVO — tokens, componentes, iconos, tabla de
                                          #   equivalencias, guía de migración (FR-021 a FR-024)
```

**Structure Decision**: se mantiene la estructura de proyecto único ya vigente
(`app → features → shared`, exigida por la constitución). Los tokens y el componente de iconos
viven en `src/app/theme` y `src/shared/ui` precisamente porque los consumen todas las features por
igual; ninguna feature importa internos de otra. No se introduce ninguna carpeta ni capa nueva
fuera de esta estructura.

## Complexity Tracking

> Sin violaciones pendientes de justificar: las dos únicas desviaciones de la constitución que esta
> feature necesitaba (nombres de tokens en español; licencia OFL-1.1 para la fuente) se resolvieron
> como enmienda v1.4.0 antes de este plan, no como excepciones puntuales. Tabla vacía a propósito.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
