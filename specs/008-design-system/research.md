# Research: Estilos, Diseño e Iconografía de MailySoft v2

Fuentes: código actual del Backoffice (`C:\Maily\code\maily-backoffice-spec-03`, rama
`008-design-system`) y del repo de referencia `web-soft`
(`C:\Maily\code\Maily360\MailySoft\web-soft`, solo lectura), inspeccionados el 2026-10-21.
Las cinco decisiones marcadas "(clarify)" ya se resolvieron en `/speckit-clarify`; se repiten aquí
solo como contexto para las decisiones nuevas que dependen de ellas.

## 1. Stack de UI (clarify)

- **Decision**: Retematizar MUI; no se reemplaza por Tailwind.
- **Rationale**: lo exige la constitución (principio VI, "Stack obligatorio"); evita reescribir
  todos los componentes; MUI ya resuelve semántica de diálogo, trampa de foco y cierre con Escape
  mejor que los modales custom de web-soft.
- **Alternatives considered**: Tailwind CSS (igual que web-soft) — rechazada, requeriría enmienda
  de constitución y reescribir toda la capa de UI sin beneficio funcional.

## 2. Referencia visual dentro de web-soft (clarify)

- **Decision**: la fuente de los valores de diseño son las pantallas ya migradas al sistema de
  tokens v2 (`src/components/Topbar.tsx`, `src/components/BottomNav.tsx`,
  `src/pages/ContactosPage.tsx`, `src/pages/AgendaPage.tsx`, `src/index.css`), no el área de
  plataforma.
- **Rationale**: confirmado con evidencia de código — `src/platform/PlatformTopbar.tsx` y
  `src/pages/plataforma/UsuariosPage.tsx` usan colores anteriores hardcodeados (incluido el oro
  `#C9A227` como color de acción, que la regla nueva de web-soft prohíbe: "el color marca estado,
  nunca categoría"). Tomar la plataforma como referencia copiaría un estado transitorio que
  web-soft mismo va a reemplazar.
- **Alternatives considered**: área de plataforma de web-soft — rechazada, está sin migrar.

## 3. Tokens de color — nombres y valores exactos

- **Decision**: usar los nombres y valores literales de `web-soft/tailwind.config.js` y
  `web-soft/src/index.css`, con una sola excepción (`borde`, ver §4).

  | Token | Valor | Token | Valor |
  |---|---|---|---|
  | `marca` | `#C9A227` | `exito` | `#1F6E47` |
  | `marca-oscuro` | `#A8871F` | `exito-tinte` | `#E7F6EE` |
  | `marca-tinte` | `#FBF3D9` | `exito-borde` | `#B7E0C9` |
  | `marca-borde` | `#EBD9A0` | `aviso` (texto) | `#856404` |
  | `accion` | `#1A3D63` | `aviso-icono` (solo iconos) | `#B8860B` |
  | `accion-hover` | `#0A1931` | `aviso-tinte` | `#FEF6E0` |
  | `accion-tinte` | `#EEF4FA` | `aviso-borde` | `#F0D48A` |
  | `accion-borde` | `#B3CFE5` | `peligro` | `#B3261E` |
  | `tinta` | `#0A1931` | `peligro-hover` | `#8C1D18` |
  | `cuerpo` | `#22303F` | `peligro-tinte` | `#F9DEDC` |
  | `suave` | `#4A5567` | `peligro-borde` | `#F1B9B4` |
  | `tenue` | `#5F6B7D` | `fondo` | `#F6FAFD` |
  | `superficie` | `#FFFFFF` | `superficie-sutil` | `#F1F6FB` |
  | `borde` | `#E3EAF2` (no se usa en campos, ver §4) | `borde-fuerte` | `#4A7FA7` |

  Regla de uso que viaja con los tokens (documentada en `docs/DESIGN.md`): "el color marca estado,
  nunca categoría"; `marca` (oro) es solo identidad (logo), nunca texto, acción ni badge.
- **Rationale**: FR-005 exige los nombres y valores de web-soft; esta es la lista completa
  confirmada contra el código, sin inventar ningún valor.
- **Alternatives considered**: ninguna — son los valores de la fuente de verdad.

## 4. Borde de campos de formulario (clarify + hallazgo nuevo)

- **Decision**: usar `borde-fuerte` (`#4A7FA7`, 4,3:1) para el borde de inputs/selects, en lugar
  de `borde` (`#E3EAF2`, 1,2:1) **y** en lugar del fix propio actual del Backoffice
  (`FIELD_BORDER_COLOR = '#757575'`, 4,6:1, en `src/app/theme/theme.ts`).
- **Rationale**: WCAG AA (FR-019) prevalece sobre el valor literal de web-soft (resuelto en
  clarify). El Backoffice ya tiene un override propio para esto, pero no es un valor de web-soft:
  mantenerlo violaría FR-005 ("los tokens DEBEN usar los valores de web-soft"); `borde-fuerte` ya
  existe en el propio sistema de web-soft y cumple WCAG, así que no se inventa un tercer valor.
- **Alternatives considered**: `borde` literal (rechazada, no cumple WCAG); mantener `#757575`
  propio (rechazada, no es un valor de web-soft).

## 5. Tipografía y carga de Inter

- **Decision**: Inter 400/500/600/700, autoalojada vía `@fontsource/inter`, con
  `system-ui, -apple-system, sans-serif` como fallback (igual que declara web-soft).
- **Rationale**: evita ampliar la CSP documentada (`default-src 'self'`, sin `font-src` hoy, así
  que solo se permiten fuentes del propio origen); FR-001 pide "copiar" la fuente, no enlazar a un
  servicio externo; la licencia OFL-1.1 de Inter ya está permitida por la enmienda de constitución
  v1.4.0, acotada a activos de fuente.
- **Alternatives considered**: Google Fonts, como hace literalmente web-soft (`index.html` con
  `<link>` a `fonts.googleapis.com`/`fonts.gstatic.com`) — rechazada: exigiría ampliar la CSP
  permanentemente y depender de un tercero en cada carga de la app, por una fuente que de todos
  modos se puede autoalojar sin esa dependencia.

## 6. Espaciado, radios, sombras, breakpoints

- **Decision**: adoptar la escala por defecto de Tailwind que usa web-soft (no la sobreescribe,
  salvo sombras custom) como tokens con nombre explícito (`space-1`…`space-16` en pasos de 4px,
  `radius-xl`=12px, `radius-2xl`=16px, `radius-full`; sombras `shadow-card`, `shadow-card-alto`,
  `shadow-accion`, `shadow-accion-lg` con los valores exactos de `web-soft/src/index.css`;
  breakpoints `sm`640/`md`768/`lg`1024/`xl`1280/`2xl`1536). Estos tokens se usan como valores
  explícitos en los componentes nuevos/retematizados (`sx={{ borderRadius: tokens.radius.xl }}`,
  etc.).
- **Rationale**: FR-005 exige también los valores de espaciado/radios/sombras/breakpoints de
  web-soft, no solo los de color.
- **Alternatives considered**: cambiar el factor global de `theme.spacing` de MUI (hoy 8, igual
  al de Tailwind sería 4) para que `theme.spacing(n)` coincida 1:1 con la escala de Tailwind —
  **rechazada**: el Backoffice ya usa `spacing`/`p`/`gap` numéricos de MUI en pantallas fuera del
  alcance visual inmediato de esta feature; cambiar el multiplicador global duplicaría o reduciría
  a la mitad el espaciado efectivo en todo el código existente de un solo cambio, un riesgo de
  regresión amplio e innecesario frente a definir los tokens como valores explícitos.

## 7. Iconos

- **Decision**: `lucide-react` (misma librería y versión de referencia que web-soft, licencia
  ISC) a través de un componente común nuevo `src/shared/ui/Icon.tsx` + registro
  `iconRegistry.ts`, que también reserva nombres para los SVG propios de órganos de web-soft
  (`public/organos/*.svg`) aunque hoy ningún archivo de pantalla los importe. Tamaño y color del
  icono se toman de los tokens (nunca un valor fijo).
- **Rationale**: FR-007/FR-008/SC-003 exigen la misma librería e iconos propios de web-soft a
  través de un componente común, y reemplazar los 11 usos actuales de `@mui/icons-material`
  (`@mui/icons-material` se retira del proyecto).
- **Alternatives considered**: mantener `@mui/icons-material` (rechazada, FR-008 exige
  reemplazarlos todos); envolver cada icono sin registro central (rechazada, dificultaría saber
  qué nombres existen y violaría "a través de un componente común").

## 8. Recursos de marca

- **Decision**: copiar `maily-horizontal.png`, `maily-isotipo.png` (favicon) y
  `maily-vertical.png` desde `web-soft/public/marca/` a `src/assets/brand/` del Backoffice, con un
  componente `Logo` que replica el fallback a texto de `web-soft/src/components/MarcaMaily.tsx`
  (`onError` → `<span>` con el nombre, en vez de imagen).
- **Rationale**: FR-001 (copiar recursos de marca) y el edge case de fallback de logo, ya resuelto
  en el spec. Se ignora `public/Maily_Mesa de trabajo 1 copia 2.png` de web-soft (archivo suelto,
  no es uno de los tres activos oficiales).
- **Alternatives considered**: ninguna — son los únicos tres activos de marca que tiene web-soft.

## 9. Layout — barra superior y barra inferior móvil (clarify)

- **Decision**: reestructurar `AppLayout.tsx` en `Topbar.tsx` (≥768 px: logo, navegación con
  icono+etiqueta, `HeaderUserMenu`) + `BottomNav.tsx` (<768 px), igual que
  `web-soft/src/components/Topbar.tsx` + `BottomNav.tsx`. `HeaderUserMenu` conserva exactamente lo
  que el header ya ofrece (nombre, ir al perfil, cerrar sesión) y reserva el espacio a la derecha
  para el icono de perfil (Spec 5) y el selector de idioma (Spec 7).
- **Rationale**: FR-013/014/016, y el E2E existente (`e2e/responsive.spec.ts`) exige que exista un
  elemento con **role `banner`** que contenga un **link** "Perfil" y un **button** "Cerrar sesión",
  visibles a 1024 y 320 px — la nueva `Topbar`/`BottomNav` deben preservar ese contrato exacto
  (rol, nombres accesibles, visibilidad en ambos anchos) para no romper la prueba sin tocarla.
- **Alternatives considered**: sidebar lateral — rechazada en clarify (no es el layout real de
  web-soft).

## 10. Componentes base — qué se reutiliza, qué se crea, qué se unifica

- **Decision**:
  - **Reutilizar retematizado (sin cambiar estructura)**: Button/Input/Select/Checkbox (MUI
    directo, ya los usa cada feature), `ConfirmDialog.tsx` (ya usa MUI `Dialog`: Escape, trampa de
    foco y devolución de foco ya funcionan), `Notifications.tsx` (ya usa `Snackbar`+`Alert`:
    conserva los toasts que web-soft no tiene, con el aspecto de alerta de web-soft — edge case
    FR-017), `ErrorState.tsx`, `PageLoader.tsx`, `dataGridStyles.ts`.
  - **Crear nuevo (no existe hoy como componente compartido)**: `Icon` (§7), `Avatar` con
    iniciales (§11), `Badge` (unifica `StatusChip.tsx` de users y `SubscriptionStatusChip.tsx` de
    subscriptions, que hoy duplican la misma idea con implementaciones distintas), `EmptyState`
    (hoy cada feature maneja su vacío inline, p. ej. `dashboard.recentClinics.empty`).
  - **Retematizar sin componente propio**: la tabla (MUI X Data Grid — la paginación del
    Backoffice no tiene equivalente visual en web-soft, que no usa paginación en sus listados; se
    conserva la paginación actual con los colores/bordes/hover de web-soft, edge case FR-017).
- **Rationale**: FR-006/009-012/SC-002, y evitar trabajo innecesario en lo que ya funciona bien
  (MUI Dialog, Snackbar) retematizándolo en vez de reescribirlo.
- **Alternatives considered**: construir un `Table`/`Pagination` propio copiando la estructura de
  listados de web-soft (`<div>` con CSS Grid, sin paginación) — rechazada: la constitución exige
  MUI X Data Grid, y el Backoffice sí necesita paginación real (contrato con el backend) que
  web-soft no resuelve.

## 11. Avatar con iniciales — color determinístico

- **Decision**: función `getInitials(name)` (primera letra de las primeras dos palabras,
  mayúsculas, fallback `'?'`, igual que `web-soft/src/components/personal/EquipoTab.tsx`) +
  `getAvatarColor(id)` que elige, por hash simple del identificador de la persona, entre un set
  fijo de 4 combinaciones fondo/texto ya definidas en los tokens semánticos
  (`accion-tinte`/`accion`, `exito-tinte`/`exito`, `aviso-tinte`/`aviso-icono`,
  `peligro-tinte`/`peligro`), sin introducir ningún color nuevo fuera del sistema de tokens.
- **Rationale**: web-soft no resuelve esto de forma reutilizable — su único avatar con iniciales
  usa un color fijo hardcodeado (`#B8860B` sobre `rgba(201,162,39,.16)`, ámbar viejo, igual para
  todos). El Backoffice sí lo necesita como componente base (FR-010, y como insumo documentado para
  las Specs 5/6). Usar combinaciones ya existentes en los tokens evita inventar un color fuera del
  sistema.
- **Alternatives considered**: copiar el color fijo ámbar de web-soft (rechazada: es un color
  viejo que la propia regla de web-soft ya desaprueba, y no sería determinístico por persona).

## 12. Checkbox — color de acento

- **Decision**: usar el token `accion` como `accent-color` del checkbox.
- **Rationale**: web-soft usa `accent-amber-600` (ámbar viejo) incluso en archivos de áreas ya
  migradas — es una inconsistencia del propio web-soft, no un valor del sistema de tokens v2.
  `accion` es el color de interacción/selección en el resto de web-soft migrado.
- **Alternatives considered**: copiar literalmente el ámbar de `accent-amber-600` (rechazada, por
  la misma razón que en §11: no es parte del sistema de tokens nuevo).

## 13. Comportamiento accesible que el Backoffice conserva más allá de web-soft (clarify)

- **Decision**: los modales retematizados (`ConfirmDialog` sobre MUI `Dialog`) conservan el cierre
  con Escape y la trampa/devolución de foco que MUI ya da por defecto, aunque los modales custom de
  web-soft no los tengan (confirmado: sin `role="dialog"`/`aria-modal`, sin manejo de Escape a
  nivel modal, sin trampa de foco en `web-soft/src/components/CrearEventoModal.tsx`). Los toasts
  (`Notifications.tsx`), la elección de filas por página y el reintento de consultas fallidas se
  conservan igual, con el aspecto visual de web-soft.
- **Rationale**: edge case ya resuelto en el spec (FR-017: el comportamiento de las pantallas no
  cambia) y en el conflicto FR-005/FR-019 (prevalece WCAG AA). Confirmado con evidencia de código
  que bajar el comportamiento al nivel de web-soft sería un retroceso de accesibilidad real, no solo
  hipotético.
- **Alternatives considered**: igualar el comportamiento de los modales al de web-soft (sin
  Escape, sin trampa de foco) — rechazada, violaría FR-019 y el principio VI (NO NEGOCIABLE).

## 14. Pruebas sensibles a preservar

- **Decision**: no tocar los archivos que aserten clases internas de MUI, porque Badge/Alert
  retematizados siguen usando `Chip`/`Alert` de MUI por debajo (se retematiza, no se reemplaza):
  `DeleteSubscriptionAction.test.tsx`, `SubscriptionEditPage.test.tsx`,
  `SubscriptionStatusChip.test.tsx`, `SubscriptionStatusMenu.test.tsx`, `RolesField.test.tsx`,
  `UserCreatePage.test.tsx`. Tampoco tocar las aserciones de `e2e/responsive.spec.ts`
  (`expectHeaderShortcuts`, rol `banner`, "Perfil"/"Cerrar sesión" a 1024/320 px) ni la prueba de
  que ningún diálogo exceda el ancho de la ventana.
- **Rationale**: principio VII — estas pruebas verifican comportamiento, no implementación visual;
  retematizar en vez de reemplazar es precisamente lo que permite no tocarlas.
- **Alternatives considered**: N/A.

## 15. Presupuesto de bundle

- **Decision**: remedir la línea base real (`npm run build && npm run size`) antes de la etapa de
  tokens/iconos, en vez de confiar en el número documentado (276,8 KB) ni en el de la spec
  (277,4 KB); cargar solo los 4 pesos de Inter usados (400/500/600/700) con `font-display: swap`;
  verificar el presupuesto de nuevo al cerrar cada etapa (tokens → iconos → componentes base →
  layout → pantallas).
- **Rationale**: `scripts/check-entry-size.mjs` ya hace cumplir 300 KB gzip en CI; Inter y
  `lucide-react` son las únicas adiciones de peso, y ambas son parciales (pesos usados / iconos
  importados, tree-shaking).
- **Alternatives considered**: N/A.
- **Medición real (T001, 2026-10-21)**: `npm run build && npm run size` → **277,4 KB gzip** (igual
  al número de la spec, no a los 276,8 KB del README). Margen disponible antes de tocar código:
  300 − 277,4 = **22,6 KB** para Inter autoalojada + `lucide-react` + el código nuevo de esta
  feature.

## 16. Documentación (`docs/DESIGN.md`)

- **Decision**: estructura con las secciones que piden FR-021 a FR-024: (1) tokens por categoría
  con su rol y valor; (2) componentes base con su aspecto/comportamiento y props; (3) iconos y
  cómo usarlos a través de `Icon`; (4) tabla de equivalencias (archivo de web-soft → archivo del
  Backoffice, ver `data-model.md`); (5) guía corta para migrar una pantalla (para las Specs 1 y 2
  al mergearse); (6) cómo resuelve web-soft el modo oscuro (no existe), el menú de perfil
  (estructura confirmada en `Topbar.tsx`), el avatar (sin color determinístico, ver §11) y los
  idiomas (no existe), como insumo para las Specs 4 a 7.
- **Rationale**: FR-021 a FR-024 literalmente.
- **Alternatives considered**: N/A.
