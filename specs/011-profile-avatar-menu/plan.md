# Implementation Plan: Menú de Perfil con Avatar en el Encabezado

**Branch**: `011-profile-avatar-menu` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-profile-avatar-menu/spec.md`

## Summary

Reemplaza el nombre en texto plano, el enlace "Perfil" y el botón "Cerrar sesión" sueltos del
encabezado por un botón de avatar en la esquina superior derecha que abre un menú (nombre, correo,
role(s), "Mi perfil", "Cerrar sesión"), usando el componente `Avatar` que `specs/008-design-system`
dejó construido y sin usar (iniciales sobre un tono de color propio de la persona, sin fotografía
ni género). También unifica `ProfilePage.tsx` al mismo criterio de avatar y agrega ahí una opción
de "Cambiar foto" que, al activarse, avisa que todavía no está disponible (la plataforma de
usuarios no lo admite). El cambio de mayor impacto técnico no es de UI sino de pruebas: consolidar
"Perfil"/"Cerrar sesión" detrás de un menú colapsado rompe el contrato de accesibilidad que
`specs/008-design-system/contracts/layout.md` dejó marcado "NO NEGOCIABLE sin tocar el E2E" — este
plan lo toca deliberadamente, con un contrato nuevo que lo sustituye (`contracts/profile-menu.md`)
y actualiza los 7 puntos de `e2e/` que hoy asumen esos controles visibles sin abrir nada.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, Node.js 24 (`.nvmrc`, `engines.node >=24.15.0`) — sin cambios.

**Primary Dependencies**: `@mui/material` 9.5.0 (`Menu`/`MenuItem`, ya usados en `SubscriptionStatusMenu.tsx` — mismo patrón de accesibilidad a reutilizar), `lucide-react` 1.61.0 (íconos nuevos vía `iconRegistry.ts`: `LogOut`, `Camera`). Sin dependencias nuevas.

**Storage**: N/A — sin estado de servidor nuevo. La preferencia de tema (009) y la sesión (001) no cambian.

**Testing**: Vitest + React Testing Library + user-event + `axe` (unit/componentes), Playwright (`e2e/`). Entregable central de pruebas: nuevos helpers compartidos en `e2e/fixtures/profileMenu.ts` (abrir el menú, ir a "Mi perfil", cerrar sesión) que reemplazan las 7 interacciones directas con "Perfil"/"Cerrar sesión" hoy dispersas en `access.spec.ts`, `responsive.spec.ts`, `session.spec.ts` y `token.spec.ts`.

**Target Platform**: SPA en navegador; responsive desktop-first; mismo breakpoint de 768 px (008-design-system).

**Project Type**: SPA frontend de un solo proyecto (sin monorepo).

**Performance Goals**: Sin metas nuevas — un componente de menú más, íconos ya livianos (lucide-react es tree-shakeable). Verificar con `npm run size` que el presupuesto de 300 KB gzip se mantiene.

**Constraints**: El botón que abre el menú DEBE seguir cumpliendo el contrato de accesibilidad del encabezado (FR-007 del spec) — banner con un control con nombre accesible, operable por teclado, visible a 1024 px y 320 px — pero "Mi perfil" y "Cerrar sesión" dejan de estar visibles sin interacción: el contrato de `008-design-system` que lo exigía así se sustituye deliberadamente (ver Summary), documentado en `contracts/profile-menu.md`. El criterio de avatar (FR-004) DEBE quedar igual en el encabezado y en "Mi perfil" (FR-005): un solo lugar de verdad, no dos implementaciones del mismo criterio.

**Scale/Scope**: 6 archivos de producción (un componente nuevo, 3 modificados, un hook extendido, mensajes e íconos); 9 archivos de prueba (4 unit/componente, 1 fixture E2E nueva, 4 specs E2E modificados); 0 cambios de API ni de esquema.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio / Sección | Estado | Notas |
|---|---|---|
| I. Arquitectura por Features y React Idiomático | PASS | `ProfileMenu` vive en `src/app/layouts/` (igual que `HeaderUserMenu`, `Topbar`); reutiliza `Avatar` de `src/shared/ui/` sin modificarlo. Ningún archivo de `src/features/**` fuera de `auth`/`profile` se toca. |
| II. TypeScript Estricto y Datos Validados en la Frontera | PASS | `OperatorIdentity.id` sale de `PlatformUser.id` (ya validado con Zod en la capa `api` de `features/users`, principio II); no se agrega ninguna frontera nueva. |
| III. Estado de Servidor Separado del Estado de Cliente | PASS | El estado del menú (abierto/cerrado) es local (`useState`, igual que `SubscriptionStatusMenu`); nombre/correo/role(s) siguen viniendo de TanStack Query vía `useGrantedAccess()`, sin copiarse. |
| IV. Integración con APIs REST por Contrato | PASS | Sin llamadas nuevas. "Cambiar foto" (FR-006) no llama a ninguna API — la plataforma de usuarios no la admite (spec.md, Clarifications) — así que no hay contrato que romper ni simular. |
| V. Seguridad y Autenticación con Auth0 | PASS | Cerrar sesión desde el menú llama al mismo `useLogout()` de siempre (specs/001, FR-010); sin cambios de autenticación/autorización. |
| VI. Experiencia de Usuario, Accesibilidad y Consistencia | PASS, con desviación documentada | Es el objetivo central de la feature. El menú sigue el patrón de accesibilidad ya probado de `SubscriptionStatusMenu` (`aria-haspopup`, `aria-controls`, `aria-expanded`, foco). La desviación real: `contracts/layout.md` de 008 marcó "NO NEGOCIABLE sin tocar el E2E" que "Perfil"/"Cerrar sesión" quedaran visibles sin abrir nada — esta feature lo cambia a propósito (ver Summary), compensado con un contrato nuevo (`contracts/profile-menu.md`) y manteniendo accesible el control que sí debe seguir siéndolo (el botón que abre el menú, FR-007). No es una violación silenciosa: queda documentada aquí y en Complexity Tracking. |
| VII. Calidad Verificable mediante Pruebas | PASS | Pruebas nuevas de componente para `ProfileMenu` (contenido, cierre de rol, sin acción de cambiar role/cuenta — SC-003) y `Avatar` ya tiene las suyas de 008; `e2e/fixtures/profileMenu.ts` nuevo, con los 7 puntos de E2E existentes migrados a usarlo en vez de romperse. |
| Stack obligatorio (licencias) | PASS | Sin dependencias nuevas; `LogOut`/`Camera` son parte de `lucide-react`, ya aprobado (008). |
| Presupuesto de bundle (300 KB gzip) | PASS, con seguimiento | Se remide con `npm run size` al cerrar la feature (línea base: 284,7 KB tras 009/010). |

**Resultado**: PASS, con una desviación documentada y justificada (no silenciosa) del contrato de
accesibilidad de 008 — ver Complexity Tracking.

**Re-chequeo post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/profile-menu.md` y
`quickstart.md` no introducen ninguna dependencia, estado de servidor ni ruta nueva más allá de lo
ya evaluado arriba. El contrato nuevo deja explícito qué reemplaza del de 008 y qué conserva. Sigue
en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/011-profile-avatar-menu/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── profile-menu.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único existente (sin monorepo), estructura por features ya vigente
(`app → features → shared`). El menú vive en `src/app` (igual que `HeaderUserMenu`/`Topbar`, de
quien es parte); solo se tocan las features `auth` (identidad del operador) y `profile` (la
pantalla "Mi perfil"), nunca otra.

```text
src/app/layouts/
├── ProfileMenu.tsx            # NUEVO — botón de avatar + Menu de MUI (mismo patrón de
│                              #   accesibilidad que SubscriptionStatusMenu.tsx): nombre, correo,
│                              #   role(s) como contenido no interactivo; "Mi perfil" (MenuItem
│                              #   enlace) y "Cerrar sesión" (MenuItem, llama a useLogout()
│                              #   directo, no <LogoutButton/>) como acciones
├── ProfileMenu.test.tsx        # NUEVO — contenido del menú, cierre de teclado (Escape),
│                              #   SC-003 (sin acción de cambiar role/cuenta), axe
├── HeaderUserMenu.tsx           # MODIFICADO — reemplaza el Typography de displayName, el Button
│                              #   "Perfil" y <LogoutButton/> por <ProfileMenu/>; conserva el
│                              #   toggle de tema (009) y agrega un nuevo contenedor vacío
│                              #   reservado para Spec 7 (el selector de idioma), ya que el
│                              #   `header-reserved-slot` original lo ocupa esta feature
└── HeaderUserMenu.test.tsx      # MODIFICADO — el nuevo contenedor reservado (Spec 7) se prueba
                               #   vacío, igual que antes; las aserciones de "Perfil"/"Cerrar
                               #   sesión" se mueven a ProfileMenu.test.tsx

src/features/auth/hooks/
├── useOperatorIdentity.ts        # MODIFICADO — agrega `id` (de PlatformUser.id vía
│                                #   useGrantedAccess().user.id); quita `initials` (sin más
│                                #   consumidores una vez que ProfilePage usa <Avatar/>, que
│                                #   calcula las suyas — sin código muerto, constitución)
└── useOperatorIdentity.test.tsx   # MODIFICADO — cubre `id`; quita el caso de `initials`

src/features/profile/
├── ProfilePage.tsx                # MODIFICADO — el <Avatar/> de MUI con color fijo se reemplaza
│                                 #   por el <Avatar/> compartido (FR-005); agrega la acción
│                                 #   "Cambiar foto" (FR-006) junto al avatar, que llama a
│                                 #   useNotify() con un aviso informativo al activarse
└── ProfilePage.test.tsx            # MODIFICADO — cubre el nuevo avatar compartido y el aviso de
                                  #   "Cambiar foto"

src/shared/
├── messages/es.ts                  # MODIFICADO — + claves del menú (nombre accesible del botón
│                                  #   de avatar, "Mi perfil" ya existe como messages.nav.profile,
│                                  #   "Cambiar foto" y su aviso de no disponible)
└── ui/iconRegistry.ts               # MODIFICADO — + `LogOut` (ícono del Menu, opcional) y
                                   #   `Camera` (acción "Cambiar foto") de lucide-react

e2e/fixtures/
└── profileMenu.ts                  # NUEVO — openProfileMenu(page), goToProfile(page),
                                   #   logOut(page): abren el menú antes de interactuar, en vez
                                   #   de asumir "Perfil"/"Cerrar sesión" visibles sin abrir nada

e2e/
├── responsive.spec.ts               # MODIFICADO — expectHeaderShortcuts: el botón de avatar
│                                   #   visible siempre; "Mi perfil"/"Cerrar sesión" visibles
│                                   #   recién tras abrir el menú (contracts/profile-menu.md)
├── access.spec.ts                    # MODIFICADO — 3 puntos (líneas 63, 103, 118 de hoy) migran
│                                   #   a los helpers de e2e/fixtures/profileMenu.ts
├── session.spec.ts                   # MODIFICADO — 1 punto (línea 67 de hoy)
└── token.spec.ts                     # MODIFICADO — 1 punto (línea 64 de hoy)
```

**Structure Decision**: se mantiene la estructura de proyecto único ya vigente
(`app → features → shared`). El menú y su botón viven en `src/app/layouts` porque son parte del
shell de la aplicación (como `Topbar`/`HeaderUserMenu`), no de una feature; `Avatar` ya vivía en
`src/shared/ui` desde 008 y no se modifica. Ninguna carpeta ni capa nueva fuera de esta estructura.

## Complexity Tracking

> La única desviación real de esta feature está marcada en el Constitution Check (principio VI):
> romper a propósito el contrato "NO NEGOCIABLE sin tocar el E2E" de `008-design-system`. No es una
> violación de un principio de la constitución en sí (la constitución no fija esa regla, la fijó el
> plan de 008 para su propio E2E) — se documenta aquí de todos modos, por ser una decisión que
> toca una garantía que otra feature había dejado explícitamente dura.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Se reemplaza el contrato de accesibilidad de `008-design-system/contracts/layout.md` ("Perfil"/"Cerrar sesión" visibles sin abrir nada) por uno nuevo (`contracts/profile-menu.md`) | Es el pedido explícito del spec (consolidar ambos controles en un menú de avatar, como muestran las 4 capturas de referencia) — sin este cambio no hay forma de construir el patrón pedido. | Agregar el avatar *además* de los controles sueltos actuales (sin menú) evitaría tocar el E2E, pero contradice las capturas de referencia y el objetivo central del spec (un único control consolidado, no uno más sumado a los que ya había). |
